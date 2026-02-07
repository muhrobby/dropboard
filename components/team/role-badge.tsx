import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MemberRole } from "@/types";

const roleConfig: Record<MemberRole, { label: string; className: string }> = {
  owner: {
    label: "Owner",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  admin: {
    label: "Admin",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  member: {
    label: "Member",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
};

export function RoleBadge({ role }: { role: MemberRole }) {
  const config = roleConfig[role] ?? roleConfig.member;

  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
