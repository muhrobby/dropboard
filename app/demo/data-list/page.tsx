"use client";

import { useState } from "react";
import {
  PageHeader,
  DataListLayout,
  DataListToolbar,
  DataListFilters,
  DataListActions,
  DataListContent,
  BulkActionBar,
  EmptyState,
} from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Pin,
  Download,
} from "lucide-react";

const DEMO_DATA = Array.from({ length: 10 }, (_, i) => ({
  id: `item-${i + 1}`,
  name: `Document ${i + 1}.pdf`,
  type: i % 3 === 0 ? "PDF" : i % 3 === 1 ? "Image" : "Note",
  size: `${(Math.random() * 10).toFixed(1)} MB`,
  modified: "2 days ago",
}));

/**
 * Demo: Data List Pattern
 *
 * This demonstrates the Data List layout pattern with:
 * - Search and filters toolbar
 * - Table with sticky header
 * - Row selection and bulk actions
 */
export default function DataListDemoPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    if (selected.length === DEMO_DATA.length) {
      setSelected([]);
    } else {
      setSelected(DEMO_DATA.map((d) => d.id));
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <DataListLayout>
        {/* Page Header */}
        <PageHeader
          title="Files"
          description="Manage your uploaded files and documents."
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </PageHeader>

        {/* Toolbar */}
        <DataListToolbar>
          <DataListFilters>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </DataListFilters>
          <DataListActions selectionCount={selected.length} />
        </DataListToolbar>

        {/* Table */}
        <DataListContent>
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={selected.length === DEMO_DATA.length}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Size</th>
                <th className="px-4 py-3">Modified</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {DEMO_DATA.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selected.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{item.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {item.size}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.modified}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Open</DropdownMenuItem>
                        <DropdownMenuItem>Download</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
            <span>Showing 1-10 of 100 items</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </DataListContent>

        {/* Bulk Action Bar */}
        <BulkActionBar visible={selected.length > 0}>
          <span className="text-sm font-medium">
            {selected.length} item{selected.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Pin className="h-4 w-4 mr-1" />
              Pin
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </BulkActionBar>
      </DataListLayout>
    </div>
  );
}
