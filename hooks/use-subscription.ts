import { useQuery } from "@tanstack/react-query";

interface SubscriptionUsage {
  storageUsed: number;
  storageLimit: number;
  storagePercent: number;
}

interface SubscriptionData {
  plan: string;
  status: string;
  expiresAt: string;
  autoRenewal: boolean;
  features: string[];
  usage: SubscriptionUsage;
}

interface SubscriptionResponse {
  data: SubscriptionData;
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/v1/subscription");
      if (!res.ok) {
        throw new Error("Failed to fetch subscription");
      }
      const json = await res.json();
      return json.data as SubscriptionData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
