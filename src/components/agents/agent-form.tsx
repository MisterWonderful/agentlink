"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { useAgentStore } from "@/stores";
import type { AgentInput, AgentType } from "@/types/schemas";

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

interface AgentFormProps {
  initialData?: Partial<AgentInput>;
  onSubmit?: (agent: AgentInput) => void;
  submitLabel?: string;
}

export function AgentForm({
  initialData,
  onSubmit,
  submitLabel = "Save Agent",
}: AgentFormProps) {
  const router = useRouter();
  const { addAgent } = useAgentStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<Partial<AgentInput>>({
    name: initialData?.name || "",
    systemPrompt: initialData?.systemPrompt || "",
    endpointUrl: initialData?.endpointUrl || "",
    agentType: initialData?.agentType || "openai_compatible",
    authToken: initialData?.authToken || "",
    defaultModel: initialData?.defaultModel || "",
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
      const agentData = formData as AgentInput;
      
      if (onSubmit) {
        onSubmit(agentData);
      } else {
        await addAgent(agentData);
        router.push("/agents");
      }
    } catch (error) {
      console.error("Failed to save agent:", error);
      setErrors({ submit: "Failed to save agent. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-error">*</span>
        </Label>
        <Input
          id="name"
          placeholder="My Ollama Agent"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={errors.name ? "border-error" : ""}
        />
        {errors.name && <p className="text-sm text-error">{errors.name}</p>}
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
          className={errors.endpointUrl ? "border-error" : ""}
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

      {/* Submit Button */}
      <div className="flex gap-4 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
