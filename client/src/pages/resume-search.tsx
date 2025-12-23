import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  User, 
  MapPin, 
  Briefcase, 
  Mail, 
  Phone, 
  Calendar, 
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  searchResumesSemanticApi, 
  listResumesApi, 
  deleteResumeApi,
  regenerateAllEmbeddingsApi,
  type ResumeSearchResult,
  type ResumeSearchResponse 
} from "@/lib/api";
import { toast } from "sonner";

export default function ResumeSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLimit, setSearchLimit] = useState(10);
  const [threshold, setThreshold] = useState(0.0);  // Start with 0 to show all results
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }
    searchMutation.mutate();
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

  // Determine which results to show
  const displayResults = searchMutation.data?.results || 
    (searchQuery ? [] : allResumes?.resumes) || 
    [];

  const suggestions = [
    "Python developer with 5 years experience",
    "Data scientist in Bangkok",
    "Project manager with PMP certification",
    "Frontend developer with React skills",
    "Machine learning engineer",
  ];

  return (
    <div className="container max-w-6xl py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Resume Search</h1>
            <p className="text-muted-foreground">
              Search candidates using AI semantic search
            </p>
          </div>
        </div>

        {/* Search Box */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by skills, experience, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>

            {/* Options */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="semantic"
                  checked={useSemanticSearch}
                  onCheckedChange={setUseSemanticSearch}
                />
                <Label htmlFor="semantic" className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  AI Semantic Search
                </Label>
              </div>
              
              <div className="flex items-center gap-2">
                <Label>Results:</Label>
                <Slider
                  value={[searchLimit]}
                  onValueChange={([v]) => setSearchLimit(v)}
                  min={1}
                  max={50}
                  step={1}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground w-8">{searchLimit}</span>
              </div>

              <div className="flex items-center gap-2">
                <Label>Threshold:</Label>
                <Slider
                  value={[threshold * 100]}
                  onValueChange={([v]) => setThreshold(v / 100)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground w-10">{Math.round(threshold * 100)}%</span>
              </div>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Try:</span>
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setSearchQuery(suggestion);
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {searchMutation.data 
                ? `Search Results (${searchMutation.data.results.length})` 
                : `All Resumes (${allResumes?.total || 0})`}
            </h2>
            <div className="flex items-center gap-2">
              {/* Regenerate Embeddings Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
              >
                {regenerateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate Embeddings
                  </>
                )}
              </Button>
              {searchMutation.data && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    searchMutation.reset();
                    setSearchQuery("");
                  }}
                >
                  Clear search
                </Button>
              )}
            </div>
          </div>

          {/* Error State */}
          {searchMutation.isError && (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Search Error</p>
                  <p className="text-sm text-muted-foreground">
                    {searchMutation.error?.message || "Failed to search"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {displayResults.length === 0 && !searchMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium">No resumes found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery 
                    ? "Try a different search query or adjust the threshold"
                    : "Extract resumes from the Templates page to start searching"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Resume Cards */}
          <div className="grid gap-4">
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
      </div>
  );
}

interface ResumeCardProps {
  resume: ResumeSearchResult;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function ResumeCard({ resume, expanded, onToggle, onDelete, isDeleting }: ResumeCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{resume.name}</CardTitle>
              {resume.current_role && (
                <CardDescription className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {resume.current_role}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {resume.similarity_score !== undefined && (
              <Badge 
                variant={resume.similarity_score > 0.8 ? "default" : resume.similarity_score > 0.6 ? "secondary" : "outline"}
              >
                {Math.round(resume.similarity_score * 100)}% match
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Quick Info */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {resume.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {resume.email}
            </span>
          )}
          {resume.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {resume.phone}
            </span>
          )}
          {resume.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {resume.location}
            </span>
          )}
          {resume.years_experience && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {resume.years_experience} years exp
            </span>
          )}
        </div>

        {/* Skills */}
        {resume.skills && resume.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resume.skills.slice(0, expanded ? undefined : 5).map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {!expanded && resume.skills.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{resume.skills.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {/* Summary (expanded) */}
        {expanded && resume.summary && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">{resume.summary}</p>
          </div>
        )}

        {/* Source file */}
        {resume.source_file_name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            {resume.source_file_name}
          </div>
        )}

        {/* Expand/Collapse */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-6 text-xs"
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
              Show more
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
