import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface Transaction {
    id: string;
    type: "topup" | "subscription" | "refund";
    amount: number;
    formattedAmount: string;
    balanceAfter: number;
    description: string;
    status: "completed" | "pending" | "failed";
    gatewayProvider?: string;
    createdAt: string;
}

interface TransactionsResponse {
    data: Transaction[];
    meta: {
        page: number;
        limit: number;
        hasMore: boolean;
    };
}

interface TransactionHistoryProps {
    refreshKey?: number;
    type?: "topup" | "subscription" | "refund";
    title?: string;
    hideTitle?: boolean;
}

export function TransactionHistory({ refreshKey, type, title, hideTitle }: TransactionHistoryProps) {
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data, isLoading } = useQuery<TransactionsResponse>({
        queryKey: ["wallet-history", page, refreshKey, type],
        queryFn: async () => {
            let url = `/api/v1/wallet/history?page=${page}&limit=${limit}`;
            if (type) {
                url += `&type=${type}`;
            }
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch history");
            const json = await res.json();
            return json;
        },
    });

    const getStatusBadge = (status: Transaction["status"]) => {
        switch (status) {
            case "completed":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400">Berhasil</Badge>;
            case "pending":
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400">Pending</Badge>;
            case "failed":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400">Gagal</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getTypeIcon = (type: Transaction["type"]) => {
        switch (type) {
            case "topup":
            case "refund":
                return <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />;
            case "subscription":
                return <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />;
            default:
                return <RefreshCw className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="space-y-4">
            {!hideTitle && (
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">{title || "Riwayat Transaksi"}</h3>
                </div>
            )}

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead>Metode</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-4 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : data?.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Belum ada transaksi
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.data.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>
                                        <div className={cn(
                                            "p-1.5 rounded-full flex items-center justify-center",
                                            tx.amount > 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                                        )}>
                                            {getTypeIcon(tx.type)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{tx.description}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground capitalize">
                                        {tx.gatewayProvider || "-"}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {format(new Date(tx.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
                                    </TableCell>
                                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                                    <TableCell className={cn(
                                        "text-right font-medium",
                                        tx.amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                    )}>
                                        {tx.formattedAmount}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                >
                    Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                    Page {page}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!data?.meta.hasMore || isLoading}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
