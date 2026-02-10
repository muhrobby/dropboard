"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Eye, EyeOff, Plug } from "lucide-react";
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
    const [isTesting, setIsTesting] = useState(false);
    const [hasExistingConfig, setHasExistingConfig] = useState(false);

    useEffect(() => {
        if (gateway && open) {
            // Initialize form data from gateway config
            const initialData = gateway.config || {};

            // Check if there's existing configuration
            const hasConfig = Object.keys(initialData).length > 0;
            setHasExistingConfig(hasConfig);

            // Set defaults based on provider
            if (gateway.provider === "doku") {
                setFormData({
                    clientId: initialData.clientId || "",
                    secretKey: initialData.secretKey || "",
                    isProduction: initialData.isProduction === true,
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

    const handleTestConnection = async () => {
        if (!gateway) return;

        // Validate required fields
        if (gateway.provider === "doku") {
            if (!formData.clientId || !formData.secretKey) {
                toast.error("Please enter Client ID and Secret Key first");
                return;
            }
        } else if (gateway.provider === "xendit") {
            if (!formData.secretKey) {
                toast.error("Please enter Secret Key first");
                return;
            }
        }

        setIsTesting(true);
        try {
            const res = await fetch("/api/v1/admin/gateways/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: gateway.provider,
                    ...formData,
                }),
            });

            const result = await res.json();

            if (result.success) {
                toast.success("✅ Connection successful!", {
                    description: result.data.message,
                });
                console.log("Test result:", result.data);
            } else {
                toast.error("❌ Connection failed", {
                    description: result.error.message,
                });
                console.error("Test error:", result.error);
            }
        } catch (error) {
            toast.error("Test failed", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
        } finally {
            setIsTesting(false);
        }
    };

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
                            {hasExistingConfig && (
                                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-200">
                                    ℹ️ This gateway already has configuration. Values will be updated when you save.
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="clientId">
                                    Client ID
                                    {formData.clientId && (
                                        <span className="ml-2 text-xs text-muted-foreground">(Current: {formData.clientId.substring(0, 8)}...)</span>
                                    )}
                                </Label>
                                <Input
                                    id="clientId"
                                    value={formData.clientId || ""}
                                    onChange={(e) => handleChange("clientId", e.target.value)}
                                    placeholder={hasExistingConfig && !formData.clientId ? "Enter new Client ID to update" : "Enter DOKU Client ID (e.g., BRN-0242-xxxxx)"}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Found in DOKU Dashboard → Credentials → Checkout API
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="secretKey">
                                    Secret Key
                                    {formData.secretKey && (
                                        <span className="ml-2 text-xs text-muted-foreground">(Current: ••••••••••••)</span>
                                    )}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="secretKey"
                                        type={showSecrets.secretKey ? "text" : "password"}
                                        value={formData.secretKey || ""}
                                        onChange={(e) => handleChange("secretKey", e.target.value)}
                                        placeholder={hasExistingConfig && !formData.secretKey ? "Enter new Secret Key to update" : "Enter DOKU Secret Key"}
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
                                <p className="text-xs text-muted-foreground">
                                    Shared Key from DOKU Dashboard → Credentials → Checkout API
                                </p>
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
                            {hasExistingConfig && (
                                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-200">
                                    ℹ️ This gateway already has configuration. Values will be updated when you save.
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="secretKey">
                                    Secret Key
                                    {formData.secretKey && (
                                        <span className="ml-2 text-xs text-muted-foreground">(Current: ••••••••••••)</span>
                                    )}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="secretKey"
                                        type={showSecrets.secretKey ? "text" : "password"}
                                        value={formData.secretKey || ""}
                                        onChange={(e) => handleChange("secretKey", e.target.value)}
                                        placeholder={hasExistingConfig && !formData.secretKey ? "Enter new Secret Key to update" : "Enter Xendit Secret Key"}
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
                                <Label htmlFor="publicKey">
                                    Public Key
                                    {formData.publicKey && (
                                        <span className="ml-2 text-xs text-muted-foreground">(Current: {formData.publicKey.substring(0, 12)}...)</span>
                                    )}
                                </Label>
                                <Input
                                    id="publicKey"
                                    value={formData.publicKey || ""}
                                    onChange={(e) => handleChange("publicKey", e.target.value)}
                                    placeholder="Enter Xendit Public Key"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="callbackToken">
                                    Callback Token
                                    {formData.callbackToken && (
                                        <span className="ml-2 text-xs text-muted-foreground">(Current: ••••••••••••)</span>
                                    )}
                                </Label>
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

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleTestConnection}
                            disabled={isTesting || updateMutation.isPending}
                            className="flex-1"
                        >
                            {isTesting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plug className="mr-2 h-4 w-4" />
                            )}
                            Test Connection
                        </Button>
                        <div className="flex gap-2 flex-1">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                disabled={updateMutation.isPending}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMutation.isPending || isTesting}
                                className="flex-1"
                            >
                                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
