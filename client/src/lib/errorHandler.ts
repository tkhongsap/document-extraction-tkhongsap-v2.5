/**
 * Error Handler Utility
 * Converts technical error messages to user-friendly messages with suggestions
 */

export interface FriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  isRetryable: boolean;
}

// Error patterns and their friendly messages
const errorPatterns: Array<{
  pattern: RegExp | string;
  error: FriendlyError;
}> = [
  // File size errors
  {
    pattern: /file.*too.*large|size.*exceed|10.*mb|ไฟล์.*ใหญ่/i,
    error: {
      title: 'ไฟล์ใหญ่เกินไป',
      message: 'ไฟล์ที่อัปโหลดมีขนาดใหญ่เกิน 10MB',
      suggestion: 'ลองบีบอัดไฟล์หรือแบ่งเป็นไฟล์ย่อยๆ',
      isRetryable: false,
    },
  },
  // File type errors
  {
    pattern: /unsupported.*file|invalid.*type|ประเภท.*ไม่.*รองรับ|mime/i,
    error: {
      title: 'ประเภทไฟล์ไม่รองรับ',
      message: 'รองรับเฉพาะไฟล์ PDF และรูปภาพ (PNG, JPG)',
      suggestion: 'แปลงไฟล์เป็น PDF แล้วลองอีกครั้ง',
      isRetryable: false,
    },
  },
  // Network errors
  {
    pattern: /network|fetch|connection|timeout|ECONNREFUSED|ไม่สามารถเชื่อมต่อ/i,
    error: {
      title: 'เชื่อมต่อไม่สำเร็จ',
      message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
      suggestion: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง',
      isRetryable: true,
    },
  },
  // Rate limit errors
  {
    pattern: /rate.*limit|too.*many.*request|429|quota/i,
    error: {
      title: 'คำขอมากเกินไป',
      message: 'มีการส่งคำขอมากเกินไป กรุณารอสักครู่',
      suggestion: 'รอ 1-2 นาทีแล้วลองอีกครั้ง',
      isRetryable: true,
    },
  },
  // Authentication errors
  {
    pattern: /unauthorized|401|not.*authenticated|session.*expired|กรุณา.*login/i,
    error: {
      title: 'ต้องเข้าสู่ระบบ',
      message: 'กรุณาเข้าสู่ระบบเพื่อใช้งาน',
      suggestion: 'คลิกปุ่ม Login ด้านบนขวา',
      isRetryable: false,
    },
  },
  // Permission errors
  {
    pattern: /forbidden|403|permission|access.*denied/i,
    error: {
      title: 'ไม่มีสิทธิ์เข้าถึง',
      message: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
      suggestion: 'ติดต่อผู้ดูแลระบบ',
      isRetryable: false,
    },
  },
  // Server errors
  {
    pattern: /500|internal.*server|server.*error/i,
    error: {
      title: 'เซิร์ฟเวอร์ขัดข้อง',
      message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์',
      suggestion: 'รอสักครู่แล้วลองอีกครั้ง หากยังไม่สำเร็จกรุณาติดต่อผู้ดูแล',
      isRetryable: true,
    },
  },
  // LlamaCloud specific errors
  {
    pattern: /llama.*parse|llama.*extract|parsing.*failed/i,
    error: {
      title: 'การวิเคราะห์ล้มเหลว',
      message: 'ไม่สามารถวิเคราะห์เอกสารได้',
      suggestion: 'ตรวจสอบว่าไฟล์ไม่เสียหายและมีเนื้อหาที่อ่านได้',
      isRetryable: true,
    },
  },
  // Monthly limit errors
  {
    pattern: /monthly.*limit|quota.*exceeded|limit.*reached|เกิน.*limit/i,
    error: {
      title: 'เกินโควต้ารายเดือน',
      message: 'คุณใช้งานเกินโควต้าที่กำหนดในเดือนนี้แล้ว',
      suggestion: 'รอจนกว่าจะถึงเดือนใหม่ หรือติดต่อเพื่ออัพเกรด',
      isRetryable: false,
    },
  },
  // Empty/Invalid document
  {
    pattern: /empty.*document|no.*content|blank.*page|ไม่พบ.*เนื้อหา/i,
    error: {
      title: 'เอกสารว่างเปล่า',
      message: 'ไม่พบเนื้อหาในเอกสาร',
      suggestion: 'ตรวจสอบว่าไฟล์มีเนื้อหาที่อ่านได้',
      isRetryable: false,
    },
  },
  // Corrupted file
  {
    pattern: /corrupt|damage|invalid.*pdf|ไฟล์.*เสียหาย/i,
    error: {
      title: 'ไฟล์เสียหาย',
      message: 'ไฟล์อาจเสียหายหรือไม่ถูกต้อง',
      suggestion: 'ลองดาวน์โหลดไฟล์ใหม่หรือสแกนเอกสารอีกครั้ง',
      isRetryable: false,
    },
  },
];

/**
 * Convert error to user-friendly format
 */
export function parseError(error: unknown): FriendlyError {
  // Get error message
  let errorMessage = 'Unknown error';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    errorMessage = String((error as any).message);
  }

  // Check against patterns
  for (const { pattern, error: friendlyError } of errorPatterns) {
    if (typeof pattern === 'string') {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return friendlyError;
      }
    } else if (pattern.test(errorMessage)) {
      return friendlyError;
    }
  }

  // Default error
  return {
    title: 'เกิดข้อผิดพลาด',
    message: errorMessage || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ',
    suggestion: 'ลองอีกครั้ง หากยังไม่สำเร็จกรุณาติดต่อผู้ดูแลระบบ',
    isRetryable: true,
  };
}

/**
 * Format error for toast notification
 */
export function formatErrorToast(error: unknown): string {
  const friendly = parseError(error);
  if (friendly.suggestion) {
    return `${friendly.message} - ${friendly.suggestion}`;
  }
  return friendly.message;
}

/**
 * Get error title for toast
 */
export function getErrorTitle(error: unknown): string {
  return parseError(error).title;
}
