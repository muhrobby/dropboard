"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Bell,
  CreditCard,
  Key,
  Users,
} from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { TierBadge } from "@/components/layout/tier-badge";
import Link from "next/link";

export default function V2SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "workspace" | "billing" | "team">("profile");
  const { data: subscription } = useSubscription();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and workspace preferences</p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "profile" | "workspace" | "billing" | "team")}>
        <TabsList className="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 w-full">
          <TabsTrigger value="profile">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="workspace">
            <Bell className="h-4 w-4" />
            <span>Workspace</span>
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4" />
            <span>Team</span>
          </TabsTrigger>
        </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <Input defaultValue="user@example.com" className="w-full" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Name</label>
                <Input defaultValue="John Doe" className="w-full" />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <Input defaultValue="+62 812 3456" className="w-full" />
              </div>
              <div className="flex items-center gap-2">
                <Button className="flex-1">Save Changes</Button>
                <Button variant="outline">Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Workspace Tab */}
      <TabsContent value="workspace">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Workspace Preferences</CardTitle>
              <TierBadge />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Default Workspace</label>
                <select className="w-full rounded-md border px-3 py-2">
                  <option>Personal Workspace</option>
                  <option>Team Workspace Alpha</option>
                  <option>Team Workspace Beta</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Storage Location</label>
                <select className="w-full rounded-md border px-3 py-2">
                  <option>Local Storage</option>
                  <option>Cloud Storage</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Theme</label>
                <select className="w-full rounded-md border px-3 py-2">
                  <option>Light Mode</option>
                  <option>Dark Mode</option>
                  <option>Auto</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button className="flex-1">Save Changes</Button>
              <Button variant="outline">Reset to Default</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Billing Tab */}
      <TabsContent value="billing">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Billing & Subscription</CardTitle>
              <Link href="/v1/settings/billing" className="text-sm text-muted-foreground hover:underline">
                Switch to v1 Billing
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Upgrade Required</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Your current subscription does not support the features you&apos;re trying to access. Please upgrade your plan.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Team Tab */}
      <TabsContent value="team">
        <Card>
          <CardHeader>
            <CardTitle>Team Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-12">
              <Key className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">No Team Settings Yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Team management features are coming soon to v2 dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </div>
  );
}
