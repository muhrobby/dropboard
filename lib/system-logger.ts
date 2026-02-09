import { db } from "@/db";
import { systemLogs } from "@/db/schema";

export type LogLevel = "info" | "warning" | "error" | "critical";
export type LogCategory = "payment" | "subscription" | "auth" | "system" | "wallet";

interface LogParams {
    level: LogLevel;
    category: LogCategory;
    message: string;
    metadata?: Record<string, unknown>;
    userId?: string;
    ipAddress?: string;
}

/**
 * Log a system event to the database
 */
export async function logSystemEvent(params: LogParams): Promise<void> {
    try {
        await db.insert(systemLogs).values({
            level: params.level,
            category: params.category,
            message: params.message,
            metadata: params.metadata,
            userId: params.userId,
            ipAddress: params.ipAddress,
        });

        // Also log to console for development
        const emoji = {
            info: "ℹ️",
            warning: "⚠️",
            error: "❌",
            critical: "🚨",
        };

        console.log(
            `${emoji[params.level]} [${params.category.toUpperCase()}] ${params.message}`,
            params.metadata ? JSON.stringify(params.metadata) : ""
        );
    } catch (error) {
        // Don't throw on logging errors, just console.error
        console.error("Failed to log system event:", error);
    }
}

// Convenience functions
export const logInfo = (category: LogCategory, message: string, metadata?: Record<string, unknown>, userId?: string) =>
    logSystemEvent({ level: "info", category, message, metadata, userId });

export const logWarning = (category: LogCategory, message: string, metadata?: Record<string, unknown>, userId?: string) =>
    logSystemEvent({ level: "warning", category, message, metadata, userId });

export const logError = (category: LogCategory, message: string, metadata?: Record<string, unknown>, userId?: string) =>
    logSystemEvent({ level: "error", category, message, metadata, userId });

export const logCritical = (category: LogCategory, message: string, metadata?: Record<string, unknown>, userId?: string) =>
    logSystemEvent({ level: "critical", category, message, metadata, userId });
