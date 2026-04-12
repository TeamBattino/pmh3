"use client";

import { Button } from "@/components/ui/Button";
import {
  DialogContent,
  DialogFooter,
  DialogClose,
  Dialog,
  DialogTitle,
  DialogTrigger,
  DialogHeader,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "@/components/ui/Sonner";
import { saveAuthClient } from "@/lib/db/db-actions";
import type { AuthClient } from "@/lib/db/db";
import { queryClient } from "@/lib/query-client";
import { useState } from "react";
import { Copy, Eye, EyeOff, Plus, X } from "lucide-react";

interface OAuthClientModalProps {
  client?: AuthClient;
  mode: "add" | "edit";
  trigger: React.ReactNode;
}

function generateClientId(): string {
  return `client-${crypto.randomUUID().slice(0, 8)}`;
}

function generateClientSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function OAuthClientModal({
  client: initialClient,
  mode,
  trigger,
}: OAuthClientModalProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialClient?.name ?? "");
  const [description, setDescription] = useState(
    initialClient?.description ?? ""
  );
  const [clientId, setClientId] = useState(
    initialClient?.clientId ?? generateClientId()
  );
  const [redirectUris, setRedirectUris] = useState<string[]>(
    initialClient?.redirectUris ?? [""]
  );
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setName(initialClient?.name ?? "");
      setDescription(initialClient?.description ?? "");
      setClientId(initialClient?.clientId ?? generateClientId());
      setRedirectUris(initialClient?.redirectUris ?? [""]);
      if (mode === "add") {
        const secret = generateClientSecret();
        setGeneratedSecret(secret);
      } else {
        setGeneratedSecret(null);
      }
      setShowSecret(false);
    }
  };

  const handleAddRedirectUri = () => {
    setRedirectUris((prev) => [...prev, ""]);
  };

  const handleRemoveRedirectUri = (index: number) => {
    setRedirectUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRedirectUriChange = (index: number, value: string) => {
    setRedirectUris((prev) =>
      prev.map((uri, i) => (i === index ? value : uri))
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    const validUris = redirectUris.filter((u) => u.trim());
    if (validUris.length === 0) {
      toast.error("At least one redirect URI is required");
      return;
    }

    try {
      const clientData: AuthClient & { plainSecret?: string } = {
        clientId,
        clientSecretHash: initialClient?.clientSecretHash ?? "",
        name: name.trim(),
        description: description.trim(),
        redirectUris: validUris,
      };
      if (generatedSecret) {
        clientData.plainSecret = generatedSecret;
      }

      await saveAuthClient(clientData);
      queryClient.invalidateQueries({ queryKey: ["authClients"] });
      setOpen(false);
      toast.success(
        mode === "add" ? "Client created" : "Client updated"
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to save client");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Register New Service" : "Edit Service"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. PMH Admin"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Description
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. CMS admin panel"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Client ID
            </Label>
            <div className="flex gap-2">
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={mode === "edit"}
                className="font-mono text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(clientId)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {generatedSecret && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Client Secret
              </Label>
              <p className="text-xs text-destructive font-medium">
                Save this now — it won&apos;t be shown again.
              </p>
              <div className="flex gap-2">
                <Input
                  value={showSecret ? generatedSecret : "••••••••••••••••"}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSecret((s) => !s)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(generatedSecret)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Redirect URIs
            </Label>
            {redirectUris.map((uri, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={uri}
                  onChange={(e) => handleRedirectUriChange(i, e.target.value)}
                  placeholder="https://example.com/auth/callback"
                  className="font-mono text-sm"
                />
                {redirectUris.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRedirectUri(i)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={handleAddRedirectUri}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add URI
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>
            {mode === "add" ? "Create" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
