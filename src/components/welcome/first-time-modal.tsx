'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  MessageSquare, 
  Bot, 
  Settings, 
  X, 
  ChevronRight,
  ChevronLeft,
  Play,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { seedDemoData } from '@/lib/demo-data';
import { useRouter } from 'next/navigation';

interface FirstTimeModalProps {
  onClose?: () => void;
}

/**
 * Welcome slides configuration
 */
const WELCOME_SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to AgentLink',
    description: 'Your mobile-first chat client for AI agents. Connect to Ollama, OpenAI, and more.',
    icon: Sparkles,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
  },
  {
    id: 'chat',
    title: 'Chat with AI Agents',
    description: 'Have natural conversations with your LLM agents. Support for streaming, markdown, code highlighting, and more.',
    icon: MessageSquare,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  {
    id: 'agents',
    title: 'Connect Multiple Agents',
    description: 'Add multiple agents from different providers. Switch between them seamlessly.',
    icon: Bot,
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description: 'Adjust themes, fonts, and conversation settings to match your preferences.',
    icon: Settings,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
];

/**
 * First Time Modal
 * 
 * A welcome modal shown to first-time users to introduce them to AgentLink.
 * Includes a quick start guide and option to load demo data.
 */
export function FirstTimeModal({ onClose }: FirstTimeModalProps): React.ReactElement | null {
  const router = useRouter();
  const [hasSeenWelcome, setHasSeenWelcome] = useLocalStorage('agentlink-welcome-seen', false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Show modal on first visit
  useEffect(() => {
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, [hasSeenWelcome]);

  const handleClose = () => {
    setIsOpen(false);
    setHasSeenWelcome(true);
    onClose?.();
  };

  const handleNext = () => {
    if (currentSlide < WELCOME_SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    try {
      await seedDemoData();
      handleClose();
      // Navigate to the demo agent's chat
      router.push('/agents/demo-agent-001/chat/demo-conversation-001');
    } catch (error) {
      console.error('Failed to load demo:', error);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleAddAgent = () => {
    handleClose();
    router.push('/agents/new');
  };

  const currentSlideData = WELCOME_SLIDES[currentSlide];
  const Icon = currentSlideData.icon;
  const isLastSlide = currentSlide === WELCOME_SLIDES.length - 1;

  if (hasSeenWelcome && !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* Progress Bar */}
        <div className="flex h-1">
          {WELCOME_SLIDES.map((_, index) => (
            <div
              key={index}
              className={`flex-1 transition-colors duration-300 ${
                index <= currentSlide ? 'bg-accent' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors z-10"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Slide Content */}
        <div className="p-6 pt-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              {/* Icon */}
              <div className={`mx-auto h-16 w-16 rounded-2xl ${currentSlideData.bgColor} flex items-center justify-center mb-4`}>
                <Icon className={`h-8 w-8 ${currentSlideData.color}`} />
              </div>

              {/* Title */}
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {currentSlideData.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-2">
                  {currentSlideData.description}
                </DialogDescription>
              </DialogHeader>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="p-6 pt-0">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {/* Slide Indicators */}
            <div className="flex gap-1.5">
              {WELCOME_SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'w-4 bg-accent' 
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>

            {isLastSlide ? (
              <Button size="sm" onClick={handleClose}>
                Get Started
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Quick Start Options (shown on last slide) */}
          <AnimatePresence>
            {isLastSlide && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t pt-4 space-y-3"
              >
                <p className="text-xs text-muted-foreground text-center">
                  Quick start options
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleLoadDemo}
                    disabled={isLoadingDemo}
                  >
                    <Play className="h-4 w-4" />
                    {isLoadingDemo ? 'Loading...' : 'Try Demo'}
                  </Button>
                  <Button
                    className="gap-2"
                    onClick={handleAddAgent}
                  >
                    <Plus className="h-4 w-4" />
                    Add Agent
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to check if user is first-time
 */
export function useIsFirstTimeUser(): boolean {
  const [hasSeenWelcome] = useLocalStorage('agentlink-welcome-seen', false);
  return !hasSeenWelcome;
}

/**
 * Reset welcome modal (for testing)
 */
export function resetWelcomeModal(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('agentlink-welcome-seen');
    window.location.reload();
  }
}
