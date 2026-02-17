"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Database,
  Server,
  Cloud,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores";
import { testConnection } from "@/lib/agents/connection-tester";
import type { AgentType, AgentInput, AgentCapabilities } from "@/types/schemas";
import { toast } from "sonner";

// ============================================
// Types & Constants
// ============================================

type OnboardingStep = 1 | 2 | 3 | 4;

interface AgentTypeOption {
  value: AgentType;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultEndpoint: string;
  defaultAuthHint: string;
}

const AGENT_TYPES: AgentTypeOption[] = [
  {
    value: "openai_compatible",
    label: "OpenClaw / NanoClaw",
    description: "OpenAI-compatible API endpoint",
    icon: <Bot className="h-6 w-6" />,
    defaultEndpoint: "https://your-server.com/v1",
    defaultAuthHint: "Bearer token from your agent dashboard",
  },
  {
    value: "ollama",
    label: "Ollama",
    description: "Local or remote Ollama instance",
    icon: <Database className="h-6 w-6" />,
    defaultEndpoint: "http://localhost:11434",
    defaultAuthHint: "Usually not required for local",
  },
  {
    value: "openai_compatible",
    label: "vLLM / llama.cpp",
    description: "OpenAI-compatible self-hosted server",
    icon: <Server className="h-6 w-6" />,
    defaultEndpoint: "http://localhost:8000/v1",
    defaultAuthHint: "Bearer token (if configured)",
  },
  {
    value: "openai_compatible",
    label: "Commercial",
    description: "OpenAI, Groq, etc.",
    icon: <Cloud className="h-6 w-6" />,
    defaultEndpoint: "https://api.openai.com/v1",
    defaultAuthHint: "API key from provider dashboard",
  },
  {
    value: "anthropic_compatible",
    label: "Anthropic",
    description: "Claude API or compatible proxy",
    icon: <Sparkles className="h-6 w-6" />,
    defaultEndpoint: "https://api.anthropic.com",
    defaultAuthHint: "API key (x-api-key header)",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Any HTTP endpoint with configurable format",
    icon: <Settings className="h-6 w-6" />,
    defaultEndpoint: "https://your-endpoint.com/api",
    defaultAuthHint: "Configure as needed",
  },
];

const AVATAR_OPTIONS = ["🤖", "🧠", "💻", "🔬", "📝", "🎨", "⚡", "🔮", "🌟", "🦾"];

const ACCENT_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#16a34a" },
  { name: "Purple", value: "#9333ea" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
];

interface TestResult {
  success: boolean;
  modelName?: string;
  availableModels?: string[];
  latencyMs: number;
  capabilities: AgentCapabilities;
  error?: string;
  troubleshooting?: string[];
}

// ============================================
// Step 1: Select Type
// ============================================

function Step1SelectType({
  selectedType,
  onSelect,
}: {
  selectedType: AgentType | null;
  onSelect: (type: AgentType, defaultEndpoint: string) => void;
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Select Agent Type</h2>
      <p className="text-sm text-muted-foreground">
        Choose the type of agent you want to connect
      </p>
      
      <div className="grid gap-3">
        {AGENT_TYPES.map((type) => (
          <motion.button
            key={`${type.value}-${type.label}`}
            onClick={() => onSelect(type.value, type.defaultEndpoint)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
              selectedType === type.value && type.label.includes("OpenClaw")
                ? "border-accent bg-accent/5"
                : "border-border hover:border-accent/50"
            )}
            whileTap={{ scale: 0.98 }}
          >
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
              selectedType === type.value && type.label.includes("OpenClaw")
                ? "bg-accent/10 text-accent"
                : "bg-surface text-muted-foreground"
            )}>
              {type.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">{type.label}</h3>
              <p className="text-sm text-muted-foreground truncate">
                {type.description}
              </p>
            </div>
            {selectedType === type.value && type.label.includes("OpenClaw") && (
              <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Step 2: Connection Details
// ============================================

function Step2ConnectionDetails({
  endpointUrl,
  authToken,
  onEndpointChange,
  onAuthTokenChange,
  errors,
}: {
  endpointUrl: string;
  authToken: string;
  onEndpointChange: (url: string) => void;
  onAuthTokenChange: (token: string) => void;
  errors: Record<string, string>;
}): React.ReactElement {
  const isHttp = endpointUrl.startsWith("http://");
  const isLocalhost = endpointUrl.includes("localhost") || endpointUrl.includes("127.0.0.1");
  const showHttpWarning = isHttp && !isLocalhost;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Connection Details</h2>
        <p className="text-sm text-muted-foreground">
          Enter your agent&apos;s endpoint and authentication
        </p>
      </div>

      <div className="space-y-4">
        {/* Endpoint URL */}
        <div className="space-y-2">
          <Label htmlFor="endpoint">
            Endpoint URL <span className="text-error">*</span>
          </Label>
          <Input
            id="endpoint"
            placeholder="https://api.example.com/v1"
            value={endpointUrl}
            onChange={(e) => onEndpointChange(e.target.value)}
            className={cn(errors.endpointUrl && "border-error")}
          />
          {errors.endpointUrl ? (
            <p className="text-sm text-error">{errors.endpointUrl}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              The base URL of your agent&apos;s API endpoint
            </p>
          )}
        </div>

        {/* HTTP Warning */}
        {showHttpWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20"
          >
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">HTTP Connection</p>
              <p className="text-xs text-warning/80">
                This endpoint uses HTTP, not HTTPS. Your data may be visible on the network.
              </p>
            </div>
          </motion.div>
        )}

        {/* Auth Token */}
        <div className="space-y-2">
          <Label htmlFor="authToken">Auth Token</Label>
          <Input
            id="authToken"
            type="password"
            placeholder="Bearer token or API key..."
            value={authToken}
            onChange={(e) => onAuthTokenChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional - only if your agent requires authentication
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Step 3: Test Connection
// ============================================

function Step3TestConnection({
  endpointUrl,
  authToken,
  agentType,
  testResult,
  isTesting,
  onTest,
}: {
  endpointUrl: string;
  authToken: string;
  agentType: AgentType;
  testResult: TestResult | null;
  isTesting: boolean;
  onTest: () => void;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Test Connection</h2>
        <p className="text-sm text-muted-foreground">
          Verify your agent is reachable before saving
        </p>
      </div>

      {/* Test Button */}
      {!testResult && !isTesting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Button 
            size="lg" 
            className="w-full gap-2 h-14 text-base"
            onClick={onTest}
          >
            <Wifi className="h-5 w-5" />
            Test Connection
          </Button>
          
          <div className="mt-4 p-4 rounded-xl bg-surface border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Endpoint:</strong> {endpointUrl}
            </p>
          </div>
        </motion.div>
      )}

      {/* Testing State */}
      {isTesting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12"
        >
          <div className="relative mb-4">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
          </div>
          <p className="text-lg font-medium text-foreground mb-2">Testing connection...</p>
          <div className="w-48 h-1.5 bg-surface rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent"
              initial={{ width: "0%" }}
              animate={{ width: ["0%", "50%", "80%", "100%"] }}
              transition={{ duration: 3, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}

      {/* Success State */}
      {testResult?.success && !isTesting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 text-green-500">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Connection successful!</p>
              <p className="text-sm text-muted-foreground">
                Latency: {testResult.latencyMs}ms
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
            {testResult.modelName && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Model</span>
                <span className="text-sm font-medium">{testResult.modelName}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Capabilities</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {Object.entries(testResult.capabilities).map(([key, value]) => (
                <span
                  key={key}
                  className={cn(
                    "px-2 py-1 rounded-md text-xs font-medium",
                    value 
                      ? "bg-green-500/10 text-green-500" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {key === "fileUpload" ? "Files" : key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
              ))}
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={onTest}
          >
            <RefreshCw className="h-4 w-4" />
            Test Again
          </Button>
        </motion.div>
      )}

      {/* Error State */}
      {testResult && !testResult.success && !isTesting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3 text-error">
            <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Connection failed</p>
              <p className="text-sm text-muted-foreground">
                {testResult.error}
              </p>
            </div>
          </div>

          {testResult.troubleshooting && testResult.troubleshooting.length > 0 && (
            <div className="p-4 rounded-xl bg-error/5 border border-error/20">
              <p className="text-sm font-medium text-foreground mb-2">Troubleshooting:</p>
              <ul className="space-y-1">
                {testResult.troubleshooting.map((tip, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-error mt-1">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={onTest}
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// Step 4: Name & Customize
// ============================================

function Step4Customize({
  name,
  avatar,
  accentColor,
  onNameChange,
  onAvatarChange,
  onColorChange,
  errors,
}: {
  name: string;
  avatar: string;
  accentColor: string;
  onNameChange: (name: string) => void;
  onAvatarChange: (avatar: string) => void;
  onColorChange: (color: string) => void;
  errors: Record<string, string>;
}): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Name & Customize</h2>
        <p className="text-sm text-muted-foreground">
          Personalize your agent&apos;s appearance
        </p>
      </div>

      <div className="space-y-6">
        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Display Name <span className="text-error">*</span>
          </Label>
          <Input
            id="name"
            placeholder="My HomeLab GPT"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={cn(errors.name && "border-error")}
          />
          {errors.name && <p className="text-sm text-error">{errors.name}</p>}
        </div>

        {/* Avatar Selection */}
        <div className="space-y-3">
          <Label>Avatar</Label>
          <div className="flex flex-wrap gap-3">
            {AVATAR_OPTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                onClick={() => onAvatarChange(emoji)}
                className={cn(
                  "h-12 w-12 rounded-xl text-2xl flex items-center justify-center transition-all",
                  avatar === emoji
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
                onClick={() => onColorChange(color.value)}
                className={cn(
                  "h-10 w-10 rounded-full transition-all",
                  accentColor === color.value
                    ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-110"
                    : "hover:scale-105"
                )}
                style={{ backgroundColor: color.value }}
                whileTap={{ scale: 0.9 }}
                title={color.name}
              >
                {accentColor === color.value && (
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
            <div
              className="h-14 w-14 rounded-xl flex items-center justify-center text-2xl"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              {avatar}
            </div>
            <div>
              <p className="font-medium text-foreground">{name || "Unnamed Agent"}</p>
              <div 
                className="h-2 w-2 rounded-full mt-1"
                style={{ backgroundColor: accentColor }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AgentOnboarding(): React.ReactElement {
  const router = useRouter();
  const { addAgent } = useAgentStore();
  
  const [step, setStep] = useState<OnboardingStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form state
  const [agentType, setAgentType] = useState<AgentType>("openai_compatible");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🤖");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  
  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const validateStep = (currentStep: OnboardingStep): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 2) {
      if (!endpointUrl.trim()) {
        newErrors.endpointUrl = "Endpoint URL is required";
      } else {
        try {
          new URL(endpointUrl);
        } catch {
          newErrors.endpointUrl = "Invalid URL format";
        }
      }
    }

    if (currentStep === 4) {
      if (!name.trim()) {
        newErrors.name = "Name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    
    if (step === 3 && !testResult?.success) {
      setErrors({ test: "Please test the connection first" });
      return;
    }
    
    if (step < 4) {
      setStep((prev) => (prev + 1) as OnboardingStep);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as OnboardingStep);
    }
  };

  const handleTypeSelect = (type: AgentType, defaultEndpoint: string) => {
    setAgentType(type);
    setEndpointUrl(defaultEndpoint);
    setStep(2);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await testConnection(endpointUrl, authToken || undefined, agentType);
      setTestResult(result as TestResult);
    } catch (error) {
      setTestResult({
        success: false,
        latencyMs: 0,
        capabilities: {
          vision: false,
          tools: false,
          reasoning: false,
          fileUpload: false,
          codeExecution: false,
        },
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateStep(4)) return;
    
    setIsSubmitting(true);
    
    try {
      const agentData: Omit<AgentInput, "id" | "createdAt" | "updatedAt"> = {
        name,
        avatarUrl: avatar,
        accentColor,
        agentType,
        endpointUrl,
        authToken: authToken || undefined,
        defaultModel: testResult?.modelName,
        systemPrompt: "",
        temperature: 0.7,
        maxTokens: 2048,
        contextLength: 4096,
        topP: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        capabilities: testResult?.capabilities || {
          vision: false,
          tools: false,
          reasoning: false,
          fileUpload: false,
          codeExecution: false,
        },
        customHeaders: {},
        requestTimeoutMs: 30000,
        maxRetries: 3,
        isActive: true,
        sortOrder: 0,
      };
      
      const agent = await addAgent(agentData as AgentInput);
      toast.success(`${agent.name} added successfully!`);
      router.push(`/agents/${agent.id}/chat`);
    } catch (error) {
      toast.error("Failed to save agent");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = ["", "Select Type", "Connection", "Test", "Customize"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3">
          {step > 1 ? (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-10" />
          )}
          
          <div className="text-center">
            <h1 className="font-semibold text-foreground">Add Agent</h1>
            <p className="text-xs text-muted-foreground">
              Step {step} of 4 • {stepTitles[step]}
            </p>
          </div>
          
          <div className="w-10" />
        </div>
        
        {/* Progress bar */}
        <div className="h-0.5 bg-surface">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: "25%" }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && (
              <Step1SelectType
                selectedType={agentType}
                onSelect={handleTypeSelect}
              />
            )}
            
            {step === 2 && (
              <Step2ConnectionDetails
                endpointUrl={endpointUrl}
                authToken={authToken}
                onEndpointChange={setEndpointUrl}
                onAuthTokenChange={setAuthToken}
                errors={errors}
              />
            )}
            
            {step === 3 && (
              <Step3TestConnection
                endpointUrl={endpointUrl}
                authToken={authToken}
                agentType={agentType}
                testResult={testResult}
                isTesting={isTesting}
                onTest={handleTest}
              />
            )}
            
            {step === 4 && (
              <Step4Customize
                name={name}
                avatar={avatar}
                accentColor={accentColor}
                onNameChange={setName}
                onAvatarChange={setAvatar}
                onColorChange={setAccentColor}
                errors={errors}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      {step > 1 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border/50 safe-bottom">
          <div className="max-w-lg mx-auto">
            {step === 4 ? (
              <Button
                size="lg"
                className="w-full h-14 text-base gap-2"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Save Agent
                  </>
                )}
              </Button>
            ) : step !== 3 || testResult?.success ? (
              <Button
                size="lg"
                className="w-full h-14 text-base gap-2"
                onClick={handleNext}
                disabled={step === 3 && isTesting}
              >
                Continue
                <ChevronRight className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
