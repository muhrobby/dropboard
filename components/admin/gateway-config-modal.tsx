"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Gateway {
    id: string;
    provider: string;
    displayName: string;
    config: Record<string, any> | null;
}

interface GatewayConfigModalProps {
    gateway: Gateway | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GatewayConfigModal({ gateway, open, onOpenChange }: GatewayConfigModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (gateway && open) {
            // Initialize form data from gateway config
            // Use empty strings if config is null
            const initialData = gateway.config || {};

            // Set defaults based on provider if empty
            if (gateway.provider === "doku") {
                setFormData({
                    clientId: initialData.clientId || "",
                    secretKey: initialData.secretKey || "",
                    isProduction: initialData.isProduction === true, // Ensure boolean
                });
            } else if (gateway.provider === "xendit") {
                setFormData({
                    secretKey: initialData.secretKey || "",
                    publicKey: initialData.publicKey || "",
                    callbackToken: initialData.callbackToken || "",
                });
            } else {
                setFormData(initialData);
            }
        }
    }, [gateway, open]);

    const updateMutation = useMutation({
        mutationFn: async (data: Record<string, any>) => {
            if (!gateway) return;
            const res = await fetch("/api/v1/admin/gateways", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: gateway.id,
                    config: data,
                }),
            });
            if (!res.ok) throw new Error("Failed to update gateway configuration");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-gateways"] });
            toast.success("Gateway configuration updated");
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate(formData);
    };

    const handleChange = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const toggleShowSecret = (key: string) => {
        setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (!gateway) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Configure {gateway.displayName}</DialogTitle>
                    <DialogDescription>
                        Update API keys and settings. Sensitive values are masked.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {gateway.provider === "doku" && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="clientId">Client ID</Label>
                                <Input
                                    id="clientId"
                                    value={formData.clientId || ""}
                                    onChange={(e) => handleChange("clientId", e.target.value)}
                                    placeholder="Enter DOKU Client ID"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="secretKey">Secret Key</Label>
                                <div className="relative">
                                    <Input
                                        id="secretKey"
                                        type={showSecrets.secretKey ? "text" : "password"}
                                        value={formData.secretKey || ""}
                                        onChange={(e) => handleChange("secretKey", e.target.value)}
                                        placeholder="Enter DOKU Secret Key"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => toggleShowSecret("secretKey")}
                                    >
                                        {showSecrets.secretKey ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div className="space-y-0.5">
                                    <Label>Production Mode</Label>
                                    <div className="text-[0.8rem] text-muted-foreground">
                                        Enable for live transactions
                                    </div>
                                </div>
                                <Switch
                                    checked={formData.isProduction || false}
                                    onCheckedChange={(checked) => handleChange("isProduction", checked)}
                                />
                            </div>
                        </>
                    )}

                    {gateway.provider === "xendit" && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="secretKey">Secret Key</Label>
                                <div className="relative">
                                    <Input
                                        id="secretKey"
                                        type={showSecrets.secretKey ? "text" : "password"}
                                        value={formData.secretKey || ""}
                                        onChange={(e) => handleChange("secretKey", e.target.value)}
                                        placeholder="Enter Xendit Secret Key"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => toggleShowSecret("secretKey")}
                                    >
                                        {showSecrets.secretKey ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="publicKey">Public Key</Label>
                                <Input
                                    id="publicKey"
                                    value={formData.publicKey || ""}
                                    onChange={(e) => handleChange("publicKey", e.target.value)}
                                    placeholder="Enter Xendit Public Key"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="callbackToken">Callback Token</Label>
                                <div className="relative">
                                    <Input
                                        id="callbackToken"
                                        type={showSecrets.callbackToken ? "text" : "password"}
                                        value={formData.callbackToken || ""}
                                        onChange={(e) => handleChange("callbackToken", e.target.value)}
                                        placeholder="Enter Callback Token"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                        onClick={() => toggleShowSecret("callbackToken")}
                                    >
                                        {showSecrets.callbackToken ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {!["doku", "xendit"].includes(gateway.provider) && (
                        <div className="text-sm text-yellow-600 dark:text-yellow-400">
                            Generic configuration not implemented for {gateway.provider}.
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateMutation.isPending}>
                            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
