"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wifi,
  User,
  Brain,
  Cpu,
  Settings,
  Trash2,
  Loader2,
  Check,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAgentStore, useConnectionStore } from "@/stores";
import { useHealthMonitor } from "@/hooks/use-health-monitor";
import { testConnection } from "@/lib/agents/connection-tester";
import { AgentAvatar } from "./agent-avatar";
import { AgentStatusBadge } from "./agent-status-badge";
import type { Agent, AgentType, AgentCapabilities } from "@/types/schemas";
import type { ConnectionStatus } from "@/stores/types";
import { toast } from "sonner";

export interface AgentConfigPanelProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_OPTIONS = ["🤖", "🧠", "💻", "🔬", "📝", "🎨", "⚡", "🔮", "🌟", "🦾"];

const ACCENT_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#16a34a" },
  { name: "Purple", value: "#9333ea" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
];

// ============================================
// Connection Tab
// ============================================

function ConnectionTab({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}): React.ReactElement {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const { status, latency, checkNow } = useHealthMonitor({
    agentId: agent.id,
    enabled: true,
  });

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testConnection(
        agent.endpointUrl,
        agent.authToken,
        agent.agentType
      );
      setTestResult({
        success: result.success,
        latencyMs: result.latencyMs,
        error: result.error,
      });
      
      if (result.success) {
        toast.success("Connection test successful");
      } else {
        toast.error("Connection test failed");
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      toast.error("Connection test failed");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="p-4 rounded-xl bg-surface border border-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-foreground">Connection Status</span>
          <AgentStatusBadge status={status as ConnectionStatus} latency={latency} showLatency />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={checkNow}
          disabled={status === "unknown"}
        >
          <RefreshCw className="h-4 w-4" />
          Check Now
        </Button>
      </div>

      {/* Endpoint */}
      <div className="space-y-2">
        <Label htmlFor="endpoint">Endpoint URL</Label>
        <Input
          id="endpoint"
          value={agent.endpointUrl}
          onChange={(e) => onUpdate({ endpointUrl: e.target.value })}
        />
      </div>

      {/* Auth Token */}
      <div className="space-y-2">
        <Label htmlFor="authToken">Auth Token</Label>
        <Input
          id="authToken"
          type="password"
          value={agent.authToken || ""}
          onChange={(e) => onUpdate({ authToken: e.target.value })}
          placeholder="No authentication"
        />
      </div>

      {/* Test Button */}
      <Button
        className="w-full gap-2"
        onClick={handleTest}
        disabled={isTesting}
        variant={testResult?.success ? "outline" : "default"}
      >
        {isTesting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : testResult?.success ? (
          <Check className="h-4 w-4" />
        ) : (
          <Wifi className="h-4 w-4" />
        )}
        {isTesting ? "Testing..." : testResult?.success ? "Tested" : "Test Connection"}
      </Button>

      {testResult && !testResult.success && testResult.error && (
        <div className="p-3 rounded-lg bg-error/10 border border-error/20">
          <p className="text-sm text-error">{testResult.error}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// Identity Tab
// ============================================

function IdentityTab({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Display Name</Label>
        <Input
          id="name"
          value={agent.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
      </div>

      {/* Avatar */}
      <div className="space-y-3">
        <Label>Avatar</Label>
        <div className="flex flex-wrap gap-3">
          {AVATAR_OPTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              onClick={() => onUpdate({ avatarUrl: emoji })}
              className={cn(
                "h-12 w-12 rounded-xl text-2xl flex items-center justify-center transition-all",
                agent.avatarUrl === emoji
                  ? "bg-accent/10 ring-2 ring-accent"
                  : "bg-surface hover:bg-surface-hover"
              )}
              whileTap={{ scale: 0.9 }}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-3">
        <Label>Accent Color</Label>
        <div className="flex flex-wrap gap-3">
          {ACCENT_COLORS.map((color) => (
            <motion.button
              key={color.value}
              onClick={() => onUpdate({ accentColor: color.value })}
              className={cn(
                "h-10 w-10 rounded-full transition-all",
                agent.accentColor === color.value
                  ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
                  : "hover:scale-105"
              )}
              style={{ backgroundColor: color.value }}
              whileTap={{ scale: 0.9 }}
              title={color.name}
            >
              {agent.accentColor === color.value && (
                <Check className="h-5 w-5 text-white mx-auto" />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl bg-surface border border-border">
        <p className="text-xs text-muted-foreground mb-3">Preview</p>
        <div className="flex items-center gap-3">
          <AgentAvatar
            avatar={agent.avatarUrl}
            name={agent.name}
            color={agent.accentColor}
            size="lg"
          />
          <div>
            <p className="font-medium text-foreground">{agent.name}</p>
            <p className="text-sm text-muted-foreground">{agent.agentType}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Behavior Tab
// ============================================

function BehaviorTab({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          value={agent.systemPrompt}
          onChange={(e) => onUpdate({ systemPrompt: e.target.value })}
          rows={4}
          placeholder="You are a helpful assistant..."
        />
        <p className="text-xs text-muted-foreground">
          Instructions that define how the agent behaves
        </p>
      </div>

      {/* Temperature */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Temperature</Label>
          <span className="text-sm font-medium text-foreground">
            {agent.temperature.toFixed(1)}
          </span>
        </div>
        <Slider
          value={[agent.temperature]}
          onValueChange={([v]) => onUpdate({ temperature: v })}
          min={0}
          max={2}
          step={0.1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Precise (0)</span>
          <span>Balanced (1)</span>
          <span>Creative (2)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <Label htmlFor="maxTokens">Max Tokens</Label>
        <Input
          id="maxTokens"
          type="number"
          value={agent.maxTokens}
          onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) || 2048 })}
          min={1}
          max={8192}
        />
      </div>

      {/* Context Length */}
      <div className="space-y-2">
        <Label htmlFor="contextLength">Context Length</Label>
        <Input
          id="contextLength"
          type="number"
          value={agent.contextLength}
          onChange={(e) => onUpdate({ contextLength: parseInt(e.target.value) || 4096 })}
          min={1}
          max={128000}
          step={1024}
        />
      </div>

      {/* Default Model */}
      <div className="space-y-2">
        <Label htmlFor="defaultModel">Default Model</Label>
        <Input
          id="defaultModel"
          value={agent.defaultModel || ""}
          onChange={(e) => onUpdate({ defaultModel: e.target.value })}
          placeholder="Auto-detected from connection"
        />
      </div>
    </div>
  );
}

// ============================================
// Capabilities Tab
// ============================================

function CapabilitiesTab({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}): React.ReactElement {
  const toggleCapability = (key: keyof AgentCapabilities) => {
    onUpdate({
      capabilities: {
        ...agent.capabilities,
        [key]: !agent.capabilities[key],
      },
    });
  };

  const capabilities: { key: keyof AgentCapabilities; label: string; description: string }[] = [
    { key: "vision", label: "Vision", description: "Can analyze images" },
    { key: "tools", label: "Tool Use", description: "Can use external tools and functions" },
    { key: "reasoning", label: "Reasoning", description: "Shows thinking/reasoning steps" },
    { key: "fileUpload", label: "File Upload", description: "Can process uploaded files" },
    { key: "codeExecution", label: "Code Execution", description: "Can execute code snippets" },
  ];

  return (
    <div className="space-y-4">
      {capabilities.map(({ key, label, description }) => (
        <div
          key={key}
          className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border"
        >
          <div>
            <p className="font-medium text-foreground">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Switch
            checked={agent.capabilities[key]}
            onCheckedChange={() => toggleCapability(key)}
          />
        </div>
      ))}
    </div>
  );
}

// ============================================
// Advanced Tab
// ============================================

function AdvancedTab({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Timeout */}
      <div className="space-y-2">
        <Label htmlFor="timeout">Request Timeout (ms)</Label>
        <Input
          id="timeout"
          type="number"
          value={agent.requestTimeoutMs}
          onChange={(e) => onUpdate({ requestTimeoutMs: parseInt(e.target.value) || 30000 })}
          min={1000}
          max={300000}
          step={1000}
        />
      </div>

      {/* Retries */}
      <div className="space-y-2">
        <Label htmlFor="retries">Max Retries</Label>
        <Input
          id="retries"
          type="number"
          value={agent.maxRetries}
          onChange={(e) => onUpdate({ maxRetries: parseInt(e.target.value) || 0 })}
          min={0}
          max={10}
        />
      </div>

      {/* Custom Headers */}
      <div className="space-y-2">
        <Label htmlFor="headers">Custom Headers (JSON)</Label>
        <Textarea
          id="headers"
          value={JSON.stringify(agent.customHeaders, null, 2)}
          onChange={(e) => {
            try {
              const headers = JSON.parse(e.target.value);
              onUpdate({ customHeaders: headers });
            } catch {
              // Ignore invalid JSON during typing
            }
          }}
          rows={4}
          placeholder='{"X-Custom-Header": "value"}'
        />
      </div>
    </div>
  );
}

// ============================================
// Danger Tab
// ============================================

function DangerTab({ agent, onDelete }: { agent: Agent; onDelete: () => void }): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-error/5 border border-error/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-error shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-error mb-1">Delete Agent</h3>
            <p className="text-sm text-muted-foreground">
              This will permanently delete <strong>{agent.name}</strong> and all associated conversations. 
              This action cannot be undone.
            </p>
          </div>
        </div>
      </div>

      <Button
        variant="destructive"
        className="w-full gap-2"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        Delete Agent
      </Button>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AgentConfigPanel({ agentId, isOpen, onClose }: AgentConfigPanelProps): React.ReactElement | null {
  const { agents, updateAgent, removeAgent } = useAgentStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<Agent>>({});

  const agent = agents.get(agentId);

  // Merge pending changes with agent data
  const displayAgent = agent ? { ...agent, ...pendingChanges } : null;

  const handleUpdate = (updates: Partial<Agent>) => {
    setPendingChanges((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!agent || Object.keys(pendingChanges).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await updateAgent(agentId, pendingChanges);
      setPendingChanges({});
      toast.success("Changes saved");
      onClose();
    } catch (error) {
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await removeAgent(agentId);
      toast.success("Agent deleted");
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      toast.error("Failed to delete agent");
    }
  };

  if (!displayAgent) {
    return null;
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-4">
              <AgentAvatar
                avatar={displayAgent.avatarUrl}
                name={displayAgent.name}
                color={displayAgent.accentColor}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <SheetTitle className="truncate">{displayAgent.name}</SheetTitle>
                <p className="text-sm text-muted-foreground truncate">
                  {displayAgent.endpointUrl}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="py-4">
            <Tabs defaultValue="connection" className="w-full">
              <TabsList className="w-full grid grid-cols-5 mb-4">
                <TabsTrigger value="connection" className="px-1">
                  <Wifi className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">Conn</span>
                </TabsTrigger>
                <TabsTrigger value="identity" className="px-1">
                  <User className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">ID</span>
                </TabsTrigger>
                <TabsTrigger value="behavior" className="px-1">
                  <Brain className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">Behav</span>
                </TabsTrigger>
                <TabsTrigger value="capabilities" className="px-1">
                  <Cpu className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">Caps</span>
                </TabsTrigger>
                <TabsTrigger value="advanced" className="px-1">
                  <Settings className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline text-xs">Adv</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="connection" className="mt-0">
                <ConnectionTab agent={displayAgent} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="identity" className="mt-0">
                <IdentityTab agent={displayAgent} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="behavior" className="mt-0">
                <BehaviorTab agent={displayAgent} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="capabilities" className="mt-0">
                <CapabilitiesTab agent={displayAgent} onUpdate={handleUpdate} />
              </TabsContent>

              <TabsContent value="advanced" className="mt-0">
                <AdvancedTab agent={displayAgent} onUpdate={handleUpdate} />
              </TabsContent>
            </Tabs>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-border">
              <DangerTab agent={displayAgent} onDelete={() => setShowDeleteConfirm(true)} />
            </div>
          </div>

          {/* Save Button */}
          {Object.keys(pendingChanges).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-auto sm:w-[calc(100%-3rem)]"
            >
              <Button
                className="w-full gap-2 shadow-lg"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </motion.div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{displayAgent.name}</strong> and all associated conversations. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
