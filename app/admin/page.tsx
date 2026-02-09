"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    CreditCard,
    DollarSign,
    HardDrive,
    Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatBytes } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ["admin-stats"],
        queryFn: async () => {
            const res = await fetch("/api/v1/admin/stats");
            if (!res.ok) throw new Error("Failed to fetch stats");
            const json = await res.json();
            return json.data;
        },
        refetchInterval: 30000 // Refresh every 30s
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const { revenue, users, storage, activeSubscriptions, recentOrders } = data || {};

    return (
        <div className="space-y-6">
            <PageHeader
                title="Admin Dashboard"
                description="Overview of system performance and business metrics."
            />

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rp {revenue?.toLocaleString('id-ID') || 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            From paid top-up orders
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users || 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            Registered accounts
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatBytes(storage || 0)}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            Total across all workspaces
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeSubscriptions || 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center mt-1">
                            Paid plans active
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
                            Revenue Chart (Requires daily aggregation job)
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentOrders?.map((order: { 
                                id: string; 
                                description?: string; 
                                user?: { email: string }; 
                                createdAt: string; 
                                amount: number; 
                                status: string;
                            }) => (
                                <div key={order.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-purple-600 truncate max-w-[150px]">
                                                {order.description || 'Top-up'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {order.user?.email || 'Unknown User'} • {formatDistanceToNow(new Date(order.createdAt))} ago
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-sm font-medium text-green-600">
                                        +Rp {order.amount.toLocaleString('id-ID')}
                                    </div>
                                </div>
                            ))}
                            {(!recentOrders || recentOrders.length === 0) && (
                                <div className="text-sm text-center text-muted-foreground py-4">
                                    No recent orders found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
