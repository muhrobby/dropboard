"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    CreditCard,
    DollarSign,
    HardDrive,
    Loader2,
    TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatBytes } from "@/lib/utils";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

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

    const { revenue, users, storage, activeSubscriptions, recentOrders, dailyRevenue, dailyUsers } = data || {};

    const formattedDailyRevenue = dailyRevenue?.map((d: { date: string; amount: number }) => ({
        ...d,
        displayDate: format(parseISO(d.date), "MMM dd")
    })) || [];

    const formattedDailyUsers = dailyUsers?.map((d: { date: string; count: number }) => ({
        ...d,
        displayDate: format(parseISO(d.date), "MMM dd")
    })) || [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
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
                <Card className="col-span-4 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-indigo-500" />
                            Revenue (Last 7 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-[300px]">
                        {formattedDailyRevenue.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={formattedDailyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                                    <XAxis 
                                        dataKey="displayDate" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12 }} 
                                        className="text-muted-foreground fill-muted-foreground"
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(value) => `Rp${(value/1000).toFixed(0)}k`}
                                        className="text-muted-foreground fill-muted-foreground"
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)' }}
                                        formatter={(value: number | undefined) => [`Rp ${(value || 0).toLocaleString('id-ID')}`, 'Revenue']}
                                        labelStyle={{ color: 'var(--foreground)', fontWeight: 600, marginBottom: '4px' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="amount" 
                                        stroke="#6366f1" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorRevenue)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-muted/10 rounded-md border border-dashed">
                                No revenue data for the past 7 days
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3 flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
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
