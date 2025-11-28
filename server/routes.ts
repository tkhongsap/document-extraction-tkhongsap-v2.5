import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { insertUserSchema, insertExtractionSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export function registerRoutes(app: Express) {
  // Auth endpoints
  app.post("/api/auth/mock-login", async (req: Request, res: Response) => {
    try {
      // Mock authentication - create or get user
      const mockEmail = "somchai@example.com";
      
      let user = await storage.getUserByEmail(mockEmail);
      
      if (!user) {
        user = await storage.createUser({
          email: mockEmail,
          name: "Somchai Jai-dee",
          provider: "line",
          providerId: "mock-line-id",
          tier: "free",
          monthlyUsage: 45,
          monthlyLimit: 100,
        });
      }

      // Store user in session
      (req.session as any).userId = user.id;
      
      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Extraction endpoints
  app.post("/api/extractions", async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      // Validate request body
      const validatedData = insertExtractionSchema.parse(req.body);

      // Check user's monthly limit
      const user = await storage.getUser(userId);
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

      // Create extraction record
      const extraction = await storage.createExtraction({
        ...validatedData,
        userId,
      });

      // Update user's usage
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

  app.get("/api/extractions", async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const extractions = await storage.getExtractionsByUserId(userId, limit);
      
      res.json({ extractions });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/extractions/:id", async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const extraction = await storage.getExtraction(req.params.id);
      
      if (!extraction) {
        return res.status(404).json({ message: "Extraction not found" });
      }

      // Verify extraction belongs to user
      if (extraction.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json({ extraction });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Mock extraction processor endpoint
  app.post("/api/extract/process", async (req: Request, res: Response) => {
    const userId = (req.session as any).userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { fileName, documentType } = req.body;

      // Simulate extraction processing
      const mockResults = generateMockExtraction(documentType || 'general');

      res.json({
        success: true,
        results: mockResults,
        pagesProcessed: 1,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
}

// Helper function to generate mock extraction data
function generateMockExtraction(type: string) {
  const common = [
    { key: 'document_date', value: '27 Nov 2023', confidence: 0.98 },
    { key: 'document_id', value: 'INV-2023-001', confidence: 0.95 },
  ];

  if (type === 'bank') {
    return [
      { key: 'bank_name', value: 'Siam Commercial Bank', confidence: 0.99 },
      { key: 'account_number', value: '123-4-56789-0', confidence: 0.97 },
      { key: 'account_holder', value: 'Somchai Jai-dee', confidence: 0.92 },
      { key: 'statement_period', value: '01 Oct 2023 - 31 Oct 2023', confidence: 0.94 },
      { key: 'opening_balance', value: '50,000.00 THB', confidence: 0.96 },
      { key: 'closing_balance', value: '45,200.00 THB', confidence: 0.96 },
    ];
  }

  if (type === 'invoice') {
    return [
      ...common,
      { key: 'vendor_name', value: 'Tech Solutions Co., Ltd.', confidence: 0.99 },
      { key: 'vendor_tax_id', value: '0105551234567', confidence: 0.98 },
      { key: 'customer_name', value: 'Acme Corp', confidence: 0.95 },
      { key: 'total_amount', value: '15,000.00 THB', confidence: 0.99 },
      { key: 'vat_amount', value: '1,050.00 THB', confidence: 0.97 },
      { key: 'grand_total', value: '16,050.00 THB', confidence: 0.99 },
    ];
  }

  // Default General
  return [
    ...common,
    { key: 'company_name', value: 'Tech Solutions Co., Ltd.', confidence: 0.91 },
    { key: 'address', value: '123 Silom Road, Bangrak, Bangkok 10500', confidence: 0.88 },
    { key: 'email', value: 'contact@techsolutions.co.th', confidence: 0.95 },
    { key: 'phone', value: '02-123-4567', confidence: 0.96 },
    { key: 'total_amount', value: '16,050.00', confidence: 0.92 },
  ];
}
