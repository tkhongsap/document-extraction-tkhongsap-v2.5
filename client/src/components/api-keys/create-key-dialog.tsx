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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useCreateApiKey } from "@/hooks/use-api-keys";
import { Copy, Check, AlertTriangle, Key, Loader2 } from "lucide-react";

interface CreateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExpirationOption = "30d" | "90d" | "1y" | "never";

const expirationOptions: { value: ExpirationOption; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "never", label: "Never expires" },
];

const getExpirationDate = (option: ExpirationOption): string | null => {
  if (option === "never") return null;
  
  const now = new Date();
  switch (option) {
    case "30d":
      now.setDate(now.getDate() + 30);
      break;
    case "90d":
      now.setDate(now.getDate() + 90);
      break;
    case "1y":
      now.setFullYear(now.getFullYear() + 1);
      break;
  }
  return now.toISOString();
};

export function CreateKeyDialog({ open, onOpenChange }: CreateKeyDialogProps) {
  const { toast } = useToast();
  const createApiKey = useCreateApiKey();

  // Form state
  const [name, setName] = useState("");
  const [expiration, setExpiration] = useState<ExpirationOption>("90d");
  const [scopes, setScopes] = useState({
    extract: true,
    read: true,
  });

  // Result state
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setName("");
    setExpiration("90d");
    setScopes({ extract: true, read: true });
    setGeneratedKey(null);
    setCopied(false);
  };

  const handleClose = () => {
    if (generatedKey) {
      // Show confirmation before closing if key hasn't been copied
      if (!copied) {
        const confirmed = window.confirm(
          "Are you sure you want to close? The API key will not be shown again."
        );
        if (!confirmed) return;
      }
    }
    resetForm();
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    // Build scopes string
    const scopesList = Object.entries(scopes)
      .filter(([_, enabled]) => enabled)
      .map(([scope]) => scope)
      .join(",");

    if (!scopesList) {
      toast({
        title: "Error",
        description: "Please select at least one permission",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await createApiKey.mutateAsync({
        name: name.trim(),
        scopes: scopesList,
        expires_at: getExpirationDate(expiration),
      });

      setGeneratedKey(response.plainKey);
      toast({
        title: "API Key Created",
        description: "Your new API key has been created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    if (!generatedKey) return;

    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "API key copied to clipboard",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers or non-HTTPS
      const textArea = document.createElement("textarea");
      textArea.value = generatedKey;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        toast({
          title: "Copied!",
          description: "API key copied to clipboard",
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {generatedKey ? "API Key Created" : "Create New API Key"}
          </DialogTitle>
          <DialogDescription>
            {generatedKey
              ? "Your API key has been generated. Copy it now — it won't be shown again."
              : "Create a new API key for programmatic access to the extraction API."}
          </DialogDescription>
        </DialogHeader>

        {!generatedKey ? (
          // Creation Form
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name *</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production API Key"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                disabled={createApiKey.isPending}
              />
              <p className="text-xs text-muted-foreground">
                {name.length}/50 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select
                value={expiration}
                onValueChange={(value) => setExpiration(value as ExpirationOption)}
                disabled={createApiKey.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expiration" />
                </SelectTrigger>
                <SelectContent>
                  {expirationOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="scope-extract"
                    checked={scopes.extract}
                    onCheckedChange={(checked) =>
                      setScopes((s) => ({ ...s, extract: !!checked }))
                    }
                    disabled={createApiKey.isPending}
                  />
                  <label htmlFor="scope-extract" className="text-sm cursor-pointer">
                    Extract — Run document extractions
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="scope-read"
                    checked={scopes.read}
                    onCheckedChange={(checked) =>
                      setScopes((s) => ({ ...s, read: !!checked }))
                    }
                    disabled={createApiKey.isPending}
                  />
                  <label htmlFor="scope-read" className="text-sm cursor-pointer">
                    Read — View extraction results
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Generated Key Display
          <div className="space-y-4 py-4">
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <strong>Important:</strong> This key will only be shown once. Please copy
                and store it securely. You won't be able to see it again!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="relative">
                <Input
                  value={generatedKey}
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
                  Copy API Key
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          {!generatedKey ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createApiKey.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createApiKey.isPending}>
                {createApiKey.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Key"
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
