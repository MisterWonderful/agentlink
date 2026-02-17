"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Moon,
  Sun,
  Monitor,
  Type,
  Volume2,
  Smartphone,
  Wifi,
  RefreshCw,
  User,
  Download,
  Trash2,
  Info,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/layout/app-header";
import { PageContainer } from "@/components/layout/page-container";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ConnectionStatus } from "@/components/layout/offline-indicator";
import { useSettingsStore, useUIStore } from "@/stores";

/**
 * Settings page
 * 
 * Sections:
 * - Appearance (theme, font size)
 * - Account (display name)
 * - Chat Behavior (enter to send, timestamps, auto-scroll)
 * - Notifications & Haptics (sound, vibration)
 * - Data & Sync (offline mode, storage info, clear data)
 * - About (version, licenses)
 */
export default function SettingsPage(): React.JSX.Element {
  const {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    enterToSend,
    toggleEnterToSend,
    showTimestamp,
    toggleShowTimestamp,
    autoScroll,
    toggleAutoScroll,
    soundEnabled,
    toggleSoundEnabled,
    hapticFeedback,
    toggleHapticFeedback,
    offlineMode,
    toggleOfflineMode,
    syncEnabled,
    toggleSyncEnabled,
  } = useSettingsStore();
  
  const { queuedMessageCount } = useUIStore();
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    percentUsed: number;
  } | null>(null);

  const checkStorage = async (): Promise<void> => {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      setStorageInfo({
        usage,
        quota,
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      });
    }
  };

  const handleClearData = async (): Promise<void> => {
    if (confirm("Are you sure you want to clear all local data? This cannot be undone.")) {
      // TODO: Implement data clearing via IndexedDB
      window.location.reload();
    }
  };

  const handleExportData = (): void => {
    // TODO: Implement data export
    alert("Export functionality coming soon!");
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader title="Settings" />

      <PageContainer padBottom>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto w-full space-y-6"
        >
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme */}
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    className="gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    className="gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => setTheme("system")}
                    className="gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <Label>Font Size</Label>
                </div>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>
                Manage your profile settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your name"
                  defaultValue="User"
                />
              </div>
              <Button variant="outline" className="w-full" disabled>
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Chat Behavior */}
          <Card>
            <CardHeader>
              <CardTitle>Chat Behavior</CardTitle>
              <CardDescription>
                Customize how chat interactions work
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                id="enter-to-send"
                label="Enter to Send"
                description="Press Enter to send messages"
                checked={enterToSend}
                onCheckedChange={toggleEnterToSend}
              />

              <Separator />

              <SettingToggle
                id="show-timestamp"
                label="Show Timestamps"
                description="Display message timestamps"
                checked={showTimestamp}
                onCheckedChange={toggleShowTimestamp}
              />

              <Separator />

              <SettingToggle
                id="auto-scroll"
                label="Auto Scroll"
                description="Automatically scroll to new messages"
                checked={autoScroll}
                onCheckedChange={toggleAutoScroll}
              />
            </CardContent>
          </Card>

          {/* Notifications & Haptics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Notifications & Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                id="sound"
                label="Sound Effects"
                description="Play sounds for notifications"
                checked={soundEnabled}
                onCheckedChange={toggleSoundEnabled}
              />

              <Separator />

              <SettingToggle
                id="haptics"
                label="Haptic Feedback"
                description="Vibrate on touch interactions"
                icon={<Smartphone className="h-4 w-4" />}
                checked={hapticFeedback}
                onCheckedChange={toggleHapticFeedback}
              />
            </CardContent>
          </Card>

          {/* Data & Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                Data & Sync
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Connection Status</Label>
                  <ConnectionStatus />
                </div>
              </div>

              <Separator />

              <SettingToggle
                id="offline"
                label="Offline Mode"
                description="Cache messages for offline access"
                checked={offlineMode}
                onCheckedChange={toggleOfflineMode}
              />

              {queuedMessageCount > 0 && (
                <p className="text-sm text-warning">
                  {queuedMessageCount} message{queuedMessageCount !== 1 ? "s" : ""} queued for sync
                </p>
              )}

              <Separator />

              <SettingToggle
                id="sync"
                label="Cloud Sync"
                description="Sync data across devices"
                checked={syncEnabled}
                onCheckedChange={toggleSyncEnabled}
              />

              <Separator />

              {/* Storage Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Local Storage</Label>
                  <Button variant="ghost" size="sm" onClick={checkStorage}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {storageInfo && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Used: {formatBytes(storageInfo.usage)}</p>
                    <p>Available: {formatBytes(storageInfo.quota)}</p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(storageInfo.percentUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Data Actions */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleExportData}
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2 text-error hover:text-error"
                  onClick={handleClearData}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Local Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                About
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">AgentLink v0.1.0</p>
                <p>Mobile-first chat client for self-hosted LLM agents</p>
                <p>Built with Next.js, shadcn/ui, and Vercel AI SDK</p>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                  <ExternalLink className="h-4 w-4" />
                  Documentation
                </Button>
                <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                  <ExternalLink className="h-4 w-4" />
                  GitHub Repository
                </Button>
                <Button variant="outline" size="sm" className="w-full gap-2 justify-start">
                  <ExternalLink className="h-4 w-4" />
                  Licenses
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </PageContainer>
    </div>
  );
}

interface SettingToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
  icon?: React.ReactNode;
}

function SettingToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  icon,
}: SettingToggleProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          {icon}
          <Label htmlFor={id}>{label}</Label>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
