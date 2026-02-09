import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, ChevronRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface TopUpModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentBalance: number;
}

const QUICK_AMOUNTS = [
    { value: 10000, label: "Rp 10.000" },
    { value: 20000, label: "Rp 20.000" },
    { value: 50000, label: "Rp 50.000" },
    { value: 100000, label: "Rp 100.000" },
    { value: 200000, label: "Rp 200.000" },
    { value: 500000, label: "Rp 500.000" },
];

export function TopUpModal({ open, onOpenChange, currentBalance }: TopUpModalProps) {
    const [step, setStep] = useState<"amount" | "payment">("amount");
    const [amount, setAmount] = useState<number>(50000);
    const [customAmount, setCustomAmount] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const queryClient = useQueryClient();

    // Reset state when modal closes
    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setTimeout(() => {
                setStep("amount");
                setAmount(50000);
                setCustomAmount("");
            }, 300);
        }
        onOpenChange(newOpen);
    };

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, "");
        setCustomAmount(value);
        if (value) {
            setAmount(parseInt(value));
        } else {
            setAmount(0);
        }
    };

    const handleContinue = () => {
        if (amount < 10000) {
            toast.error("Minimal top-up Rp 10.000");
            return;
        }
        if (amount > 10000000) {
            toast.error("Maksimal top-up Rp 10.000.000 per transaksi");
            return;
        }
        setStep("payment");
    };

    const handlePayment = async (method?: string) => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/v1/wallet/topup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, paymentMethod: method }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Gagal membuat order top-up");
            }

            // Redirect to payment page
            if (data.data.paymentUrl) {
                window.location.href = data.data.paymentUrl;
            } else {
                toast.success("Order top-up berhasil dibuat!");
                onOpenChange(false);
                queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
                queryClient.invalidateQueries({ queryKey: ["wallet-history"] });
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Terjadi kesalahan");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px] md:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Isi Saldo Wallet</DialogTitle>
                    <DialogDescription>
                        {step === "amount"
                            ? "Pilih nominal yang ingin ditambahkan ke wallet Anda."
                            : "Pilih metode pembayaran untuk menyelesaikan transaksi."}
                    </DialogDescription>
                </DialogHeader>

                {step === "amount" ? (
                    <div className="py-4 space-y-6">
                        <div className="grid grid-cols-3 gap-3">
                            {QUICK_AMOUNTS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => {
                                        setAmount(opt.value);
                                        setCustomAmount("");
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:bg-muted/50",
                                        amount === opt.value && !customAmount
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500 shadow-sm dark:bg-indigo-950/20 dark:text-indigo-300"
                                            : "border-border bg-card text-card-foreground"
                                    )}
                                >
                                    <span className="font-semibold text-sm">{opt.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Atau masukkan nominal
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="amount">Nominal Custom</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">Rp</span>
                                <Input
                                    id="amount"
                                    placeholder="0"
                                    className="pl-9 text-lg font-medium"
                                    value={customAmount}
                                    onChange={handleCustomAmountChange}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Minimal Rp 10.000. Maksimal Rp 10.000.000.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="bg-muted/50 p-4 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                    Rp {amount.toLocaleString("id-ID")}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep("amount")}>
                                Ubah
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <Label>Pilih Metode Pembayaran</Label>

                            <div className="grid gap-2">
                                <button
                                    onClick={() => handlePayment("QRIS")}
                                    disabled={isLoading}
                                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors w-full text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-md bg-white border flex items-center justify-center p-1">
                                            <span className="font-bold text-xs">QRIS</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">QRIS</p>
                                            <p className="text-xs text-muted-foreground">GoPay, OVO, ShopeePay, DANA</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>

                                <button
                                    onClick={() => handlePayment("VIRTUAL_ACCOUNT")}
                                    disabled={isLoading}
                                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors w-full text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-md bg-white border flex items-center justify-center p-1">
                                            <span className="font-bold text-xs">VA</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Virtual Account</p>
                                            <p className="text-xs text-muted-foreground">BCA, Mandiri, BRI, BNI</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                            Pembayaran aman & terenkripsi
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === "amount" ? (
                        <Button
                            onClick={handleContinue}
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            Lanjut Pembayaran
                        </Button>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
