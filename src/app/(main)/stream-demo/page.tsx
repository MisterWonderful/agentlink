/**
 * Stream Animation Demo Page
 * 
 * Interactive demo showcasing the stream animation engine features.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { TokenizedMessage } from '@/components/stream/tokenized-message';
import { AnimatedCodeBlock } from '@/components/stream/animated-code-block';
import { StreamControls } from '@/components/stream/stream-controls';
import { useStreamAnimation } from '@/hooks/use-stream-animation';
import { cn } from '@/lib/utils';
import type { StreamSpeed } from '@/lib/stream/stream-renderer';

// Demo content
const DEMO_TEXT = `# Welcome to AgentLink

This is a **demonstration** of the stream animation engine. 

The engine features:
- Smooth token-by-token rendering
- Adaptive speed based on content type
- Pause on hover functionality
- Real-time velocity tracking

Watch how different content types render at different speeds!`;

const DEMO_CODE = `import { useState } from 'react';

function AgentLinkChat() {
  const [messages, setMessages] = useState([]);
  
  const sendMessage = async (content) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    
    const data = await response.json();
    setMessages(prev => [...prev, data]);
  };
  
  return <ChatInterface onSend={sendMessage} />;
}`;

const DEMO_TABLE = `| Feature | Status | Priority |
|---------|--------|----------|
| Token Streaming | ✅ Complete | High |
| Code Animation | ✅ Complete | High |
| Velocity Display | ✅ Complete | Medium |
| Pause on Hover | ✅ Complete | Medium |`;

export default function StreamDemoPage() {
  const [activeDemo, setActiveDemo] = useState<'text' | 'code' | 'table'>('text');
  const [isStreaming, setIsStreaming] = useState(false);
  const [speed, setSpeed] = useState<StreamSpeed>('normal');
  const [enableCursor, setEnableCursor] = useState(true);
  const [pauseOnHover, setPauseOnHover] = useState(true);
  const [customSpeed, setCustomSpeed] = useState(16);
  const [useCustomSpeed, setUseCustomSpeed] = useState(false);

  const currentContent = {
    text: DEMO_TEXT,
    code: DEMO_CODE,
    table: DEMO_TABLE,
  }[activeDemo];

  const handleStart = useCallback(() => {
    setIsStreaming(true);
  }, []);

  const handleStop = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const handleComplete = useCallback(() => {
    // Could trigger next demo or show completion
  }, []);

  const getSpeedLabel = (s: StreamSpeed) => {
    switch (s) {
      case 'slow': return '0.5x (~20 tok/s)';
      case 'normal': return '1x (~60 tok/s)';
      case 'fast': return '2x (~120 tok/s)';
      case 'instant': return 'Instant';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Stream Animation Engine</h1>
        <p className="text-muted-foreground">
          High-performance token streaming for the OpenClaw terminal experience
        </p>
      </div>

      <div className="grid gap-6">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Playback Controls</CardTitle>
            <CardDescription>
              Configure streaming behavior and speed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                onClick={handleStart}
                disabled={isStreaming}
                className="min-w-[100px]"
              >
                {isStreaming ? 'Streaming...' : 'Start Stream'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleStop}
                disabled={!isStreaming}
              >
                Reset
              </Button>

              <div className="h-8 w-px bg-border mx-2" />

              <StreamControls
                isStreaming={isStreaming}
                canPause={isStreaming}
                canSkip={isStreaming}
                speed={speed}
                onPause={() => {}}
                onResume={() => {}}
                onSkip={handleStop}
                onSpeedChange={setSpeed}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Speed Preset</Label>
                  <span className="text-xs text-muted-foreground">
                    {getSpeedLabel(speed)}
                  </span>
                </div>
                <div className="flex gap-2">
                  {(['slow', 'normal', 'fast', 'instant'] as StreamSpeed[]).map((s) => (
                    <Button
                      key={s}
                      variant={speed === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSpeed(s)}
                      className="flex-1 capitalize"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="custom-speed">Custom Delay (ms)</Label>
                  <Switch
                    id="custom-speed-toggle"
                    checked={useCustomSpeed}
                    onCheckedChange={setUseCustomSpeed}
                  />
                </div>
                <div className={cn('flex items-center gap-4', !useCustomSpeed && 'opacity-50')}>
                  <Slider
                    id="custom-speed"
                    value={[customSpeed]}
                    onValueChange={([v]) => setCustomSpeed(v)}
                    min={1}
                    max={100}
                    step={1}
                    disabled={!useCustomSpeed}
                    className="flex-1"
                  />
                  <span className="text-sm tabular-nums w-12">{customSpeed}ms</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="cursor"
                  checked={enableCursor}
                  onCheckedChange={setEnableCursor}
                />
                <Label htmlFor="cursor">Show Cursor</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="pause-hover"
                  checked={pauseOnHover}
                  onCheckedChange={setPauseOnHover}
                />
                <Label htmlFor="pause-hover">Pause on Hover</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Content */}
        <Card>
          <CardHeader>
            <CardTitle>Live Demo</CardTitle>
            <CardDescription>
              Select content type and watch it stream
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeDemo} onValueChange={(v) => {
              setActiveDemo(v as typeof activeDemo);
              setIsStreaming(false);
            }}>
              <TabsList className="mb-4">
                <TabsTrigger value="text">Markdown Text</TabsTrigger>
                <TabsTrigger value="code">Code Block</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-0">
                <TokenizedMessage
                  content={DEMO_TEXT}
                  isStreaming={isStreaming}
                  streamSpeed={speed}
                  onComplete={handleComplete}
                  enableCursor={enableCursor}
                  pauseOnHover={pauseOnHover}
                  showVelocity
                  showControls
                />
              </TabsContent>

              <TabsContent value="code" className="mt-0">
                <AnimatedCodeBlock
                  code={DEMO_CODE}
                  language="typescript"
                  isStreaming={isStreaming}
                  animateLines
                  showLineNumbers
                />
              </TabsContent>

              <TabsContent value="table" className="mt-0">
                <TokenizedMessage
                  content={DEMO_TABLE}
                  isStreaming={isStreaming}
                  streamSpeed="instant"
                  onComplete={handleComplete}
                  enableCursor={enableCursor}
                  pauseOnHover={pauseOnHover}
                  showVelocity
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Hook Demo */}
        <HookDemo />

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureItem
                title="requestAnimationFrame Based"
                description="60fps animations without React re-renders per token"
              />
              <FeatureItem
                title="Adaptive Speed"
                description="Code renders instantly, prose smoothly, tables fast"
              />
              <FeatureItem
                title="Pause/Resume"
                description="Hover to pause, click to resume playback"
              />
              <FeatureItem
                title="Token Metrics"
                description="Real-time tokens/second display"
              />
              <FeatureItem
                title="Smooth Cursor"
                description="Terminal-style cursor follows stream position"
              />
              <FeatureItem
                title="Accessibility"
                description="Reduced motion support, keyboard controls"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HookDemo() {
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(false);

  const {
    displayedContent,
    isComplete,
    progress,
    tokensPerSecond,
    isPaused,
    isStreaming,
    pause,
    resume,
    skip,
    containerRef,
  } = useStreamAnimation({
    content,
    isActive,
    speed: 'normal',
    onComplete: () => console.log('Stream complete!'),
  });

  const startDemo = () => {
    setContent('This demonstrates the useStreamAnimation hook with full control over the streaming process.');
    setIsActive(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>useStreamAnimation Hook</CardTitle>
        <CardDescription>
          Programmatic control with real-time metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={startDemo} disabled={isActive} size="sm">
            Start Hook Demo
          </Button>
          <Button variant="outline" onClick={isPaused ? resume : pause} disabled={!isActive} size="sm">
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" onClick={skip} disabled={!isActive || isComplete} size="sm">
            Skip
          </Button>
        </div>

        <div
          ref={containerRef}
          className="min-h-[60px] p-4 rounded-lg bg-muted font-mono text-sm"
        >
          {displayedContent || 'Click Start to begin...'}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Status: {isComplete ? 'Complete' : isStreaming ? 'Streaming' : 'Idle'}</span>
          <span>Progress: {progress}%</span>
          <span>Speed: {tokensPerSecond} tok/s</span>
          <span>Paused: {isPaused ? 'Yes' : 'No'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
