"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { PageHeader } from "@/components/patterns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Lock, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

function getInitials(name: string) {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export default function ProfilePage() {
    const { data: session, isPending } = useSession();
    const [name, setName] = useState("");
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Initialize name from session when loaded
    useState(() => {
        if (session?.user?.name) {
            setName(session.user.name);
        }
    });

    async function handleUpdateName() {
        if (!name.trim()) return;
        setIsUpdatingName(true);
        try {
            const res = await fetch("/api/v1/auth/update-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to update");
            toast.success("Name updated successfully");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update name");
        } finally {
            setIsUpdatingName(false);
        }
    }

    async function handleChangePassword() {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill all password fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("New passwords don't match");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsChangingPassword(true);
        try {
            const res = await fetch("/api/v1/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to change password");
            toast.success("Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to change password");
        } finally {
            setIsChangingPassword(false);
        }
    }

    if (isPending) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full max-w-2xl" />
            </div>
        );
    }

    const user = session?.user;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b bg-background">
                <div className="p-4 md:p-6">
                    <PageHeader
                        title="Profile"
                        description="Manage your account settings"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
                <div className="max-w-2xl space-y-6">
                    {/* Profile Picture */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Camera className="h-5 w-5" />
                                Profile Picture
                            </CardTitle>
                            <CardDescription>
                                Your profile photo will be visible to team members
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} />
                                    <AvatarFallback className="text-xl">
                                        {user?.name ? getInitials(user.name) : "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Upload a new photo or remove current one
                                    </p>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" disabled>
                                            Upload Photo
                                        </Button>
                                        <Button variant="ghost" size="sm" disabled>
                                            Remove
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Coming soon: Profile picture upload
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Display Name */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5" />
                                Display Name
                            </CardTitle>
                            <CardDescription>
                                This is how others will see you
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={name || user?.name || ""}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                />
                            </div>
                            <Button
                                onClick={handleUpdateName}
                                disabled={isUpdatingName || !name.trim() || name === user?.name}
                                size="sm"
                            >
                                {isUpdatingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Name
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Email */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Mail className="h-5 w-5" />
                                Email Address
                            </CardTitle>
                            <CardDescription>
                                Your email is used for login and notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Current Email</Label>
                                <Input
                                    value={user?.email || ""}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Contact support to change your email address
                            </p>
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Lock className="h-5 w-5" />
                                Change Password
                            </CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Current Password</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                />
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm New Password</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                />
                            </div>
                            <Button
                                onClick={handleChangePassword}
                                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                                size="sm"
                            >
                                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Change Password
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
