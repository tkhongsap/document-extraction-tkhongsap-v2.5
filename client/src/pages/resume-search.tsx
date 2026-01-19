import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  User, 
  MapPin, 
  Briefcase, 
  Mail, 
  Phone, 
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Loader2,
  RefreshCw,
  MessageSquare,
  Bot,
  Clock,
  Zap,
  Users,
  TrendingUp,
  Database,
  Send,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  searchResumesSemanticApi, 
  listResumesApi, 
  deleteResumeApi,
  regenerateAllEmbeddingsApi,
  ragQueryApi,
  searchChunksApi,
  type ResumeSearchResult,
  type RAGQueryResponse,
  type RAGSource,
  type ChunkSearchResult,
  type ChunkSearchResponse
} from "@/lib/api";
import { toast } from "sonner";

export default function ResumeSearch() {
  // Mode: "search" or "chat"
  const [mode, setMode] = useState<"search" | "chat">("search");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLimit, setSearchLimit] = useState(10);
  const [threshold, setThreshold] = useState(0.0);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showOptions, setShowOptions] = useState(false);
  
  // AI Chat state
  const [chatResponse, setChatResponse] = useState<RAGQueryResponse | null>(null);

  // List all resumes
  const { data: allResumes, refetch: refetchAll } = useQuery({
    queryKey: ["resumes", "all"],
    queryFn: () => listResumesApi(100),
  });

  // Semantic search mutation
  const searchMutation = useMutation({
    mutationFn: () => searchResumesSemanticApi(searchQuery, searchLimit, threshold),
    onSuccess: (data) => {
      toast.success(`Found ${data.results.length} matching resumes`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Search failed");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteResumeApi,
    onSuccess: () => {
      toast.success("Resume deleted");
      refetchAll();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete resume");
    },
  });

  // Regenerate embeddings mutation
  const regenerateMutation = useMutation({
    mutationFn: regenerateAllEmbeddingsApi,
    onSuccess: (data) => {
      toast.success(`${data.message}`);
      refetchAll();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to regenerate embeddings");
    },
  });

  // RAG Chat mutation
  const ragMutation = useMutation({
    mutationFn: ragQueryApi,
    onSuccess: (data) => {
      setChatResponse(data);
      if (data.sources.length === 0) {
        toast.info("No matching candidates found");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "AI query failed");
    },
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }
    
    if (mode === "chat") {
      ragMutation.mutate({
        query: searchQuery,
        top_k: searchLimit,
        similarity_threshold: threshold || 0.2,
      });
    } else {
      searchMutation.mutate();
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const displayResults = searchMutation.data?.results || 
    (searchQuery ? [] : allResumes?.resumes) || 
    [];

  const suggestions = [
    "Python developer 5+ years",
    "Data scientist Bangkok",
    "React developer",
    "Project manager PMP",
    "Machine learning",
  ];

  const chatSuggestions = [
    "ใครเก่ง Python ที่สุด?",
    "เปรียบเทียบผู้สมัครที่เก่ง React",
    "หาคนที่เหมาะกับ Data Engineer",
    "Who has AWS certification?",
  ];

  const chunksSuggestions = [
    "Python experience",
    "AWS certification",
    "React frontend",
    "Data analyst skills",
    "Machine learning project",
  ];

  const isLoading = mode === "chat" 
    ? ragMutation.isPending 
    : mode === "chunks" 
      ? chunksMutation.isPending 
      : searchMutation.isPending;

  // Stats
  const totalResumes = allResumes?.total || 0;
  const withEmbeddings = allResumes?.resumes?.filter((r: any) => r.has_embedding)?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="w-full px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        
        {/* ===== COMPACT HEADER ===== */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Talent Search</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                AI-powered candidate search & assistant
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-muted/50 border text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="font-semibold">{totalResumes}</span>
              <span className="text-muted-foreground">candidates</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-muted/50 border text-xs sm:text-sm">
              <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
              <span className="font-semibold">{withEmbeddings}</span>
              <span className="text-muted-foreground">indexed</span>
            </div>
          </div>
        </div>

        {/* ===== SEARCH BOX ===== */}
        <Card className="shadow-lg border-2 overflow-hidden">
          {/* Mode Tabs in Card Header */}
          <div className="border-b bg-muted/30 overflow-x-auto">
            <Tabs 
              value={mode} 
              onValueChange={(v) => setMode(v as "search" | "chat")}
            >
              <TabsList className="bg-transparent h-10 sm:h-12 p-0 w-full justify-start rounded-none">
                <TabsTrigger 
                  value="search" 
                  className="h-10 sm:h-12 px-3 sm:px-6 text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Search
                </TabsTrigger>
                <TabsTrigger 
                  value="chat" 
                  className="h-10 sm:h-12 px-3 sm:px-6 text-xs sm:text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  AI Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-5">
            {/* Main Search Input */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  {mode === "chat" ? (
                    <MessageSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Search className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <Input
                  placeholder={mode === "chat" 
                    ? "Ask about candidates..."
                    : "Search skills, experience, location..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 sm:h-14 pl-12 pr-4 text-base sm:text-lg rounded-xl border-2 focus:border-primary transition-colors"
                />
              </div>
              <div className="flex gap-2 sm:gap-3">
              <Button 
                onClick={handleSearch} 
                disabled={isLoading}
                size="lg"
                className="flex-1 sm:flex-none h-12 sm:h-14 px-4 sm:px-8 rounded-xl text-base sm:text-lg font-semibold shadow-md hover:shadow-lg transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : mode === "chat" ? (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Ask AI
                  </>
                ) : mode === "chunks" ? (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Search Sections
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
              
              {/* Options Toggle - for Search and Chunks mode */}
              {(mode === "search" || mode === "chunks") && (
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2 transition-colors",
                    showOptions && "bg-primary/10 border-primary"
                  )}
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </Button>
              )}
              </div>
            </div>

            {/* Options Row - Collapsible */}
            {(mode === "search" || mode === "chunks") && showOptions && (
              <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-muted/50 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Max results:</Label>
                  <Slider
                    value={[searchLimit]}
                    onValueChange={([v]) => setSearchLimit(v)}
                    min={1}
                    max={mode === "chunks" ? 20 : 50}
                    step={1}
                    className="w-28"
                  />
                  <Badge variant="secondary">{searchLimit}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Min match:</Label>
                  <Slider
                    value={[threshold * 100]}
                    onValueChange={([v]) => setThreshold(v / 100)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-28"
                  />
                  <Badge variant="secondary">{Math.round(threshold * 100)}%</Badge>
                </div>
              </div>
            )}

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground w-full sm:w-auto mb-1 sm:mb-0">Quick search:</span>
              {(mode === "chat" 
                ? chatSuggestions 
                : mode === "chunks" 
                  ? chunksSuggestions 
                  : suggestions
              ).map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3 rounded-full hover:bg-primary/10 hover:border-primary transition-colors"
                  onClick={() => setSearchQuery(suggestion)}
                >
                  {suggestion}
                  <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1 opacity-50" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ===== RESULTS AREA ===== */}
        {mode === "chat" ? (
          <ChatResultsArea 
            response={chatResponse}
            isLoading={ragMutation.isPending}
            error={ragMutation.error}
          />
        ) : (
          <SearchResultsArea
            searchMutation={searchMutation}
            allResumes={allResumes}
            searchQuery={searchQuery}
            displayResults={displayResults}
            expandedCards={expandedCards}
            toggleExpand={toggleExpand}
            deleteMutation={deleteMutation}
            regenerateMutation={regenerateMutation}
            setSearchQuery={setSearchQuery}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// AI Chat Results Component
// =============================================================================

interface ChatResultsAreaProps {
  response: RAGQueryResponse | null;
  isLoading: boolean;
  error: Error | null;
}

function ChatResultsArea({ response, isLoading, error }: ChatResultsAreaProps) {
  if (isLoading) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative p-4 rounded-full bg-primary/10">
              <Bot className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-lg font-medium">AI is analyzing candidates...</p>
          <p className="text-sm text-muted-foreground">This may take a few seconds</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive border-2">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-destructive">AI Error</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!response) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">Ask AI about your candidates</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Try questions like "ใครที่มีประสบการณ์ Python มากที่สุด?" or "Compare candidates with React experience"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* AI Answer - Takes 2 columns */}
      <div className="lg:col-span-2">
        <Card className="h-full border-2 shadow-lg">
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI Response</CardTitle>
                  <CardDescription className="truncate max-w-md">
                    "{response.query}"
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                  <Clock className="h-3 w-3" />
                  {Math.round(response.processing_time_ms)}ms
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
                  <Zap className="h-3 w-3" />
                  {response.tokens_used} tokens
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-base leading-relaxed">{response.answer}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources Panel - Takes 1 column */}
      <div>
        <Card className="h-full border-2 shadow-lg">
          <CardHeader className="border-b pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Candidates Analyzed
              <Badge variant="secondary" className="ml-auto">{response.sources.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              AI analyzed these top matching candidates to answer your question
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {response.sources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No matching candidates found</p>
            ) : (
              <div className="space-y-2">
                {response.sources.map((source, idx) => (
                  <SourceCard key={source.resume_id} source={source} rank={idx + 1} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Source Card Component
function SourceCard({ source, rank }: { source: RAGSource; rank: number }) {
  const scoreColor = source.similarity_score > 0.8 ? "text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400" :
                     source.similarity_score > 0.6 ? "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400" :
                     "text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400";
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate group-hover:text-primary transition-colors">{source.name}</p>
        {source.position && (
          <p className="text-xs text-muted-foreground truncate">{source.position}</p>
        )}
      </div>
      <Badge className={cn("text-xs font-bold", scoreColor)}>
        {Math.round(source.similarity_score * 100)}%
      </Badge>
    </div>
  );
}

// =============================================================================
// Search Results Component
// =============================================================================

interface SearchResultsAreaProps {
  searchMutation: any;
  allResumes: any;
  searchQuery: string;
  displayResults: ResumeSearchResult[];
  expandedCards: Set<string>;
  toggleExpand: (id: string) => void;
  deleteMutation: any;
  regenerateMutation: any;
  setSearchQuery: (q: string) => void;
}

function SearchResultsArea({
  searchMutation,
  allResumes,
  searchQuery,
  displayResults,
  expandedCards,
  toggleExpand,
  deleteMutation,
  regenerateMutation,
  setSearchQuery,
}: SearchResultsAreaProps) {
  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">
            {searchMutation.data 
              ? `Search Results` 
              : `All Candidates`}
          </h2>
          <Badge variant="secondary" className="text-sm">
            {searchMutation.data ? searchMutation.data.results.length : allResumes?.total || 0}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="rounded-full"
          >
            {regenerateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Reindex All
          </Button>
          {searchMutation.data && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                searchMutation.reset();
                setSearchQuery("");
              }}
              className="rounded-full"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {searchMutation.isError && (
        <Card className="border-destructive border-2">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-destructive">Search Error</p>
              <p className="text-sm text-muted-foreground">
                {searchMutation.error?.message || "Failed to search"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {displayResults.length === 0 && !searchMutation.isPending && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">No candidates found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery 
                ? "Try a different search query or lower the match threshold"
                : "Extract resumes from the Templates page to start searching"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resume Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayResults.map((resume: ResumeSearchResult) => (
          <ResumeCard
            key={resume.id}
            resume={resume}
            expanded={expandedCards.has(resume.id)}
            onToggle={() => toggleExpand(resume.id)}
            onDelete={() => deleteMutation.mutate(resume.id)}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Resume Card Component
// =============================================================================

interface ResumeCardProps {
  resume: ResumeSearchResult;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ResumeCard({ resume, expanded, onToggle, onDelete, isDeleting }: ResumeCardProps) {
  const scoreColor = (resume.similarity_score || 0) > 0.8 ? "bg-green-500" :
                     (resume.similarity_score || 0) > 0.6 ? "bg-amber-500" :
                     (resume.similarity_score || 0) > 0.4 ? "bg-orange-500" : "bg-gray-400";

  return (
    <Card className="overflow-hidden border-2 hover:border-primary/50 hover:shadow-lg transition-all group">
      <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <User className="h-6 w-6 text-primary" />
              </div>
              {resume.similarity_score !== undefined && (
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                  scoreColor
                )}>
                  {Math.round(resume.similarity_score * 100)}
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {resume.name}
              </CardTitle>
              {resume.current_role && (
                <CardDescription className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {resume.current_role}
                </CardDescription>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-0">
        {/* Quick Info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {resume.email && (
            <span className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Mail className="h-3 w-3" />
              <span className="truncate max-w-[150px]">{resume.email}</span>
            </span>
          )}
          {resume.location && (
            <span className="flex items-center gap-1 hover:text-foreground transition-colors">
              <MapPin className="h-3 w-3" />
              {resume.location}
            </span>
          )}
          {resume.years_experience && (
            <span className="flex items-center gap-1 hover:text-foreground transition-colors">
              <TrendingUp className="h-3 w-3" />
              {resume.years_experience}y exp
            </span>
          )}
        </div>

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resume.skills.slice(0, expanded ? undefined : 4).map((skill, i) => (
              <Badge 
                key={i} 
                variant="secondary" 
                className="text-xs px-2 py-0.5 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                {skill}
              </Badge>
            ))}
            {!expanded && resume.skills.length > 4 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                +{resume.skills.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-3 pt-3 border-t animate-in slide-in-from-top-2 duration-200">
            {/* Contact */}
            {resume.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {resume.phone}
              </div>
            )}
            
            {/* Summary */}
            {resume.summary && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground leading-relaxed">{resume.summary}</p>
              </div>
            )}

            {/* Source file */}
            {resume.source_file_name && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                {resume.source_file_name}
              </div>
            )}
          </div>
        )}

        {/* Expand/Collapse */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show details
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Chunks Results Component
// =============================================================================

interface ChunksResultsAreaProps {
  chunksMutation: ReturnType<typeof useMutation<ChunkSearchResponse, Error, void>>;
  searchQuery: string;
}

function ChunksResultsArea({ chunksMutation, searchQuery }: ChunksResultsAreaProps) {
  if (chunksMutation.isPending) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="mt-4 text-lg font-medium">Searching sections...</p>
        </CardContent>
      </Card>
    );
  }

  if (chunksMutation.error) {
    return (
      <Card className="border-destructive border-2">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="p-3 rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-destructive">Search Error</p>
            <p className="text-sm text-muted-foreground">{chunksMutation.error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const results = chunksMutation.data?.results || [];

  if (!chunksMutation.data && !searchQuery) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
            <Zap className="h-10 w-10 text-orange-500" />
          </div>
          <h3 className="text-xl font-semibold">Section Search</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            Search specific resume sections like skills, experience, or education.
            <br />
            More precise than full resume search.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No matching sections found</p>
          <p className="text-sm text-muted-foreground">Try different keywords</p>
        </CardContent>
      </Card>
    );
  }

  // Group by chunk type
  const chunkTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    personal_info: { label: "Personal Info", icon: <User className="h-4 w-4" />, color: "bg-blue-500" },
    summary: { label: "Summary", icon: <FileText className="h-4 w-4" />, color: "bg-purple-500" },
    experience: { label: "Experience", icon: <Briefcase className="h-4 w-4" />, color: "bg-green-500" },
    education: { label: "Education", icon: <TrendingUp className="h-4 w-4" />, color: "bg-yellow-500" },
    skills: { label: "Skills", icon: <Zap className="h-4 w-4" />, color: "bg-orange-500" },
    certifications: { label: "Certifications", icon: <Database className="h-4 w-4" />, color: "bg-pink-500" },
    languages: { label: "Languages", icon: <MessageSquare className="h-4 w-4" />, color: "bg-cyan-500" },
    full_resume: { label: "Full Resume", icon: <FileText className="h-4 w-4" />, color: "bg-gray-500" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Found {results.length} matching sections
        </h2>
        <Badge variant="secondary" className="text-xs">
          Query: "{chunksMutation.data?.query}"
        </Badge>
      </div>

      <div className="grid gap-4">
        {results.map((chunk) => {
          const chunkType = chunk.chunkType || chunk.metadata?.type || "unknown";
          const typeInfo = chunkTypeLabels[chunkType] || { 
            label: chunkType, 
            icon: <FileText className="h-4 w-4" />, 
            color: "bg-gray-500" 
          };
          const similarity = Math.round(chunk.similarity * 100);

          return (
            <Card key={chunk.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="py-3 px-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md text-white", typeInfo.color)}>
                      {typeInfo.icon}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {chunk.metadata?.title || typeInfo.label}
                      </CardTitle>
                      {chunk.metadata?.company && (
                        <CardDescription className="text-xs">
                          {chunk.metadata.position} @ {chunk.metadata.company}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={similarity >= 70 ? "default" : similarity >= 50 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {similarity}% match
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {typeInfo.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {chunk.text}
                </p>
                {chunk.extractionId && (
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>From extraction: {chunk.extractionId.slice(0, 8)}...</span>
                    <Clock className="h-3 w-3 ml-2" />
                    <span>{chunk.createdAt ? new Date(chunk.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
