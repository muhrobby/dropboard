import {
  DetailLayout,
  DetailBack,
  DetailHeader,
  DetailContent,
  DetailMain,
  DetailSidebar,
  SummaryCard,
  SummaryItem,
  SectionHeader,
} from "@/components/patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Download, Share } from "lucide-react";

/**
 * Demo: Detail Pattern
 *
 * This demonstrates the Detail layout pattern with:
 * - Back navigation
 * - Header with status and actions
 * - Two-column layout (main + sidebar)
 * - Summary cards with key-value pairs
 */
export default function DetailDemoPage() {
  return (
    <div className="p-6 lg:p-8">
      <DetailLayout>
        {/* Back Navigation */}
        <DetailBack href="/demo/data-list" label="Back to Files" />

        {/* Header with Title, Status, Actions */}
        <DetailHeader
          title="Annual Report 2024.pdf"
          status={<Badge variant="secondary">PDF</Badge>}
          meta="Uploaded 2 days ago by John Doe"
          actions={
            <>
              <Button variant="ghost" size="sm">
                <Share className="h-4 w-4 mr-1" />
                Share
              </Button>
              <Button variant="ghost" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          }
        />

        {/* Two Column Content */}
        <DetailContent>
          {/* Main Content */}
          <DetailMain>
            <Card>
              <CardHeader>
                <SectionHeader title="Preview" />
              </CardHeader>
              <CardContent>
                <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Document preview</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Tabs defaultValue="activity">
                  <TabsList>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                    <TabsTrigger value="versions">Versions</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted" />
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">User {i}</span> viewed
                          this file
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {i} hour{i > 1 ? "s" : ""} ago
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </DetailMain>

          {/* Sidebar */}
          <DetailSidebar>
            <SummaryCard title="File Info">
              <SummaryItem label="Type" value="PDF Document" />
              <SummaryItem label="Size" value="2.4 MB" />
              <SummaryItem label="Created" value="Jan 15, 2024" />
              <SummaryItem label="Modified" value="Feb 6, 2024" />
              <SummaryItem label="Owner" value="John Doe" />
            </SummaryCard>

            <SummaryCard title="Tags">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">report</Badge>
                <Badge variant="outline">2024</Badge>
                <Badge variant="outline">finance</Badge>
              </div>
            </SummaryCard>

            <SummaryCard title="Sharing">
              <SummaryItem
                label="Status"
                value={
                  <Badge className="bg-green-100 text-green-700">Public</Badge>
                }
              />
              <SummaryItem label="Views" value="128" />
              <SummaryItem label="Link expires" value="In 7 days" />
            </SummaryCard>
          </DetailSidebar>
        </DetailContent>
      </DetailLayout>
    </div>
  );
}
