import type { UserRole } from "@/middleware/admin-guard";

/**
 * Admin permission definitions
 * Each permission maps to roles that can perform the action
 */
export const ADMIN_PERMISSIONS = {
    // Dashboard & Overview
    VIEW_DASHBOARD: ["admin", "super_admin"],

    // Orders Management
    VIEW_ORDERS: ["admin", "super_admin"],
    VIEW_ORDER_DETAILS: ["admin", "super_admin"],
    EXPORT_ORDERS: ["super_admin"],
    VERIFY_ORDER_MANUALLY: ["super_admin"],

    // Wallets Management (Read-only for security)
    VIEW_WALLETS: ["admin", "super_admin"],
    VIEW_WALLET_TRANSACTIONS: ["admin", "super_admin"],
    EXPORT_WALLETS: ["super_admin"],
    // Note: No one can add balance manually - security measure

    // User Management
    VIEW_USERS: ["admin", "super_admin"],
    VIEW_USER_DETAILS: ["admin", "super_admin"],
    EDIT_USER_INFO: ["super_admin"],
    CHANGE_USER_ROLE: ["super_admin"],
    SUSPEND_USER: ["super_admin"],
    DELETE_USER: ["super_admin"],

    // System Logs
    VIEW_LOGS: ["admin", "super_admin"],
    VIEW_LOG_DETAILS: ["admin", "super_admin"],
    DELETE_LOGS: ["super_admin"],

    // Pricing Tiers
    VIEW_TIERS: ["admin", "super_admin"],
    MANAGE_TIERS: ["super_admin"],
    CREATE_TIER: ["super_admin"],
    EDIT_TIER: ["super_admin"],
    DELETE_TIER: ["super_admin"],

    // Payment Gateways
    VIEW_GATEWAYS: ["admin", "super_admin"],
    MANAGE_GATEWAYS: ["super_admin"],
    CONFIGURE_GATEWAY: ["super_admin"],
    ACTIVATE_GATEWAY: ["super_admin"],
    TEST_GATEWAY: ["super_admin"],

    // Subscriptions
    VIEW_SUBSCRIPTIONS: ["admin", "super_admin"],
    CANCEL_SUBSCRIPTION: ["super_admin"],
    EXTEND_SUBSCRIPTION: ["super_admin"],

    // Refunds (Critical - super_admin only)
    VIEW_REFUNDS: ["admin", "super_admin"],
    PROCESS_REFUND: ["super_admin"],

    // System Settings
    VIEW_SETTINGS: ["super_admin"],
    MANAGE_SETTINGS: ["super_admin"],

    // Data Export
    EXPORT_ALL_DATA: ["super_admin"],
} as const;

export type Permission = keyof typeof ADMIN_PERMISSIONS;

/**
 * Check if a user role has permission to perform an action
 */
export function can(userRole: UserRole, permission: Permission): boolean {
    const allowedRoles = ADMIN_PERMISSIONS[permission] as readonly string[];
    return allowedRoles.includes(userRole);
}

/**
 * Check multiple permissions (AND logic)
 */
export function canAll(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every((permission) => can(userRole, permission));
}

/**
 * Check multiple permissions (OR logic)
 */
export function canAny(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some((permission) => can(userRole, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(userRole: UserRole): Permission[] {
    return Object.entries(ADMIN_PERMISSIONS)
        .filter(([_, roles]) => (roles as readonly string[]).includes(userRole))
        .map(([permission]) => permission as Permission);
}

/**
 * Permission descriptions for UI
 */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
    VIEW_DASHBOARD: "View admin dashboard and metrics",
    VIEW_ORDERS: "View all payment orders",
    VIEW_ORDER_DETAILS: "View detailed order information",
    EXPORT_ORDERS: "Export orders to CSV",
    VERIFY_ORDER_MANUALLY: "Manually verify failed orders",
    VIEW_WALLETS: "View user wallet balances",
    VIEW_WALLET_TRANSACTIONS: "View wallet transaction history",
    EXPORT_WALLETS: "Export wallet data",
    VIEW_USERS: "View all users",
    VIEW_USER_DETAILS: "View detailed user information",
    EDIT_USER_INFO: "Edit user information",
    CHANGE_USER_ROLE: "Change user roles",
    SUSPEND_USER: "Suspend user accounts",
    DELETE_USER: "Delete user accounts",
    VIEW_LOGS: "View system logs",
    VIEW_LOG_DETAILS: "View detailed log information",
    DELETE_LOGS: "Delete old logs",
    VIEW_TIERS: "View pricing tiers",
    MANAGE_TIERS: "Manage pricing tiers",
    CREATE_TIER: "Create new pricing tier",
    EDIT_TIER: "Edit pricing tier",
    DELETE_TIER: "Delete pricing tier",
    VIEW_GATEWAYS: "View payment gateways",
    MANAGE_GATEWAYS: "Manage payment gateways",
    CONFIGURE_GATEWAY: "Configure gateway settings",
    ACTIVATE_GATEWAY: "Activate/deactivate gateway",
    TEST_GATEWAY: "Test gateway connection",
    VIEW_SUBSCRIPTIONS: "View subscriptions",
    CANCEL_SUBSCRIPTION: "Cancel subscriptions",
    EXTEND_SUBSCRIPTION: "Extend subscription period",
    VIEW_REFUNDS: "View refund requests",
    PROCESS_REFUND: "Process refunds",
    VIEW_SETTINGS: "View system settings",
    MANAGE_SETTINGS: "Manage system settings",
    EXPORT_ALL_DATA: "Export all system data",
};
