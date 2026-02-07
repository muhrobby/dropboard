export default function DashboardPageV2() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening in your workspace today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
            New Upload
          </button>
        </div>
      </div>

      {/* Metrics Section (Placeholder) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
              Total Storage
            </h3>
          </div>
          <div className="text-2xl font-bold">1.5 TB</div>
          <p className="text-xs text-muted-foreground mt-1">
            +20.1% from last month
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
              Active Members
            </h3>
          </div>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground mt-1">
            2 pending invites
          </p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
              Total Files
            </h3>
          </div>
          <div className="text-2xl font-bold">3,450</div>
          <p className="text-xs text-muted-foreground mt-1">+120 this week</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
              Bandwidth
            </h3>
          </div>
          <div className="text-2xl font-bold">45 GB</div>
          <p className="text-xs text-muted-foreground mt-1">
            +2.5% from yesterday
          </p>
        </div>
      </div>

      {/* Main Content Area (Placeholder) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm p-6 h-[400px] flex items-center justify-center text-muted-foreground bg-muted/5 border-dashed">
          Storage Chart Placeholder
        </div>
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm p-6 h-[400px] flex items-center justify-center text-muted-foreground bg-muted/5 border-dashed">
          Recent Activity Placeholder
        </div>
      </div>
    </div>
  );
}
