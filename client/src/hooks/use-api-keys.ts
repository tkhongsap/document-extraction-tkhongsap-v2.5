import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Import types and API functions from shared module
import {
  type ApiKey,
  type ApiKeyCreateRequest,
  type ApiKeyUpdateRequest,
  type ApiKeyListResponse,
  type ApiKeyCreateResponse,
  type ApiKeyRegenerateResponse,
  type ApiKeyUsageStatsResponse,
  listApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  regenerateApiKey,
  getApiKeyStats,
} from "@/lib/api-keys";

// Re-export types for convenience
export type {
  ApiKey,
  ApiKeyCreateRequest,
  ApiKeyUpdateRequest,
  ApiKeyListResponse,
  ApiKeyCreateResponse,
  ApiKeyRegenerateResponse,
  ApiKeyUsageStatsResponse,
};

// ============================================================================
// Hooks
// ============================================================================

export function useApiKeys(includeInactive: boolean = false) {
  return useQuery<ApiKeyListResponse>({
    queryKey: ["/api/keys", { includeInactive }],
    queryFn: () => listApiKeys(includeInactive),
    staleTime: 30000, // 30 seconds
  });
}

export function useApiKeyStats(keyId: string | null, days: number = 30) {
  return useQuery<ApiKeyUsageStatsResponse>({
    queryKey: ["/api/keys", keyId, "stats", { days }],
    queryFn: () => getApiKeyStats(keyId!, days),
    enabled: !!keyId,
    staleTime: 60000, // 1 minute
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation<ApiKeyCreateResponse, Error, ApiKeyCreateRequest>({
    mutationFn: createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
    },
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();

  return useMutation<ApiKey, Error, { keyId: string; data: ApiKeyUpdateRequest }>({
    mutationFn: ({ keyId, data }) => updateApiKey(keyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
    },
  });
}

export function useRegenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation<ApiKeyRegenerateResponse, Error, string>({
    mutationFn: regenerateApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
    },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

export function maskApiKey(prefix: string): string {
  return `${prefix}${"•".repeat(20)}`;
}

export function getKeyStatus(apiKey: ApiKey): "active" | "expired" | "revoked" {
  if (!apiKey.isActive) return "revoked";
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return "expired";
  return "active";
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return "Never";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Never";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
