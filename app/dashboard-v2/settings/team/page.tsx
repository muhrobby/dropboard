import { Separator } from "@/components/ui/separator";
import { TeamList } from "@/components/settings/v2/team-list";

export default function SettingsTeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Team</h3>
        <p className="text-sm text-muted-foreground">
          Manage your team members and permissions.
        </p>
      </div>
      <Separator />
      <TeamList />
    </div>
  );
}
