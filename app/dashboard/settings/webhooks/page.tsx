import { WebhooksSettings } from "@/components/settings/webhooks-settings";

export const metadata = {
  title: "Webhooks - Settings - Dropboard",
  description: "Manage webhooks for your workspace",
};

export default function WebhooksPage() {
  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage webhooks and integrations</p>
      </div>
      <WebhooksSettings />
    </div>
  );
}
