import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";

export function TierBadge() {
  const { data: subscription } = useSubscription();

  if (!subscription) {
    return (
      <Badge variant="default" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Free
      </Badge>
    );
  }

  const plan = subscription.plan.toLowerCase();

  if (plan === "pro") {
    return (
      <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 border-indigo-200">
        Pro
      </Badge>
    );
  }

  if (plan === "business") {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-amber-200">
        Business
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      Free
    </Badge>
  );
}
