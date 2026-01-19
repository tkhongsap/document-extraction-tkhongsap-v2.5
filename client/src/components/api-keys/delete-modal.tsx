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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useDeleteApiKey, ApiKey } from "@/hooks/use-api-keys";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: ApiKey | null;
}

export function DeleteModal({ open, onOpenChange, apiKey }: DeleteModalProps) {
  const { toast } = useToast();
  const deleteApiKey = useDeleteApiKey();

  const [confirmName, setConfirmName] = useState("");

  const handleClose = () => {
    setConfirmName("");
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!apiKey) return;

    try {
      await deleteApiKey.mutateAsync(apiKey.id);
      toast({
        title: "API Key Deleted",
        description: `The API key "${apiKey.name}" has been deleted.`,
      });
      handleClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  if (!apiKey) return null;

  const canDelete = confirmName === apiKey.name;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete API Key
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The API key will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Are you sure you want to delete <strong>"{apiKey.name}"</strong>?
              Any applications using this key will immediately stop working.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirm-name">
              Type <span className="font-mono font-semibold">{apiKey.name}</span> to confirm
            </Label>
            <Input
              id="confirm-name"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder="Enter key name to confirm"
              disabled={deleteApiKey.isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={deleteApiKey.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!canDelete || deleteApiKey.isPending}
            variant="destructive"
          >
            {deleteApiKey.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Key
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
