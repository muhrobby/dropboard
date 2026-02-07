"use client";

import { useMembers } from "@/hooks/use-members";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Mock data for initial development
const MOCK_ACTIVITIES = [
  {
    id: 1,
    user: { name: "Robby", email: "robby@example.com" },
    action: "uploaded",
    target: "Project_Proposal_Final.pdf",
    time: "2 minutes ago",
  },
  {
    id: 2,
    user: { name: "Sarah Wilson", email: "sarah@example.com" },
    action: "commented on",
    target: "Homepage_Design_v2.fig",
    time: "1 hour ago",
  },
  {
    id: 3,
    user: { name: "Mike Chen", email: "mike@example.com" },
    action: "created",
    target: "New Marketing Folder",
    time: "3 hours ago",
  },
  {
    id: 4,
    user: { name: "Robby", email: "robby@example.com" },
    action: "pinned",
    target: "Q4_Financial_Report.xlsx",
    time: "5 hours ago",
  },
  {
    id: 5,
    user: { name: "System", email: "system@dropboard.app" },
    action: "backup completed",
    target: "Daily Backup",
    time: "1 day ago",
  },
];

export function ActivityFeed() {
  const { data: members, isLoading } = useMembers();

  if (isLoading) {
    return (
      <Card className="col-span-full lg:col-span-3 h-full">
        <CardHeader>
          <CardTitle className="text-base font-medium">Activity Feed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-3 h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent">
          {MOCK_ACTIVITIES.map((activity) => (
            <div
              key={activity.id}
              className="relative flex items-start gap-4 group"
            >
              <div className="absolute left-4 md:left-0 ml-[-5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-background bg-muted-foreground/30 ring-4 ring-background group-hover:bg-primary transition-colors" />

              <div className="pl-8 md:pl-0 flex flex-col gap-1">
                <p className="text-sm">
                  <span className="font-semibold text-foreground">
                    {activity.user.name}
                  </span>
                  <span className="text-muted-foreground mr-1">
                    {" "}
                    {activity.action}{" "}
                  </span>
                  <span className="font-medium text-foreground">
                    {activity.target}
                  </span>
                </p>
                <span className="text-xs text-muted-foreground">
                  {activity.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
