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
            <div className="flex flex-col h-full relative">
                <header className="shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-20">
                    <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 sm:p-6 md:p-8">
                    <div className="max-w-3xl mx-auto space-y-6">
                        <Skeleton className="h-48 w-full rounded-2xl" />
                        <Skeleton className="h-64 w-full rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    const user = session?.user;

    return (
        <div className="flex flex-col h-full relative">
            <header className="shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 sticky top-0 z-20">
                <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6">
                    <PageHeader
                        title="Profile"
                        description="Manage your account settings and personal information"
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/50 p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">
                <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
                    {/* Profile Picture */}
                    <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-5">
                            <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                    <Camera className="h-4 w-4" />
                                </div>
                                Profile Picture
                            </CardTitle>
                            <CardDescription className="ml-11 mt-1 text-[13px]">
                                Your profile photo will be visible to team members
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                <Avatar className="h-24 w-24 rounded-2xl border-2 border-white dark:border-zinc-800 shadow-sm">
                                    <AvatarImage src={user?.image || ""} alt={user?.name || ""} className="object-cover" />
                                    <AvatarFallback className="text-2xl bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                                        {user?.name ? getInitials(user.name) : "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-3 flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                        Upload a new photo or remove current one
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <Button variant="outline" className="rounded-xl h-9 shadow-sm" disabled>
                                            Upload Photo
                                        </Button>
                                        <Button variant="ghost" className="rounded-xl h-9 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-500" disabled>
                                            Remove
                                        </Button>
                                    </div>
                                    <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Coming soon: Profile picture upload
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Display Name */}
                    <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-5">
                            <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <User className="h-4 w-4" />
                                </div>
                                Display Name
                            </CardTitle>
                            <CardDescription className="ml-11 mt-1 text-[13px]">
                                This is how others will see you in the workspace
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-2.5 max-w-md">
                                <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
                                <Input
                                    id="name"
                                    value={name || user?.name || ""}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 shadow-sm"
                                />
                            </div>
                            <Button
                                onClick={handleUpdateName}
                                disabled={isUpdatingName || !name.trim() || name === user?.name}
                                className="rounded-xl h-10 px-5 shadow-sm"
                            >
                                {isUpdatingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Name
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Email */}
                    <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-5">
                            <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                    <Mail className="h-4 w-4" />
                                </div>
                                Email Address
                            </CardTitle>
                            <CardDescription className="ml-11 mt-1 text-[13px]">
                                Your email is used for login and notifications
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2.5 max-w-md">
                                <Label className="text-sm font-medium text-foreground">Current Email</Label>
                                <Input
                                    value={user?.email || ""}
                                    disabled
                                    className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-muted-foreground opacity-100"
                                />
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                                Contact support if you need to change your email address.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Change Password */}
                    <Card className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 px-6 py-5">
                            <CardTitle className="flex items-center gap-2.5 text-lg font-medium">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                                    <Lock className="h-4 w-4" />
                                </div>
                                Change Password
                            </CardTitle>
                            <CardDescription className="ml-11 mt-1 text-[13px]">
                                Update your password to keep your account secure
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2.5 max-w-md">
                                <Label htmlFor="current-password" className="text-sm font-medium text-foreground">Current Password</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 shadow-sm"
                                />
                            </div>
                            
                            <Separator className="bg-zinc-200/50 dark:bg-zinc-800/50 my-6" />
                            
                            <div className="grid gap-6 sm:grid-cols-2 max-w-2xl">
                                <div className="space-y-2.5">
                                    <Label htmlFor="new-password" className="text-sm font-medium text-foreground">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2.5">
                                    <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground">Confirm New Password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary/20 shadow-sm"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleChangePassword}
                                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                                className="rounded-xl h-10 px-5 shadow-sm"
                            >
                                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
