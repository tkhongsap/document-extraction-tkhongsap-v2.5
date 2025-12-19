"""
Resume Model with Vector Embedding for RAG
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Boolean, Date, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from pgvector.sqlalchemy import Vector

from app.core.database import Base
from .base import generate_uuid


class Resume(Base):
    """Resumes table - structured resume data with vector embeddings for RAG"""
    __tablename__ = "resumes"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    extraction_id = Column(String, ForeignKey("extractions.id"), nullable=True)
    
    # Resume fields (aligned with extraction schema)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)
    current_role = Column(String, nullable=True)
    years_experience = Column(Integer, nullable=True)
    skills = Column(ARRAY(Text), nullable=True)
    education = Column(JSONB, nullable=True)
    experience = Column(JSONB, nullable=True)
    certifications = Column(ARRAY(Text), nullable=True)
    languages = Column(ARRAY(Text), nullable=True)
    languages_with_proficiency = Column(JSONB, nullable=True)
    summary = Column(Text, nullable=True)
    salary_expectation = Column(Integer, nullable=True)
    availability_date = Column(Date, nullable=True)
    gender = Column(String, nullable=True)
    nationality = Column(String, nullable=True)
    birth_year = Column(Integer, nullable=True)
    has_car = Column(Boolean, nullable=True)
    has_license = Column(Boolean, nullable=True)
    willing_to_travel = Column(Boolean, nullable=True)
    
    # Vector embedding for semantic search (RAG)
    embedding = Column(Vector(1536), nullable=True)
    embedding_model = Column(String, default='text-embedding-3-small')
    embedding_text = Column(Text, nullable=True)
    
    # Metadata
    source_file_name = Column(String, nullable=True)
    raw_extracted_data = Column(JSONB, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="resumes")
    extraction = relationship("Extraction", back_populates="resume")
    
    def to_dict(self):
        """Convert resume to dictionary (without embedding for API response)"""
        return {
            "id": self.id,
            "userId": self.user_id,
            "extractionId": self.extraction_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "location": self.location,
            "currentRole": self.current_role,
            "yearsExperience": self.years_experience,
            "skills": self.skills,
            "education": self.education,
            "experience": self.experience,
            "certifications": self.certifications,
            "languages": self.languages,
            "languagesWithProficiency": self.languages_with_proficiency,
            "summary": self.summary,
            "salaryExpectation": self.salary_expectation,
            "availabilityDate": str(self.availability_date) if self.availability_date else None,
            "gender": self.gender,
            "nationality": self.nationality,
            "birthYear": self.birth_year,
            "hasCar": self.has_car,
            "hasLicense": self.has_license,
            "willingToTravel": self.willing_to_travel,
            "sourceFileName": self.source_file_name,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def to_embedding_text(self) -> str:
        """Generate text for embedding from resume fields"""
        parts = []
        
        if self.name:
            parts.append(f"Name: {self.name}")
        if self.current_role:
            parts.append(f"Current Role: {self.current_role}")
        if self.location:
            parts.append(f"Location: {self.location}")
        if self.years_experience:
            parts.append(f"Years of Experience: {self.years_experience}")
        if self.summary:
            parts.append(f"Summary: {self.summary}")
        if self.skills:
            parts.append(f"Skills: {', '.join(self.skills)}")
        if self.certifications:
            parts.append(f"Certifications: {', '.join(self.certifications)}")
        if self.languages:
            parts.append(f"Languages: {', '.join(self.languages)}")
        if self.education:
            edu_texts = []
            for edu in self.education:
                edu_text = f"{edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('institution', '')}"
                edu_texts.append(edu_text.strip())
            if edu_texts:
                parts.append(f"Education: {'; '.join(edu_texts)}")
        if self.experience:
            exp_texts = []
            for exp in self.experience:
                exp_text = f"{exp.get('title', '')} at {exp.get('company', '')}: {exp.get('description', '')}"
                exp_texts.append(exp_text.strip())
            if exp_texts:
                parts.append(f"Experience: {'; '.join(exp_texts)}")
        
        return "\n".join(parts)
