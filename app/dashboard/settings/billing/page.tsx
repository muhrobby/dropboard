"use client";

import { PageHeader } from "@/components/layout/page-header";
import { WalletBalanceCard } from "@/components/wallet/wallet-balance";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { SubscriptionCard } from "@/components/wallet/subscription-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Wallet, History } from "lucide-react";

export default function BillingPage() {
    return (
        <div className="p-6 lg:p-8 space-y-6">
            <PageHeader
                title="Billing & Wallet"
                description="Kelola saldo, pembayaran, dan langganan Anda."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <WalletBalanceCard />
                </div>
                <div className="md:col-span-1">
                    <SubscriptionCard />
                </div>
            </div>

            <div className="mt-8">
                <Tabs defaultValue="history" className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="history" className="flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Riwayat Transaksi
                            </TabsTrigger>
                            <TabsTrigger value="invoices" className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4" />
                                Invoice Langganan
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="history" className="space-y-4">
                        <TransactionHistory />
                    </TabsContent>

                    <TabsContent value="invoices">
                        <div className="border rounded-lg p-8 text-center text-muted-foreground">
                            Belum ada invoice langganan.
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
