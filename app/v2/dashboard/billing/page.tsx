"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  Bell,
  Settings,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { TierBadge } from "@/components/layout/tier-badge";
import Link from "next/link";

export default function V2BillingPage() {
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [amount, setAmount] = useState("100000");
  const { data: subscription } = useSubscription();

  const plan = subscription?.plan?.toLowerCase() || "free";
  const isFree = plan === "free";
  const isPro = plan === "pro";
  const isBusiness = plan === "business";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your wallet balance and subscription plan
        </p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <TierBadge />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className={`p-6 rounded-lg border-2 transition-all ${
                isFree
                  ? "bg-muted hover:bg-muted/80"
                  : isPro
                    ? "bg-indigo-50 hover:bg-indigo-100"
                    : "bg-amber-50 hover:bg-amber-100"
              }`}
            >
              <h3 className="font-bold text-lg">Free</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1 workspace personal</li>
                <li>2 GB storage</li>
                <li>10 MB/file upload</li>
                <li>7 days retention</li>
              </ul>
            </div>

            <div
              className={`p-6 rounded-lg border-2 transition-all ${
                isPro
                  ? "bg-white hover:bg-gray-50"
                  : "bg-indigo-50 hover:bg-indigo-100"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg">Pro</h3>
                  <p className="text-sm text-muted-foreground">Rp 99.000/month</p>
                </div>
                <Button
                  variant={isPro ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setShowTopupModal(true)}
                >
                  Upgrade Plan
                </Button>
              </div>
            </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1 personal + 2 team workspaces</li>
                <li>10 GB storage</li>
                <li>50 MB/file upload</li>
                <li>30 days retention</li>
                <li>3 webhooks</li>
              </ul>
            </div>

            <div
              className={`p-6 rounded-lg border-2 transition-all ${
                isBusiness
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 to-orange-600"
                  : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-xl text-white">Business</h3>
                  <p className="text-sm text-amber-100">Unlimited everything</p>
                </div>
                <Button
                  variant={isBusiness ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setShowTopupModal(true)}
                >
                  {isBusiness ? "Downgrade Plan" : "Upgrade Plan"}
                </Button>
              </div>
              <ul className="space-y-2 text-sm text-white">
                <li>Unlimited workspaces</li>
                <li>Unlimited team workspaces</li>
                <li>20 members per team</li>
                <li>50 GB storage</li>
                <li>100 MB/file upload</li>
                <li>Unlimited retention</li>
                <li>Unlimited webhooks</li>
              </ul>
            </div>
          </CardContent>
        </Card>

      {/* Wallet Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Wallet Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Wallet className="h-16 w-16 text-muted-foreground" />
            <div className="mt-4">
              <p className="text-2xl font-bold">Rp 0</p>
              <p className="text-sm text-muted-foreground">
                Add balance to start using premium features
              </p>
            </div>
            <Button size="lg" onClick={() => setShowTopupModal(true)}>
              Top Up
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-lg font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Transaction history will appear after your first top-up or subscription
            </p>
          </div>
        </CardContent>
      </Card>

    {/* Top-up Modal */}
    {showTopupModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold mb-4">Top Up Wallet</h2>
          <div className="space-y-4">
            <label className="text-sm font-medium text-muted-foreground">
              Amount (Rp)
            </label>
            <div className="flex gap-4 mt-2">
              <button
                type="button"
                onClick={() => setAmount("100000")}
                className={`flex-1 h-12 rounded-md border-2 transition-colors ${
                  amount === "100000"
                    ? "bg-primary text-white"
                    : "border-primary/20"
                }`}
              >
                100.000
              </button>
              <button
                type="button"
                onClick={() => setAmount("200000")}
                className={`flex-1 h-12 rounded-md border-2 transition-colors ${
                  amount === "200000"
                    ? "bg-primary text-white"
                    : "border-primary/20"
                }`}
              >
                200.000
              </button>
              <button
                type="button"
                onClick={() => setAmount("500000")}
                className={`flex-1 h-12 rounded-md border-2 transition-colors ${
                  amount === "500000"
                    ? "bg-primary text-white"
                    : "border-primary/20"
                }`}
              >
                500.000
              </button>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 h-12 rounded-md border-2 px-3"
                min="10000"
                max="10000000"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowTopupModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowTopupModal(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
}
