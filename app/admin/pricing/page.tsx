/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatBytes } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type PricingTier = {
    id: string;
    name: string;
    displayName: string;
    priceMonthly: number;
    priceYearly: number;
    maxWorkspaces: number;
    maxTeamWorkspaces: number;
    maxTeamMembers: number;
    storageLimitBytes: number;
    maxFileSizeBytes: number;
    retentionDays: number;
    maxWebhooks: number;
    hasPrioritySupport: boolean;
    hasCustomBranding: boolean;
    hasSso: boolean;
    isActive: boolean;
    sortOrder: number;
};

export default function PricingPage() {
    const queryClient = useQueryClient();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<PricingTier | null>(null);

    const { data: tiers, isLoading } = useQuery<PricingTier[]>({
        queryKey: ["admin-pricing"],
        queryFn: async () => {
            const res = await fetch("/api/v1/admin/pricing");
            if (!res.ok) throw new Error("Failed to fetch pricing tiers");
            const json = await res.json();
            return json.data;
        }
    });

    const createTier = useMutation({
        mutationFn: async (newTier: Partial<PricingTier>) => {
            const res = await fetch("/api/v1/admin/pricing", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTier),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to create");
            return json.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
            toast.success("Pricing tier created");
            setIsAddModalOpen(false);
        },
        onError: (err: any) => toast.error(err.message),
    });

    const updateTier = useMutation({
        mutationFn: async (tier: Partial<PricingTier> & { id: string }) => {
            const res = await fetch(`/api/v1/admin/pricing/${tier.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tier),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to update");
            return json.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
            toast.success("Pricing tier updated");
            setEditingTier(null);
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deleteTier = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/v1/admin/pricing/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to delete");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-pricing"] });
            toast.success("Pricing tier deleted");
        },
        onError: (err: any) => toast.error(err.message),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between">
                <PageHeader
                    title="Pricing Tiers"
                    description="Manage subscription plans, limits, and features."
                />
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Add Tier
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tiers?.map((tier) => (
                    <Card key={tier.id} className={!tier.isActive ? "opacity-60" : ""}>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold">{tier.displayName}</h3>
                                    <p className="text-sm text-muted-foreground font-mono">{tier.name}</p>
                                </div>
                                <div className="flex items-center gap-1 text-sm">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => setEditingTier(tier)}>
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteTier.mutate(tier.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="text-2xl font-bold">
                                    Rp {tier.priceMonthly.toLocaleString('id-ID')}
                                    <span className="text-sm font-normal text-muted-foreground"> / mo</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Rp {tier.priceYearly.toLocaleString('id-ID')} / yr
                                </p>
                            </div>

                            <div className="pt-4 border-t space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Storage Limit:</span>
                                    <span className="font-medium">{formatBytes(tier.storageLimitBytes)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Max File Size:</span>
                                    <span className="font-medium">{formatBytes(tier.maxFileSizeBytes)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Retention:</span>
                                    <span className="font-medium">{tier.retentionDays} Days</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Team Workspaces:</span>
                                    <span className="font-medium">{tier.maxTeamWorkspaces}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {(!tiers || tiers.length === 0) && (
                    <div className="col-span-full py-12 text-center border border-dashed rounded-lg bg-muted/10">
                        <p className="text-muted-foreground">No pricing tiers found. Create one to get started.</p>
                    </div>
                )}
            </div>

            {/* Modal for Add / Edit would go here. For brevity, using placeholder. */}
            <TierModal 
                isOpen={isAddModalOpen || !!editingTier} 
                onClose={() => { setIsAddModalOpen(false); setEditingTier(null); }} 
                tier={editingTier} 
                onSave={(data: any) => editingTier ? updateTier.mutate({ id: editingTier.id, ...data }) : createTier.mutate(data)}
                isPending={createTier.isPending || updateTier.isPending}
            />
        </div>
    );
}

function TierModal({ isOpen, onClose, tier, onSave, isPending }: any) {
    const [formData, setFormData] = useState<Partial<PricingTier>>(tier || {
        name: "", displayName: "", priceMonthly: 0, priceYearly: 0, 
        maxWorkspaces: 1, maxTeamWorkspaces: 0, maxTeamMembers: 0, 
        storageLimitBytes: 2147483648, maxFileSizeBytes: 10485760, 
        retentionDays: 7, maxWebhooks: 0, hasPrioritySupport: false, 
        hasCustomBranding: false, hasSso: false, isActive: true, sortOrder: 0
    });

    // Reset when tier changes
     
    useState(() => setFormData(tier || {
        name: "", displayName: "", priceMonthly: 0, priceYearly: 0, 
        maxWorkspaces: 1, maxTeamWorkspaces: 0, maxTeamMembers: 0, 
        storageLimitBytes: 2147483648, maxFileSizeBytes: 10485760, 
        retentionDays: 7, maxWebhooks: 0, hasPrioritySupport: false, 
        hasCustomBranding: false, hasSso: false, isActive: true, sortOrder: 0
    }));

    const handleChange = (e: any) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === "number" ? Number(value) : value }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{tier ? "Edit Pricing Tier" : "Add Pricing Tier"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Internal Name (e.g. &apos;pro&apos;)</Label>
                        <Input name="name" value={formData.name || ""} onChange={handleChange} disabled={!!tier} />
                    </div>
                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input name="displayName" value={formData.displayName || ""} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Price Monthly (Rp)</Label>
                        <Input name="priceMonthly" type="number" value={formData.priceMonthly || 0} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Price Yearly (Rp)</Label>
                        <Input name="priceYearly" type="number" value={formData.priceYearly || 0} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Storage Limit (Bytes)</Label>
                        <Input name="storageLimitBytes" type="number" value={formData.storageLimitBytes || 0} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                        <Label>Max File Size (Bytes)</Label>
                        <Input name="maxFileSizeBytes" type="number" value={formData.maxFileSizeBytes || 0} onChange={handleChange} />
                    </div>
                    <div className="space-y-2 flex items-center gap-2 mt-6">
                        <Switch checked={formData.isActive || false} onCheckedChange={(c) => setFormData(p => ({...p, isActive: c}))} />
                        <Label>Is Active?</Label>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(formData)} disabled={isPending}>
                        {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Save Tier
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
