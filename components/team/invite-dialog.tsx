"use client";

import { useState } from "react";
import { useCreateInvite } from "@/hooks/use-members";
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
import { Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function InviteDialog() {
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createInvite = useCreateInvite();

  function reset() {
    setIdentifier("");
    setRole("member");
    setInviteLink(null);
    setCopied(false);
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
      toast.success("Invite created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invite");
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

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
              <Label htmlFor="identifier">Email or name</Label>
              <Input
                id="identifier"
                placeholder="teammate@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member - can manage own items</SelectItem>
                  <SelectItem value="admin">Admin - can manage all items & invite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Share this link with your teammate. It expires in 7 days.
            </p>
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
            <Button onClick={() => { setOpen(false); reset(); }}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
