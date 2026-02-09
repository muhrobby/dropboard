import { WebhooksSettings } from "@/components/settings/webhooks-settings";
import { PageHeader } from "@/components/patterns";

export const metadata = {
  title: "Webhooks - Settings - Dropboard",
  description: "Manage webhooks for your workspace",
};

export default function WebhooksPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="p-4 md:p-6">
          <PageHeader
            title="Webhooks"
            description="Connect to external services and automate workflows"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
        <div className="max-w-4xl">
          <WebhooksSettings />
        </div>
      </div>
    </div>
  );
}
