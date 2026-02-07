"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useWorkspaceStore } from "@/stores/workspace-store";
import {
  useMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useInvites,
  useCancelInvite,
} from "@/hooks/use-members";
import { RoleBadge } from "@/components/team/role-badge";
import { InviteDialog } from "@/components/team/invite-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Mail, X, Clock, Crown, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { ROLE_PERMISSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/types";
import type { Permission } from "@/lib/constants";

function canDo(role: string, perm: Permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(perm);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TeamPage() {
  const { data: session } = useSession();
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const workspace = useWorkspaceStore((s) => s.getActiveWorkspace());
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: invites, isLoading: invitesLoading } = useInvites();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const cancelInvite = useCancelInvite();

  const currentUserRole = (workspace?.role as string) || "member";
  const canManageMembers = canDo(currentUserRole, "manage_members");
  const canInvite = canDo(currentUserRole, "invite_members");
  const isTeamWorkspace = workspace?.type === "team";

  async function handleRoleChange(userId: string, role: string) {
    try {
      await updateRole.mutateAsync({ userId, role });
      toast.success("Role updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(userId: string) {
    try {
      await removeMember.mutateAsync(userId);
      toast.success("Member removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleCancelInvite(inviteId: string) {
    try {
      await cancelInvite.mutateAsync(inviteId);
      toast.success("Invite cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel invite");
    }
  }

  function handleCopyInviteLink(token: string, inviteId: string) {
    const inviteLink = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopiedInviteId(inviteId);
      toast.success("Invite link copied to clipboard");
      setTimeout(() => setCopiedInviteId(null), 2000);
    }).catch(() => {
      toast.error("Failed to copy invite link");
    });
  }

  function StatCard({
    icon,
    label,
    value,
    subtext,
    color,
    bgColor,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string;
    color: string;
    bgColor: string;
  }) {
    const Icon = icon;
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
          <div className={cn("flex items-center justify-center w-12 h-12 rounded-xl", bgColor)}>
            <Icon className={cn("w-6 h-6", color)} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtext}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (!isTeamWorkspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <Crown className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Personal Workspace</h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Team features are only available in team workspaces. Create a team workspace from the sidebar to start collaborating.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage members and invitations
          </p>
        </div>
        {canInvite && <InviteDialog />}
      </div>

      {/* Stat Cards */}
      {!membersLoading && !invitesLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-bottom-2">
          <StatCard
            icon={Users}
            label="Total Members"
            value={members?.length || 0}
            color="text-blue-500"
            bgColor="bg-blue-500/10"
          />
          <StatCard
            icon={Mail}
            label="Pending Invites"
            value={invites?.filter((i) => i.status === "pending").length || 0}
            subtext={canInvite ? "Send more invites" : "Contact admin"}
            color="text-orange-500"
            bgColor="bg-orange-500/10"
          />
          <StatCard
            icon={Crown}
            label="Workspace Type"
            value="Team"
            subtext="Collaboration enabled"
            color="text-purple-500"
            bgColor="bg-purple-500/10"
          />
          <StatCard
            icon={Clock}
            label="Your Role"
            value={currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
            subtext={canManageMembers ? "Full access" : canInvite ? "Can invite" : "Limited access"}
            color="text-green-500"
            bgColor="bg-green-500/10"
          />
        </div>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Members
            {members && (
              <span className="text-sm font-normal text-muted-foreground">
                ({members.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : members?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members found.</p>
          ) : (
            <div className="space-y-3">
              {members?.map((member) => {
                const isCurrentUser = member.userId === session?.user?.id;
                const isOwner = member.role === "owner";

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-sm">
                        {getInitials(member.user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user.name}
                        {isCurrentUser && (
                          <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.user.email}
                      </p>
                    </div>

                    {canManageMembers && !isOwner && !isCurrentUser ? (
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleRoleChange(member.userId, v)}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <RoleBadge role={member.role as MemberRole} />
                    )}

                    {canManageMembers && !isOwner && !isCurrentUser && (
                      <ConfirmDialog
                        title="Remove Member"
                        description={`Remove ${member.user.name} from this workspace? They will lose access to all workspace data.`}
                        onConfirm={() => handleRemove(member.userId)}
                        variant="destructive"
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      </ConfirmDialog>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              Pending Invites
              {invites && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({invites.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : invites?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending invites.</p>
            ) : (
              <div className="space-y-3">
                {invites?.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invite.targetIdentifier}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Expires {formatDate(invite.expiresAt)}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyInviteLink(invite.token, invite.id)}
                      className="gap-1.5 h-8"
                    >
                      {copiedInviteId === invite.id ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy Link
                        </>
                      )}
                    </Button>

                    <RoleBadge role={invite.role as MemberRole} />

                    <ConfirmDialog
                      title="Cancel Invite"
                      description={`Cancel the invite for ${invite.targetIdentifier}?`}
                      onConfirm={() => handleCancelInvite(invite.id)}
                      variant="destructive"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </ConfirmDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
