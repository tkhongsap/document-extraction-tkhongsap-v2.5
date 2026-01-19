/**
 * Resume Semantic Chunking Service
 * 
 * บริการสำหรับแบ่ง Resume เป็น chunks ตามความหมาย (semantic)
 * เพื่อใช้ใน RAG (Retrieval-Augmented Generation) และ semantic search
 * 
 * กลยุทธ์การ Chunking:
 * - แบ่งตาม section ของ Resume (Experience, Education, Skills, etc.)
 * - แยก Experience แต่ละงานเป็น chunk แยก (มี context ครบถ้วน)
 * - รวม sections ที่สั้น (Personal Info + Summary) เข้าด้วยกัน
 * - สร้าง Full Resume chunk สำหรับ broad search
 */

import { db } from "./db";
import { documentChunks } from "../shared/schema";
import type { InsertDocumentChunk } from "../shared/schema";
import { createEmbeddingService } from "./embeddingService";
import { sql } from "drizzle-orm";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** ประเภทของ chunk ที่สร้างจาก Resume */
export type ResumeChunkType = 
  | 'personal_info'      // ข้อมูลส่วนตัว + contact
  | 'summary'            // สรุป/objective
  | 'experience'         // ประสบการณ์การทำงาน (แต่ละงาน)
  | 'education'          // การศึกษา
  | 'skills'             // ทักษะ
  | 'certifications'     // ใบรับรอง/certificates
  | 'languages'          // ภาษา
  | 'full_resume';       // Resume ทั้งหมด (สำหรับ broad search)

/** โครงสร้างของ chunk ที่สร้างขึ้น */
export interface ResumeChunk {
  type: ResumeChunkType;
  title: string;           // ชื่อ chunk เช่น "Software Engineer at Google"
  text: string;            // เนื้อหา chunk
  metadata: {
    section: string;       // ชื่อ section เดิม
    jobIndex?: number;     // ลำดับงาน (สำหรับ experience)
    company?: string;      // ชื่อบริษัท (สำหรับ experience)
    position?: string;     // ตำแหน่ง (สำหรับ experience)
    institution?: string;  // สถาบัน (สำหรับ education)
    degree?: string;       // วุฒิ (สำหรับ education)
  };
}

/** ข้อมูล Experience จาก extraction */
interface ExperienceItem {
  company?: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  responsibilities?: string[];
  achievements?: string[];
  description?: string;
}

/** ข้อมูล Education จาก extraction */
interface EducationItem {
  institution?: string;
  degree?: string;
  field?: string;
  graduationYear?: number | string;
  gpa?: string | number;
  honors?: string;
}

/** ข้อมูล Resume ที่ extracted แล้ว */
export interface ExtractedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  currentRole?: string;
  summary?: string;
  yearsExperience?: number;
  skills?: string[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
  certifications?: string[];
  languages?: string[];
  languagesWithProficiency?: Array<{ language: string; proficiency: string }>;
}

/** ผลลัพธ์จากการ chunking */
export interface ChunkingResult {
  chunks: ResumeChunk[];
  totalChunks: number;
  savedToDb: boolean;
  chunkIds?: string[];
}

// ============================================================================
// CHUNKING FUNCTIONS
// ============================================================================

/**
 * สร้าง Personal Info chunk
 * รวมข้อมูลติดต่อและข้อมูลพื้นฐาน
 */
function createPersonalInfoChunk(data: ExtractedResumeData): ResumeChunk | null {
  const parts: string[] = [];
  
  if (data.name) parts.push(`ชื่อ: ${data.name}`);
  if (data.email) parts.push(`อีเมล: ${data.email}`);
  if (data.phone) parts.push(`โทรศัพท์: ${data.phone}`);
  if (data.location) parts.push(`ที่อยู่: ${data.location}`);
  if (data.currentRole) parts.push(`ตำแหน่งปัจจุบัน: ${data.currentRole}`);
  if (data.yearsExperience) parts.push(`ประสบการณ์: ${data.yearsExperience} ปี`);
  
  if (parts.length === 0) return null;
  
  return {
    type: 'personal_info',
    title: data.name || 'Personal Information',
    text: parts.join('\n'),
    metadata: { section: 'personal_info' }
  };
}

/**
 * สร้าง Summary chunk
 * objective หรือ professional summary
 */
function createSummaryChunk(data: ExtractedResumeData): ResumeChunk | null {
  if (!data.summary) return null;
  
  return {
    type: 'summary',
    title: 'Professional Summary',
    text: data.summary,
    metadata: { section: 'summary' }
  };
}

/**
 * สร้าง Experience chunks
 * แยกแต่ละงานเป็น chunk แยก เพื่อให้ค้นหาได้แม่นยำ
 */
function createExperienceChunks(data: ExtractedResumeData): ResumeChunk[] {
  if (!data.experience || data.experience.length === 0) return [];
  
  return data.experience.map((exp, index) => {
    const parts: string[] = [];
    
    // Header: ตำแหน่งและบริษัท
    if (exp.position && exp.company) {
      parts.push(`${exp.position} ที่ ${exp.company}`);
    } else if (exp.position) {
      parts.push(exp.position);
    } else if (exp.company) {
      parts.push(exp.company);
    }
    
    // ระยะเวลา
    if (exp.startDate || exp.endDate) {
      const period = [exp.startDate, exp.endDate].filter(Boolean).join(' - ');
      parts.push(`ระยะเวลา: ${period}`);
    }
    if (exp.duration) {
      parts.push(`ระยะเวลา: ${exp.duration}`);
    }
    
    // รายละเอียดงาน
    if (exp.description) {
      parts.push(`\nรายละเอียด: ${exp.description}`);
    }
    
    // ความรับผิดชอบ
    if (exp.responsibilities && exp.responsibilities.length > 0) {
      parts.push('\nความรับผิดชอบ:');
      exp.responsibilities.forEach(r => parts.push(`• ${r}`));
    }
    
    // ผลงาน
    if (exp.achievements && exp.achievements.length > 0) {
      parts.push('\nผลงาน:');
      exp.achievements.forEach(a => parts.push(`• ${a}`));
    }
    
    const title = exp.position && exp.company 
      ? `${exp.position} at ${exp.company}`
      : `Experience ${index + 1}`;
    
    return {
      type: 'experience' as ResumeChunkType,
      title,
      text: parts.join('\n'),
      metadata: {
        section: 'experience',
        jobIndex: index,
        company: exp.company,
        position: exp.position
      }
    };
  });
}

/**
 * สร้าง Education chunk
 * รวมการศึกษาทั้งหมดเป็น chunk เดียว (มักสั้น)
 */
function createEducationChunk(data: ExtractedResumeData): ResumeChunk | null {
  if (!data.education || data.education.length === 0) return null;
  
  const parts: string[] = ['การศึกษา:'];
  
  data.education.forEach((edu, index) => {
    const eduParts: string[] = [];
    
    if (edu.degree && edu.field) {
      eduParts.push(`${edu.degree} สาขา ${edu.field}`);
    } else if (edu.degree) {
      eduParts.push(edu.degree);
    }
    
    if (edu.institution) {
      eduParts.push(`จาก ${edu.institution}`);
    }
    
    if (edu.graduationYear) {
      eduParts.push(`(${edu.graduationYear})`);
    }
    
    if (edu.gpa) {
      eduParts.push(`เกรดเฉลี่ย: ${edu.gpa}`);
    }
    
    if (edu.honors) {
      eduParts.push(`เกียรตินิยม: ${edu.honors}`);
    }
    
    parts.push(`${index + 1}. ${eduParts.join(' ')}`);
  });
  
  return {
    type: 'education',
    title: 'Education',
    text: parts.join('\n'),
    metadata: { 
      section: 'education',
      institution: data.education[0]?.institution,
      degree: data.education[0]?.degree
    }
  };
}

/**
 * สร้าง Skills chunk
 * รวมทักษะทั้งหมด - สำคัญมากสำหรับการค้นหา
 */
function createSkillsChunk(data: ExtractedResumeData): ResumeChunk | null {
  if (!data.skills || data.skills.length === 0) return null;
  
  const text = `ทักษะ:\n${data.skills.map(s => `• ${s}`).join('\n')}`;
  
  return {
    type: 'skills',
    title: 'Skills',
    text,
    metadata: { section: 'skills' }
  };
}

/**
 * สร้าง Certifications chunk
 */
function createCertificationsChunk(data: ExtractedResumeData): ResumeChunk | null {
  if (!data.certifications || data.certifications.length === 0) return null;
  
  const text = `ใบรับรอง/Certifications:\n${data.certifications.map(c => `• ${c}`).join('\n')}`;
  
  return {
    type: 'certifications',
    title: 'Certifications',
    text,
    metadata: { section: 'certifications' }
  };
}

/**
 * สร้าง Languages chunk
 */
function createLanguagesChunk(data: ExtractedResumeData): ResumeChunk | null {
  // ใช้ languagesWithProficiency ถ้ามี, ไม่งั้นใช้ languages
  if (data.languagesWithProficiency && data.languagesWithProficiency.length > 0) {
    const lines = data.languagesWithProficiency.map(
      l => `• ${l.language}: ${l.proficiency}`
    );
    return {
      type: 'languages',
      title: 'Languages',
      text: `ภาษา:\n${lines.join('\n')}`,
      metadata: { section: 'languages' }
    };
  }
  
  if (data.languages && data.languages.length > 0) {
    const text = `ภาษา:\n${data.languages.map(l => `• ${l}`).join('\n')}`;
    return {
      type: 'languages',
      title: 'Languages',
      text,
      metadata: { section: 'languages' }
    };
  }
  
  return null;
}

/**
 * สร้าง Full Resume chunk
 * รวมทุกอย่างเป็น chunk เดียวสำหรับ broad search
 */
function createFullResumeChunk(data: ExtractedResumeData, chunks: ResumeChunk[]): ResumeChunk {
  // รวมข้อความจากทุก chunk
  const allText = chunks.map(c => `[${c.title}]\n${c.text}`).join('\n\n');
  
  return {
    type: 'full_resume',
    title: `Full Resume - ${data.name || 'Unknown'}`,
    text: allText,
    metadata: { section: 'full_resume' }
  };
}

// ============================================================================
// MAIN CHUNKING SERVICE
// ============================================================================

/**
 * แบ่ง Resume เป็น semantic chunks
 * 
 * @param resumeData - ข้อมูล Resume ที่ extracted แล้ว
 * @param includeFullResume - รวม full resume chunk ด้วยหรือไม่ (default: true)
 * @returns Array ของ ResumeChunk
 * 
 * @example
 * const chunks = chunkResume(extractedData);
 * // chunks = [
 * //   { type: 'personal_info', title: 'John Doe', text: '...', metadata: {...} },
 * //   { type: 'experience', title: 'Engineer at Google', text: '...', metadata: {...} },
 * //   ...
 * // ]
 */
export function chunkResume(
  resumeData: ExtractedResumeData,
  includeFullResume: boolean = true
): ResumeChunk[] {
  const chunks: ResumeChunk[] = [];
  
  // 1. Personal Info
  const personalInfo = createPersonalInfoChunk(resumeData);
  if (personalInfo) chunks.push(personalInfo);
  
  // 2. Summary
  const summary = createSummaryChunk(resumeData);
  if (summary) chunks.push(summary);
  
  // 3. Experience (แยกแต่ละงาน)
  const experiences = createExperienceChunks(resumeData);
  chunks.push(...experiences);
  
  // 4. Education
  const education = createEducationChunk(resumeData);
  if (education) chunks.push(education);
  
  // 5. Skills
  const skills = createSkillsChunk(resumeData);
  if (skills) chunks.push(skills);
  
  // 6. Certifications
  const certifications = createCertificationsChunk(resumeData);
  if (certifications) chunks.push(certifications);
  
  // 7. Languages
  const languages = createLanguagesChunk(resumeData);
  if (languages) chunks.push(languages);
  
  // 8. Full Resume (optional)
  if (includeFullResume && chunks.length > 0) {
    const fullResume = createFullResumeChunk(resumeData, chunks);
    chunks.push(fullResume);
  }
  
  return chunks;
}

/**
 * สร้าง chunks พร้อม embeddings และบันทึกลง database
 * 
 * @param params - พารามิเตอร์สำหรับการ chunking
 * @returns ผลลัพธ์การ chunking รวมถึง chunk IDs ที่บันทึก
 * 
 * @example
 * const result = await chunkAndSaveResume({
 *   userId: 'user-123',
 *   documentId: 'doc-456',
 *   extractionId: 'ext-789',
 *   resumeData: extractedData
 * });
 */
export async function chunkAndSaveResume(params: {
  userId: string;
  documentId?: string;
  extractionId?: string;
  resumeData: ExtractedResumeData;
  includeFullResume?: boolean;
}): Promise<ChunkingResult> {
  const { 
    userId, 
    documentId, 
    extractionId, 
    resumeData, 
    includeFullResume = true 
  } = params;
  
  // 1. สร้าง chunks
  const chunks = chunkResume(resumeData, includeFullResume);
  
  if (chunks.length === 0) {
    return {
      chunks: [],
      totalChunks: 0,
      savedToDb: false
    };
  }
  
  // 2. สร้าง embedding service
  const embeddingService = createEmbeddingService();
  
  // 3. สร้าง embeddings สำหรับทุก chunks
  const chunkTexts = chunks.map(c => c.text);
  const embeddings = await embeddingService.createEmbeddingsBatch(chunkTexts);
  
  // 4. เตรียมข้อมูลสำหรับบันทึกลง database
  const insertData: InsertDocumentChunk[] = chunks.map((chunk, index) => ({
    userId,
    documentId: documentId || null,
    extractionId: extractionId || null,
    chunkIndex: index,
    text: chunk.text,
    embedding: embeddings[index] || null,
    embeddingModel: 'text-embedding-3-small',
    embeddingText: chunk.text,
    metadata: {
      type: chunk.type,
      title: chunk.title,
      ...chunk.metadata
    }
  }));
  
  // 5. บันทึกลง database
  const savedChunks = await db.insert(documentChunks).values(insertData).returning();
  
  return {
    chunks,
    totalChunks: chunks.length,
    savedToDb: true,
    chunkIds: savedChunks.map(c => c.id)
  };
}

/**
 * ค้นหา chunks ที่คล้ายกับ query
 * 
 * @param query - ข้อความที่ต้องการค้นหา
 * @param userId - ID ของผู้ใช้
 * @param limit - จำนวน chunks สูงสุดที่ต้องการ
 * @returns Array ของ chunks พร้อม similarity score
 */
export async function searchSimilarChunks(
  query: string,
  userId: string,
  limit: number = 5
): Promise<Array<{ chunk: any; similarity: number }>> {
  const embeddingService = createEmbeddingService();
  
  // สร้าง embedding สำหรับ query
  const { embedding } = await embeddingService.createEmbedding(query);
  const embeddingStr = `[${embedding.join(",")}]`;
  
  // ค้นหาด้วย cosine similarity
  const results = await db.execute<any>(sql`
    SELECT 
      *,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM document_chunks
    WHERE user_id = ${userId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);
  
  return results.rows.map(row => ({
    chunk: row,
    similarity: row.similarity
  }));
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * ลบ chunks ทั้งหมดของ document
 */
export async function deleteChunksForDocument(documentId: string): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM document_chunks 
    WHERE document_id = ${documentId}
  `);
  return result.rowCount || 0;
}

/**
 * ลบ chunks ทั้งหมดของ extraction
 */
export async function deleteChunksForExtraction(extractionId: string): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM document_chunks 
    WHERE extraction_id = ${extractionId}
  `);
  return result.rowCount || 0;
}

/**
 * นับจำนวน chunks ของ user
 */
export async function countUserChunks(userId: string): Promise<number> {
  const result = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*) as count FROM document_chunks WHERE user_id = ${userId}
  `);
  return parseInt(result.rows[0]?.count || '0', 10);
}