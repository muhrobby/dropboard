"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings2, CheckCircle2, XCircle, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Gateway {
    id: string;
    provider: string;
    displayName: string;
    isActive: boolean;
    isPrimary: boolean;
    supportedMethods: string[];
    config: Record<string, string> | null;
}

export default function GatewaysPage() {
    const queryClient = useQueryClient();
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const { data, isLoading } = useQuery<{ success: boolean; data: Gateway[] }>({
        queryKey: ["admin-gateways"],
        queryFn: async () => {
            const res = await fetch("/api/v1/admin/gateways");
            if (!res.ok) throw new Error("Failed to fetch gateways");
            return res.json();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, isActive, isPrimary }: { id: string; isActive?: boolean; isPrimary?: boolean }) => {
            const res = await fetch("/api/v1/admin/gateways", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isActive, isPrimary }),
            });
            if (!res.ok) throw new Error("Failed to update gateway");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-gateways"] });
            toast.success("Gateway updated successfully");
            setUpdatingId(null);
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to update gateway");
            setUpdatingId(null);
        },
    });

    const handleToggleActive = (id: string, currentValue: boolean) => {
        setUpdatingId(id);
        updateMutation.mutate({ id, isActive: !currentValue });
    };

    const handleSetPrimary = (id: string) => {
        setUpdatingId(id);
        updateMutation.mutate({ id, isPrimary: true, isActive: true });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Payment Gateways"
                description="Configure and manage payment gateway integrations."
            />

            <div className="grid gap-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    data?.data.map((gateway) => (
                        <Card key={gateway.id} className="relative overflow-hidden">
                            {gateway.isPrimary && (
                                <div className="absolute top-0 right-0">
                                    <Badge className="rounded-none rounded-bl-lg bg-indigo-600">
                                        <Shield className="w-3 h-3 mr-1" />
                                        Primary Gateway
                                    </Badge>
                                </div>
                            )}

                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2">
                                            {gateway.displayName}
                                            {gateway.isActive ? (
                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-gray-400" />
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            Provider: <code className="text-xs">{gateway.provider}</code>
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {gateway.isActive ? "Active" : "Inactive"}
                                        </span>
                                        <Switch
                                            checked={gateway.isActive}
                                            onCheckedChange={() => handleToggleActive(gateway.id, gateway.isActive)}
                                            disabled={updatingId === gateway.id}
                                        />
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Supported Methods */}
                                <div>
                                    <p className="text-sm font-medium mb-2">Supported Payment Methods:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {gateway.supportedMethods?.map((method) => (
                                            <Badge key={method} variant="outline" className="capitalize">
                                                {method}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Configuration Status */}
                                <div className="pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">Configuration</p>
                                            <p className="text-xs text-muted-foreground">
                                                API keys and credentials are encrypted
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            {!gateway.isPrimary && gateway.isActive && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSetPrimary(gateway.id)}
                                                    disabled={updatingId === gateway.id}
                                                >
                                                    {updatingId === gateway.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        "Set as Primary"
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={!gateway.isActive}
                                            >
                                                <Settings2 className="w-4 h-4 mr-2" />
                                                Configure
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Info Card */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Security Note
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                API keys and sensitive configuration are encrypted at rest. Only super admins can view or modify gateway settings.
                                At least one gateway must be active and set as primary for payment processing to work.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
