import { useLanguage } from "@/lib/i18n";
import { useDateFormatter } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Download, 
  FileText, 
  RefreshCw, 
  Search,
  Plus,
  X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDocumentsWithExtractions } from "@/lib/api";
import { Link } from "wouter";
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { exportToJSON, exportToCSV, exportToExcel, exportToMarkdown, exportToText } from "@/lib/export";
import { useDebouncedValue } from "@/hooks/useDebounce";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
    queryKey: ['documents-with-extractions'],
    queryFn: () => getDocumentsWithExtractions(20),
  });

  const documents = data?.documents || [];
  
  // Debounce search query to improve performance
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Optimized helper function to recursively search in extracted data
  // Added depth limit and visited set to prevent infinite loops
  const searchInExtractedData = (data: any, query: string, depth: number = 0, visited: WeakSet<object> = new WeakSet()): boolean => {
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
  };

  // Filter documents by multiple fields: filename, documentType, status, and extractedData
  const filteredDocuments = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return documents;
    }
    
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    return documents.filter(doc => {
      // Search in fileName
      if (doc.fileName.toLowerCase().includes(query)) return true;
      
      // Search in documentType
      if (doc.documentType.toLowerCase().includes(query)) return true;
      
      // Search in status
      if (doc.latestExtraction.status.toLowerCase().includes(query)) return true;
      
      // Search in extractedData (recursive search through JSON structure)
      if (doc.latestExtraction.extractedData && searchInExtractedData(doc.latestExtraction.extractedData, query)) {
        return true;
      }
      
      return false;
    });
  }, [documents, debouncedSearchQuery]);

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
                  {filteredDocuments.length === 0 
                    ? 'No results found'
                    : `Found ${filteredDocuments.length} ${filteredDocuments.length === 1 ? 'document' : 'documents'}`
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

      {/* Document Cards */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="text-center p-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {debouncedSearchQuery 
                ? (t('docs.no_results') || 'No documents found')
                : (t('docs.empty_title') || 'No documents yet')
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
          {filteredDocuments.map((doc) => {
            const TypeIcon = getDocumentTypeIcon(doc.documentType);
            const latest = doc.latestExtraction;
            
            return (
              <Card key={doc.fileName} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Document Info */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base mb-1 truncate">
                          {debouncedSearchQuery.trim() 
                            ? highlightText(doc.fileName, debouncedSearchQuery)
                            : doc.fileName
                          }
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span className="capitalize">
                            {debouncedSearchQuery.trim() && doc.documentType.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
                              ? highlightText(doc.documentType, debouncedSearchQuery)
                              : doc.documentType
                            }
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            {doc.totalExtractions} {t('docs.extractions_count') || 'extraction(s)'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Latest: {formatRelativeTime(new Date(latest.createdAt))}
                          </span>
                          <Badge 
                            variant={latest.status === 'completed' ? 'success' : latest.status === 'processing' ? 'default' : 'warning'}
                          >
                            {latest.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        asChild
                      >
                        <Link href={`/extraction/${doc.documentType}`}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t('docs.reextract') || 'Re-extract'}
                        </Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled>
                            <Download className="mr-2 h-4 w-4" />
                            {t('docs.download') || 'Download'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled onClick={() => exportToJSON(doc.latestExtraction)}>
                            {t('export.json') || 'JSON'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled onClick={() => exportToCSV(doc.latestExtraction)}>
                            {t('export.csv') || 'CSV'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled onClick={() => exportToExcel(doc.latestExtraction)}>
                            {t('export.excel') || 'Excel'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled onClick={() => exportToMarkdown(doc.latestExtraction)}>
                            {t('export.markdown') || 'Markdown'}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled onClick={() => exportToText(doc.latestExtraction)}>
                            {t('export.text') || 'Text'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
