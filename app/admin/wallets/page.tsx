"use client";

import { PageHeader } from "@/components/layout/page-header";
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
import { Input } from "@/components/ui/input";
import { Search, Eye, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function AdminWalletsPage() {
    const [search, setSearch] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-wallets", search],
        queryFn: async () => {
            const params = new URLSearchParams({
                limit: "20",
                search
            });
            const res = await fetch(`/api/v1/admin/wallets?${params}`);
            if (!res.ok) throw new Error("Failed to fetch wallets");
            const json = await res.json();
            return json;
        }
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title="Wallet Monitoring"
                description="Monitor user wallet balances. Read-only access."
            />

            <div className="flex items-center gap-4 bg-card p-4 rounded-lg border">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by email or name..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Wallet ID</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : data?.data?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No wallets found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.data?.map((wallet: any) => (
                                <TableRow key={wallet.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{wallet.user?.name || 'Unknown'}</span>
                                            <span className="text-xs text-muted-foreground">{wallet.user?.email || 'No Email'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{wallet.id.slice(0, 12)}...</TableCell>
                                    <TableCell className="font-bold text-indigo-600 dark:text-indigo-400">
                                        Rp {wallet.balance.toLocaleString('id-ID')}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDistanceToNow(new Date(wallet.updatedAt))} ago
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            Active
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            <Eye className="w-4 h-4 mr-2" />
                                            History
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
