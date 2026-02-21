"use client";

import { PageHeader } from "@/components/patterns";
import { WalletBalanceCard } from "@/components/wallet/wallet-balance";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { SubscriptionCard } from "@/components/wallet/subscription-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Wallet, History } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export default function BillingPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [key, setKey] = useState(0); // Force refresh components

    useEffect(() => {
        const paymentStatus = searchParams.get("payment");

        if (paymentStatus === "success") {
            toast.success("Pembayaran berhasil! Saldo Anda telah ditambahkan.", {
                duration: 5000,
                action: {
                    label: "Tutup",
                    onClick: () => {},
                },
            });
            // Force refresh wallet balance
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setKey(prev => prev + 1);
        } else if (paymentStatus === "failed") {
            toast.error("Pembayaran gagal. Silakan coba lagi atau hubungi support.", {
                duration: 5000,
                action: {
                    label: "Tutup",
                    onClick: () => {},
                },
            });
        }

        // Clear URL params after showing message
        if (paymentStatus) {
            router.replace("/dashboard/settings/billing", { scroll: false });
        }
    }, [searchParams, router]);
    return (
        <div className="flex flex-col h-full relative">
            <header className="shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-20">
                <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
                    <PageHeader
                        title="Billing & Wallet"
                        description="Kelola saldo, pembayaran, dan langganan Anda."
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">
                <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 flex flex-col">
                            <WalletBalanceCard refreshKey={key} />
                        </div>
                        <div className="md:col-span-1 flex flex-col">
                            <SubscriptionCard />
                        </div>
                    </div>

                    <div className="mt-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl p-1 shadow-sm overflow-hidden">
                        <Tabs defaultValue="history" className="w-full">
                            <div className="flex items-center justify-between p-3 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40">
                                <TabsList className="bg-zinc-100/80 dark:bg-zinc-800/80 h-10 rounded-xl p-1">
                                    <TabsTrigger value="history" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm text-sm font-medium transition-all">
                                        <History className="w-4 h-4" />
                                        Riwayat Transaksi
                                    </TabsTrigger>
                                    <TabsTrigger value="invoices" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm text-sm font-medium transition-all">
                                        <CreditCard className="w-4 h-4" />
                                        Invoice Langganan
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            <div className="p-4 sm:p-6">
                                <TabsContent value="history" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                                    <TransactionHistory refreshKey={key} />
                                </TabsContent>

                                <TabsContent value="invoices" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
                                    <TransactionHistory refreshKey={key} type="subscription" hideTitle />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}
