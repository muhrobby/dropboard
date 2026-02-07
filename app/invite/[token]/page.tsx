"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useInviteInfo, useAcceptInvite } from "@/hooks/use-members";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/team/role-badge";
import { Users, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import type { MemberRole } from "@/types";

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const { data: invite, isLoading, error } = useInviteInfo(token);
  const acceptInvite = useAcceptInvite();

  async function handleAccept() {
    try {
      await acceptInvite.mutateAsync(token);
      toast.success("You have joined the workspace!");
      router.push("/drops");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept invite");
    }
  }

  if (isLoading || sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Invalid Invite</h2>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "This invite link is invalid or has expired."}
            </p>
            <Button onClick={() => router.push("/login")} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">Workspace Invitation</h2>
            <p className="text-sm text-muted-foreground">
              You&apos;ve been invited to join a workspace. Sign in or create an
              account to accept.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() =>
                  router.push(`/login?callbackUrl=/invite/${token}`)
                }
              >
                Sign In
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/register?callbackUrl=/invite/${token}`)
                }
              >
                Create Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Workspace Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You&apos;ve been invited to join a workspace as:
          </p>
          <div className="flex justify-center">
            <RoleBadge role={invite.role as MemberRole} />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleAccept}
              disabled={acceptInvite.isPending}
            >
              {acceptInvite.isPending ? "Joining..." : "Accept Invitation"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/drops")}
            >
              Decline
            </Button>
          </div>
          {acceptInvite.isSuccess && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Successfully joined!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
