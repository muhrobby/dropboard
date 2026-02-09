"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    Filter,
    Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function AdminLogsPage() {
    const { data, isLoading } = useQuery({
        queryKey: ["admin-logs"],
        queryFn: async () => {
            const res = await fetch("/api/v1/admin/logs");
            if (!res.ok) throw new Error("Failed to fetch logs");
            const json = await res.json();
            return json;
        },
        refetchInterval: 10000 // Refresh logs frequently
    });

    return (
        <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
            <PageHeader
                title="System Logs"
                description="Audit trail and system activity logs."
            />

            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search logs..." className="pl-9" />
                </div>
                <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                </Button>
            </div>

            <div className="flex-1 border rounded-md bg-slate-950 font-mono text-sm overflow-hidden relative">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                )}
                <ScrollArea className="h-full p-4">
                    <div className="space-y-2">
                        {data?.data?.map((log: any) => {
                            const type = log.level.toLowerCase();
                            return (
                                <div key={log.id} className="flex gap-4 p-2 hover:bg-slate-900 rounded transition-colors group">
                                    <div className="text-slate-500 w-36 shrink-0 text-xs">
                                        {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                                    </div>
                                    <div className="w-16 shrink-0">
                                        {type === "error" || type === "critical" ? (
                                            <Badge variant="destructive" className="px-1 py-0 text-[10px] uppercase">Error</Badge>
                                        ) : type === "warn" ? (
                                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 px-1 py-0 text-[10px] uppercase border border-yellow-900/30">Warn</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 px-1 py-0 text-[10px] uppercase border border-blue-900/30">Info</Badge>
                                        )}
                                    </div>
                                    <div className="text-slate-400 w-24 shrink-0 text-xs uppercase opacity-70">
                                        {log.category}
                                    </div>
                                    <div className="text-slate-300 break-all">
                                        {log.message}
                                        {log.metadata && (
                                            <span className="ml-2 text-slate-600 text-xs">
                                                {JSON.stringify(log.metadata)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}

                        {data?.data?.length === 0 && (
                            <div className="text-slate-500 text-center py-10">No logs found.</div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
