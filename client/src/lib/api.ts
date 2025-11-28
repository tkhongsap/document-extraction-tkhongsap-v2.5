import type { User, Extraction } from "@shared/schema";

// Auth API
export async function login(): Promise<{ user: User }> {
  const res = await fetch("/api/auth/mock-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Login failed");
  }

  return res.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function getCurrentUser(): Promise<{ user: User }> {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Not authenticated");
  }

  return res.json();
}

// Extraction API
export interface ProcessExtractionRequest {
  fileName: string;
  documentType: string;
}

export interface ProcessExtractionResponse {
  success: boolean;
  results: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  pagesProcessed: number;
}

export async function processExtraction(data: ProcessExtractionRequest): Promise<ProcessExtractionResponse> {
  const res = await fetch("/api/extract/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Extraction failed");
  }

  return res.json();
}

export interface SaveExtractionRequest {
  fileName: string;
  fileSize: number;
  documentType: string;
  pagesProcessed: number;
  extractedData: any;
  status: string;
}

export async function saveExtraction(data: SaveExtractionRequest): Promise<{ extraction: Extraction }> {
  const res = await fetch("/api/extractions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to save extraction");
  }

  return res.json();
}

export async function getExtractions(limit?: number): Promise<{ extractions: Extraction[] }> {
  const url = limit ? `/api/extractions?limit=${limit}` : "/api/extractions";
  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch extractions");
  }

  return res.json();
}

export async function getExtraction(id: string): Promise<{ extraction: Extraction }> {
  const res = await fetch(`/api/extractions/${id}`, {
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch extraction");
  }

  return res.json();
}
