import { WebhooksSettings } from "@/components/settings/webhooks-settings";
import { PageHeader } from "@/components/patterns";

export const metadata = {
  title: "Webhooks - Settings - Dropboard",
  description: "Manage webhooks for your workspace",
};

export default function WebhooksPage() {
  return (
    <div className="flex flex-col h-full relative">
      <header className="shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-20">
        <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <PageHeader
            title="Webhooks"
            description="Connect to external services and automate workflows"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <WebhooksSettings />
        </div>
      </div>
    </div>
  );
}
