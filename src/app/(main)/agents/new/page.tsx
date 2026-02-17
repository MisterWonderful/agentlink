"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppHeader } from "@/components/layout/app-header";
import { PageContainer } from "@/components/layout/page-container";
import { useAgentStore } from "@/stores";
import type { AgentInput, AgentType } from "@/types/schemas";
import { cn } from "@/lib/utils";

const AGENT_TYPES: { value: AgentType; label: string; description: string }[] = [
  {
    value: "openai_compatible",
    label: "OpenAI Compatible",
    description: "OpenAI API format (GPT-4, GPT-3.5, etc.)",
  },
  {
    value: "ollama",
    label: "Ollama",
    description: "Ollama native API",
  },
  {
    value: "anthropic_compatible",
    label: "Anthropic Compatible",
    description: "Claude API format",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Custom protocol or endpoint",
  },
];

/**
 * Add new agent page
 * 
 * Features:
 * - Form for creating a new AI agent connection
 * - Protocol selection (OpenAI, Ollama, Anthropic, Custom)
 * - Validation for required fields
 * - Smooth transitions and loading states
 * - Responsive design for mobile and desktop
 */
export default function NewAgentPage(): React.JSX.Element {
  const router = useRouter();
  const { addAgent } = useAgentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Partial<AgentInput>>({
    name: "",
    systemPrompt: "",
    endpointUrl: "",
    agentType: "openai_compatible",
    authToken: "",
    defaultModel: "",
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.endpointUrl?.trim()) {
      newErrors.endpointUrl = "Endpoint URL is required";
    } else {
      try {
        new URL(formData.endpointUrl);
      } catch {
        newErrors.endpointUrl = "Invalid URL format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await addAgent(formData as AgentInput);
      router.push("/agents");
    } catch (error) {
      console.error("Failed to create agent:", error);
      setErrors({ submit: "Failed to create agent. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader
        title="Add New Agent"
        subtitle="Connect to your self-hosted LLM or API endpoint"
        showBack
        onBack={() => router.back()}
      />

      <PageContainer className="flex-1" padBottom>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-2xl mx-auto w-full"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle>Agent Configuration</CardTitle>
                    <CardDescription>
                      Configure the connection details for your AI agent
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="My Ollama Agent"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={cn(errors.name && "border-error")}
                  />
                  {errors.name && (
                    <p className="text-sm text-error">{errors.name}</p>
                  )}
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="systemPrompt">System Prompt (Optional)</Label>
                  <Textarea
                    id="systemPrompt"
                    placeholder="You are a helpful assistant..."
                    value={formData.systemPrompt}
                    onChange={(e) =>
                      setFormData({ ...formData, systemPrompt: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                {/* Agent Type */}
                <div className="space-y-2">
                  <Label htmlFor="agentType">Protocol</Label>
                  <Select
                    value={formData.agentType}
                    onValueChange={(value: AgentType) =>
                      setFormData({ ...formData, agentType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {type.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Endpoint URL */}
                <div className="space-y-2">
                  <Label htmlFor="endpointUrl">
                    Endpoint URL <span className="text-error">*</span>
                  </Label>
                  <Input
                    id="endpointUrl"
                    type="url"
                    placeholder="https://api.example.com/v1/chat/completions"
                    value={formData.endpointUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, endpointUrl: e.target.value })
                    }
                    className={cn(errors.endpointUrl && "border-error")}
                  />
                  {errors.endpointUrl ? (
                    <p className="text-sm text-error">{errors.endpointUrl}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      The base URL for your agent&apos;s API endpoint
                    </p>
                  )}
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label htmlFor="defaultModel">Default Model (Optional)</Label>
                  <Input
                    id="defaultModel"
                    placeholder="llama2, gpt-4, claude-3-opus..."
                    value={formData.defaultModel}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultModel: e.target.value })
                    }
                  />
                </div>

                {/* Authentication */}
                <div className="space-y-2">
                  <Label htmlFor="authToken">Auth Token (Optional)</Label>
                  <Input
                    id="authToken"
                    type="password"
                    placeholder="Bearer token or API key..."
                    value={formData.authToken}
                    onChange={(e) =>
                      setFormData({ ...formData, authToken: e.target.value })
                    }
                  />
                </div>

                {/* Submit Error */}
                {errors.submit && (
                  <div className="rounded-lg bg-error/10 p-4 text-sm text-error">
                    {errors.submit}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add Agent
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </motion.div>
      </PageContainer>
    </div>
  );
}
