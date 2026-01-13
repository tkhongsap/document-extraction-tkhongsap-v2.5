"""
<<<<<<< HEAD
Chunking Service for Resume Documents
Implements Semantic Chunking - splits resume by logical sections for better RAG retrieval
"""
from typing import List, Dict, Any, Optional, Literal
=======
Chunking Service for Resume and General Documents
Implements Semantic Chunking - splits documents by logical sections for better RAG retrieval
"""
from typing import List, Dict, Any, Optional, Literal, Union
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
from dataclasses import dataclass, field
from datetime import datetime
from sqlalchemy import select, func, delete, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DocumentChunk
from app.services.embedding_service import get_embedding_service
<<<<<<< HEAD
=======
from app.utils.text_splitter import get_document_splitter, get_large_document_splitter
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd


# Chunk types for resume sections
ResumeChunkType = Literal[
    'personal_info',     # Name, contact, location
    'summary',           # Professional summary/objective
    'experience',        # Work experience (one chunk per job)
    'education',         # Education history
    'skills',            # Skills list
    'certifications',    # Certifications and licenses
    'languages',         # Languages spoken
    'full_resume'        # Complete resume text for broad matching
]

<<<<<<< HEAD
=======
# Chunk types for general documents
GeneralChunkType = Literal[
    'content',           # Main content chunk
    'header',            # Header/title section
    'section',           # Named section
    'page',              # Full page content
    'full_document'      # Complete document summary
]

>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd

@dataclass
class ResumeChunk:
    """Represents a single chunk of resume data"""
    chunk_type: ResumeChunkType
    text: str
    chunk_index: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    page_number: Optional[int] = None


@dataclass
<<<<<<< HEAD
class ChunkingResult:
    """Result of chunking operation"""
    chunks: List[ResumeChunk]
=======
class GeneralChunk:
    """Represents a single chunk of general document data"""
    chunk_type: GeneralChunkType
    text: str
    chunk_index: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    page_number: Optional[int] = None


@dataclass
class ChunkingResult:
    """Result of chunking operation"""
    chunks: List[Union[ResumeChunk, GeneralChunk]]
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
    total_chunks: int
    chunk_types_count: Dict[str, int]


class ChunkingService:
    """
<<<<<<< HEAD
    Service for chunking resume documents into semantic sections.
    
    Chunking Strategy:
    - Section-based (Semantic) Chunking
    - Each logical section becomes one or more chunks
    - Experience entries are split per job for better matching
    - Full resume chunk for broad queries
=======
    Service for chunking resume and general documents into semantic sections.
    
    Chunking Strategy:
    - Section-based (Semantic) Chunking for resumes
    - Recursive text splitting for general documents
    - Each logical section becomes one or more chunks
    - Experience entries are split per job for better matching
    - Full resume/document chunk for broad queries
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedding_service = get_embedding_service()
<<<<<<< HEAD
=======
        self.text_splitter = get_document_splitter()
        self.large_text_splitter = get_large_document_splitter()
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
    
    def chunk_resume(self, extracted_data: Dict[str, Any]) -> ChunkingResult:
        """
        Split extracted resume data into semantic chunks.
        
        Args:
            extracted_data: Resume data from LlamaExtract
            
        Returns:
            ChunkingResult with list of chunks
        """
        chunks: List[ResumeChunk] = []
        chunk_index = 0
        
<<<<<<< HEAD
=======
        # Extract candidate name for metadata grouping
        candidate_name = extracted_data.get("name") or extracted_data.get("full_name")
        
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
        # 1. Personal Info Chunk
        personal_chunk = self._create_personal_info_chunk(extracted_data, chunk_index)
        if personal_chunk:
            chunks.append(personal_chunk)
            chunk_index += 1
        
        # 2. Summary Chunk
        summary_chunk = self._create_summary_chunk(extracted_data, chunk_index)
        if summary_chunk:
            chunks.append(summary_chunk)
            chunk_index += 1
        
        # 3. Experience Chunks (one per job)
        experience_chunks = self._create_experience_chunks(extracted_data, chunk_index)
        chunks.extend(experience_chunks)
        chunk_index += len(experience_chunks)
        
        # 4. Education Chunk
        education_chunk = self._create_education_chunk(extracted_data, chunk_index)
        if education_chunk:
            chunks.append(education_chunk)
            chunk_index += 1
        
        # 5. Skills Chunk
        skills_chunk = self._create_skills_chunk(extracted_data, chunk_index)
        if skills_chunk:
            chunks.append(skills_chunk)
            chunk_index += 1
        
        # 6. Certifications Chunk
        certs_chunk = self._create_certifications_chunk(extracted_data, chunk_index)
        if certs_chunk:
            chunks.append(certs_chunk)
            chunk_index += 1
        
        # 7. Languages Chunk
        langs_chunk = self._create_languages_chunk(extracted_data, chunk_index)
        if langs_chunk:
            chunks.append(langs_chunk)
            chunk_index += 1
        
        # 8. Full Resume Chunk (for broad matching)
        full_chunk = self._create_full_resume_chunk(extracted_data, chunk_index, chunks)
        if full_chunk:
            chunks.append(full_chunk)
        
<<<<<<< HEAD
=======
        # Add candidate name to all chunks metadata for grouping
        if candidate_name:
            for chunk in chunks:
                chunk.metadata["candidate_name"] = candidate_name
        
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
        # Count chunk types
        type_counts: Dict[str, int] = {}
        for chunk in chunks:
            type_counts[chunk.chunk_type] = type_counts.get(chunk.chunk_type, 0) + 1
        
        return ChunkingResult(
            chunks=chunks,
            total_chunks=len(chunks),
            chunk_types_count=type_counts
        )
    
    def _create_personal_info_chunk(
        self, 
        data: Dict[str, Any], 
        index: int
    ) -> Optional[ResumeChunk]:
        """Create chunk for personal information"""
        parts = []
        
        name = data.get("name") or data.get("full_name")
        if name:
            parts.append(f"Name: {name}")
        
        email = data.get("email")
        if email:
            parts.append(f"Email: {email}")
        
        phone = data.get("phone")
        if phone:
            parts.append(f"Phone: {phone}")
        
        # Handle location
        location = data.get("location")
        if not location:
            address = data.get("address")
            if isinstance(address, dict):
                location_parts = [address.get("city"), address.get("country")]
                location = ", ".join(filter(None, location_parts))
            elif address:
                location = str(address)
        if location:
            parts.append(f"Location: {location}")
        
        current_role = data.get("currentRole") or data.get("desired_position")
        if current_role:
            parts.append(f"Current/Desired Role: {current_role}")
        
        years_exp = data.get("yearsExperience") or data.get("total_years_experience")
        if years_exp:
            parts.append(f"Years of Experience: {years_exp}")
        
        nationality = data.get("nationality")
        if nationality:
            parts.append(f"Nationality: {nationality}")
        
        if not parts:
            return None
        
        text = "\n".join(parts)
        return ResumeChunk(
            chunk_type="personal_info",
            text=text,
            chunk_index=index,
            metadata={"section": "personal_info"}
        )
    
    def _create_summary_chunk(
        self, 
        data: Dict[str, Any], 
        index: int
    ) -> Optional[ResumeChunk]:
        """Create chunk for professional summary"""
        summary = data.get("summary") or data.get("professional_summary")
        if not summary:
            return None
        
        text = f"Professional Summary:\n{summary}"
        return ResumeChunk(
            chunk_type="summary",
            text=text,
            chunk_index=index,
            metadata={"section": "summary"}
        )
    
    def _create_experience_chunks(
        self, 
        data: Dict[str, Any], 
        start_index: int
    ) -> List[ResumeChunk]:
        """Create separate chunks for each work experience entry"""
        chunks = []
        experience = data.get("experience") or data.get("work_experience") or []
        
        if not isinstance(experience, list):
            return chunks
        
        for i, job in enumerate(experience):
            if not isinstance(job, dict):
                continue
            
            parts = ["Work Experience:"]
            
            # Job title
            title = job.get("position") or job.get("job_title") or job.get("title")
            if title:
                parts.append(f"Position: {title}")
            
            # Company
            company = job.get("company") or job.get("company_name") or job.get("employer")
            if company:
                parts.append(f"Company: {company}")
            
            # Duration
            start_date = job.get("start_date") or job.get("startDate")
            end_date = job.get("end_date") or job.get("endDate") or "Present"
            if start_date:
                parts.append(f"Duration: {start_date} - {end_date}")
            
            # Location
            job_location = job.get("location")
            if job_location:
                parts.append(f"Location: {job_location}")
            
            # Description/Responsibilities
            description = job.get("description") or job.get("responsibilities")
            if isinstance(description, list):
                description = "\n- " + "\n- ".join(description)
            if description:
                parts.append(f"Responsibilities:\n{description}")
            
            # Achievements
            achievements = job.get("achievements") or job.get("accomplishments")
            if isinstance(achievements, list):
                achievements = "\n- " + "\n- ".join(achievements)
            if achievements:
                parts.append(f"Achievements:\n{achievements}")
            
            if len(parts) > 1:  # More than just the header
                chunks.append(ResumeChunk(
                    chunk_type="experience",
                    text="\n".join(parts),
                    chunk_index=start_index + i,
                    metadata={
                        "section": "experience",
                        "job_index": i,
                        "company": company,
                        "title": title
                    }
                ))
        
        return chunks
    
    def _create_education_chunk(
        self, 
        data: Dict[str, Any], 
        index: int
    ) -> Optional[ResumeChunk]:
        """Create chunk for education history"""
        education = data.get("education") or []
        
        if not education:
            return None
        
        if not isinstance(education, list):
            education = [education]
        
        parts = ["Education:"]
        for edu in education:
            if isinstance(edu, dict):
                degree = edu.get("degree") or edu.get("qualification")
                institution = edu.get("institution") or edu.get("school") or edu.get("university")
                field = edu.get("field") or edu.get("major") or edu.get("field_of_study")
                year = edu.get("year") or edu.get("graduation_year") or edu.get("end_date")
                
                edu_parts = []
                if degree:
                    edu_parts.append(degree)
                if field:
                    edu_parts.append(f"in {field}")
                if institution:
                    edu_parts.append(f"at {institution}")
                if year:
                    edu_parts.append(f"({year})")
                
                if edu_parts:
                    parts.append("- " + " ".join(edu_parts))
            elif edu:
                parts.append(f"- {edu}")
        
        if len(parts) <= 1:
            return None
        
        return ResumeChunk(
            chunk_type="education",
            text="\n".join(parts),
            chunk_index=index,
            metadata={"section": "education", "count": len(education)}
        )
    
    def _create_skills_chunk(
        self, 
        data: Dict[str, Any], 
        index: int
    ) -> Optional[ResumeChunk]:
        """Create chunk for skills"""
        skills_raw = data.get("skills") or []
        
        if not skills_raw:
            return None
        
        skills = []
        for skill in skills_raw:
            if isinstance(skill, dict):
                skill_name = skill.get("skill_name") or skill.get("name") or skill.get("skill")
                if skill_name:
                    skills.append(str(skill_name))
            elif skill:
                skills.append(str(skill))
        
        if not skills:
            return None
        
        text = f"Skills: {', '.join(skills)}"
        return ResumeChunk(
            chunk_type="skills",
            text=text,
            chunk_index=index,
            metadata={"section": "skills", "count": len(skills), "skills_list": skills}
        )
    
    def _create_certifications_chunk(
        self, 
        data: Dict[str, Any], 
        index: int
    ) -> Optional[ResumeChunk]:
        """Create chunk for certifications"""
        certs_raw = data.get("certifications") or data.get("certificates") or []
        
        if not certs_raw:
            return None
        
        certs = []
        for cert in certs_raw:
            if isinstance(cert, dict):
                cert_name = cert.get("name") or cert.get("certification") or cert.get("title")
                if cert_name:
                    certs.append(str(cert_name))
            elif cert:
                certs.append(str(cert))
        
        if not certs:
            return None
        
        parts = ["Certifications:"]
        parts.extend([f"- {cert}" for cert in certs])
        
        return ResumeChunk(
            chunk_type="certifications",
            text="\n".join(parts),
            chunk_index=index,
            metadata={"section": "certifications", "count": len(certs)}
        )
    
    def _create_languages_chunk(
        self, 
        data: Dict[str, Any], 
        index: int
    ) -> Optional[ResumeChunk]:
        """Create chunk for languages"""
        languages_raw = data.get("languages") or []
        
        if not languages_raw:
            return None
        
        lang_parts = []
        for lang in languages_raw:
            if isinstance(lang, dict):
                name = lang.get("language") or lang.get("name")
                level = lang.get("level") or lang.get("proficiency")
                if name:
                    if level:
                        lang_parts.append(f"{name} ({level})")
                    else:
                        lang_parts.append(str(name))
            elif lang:
                lang_parts.append(str(lang))
        
        if not lang_parts:
            return None
        
        text = f"Languages: {', '.join(lang_parts)}"
        return ResumeChunk(
            chunk_type="languages",
            text=text,
            chunk_index=index,
            metadata={"section": "languages", "count": len(lang_parts)}
        )
    
    def _create_full_resume_chunk(
        self, 
        data: Dict[str, Any], 
        index: int,
        existing_chunks: List[ResumeChunk]
    ) -> Optional[ResumeChunk]:
        """Create a combined full resume chunk for broad matching"""
        # Combine all chunk texts
        all_texts = [chunk.text for chunk in existing_chunks]
        
        if not all_texts:
            return None
        
        full_text = "\n\n".join(all_texts)
        
        # Limit length for embedding (OpenAI limit is ~8000 tokens)
        max_chars = 15000
        if len(full_text) > max_chars:
            full_text = full_text[:max_chars] + "..."
        
        return ResumeChunk(
            chunk_type="full_resume",
            text=full_text,
            chunk_index=index,
            metadata={"section": "full_resume", "combined_chunks": len(existing_chunks)}
        )
    
    async def chunk_and_save_resume(
        self,
        user_id: str,
        extraction_id: str,
        extracted_data: Dict[str, Any],
        document_id: Optional[str] = None,
        generate_embeddings: bool = True
    ) -> List[DocumentChunk]:
        """
        Chunk resume and save to database with embeddings.
        
        Args:
            user_id: User ID
            extraction_id: Extraction ID
            extracted_data: Resume data from LlamaExtract
            document_id: Optional document ID
            generate_embeddings: Whether to generate embeddings
            
        Returns:
            List of saved DocumentChunk objects
        """
        # Generate chunks
        result = self.chunk_resume(extracted_data)
        
        if not result.chunks:
            return []
        
        # Generate embeddings for all chunks
        embeddings = []
        if generate_embeddings:
            try:
                chunk_texts = [chunk.text for chunk in result.chunks]
                embeddings = await self.embedding_service.create_embeddings_batch(chunk_texts)
            except Exception as e:
                print(f"[ChunkingService] Failed to generate embeddings: {e}")
                embeddings = [None] * len(result.chunks)
        else:
            embeddings = [None] * len(result.chunks)
        
        # Save chunks to database
        saved_chunks = []
        for i, chunk in enumerate(result.chunks):
            embedding = embeddings[i] if i < len(embeddings) else None
            
            db_chunk = DocumentChunk(
                user_id=user_id,
                document_id=document_id,
                extraction_id=extraction_id,
                chunk_index=chunk.chunk_index,
                chunk_type=chunk.chunk_type,
                text=chunk.text,
                embedding=embedding,
                embedding_model=self.embedding_service.model if embedding else None,
                embedding_text=chunk.text if embedding else None,
                chunk_metadata=chunk.metadata,
                page_number=chunk.page_number
            )
            
            self.db.add(db_chunk)
            saved_chunks.append(db_chunk)
        
        await self.db.commit()
        
        # Refresh to get IDs
        for chunk in saved_chunks:
            await self.db.refresh(chunk)
        
        print(f"[ChunkingService] Saved {len(saved_chunks)} chunks for extraction {extraction_id}")
        return saved_chunks
<<<<<<< HEAD
    
=======

    # =========================================================================
    # GENERAL DOCUMENT CHUNKING
    # =========================================================================
    
    def chunk_general_document(
        self, 
        extracted_data: Dict[str, Any],
        include_full_document: bool = True
    ) -> ChunkingResult:
        """
        Split general document data into chunks using text splitting.
        
        Args:
            extracted_data: Document data from LlamaParse (contains markdown, text, etc.)
            include_full_document: Whether to include a full document summary chunk
            
        Returns:
            ChunkingResult with list of chunks
        """
        chunks: List[GeneralChunk] = []
        chunk_index = 0
        
        # Get text content from extracted data
        text_content = extracted_data.get("text") or extracted_data.get("markdown") or ""
        page_count = extracted_data.get("pageCount") or 1
        
        if not text_content.strip():
            return ChunkingResult(
                chunks=[],
                total_chunks=0,
                chunk_types_count={}
            )
        
        # Use larger splitter for documents with many pages
        splitter = self.large_text_splitter if page_count > 10 else self.text_splitter
        
        # Split text into chunks
        text_chunks = splitter.split_text(text_content)
        
        # Create GeneralChunk objects for each text chunk
        for text_chunk in text_chunks:
            chunk = GeneralChunk(
                chunk_type="content",
                text=text_chunk,
                chunk_index=chunk_index,
                metadata={
                    "section": "content",
                    "char_count": len(text_chunk),
                    "page_count": page_count,
                }
            )
            chunks.append(chunk)
            chunk_index += 1
        
        # Add full document summary chunk if requested
        if include_full_document and len(text_content) > 100:
            # Create a summary chunk (truncated if too long)
            max_summary_chars = 15000
            summary_text = text_content[:max_summary_chars]
            if len(text_content) > max_summary_chars:
                summary_text += "..."
            
            full_doc_chunk = GeneralChunk(
                chunk_type="full_document",
                text=summary_text,
                chunk_index=chunk_index,
                metadata={
                    "section": "full_document",
                    "original_length": len(text_content),
                    "truncated": len(text_content) > max_summary_chars,
                    "total_chunks": len(chunks),
                }
            )
            chunks.append(full_doc_chunk)
        
        # Count chunk types
        type_counts: Dict[str, int] = {}
        for chunk in chunks:
            type_counts[chunk.chunk_type] = type_counts.get(chunk.chunk_type, 0) + 1
        
        return ChunkingResult(
            chunks=chunks,
            total_chunks=len(chunks),
            chunk_types_count=type_counts
        )
    
    async def chunk_and_save_general_document(
        self,
        user_id: str,
        extraction_id: str,
        extracted_data: Dict[str, Any],
        document_id: Optional[str] = None,
        generate_embeddings: bool = True,
        include_full_document: bool = True
    ) -> List[DocumentChunk]:
        """
        Chunk general document and save to database with embeddings.
        
        Args:
            user_id: User ID
            extraction_id: Extraction ID
            extracted_data: Document data from LlamaParse
            document_id: Optional document ID
            generate_embeddings: Whether to generate embeddings
            include_full_document: Whether to include a full document summary chunk
            
        Returns:
            List of saved DocumentChunk objects
        """
        # Generate chunks
        result = self.chunk_general_document(extracted_data, include_full_document)
        
        if not result.chunks:
            print(f"[ChunkingService] No chunks generated for extraction {extraction_id}")
            return []
        
        # Generate embeddings for all chunks
        embeddings = []
        if generate_embeddings:
            try:
                chunk_texts = [chunk.text for chunk in result.chunks]
                embeddings = await self.embedding_service.create_embeddings_batch(chunk_texts)
            except Exception as e:
                print(f"[ChunkingService] Failed to generate embeddings: {e}")
                embeddings = [None] * len(result.chunks)
        else:
            embeddings = [None] * len(result.chunks)
        
        # Save chunks to database
        saved_chunks = []
        for i, chunk in enumerate(result.chunks):
            embedding = embeddings[i] if i < len(embeddings) else None
            
            db_chunk = DocumentChunk(
                user_id=user_id,
                document_id=document_id,
                extraction_id=extraction_id,
                chunk_index=chunk.chunk_index,
                chunk_type=chunk.chunk_type,
                text=chunk.text,
                embedding=embedding,
                embedding_model=self.embedding_service.model if embedding else None,
                embedding_text=chunk.text if embedding else None,
                chunk_metadata=chunk.metadata,
                page_number=chunk.page_number
            )
            
            self.db.add(db_chunk)
            saved_chunks.append(db_chunk)
        
        await self.db.commit()
        
        # Refresh to get IDs
        for chunk in saved_chunks:
            await self.db.refresh(chunk)
        
        print(f"[ChunkingService] Saved {len(saved_chunks)} general document chunks for extraction {extraction_id}")
        return saved_chunks

>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
    async def search_similar_chunks(
        self,
        query: str,
        user_id: str,
        limit: int = 10,
        chunk_types: Optional[List[str]] = None,
        similarity_threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using vector similarity.
        
        Args:
            query: Search query text
            user_id: User ID to filter by
            limit: Maximum number of results
            chunk_types: Optional list of chunk types to filter
            similarity_threshold: Minimum similarity score (0-1)
            
        Returns:
            List of chunks with similarity scores
        """
        # Generate query embedding
        query_embedding = await self.embedding_service.create_embedding(query)
        
        # Build SQL query with cosine similarity
        # cosine_distance returns distance (0 = identical), convert to similarity (1 - distance)
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        
        sql = """
            SELECT 
                id, user_id, document_id, extraction_id,
                chunk_index, chunk_type, text, metadata, created_at,
<<<<<<< HEAD
                1 - (embedding <=> :embedding::vector) as similarity
            FROM document_chunks
            WHERE user_id = :user_id
                AND embedding IS NOT NULL
                AND 1 - (embedding <=> :embedding::vector) >= :threshold
=======
                1 - (embedding <=> CAST(:embedding AS vector)) as similarity
            FROM document_chunks
            WHERE user_id = :user_id
                AND embedding IS NOT NULL
                AND 1 - (embedding <=> CAST(:embedding AS vector)) >= :threshold
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
        """
        
        if chunk_types:
            sql += " AND chunk_type = ANY(:chunk_types)"
        
        sql += " ORDER BY similarity DESC LIMIT :limit"
        
        params = {
            "embedding": embedding_str,
            "user_id": user_id,
            "threshold": similarity_threshold,
            "limit": limit
        }
        
        if chunk_types:
            params["chunk_types"] = chunk_types
        
        result = await self.db.execute(text(sql), params)
        rows = result.fetchall()
        
        return [
            {
                "id": row.id,
                "userId": row.user_id,
                "documentId": row.document_id,
                "extractionId": row.extraction_id,
                "chunkIndex": row.chunk_index,
                "chunkType": row.chunk_type,
                "text": row.text,
                "metadata": row.metadata,
                "createdAt": row.created_at.isoformat() if row.created_at else None,
                "similarity": float(row.similarity)
            }
            for row in rows
        ]
    
    async def delete_chunks_for_extraction(self, extraction_id: str) -> int:
        """Delete all chunks for an extraction"""
        result = await self.db.execute(
            delete(DocumentChunk).where(DocumentChunk.extraction_id == extraction_id)
        )
        await self.db.commit()
        return result.rowcount
    
    async def delete_chunks_for_document(self, document_id: str) -> int:
        """Delete all chunks for a document"""
        result = await self.db.execute(
            delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
        )
        await self.db.commit()
        return result.rowcount
    
    async def get_chunks_for_extraction(self, extraction_id: str) -> List[DocumentChunk]:
        """Get all chunks for an extraction"""
        result = await self.db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.extraction_id == extraction_id)
            .order_by(DocumentChunk.chunk_index)
        )
        return list(result.scalars().all())
    
    async def count_user_chunks(self, user_id: str) -> Dict[str, int]:
        """Count chunks by type for a user"""
        result = await self.db.execute(
            select(
                DocumentChunk.chunk_type,
                func.count(DocumentChunk.id).label("count")
            )
            .where(DocumentChunk.user_id == user_id)
            .group_by(DocumentChunk.chunk_type)
        )
        
        counts = {"total": 0}
        for row in result:
            chunk_type = row.chunk_type or "unknown"
            counts[chunk_type] = row.count
            counts["total"] += row.count
        
        return counts