import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { useDateFormatter } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Edit, XCircle, CheckCircle, Save, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExtraction, updateExtractionReviewStatus, updateExtractionData, type ExtractionReviewStatus } from "@/lib/api";
import { Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { StructuredResultsViewer } from "@/components/StructuredResultsViewer";
import type { DocumentType, ExtractedField } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToJSON, exportToCSV, exportToExcel, exportToMarkdown, exportToText } from "@/lib/export";

function setAtPath(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const result = { ...obj };
  result[path] = value;
  return result;
}

export default function ExtractionDetail() {
  const { t } = useLanguage();
  const { formatDate } = useDateFormatter();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedFields, setEditedFields] = useState<ExtractedField[]>([]);

  const { data: extractionData, isLoading: isLoadingExtraction } = useQuery({
    queryKey: ['extraction', id],
    queryFn: () => getExtraction(id!),
    enabled: !!id,
  });

  // Mutation for saving edited data
  const saveDataMutation = useMutation({
    mutationFn: (fields: ExtractedField[]) => {
      // Reconstruct extractedData from edited header fields
      let updated = { ...(extractedData || {}) };
      for (const field of fields) {
        updated = setAtPath(updated, field.key, field.value);
      }
      return updateExtractionData(id!, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraction', id] });
      setIsEditMode(false);
      toast({ title: t('review.saved') || 'Changes saved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Mutation for updating review status
  const reviewMutation = useMutation({
    mutationFn: ({ status }: { status: ExtractionReviewStatus }) => 
      updateExtractionReviewStatus(id!, status),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['extraction', id] });
      const message = variables.status === 'approved' 
        ? t('review.success_approved') 
        : t('review.success_rejected');
      toast({
        title: message,
        variant: variables.status === 'approved' ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleApprove = () => {
    reviewMutation.mutate({ status: 'approved' });
  };

  const handleReject = () => {
    reviewMutation.mutate({ status: 'rejected' });
  };

  const headerFields: ExtractedField[] = (extractionData?.extraction?.extractedData as any)?.headerFields || [];

  const handleEdit = () => {
    if (isEditMode) {
      // Cancel edit
      setIsEditMode(false);
      toast({ title: 'Edit mode disabled', description: 'Changes discarded' });
    } else {
      // Enter edit mode - initialize editedFields from current headerFields
      setEditedFields([...headerFields]);
      setIsEditMode(true);
      toast({ title: 'Edit mode enabled', description: 'You can now edit the extracted data' });
    }
  };

  const extraction = extractionData?.extraction;
  const isGeneralExtraction = extraction?.documentType === 'general';
  const reviewStatus = (extraction as any)?.reviewStatus as ExtractionReviewStatus | undefined;

  if (isLoadingExtraction) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!extraction) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back') || 'Back'}
          </Link>
        </Button>
        <Card>
          <CardContent className="text-center p-12">
            <p className="text-muted-foreground">Extraction not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const extractedData = extraction.extractedData as any;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/history" className="hover:text-foreground transition-colors">
              {t('nav.history') || 'History'}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[300px]">
              {extraction.fileName}
            </span>
          </div>
          {/* Document info */}
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="capitalize">
              {extraction.documentType}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatDate(new Date(extraction.createdAt))}
            </span>
            <Badge 
              variant={extraction.status === 'completed' ? 'success' : extraction.status === 'processing' ? 'default' : 'warning'}
            >
              {extraction.status}
            </Badge>
            {/* Review Status Badge */}
            {reviewStatus && (
              <Badge 
                variant={
                  reviewStatus === 'approved' ? 'success' : 
                  reviewStatus === 'rejected' ? 'destructive' : 
                  reviewStatus === 'edited' ? 'secondary' : 
                  'outline'
                }
              >
                {t(`review.status.${reviewStatus}`) || reviewStatus}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Edit / Cancel Button */}
          <Button 
            variant={isEditMode ? "outline" : "secondary"} 
            size="sm"
            onClick={handleEdit}
          >
            {isEditMode ? <X className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
            {isEditMode ? (t('common.cancel') || 'Cancel') : (t('review.edit') || 'Edit')}
          </Button>

          {/* Save Button (edit mode only) */}
          {isEditMode && (
            <Button
              variant="default"
              size="sm"
              onClick={() => saveDataMutation.mutate(editedFields)}
              disabled={saveDataMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveDataMutation.isPending ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
            </Button>
          )}

          {/* Reject Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReject}
            disabled={reviewMutation.isPending || reviewStatus === 'rejected'}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <XCircle className="mr-2 h-4 w-4" />
            {t('review.reject') || 'Reject'}
          </Button>
          
          {/* Approve Button */}
          <Button 
            variant="default" 
            size="sm"
            onClick={handleApprove}
            disabled={reviewMutation.isPending || reviewStatus === 'approved'}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('review.approve') || 'Approve'}
          </Button>
          
          {/* Download Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                {t('docs.download') || 'Download'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToJSON(extraction)}>
                {t('export.json') || 'JSON'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToCSV(extraction)}>
                {t('export.csv') || 'CSV'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(extraction)}>
                {t('export.excel') || 'Excel'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToMarkdown(extraction)}>
                {t('export.markdown') || 'Markdown'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToText(extraction)}>
                {t('export.text') || 'Text'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <Card className="flex flex-col overflow-hidden flex-1">
        <CardHeader className="border-b bg-muted/30 py-3">
          <CardTitle className="text-sm font-medium">
            {t('extract.results') || 'Extracted Data'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {isGeneralExtraction ? (
            <MarkdownViewer 
              data={{
                success: true,
                markdown: extractedData?.markdown || '',
                text: extractedData?.text || '',
                pages: extractedData?.pages || [],
                pageCount: extraction.pagesProcessed,
                fileName: extraction.fileName,
                fileSize: extraction.fileSize,
                mimeType: 'application/pdf',
              }}
              className="h-full"
            />
          ) : (
            <StructuredResultsViewer
              headerFields={extractedData?.headerFields || []}
              lineItems={extractedData?.lineItems || []}
              extractedData={extractedData}
              confidenceScores={extractedData?.confidenceScores as Record<string, number> | undefined}
              documentType={extraction.documentType as DocumentType}
              onFieldChange={isEditMode ? (idx, val) => setEditedFields(prev => prev.map((f, i) => i === idx ? { ...f, value: val } : f)) : undefined}
              className="h-full"
              fileName={extraction.fileName}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

