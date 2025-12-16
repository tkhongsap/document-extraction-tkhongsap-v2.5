"""
Object Storage Service
Python implementation for GCS integration (equivalent to server/objectStorage.ts)
Supports local file system for development
"""
import httpx
import uuid
import json
import os
import shutil
from pathlib import Path
from typing import Optional, Tuple, Union, BinaryIO
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
from urllib.parse import urlparse

from app.core.config import get_settings

# Try importing GCS, but fallback to local storage if not available
try:
    from google.cloud import storage
    from google.oauth2 import service_account
    HAS_GCS = True
except ImportError:
    HAS_GCS = False
    storage = None
    service_account = None

REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106"


class ObjectPermission(Enum):
    """Object permission types"""
    READ = "read"
    WRITE = "write"


@dataclass
class ObjectAclPolicy:
    """ACL policy for an object"""
    owner: str
    visibility: str  # "public" or "private"


class ObjectNotFoundError(Exception):
    """Exception when object is not found"""
    pass


ACL_POLICY_METADATA_KEY = "custom:aclPolicy"


def parse_object_path(path: str) -> Tuple[str, str]:
    """Parse object path into bucket name and object name"""
    if not path.startswith("/"):
        path = f"/{path}"
    
    path_parts = path.split("/")
    if len(path_parts) < 3:
        raise ValueError("Invalid path: must contain at least a bucket name")
    
    bucket_name = path_parts[1]
    object_name = "/".join(path_parts[2:])
    
    return bucket_name, object_name


async def sign_object_url(
    bucket_name: str,
    object_name: str,
    method: str,
    ttl_sec: int,
) -> str:
    """Sign an object URL using Replit sidecar"""
    request = {
        "bucket_name": bucket_name,
        "object_name": object_name,
        "method": method,
        "expires_at": (datetime.utcnow() + timedelta(seconds=ttl_sec)).isoformat() + "Z",
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url",
            json=request,
        )
    
    if response.status_code != 200:
        raise Exception(
            f"Failed to sign object URL, errorcode: {response.status_code}, "
            "make sure you're running on Replit"
        )
    
    result = response.json()
    return result["signed_url"]


def get_storage_client():
    """Get Google Cloud Storage client configured for Replit"""
    if not HAS_GCS:
        raise RuntimeError("Google Cloud Storage is not available. Install google-cloud-storage package.")
    
    # Use Replit's credential system
    credentials_info = {
        "audience": "replit",
        "subject_token_type": "access_token",
        "token_url": f"{REPLIT_SIDECAR_ENDPOINT}/token",
        "type": "external_account",
        "credential_source": {
            "url": f"{REPLIT_SIDECAR_ENDPOINT}/credential",
            "format": {
                "type": "json",
                "subject_token_field_name": "access_token",
            },
        },
        "universe_domain": "googleapis.com",
    }
    
    # For local development, use default credentials
    try:
        return storage.Client()
    except Exception:
        # If running on Replit, use the sidecar credentials
        return storage.Client(project="")


class ObjectStorageService:
    """Object storage service for GCS operations"""
    
    def __init__(self):
        if not HAS_GCS:
            raise RuntimeError("Google Cloud Storage is not available. Install google-cloud-storage package.")
        self.settings = get_settings()
        self._client = None
    
    @property
    def client(self):
        """Lazy-load storage client"""
        if self._client is None:
            self._client = get_storage_client()
        return self._client
    
    def get_public_object_search_paths(self) -> list[str]:
        """Get public object search paths from environment"""
        paths_str = self.settings.public_object_search_paths
        paths = list(set(
            path.strip()
            for path in paths_str.split(",")
            if path.strip()
        ))
        
        if not paths:
            raise ValueError(
                "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' "
                "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
            )
        
        return paths
    
    def get_private_object_dir(self) -> str:
        """Get private object directory from environment"""
        dir_path = self.settings.private_object_dir
        
        if not dir_path:
            raise ValueError(
                "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' "
                "tool and set PRIVATE_OBJECT_DIR env var."
            )
        
        return dir_path
    
    async def search_public_object(self, file_path: str) -> Optional[object]:
        """Search for a public object"""
        for search_path in self.get_public_object_search_paths():
            full_path = f"{search_path}/{file_path}"
            bucket_name, object_name = parse_object_path(full_path)
            
            bucket = self.client.bucket(bucket_name)
            blob = bucket.blob(object_name)
            
            if blob.exists():
                return blob
        
        return None
    
    async def get_object_entity_upload_url(self) -> str:
        """Get a signed URL for uploading an object"""
        private_object_dir = self.get_private_object_dir()
        
        object_id = str(uuid.uuid4())
        full_path = f"{private_object_dir}/uploads/{object_id}"
        bucket_name, object_name = parse_object_path(full_path)
        
        return await sign_object_url(
            bucket_name=bucket_name,
            object_name=object_name,
            method="PUT",
            ttl_sec=900,
        )
    
    async def get_object_entity_file(self, object_path: str) -> object:
        """Get an object file by path"""
        if not object_path.startswith("/objects/"):
            raise ObjectNotFoundError()
        
        parts = object_path[1:].split("/")
        if len(parts) < 2:
            raise ObjectNotFoundError()
        
        entity_id = "/".join(parts[1:])
        entity_dir = self.get_private_object_dir()
        
        if not entity_dir.endswith("/"):
            entity_dir = f"{entity_dir}/"
        
        object_entity_path = f"{entity_dir}{entity_id}"
        bucket_name, object_name = parse_object_path(object_entity_path)
        
        bucket = self.client.bucket(bucket_name)
        blob = bucket.blob(object_name)
        
        if not blob.exists():
            raise ObjectNotFoundError()
        
        return blob
    
    def normalize_object_entity_path(self, raw_path: str) -> str:
        """Normalize a raw GCS path to an entity path"""
        if not raw_path.startswith("https://storage.googleapis.com/"):
            return raw_path
        
        # Parse URL path
        parsed = urlparse(raw_path)
        raw_object_path = parsed.path
        
        object_entity_dir = self.get_private_object_dir()
        if not object_entity_dir.endswith("/"):
            object_entity_dir = f"{object_entity_dir}/"
        
        if not raw_object_path.startswith(object_entity_dir):
            return raw_object_path
        
        entity_id = raw_object_path[len(object_entity_dir):]
        return f"/objects/{entity_id}"
    
    async def try_set_object_entity_acl_policy(
        self,
        raw_path: str,
        acl_policy: ObjectAclPolicy,
    ) -> str:
        """Try to set ACL policy on an object and return normalized path"""
        normalized_path = self.normalize_object_entity_path(raw_path)
        
        if not normalized_path.startswith("/"):
            return normalized_path
        
        blob = await self.get_object_entity_file(normalized_path)
        await self.set_object_acl_policy(blob, acl_policy)
        
        return normalized_path
    
    async def set_object_acl_policy(
        self,
        blob: object,
        acl_policy: ObjectAclPolicy,
    ) -> None:
        """Set ACL policy metadata on an object"""
        blob.metadata = blob.metadata or {}
        blob.metadata[ACL_POLICY_METADATA_KEY] = json.dumps({
            "owner": acl_policy.owner,
            "visibility": acl_policy.visibility,
        })
        blob.patch()
    
    async def get_object_acl_policy(
        self,
        blob: object,
    ) -> Optional[ObjectAclPolicy]:
        """Get ACL policy from object metadata"""
        blob.reload()
        metadata = blob.metadata or {}
        acl_data = metadata.get(ACL_POLICY_METADATA_KEY)
        
        if not acl_data:
            return None
        
        data = json.loads(acl_data)
        return ObjectAclPolicy(
            owner=data["owner"],
            visibility=data["visibility"],
        )
    
    async def can_access_object_entity(
        self,
        blob: object,
        user_id: Optional[str],
        requested_permission: ObjectPermission = ObjectPermission.READ,
    ) -> bool:
        """Check if a user can access an object"""
        acl_policy = await self.get_object_acl_policy(blob)
        
        if not acl_policy:
            return False
        
        # Public read access
        if acl_policy.visibility == "public" and requested_permission == ObjectPermission.READ:
            return True
        
        # Owner access
        if user_id and acl_policy.owner == user_id:
            return True
        
        return False
    
    def download_object(self, blob: object) -> bytes:
        """Download object content as bytes"""
        return blob.download_as_bytes()
    
    def get_object_metadata(self, blob: object) -> dict:
        """Get object metadata"""
        blob.reload()
        return {
            "content_type": blob.content_type,
            "size": blob.size,
            "updated": blob.updated,
        }
