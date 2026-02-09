"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
    Settings, 
    Shield, 
    Bell, 
    Database, 
    Mail,
    Globe,
    Key,
    AlertTriangle
} from "lucide-react";

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Admin Settings"
                description="Configure system-wide settings and preferences."
            />

            <div className="grid gap-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            General Settings
                        </CardTitle>
                        <CardDescription>
                            Basic application configuration
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="app-name">Application Name</Label>
                                <Input
                                    id="app-name"
                                    defaultValue="Dropboard"
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">
                                    The name displayed throughout the application
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="app-url">Application URL</Label>
                                <Input
                                    id="app-url"
                                    defaultValue={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3004"}
                                    disabled
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Security Settings
                        </CardTitle>
                        <CardDescription>
                            Authentication and security configuration
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Require Email Verification</Label>
                                <p className="text-sm text-muted-foreground">
                                    Users must verify email before accessing the app
                                </p>
                            </div>
                            <Switch defaultChecked disabled />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Two-Factor Authentication</Label>
                                <p className="text-sm text-muted-foreground">
                                    Require 2FA for admin accounts
                                </p>
                            </div>
                            <Badge variant="secondary">Coming Soon</Badge>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Session Duration</Label>
                                <p className="text-sm text-muted-foreground">
                                    How long user sessions remain active
                                </p>
                            </div>
                            <Badge variant="outline">7 days</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Notification Settings
                        </CardTitle>
                        <CardDescription>
                            Configure admin alerts and notifications
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Failed Payment Alerts</Label>
                                <p className="text-sm text-muted-foreground">
                                    Notify admins of payment failures
                                </p>
                            </div>
                            <Badge variant="secondary">Coming Soon</Badge>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Critical Error Alerts</Label>
                                <p className="text-sm text-muted-foreground">
                                    Email notifications for system errors
                                </p>
                            </div>
                            <Badge variant="secondary">Coming Soon</Badge>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>New User Notifications</Label>
                                <p className="text-sm text-muted-foreground">
                                    Alert when new users register
                                </p>
                            </div>
                            <Badge variant="secondary">Coming Soon</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email Configuration
                        </CardTitle>
                        <CardDescription>
                            SMTP and email delivery settings
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>SMTP Status</Label>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="text-sm">Configured</span>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Default From Email</Label>
                                <Badge variant="outline" className="justify-start font-mono text-xs">
                                    {process.env.EMAIL_FROM || "noreply@dropboard.com"}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Database Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            System Information
                        </CardTitle>
                        <CardDescription>
                            Database and system status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label>Database Status</Label>
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="text-sm">Connected</span>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Application Version</Label>
                                <Badge variant="outline">v0.1.0</Badge>
                            </div>
                            <div className="grid gap-2">
                                <Label>Environment</Label>
                                <Badge variant={process.env.NODE_ENV === "production" ? "default" : "secondary"}>
                                    {process.env.NODE_ENV || "development"}
                                </Badge>
                            </div>
                            <div className="grid gap-2">
                                <Label>Node.js Version</Label>
                                <Badge variant="outline" className="font-mono">
                                    {process.version || "v20.x"}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="border-destructive/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Danger Zone
                        </CardTitle>
                        <CardDescription>
                            Irreversible operations - use with caution
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Clear All System Logs</Label>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete all activity logs
                                </p>
                            </div>
                            <Button variant="destructive" size="sm" disabled>
                                Clear Logs
                            </Button>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Export All Data</Label>
                                <p className="text-sm text-muted-foreground">
                                    Export complete database backup
                                </p>
                            </div>
                            <Button variant="outline" size="sm" disabled>
                                Export
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
