"use client";

import {
  PageHeader,
  SettingsLayout,
  SettingsGroup,
  SettingsRow,
  SettingsField,
} from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Demo: Settings Pattern
 *
 * This demonstrates the Settings layout pattern with:
 * - Grouped settings in cards
 * - Toggle rows with descriptions
 * - Input fields for editable settings
 * - Danger zone for destructive actions
 */
export default function SettingsDemoPage() {
  return (
    <div className="p-6 lg:p-8">
      <SettingsLayout>
        {/* Page Header */}
        <PageHeader
          title="Settings"
          description="Manage your workspace settings and preferences."
        />

        {/* General Settings */}
        <SettingsGroup
          title="General"
          description="Basic workspace configuration"
        >
          <SettingsField
            label="Workspace Name"
            description="This name will be displayed across the app."
          >
            <Input defaultValue="My Workspace" className="max-w-sm" />
          </SettingsField>

          <SettingsField
            label="Default Language"
            description="Choose the default language for your workspace."
          >
            <Select defaultValue="en">
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="id">Bahasa Indonesia</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>
        </SettingsGroup>

        {/* Notifications */}
        <SettingsGroup
          title="Notifications"
          description="Configure how you receive notifications."
        >
          <SettingsRow
            title="Email Notifications"
            description="Receive email notifications for important events."
          >
            <Switch defaultChecked />
          </SettingsRow>

          <SettingsRow
            title="Push Notifications"
            description="Receive push notifications on your devices."
          >
            <Switch defaultChecked />
          </SettingsRow>

          <SettingsRow
            title="Weekly Digest"
            description="Receive a weekly summary of activity."
          >
            <Switch />
          </SettingsRow>
        </SettingsGroup>

        {/* Privacy */}
        <SettingsGroup
          title="Privacy"
          description="Control your privacy settings."
        >
          <SettingsRow
            title="Profile Visibility"
            description="Allow other workspace members to see your profile."
          >
            <Switch defaultChecked />
          </SettingsRow>

          <SettingsRow
            title="Activity Status"
            description="Show when you're active in the workspace."
          >
            <Switch defaultChecked />
          </SettingsRow>
        </SettingsGroup>

        {/* Danger Zone */}
        <SettingsGroup
          title="Danger Zone"
          description="Irreversible and destructive actions."
          danger
        >
          <SettingsRow
            title="Leave Workspace"
            description="Remove yourself from this workspace. You will lose access to all data."
          >
            <Button
              variant="outline"
              className="text-destructive border-destructive"
            >
              Leave
            </Button>
          </SettingsRow>

          <SettingsRow
            title="Delete Workspace"
            description="Permanently delete this workspace and all its data. This action cannot be undone."
          >
            <Button variant="destructive">Delete Workspace</Button>
          </SettingsRow>
        </SettingsGroup>
      </SettingsLayout>
    </div>
  );
}
