import { Separator } from "@/components/ui/separator";

export default function SettingsSecurityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account security and multi-factor authentication.
        </p>
      </div>
      <Separator />
      <div className="p-8 text-center border border-dashed rounded-lg">
        <p className="text-muted-foreground">
          Security settings are coming soon.
        </p>
      </div>
    </div>
  );
}
