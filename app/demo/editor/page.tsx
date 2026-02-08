"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EditorLayout,
  EditorHeader,
  EditorContent,
  EditorSection,
  EditorFooter,
} from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

/**
 * Demo: Editor/Form Pattern
 *
 * This demonstrates the Editor layout pattern with:
 * - Header with close button
 * - Sectioned form
 * - Sticky footer with actions
 */
export default function EditorDemoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    router.push("/demo/data-list");
  };

  return (
    <EditorLayout>
      {/* Header */}
      <EditorHeader
        title="Create New Item"
        onClose={() => router.push("/demo/data-list")}
      />

      {/* Form Content */}
      <EditorContent>
        {/* Basic Info Section */}
        <EditorSection
          title="Basic Information"
          description="Enter the basic details for this item."
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Enter a title..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter a description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </EditorSection>

        {/* Settings Section */}
        <EditorSection
          title="Settings"
          description="Configure item settings and visibility."
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Make this item public</Label>
              <p className="text-sm text-muted-foreground">
                Anyone with the link can view this item.
              </p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable comments</Label>
              <p className="text-sm text-muted-foreground">
                Allow team members to comment on this item.
              </p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Pin to dashboard</Label>
              <p className="text-sm text-muted-foreground">
                Show this item on your dashboard.
              </p>
            </div>
            <Switch />
          </div>
        </EditorSection>

        {/* Tags Section */}
        <EditorSection
          title="Tags"
          description="Add tags to help organize and find this item."
        >
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" placeholder="Enter tags separated by commas..." />
            <p className="text-xs text-muted-foreground">
              Example: report, 2024, finance
            </p>
          </div>
        </EditorSection>
      </EditorContent>

      {/* Sticky Footer */}
      <EditorFooter>
        <Button
          variant="outline"
          onClick={() => router.push("/demo/data-list")}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </EditorFooter>
    </EditorLayout>
  );
}
