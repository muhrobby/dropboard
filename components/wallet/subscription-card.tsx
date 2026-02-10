import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatBytes } from "@/lib/utils";
import { SubscriptionUpgradeModal } from "./subscription-upgrade-modal";

interface SubscriptionValidData {
    plan: string;
    status: string;
    expiresAt: string;
    autoRenewal: boolean;
    features: string[];
    usage: {
        storageUsed: number;
        storageLimit: number;
        storagePercent: number;
    }
    walletBalance?: number;
}

export function SubscriptionCard() {
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const { data: subscriptionData, isLoading, isError, refetch } = useQuery({
        queryKey: ["subscription"],
        queryFn: async () => {
            const res = await fetch("/api/v1/subscription");
            if (!res.ok) throw new Error("Failed to fetch subscription");
            const json = await res.json();
            return json.data as SubscriptionValidData;
        },
    });

    const { data: walletData } = useQuery({
        queryKey: ["wallet-balance"],
        queryFn: async () => {
            const res = await fetch("/api/v1/wallet/balance");
            if (!res.ok) throw new Error("Failed to fetch balance");
            const json = await res.json();
            return json.data as { balance: number };
        },
    });

    if (isLoading) {
        return (
            <Card className="h-full flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </Card>
        );
    }

    if (isError || !subscriptionData) {
        return (
            <Card className="h-full flex items-center justify-center p-8">
                <p className="text-muted-foreground text-sm">Gagal memuat data langganan.</p>
            </Card>
        );
    }

    const { plan, status, features, usage } = subscriptionData;

    // Get wallet balance for the modal
    const walletBalance = walletData?.balance || 0;

    const isFreePlan = plan === "Free";

    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardDescription>Plan Saat Ini</CardDescription>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2 mt-1">
                                {plan} Plan
                                <Badge variant="secondary" className="text-xs font-normal capitalize">{status}</Badge>
                            </CardTitle>
                        </div>
                        {isFreePlan && (
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-full">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                            Fitur yang Anda dapatkan:
                        </div>
                        <ul className="space-y-2">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                    <Check className="w-4 h-4 text-green-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-6 border-t bg-muted/20">
                    <div className="w-full flex items-center justify-between text-sm text-muted-foreground">
                        <span>Storage Usage</span>
                        <span className="font-medium text-foreground">
                            {formatBytes(usage.storageUsed)} / {formatBytes(usage.storageLimit)}
                        </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${Math.min(usage.storagePercent, 100)}%` }}
                        />
                    </div>

                    {isFreePlan && (
                        <Button
                            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => setIsUpgradeModalOpen(true)}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Upgrade ke Pro
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <SubscriptionUpgradeModal
                open={isUpgradeModalOpen}
                onOpenChange={(open) => {
                    setIsUpgradeModalOpen(open);
                    if (!open) {
                        // Refresh subscription data after modal closes
                        refetch();
                    }
                }}
                currentPlan={plan}
                currentWalletBalance={walletBalance}
            />
        </>
    );
}
