"""
Resume Service
Handles CRUD operations and embedding generation for resumes
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Resume
from app.services.embedding_service import get_embedding_service


class ResumeService:
    """Service for managing resumes with vector embeddings"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.embedding_service = get_embedding_service()
    
    async def create_from_extraction(
        self,
        user_id: str,
        extraction_id: str,
        extracted_data: Dict[str, Any],
        source_file_name: str,
        generate_embedding: bool = True,
    ) -> Resume:
        """
        Create a resume from extraction data
        
        Args:
            user_id: User who owns this resume
            extraction_id: Link to the extraction record
            extracted_data: Extracted resume data from LlamaExtract
            source_file_name: Original file name
            generate_embedding: Whether to generate embedding (requires OpenAI API)
            
        Returns:
            Created Resume object
        """
        # Parse availability_date if it's a string
        availability_date = None
        availability_str = extracted_data.get("availabilityDate") or extracted_data.get("availability")
        if availability_str:
            try:
                availability_date = datetime.strptime(
                    str(availability_str), "%Y-%m-%d"
                ).date()
            except (ValueError, TypeError):
                pass
        
        # Map LlamaExtract snake_case to our camelCase (support both formats)
        name = extracted_data.get("name") or extracted_data.get("full_name", "Unknown")
        email = extracted_data.get("email")
        phone = extracted_data.get("phone")
        
        # Handle location - can be string or dict with city/country
        location = extracted_data.get("location")
        if not location:
            address = extracted_data.get("address")
            if isinstance(address, dict):
                location_parts = [address.get("city"), address.get("country")]
                location = ", ".join(filter(None, location_parts))
            elif address:
                location = str(address)
        
        current_role = extracted_data.get("currentRole") or extracted_data.get("desired_position")
        years_experience = extracted_data.get("yearsExperience") or extracted_data.get("total_years_experience")
        summary = extracted_data.get("summary") or extracted_data.get("professional_summary") or None
        salary_raw = extracted_data.get("salaryExpectation") or extracted_data.get("desired_salary")
        salary_expectation = int(salary_raw) if salary_raw and str(salary_raw).isdigit() else None
        nationality = extracted_data.get("nationality") or None
        
        # Handle skills - can be list of strings or list of dicts  
        skills_raw = extracted_data.get("skills", [])
        skills = []
        if isinstance(skills_raw, list):
            for skill in skills_raw:
                if isinstance(skill, dict):
                    skill_name = skill.get("skill_name") or skill.get("name") or skill.get("skill")
                    if skill_name:
                        skills.append(str(skill_name))
                elif skill:
                    skills.append(str(skill))
        
        # Handle languages - convert to simple list for languages column
        languages_raw = extracted_data.get("languages", [])
        languages = []
        languages_with_proficiency = []
        if isinstance(languages_raw, list):
            for lang in languages_raw:
                if isinstance(lang, dict):
                    lang_name = lang.get("language") or lang.get("name", "")
                    lang_level = lang.get("level") or lang.get("proficiency", "")
                    if lang_name:
                        languages.append(str(lang_name))
                        languages_with_proficiency.append({"language": lang_name, "level": lang_level})
                elif lang:
                    languages.append(str(lang))
        
        # Handle experience/work_experience
        experience = extracted_data.get("experience") or extracted_data.get("work_experience", [])
        
        # Handle education
        education = extracted_data.get("education", [])
        
        # Handle certifications
        certifications_raw = extracted_data.get("certifications", [])
        certifications = []
        if isinstance(certifications_raw, list):
            for cert in certifications_raw:
                if isinstance(cert, dict):
                    cert_name = cert.get("name") or cert.get("title")
                    if cert_name:
                        certifications.append(str(cert_name))
                elif cert:
                    certifications.append(str(cert))
        
        # Helper to safely convert to int or None
        def safe_int(value):
            if value is None or value == "":
                return None
            try:
                return int(value)
            except (ValueError, TypeError):
                return None
        
        # Helper to safely convert to bool or None
        def safe_bool(value):
            if value is None or value == "":
                return None
            if isinstance(value, bool):
                return value
            if isinstance(value, str):
                return value.lower() in ('true', 'yes', '1')
            return bool(value)
        
        # Create resume object with proper type handling
        resume = Resume(
            user_id=user_id,
            extraction_id=extraction_id,
            name=name or "Unknown",
            email=email or None,
            phone=phone or None,
            location=location or None,
            current_role=current_role or None,
            years_experience=safe_int(years_experience),
            skills=skills if skills else None,
            education=education if education else None,
            experience=experience if experience else None,
            certifications=certifications if certifications else None,
            languages=languages if languages else None,
            languages_with_proficiency=languages_with_proficiency if languages_with_proficiency else None,
            summary=summary or None,
            salary_expectation=salary_expectation,
            availability_date=availability_date,
            gender=extracted_data.get("gender") or None,
            nationality=nationality,
            birth_year=safe_int(extracted_data.get("birthYear") or extracted_data.get("birth_year")),
            has_car=safe_bool(extracted_data.get("hasCar") or extracted_data.get("has_car")),
            has_license=safe_bool(extracted_data.get("hasLicense") or extracted_data.get("has_license")),
            willing_to_travel=safe_bool(extracted_data.get("willingToTravel") or extracted_data.get("willing_to_travel")),
            source_file_name=source_file_name,
            raw_extracted_data=extracted_data,
        )
        
        # Generate embedding text
        embedding_text = resume.to_embedding_text()
        resume.embedding_text = embedding_text
        print(f"[ResumeService] Created resume object for: {resume.name}")
        
        # Generate embedding if enabled and API key is configured
        if generate_embedding:
            try:
                print(f"[ResumeService] Generating embedding...")
                embedding = await self.embedding_service.create_embedding(embedding_text)
                resume.embedding = embedding
                resume.embedding_model = self.embedding_service.model
                print(f"[ResumeService] Embedding generated successfully")
            except Exception as e:
                print(f"[ResumeService] Warning: Failed to generate embedding: {e}")
                # Continue without embedding - resume will still be saved
        else:
            print(f"[ResumeService] Skipping embedding generation (disabled)")
        
        print(f"[ResumeService] Saving resume to database...")
        self.db.add(resume)
        await self.db.commit()
        await self.db.refresh(resume)
        print(f"[ResumeService] Resume saved with ID: {resume.id}")
        
        return resume
    
    async def get_by_id(self, resume_id: str) -> Optional[Resume]:
        """Get resume by ID"""
        result = await self.db.execute(
            select(Resume).where(Resume.id == resume_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_user(
        self, 
        user_id: str, 
        limit: int = 50,
        offset: int = 0,
    ) -> List[Resume]:
        """Get all resumes for a user"""
        result = await self.db.execute(
            select(Resume)
            .where(Resume.user_id == user_id)
            .order_by(Resume.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())
    
    async def search_semantic(
        self,
        query: str,
        user_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.7,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search for resumes using vector similarity
        
        Args:
            query: Search query (e.g., "Python developer with 5 years experience")
            user_id: Optional filter by user
            limit: Maximum results to return
            threshold: Minimum similarity score (0-1, higher = more similar)
            
        Returns:
            List of resumes with similarity scores
        """
        # Generate embedding for query
        query_embedding = await self.embedding_service.create_embedding(query)
        
        # Build SQL query with cosine similarity
        # pgvector uses <=> for cosine distance (1 - similarity)
        # So we use 1 - distance to get similarity
        
        embedding_str = f"[{','.join(map(str, query_embedding))}]"
        
        sql = text("""
            SELECT 
                id, user_id, extraction_id, name, email, phone, location,
                current_role, years_experience, skills, summary,
                source_file_name, created_at,
                1 - (embedding <=> :embedding::vector) as similarity
            FROM resumes
            WHERE embedding IS NOT NULL
            AND 1 - (embedding <=> :embedding::vector) >= :threshold
        """)
        
        if user_id:
            sql = text("""
                SELECT 
                    id, user_id, extraction_id, name, email, phone, location,
                    current_role, years_experience, skills, summary,
                    source_file_name, created_at,
                    1 - (embedding <=> :embedding::vector) as similarity
                FROM resumes
                WHERE embedding IS NOT NULL
                AND user_id = :user_id
                AND 1 - (embedding <=> :embedding::vector) >= :threshold
                ORDER BY embedding <=> :embedding::vector
                LIMIT :limit
            """)
            result = await self.db.execute(
                sql, 
                {
                    "embedding": embedding_str, 
                    "user_id": user_id,
                    "threshold": threshold,
                    "limit": limit,
                }
            )
        else:
            sql = text("""
                SELECT 
                    id, user_id, extraction_id, name, email, phone, location,
                    current_role, years_experience, skills, summary,
                    source_file_name, created_at,
                    1 - (embedding <=> :embedding::vector) as similarity
                FROM resumes
                WHERE embedding IS NOT NULL
                AND 1 - (embedding <=> :embedding::vector) >= :threshold
                ORDER BY embedding <=> :embedding::vector
                LIMIT :limit
            """)
            result = await self.db.execute(
                sql, 
                {
                    "embedding": embedding_str, 
                    "threshold": threshold,
                    "limit": limit,
                }
            )
        
        rows = result.fetchall()
        
        return [
            {
                "id": row.id,
                "userId": row.user_id,
                "extractionId": row.extraction_id,
                "name": row.name,
                "email": row.email,
                "phone": row.phone,
                "location": row.location,
                "currentRole": row.current_role,
                "yearsExperience": row.years_experience,
                "skills": row.skills,
                "summary": row.summary,
                "sourceFileName": row.source_file_name,
                "createdAt": row.created_at.isoformat() if row.created_at else None,
                "similarity": round(row.similarity, 4),
            }
            for row in rows
        ]
    
    async def search_by_skills(
        self,
        skills: List[str],
        user_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[Resume]:
        """
        Search resumes by required skills
        
        Args:
            skills: List of required skills
            user_id: Optional filter by user
            limit: Maximum results
            
        Returns:
            Resumes that have any of the specified skills
        """
        # Use PostgreSQL array overlap operator
        sql = text("""
            SELECT * FROM resumes
            WHERE skills && :skills
            ORDER BY array_length(
                ARRAY(SELECT unnest(skills) INTERSECT SELECT unnest(:skills::text[])),
                1
            ) DESC NULLS LAST
            LIMIT :limit
        """)
        
        if user_id:
            sql = text("""
                SELECT * FROM resumes
                WHERE skills && :skills
                AND user_id = :user_id
                ORDER BY array_length(
                    ARRAY(SELECT unnest(skills) INTERSECT SELECT unnest(:skills::text[])),
                    1
                ) DESC NULLS LAST
                LIMIT :limit
            """)
            result = await self.db.execute(
                sql, {"skills": skills, "user_id": user_id, "limit": limit}
            )
        else:
            result = await self.db.execute(
                sql, {"skills": skills, "limit": limit}
            )
        
        return list(result.scalars().all())
    
    async def delete(self, resume_id: str) -> bool:
        """Delete a resume"""
        resume = await self.get_by_id(resume_id)
        if not resume:
            return False
        
        await self.db.delete(resume)
        await self.db.commit()
        return True
    
    async def regenerate_embedding(self, resume_id: str) -> Optional[Resume]:
        """Regenerate embedding for an existing resume"""
        resume = await self.get_by_id(resume_id)
        if not resume:
            return None
        
        # Generate new embedding text and embedding
        embedding_text = resume.to_embedding_text()
        resume.embedding_text = embedding_text
        
        try:
            embedding = await self.embedding_service.create_embedding(embedding_text)
            resume.embedding = embedding
            resume.embedding_model = self.embedding_service.model
            resume.updated_at = datetime.utcnow()
            
            await self.db.commit()
            await self.db.refresh(resume)
            
            return resume
        except Exception as e:
            print(f"[ResumeService] Error regenerating embedding: {e}")
            return None
    
    async def count_by_user(self, user_id: str) -> int:
        """Count resumes for a user"""
        result = await self.db.execute(
            select(func.count(Resume.id)).where(Resume.user_id == user_id)
        )
        return result.scalar() or 0
