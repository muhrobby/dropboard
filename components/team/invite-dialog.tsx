"use client";

import { useState } from "react";
import { useCreateInvite } from "@/hooks/use-members";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, UserPlus, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const createInvite = useCreateInvite();
  const getActiveWorkspace = useWorkspaceStore((s) => s.getActiveWorkspace);

  function reset() {
    setIdentifier("");
    setRole("member");
    setInviteLink(null);
    setInviteId(null);
    setCopied(false);
    setEmailSent(false);
  }

  async function handleCreate() {
    if (!identifier.trim()) return;

    try {
      const invite = await createInvite.mutateAsync({
        targetIdentifier: identifier.trim(),
        role,
      });
      const link = `${window.location.origin}/invite/${invite.token}`;
      setInviteLink(link);
      setInviteId(invite.id);
      toast.success("Invite created");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invite",
      );
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendEmail() {
    const workspace = getActiveWorkspace();
    if (!inviteId || !workspace || !identifier.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSendingEmail(true);

    try {
      const response = await fetch(
        `/api/v1/workspaces/${workspace.id}/invites/${inviteId}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: identifier.trim() }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      setEmailSent(true);
      toast.success("Invite email sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setIsSendingEmail(false);
    }
  }

  const isEmailAddress = identifier.includes("@");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        {!inviteLink ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email</Label>
              <Input
                id="identifier"
                type="email"
                placeholder="teammate@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "member" | "admin")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    Member - can manage own items
                  </SelectItem>
                  <SelectItem value="admin">
                    Admin - can manage all items & invite
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Invite created! Share via email or copy the link.
            </p>

            {/* Copy Link Section */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Invite Link
              </Label>
              <div className="flex items-center gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Send Email Section */}
            {isEmailAddress && (
              <div className="pt-2 border-t">
                <Button
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || emailSent}
                  className="w-full"
                  variant={emailSent ? "outline" : "default"}
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : emailSent ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Email Sent to {identifier}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email to {identifier}
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Link expires in 7 days.
            </p>
          </div>
        )}

        <DialogFooter>
          {!inviteLink ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!identifier.trim() || createInvite.isPending}
              >
                {createInvite.isPending ? "Creating..." : "Create Invite"}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                setOpen(false);
                reset();
              }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
