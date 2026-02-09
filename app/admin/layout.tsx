"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
// TODO: Add admin auth check here later

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-dvh overflow-hidden bg-slate-50 dark:bg-slate-950">
            {/* Desktop sidebar */}
            <AdminSidebar />

            {/* Main content area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Topbar placeholder - can be added if needed */}
                <header className="h-16 flex items-center justify-between px-6 border-b bg-white dark:bg-slate-900">
                    <h2 className="font-semibold text-lg">Dropboard Admin</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">Super Admin</span>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            SA
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
