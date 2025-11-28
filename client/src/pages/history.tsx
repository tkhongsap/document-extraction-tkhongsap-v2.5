import { useLanguage } from "@/lib/i18n";
import { useDateFormatter } from "@/lib/date-utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getExtractions } from "@/lib/api";

export default function History() {
  const { t } = useLanguage();
  const { formatDate } = useDateFormatter();

  const { data, isLoading } = useQuery({
    queryKey: ['extractions'],
    queryFn: () => getExtractions(100),
  });

  const extractions = data?.extractions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.history')}</h1>
      </div>

      <Card>
        <CardHeader className="border-b py-4">
          <div className="flex items-center gap-4">
             <input 
               type="text" 
               placeholder="Search documents..." 
               className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 max-w-sm"
             />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : extractions.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No extraction history yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.fileName}</TableCell>
                    <TableCell className="capitalize">{item.documentType}</TableCell>
                    <TableCell>{formatDate(new Date(item.createdAt))}</TableCell>
                    <TableCell>{item.pagesProcessed}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
