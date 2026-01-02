/**
 * API Keys - Shared Types and API Functions
 * รวม types และ functions ทั้งหมดสำหรับจัดการ API Keys
 */
import { apiRequest } from "@/lib/queryClient";

// ============================================================================
// Types
// ============================================================================

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  monthlyLimit: number;
  monthlyUsage: number;
  isActive: boolean;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Alias for backward compatibility
export type ApiKeyResponse = ApiKey;

export interface ApiKeyCreateRequest {
  name: string;
  monthly_limit?: number;
  scopes?: string;
  expires_at?: string | null;
}

export interface ApiKeyUpdateRequest {
  name?: string;
  monthly_limit?: number;
  scopes?: string;
  is_active?: boolean;
  expires_at?: string | null;
}

export interface ApiKeyCreateResponse {
  success: boolean;
  message: string;
  apiKey: ApiKey;
  plainKey: string;
}

export interface ApiKeyListResponse {
  success: boolean;
  apiKeys: ApiKey[];
  total: number;
}

export interface ApiKeyDeleteResponse {
  success: boolean;
  message: string;
}

export interface ApiKeyRegenerateResponse {
  success: boolean;
  message: string;
  apiKey: ApiKey;
  plainKey: string;
}

export interface ApiKeyUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalPagesProcessed: number;
  avgResponseTimeMs: number;
  requestsByDay?: { date: string; count: number }[];
}

export interface ApiKeyUsageStatsResponse {
  success: boolean;
  stats: ApiKeyUsageStats;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * ดึงรายการ API keys ทั้งหมดของ user
 */
export async function listApiKeys(includeInactive: boolean = false): Promise<ApiKeyListResponse> {
  const url = includeInactive ? "/api/keys?include_inactive=true" : "/api/keys";
  const res = await fetch(url, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to fetch API keys" }));
    throw new Error(error.detail || "Failed to fetch API keys");
  }

  return res.json();
}

/**
 * สร้าง API key ใหม่
 */
export async function createApiKey(data: ApiKeyCreateRequest): Promise<ApiKeyCreateResponse> {
  const res = await apiRequest("POST", "/api/keys", data);
  return res.json();
}

/**
 * ดึงข้อมูล API key ตาม ID
 */
export async function getApiKey(keyId: string): Promise<ApiKey> {
  const res = await fetch(`/api/keys/${keyId}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to get API key" }));
    throw new Error(error.detail || "Failed to get API key");
  }

  return res.json();
}

/**
 * อัพเดท API key
 */
export async function updateApiKey(keyId: string, data: ApiKeyUpdateRequest): Promise<ApiKey> {
  const res = await apiRequest("PATCH", `/api/keys/${keyId}`, data);
  return res.json();
}

/**
 * ลบ API key (soft delete)
 */
export async function deleteApiKey(keyId: string): Promise<ApiKeyDeleteResponse> {
  const res = await apiRequest("DELETE", `/api/keys/${keyId}`);
  return res.json();
}

/**
 * สร้าง API key ใหม่ (regenerate)
 */
export async function regenerateApiKey(keyId: string): Promise<ApiKeyRegenerateResponse> {
  const res = await apiRequest("POST", `/api/keys/${keyId}/regenerate`);
  return res.json();
}

/**
 * ดึงสถิติการใช้งาน API key
 */
export async function getApiKeyStats(keyId: string, days: number = 30): Promise<ApiKeyUsageStatsResponse> {
  const res = await fetch(`/api/keys/${keyId}/stats?days=${days}`, {
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Failed to fetch stats" }));
    throw new Error(error.detail || "Failed to fetch stats");
  }

  return res.json();
}
