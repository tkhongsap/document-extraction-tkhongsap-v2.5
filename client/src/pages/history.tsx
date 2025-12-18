import { useLanguage } from "@/lib/i18n";
import { useDateFormatter } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Search,
  Plus,
  X,
  Files,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getExtractions } from "@/lib/api";
import { Link } from "wouter";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebounce";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Retention period in days (must match backend EXTRACTION_RETENTION_DAYS)
const RETENTION_DAYS = 3;

/**
 * Format remaining time before deletion
 * @param createdAt - Creation date of extraction
 * @returns Formatted string showing time remaining
 */
function formatTimeRemaining(createdAt: Date): { text: string; isUrgent: boolean } {
  const now = new Date();
  const expiresAt = new Date(createdAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const diffMs = expiresAt.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return { text: 'Expiring soon', isUrgent: true };
  }
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Show minutes only if less than 5 minutes
  if (diffMinutes < 5) {
    return { text: `${diffMinutes}m left`, isUrgent: true };
  }
  
  // Show hours if less than 1 day
  if (diffDays < 1) {
    return { text: `${diffHours}h left`, isUrgent: diffHours < 6 };
  }
  
  // Show days
  return { text: `${diffDays}d left`, isUrgent: false };
}

function getDocumentTypeIcon(type: string) {
  return FileText; // Default icon, can be enhanced later
}

/**
 * Highlights matching text in a string
 * @param text - The text to highlight
 * @param query - The search query
 * @returns JSX with highlighted matches
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * Recursively searches in extracted data
 * @param data - The data to search in
 * @param query - The search query
 * @param depth - Current recursion depth
 * @param visited - WeakSet to prevent circular references
 * @returns true if query is found
 */
function searchInExtractedData(data: any, query: string, depth: number = 0, visited: WeakSet<object> = new WeakSet()): boolean {
  // Prevent infinite recursion with depth limit
  if (depth > 10) return false;
  
  if (data === null || data === undefined) return false;
  
  // Handle circular references
  if (typeof data === 'object' && data !== null) {
    if (visited.has(data)) return false;
    visited.add(data);
  }
  
  if (typeof data === 'string') {
    return data.toLowerCase().includes(query);
  }
  
  if (typeof data === 'number') {
    return data.toString().includes(query);
  }
  
  if (typeof data === 'boolean') {
    return false; // Skip boolean values
  }
  
  if (Array.isArray(data)) {
    // Early exit if array is empty
    if (data.length === 0) return false;
    return data.some(item => searchInExtractedData(item, query, depth + 1, visited));
  }
  
  if (typeof data === 'object') {
    const values = Object.values(data);
    // Early exit if object has no values
    if (values.length === 0) return false;
    return values.some(value => searchInExtractedData(value, query, depth + 1, visited));
  }
  
  return false;
}

export default function History() {
  const { t } = useLanguage();
  const { formatDate, formatRelativeTime } = useDateFormatter();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['extractions'],
    queryFn: () => getExtractions(50),
  });

  const extractions = data?.extractions || [];
  
  // Debounce search query to improve performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Filter extractions by multiple fields: filename, documentType, status, and extractedData
  const filteredExtractions = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return extractions;
    }
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    return extractions.filter((extraction: typeof extractions[number]) => {
      // Search in fileName
      if (extraction.fileName.toLowerCase().includes(query)) return true;
      
      // Search in documentType
      if (extraction.documentType.toLowerCase().includes(query)) return true;
      
      // Search in status
      if (extraction.status.toLowerCase().includes(query)) return true;
      
      // Search in extractedData (recursive search through JSON structure)
      if (extraction.extractedData && searchInExtractedData(extraction.extractedData, query)) {
        return true;
      }
      
      return false;
    });
  }, [extractions, debouncedSearchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Escape to clear search when input is focused
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.history')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('docs.subtitle') || 'View and manage your extracted documents'}
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={t('docs.search_placeholder') || 'Search by filename, type, status, or content... (Ctrl+K)'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "pl-10",
                  searchQuery.trim() ? "pr-10" : "pr-4"
                )}
                aria-label="Search documents"
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded-sm"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {searchQuery.trim() && searchQuery.trim() !== debouncedSearchQuery.trim() && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
            </div>
            {debouncedSearchQuery.trim() && !isLoading && (
              <div className="flex items-center justify-between px-1">
                <p className="text-xs text-muted-foreground">
                  {filteredExtractions.length === 0 
                    ? 'No results found'
                    : `Found ${filteredExtractions.length} ${filteredExtractions.length === 1 ? 'extraction' : 'extractions'}`
                  }
                </p>
                {searchQuery.trim() && searchQuery.trim() !== debouncedSearchQuery.trim() && (
                  <p className="text-xs text-muted-foreground italic">Searching...</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extraction Cards */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      ) : filteredExtractions.length === 0 ? (
        <Card>
          <CardContent className="text-center p-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {debouncedSearchQuery 
                ? (t('docs.no_results') || 'No extractions found')
                : (t('docs.empty_title') || 'No extractions yet')
              }
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {debouncedSearchQuery
                ? (t('docs.no_results_desc') || 'Try a different search term')
                : (t('docs.empty_desc') || 'Upload your first document to get started')
              }
            </p>
            {!debouncedSearchQuery && (
              <Button asChild>
                <Link href="/extraction/general">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('docs.upload_new') || 'New Upload'}
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredExtractions.map((extraction: typeof filteredExtractions[number]) => {
            const TypeIcon = getDocumentTypeIcon(extraction.documentType);
            
            return (
              <Link key={extraction.id} href={`/history/${extraction.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Extraction Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <TypeIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base mb-1 truncate">
                            {debouncedSearchQuery.trim() 
                              ? highlightText(extraction.fileName, debouncedSearchQuery)
                              : extraction.fileName
                            }
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <span className="capitalize">
                              {debouncedSearchQuery.trim() && extraction.documentType.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                                ? highlightText(extraction.documentType, debouncedSearchQuery)
                                : extraction.documentType
                              }
                            </span>
                            <span>•</span>
                            <span>{formatFileSize(extraction.fileSize)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Files className="h-3 w-3" />
                              {extraction.pagesProcessed}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(new Date(extraction.createdAt))}
                            </span>
                            <Badge 
                              variant={extraction.status === 'completed' ? 'success' : extraction.status === 'processing' ? 'default' : 'warning'}
                            >
                              {extraction.status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Right: Expiry Time */}
                      {(() => {
                        const { text, isUrgent } = formatTimeRemaining(new Date(extraction.createdAt));
                        return (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={isUrgent ? 'destructive' : 'outline'} className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {text}
                            </Badge>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
