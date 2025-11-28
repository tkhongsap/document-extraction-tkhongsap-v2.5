import { useLanguage } from "@/lib/i18n";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadCloud, FileText, Loader2, Download, ArrowLeft } from "lucide-react";
import { useParams, Link } from "wouter";
import { cn } from "@/lib/utils";
import { getTemplateById } from "@/lib/templates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { processExtraction, saveExtraction } from "@/lib/api";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";

interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
}

export default function Extraction() {
  const { t } = useLanguage();
  const { type } = useParams();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ExtractedField[] | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const uploadedFile = acceptedFiles[0];
    setFile(uploadedFile);
    setIsProcessing(true);
    setResults(null);

    try {
      // Call real API to process extraction
      const response = await processExtraction({
        fileName: uploadedFile.name,
        documentType: type || 'general',
      });

      setResults(response.results);

      // Save extraction to database
      await saveExtraction({
        fileName: uploadedFile.name,
        fileSize: uploadedFile.size,
        documentType: type || 'general',
        pagesProcessed: response.pagesProcessed,
        extractedData: response.results,
        status: 'completed',
      });

      toast.success('Document extracted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Extraction failed');
      setResults(null);
    } finally {
      setIsProcessing(false);
    }
  }, [type]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 1
  });

  const handleValueChange = (index: number, newValue: string) => {
    if (!results) return;
    const newResults = [...results];
    newResults[index].value = newValue;
    setResults(newResults);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          {(() => {
            const template = getTemplateById(type || 'general', t);
            const displayName = template?.name || t('nav.general');
            const displayDesc = template?.desc || t('dash.general_desc');
            return (
              <>
                <h1 className="text-xl font-semibold">{displayName}</h1>
                <p className="text-sm text-muted-foreground">{displayDesc}</p>
              </>
            );
          })()}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Left Panel: Upload/Preview */}
        <Card className="flex flex-col overflow-hidden h-full">
          <CardHeader className="border-b bg-muted/30 py-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <UploadCloud className="mr-2 h-4 w-4" />
              {file ? file.name : t('extract.upload_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative bg-muted/10">
            {!file ? (
              <div 
                {...getRootProps()} 
                className={cn(
                  "h-full flex flex-col items-center justify-center p-8 border-2 border-dashed m-4 rounded-lg transition-all cursor-pointer",
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                )}
              >
                <input {...getInputProps()} />
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium mb-2">{t('extract.upload_title')}</p>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  {t('extract.upload_desc')}
                </p>
                <p className="text-xs text-muted-foreground mt-4">PDF, JPG, PNG up to 10MB</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 relative">
                {/* Mock Document Preview */}
                <div className="w-full h-full bg-white shadow-sm p-8 border overflow-auto max-w-md mx-auto">
                    <div className="space-y-4 opacity-50">
                        <div className="h-8 bg-slate-200 w-1/3 mb-8"></div>
                        <div className="h-4 bg-slate-200 w-full"></div>
                        <div className="h-4 bg-slate-200 w-full"></div>
                        <div className="h-4 bg-slate-200 w-2/3"></div>
                        <div className="h-32 bg-slate-100 w-full mt-8 border"></div>
                        <div className="flex justify-end mt-8">
                             <div className="h-4 bg-slate-200 w-1/4"></div>
                        </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <p className="text-slate-400 font-medium bg-white/80 px-4 py-2 rounded backdrop-blur-sm">Preview Mode</p>
                    </div>
                </div>
                <Button variant="destructive" size="sm" className="absolute top-4 right-4 z-10" onClick={() => setFile(null)}>
                  Remove
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Results */}
        <Card className="flex flex-col overflow-hidden h-full">
          <CardHeader className="border-b bg-muted/30 py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {t('extract.results')}
            </CardTitle>
            {results && (
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" className="h-8 text-xs">
                   <Download className="mr-2 h-3 w-3" />
                   JSON
                 </Button>
                 <Button variant="default" size="sm" className="h-8 text-xs">
                   <Download className="mr-2 h-3 w-3" />
                   Excel
                 </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            {isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">{t('extract.processing')}</p>
              </div>
            ) : results ? (
              <div className="min-w-full inline-block align-middle">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[35%]">{t('extract.field')}</TableHead>
                      <TableHead>{t('extract.value')}</TableHead>
                      <TableHead className="w-[80px] text-right">{t('extract.confidence')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((field, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-muted-foreground text-xs uppercase tracking-wider align-middle">
                          {field.key}
                        </TableCell>
                        <TableCell className="p-2">
                          <Input 
                            value={field.value} 
                            onChange={(e) => handleValueChange(i, e.target.value)}
                            className="h-8 bg-transparent border-transparent hover:border-input focus:border-primary focus:bg-background transition-all"
                          />
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-help",
                            field.confidence > 0.9 ? "bg-green-100 text-green-800" :
                            field.confidence > 0.7 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          )} title={`Confidence Score: ${field.confidence * 100}%`}>
                            {Math.round(field.confidence * 100)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p>Upload a document to see extracted data here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function generateMockResults(type: string): ExtractedField[] {
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
