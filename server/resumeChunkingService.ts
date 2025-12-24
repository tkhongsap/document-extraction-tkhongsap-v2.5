/**
 * Resume Chunking Service
 * 
 * ใช้ Hybrid Chunking Strategy:
 * 1. Section-based: แบ่งตาม semantic sections ของ resume (experience, education, skills, etc.)
 * 2. Size-limited: ถ้า section ใหญ่เกินไป จะแบ่งย่อยตาม token limit
 * 
 * ข้อดี:
 * - เก็บ context ครบถ้วนในแต่ละ chunk
 * - ไม่ตัดกลาง section สำคัญ
 * - ขนาด chunk สม่ำเสมอ เหมาะกับ embedding model
 */

import { db } from "./db";
import { documentChunks } from "../shared/schema";
import type { InsertDocumentChunk } from "../shared/schema";
import { createEmbeddingService } from "./embeddingService";

// ============================================================================
// TYPES & CONFIGURATION
// ============================================================================

/** ประเภทของ section ใน resume */
export type ChunkSectionType = 
  | 'personal_info'      // ข้อมูลส่วนตัว + contact
  | 'summary'            // สรุปประวัติ/objective
  | 'experience'         // ประสบการณ์ทำงาน (แต่ละงาน)
  | 'education'          // การศึกษา
  | 'skills'             // ทักษะ
  | 'certifications'     // ใบรับรอง/certificates
  | 'languages'          // ภาษา
  | 'full_resume';       // สรุปรวม resume ทั้งหมด (สำหรับ broad search)

/** โครงสร้าง chunk ก่อนบันทึก */
export interface ResumeChunk {
  sectionType: ChunkSectionType;
  chunkIndex: number;
  text: string;
  metadata: {
    sectionType: ChunkSectionType;
    subIndex?: number;        // ถ้าถูกแบ่งย่อย เช่น experience งานที่ 1, 2, 3
    totalSubChunks?: number;  // จำนวน sub-chunks ทั้งหมดใน section นี้
    originalLength: number;   // ความยาวต้นฉบับ
    isTruncated: boolean;     // ถูกตัดเพราะเกิน limit หรือไม่
  };
}

/** Configuration สำหรับ chunking */
export interface ChunkingConfig {
  /** จำนวน characters สูงสุดต่อ chunk (ประมาณ 4 chars = 1 token) */
  maxChunkSize: number;
  /** จำนวน characters ที่ overlap ระหว่าง chunks ถ้าต้องแบ่งย่อย */
  overlapSize: number;
  /** สร้าง full resume chunk หรือไม่ (สำหรับ broad search) */
  includeFullResume: boolean;
  /** จำนวน characters สูงสุดสำหรับ full resume chunk */
  maxFullResumeSize: number;
}

/** Default configuration */
const DEFAULT_CONFIG: ChunkingConfig = {
  maxChunkSize: 2000,        // ~500 tokens - เหมาะกับ embedding models
  overlapSize: 200,          // ~50 tokens overlap
  includeFullResume: true,
  maxFullResumeSize: 4000,   // ~1000 tokens สำหรับ overview
};

/** โครงสร้าง Experience item จาก extracted data */
interface ExperienceItem {
  company?: string;
  position?: string;
  title?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  description?: string;
  responsibilities?: string[];
  achievements?: string[];
  location?: string;
}

/** โครงสร้าง Education item จาก extracted data */
interface EducationItem {
  institution?: string;
  school?: string;
  degree?: string;
  field?: string;
  major?: string;
  graduationYear?: number;
  year?: number;
  gpa?: number;
}

/** โครงสร้าง Language with proficiency */
interface LanguageWithProficiency {
  language: string;
  proficiency?: string;
  level?: string;
}

// ============================================================================
// MAIN CHUNKING SERVICE CLASS
// ============================================================================

export class ResumeChunkingService {
  private config: ChunkingConfig;
  private embeddingService = createEmbeddingService();

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Main entry point: แบ่ง resume เป็น chunks และบันทึกลง database
   * 
   * @param resumeData - ข้อมูล resume ที่ extracted มาแล้ว
   * @param userId - ID ของ user
   * @param documentId - ID ของ document (optional)
   * @param extractionId - ID ของ extraction (optional)
   * @returns Array ของ chunks ที่สร้างและบันทึกแล้ว
   */
  async chunkAndSave(
    resumeData: Record<string, unknown>,
    userId: string,
    documentId?: string,
    extractionId?: string
  ): Promise<ResumeChunk[]> {
    // Step 1: สร้าง chunks จาก resume data
    const chunks = this.createChunks(resumeData);
    
    // Step 2: สร้าง embeddings และบันทึกลง database
    const savedChunks: ResumeChunk[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // สร้าง embedding สำหรับ chunk นี้
        const embeddingResult = await this.embeddingService.createEmbedding(chunk.text);
        
        // เตรียมข้อมูลสำหรับบันทึก
        const insertData: InsertDocumentChunk = {
          userId,
          documentId: documentId || null,
          extractionId: extractionId || null,
          chunkIndex: i,
          text: chunk.text,
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model,
          embeddingText: chunk.text,
          metadata: chunk.metadata,
        };
        
        // บันทึกลง database
        await db.insert(documentChunks).values(insertData);
        savedChunks.push(chunk);
        
      } catch (error) {
        console.error(`[ResumeChunking] Failed to process chunk ${i}:`, error);
        // ยังคงบันทึก chunk แม้ไม่มี embedding
        const insertData: InsertDocumentChunk = {
          userId,
          documentId: documentId || null,
          extractionId: extractionId || null,
          chunkIndex: i,
          text: chunk.text,
          embedding: null,
          embeddingModel: null,
          embeddingText: chunk.text,
          metadata: chunk.metadata,
        };
        await db.insert(documentChunks).values(insertData);
        savedChunks.push(chunk);
      }
    }
    
    console.log(`[ResumeChunking] Created ${savedChunks.length} chunks for resume`);
    return savedChunks;
  }

  /**
   * สร้าง chunks จาก resume data โดยไม่บันทึก (สำหรับ preview/testing)
   */
  createChunks(resumeData: Record<string, unknown>): ResumeChunk[] {
    const chunks: ResumeChunk[] = [];
    let chunkIndex = 0;

    // ============================================
    // 1. Personal Info + Summary Chunk
    // ============================================
    const personalChunk = this.createPersonalInfoChunk(resumeData);
    if (personalChunk) {
      chunks.push({ ...personalChunk, chunkIndex: chunkIndex++ });
    }

    // ============================================
    // 2. Experience Chunks (แยกแต่ละงาน)
    // ============================================
    const experienceChunks = this.createExperienceChunks(resumeData);
    for (const expChunk of experienceChunks) {
      chunks.push({ ...expChunk, chunkIndex: chunkIndex++ });
    }

    // ============================================
    // 3. Education Chunk
    // ============================================
    const educationChunk = this.createEducationChunk(resumeData);
    if (educationChunk) {
      chunks.push({ ...educationChunk, chunkIndex: chunkIndex++ });
    }

    // ============================================
    // 4. Skills Chunk
    // ============================================
    const skillsChunk = this.createSkillsChunk(resumeData);
    if (skillsChunk) {
      chunks.push({ ...skillsChunk, chunkIndex: chunkIndex++ });
    }

    // ============================================
    // 5. Certifications Chunk
    // ============================================
    const certChunk = this.createCertificationsChunk(resumeData);
    if (certChunk) {
      chunks.push({ ...certChunk, chunkIndex: chunkIndex++ });
    }

    // ============================================
    // 6. Languages Chunk
    // ============================================
    const langChunk = this.createLanguagesChunk(resumeData);
    if (langChunk) {
      chunks.push({ ...langChunk, chunkIndex: chunkIndex++ });
    }

    // ============================================
    // 7. Full Resume Summary (optional)
    // ============================================
    if (this.config.includeFullResume) {
      const fullChunk = this.createFullResumeChunk(resumeData, chunks);
      if (fullChunk) {
        chunks.push({ ...fullChunk, chunkIndex: chunkIndex++ });
      }
    }

    return chunks;
  }

  // ============================================================================
  // SECTION-SPECIFIC CHUNKING METHODS
  // ============================================================================

  /**
   * สร้าง chunk สำหรับข้อมูลส่วนตัว + summary
   * รวมกันเพราะมักสั้นและเกี่ยวข้องกัน
   */
  private createPersonalInfoChunk(data: Record<string, unknown>): ResumeChunk | null {
    const parts: string[] = [];

    // ชื่อ
    if (data.name) {
      parts.push(`Name: ${data.name}`);
    }

    // Contact info
    if (data.email) parts.push(`Email: ${data.email}`);
    if (data.phone) parts.push(`Phone: ${data.phone}`);
    if (data.location) parts.push(`Location: ${data.location}`);

    // Current role & experience
    if (data.currentRole) parts.push(`Current Role: ${data.currentRole}`);
    if (data.yearsExperience) parts.push(`Years of Experience: ${data.yearsExperience}`);

    // Personal details
    if (data.nationality) parts.push(`Nationality: ${data.nationality}`);
    if (data.gender) parts.push(`Gender: ${data.gender}`);
    if (data.birthYear) parts.push(`Birth Year: ${data.birthYear}`);

    // Availability & preferences
    if (data.salaryExpectation) parts.push(`Salary Expectation: ${data.salaryExpectation}`);
    if (data.availabilityDate) parts.push(`Available From: ${data.availabilityDate}`);
    if (data.willingToTravel) parts.push(`Willing to Travel: Yes`);
    if (data.hasCar) parts.push(`Has Car: Yes`);
    if (data.hasLicense) parts.push(`Has Driving License: Yes`);

    // Summary/Objective
    if (data.summary) {
      parts.push('');
      parts.push(`Summary: ${data.summary}`);
    }

    if (parts.length === 0) return null;

    const text = parts.join('\n');
    return {
      sectionType: 'personal_info',
      chunkIndex: 0,
      text: this.truncateText(text, this.config.maxChunkSize),
      metadata: {
        sectionType: 'personal_info',
        originalLength: text.length,
        isTruncated: text.length > this.config.maxChunkSize,
      },
    };
  }

  /**
   * สร้าง chunks สำหรับ experience - แยกแต่ละงานเป็น chunk
   * ถ้างานใดใหญ่เกินไป จะแบ่งย่อย
   */
  private createExperienceChunks(data: Record<string, unknown>): ResumeChunk[] {
    const experience = data.experience as ExperienceItem[] | undefined;
    if (!experience || !Array.isArray(experience) || experience.length === 0) {
      return [];
    }

    const chunks: ResumeChunk[] = [];

    for (let i = 0; i < experience.length; i++) {
      const exp = experience[i];
      const expText = this.formatExperienceItem(exp, i + 1);
      
      if (!expText) continue;

      // ถ้าเกิน limit ให้แบ่งย่อย
      if (expText.length > this.config.maxChunkSize) {
        const subChunks = this.splitTextWithOverlap(expText);
        for (let j = 0; j < subChunks.length; j++) {
          chunks.push({
            sectionType: 'experience',
            chunkIndex: 0,
            text: subChunks[j],
            metadata: {
              sectionType: 'experience',
              subIndex: i + 1,
              totalSubChunks: subChunks.length,
              originalLength: expText.length,
              isTruncated: true,
            },
          });
        }
      } else {
        chunks.push({
          sectionType: 'experience',
          chunkIndex: 0,
          text: expText,
          metadata: {
            sectionType: 'experience',
            subIndex: i + 1,
            totalSubChunks: 1,
            originalLength: expText.length,
            isTruncated: false,
          },
        });
      }
    }

    return chunks;
  }

  /**
   * Format experience item เป็น text
   */
  private formatExperienceItem(exp: ExperienceItem, index: number): string {
    const parts: string[] = [];
    
    parts.push(`[Experience ${index}]`);
    
    const position = exp.position || exp.title || exp.role;
    if (position) parts.push(`Position: ${position}`);
    if (exp.company) parts.push(`Company: ${exp.company}`);
    if (exp.location) parts.push(`Location: ${exp.location}`);
    
    // Duration
    if (exp.startDate || exp.endDate) {
      const start = exp.startDate || 'Unknown';
      const end = exp.endDate || 'Present';
      parts.push(`Duration: ${start} - ${end}`);
    } else if (exp.duration) {
      parts.push(`Duration: ${exp.duration}`);
    }
    
    // Description
    if (exp.description) {
      parts.push(`Description: ${exp.description}`);
    }
    
    // Responsibilities
    if (exp.responsibilities && exp.responsibilities.length > 0) {
      parts.push('Responsibilities:');
      exp.responsibilities.forEach(r => parts.push(`  - ${r}`));
    }
    
    // Achievements
    if (exp.achievements && exp.achievements.length > 0) {
      parts.push('Achievements:');
      exp.achievements.forEach(a => parts.push(`  - ${a}`));
    }

    return parts.length > 1 ? parts.join('\n') : '';
  }

  /**
   * สร้าง chunk สำหรับ education
   * รวมทั้งหมดเพราะมักไม่ยาวมาก
   */
  private createEducationChunk(data: Record<string, unknown>): ResumeChunk | null {
    const education = data.education as EducationItem[] | undefined;
    if (!education || !Array.isArray(education) || education.length === 0) {
      return null;
    }

    const parts: string[] = ['[Education]'];

    for (let i = 0; i < education.length; i++) {
      const edu = education[i];
      const eduParts: string[] = [];
      
      const institution = edu.institution || edu.school;
      if (institution) eduParts.push(`Institution: ${institution}`);
      if (edu.degree) eduParts.push(`Degree: ${edu.degree}`);
      
      const field = edu.field || edu.major;
      if (field) eduParts.push(`Field: ${field}`);
      
      const year = edu.graduationYear || edu.year;
      if (year) eduParts.push(`Year: ${year}`);
      
      if (edu.gpa) eduParts.push(`GPA: ${edu.gpa}`);
      
      if (eduParts.length > 0) {
        if (i > 0) parts.push('');
        parts.push(...eduParts);
      }
    }

    if (parts.length <= 1) return null;

    const text = parts.join('\n');
    return {
      sectionType: 'education',
      chunkIndex: 0,
      text: this.truncateText(text, this.config.maxChunkSize),
      metadata: {
        sectionType: 'education',
        originalLength: text.length,
        isTruncated: text.length > this.config.maxChunkSize,
      },
    };
  }

  /**
   * สร้าง chunk สำหรับ skills
   * สำคัญมากสำหรับการค้นหา
   */
  private createSkillsChunk(data: Record<string, unknown>): ResumeChunk | null {
    const skills = data.skills as string[] | undefined;
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return null;
    }

    const parts: string[] = ['[Skills]'];
    
    // จัดกลุ่ม skills เป็นหมวดหมู่ถ้าเป็นไปได้
    // หรือ list ออกมาทั้งหมด
    parts.push(`Technical Skills: ${skills.join(', ')}`);

    const text = parts.join('\n');
    return {
      sectionType: 'skills',
      chunkIndex: 0,
      text: this.truncateText(text, this.config.maxChunkSize),
      metadata: {
        sectionType: 'skills',
        originalLength: text.length,
        isTruncated: text.length > this.config.maxChunkSize,
      },
    };
  }

  /**
   * สร้าง chunk สำหรับ certifications
   */
  private createCertificationsChunk(data: Record<string, unknown>): ResumeChunk | null {
    const certifications = data.certifications as string[] | undefined;
    if (!certifications || !Array.isArray(certifications) || certifications.length === 0) {
      return null;
    }

    const parts: string[] = ['[Certifications]'];
    certifications.forEach(cert => parts.push(`- ${cert}`));

    const text = parts.join('\n');
    return {
      sectionType: 'certifications',
      chunkIndex: 0,
      text: this.truncateText(text, this.config.maxChunkSize),
      metadata: {
        sectionType: 'certifications',
        originalLength: text.length,
        isTruncated: text.length > this.config.maxChunkSize,
      },
    };
  }

  /**
   * สร้าง chunk สำหรับ languages
   */
  private createLanguagesChunk(data: Record<string, unknown>): ResumeChunk | null {
    const languages = data.languages as string[] | undefined;
    const languagesWithProficiency = data.languagesWithProficiency as LanguageWithProficiency[] | undefined;
    
    if ((!languages || languages.length === 0) && 
        (!languagesWithProficiency || languagesWithProficiency.length === 0)) {
      return null;
    }

    const parts: string[] = ['[Languages]'];
    
    // ใช้ languagesWithProficiency ถ้ามี
    if (languagesWithProficiency && languagesWithProficiency.length > 0) {
      languagesWithProficiency.forEach(lang => {
        const proficiency = lang.proficiency || lang.level || '';
        parts.push(`- ${lang.language}${proficiency ? ` (${proficiency})` : ''}`);
      });
    } else if (languages) {
      languages.forEach(lang => parts.push(`- ${lang}`));
    }

    const text = parts.join('\n');
    return {
      sectionType: 'languages',
      chunkIndex: 0,
      text: this.truncateText(text, this.config.maxChunkSize),
      metadata: {
        sectionType: 'languages',
        originalLength: text.length,
        isTruncated: text.length > this.config.maxChunkSize,
      },
    };
  }

  /**
   * สร้าง chunk สรุปรวม resume ทั้งหมด
   * ใช้สำหรับ broad/general search queries
   */
  private createFullResumeChunk(
    data: Record<string, unknown>, 
    existingChunks: ResumeChunk[]
  ): ResumeChunk | null {
    // รวม text จากทุก chunks
    const allText = existingChunks.map(c => c.text).join('\n\n');
    
    if (!allText) return null;

    // Truncate ให้พอดี limit
    const text = this.truncateText(allText, this.config.maxFullResumeSize);
    
    return {
      sectionType: 'full_resume',
      chunkIndex: 0,
      text: `[Full Resume Summary]\n${text}`,
      metadata: {
        sectionType: 'full_resume',
        originalLength: allText.length,
        isTruncated: allText.length > this.config.maxFullResumeSize,
      },
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * ตัด text ให้ไม่เกิน maxLength โดยพยายามตัดที่ท้ายประโยค
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    
    // หา position ที่เป็นท้ายประโยค
    const truncated = text.slice(0, maxLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('.\n'),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('? ')
    );
    
    if (lastSentenceEnd > maxLength * 0.7) {
      return truncated.slice(0, lastSentenceEnd + 1);
    }
    
    // ถ้าไม่มีท้ายประโยค ให้ตัดที่ช่องว่าง
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
      return truncated.slice(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * แบ่ง text ยาวออกเป็นหลาย chunks โดยมี overlap
   */
  private splitTextWithOverlap(text: string): string[] {
    const chunks: string[] = [];
    const { maxChunkSize, overlapSize } = this.config;
    
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + maxChunkSize, text.length);
      const chunk = text.slice(start, end);
      
      // ถ้าไม่ใช่ chunk สุดท้าย พยายามตัดที่ท้ายประโยคหรือช่องว่าง
      if (end < text.length) {
        chunks.push(this.truncateText(chunk, maxChunkSize));
      } else {
        chunks.push(chunk);
      }
      
      start = end - overlapSize;
      if (start >= text.length - overlapSize) break;
    }
    
    return chunks;
  }
}

// ============================================================================
// FACTORY & HELPER FUNCTIONS
// ============================================================================

/** Singleton instance */
let chunkingService: ResumeChunkingService | null = null;

/**
 * สร้างหรือ return existing chunking service instance
 */
export function createResumeChunkingService(
  config?: Partial<ChunkingConfig>
): ResumeChunkingService {
  if (!chunkingService || config) {
    chunkingService = new ResumeChunkingService(config);
  }
  return chunkingService;
}

/**
 * Helper function: chunk resume และบันทึก (shorthand)
 */
export async function chunkResume(
  resumeData: Record<string, unknown>,
  userId: string,
  options?: {
    documentId?: string;
    extractionId?: string;
    config?: Partial<ChunkingConfig>;
  }
): Promise<ResumeChunk[]> {
  const service = createResumeChunkingService(options?.config);
  return service.chunkAndSave(
    resumeData,
    userId,
    options?.documentId,
    options?.extractionId
  );
}

/**
 * Helper function: preview chunks โดยไม่บันทึก
 */
export function previewResumeChunks(
  resumeData: Record<string, unknown>,
  config?: Partial<ChunkingConfig>
): ResumeChunk[] {
  const service = new ResumeChunkingService(config);
  return service.createChunks(resumeData);
}
