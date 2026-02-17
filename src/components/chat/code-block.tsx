"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

const languageLabels: Record<string, string> = {
  typescript: "TypeScript",
  ts: "TypeScript",
  javascript: "JavaScript",
  js: "JavaScript",
  python: "Python",
  py: "Python",
  rust: "Rust",
  rs: "Rust",
  go: "Go",
  golang: "Go",
  java: "Java",
  kotlin: "Kotlin",
  swift: "Swift",
  csharp: "C#",
  cs: "C#",
  cpp: "C++",
  c: "C",
  php: "PHP",
  ruby: "Ruby",
  rb: "Ruby",
  shell: "Shell",
  bash: "Bash",
  sh: "Shell",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sass: "Sass",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  xml: "XML",
  markdown: "Markdown",
  md: "Markdown",
  dockerfile: "Dockerfile",
  docker: "Dockerfile",
  terraform: "Terraform",
  tf: "Terraform",
  graphql: "GraphQL",
  gql: "GraphQL",
  regex: "Regex",
  vim: "Vim",
  lua: "Lua",
  r: "R",
  matlab: "MATLAB",
  scala: "Scala",
  dart: "Dart",
  elixir: "Elixir",
  erlang: "Erlang",
  haskell: "Haskell",
  hs: "Haskell",
  clojure: "Clojure",
  lisp: "Lisp",
  perl: "Perl",
  pl: "Perl",
  julia: "Julia",
  groovy: "Groovy",
  solidity: "Solidity",
  sol: "Solidity",
  move: "Move",
  cairo: "Cairo",
  prisma: "Prisma",
  zsh: "Zsh",
  powershell: "PowerShell",
  ps1: "PowerShell",
};

export function CodeBlock({
  code,
  language = "text",
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const detectLanguage = useCallback((lang: string): string => {
    const normalized = lang.toLowerCase().trim();
    return languageLabels[normalized] ? normalized : "text";
  }, []);

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      setIsLoading(true);
      try {
        const detectedLang = detectLanguage(language);
        const html = await codeToHtml(code, {
          lang: detectedLang === "text" ? "text" : detectedLang,
          theme: "github-dark",
        });
        if (!cancelled) {
          setHighlightedCode(html);
        }
      } catch {
        // Fallback to plain text
        if (!cancelled) {
          const escaped = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
          setHighlightedCode(`<pre><code>${escaped}</code></pre>`);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void highlight();
    return () => {
      cancelled = true;
    };
  }, [code, language, detectLanguage]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  const displayLanguage = languageLabels[language.toLowerCase()] ||
    language.charAt(0).toUpperCase() + language.slice(1) ||
    "Text";

  const lines = code.split("\n");
  const lineNumbers = showLineNumbers
    ? Array.from({ length: lines.length }, (_, i) => i + 1)
    : [];

  return (
    <div
      className={cn(
        "relative group rounded-xl overflow-hidden bg-[#0d1117] border border-border/50",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-border/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {displayLanguage}
          </span>
        </div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {isCopied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1 text-success" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copy
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Code Content */}
      <div className="relative overflow-x-auto">
        {showLineNumbers && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#0d1117] border-r border-border/20 select-none">
            <div className="py-4 text-right pr-3">
              {lineNumbers.map((num) => (
                <div
                  key={num}
                  className="text-xs text-muted-foreground/50 leading-6"
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}
        <div
          className={cn(
            "py-4 text-sm leading-6 font-mono",
            showLineNumbers ? "pl-14" : "px-4"
          )}
        >
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              {lines.slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-muted/20 rounded w-full"
                  style={{ width: `${60 + Math.random() * 40}%` }}
                />
              ))}
            </div>
          ) : (
            <div
              className="shiki-code"
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
