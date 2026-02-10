import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Plus, CreditCard, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TopUpModal } from "./topup-modal";

interface WalletBalance {
    balance: number;
    formattedBalance: string;
}

interface WalletBalanceCardProps {
    refreshKey?: number;
}

export function WalletBalanceCard({ refreshKey }: WalletBalanceCardProps) {
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);

    const { data, isLoading } = useQuery<WalletBalance>({
        queryKey: ["wallet-balance", refreshKey],
        queryFn: async () => {
            const res = await fetch("/api/v1/wallet/balance");
            if (!res.ok) throw new Error("Failed to fetch balance");
            const json = await res.json();
            return json.data;
        },
    });

    return (
        <>
            <Card className="overflow-hidden border-indigo-100 dark:border-indigo-900/50 relative">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Wallet className="w-24 h-24 text-indigo-500" />
                </div>

                <CardHeader className="pb-2">
                    <CardDescription>Saldo Dropboard</CardDescription>
                    <CardTitle className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                        {isLoading ? (
                            <Skeleton className="h-9 w-40" />
                        ) : (
                            data?.formattedBalance || "Rp 0"
                        )}
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Gunakan saldo untuk upgrade plan atau perpanjang langganan otomatis.
                    </p>
                </CardContent>

                <CardFooter className="bg-muted/50 py-3 px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CreditCard className="w-3.5 h-3.5" />
                        Payment powered by Xendit & DOKU
                    </div>
                    <Button
                        onClick={() => setIsTopUpOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Isi Saldo
                    </Button>
                </CardFooter>
            </Card>

            <TopUpModal
                open={isTopUpOpen}
                onOpenChange={setIsTopUpOpen}
                currentBalance={data?.balance || 0}
            />
        </>
    );
}
