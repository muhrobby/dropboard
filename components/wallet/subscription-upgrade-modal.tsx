import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface PricingTier {
    id: string;
    name: string;
    displayName: string;
    priceMonthly: number;
    priceYearly: number;
    maxWorkspaces: number;
    maxTeamWorkspaces: number;
    maxTeamMembers: number;
    storageLimitBytes: number;
    maxFileSizeBytes: number;
    retentionDays: number;
    maxWebhooks: number;
    hasPrioritySupport: boolean;
    hasCustomBranding: boolean;
    hasSso: boolean;
}

interface SubscriptionUpgradeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPlan: string;
    currentWalletBalance: number;
}

const PLAN_FEATURES = {
    free: [
        "1 Personal Workspace",
        "2GB Storage",
        "10MB max file size",
        "7-day retention",
        "Basic support",
    ],
    pro: [
        "10 Personal Workspaces",
        "50GB Storage",
        "100MB max file size",
        "30-day retention",
        "Priority support",
        "Custom branding",
        "API Access",
    ],
    business: [
        "Unlimited Workspaces",
        "500GB Storage",
        "500MB max file size",
        "90-day retention",
        "Dedicated support",
        "SSO",
        "Custom branding",
        "API Access",
        "Team management",
    ],
};

export function SubscriptionUpgradeModal({
    open,
    onOpenChange,
    currentPlan,
    currentWalletBalance,
}: SubscriptionUpgradeModalProps) {
    const [selectedPlan, setSelectedPlan] = useState<"pro" | "business">("pro");
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

    // Fetch pricing tiers
    const { data: pricingTiers, isLoading } = useQuery<PricingTier[]>({
        queryKey: ["pricing-tiers"],
        queryFn: async () => {
            const res = await fetch("/api/v1/pricing");
            if (!res.ok) throw new Error("Failed to fetch pricing");
            const json = await res.json();
            return json.data;
        },
        enabled: open,
    });

    // Get pricing for selected plan
    const selectedTier = pricingTiers?.find((t) => t.name === selectedPlan);
    const price = billingCycle === "monthly" ? selectedTier?.priceMonthly || 0 : selectedTier?.priceYearly || 0;
    const formattedPrice = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(price);

    const hasEnoughBalance = currentWalletBalance >= price;

    // Purchase subscription mutation
    const purchaseMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/v1/subscription/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: selectedPlan,
                    billingCycle,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to purchase subscription");
            }

            return res.json();
        },
        onSuccess: (data) => {
            toast.success("Berlangganan berhasil diaktifkan!", {
                description: `Anda sekarang berada di paket ${selectedTier?.displayName}`,
            });
            onOpenChange(false);
            // Refresh subscription data
            window.location.reload();
        },
        onError: (error: Error) => {
            toast.error("Gagal mengaktifkan langganan", {
                description: error.message,
            });
        },
    });

    const handlePurchase = () => {
        if (!hasEnoughBalance) {
            toast.error("Saldo tidak cukup", {
                description: `Silakan isi saldo terlebih dahulu. Kekurangan: ${new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                }).format(price - currentWalletBalance)}`,
            });
            return;
        }

        purchaseMutation.mutate();
    };

    const isCurrentPlan = selectedPlan === currentPlan;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Upgrade Langganan</DialogTitle>
                    <DialogDescription>
                        Pilih paket yang sesuai dengan kebutuhan Anda
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Plan Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Pro Plan */}
                            <button
                                onClick={() => setSelectedPlan("pro")}
                                className={`relative p-6 rounded-lg border-2 text-left transition-all ${
                                    selectedPlan === "pro"
                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                                        : "border-border hover:border-indigo-300 dark:hover:border-indigo-700"
                                }`}
                            >
                                {selectedPlan === "pro" && (
                                    <div className="absolute -top-3 left-4">
                                        <Badge className="bg-indigo-500">Pilihan</Badge>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold">Pro</h3>
                                    {currentPlan === "pro" && (
                                        <Badge variant="secondary" className="text-xs">Current</Badge>
                                    )}
                                </div>
                                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">
                                    {billingCycle === "monthly"
                                        ? new Intl.NumberFormat("id-ID").format(
                                            pricingTiers?.find((t) => t.name === "pro")?.priceMonthly || 0
                                        )
                                        : new Intl.NumberFormat("id-ID").format(
                                            pricingTiers?.find((t) => t.name === "pro")?.priceYearly || 0
                                        )}
                                    <span className="text-sm text-muted-foreground font-normal">
                                        /{billingCycle === "monthly" ? "bulan" : "tahun"}
                                    </span>
                                </div>
                                <ul className="space-y-2">
                                    {PLAN_FEATURES.pro.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </button>

                            {/* Business Plan */}
                            <button
                                onClick={() => setSelectedPlan("business")}
                                className={`relative p-6 rounded-lg border-2 text-left transition-all ${
                                    selectedPlan === "business"
                                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20"
                                        : "border-border hover:border-indigo-300 dark:hover:border-indigo-700"
                                }`}
                            >
                                {selectedPlan === "business" && (
                                    <div className="absolute -top-3 left-4">
                                        <Badge className="bg-indigo-500">Pilihan</Badge>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold">Business</h3>
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    {currentPlan === "business" && (
                                        <Badge variant="secondary" className="text-xs">Current</Badge>
                                    )}
                                </div>
                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-4">
                                    {billingCycle === "monthly"
                                        ? new Intl.NumberFormat("id-ID").format(
                                            pricingTiers?.find((t) => t.name === "business")?.priceMonthly || 0
                                        )
                                        : new Intl.NumberFormat("id-ID").format(
                                            pricingTiers?.find((t) => t.name === "business")?.priceYearly || 0
                                        )}
                                    <span className="text-sm text-muted-foreground font-normal">
                                        /{billingCycle === "monthly" ? "bulan" : "tahun"}
                                    </span>
                                </div>
                                <ul className="space-y-2">
                                    {PLAN_FEATURES.business.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        </div>

                        {/* Billing Cycle Toggle */}
                        <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                            <span className={`text-sm ${billingCycle === "monthly" ? "font-medium" : "text-muted-foreground"}`}>
                                Bulanan
                            </span>
                            <Switch
                                checked={billingCycle === "yearly"}
                                onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
                            />
                            <span className={`text-sm ${billingCycle === "yearly" ? "font-medium" : "text-muted-foreground"}`}>
                                Tahunan
                                <Badge variant="secondary" className="ml-2 text-xs">Hemat 17%</Badge>
                            </span>
                        </div>

                        {/* Summary */}
                        <div className="border rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Paket</span>
                                <span className="font-medium">{selectedTier?.displayName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Durasi</span>
                                <span className="font-medium">
                                    {billingCycle === "monthly" ? "1 Bulan" : "1 Tahun"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Saldo Anda</span>
                                <span className="font-medium">
                                    {new Intl.NumberFormat("id-ID", {
                                        style: "currency",
                                        currency: "IDR",
                                        minimumFractionDigits: 0,
                                    }).format(currentWalletBalance)}
                                </span>
                            </div>
                            <div className="border-t pt-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Total</span>
                                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {formattedPrice}
                                    </span>
                                </div>
                            </div>
                            {!hasEnoughBalance && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">
                                        ⚠️ Saldo tidak cukup. Kekurangan:{" "}
                                        {new Intl.NumberFormat("id-ID", {
                                            style: "currency",
                                            currency: "IDR",
                                            minimumFractionDigits: 0,
                                        }).format(price - currentWalletBalance)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={purchaseMutation.isPending}>
                        Batal
                    </Button>
                    <Button
                        onClick={handlePurchase}
                        disabled={!hasEnoughBalance || isCurrentPlan || purchaseMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {purchaseMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Memproses...
                            </>
                        ) : isCurrentPlan ? (
                            "Paket Saat Ini"
                        ) : (
                            `Aktifkan ${selectedTier?.displayName}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
