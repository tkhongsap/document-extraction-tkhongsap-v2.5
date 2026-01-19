import { useState } from "react";
import { ApiKey, useApiKeys } from "@/hooks/use-api-keys";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiKeyRow } from "./api-key-row";
import { CreateKeyDialog } from "./create-key-dialog";
import { RegenerateModal } from "./regenerate-modal";
import { DeleteModal } from "./delete-modal";
import { Key, Plus, FileKey2 } from "lucide-react";

interface ApiKeyListProps {
  onViewStats?: (apiKey: ApiKey) => void;
  selectedKeyId?: string | null;
  onSelectKey?: (apiKey: ApiKey) => void;
}

export function ApiKeyList({ onViewStats, selectedKeyId, onSelectKey }: ApiKeyListProps) {
  const { data, isLoading, error } = useApiKeys();

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [regenerateKey, setRegenerateKey] = useState<ApiKey | null>(null);
  const [deleteKey, setDeleteKey] = useState<ApiKey | null>(null);

  const apiKeys = data?.apiKeys || [];

  // Loading state
  if (isLoading) {
    return <ApiKeyListSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="text-destructive mb-2">Failed to load API keys</div>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (apiKeys.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <FileKey2 className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No API Keys Yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Create an API key to start integrating with external services and
              automating your document extractions.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Key
            </Button>
          </CardContent>
        </Card>

        <CreateKeyDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead className="w-[200px]">Key</TableHead>
                <TableHead className="w-[120px]">Created</TableHead>
                <TableHead className="w-[120px]">Last Used</TableHead>
                <TableHead className="w-[160px]">Usage</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => (
                <ApiKeyRow
                  key={apiKey.id}
                  apiKey={apiKey}
                  isSelected={selectedKeyId === apiKey.id}
                  onRegenerate={setRegenerateKey}
                  onDelete={setDeleteKey}
                  onViewStats={onViewStats || (() => {})}
                  onSelect={onSelectKey}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modals */}
      <CreateKeyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      <RegenerateModal
        open={!!regenerateKey}
        onOpenChange={(open) => !open && setRegenerateKey(null)}
        apiKey={regenerateKey}
      />
      <DeleteModal
        open={!!deleteKey}
        onOpenChange={(open) => !open && setDeleteKey(null)}
        apiKey={deleteKey}
      />
    </>
  );
}

// Loading skeleton
function ApiKeyListSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Name</TableHead>
              <TableHead className="w-[200px]">Key</TableHead>
              <TableHead className="w-[120px]">Created</TableHead>
              <TableHead className="w-[120px]">Last Used</TableHead>
              <TableHead className="w-[160px]">Usage</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <td className="p-2">
                  <Skeleton className="h-5 w-32" />
                </td>
                <td className="p-2">
                  <Skeleton className="h-6 w-40" />
                </td>
                <td className="p-2">
                  <Skeleton className="h-5 w-24" />
                </td>
                <td className="p-2">
                  <Skeleton className="h-5 w-24" />
                </td>
                <td className="p-2">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="p-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                </td>
                <td className="p-2">
                  <Skeleton className="h-8 w-8 rounded" />
                </td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Header component with create button
export function ApiKeyListHeader({
  onCreateClick,
}: {
  onCreateClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Key className="h-6 w-6" />
          API Keys
        </h1>
        <p className="text-muted-foreground">
          Manage your API keys for programmatic access to document extractions
        </p>
      </div>
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" />
        Create New Key
      </Button>
    </div>
  );
}
