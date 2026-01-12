"""
File Security Utilities
Provides functions for validating file types, detecting path traversal, and magic bytes validation
"""
import re
import os
from pathlib import Path
from typing import Tuple, Optional

try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False


# Magic bytes for common file types
MAGIC_BYTES_SIGNATURES = {
    'application/pdf': [
        b'%PDF-',
    ],
    'image/jpeg': [
        b'\xff\xd8\xff\xdb',
        b'\xff\xd8\xff\xe0',
        b'\xff\xd8\xff\xe1',
        b'\xff\xd8\xff\xee',
    ],
    'image/png': [
        b'\x89PNG\r\n\x1a\n',
    ],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        b'PK\x03\x04',  # ZIP signature (DOCX is ZIP-based)
    ],
    'application/msword': [
        b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1',  # OLE2 signature
    ],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        b'PK\x03\x04',  # ZIP signature (XLSX is ZIP-based)
    ],
    'application/vnd.ms-excel': [
        b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1',  # OLE2 signature
    ],
    'text/plain': [
        # Text files don't have specific magic bytes
    ],
}


def validate_filename(filename: str) -> Tuple[bool, str, Optional[str]]:
    """
    Validate filename for security issues (path traversal, null bytes, etc.)
    
    Args:
        filename: The filename to validate
        
    Returns:
        Tuple of (is_valid, sanitized_name, error_message)
    """
    if not filename:
        return False, "", "Filename is empty"
    
    # Check for null bytes
    if '\x00' in filename:
        return False, "", "Filename contains null bytes"
    
    # Check for path traversal attempts
    if '..' in filename:
        return False, "", "Filename contains path traversal sequence (..)"
    
    # Check for absolute paths or path separators
    if filename.startswith('/') or filename.startswith('\\'):
        return False, "", "Filename cannot be an absolute path"
    
    if '/' in filename or '\\' in filename:
        return False, "", "Filename cannot contain path separators"
    
    # Check for Windows reserved names
    reserved_names = [
        'CON', 'PRN', 'AUX', 'NUL',
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
        'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
    ]
    
    name_without_ext = os.path.splitext(filename)[0].upper()
    if name_without_ext in reserved_names:
        return False, "", f"Filename uses reserved name: {name_without_ext}"
    
    # Check for dangerous characters
    dangerous_chars = ['<', '>', ':', '"', '|', '?', '*']
    for char in dangerous_chars:
        if char in filename:
            return False, "", f"Filename contains dangerous character: {char}"
    
    # Sanitize filename - remove control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', filename)
    
    # Limit filename length
    max_length = 255
    if len(sanitized) > max_length:
        name, ext = os.path.splitext(sanitized)
        sanitized = name[:max_length - len(ext)] + ext
    
    return True, sanitized, None


def validate_magic_bytes(buffer: bytes, claimed_mime_type: str) -> Tuple[bool, Optional[str]]:
    """
    Validate file content matches claimed MIME type using magic bytes
    
    Args:
        buffer: File content as bytes
        claimed_mime_type: MIME type claimed by client
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not buffer:
        return False, "Empty file buffer"
    
    # Use python-magic if available
    if MAGIC_AVAILABLE:
        try:
            detected_mime = magic.from_buffer(buffer[:2048], mime=True)
            
            # Normalize MIME types for comparison
            claimed_normalized = claimed_mime_type.lower().split(';')[0].strip()
            detected_normalized = detected_mime.lower().split(';')[0].strip()
            
            # Special case: DOCX/XLSX are ZIP files
            if claimed_normalized.startswith('application/vnd.openxmlformats-officedocument'):
                if detected_normalized in ['application/zip', 'application/x-zip-compressed']:
                    return True, None
            
            # Special case: DOC/XLS are OLE2 files
            if claimed_normalized in ['application/msword', 'application/vnd.ms-excel']:
                if detected_normalized in ['application/x-ole-storage', 'application/msword']:
                    return True, None
            
            # Special case: PNG images
            if claimed_normalized == 'image/png':
                if detected_normalized in ['image/png', 'application/octet-stream']:
                    # Verify PNG signature manually
                    if buffer.startswith(b'\x89PNG\r\n\x1a\n'):
                        return True, None
            
            if claimed_normalized == detected_normalized:
                return True, None
            
            return False, f"File type mismatch: claimed {claimed_normalized}, detected {detected_normalized}"
            
        except Exception as e:
            # Fall back to manual check if magic fails
            pass
    
    # Manual magic bytes check
    signatures = MAGIC_BYTES_SIGNATURES.get(claimed_mime_type, [])
    
    if not signatures:
        # If we don't have signatures for this type, allow it
        return True, None
    
    for signature in signatures:
        if buffer.startswith(signature):
            return True, None
    
    return False, f"File content doesn't match claimed type: {claimed_mime_type}"


def get_file_extension(filename: str) -> str:
    """
    Get file extension in lowercase
    
    Args:
        filename: The filename
        
    Returns:
        File extension including dot (e.g., '.pdf')
    """
    return os.path.splitext(filename)[1].lower()


def is_allowed_extension(filename: str, allowed_extensions: set) -> bool:
    """
    Check if file extension is in allowed list
    
    Args:
        filename: The filename to check
        allowed_extensions: Set of allowed extensions (e.g., {'.pdf', '.jpg'})
        
    Returns:
        True if extension is allowed
    """
    ext = get_file_extension(filename)
    return ext in allowed_extensions
