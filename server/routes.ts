import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { storage } from "./storage";
import { insertExtractionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { setupAuth, isAuthenticated, ensureUsageReset } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { createLlamaParseService, LlamaParseError } from "./llamaParse";
import { createLlamaExtractService, LlamaExtractError } from "./llamaExtract";
import { createResumeService, type ResumeData } from "./resumeService";
import { 
  chunkAndSaveResume, 
  searchSimilarChunks, 
  deleteChunksForExtraction,
  countUserChunks,
  type ExtractedResumeData 
} from "./resumeChunkingService";
import type { DocumentType } from "./extractionSchemas";
import { randomUUID } from "crypto";

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept common document formats
    const allowedMimes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-powerpoint",
      "text/plain",
      "text/html",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// Helper function to upload file buffer to GCS and create document record
async function uploadDocumentAndCreateRecord(
  buffer: Buffer,
  fileName: string,
  fileSize: number,
  mimeType: string,
  userId: string
): Promise<{ documentId: string; objectPath: string }> {
  const objectStorageService = new ObjectStorageService();
  
  // Get upload URL
  const uploadURL = await objectStorageService.getObjectEntityUploadURL();
  
  // Upload file buffer to GCS
  const uploadResponse = await fetch(uploadURL, {
    method: "PUT",
    body: new Uint8Array(buffer),
    headers: {
      "Content-Type": mimeType,
      "Content-Length": fileSize.toString(),
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file to GCS: ${uploadResponse.statusText}`);
  }

  // Set ACL policy and get normalized path
  const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
    uploadURL,
    {
      owner: userId,
      visibility: "private",
    }
  );

  // Create document record
  const document = await storage.createDocument({
    userId,
    fileName,
    fileSize,
    mimeType,
    objectPath,
  });

  return { documentId: document.id, objectPath };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Mock login endpoint for development
  app.post('/api/auth/mock-login', async (req: any, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Mock login disabled in production' });
    }

    try {
      // Get the first user from the database for testing
      const testUserId = "36691541"; // Default test user
      const user = await storage.getUser(testUserId);
      
      if (!user) {
        return res.status(404).json({ message: 'Test user not found' });
      }

      // Set up a mock session
      req.login({
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        },
        expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      }, (err: any) => {
        if (err) {
          console.error('[Mock Login] Error:', err);
          return res.status(500).json({ message: 'Login failed' });
        }
        console.log('[Mock Login] Successfully logged in as:', user.email);
        res.json({ user });
      });
    } catch (error: any) {
      console.error('[Mock Login] Error:', error);
      res.status(500).json({ message: error.message || 'Mock login failed' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Object storage - serve private objects with ACL check
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Serve public objects
  app.get("/public-objects/:filePath(*)", async (req: Request, res: Response) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get upload URL for documents
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res: Response) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Save document after upload
  app.post("/api/documents", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;
    
    if (!req.body.uploadURL || !req.body.fileName || !req.body.fileSize || !req.body.mimeType) {
      return res.status(400).json({ error: "uploadURL, fileName, fileSize, and mimeType are required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.uploadURL,
        {
          owner: userId,
          visibility: "private",
        }
      );

      const document = await storage.createDocument({
        userId,
        fileName: req.body.fileName,
        fileSize: req.body.fileSize,
        mimeType: req.body.mimeType,
        objectPath,
      });

      res.status(201).json({ document });
    } catch (error: any) {
      console.error("Error saving document:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get user's documents
  app.get("/api/documents", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;
    
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const documents = await storage.getDocumentsByUserId(userId, limit);
      res.json({ documents });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get a specific document by ID
  app.get("/api/documents/:id", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;
    
    try {
      const document = await storage.getDocument(req.params.id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ document });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Extraction endpoints
  app.post("/api/extractions", isAuthenticated, ensureUsageReset, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;

    try {
      const validatedData = insertExtractionSchema.parse({
        ...req.body,
        userId,
      });

      const user = req.userWithUsage || await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newUsage = user.monthlyUsage + validatedData.pagesProcessed;
      if (newUsage > user.monthlyLimit) {
        return res.status(403).json({ 
          message: "Monthly page limit exceeded",
          usage: user.monthlyUsage,
          limit: user.monthlyLimit
        });
      }

      const extraction = await storage.createExtraction(validatedData);
      await storage.updateUserUsage(userId, validatedData.pagesProcessed);

      res.json({ extraction });
    } catch (error: any) {
      if (error.name === "ZodError") {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/extractions", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const extractions = await storage.getExtractionsByUserId(userId, limit);
      res.json({ extractions });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/extractions/:id", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;

    try {
      const extraction = await storage.getExtraction(req.params.id);
      
      if (!extraction) {
        return res.status(404).json({ message: "Extraction not found" });
      }

      if (extraction.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ extraction });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get documents grouped by filename with their extractions
  app.get("/api/documents-with-extractions", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const documents = await storage.getExtractionsGroupedByDocument(userId, limit);
      res.json({ documents });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update user language preference
  app.patch("/api/user/language", isAuthenticated, async (req: any, res: Response) => {
    const userId = req.user?.claims?.sub;
    const { language } = req.body;

    try {
      // Validate language
      if (!language || (language !== 'en' && language !== 'th')) {
        return res.status(400).json({ message: "Language must be 'en' or 'th'" });
      }

      await storage.updateUserLanguage(userId, language);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Template-based extraction endpoint using LlamaExtract
  // Used for Bank Statement, Invoice, Purchase Order, and Contract templates
  app.post(
    "/api/extract/process",
    isAuthenticated,
    ensureUsageReset,
    upload.single("file"),
    async (req: any, res: Response) => {
      const userId = req.user?.claims?.sub;

      try {
        // Validate file was uploaded
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { buffer, originalname, size, mimetype } = req.file;
        const documentType = req.body.documentType as DocumentType;

        // Validate document type
        const validTypes: DocumentType[] = ["bank", "invoice", "po", "contract", "resume"];
        if (!documentType || !validTypes.includes(documentType)) {
          return res.status(400).json({
            message: `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
          });
        }

        // Check user's monthly limit before processing
        const user = req.userWithUsage || await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if extraction would exceed monthly limit (1 page per extraction)
        const newUsage = user.monthlyUsage + 1;
        if (newUsage > user.monthlyLimit) {
          return res.status(403).json({
            message: "Monthly page limit exceeded",
            usage: user.monthlyUsage,
            limit: user.monthlyLimit,
          });
        }

        // Upload document to GCS and create document record
        let documentId: string | undefined;
        try {
          const { documentId: docId } = await uploadDocumentAndCreateRecord(
            buffer,
            originalname,
            size,
            mimetype,
            userId
          );
          documentId = docId;
        } catch (error: any) {
          console.error("[Template Extraction] Failed to store document:", error);
          // Continue with extraction even if document storage fails
        }

        // Extract structured data using LlamaExtract
        const llamaExtractService = createLlamaExtractService();
        const extractionResult = await llamaExtractService.extractDocument(
          buffer,
          originalname,
          documentType
        );

        // Update user's monthly usage after successful extraction
        await storage.updateUserUsage(userId, extractionResult.pagesProcessed);

        // If document type is resume, also save to resumes table with embedding
        let resumeId: string | undefined;
        console.log(`[Template Extraction] Checking resume save: documentType=${documentType}, hasData=${!!extractionResult.extractedData}`);
        if (documentType === "resume" && extractionResult.extractedData) {
          try {
            console.log(`[Template Extraction] Creating resume service...`);
            const resumeService = createResumeService();
            console.log(`[Template Extraction] Calling createFromExtraction...`);
            const resume = await resumeService.createFromExtraction(
              userId,
              documentId || randomUUID(), // Use extraction ID as fallback
              extractionResult.extractedData as unknown as ResumeData,
              originalname,
              !!process.env.OPENAI_API_KEY // Only generate embedding if API key exists
            );
            resumeId = resume.id;
            console.log(`[Template Extraction] Resume saved with ID: ${resumeId}, hasEmbedding: ${!!resume.embedding}`);
<<<<<<< HEAD
=======
            
            // Create semantic chunks for better RAG search
            if (process.env.OPENAI_API_KEY) {
              try {
                console.log(`[Template Extraction] Creating semantic chunks...`);
                const chunkResult = await chunkAndSaveResume({
                  userId,
                  documentId: documentId || undefined,
                  extractionId: resumeId,
                  resumeData: extractionResult.extractedData as unknown as ExtractedResumeData,
                  includeFullResume: true
                });
                console.log(`[Template Extraction] Created ${chunkResult.totalChunks} chunks, saved: ${chunkResult.savedToDb}`);
              } catch (chunkError: any) {
                console.error("[Template Extraction] Warning: Failed to create chunks:", chunkError);
                // Continue without chunks - resume already saved
              }
            }
>>>>>>> 1be5da5afdf618fbccacaaca326bfb3d9ee46ebd
          } catch (error: any) {
            console.error("[Template Extraction] Warning: Failed to save resume:", error);
            // Continue without resume save - extraction still returned
          }
        } else {
          console.log(`[Template Extraction] Skipping resume save`);
        }

        // Return the extraction result
        const responsePayload = {
          success: extractionResult.success,
          headerFields: extractionResult.headerFields,
          lineItems: extractionResult.lineItems,
          extractedData: extractionResult.extractedData,
          confidenceScores: extractionResult.confidenceScores,
          pagesProcessed: extractionResult.pagesProcessed,
          fileName: originalname,
          fileSize: size,
          mimeType: mimetype,
          documentId, // Include documentId so frontend can link it
          resumeId, // Include resumeId if resume was saved
        };
        console.log(`[Template Extraction] Sending response with ${extractionResult.headerFields.length} header fields, ${Object.keys(extractionResult.confidenceScores || {}).length} confidence scores`);
        res.json(responsePayload);
      } catch (error: any) {
        console.error("[Template Extraction] Error:", error);

        if (error instanceof LlamaExtractError) {
          return res.status(error.statusCode || 500).json({
            message: error.message,
            type: "LlamaExtractError",
          });
        }

        res.status(500).json({ message: error.message || "Extraction failed" });
      }
    }
  );

  // General extraction endpoint using LlamaParse
  // This is specifically for the "New Extraction" feature (type='general')
  app.post(
    "/api/extract/general",
    isAuthenticated,
    ensureUsageReset,
    upload.single("file"),
    async (req: any, res: Response) => {
      const userId = req.user?.claims?.sub;

      try {
        // Validate file was uploaded
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { buffer, originalname, size, mimetype } = req.file;

        // Check user's monthly limit before processing
        const user = req.userWithUsage || await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Upload document to GCS and create document record
        let documentId: string | undefined;
        try {
          const { documentId: docId } = await uploadDocumentAndCreateRecord(
            buffer,
            originalname,
            size,
            mimetype,
            userId
          );
          documentId = docId;
        } catch (error: any) {
          console.error("[General Extraction] Failed to store document:", error);
          // Continue with extraction even if document storage fails
        }

        // Parse the document using LlamaParse
        const llamaParseService = createLlamaParseService();
        const parsedDocument = await llamaParseService.parseDocument(
          buffer,
          originalname
        );

        // Check if parsing would exceed monthly limit
        const newUsage = user.monthlyUsage + parsedDocument.pageCount;
        if (newUsage > user.monthlyLimit) {
          return res.status(403).json({
            message: "Monthly page limit exceeded",
            usage: user.monthlyUsage,
            limit: user.monthlyLimit,
            pagesRequired: parsedDocument.pageCount,
          });
        }

        // Update user's monthly usage after successful parsing
        await storage.updateUserUsage(userId, parsedDocument.pageCount);

        // Return the parsed document
        res.json({
          success: true,
          markdown: parsedDocument.markdown,
          text: parsedDocument.text,
          pageCount: parsedDocument.pageCount,
          pages: parsedDocument.pages,
          fileName: originalname,
          fileSize: size,
          mimeType: mimetype,
          overallConfidence: parsedDocument.overallConfidence,
          confidenceStats: parsedDocument.confidenceStats,
          documentId, // Include documentId so frontend can link it
        });
      } catch (error: any) {
        console.error("[General Extraction] Error:", error);

        if (error instanceof LlamaParseError) {
          return res.status(error.statusCode || 500).json({
            message: error.message,
            type: "LlamaParseError",
          });
        }

        res.status(500).json({ message: error.message || "Extraction failed" });
      }
    }
  );

  // ==========================================================================
  // SEARCH ROUTES - Semantic search for resumes
  // ==========================================================================

  // Semantic search for resumes
  app.post("/api/search/resumes/semantic", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { query, limit = 10, threshold = 0.5 } = req.body;

      if (!query || typeof query !== "string" || query.length < 3) {
        return res.status(400).json({ message: "Query must be at least 3 characters" });
      }

      const resumeService = createResumeService();
      const results = await resumeService.searchSemantic(
        query,
        userId,
        Math.min(limit, 50),
        threshold
      );

      res.json({
        results,
        total: results.length,
        query,
      });
    } catch (error: any) {
      console.error("[Search] Semantic search error:", error);
      res.status(500).json({ 
        message: "Search failed. Please check if OpenAI API key is configured." 
      });
    }
  });

  // List all resumes for user
  app.get("/api/search/resumes", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Number(req.query.offset) || 0;

      const resumeService = createResumeService();
      const resumes = await resumeService.getByUser(userId, limit, offset);
      const total = await resumeService.countByUser(userId);

      res.json({
        results: resumes.map((r) => ({
          id: r.id,
          userId: r.userId,
          extractionId: r.extractionId,
          name: r.name,
          email: r.email,
          phone: r.phone,
          location: r.location,
          currentRole: r.currentRole,
          yearsExperience: r.yearsExperience,
          skills: r.skills,
          summary: r.summary,
          sourceFileName: r.sourceFileName,
          createdAt: r.createdAt?.toISOString() || null,
        })),
        total,
        query: "all",
      });
    } catch (error: any) {
      console.error("[Search] List resumes error:", error);
      res.status(500).json({ message: "Failed to list resumes" });
    }
  });

  // Get single resume by ID
  app.get("/api/search/resumes/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const resumeId = req.params.id;

      const resumeService = createResumeService();
      const resume = await resumeService.getById(resumeId);

      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      if (resume.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Return full resume without embedding
      const { embedding, ...resumeData } = resume;
      res.json(resumeData);
    } catch (error: any) {
      console.error("[Search] Get resume error:", error);
      res.status(500).json({ message: "Failed to get resume" });
    }
  });

  // Delete resume
  app.delete("/api/search/resumes/:id", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const resumeId = req.params.id;

      const resumeService = createResumeService();
      const resume = await resumeService.getById(resumeId);

      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      if (resume.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await resumeService.delete(resumeId);
      res.json({ message: "Resume deleted successfully" });
    } catch (error: any) {
      console.error("[Search] Delete resume error:", error);
      res.status(500).json({ message: "Failed to delete resume" });
    }
  });

  // Regenerate embedding for resume
  app.post("/api/search/resumes/:id/regenerate-embedding", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const resumeId = req.params.id;

      const resumeService = createResumeService();
      const resume = await resumeService.getById(resumeId);

      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      if (resume.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updated = await resumeService.regenerateEmbedding(resumeId);

      if (!updated) {
        return res.status(500).json({ 
          message: "Failed to regenerate embedding. Check OpenAI API key." 
        });
      }

      res.json({
        message: "Embedding regenerated successfully",
        resumeId,
        embeddingModel: updated.embeddingModel,
      });
    } catch (error: any) {
      console.error("[Search] Regenerate embedding error:", error);
      res.status(500).json({ message: "Failed to regenerate embedding" });
    }
  });
 // ==========================================================================
  // CHUNK ROUTES - Document chunking for RAG
  // ==========================================================================

  /**
   * POST /api/chunks/create
   * สร้าง semantic chunks จาก resume data ที่มีอยู่แล้ว
   * 
   * Body: {
   *   extractionId?: string,     // ID ของ extraction (optional)
   *   documentId?: string,       // ID ของ document (optional)
   *   resumeData: object,        // ข้อมูล resume ที่ extracted แล้ว
   *   includeFullResume?: boolean // รวม full resume chunk (default: true)
   * }
   */
  app.post("/api/chunks/create", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { extractionId, documentId, resumeData, includeFullResume = true } = req.body;

      if (!resumeData || typeof resumeData !== "object") {
        return res.status(400).json({ 
          message: "resumeData is required and must be an object" 
        });
      }

      const result = await chunkAndSaveResume({
        userId,
        documentId,
        extractionId,
        resumeData: resumeData as ExtractedResumeData,
        includeFullResume
      });

      res.json({
        success: true,
        totalChunks: result.totalChunks,
        chunkIds: result.chunkIds,
        chunks: result.chunks.map(c => ({
          type: c.type,
          title: c.title,
          textLength: c.text.length,
          metadata: c.metadata
        }))
      });
    } catch (error: any) {
      console.error("[Chunks] Create error:", error);
      res.status(500).json({ message: error.message || "Failed to create chunks" });
    }
  });

  /**
   * POST /api/chunks/search
   * ค้นหา chunks ที่คล้ายกับ query ด้วย semantic similarity
   * 
   * Body: {
   *   query: string,       // ข้อความที่ต้องการค้นหา
   *   limit?: number,      // จำนวน chunks สูงสุด (default: 5, max: 20)
   *   threshold?: number   // similarity threshold (default: 0.5)
   * }
   */
  app.post("/api/chunks/search", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { query, limit = 5, threshold = 0.5 } = req.body;

      if (!query || typeof query !== "string" || query.length < 2) {
        return res.status(400).json({ 
          message: "Query must be at least 2 characters" 
        });
      }

      const searchLimit = Math.min(Math.max(1, limit), 20);
      const results = await searchSimilarChunks(query, userId, searchLimit);

      // Filter by threshold
      const filteredResults = results.filter(r => r.similarity >= threshold);

      res.json({
        success: true,
        query,
        total: filteredResults.length,
        results: filteredResults.map(r => ({
          id: r.chunk.id,
          text: r.chunk.text,
          similarity: r.similarity,
          metadata: r.chunk.metadata,
          chunkIndex: r.chunk.chunk_index,
          documentId: r.chunk.document_id,
          extractionId: r.chunk.extraction_id,
          createdAt: r.chunk.created_at
        }))
      });
    } catch (error: any) {
      console.error("[Chunks] Search error:", error);
      res.status(500).json({ message: error.message || "Search failed" });
    }
  });

  /**
   * GET /api/chunks/stats
   * ดูสถิติ chunks ของ user
   */
  app.get("/api/chunks/stats", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const totalChunks = await countUserChunks(userId);

      res.json({
        success: true,
        totalChunks,
        userId
      });
    } catch (error: any) {
      console.error("[Chunks] Stats error:", error);
      res.status(500).json({ message: error.message || "Failed to get stats" });
    }
  });

  /**
   * DELETE /api/chunks/extraction/:extractionId
   * ลบ chunks ทั้งหมดของ extraction
   */
  app.delete("/api/chunks/extraction/:extractionId", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { extractionId } = req.params;

      // Verify extraction belongs to user
      const extraction = await storage.getExtraction(extractionId);
      if (!extraction) {
        return res.status(404).json({ message: "Extraction not found" });
      }
      if (extraction.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deletedCount = await deleteChunksForExtraction(extractionId);

      res.json({
        success: true,
        deletedCount,
        extractionId
      });
    } catch (error: any) {
      console.error("[Chunks] Delete error:", error);
      res.status(500).json({ message: error.message || "Failed to delete chunks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
