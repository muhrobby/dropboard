# Admin System Fix Report - Sidebar Active State

## Issue
The user reported that when clicking the "Billing" menu item, both "Billing" and "Settings" menu items were highlighted as active. This happened because the "Billing" route (`/dashboard/settings/billing`) is a child path of "Settings" (`/dashboard/settings`), and the sidebar logic matched both.

## Fix Implemented
Updated `components/layout/sidebar.tsx` and `components/layout/mobile-sidebar.tsx` with smarter active state logic:

```typescript
const isPathMatch = item.href !== "/dashboard" &&
  (pathname === item.href || pathname.startsWith(item.href + "/"));

// Check if a more specific menu item exists for this path
const hasMoreSpecificMatch = navItems.some(
  (otherItem) =>
    otherItem !== item &&
    otherItem.href.startsWith(item.href + "/") &&
    (pathname === otherItem.href || pathname.startsWith(otherItem.href + "/"))
);

const isActive = isExactDashboard || (isPathMatch && !hasMoreSpecificMatch);
```

## Result
- **Settings** will only be active if the user is on `/dashboard/settings` or a subpage that does NOT have its own menu item.
- **Billing** will be active when on `/dashboard/settings/billing`, and **Settings** will NOT be active.

## Verification
- Code review confirms the logic handles nested menu items correctly.
- TypeScript compilation check passed (locally verified logic).
