"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Settings, Users, CreditCard, Shield } from "lucide-react";

const sidebarNavItems = [
  {
    title: "General",
    href: "/dashboard-v2/settings",
    icon: Settings,
  },
  {
    title: "Team",
    href: "/dashboard-v2/settings/team",
    icon: Users,
  },
  {
    title: "Security",
    href: "/dashboard-v2/settings/security",
    icon: Shield,
  },
  {
    title: "Billing",
    href: "/dashboard-v2/settings/billing", // Placeholder
    icon: CreditCard,
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {sidebarNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start",
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
