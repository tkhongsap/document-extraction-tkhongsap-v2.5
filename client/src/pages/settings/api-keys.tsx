import { useState, useEffect } from "react";
import { ApiKeyList, ApiKeyListHeader, CreateKeyDialog } from "@/components/api-keys";
import { ApiKey, useApiKeys } from "@/hooks/use-api-keys";
import { UsageBar } from "@/components/api-keys/usage-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ArrowLeft, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ApiKeysPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const { data } = useApiKeys();
  const apiKeys = data?.apiKeys || [];

  // Auto-select first active key when data loads
  useEffect(() => {
    if (apiKeys.length > 0 && !selectedKeyId) {
      const firstActive = apiKeys.find((k) => k.isActive);
      if (firstActive) {
        setSelectedKeyId(firstActive.id);
      }
    }
  }, [apiKeys, selectedKeyId]);

  // Get the selected key for showing usage summary
  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId) || apiKeys.find((k) => k.isActive);

  // Handler for selecting a key from the list
  const handleSelectKey = (key: ApiKey) => {
    setSelectedKeyId(key.id);
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Button>
        </Link>
      </div>

      {/* Header */}
      <ApiKeyListHeader onCreateClick={() => setShowCreateDialog(true)} />

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About API Keys</AlertTitle>
        <AlertDescription>
          API keys allow you to access the Document AI Extractor API programmatically. 
          Keep your keys secure and never share them publicly. 
          You can create multiple keys for different applications or environments.
        </AlertDescription>
      </Alert>

      {/* Usage Summary Card - Show if there's at least one active key */}
      {selectedKey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Summary</CardTitle>
            <CardDescription>
              Your current API usage for "{selectedKey.name}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageBar apiKey={selectedKey} showUpgradeLink={true} />
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <ApiKeyList 
        onViewStats={handleSelectKey}
        selectedKeyId={selectedKeyId}
        onSelectKey={handleSelectKey}
      />

      {/* Create Dialog */}
      <CreateKeyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Documentation Link */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-1">Need help getting started?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Check out our API documentation to learn how to use your API keys
                for document extraction, including batch processing examples.
              </p>
              <div className="flex gap-2">
                <Link href="/settings/api-docs">
                  <Button variant="default" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" />
                    View API Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
