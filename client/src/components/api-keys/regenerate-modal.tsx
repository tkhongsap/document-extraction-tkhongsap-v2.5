import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useRegenerateApiKey, ApiKey } from "@/hooks/use-api-keys";
import { Copy, Check, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface RegenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: ApiKey | null;
}

export function RegenerateModal({ open, onOpenChange, apiKey }: RegenerateModalProps) {
  const { toast } = useToast();
  const regenerateApiKey = useRegenerateApiKey();

  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    if (newKey && !copied) {
      const confirmed = window.confirm(
        "Are you sure you want to close? The new API key will not be shown again."
      );
      if (!confirmed) return;
    }
    setNewKey(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleRegenerate = async () => {
    if (!apiKey) return;

    try {
      const response = await regenerateApiKey.mutateAsync(apiKey.id);
      setNewKey(response.plainKey);
      toast({
        title: "API Key Regenerated",
        description: "Your API key has been regenerated. The old key is now invalid.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate API key",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;

    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "New API key copied to clipboard",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = newKey;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast({
          title: "Copied!",
          description: "New API key copied to clipboard",
        });
        setTimeout(() => setCopied(false), 3000);
      } catch {
        toast({
          title: "Copy failed",
          description: "Please manually select and copy the key",
          variant: "destructive",
        });
      }
      document.body.removeChild(textArea);
    }
  };

  if (!apiKey) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {newKey ? "New API Key Generated" : "Regenerate API Key"}
          </DialogTitle>
          <DialogDescription>
            {newKey
              ? "Your new API key is ready. Copy it now — it won't be shown again."
              : `Regenerate the API key "${apiKey.name}". The current key will be invalidated immediately.`}
          </DialogDescription>
        </DialogHeader>

        {!newKey ? (
          <div className="py-4">
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Warning:</strong> This action will immediately invalidate the
                current API key. Any applications using the old key will stop working.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> This key will only be shown once. Please copy
                and store it securely.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>New API Key</Label>
              <div className="relative">
                <Input
                  value={newKey}
                  readOnly
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              onClick={handleCopy}
              className="w-full"
              variant={copied ? "outline" : "default"}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy New API Key
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          {!newKey ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={regenerateApiKey.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={regenerateApiKey.isPending}
                variant="destructive"
              >
                {regenerateApiKey.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
