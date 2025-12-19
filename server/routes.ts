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
    body: buffer,
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

  const httpServer = createServer(app);
  return httpServer;
}
