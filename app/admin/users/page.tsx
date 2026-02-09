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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Loader2, Download, UserCog } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean;
    createdAt: string;
    wallet?: {
        balance: number;
    };
    subscription?: {
        tier: {
            displayName: string;
        };
        status: string;
    };
}

export default function AdminUsersPage() {
    const [page, setPage] = useState(1);
    const [role, setRole] = useState("all");
    const [search, setSearch] = useState("");

    const { data, isLoading } = useQuery({
        queryKey: ["admin-users", page, role, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                role,
                search,
            });
            const res = await fetch(`/api/v1/admin/users?${params}`);
            if (!res.ok) throw new Error("Failed to fetch users");
            return res.json();
        },
    });

    return (
        <div className="space-y-6">
            <PageHeader title="User Management" description="Manage users, roles, and permissions.">
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export Users
                </Button>
            </PageHeader>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-lg border">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name or email..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Users Table */}
            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Subscription</TableHead>
                            <TableHead>Wallet Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : data?.data?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.data?.map((user: User) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{user.name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                user.role === "super_admin"
                                                    ? "default"
                                                    : user.role === "admin"
                                                    ? "secondary"
                                                    : "outline"
                                            }
                                            className="capitalize"
                                        >
                                            {user.role === "super_admin" ? "Super Admin" : user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.subscription ? (
                                            <span className="text-sm font-medium">
                                                {user.subscription.tier.displayName}
                                            </span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">No subscription</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm">
                                        {user.wallet ? (
                                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                                Rp {user.wallet.balance.toLocaleString("id-ID")}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">No wallet</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={user.emailVerified ? "default" : "secondary"}
                                            className={
                                                user.emailVerified
                                                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                                                    : ""
                                            }
                                        >
                                            {user.emailVerified ? "Verified" : "Unverified"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            <Eye className="w-4 h-4 mr-2" />
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Showing {data?.data?.length || 0} of {data?.meta?.total || 0} users
                </p>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                    >
                        Previous
                    </Button>
                    <div className="text-sm text-muted-foreground">Page {page}</div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!data?.data || data.data.length < 10 || isLoading}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
}
