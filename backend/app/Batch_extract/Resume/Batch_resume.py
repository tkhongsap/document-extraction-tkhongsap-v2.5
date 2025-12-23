"""
Batch Resume Extraction Script with Embedding
Reads resume files from input folder, extracts data using LlamaExtract,
generates embeddings, and saves individual JSON files to output folder.

Output JSON matches the database schema:
- id, user_id, extraction_id, name, email, phone, location, current_role, etc.
- embedding (JSONB array), embedding_model, embedding_text
- raw_extracted_data, created_at, updated_at

Also generates a combined CSV file with all resume data.
Includes token counting and cost estimation for embeddings.
"""
import os
import sys
import json
import asyncio
import uuid
import csv
import time
from pathlib import Path
from datetime import datetime, date
from typing import List, Dict, Any, Optional, Tuple

# Add parent paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

# Load .env from backend folder
from dotenv import load_dotenv
BACKEND_DIR = Path(__file__).parent.parent.parent.parent
load_dotenv(BACKEND_DIR / ".env")

from app.services.llama_extract import create_llama_extract_service, LlamaExtractError
from app.services.embedding_service import get_embedding_service


# Configuration
SCRIPT_DIR = Path(__file__).parent
INPUT_DIR = SCRIPT_DIR / "input"
OUTPUT_DIR = SCRIPT_DIR / "output"

# Default user_id for batch processing (not saving to DB)
DEFAULT_USER_ID = "batch_user"

# Supported file types
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".doc"}
ALLOWED_MIMES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Embedding cost per 1K tokens (USD)
# OpenAI text-embedding-3-small: $0.00002 per 1K tokens
# OpenAI text-embedding-3-large: $0.00013 per 1K tokens
# Ollama: Free (local)
EMBEDDING_COSTS = {
    "text-embedding-3-small": 0.00002,
    "text-embedding-3-large": 0.00013,
    "text-embedding-ada-002": 0.0001,
    # Ollama models are free
    "bge-m3:latest": 0.0,
    "nomic-embed-text": 0.0,
    "mxbai-embed-large": 0.0,
}

# Exchange rate USD to THB (approximate, update as needed)
USD_TO_THB = 34.0


def estimate_tokens(text: str) -> int:
    """
    Estimate token count for text.
    Uses a simple heuristic: ~4 characters per token for English,
    ~2 characters per token for Thai/CJK languages.
    For more accurate counts, use tiktoken library.
    """
    if not text:
        return 0
    
    # Try to use tiktoken for accurate count
    try:
        import tiktoken
        # cl100k_base is used by text-embedding-3-small/large
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except ImportError:
        pass
    
    # Fallback: estimate based on character count
    # Thai and CJK characters typically use more tokens
    thai_cjk_count = sum(1 for c in text if ord(c) > 127)
    ascii_count = len(text) - thai_cjk_count
    
    # Rough estimate: 4 chars/token for ASCII, 1.5 chars/token for Thai/CJK
    estimated = (ascii_count / 4) + (thai_cjk_count / 1.5)
    return int(estimated)


def calculate_embedding_cost(tokens: int, model: str) -> float:
    """Calculate embedding cost in USD based on token count and model"""
    cost_per_1k = EMBEDDING_COSTS.get(model, 0.0)
    return (tokens / 1000) * cost_per_1k


def format_duration(seconds: float) -> str:
    """Format duration in human readable format"""
    if seconds < 60:
        return f"{seconds:.2f}s"
    elif seconds < 3600:
        mins = int(seconds // 60)
        secs = seconds % 60
        return f"{mins}m {secs:.1f}s"
    else:
        hours = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours}h {mins}m {secs:.1f}s"


def format_cost(cost: float) -> str:
    """Format cost in USD and THB"""
    if cost == 0:
        return "Free"
    
    cost_thb = cost * USD_TO_THB
    
    if cost < 0.01:
        return f"${cost:.6f} (฿{cost_thb:.4f})"
    else:
        return f"${cost:.4f} (฿{cost_thb:.2f})"


def format_cost_thb(cost_usd: float) -> str:
    """Format cost in THB only"""
    if cost_usd == 0:
        return "฿0"
    cost_thb = cost_usd * USD_TO_THB
    if cost_thb < 0.01:
        return f"฿{cost_thb:.6f}"
    elif cost_thb < 1:
        return f"฿{cost_thb:.4f}"
    else:
        return f"฿{cost_thb:.2f}"


def safe_print(message: str, end: str = "\n") -> None:
    """Print message safely with UTF-8 encoding"""
    try:
        print(message, end=end)
    except UnicodeEncodeError:
        print(message.encode('utf-8', errors='replace').decode('utf-8', errors='replace'), end=end)


def generate_uuid() -> str:
    """Generate a new UUID"""
    return str(uuid.uuid4())


def get_mime_type(file_path: Path) -> str:
    """Get MIME type from file extension"""
    ext = file_path.suffix.lower()
    return ALLOWED_MIMES.get(ext, "application/octet-stream")


def natural_sort_key(path: Path) -> List:
    """Natural sort key for file names (handles numbers correctly)"""
    import re
    return [int(text) if text.isdigit() else text.lower() 
            for text in re.split(r'(\d+)', path.name)]


def scan_input_folder() -> List[Path]:
    """Scan input folder for supported files"""
    if not INPUT_DIR.exists():
        INPUT_DIR.mkdir(parents=True, exist_ok=True)
        safe_print(f"Created input folder: {INPUT_DIR}")
        return []
    
    files = []
    for file_path in INPUT_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
            if file_path.stat().st_size <= MAX_FILE_SIZE:
                files.append(file_path)
            else:
                safe_print(f"⚠️ Skipping {file_path.name} - file too large (max 50MB)")
    
    # Sort by natural order (1, 2, 10 instead of 1, 10, 2)
    return sorted(files, key=natural_sort_key)


def save_json_result(data: Dict[str, Any], output_path: Path) -> None:
    """Save extraction result as JSON file"""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=str)


# CSV Column Headers matching database schema EXACTLY
# Order follows database table definition
CSV_COLUMNS = [
    "id",
    "user_id",
    "extraction_id",
    "name",
    "email",
    "phone",
    "location",
    "current_role",
    "years_experience",
    "skills",
    "education",
    "experience",
    "certifications",
    "languages",
    "languages_with_proficiency",
    "summary",
    "salary_expectation",
    "availability_date",
    "gender",
    "nationality",
    "birth_year",
    "has_car",
    "has_license",
    "willing_to_travel",
    "embedding",
    "embedding_model",
    "embedding_text",
    "source_file_name",
    "raw_extracted_data",
    "created_at",
    "updated_at",
]


def convert_to_csv_row(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert extraction data to CSV row format matching database schema.
    All complex fields (arrays, objects) are stored as JSON strings.
    """
    return {
        "id": data.get("id", ""),
        "user_id": data.get("user_id", ""),
        "extraction_id": data.get("extraction_id"),
        "name": data.get("name", ""),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "location": data.get("location"),
        "current_role": data.get("current_role"),
        "years_experience": data.get("years_experience"),
        "skills": json.dumps(data.get("skills"), ensure_ascii=False) if data.get("skills") else None,
        "education": json.dumps(data.get("education"), ensure_ascii=False) if data.get("education") else None,
        "experience": json.dumps(data.get("experience"), ensure_ascii=False) if data.get("experience") else None,
        "certifications": json.dumps(data.get("certifications"), ensure_ascii=False) if data.get("certifications") else None,
        "languages": json.dumps(data.get("languages"), ensure_ascii=False) if data.get("languages") else None,
        "languages_with_proficiency": json.dumps(data.get("languages_with_proficiency"), ensure_ascii=False) if data.get("languages_with_proficiency") else None,
        "summary": data.get("summary"),
        "salary_expectation": data.get("salary_expectation"),
        "availability_date": data.get("availability_date"),
        "gender": data.get("gender"),
        "nationality": data.get("nationality"),
        "birth_year": data.get("birth_year"),
        "has_car": data.get("has_car"),
        "has_license": data.get("has_license"),
        "willing_to_travel": data.get("willing_to_travel"),
        "embedding": json.dumps(data.get("embedding")) if data.get("embedding") else None,
        "embedding_model": data.get("embedding_model"),
        "embedding_text": data.get("embedding_text"),
        "source_file_name": data.get("source_file_name"),
        "raw_extracted_data": json.dumps(data.get("raw_extracted_data"), ensure_ascii=False) if data.get("raw_extracted_data") else None,
        "created_at": data.get("created_at", ""),
        "updated_at": data.get("updated_at", ""),
    }


def save_combined_csv(all_data: List[Dict[str, Any]], output_path: Path) -> None:
    """Save all extraction results to a combined CSV file"""
    if not all_data:
        return
    
    # Convert all data to CSV rows
    csv_rows = [convert_to_csv_row(data) for data in all_data]
    
    # Write CSV with UTF-8 BOM for Excel compatibility
    with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(csv_rows)


def load_csv_to_dataframe(csv_path: Path) -> "pd.DataFrame":
    """
    Load CSV file to pandas DataFrame with proper type conversions.
    JSON columns are parsed back to Python objects.
    Ready for database transformation.
    
    Usage:
        df = load_csv_to_dataframe(Path("output/resumes_20251222_120000.csv"))
        # Then use df.to_sql() or other methods to load to database
    """
    try:
        import pandas as pd
    except ImportError:
        raise ImportError("pandas is required for DataFrame operations. Install with: pip install pandas")
    
    # Read CSV
    df = pd.read_csv(csv_path, encoding='utf-8-sig')
    
    # JSON/JSONB columns that need parsing
    json_columns = [
        'skills', 'certifications', 'languages',
        'education', 'experience', 'languages_with_proficiency',
        'embedding', 'raw_extracted_data'
    ]
    
    # Parse JSON columns back to Python objects
    for col in json_columns:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: json.loads(x) if pd.notna(x) and x else None)
    
    # Convert boolean columns
    bool_columns = ['has_car', 'has_license', 'willing_to_travel']
    for col in bool_columns:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: None if pd.isna(x) else bool(x))
    
    # Convert integer columns
    int_columns = ['birth_year', 'years_experience', 'salary_expectation']
    for col in int_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').astype('Int64')
    
    return df


def dataframe_to_db_records(df: "pd.DataFrame") -> List[Dict[str, Any]]:
    """
    Convert DataFrame to list of dictionaries ready for database insertion.
    Handles NULL values and type conversions properly.
    
    Usage:
        df = load_csv_to_dataframe(csv_path)
        records = dataframe_to_db_records(df)
        # Use records with SQLAlchemy bulk insert or other methods
    """
    import pandas as pd
    
    records = []
    for _, row in df.iterrows():
        record = {}
        for col in df.columns:
            value = row[col]
            # Convert pandas NA to None
            if pd.isna(value):
                record[col] = None
            # Convert numpy types to Python types
            elif hasattr(value, 'item'):
                record[col] = value.item()
            else:
                record[col] = value
        records.append(record)
    
    return records


def _safe_int(value) -> Optional[int]:
    """Safely convert to int or return None"""
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _safe_bool(value) -> Optional[bool]:
    """Safely convert to bool or return None"""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', 'yes', '1')
    return bool(value)


def _parse_location(data: Dict) -> Optional[str]:
    """Parse location from various formats"""
    location = data.get("location")
    if location:
        return location
    
    address = data.get("address")
    if isinstance(address, dict):
        parts = [address.get("city"), address.get("country")]
        return ", ".join(filter(None, parts)) or None
    elif address:
        return str(address)
    
    return None


def _parse_skills(skills_raw: List) -> Optional[List[str]]:
    """Parse skills to list of strings"""
    if not skills_raw:
        return None
    skills = []
    if isinstance(skills_raw, list):
        for skill in skills_raw:
            if isinstance(skill, dict):
                skill_name = skill.get("skill_name") or skill.get("name") or skill.get("skill")
                if skill_name:
                    skills.append(str(skill_name))
            elif skill:
                skills.append(str(skill))
    return skills if skills else None


def _parse_certifications(certs_raw: List) -> Optional[List[str]]:
    """Parse certifications to list of strings"""
    if not certs_raw:
        return None
    certs = []
    if isinstance(certs_raw, list):
        for cert in certs_raw:
            if isinstance(cert, dict):
                cert_name = cert.get("name") or cert.get("title")
                if cert_name:
                    certs.append(str(cert_name))
            elif cert:
                certs.append(str(cert))
    return certs if certs else None


def _parse_languages(langs_raw: List) -> Optional[List[str]]:
    """Parse languages to list of strings"""
    if not langs_raw:
        return None
    languages = []
    if isinstance(langs_raw, list):
        for lang in langs_raw:
            if isinstance(lang, dict):
                lang_name = lang.get("language") or lang.get("name", "")
                if lang_name:
                    languages.append(str(lang_name))
            elif lang:
                languages.append(str(lang))
    return languages if languages else None


def _parse_languages_with_proficiency(langs_raw: List) -> Optional[List[Dict]]:
    """Parse languages with proficiency levels"""
    if not langs_raw:
        return None
    languages = []
    if isinstance(langs_raw, list):
        for lang in langs_raw:
            if isinstance(lang, dict):
                lang_name = lang.get("language") or lang.get("name", "")
                lang_level = lang.get("level") or lang.get("proficiency", "")
                if lang_name:
                    languages.append({"language": lang_name, "level": lang_level})
    return languages if languages else None


def _parse_availability_date(value) -> Optional[str]:
    """Parse availability date to ISO format string"""
    if not value:
        return None
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        try:
            parsed = datetime.strptime(value, "%Y-%m-%d")
            return parsed.date().isoformat()
        except ValueError:
            return value
    return None


def generate_embedding_text(data: Dict[str, Any]) -> str:
    """
    Generate text for embedding from resume fields
    Same logic as Resume.to_embedding_text() in models/resume.py
    """
    parts = []
    
    if data.get("name"):
        parts.append(f"Name: {data['name']}")
    if data.get("current_role"):
        parts.append(f"Current Role: {data['current_role']}")
    if data.get("location"):
        parts.append(f"Location: {data['location']}")
    if data.get("years_experience"):
        parts.append(f"Years of Experience: {data['years_experience']}")
    if data.get("summary"):
        parts.append(f"Summary: {data['summary']}")
    
    # Skills
    if data.get("skills"):
        skill_texts = []
        for skill in data["skills"]:
            if isinstance(skill, dict):
                skill_texts.append(skill.get('name', skill.get('skill', str(skill))))
            else:
                skill_texts.append(str(skill))
        parts.append(f"Skills: {', '.join(skill_texts)}")
    
    # Certifications
    if data.get("certifications"):
        cert_texts = []
        for cert in data["certifications"]:
            if isinstance(cert, dict):
                cert_texts.append(cert.get('name', cert.get('title', str(cert))))
            else:
                cert_texts.append(str(cert))
        parts.append(f"Certifications: {', '.join(cert_texts)}")
    
    # Languages
    if data.get("languages"):
        lang_texts = []
        for lang in data["languages"]:
            if isinstance(lang, dict):
                lang_name = lang.get('language', lang.get('name', ''))
                lang_level = lang.get('level', lang.get('proficiency', ''))
                if lang_level:
                    lang_texts.append(f"{lang_name} ({lang_level})")
                else:
                    lang_texts.append(str(lang_name))
            else:
                lang_texts.append(str(lang))
        parts.append(f"Languages: {', '.join(lang_texts)}")
    
    # Education
    if data.get("education"):
        edu_texts = []
        for edu in data["education"]:
            if isinstance(edu, dict):
                edu_text = f"{edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('institution', '')}"
                edu_texts.append(edu_text.strip())
        if edu_texts:
            parts.append(f"Education: {'; '.join(edu_texts)}")
    
    # Experience
    if data.get("experience"):
        exp_texts = []
        for exp in data["experience"]:
            if isinstance(exp, dict):
                exp_text = f"{exp.get('title', '')} at {exp.get('company', '')}: {exp.get('description', '')}"
                exp_texts.append(exp_text.strip())
        if exp_texts:
            parts.append(f"Experience: {'; '.join(exp_texts)}")
    
    return "\n".join(parts)


async def extract_single_resume(
    file_path: Path,
    generate_embedding: bool = True,
    user_id: str = DEFAULT_USER_ID,
) -> Dict[str, Any]:
    """
    Extract data from a single resume file with embedding
    
    Args:
        file_path: Path to the resume file
        generate_embedding: Whether to generate embedding vector
        user_id: User ID for the record
        
    Returns:
        Dictionary matching the database schema
    """
    safe_print(f"\n📄 Processing: {file_path.name}")
    
    # Read file content
    with open(file_path, 'rb') as f:
        buffer = f.read()
    
    file_size = len(buffer)
    mime_type = get_mime_type(file_path)
    
    safe_print(f"   Size: {file_size / 1024:.1f} KB | Type: {mime_type}")
    
    # Extract using LlamaExtract
    llama_extract = create_llama_extract_service()
    result = await llama_extract.extract_document(
        buffer,
        file_path.name,
        "resume"
    )
    
    extracted_data = result.extracted_data or {}
    now = datetime.utcnow()
    
    # Parse extracted data to match schema
    name = extracted_data.get("name") or extracted_data.get("full_name") or "Unknown"
    current_role = extracted_data.get("currentRole") or extracted_data.get("desired_position")
    location = _parse_location(extracted_data)
    years_experience = _safe_int(extracted_data.get("yearsExperience") or extracted_data.get("total_years_experience"))
    skills = _parse_skills(extracted_data.get("skills", []))
    education = extracted_data.get("education", []) or None
    experience = extracted_data.get("experience") or extracted_data.get("work_experience", []) or None
    certifications = _parse_certifications(extracted_data.get("certifications", []))
    languages = _parse_languages(extracted_data.get("languages", []))
    languages_with_proficiency = _parse_languages_with_proficiency(extracted_data.get("languages", []))
    summary = extracted_data.get("summary") or extracted_data.get("professional_summary")
    
    # Build output structure matching database schema exactly
    output_data = {
        # Primary keys
        "id": generate_uuid(),
        "user_id": user_id,
        "extraction_id": None,  # No DB extraction record
        
        # Resume fields
        "name": name,
        "email": extracted_data.get("email"),
        "phone": extracted_data.get("phone"),
        "location": location,
        "current_role": current_role,
        "years_experience": years_experience,
        "skills": skills,
        "education": education,
        "experience": experience,
        "certifications": certifications,
        "languages": languages,
        "languages_with_proficiency": languages_with_proficiency,
        "summary": summary,
        "salary_expectation": _safe_int(extracted_data.get("salaryExpectation") or extracted_data.get("desired_salary")),
        "availability_date": _parse_availability_date(extracted_data.get("availabilityDate") or extracted_data.get("availability")),
        "gender": extracted_data.get("gender"),
        "nationality": extracted_data.get("nationality"),
        "birth_year": _safe_int(extracted_data.get("birthYear") or extracted_data.get("birth_year")),
        "has_car": _safe_bool(extracted_data.get("hasCar") or extracted_data.get("has_car")),
        "has_license": _safe_bool(extracted_data.get("hasLicense") or extracted_data.get("has_license")),
        "willing_to_travel": _safe_bool(extracted_data.get("willingToTravel") or extracted_data.get("willing_to_travel")),
        
        # Embedding fields
        "embedding": None,
        "embedding_model": None,
        "embedding_text": None,
        
        # Metadata
        "source_file_name": file_path.name,
        "raw_extracted_data": extracted_data,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    
    # Track embedding stats separately (not saved to DB)
    embedding_tokens = 0
    embedding_cost_usd = 0.0
    
    # Generate embedding text
    embedding_text = generate_embedding_text(output_data)
    output_data["embedding_text"] = embedding_text
    
    # Calculate tokens for embedding text
    embedding_tokens = estimate_tokens(embedding_text) if embedding_text else 0
    
    # Generate embedding if enabled
    if generate_embedding and embedding_text:
        try:
            safe_print(f"   🔄 Generating embedding ({embedding_tokens} tokens)...")
            embedding_start = time.time()
            embedding_service = get_embedding_service()
            embedding_vector = await embedding_service.create_embedding(embedding_text)
            embedding_duration = time.time() - embedding_start
            
            output_data["embedding"] = embedding_vector  # Store as JSON array
            output_data["embedding_model"] = embedding_service.model
            
            # Calculate cost (for reporting only, not saved to DB)
            embedding_cost_usd = calculate_embedding_cost(embedding_tokens, embedding_service.model)
            
            cost_str = format_cost(embedding_cost_usd)
            safe_print(f"   ✅ Embedding: {len(embedding_vector)} dims | {embedding_tokens} tokens | {cost_str} | {embedding_duration:.2f}s")
        except Exception as e:
            safe_print(f"   ⚠️ Failed to generate embedding: {e}")
            # Continue without embedding
    
    # Return output_data for DB + stats for reporting
    return output_data, embedding_tokens, embedding_cost_usd


async def batch_extract_resumes(
    generate_embeddings: bool = True,
    user_id: str = DEFAULT_USER_ID,
) -> Dict[str, Any]:
    """
    Main batch extraction function with embedding support
    
    Args:
        generate_embeddings: Whether to generate embeddings for each resume
        user_id: User ID to use for all records
        
    Returns:
        Summary of batch processing results
    """
    start_time = datetime.now()
    
    safe_print("=" * 70)
    safe_print("🚀 BATCH RESUME EXTRACTION WITH EMBEDDING")
    safe_print("=" * 70)
    safe_print(f"📁 Input folder:  {INPUT_DIR}")
    safe_print(f"📁 Output folder: {OUTPUT_DIR}")
    safe_print(f"🔗 Generate embeddings: {generate_embeddings}")
    
    # Check embedding provider
    embedding_provider = None
    embedding_model = None
    if generate_embeddings:
        try:
            embedding_service = get_embedding_service()
            embedding_provider = embedding_service.provider
            embedding_model = embedding_service.model
            safe_print(f"🤖 Embedding provider: {embedding_provider}")
            safe_print(f"🤖 Embedding model: {embedding_model}")
        except Exception as e:
            safe_print(f"⚠️ Embedding service error: {e}")
            safe_print("   Continuing without embeddings...")
            generate_embeddings = False
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Scan for files
    files = scan_input_folder()
    
    if not files:
        safe_print("\n⚠️ No files found in input folder!")
        safe_print(f"   Please add resume files (PDF, PNG, JPG, DOCX) to: {INPUT_DIR}")
        return {
            "success": False,
            "message": "No files found in input folder",
            "total_files": 0,
        }
    
    safe_print(f"\n📋 Found {len(files)} file(s) to process")
    
    # Process each file
    results = []
    all_extracted_data = []  # Collect all data for CSV export
    successful = 0
    failed = 0
    embeddings_generated = 0
    total_tokens = 0
    total_cost = 0.0
    
    for i, file_path in enumerate(files, 1):
        safe_print(f"\n[{i}/{len(files)}] ", end="")
        file_start_time = time.time()
        
        try:
            # Extract resume data with embedding
            extraction_result, embedding_tokens, embedding_cost = await extract_single_resume(
                file_path,
                generate_embedding=generate_embeddings,
                user_id=user_id,
            )
            
            # Calculate file processing time
            file_duration = time.time() - file_start_time
            
            # Generate output filename (same name as input, just .json extension)
            output_filename = f"{file_path.stem}.json"
            output_path = OUTPUT_DIR / output_filename
            
            # Save JSON result (only DB fields)
            save_json_result(extraction_result, output_path)
            
            # Collect for CSV export
            all_extracted_data.append(extraction_result)
            
            has_embedding = extraction_result.get("embedding") is not None
            if has_embedding:
                embeddings_generated += 1
                total_tokens += embedding_tokens
                total_cost += embedding_cost
            
            safe_print(f"   💾 Saved: {output_filename} ({format_duration(file_duration)})")
            
            results.append({
                "file": file_path.name,
                "output": output_filename,
                "success": True,
                "name": extraction_result.get("name"),
                "skills_count": len(extraction_result.get("skills") or []),
                "has_embedding": has_embedding,
                "embedding_dimensions": len(extraction_result.get("embedding") or []),
                "embedding_tokens": embedding_tokens,
                "embedding_cost_usd": embedding_cost,
                "processing_time_seconds": round(file_duration, 2),
            })
            successful += 1
            
        except LlamaExtractError as e:
            file_duration = time.time() - file_start_time
            error_msg = str(e) if str(e) else "LlamaExtract extraction failed (unknown error)"
            safe_print(f"   ❌ LlamaExtract Error: {error_msg}")
            results.append({
                "file": file_path.name,
                "success": False,
                "error": error_msg,
                "error_type": "LlamaExtractError",
                "processing_time_seconds": round(file_duration, 2),
            })
            failed += 1
            
        except Exception as e:
            file_duration = time.time() - file_start_time
            import traceback
            error_msg = str(e) if str(e) else "Unknown error occurred"
            error_traceback = traceback.format_exc()
            safe_print(f"   ❌ Error: {error_msg}")
            safe_print(f"   📋 Traceback: {error_traceback}")
            results.append({
                "file": file_path.name,
                "success": False,
                "error": error_msg,
                "error_type": type(e).__name__,
                "traceback": error_traceback,
                "processing_time_seconds": round(file_duration, 2),
            })
            failed += 1
    
    # Save combined CSV file
    csv_filename = None
    if all_extracted_data:
        batch_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        csv_filename = f"_all_resumes_{batch_id}.csv"
        csv_path = OUTPUT_DIR / csv_filename
        save_combined_csv(all_extracted_data, csv_path)
        safe_print(f"\n📊 Combined CSV saved: {csv_filename}")
    
    # Calculate duration
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    # Calculate average time per file
    avg_time_per_file = duration / len(files) if files else 0
    
    # Print summary
    safe_print("\n" + "=" * 70)
    safe_print("📊 BATCH PROCESSING SUMMARY")
    safe_print("=" * 70)
    safe_print(f"   Total files:          {len(files)}")
    safe_print(f"   ✅ Successful:        {successful}")
    safe_print(f"   ❌ Failed:            {failed}")
    safe_print(f"   🔗 With embeddings:   {embeddings_generated}")
    safe_print(f"   📊 CSV file:          {csv_filename or 'N/A'}")
    safe_print("")
    safe_print(f"   ⏱️  Total time:        {format_duration(duration)}")
    safe_print(f"   ⏱️  Avg per file:      {format_duration(avg_time_per_file)}")
    safe_print("")
    safe_print(f"   🔢 Total tokens:       {total_tokens:,}")
    safe_print(f"   � Total cost (USD):   ${total_cost:.6f}")
    safe_print(f"   💰 Total cost (THB):   {format_cost_thb(total_cost)}")
    if total_tokens > 0 and total_cost > 0:
        cost_per_1k_usd = (total_cost / total_tokens) * 1000
        cost_per_1k_thb = cost_per_1k_usd * USD_TO_THB
        safe_print(f"   💰 Cost per 1K tokens: ${cost_per_1k_usd:.6f} (฿{cost_per_1k_thb:.4f})")
    safe_print("")
    safe_print(f"   📁 Output:            {OUTPUT_DIR}")
    safe_print("=" * 70)
    
    # Save batch summary
    summary = {
        "batch_id": datetime.now().strftime("%Y%m%d_%H%M%S"),
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "duration_seconds": round(duration, 2),
        "duration_formatted": format_duration(duration),
        "avg_time_per_file_seconds": round(avg_time_per_file, 2),
        "total_files": len(files),
        "successful": successful,
        "failed": failed,
        "embeddings_generated": embeddings_generated,
        "embedding_provider": embedding_provider,
        "embedding_model": embedding_model,
        "total_embedding_tokens": total_tokens,
        "total_embedding_cost_usd": round(total_cost, 8),
        "csv_file": csv_filename,
        "results": results,
    }
    
    summary_path = OUTPUT_DIR / f"_batch_summary_{summary['batch_id']}.json"
    save_json_result(summary, summary_path)
    safe_print(f"\n📄 Batch summary saved: {summary_path.name}")
    
    return summary


def main():
    """Entry point for command line execution"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Batch Resume Extraction with Embedding")
    parser.add_argument(
        "--no-embedding", 
        action="store_true", 
        help="Skip embedding generation"
    )
    parser.add_argument(
        "--user-id",
        type=str,
        default=DEFAULT_USER_ID,
        help=f"User ID for records (default: {DEFAULT_USER_ID})"
    )
    
    args = parser.parse_args()
    
    try:
        result = asyncio.run(batch_extract_resumes(
            generate_embeddings=not args.no_embedding,
            user_id=args.user_id,
        ))
        
        if result.get("success", True) and result.get("successful", 0) > 0:
            sys.exit(0)
        else:
            sys.exit(1)
            
    except KeyboardInterrupt:
        safe_print("\n\n⚠️ Process interrupted by user")
        sys.exit(130)
    except Exception as e:
        safe_print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
