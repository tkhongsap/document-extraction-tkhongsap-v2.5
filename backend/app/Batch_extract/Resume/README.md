# Batch Resume Extraction with Embedding

สคริปต์สำหรับ Extract ข้อมูลจาก Resume หลายไฟล์พร้อมกัน และ Generate Embedding Vector สำหรับ Semantic Search

## 📋 Features

- ✅ รองรับไฟล์ PDF, PNG, JPG, JPEG, DOCX, DOC
- ✅ Extract ข้อมูล Resume ด้วย LlamaExtract API
- ✅ Generate Embedding Vector ด้วย Ollama หรือ OpenAI
- ✅ Output JSON ตรงกับ Database Schema
- ✅ Natural Sort (เรียงลำดับ 1, 2, 10 ไม่ใช่ 1, 10, 2)
- ✅ Batch Summary Report

## 📁 โครงสร้างโฟลเดอร์

```
Batch_extract/Resume/
├── Batch_resume.py      # สคริปต์หลัก
├── README.md            # คู่มือการใช้งาน
├── input/               # 📥 ใส่ไฟล์ Resume ที่นี่
│   ├── resume1.pdf
│   ├── resume2.pdf
│   └── ...
└── output/              # 📤 ผลลัพธ์ JSON จะออกที่นี่
    ├── resume1.json
    ├── resume2.json
    └── _batch_summary_YYYYMMDD_HHMMSS.json
```

## 🚀 วิธีใช้งาน

### 1. เตรียม Environment

```bash
# ตรวจสอบว่าอยู่ใน conda environment ที่ถูกต้อง
conda activate eureka

# ไปที่โฟลเดอร์ script
cd backend/app/Batch_extract/Resume
```

### 2. ใส่ไฟล์ Resume

นำไฟล์ Resume (PDF, PNG, JPG, DOCX) ไปใส่ในโฟลเดอร์ `input/`

### 3. รัน Script

```bash
# รันปกติ (มี Embedding)
python Batch_resume.py

# รันโดยไม่ Generate Embedding
python Batch_resume.py --no-embedding

# กำหนด User ID เอง
python Batch_resume.py --user-id "my_user_123"
```

## ⚙️ Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--no-embedding` | ข้าม Embedding Generation | False (Generate Embedding) |
| `--user-id` | กำหนด User ID สำหรับ Records | `batch_user` |

## 📄 Output JSON Schema

ไฟล์ JSON ที่ออกมาจะตรงกับ Database Schema:

```json
{
  "id": "uuid-v4",
  "user_id": "batch_user",
  "extraction_id": null,
  
  "name": "ชื่อ-นามสกุล",
  "email": "email@example.com",
  "phone": "0812345678",
  "location": "Bangkok, Thailand",
  "current_role": "Software Developer",
  "years_experience": 5,
  
  "skills": ["Python", "JavaScript", "SQL"],
  "education": [...],
  "experience": [...],
  "certifications": ["AWS Certified"],
  "languages": ["Thai", "English"],
  "languages_with_proficiency": [
    {"language": "Thai", "level": "Native"},
    {"language": "English", "level": "Professional"}
  ],
  
  "summary": "Professional summary...",
  "salary_expectation": 50000,
  "availability_date": "2025-01-15",
  "gender": "Male",
  "nationality": "Thai",
  "birth_year": 1990,
  "has_car": true,
  "has_license": true,
  "willing_to_travel": true,
  
  "embedding": [0.123, -0.456, ...],
  "embedding_model": "bge-m3:latest",
  "embedding_text": "Name: ...\nSkills: ...",
  
  "source_file_name": "resume.pdf",
  "raw_extracted_data": {...},
  "created_at": "2025-12-22T10:30:00",
  "updated_at": "2025-12-22T10:30:00"
}
```

## 📊 Batch Summary

หลังรันเสร็จ จะมีไฟล์ `_batch_summary_YYYYMMDD_HHMMSS.json` สรุปผล:

```json
{
  "batch_id": "20251222_143332",
  "start_time": "2025-12-22T14:33:32",
  "end_time": "2025-12-22T14:40:33",
  "duration_seconds": 420.96,
  "total_files": 16,
  "successful": 15,
  "failed": 1,
  "embeddings_generated": 15,
  "embedding_provider": "ollama",
  "embedding_model": "bge-m3:latest",
  "results": [
    {
      "file": "resume1.pdf",
      "output": "resume1.json",
      "success": true,
      "name": "John Doe",
      "skills_count": 10,
      "has_embedding": true,
      "embedding_dimensions": 1024
    },
    {
      "file": "resume2.pdf",
      "success": false,
      "error": "Error message...",
      "error_type": "LlamaExtractError"
    }
  ]
}
```

## 🔧 Configuration

### Environment Variables

ตรวจสอบว่ามี Environment Variables เหล่านี้ใน `.env`:

```env
# LlamaExtract API
LLAMA_CLOUD_API_KEY=your_api_key

# Embedding Provider (ollama หรือ openai)
EMBEDDING_PROVIDER=ollama

# Ollama Settings
OLLAMA_API_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=bge-m3:latest

# หรือ OpenAI Settings
OPENAI_API_KEY=your_openai_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

### Supported File Types

| Extension | MIME Type |
|-----------|-----------|
| `.pdf` | application/pdf |
| `.png` | image/png |
| `.jpg`, `.jpeg` | image/jpeg |
| `.docx` | application/vnd.openxmlformats-officedocument.wordprocessingml.document |
| `.doc` | application/msword |

### File Size Limit

- Maximum: **50 MB** per file

## ❗ Troubleshooting

### Error: "No files found in input folder"

- ตรวจสอบว่ามีไฟล์ในโฟลเดอร์ `input/`
- ตรวจสอบนามสกุลไฟล์ (.pdf, .png, .jpg, .docx)

### Error: "Embedding service error"

- ตรวจสอบว่า Ollama server รันอยู่
- ตรวจสอบ `OLLAMA_API_URL` ใน .env
- ทดสอบ: `curl http://localhost:11434/api/tags`

### Error: "LlamaExtract extraction failed"

- ตรวจสอบ `LLAMA_CLOUD_API_KEY`
- ตรวจสอบว่าไฟล์ไม่เสียหาย
- ลองเปิดไฟล์ดูว่าอ่านได้ปกติ

## 📝 Example Output

```
======================================================================
🚀 BATCH RESUME EXTRACTION WITH EMBEDDING
======================================================================
📁 Input folder:  .../Batch_extract/Resume/input
📁 Output folder: .../Batch_extract/Resume/output
🔗 Generate embeddings: True
🤖 Embedding provider: ollama
🤖 Embedding model: bge-m3:latest

📋 Found 16 file(s) to process

[1/16] 
📄 Processing: resume1.pdf
   Size: 245.3 KB | Type: application/pdf
   🔄 Generating embedding...
   ✅ Embedding generated (1024 dimensions, model: bge-m3:latest)
   💾 Saved: resume1.json

[2/16] 
📄 Processing: resume2.pdf
...

======================================================================
📊 BATCH PROCESSING SUMMARY
======================================================================
   Total files:          16
   ✅ Successful:        15
   ❌ Failed:            1
   🔗 With embeddings:   15
   ⏱️ Duration:          420.96 seconds
   📁 Output:            .../Batch_extract/Resume/output
======================================================================

📄 Batch summary saved: _batch_summary_20251222_143332.json
```

## 📌 Notes

- ไฟล์ Output จะมีชื่อเหมือนไฟล์ Input แต่เปลี่ยนเป็น `.json`
- ไม่มีการบันทึกลง Database (output เป็น JSON files เท่านั้น)
- Embedding dimensions ขึ้นอยู่กับ model:
  - Ollama bge-m3: **1024** dimensions
  - OpenAI text-embedding-3-small: **1536** dimensions
