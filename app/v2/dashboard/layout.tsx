import { V2Sidebar } from "./v2-sidebar";
import { V2MobileNav } from "./v2-mobile-nav";
import { V2Topbar } from "./v2-topbar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";

export default function V2DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar - v2 */}
      <V2Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar - v2 */}
        <V2Topbar />

        {/* Main content with bottom padding for mobile nav */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav - v2 */}
        <V2MobileNav />
      </div>

      {/* Mobile Sidebar Overlay - reuse existing */}
      <MobileSidebar />
    </div>
  );
}
