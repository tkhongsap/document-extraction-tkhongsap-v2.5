/**
 * Cleanup Service
 * Automatically deletes rejected extractions and their associated documents after a specified period
 */

import { storage, logAudit } from "./storage";
import { ObjectStorageService } from "./objectStorage";

// Configuration
const REJECTED_EXPIRY_DAYS = 3; // Delete rejected extractions after 3 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Run every hour

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Run cleanup of expired rejected extractions
 */
export async function runCleanup(): Promise<{ deleted: number; errors: string[] }> {
  const errors: string[] = [];
  
  console.log(`[Cleanup] Starting cleanup of rejected extractions older than ${REJECTED_EXPIRY_DAYS} days...`);
  
  try {
    // Get and delete expired rejected extractions
    const result = await storage.deleteExpiredRejectedExtractions(REJECTED_EXPIRY_DAYS);
    
    if (result.deleted === 0) {
      console.log('[Cleanup] No expired rejected extractions found.');
      return { deleted: 0, errors: [] };
    }
    
    console.log(`[Cleanup] Deleted ${result.deleted} expired rejected extractions.`);
    
    // Delete associated documents from object storage
    if (result.documentIds.length > 0) {
      const objectStorageService = new ObjectStorageService();
      
      for (const documentId of result.documentIds) {
        try {
          // Note: We'd need to get the object path from the document first
          // For now, we'll just log - in production you'd delete from storage
          console.log(`[Cleanup] Would delete document: ${documentId}`);
        } catch (error) {
          const errorMsg = `Failed to delete document ${documentId}: ${error}`;
          console.error(`[Cleanup] ${errorMsg}`);
          errors.push(errorMsg);
        }
      }
    }
    
    // Log cleanup action
    await logAudit('extraction_delete', {
      resourceType: 'cleanup',
      details: {
        deletedCount: result.deleted,
        documentIds: result.documentIds,
        reason: 'auto_cleanup_rejected',
        expiryDays: REJECTED_EXPIRY_DAYS,
      },
    });
    
    console.log(`[Cleanup] Cleanup completed. Deleted: ${result.deleted}, Errors: ${errors.length}`);
    
    return { deleted: result.deleted, errors };
  } catch (error) {
    const errorMsg = `Cleanup failed: ${error}`;
    console.error(`[Cleanup] ${errorMsg}`);
    return { deleted: 0, errors: [errorMsg] };
  }
}

/**
 * Start the cleanup scheduler
 */
export function startCleanupScheduler(): void {
  if (cleanupInterval) {
    console.log('[Cleanup] Scheduler already running.');
    return;
  }
  
  console.log(`[Cleanup] Starting scheduler (interval: ${CLEANUP_INTERVAL_MS / 1000 / 60} minutes)`);
  
  // Run immediately on startup
  runCleanup().catch(console.error);
  
  // Schedule periodic cleanup
  cleanupInterval = setInterval(() => {
    runCleanup().catch(console.error);
  }, CLEANUP_INTERVAL_MS);
  
  console.log('[Cleanup] Scheduler started successfully.');
}

/**
 * Stop the cleanup scheduler
 */
export function stopCleanupScheduler(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('[Cleanup] Scheduler stopped.');
  }
}

/**
 * Get cleanup status
 */
export function getCleanupStatus(): { running: boolean; expiryDays: number; intervalMinutes: number } {
  return {
    running: cleanupInterval !== null,
    expiryDays: REJECTED_EXPIRY_DAYS,
    intervalMinutes: CLEANUP_INTERVAL_MS / 1000 / 60,
  };
}
