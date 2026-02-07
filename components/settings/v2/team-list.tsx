"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useMembers,
  useInvites,
  useRemoveMember,
  useCancelInvite,
  useUpdateMemberRole,
} from "@/hooks/use-members";
import {
  MoreHorizontal,
  Shield,
  ShieldAlert,
  Trash,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { InviteMemberDialog } from "./invite-dialog";

export function TeamList() {
  const { data: members, isLoading: isLoadingMembers } = useMembers();
  const { data: invites, isLoading: isLoadingInvites } = useInvites();

  const { mutate: removeMember } = useRemoveMember();
  const { mutate: cancelInvite } = useCancelInvite();
  const { mutate: updateRole } = useUpdateMemberRole();

  const handleRemoveMember = (userId: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      removeMember(userId, {
        onSuccess: () => toast.success("Member removed"),
        onError: () => toast.error("Failed to remove member"),
      });
    }
  };

  const handleCancelInvite = (inviteId: string) => {
    cancelInvite(inviteId, {
      onSuccess: () => toast.success("Invite canceled"),
      onError: () => toast.error("Failed to cancel invite"),
    });
  };

  const handleUpdateRole = (userId: string, newRole: string) => {
    updateRole(
      { userId, role: newRole },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: () => toast.error("Failed to update role"),
      },
    );
  };

  if (isLoadingMembers || isLoadingInvites) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading team...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Team Members</h3>
            <p className="text-sm text-muted-foreground">
              Active members in your workspace.
            </p>
          </div>
          <InviteMemberDialog />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.user.image || ""} />
                      <AvatarFallback>
                        {member.user.name?.charAt(0) ||
                          member.user.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{member.user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {member.user.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.role === "admin" ? "default" : "secondary"
                      }
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(member.joinedAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            handleUpdateRole(
                              member.userId,
                              member.role === "admin" ? "member" : "admin",
                            )
                          }
                        >
                          {member.role === "admin" ? (
                            <ShieldAlert className="mr-2 h-4 w-4" />
                          ) : (
                            <Shield className="mr-2 h-4 w-4" />
                          )}
                          Make {member.role === "admin" ? "Member" : "Admin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleRemoveMember(member.userId)}
                        >
                          <Trash className="mr-2 h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pending Invites */}
      {invites && invites.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-muted-foreground">
              Pending Invites
            </h3>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invite.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(invite.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleCancelInvite(invite.id)}
                        title="Revoke Invite"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
