import { Separator } from "@/components/ui/separator";

export default function SettingsBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing</h3>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>
      <Separator />
      <div className="p-8 text-center border border-dashed rounded-lg">
        <p className="text-muted-foreground">
          Billing management is coming soon.
        </p>
      </div>
    </div>
  );
}
