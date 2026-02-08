import {
  PageHeader,
  MetricCard,
  OverviewLayout,
  OverviewMetrics,
  OverviewContent,
  OverviewMain,
  OverviewSide,
  SectionHeader,
} from "@/components/patterns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  HardDrive,
  Activity,
} from "lucide-react";

/**
 * Demo: Overview Pattern
 *
 * This demonstrates the Overview layout pattern with:
 * - Page header with primary CTA
 * - Metric cards grid
 * - Two-column content (chart + activity)
 */
export default function OverviewDemoPage() {
  return (
    <div className="p-6 lg:p-8">
      <OverviewLayout>
        {/* Page Header with Primary CTA */}
        <PageHeader
          title="Dashboard"
          description="Welcome back. Here's what's happening today."
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Drop
          </Button>
        </PageHeader>

        {/* Metrics Grid */}
        <OverviewMetrics>
          <MetricCard
            label="Total Items"
            value="1,284"
            change="+12.5%"
            trend="up"
            icon={<FileText className="h-4 w-4" />}
          />
          <MetricCard
            label="Storage Used"
            value="4.2 GB"
            change="+2.1%"
            trend="up"
            icon={<HardDrive className="h-4 w-4" />}
          />
          <MetricCard
            label="Team Members"
            value="12"
            change="+2"
            trend="up"
            icon={<Users className="h-4 w-4" />}
          />
          <MetricCard
            label="Active Shares"
            value="28"
            change="-3"
            trend="down"
            icon={<Activity className="h-4 w-4" />}
          />
        </OverviewMetrics>

        {/* Two Column Content */}
        <OverviewContent>
          {/* Main Column - Charts */}
          <OverviewMain>
            <Card>
              <CardHeader>
                <SectionHeader
                  title="Activity"
                  description="Items added over the last 7 days"
                />
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Chart placeholder</p>
                </div>
              </CardContent>
            </Card>
          </OverviewMain>

          {/* Side Column - Activity Feed */}
          <OverviewSide>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        Activity item {i}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        2 hours ago
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </OverviewSide>
        </OverviewContent>
      </OverviewLayout>
    </div>
  );
}
