/**
 * Quick Actions Demo Page
 * Demonstrates the macro system functionality
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Star, History, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMacroStore, useFavoriteMacros, useRecentMacros } from '@/stores';
import { QuickActionsTray, MacroGrid, MacroCreator } from '@/components/macros';
import type { Macro } from '@/types/macros';

export default function MacrosDemoPage() {
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);

  const { macros, favorites, toggleFavorite } = useMacroStore();
  const favoriteMacros = useFavoriteMacros();
  const recentMacros = useRecentMacros(4);

  const handleMacroSelect = (macro: Macro) => {
    setLastExecuted(`Executed: ${macro.name} (${macro.action.type})`);
    setIsTrayOpen(false);
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-accent" />
            Quick Actions Menu
          </h1>
          <p className="text-muted-foreground">
            iMessage-style macro system with customizable actions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{macros.length}</div>
              <div className="text-sm text-muted-foreground">Total Macros</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{favorites.length}</div>
              <div className="text-sm text-muted-foreground">Favorites</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold">{recentMacros.length}</div>
              <div className="text-sm text-muted-foreground">Recent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-accent">⌘K</div>
              <div className="text-sm text-muted-foreground">Shortcut</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => setIsTrayOpen(true)}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            Open Quick Actions
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setIsCreatorOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Macro
          </Button>
        </div>

        {/* Last Executed */}
        {lastExecuted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-4 bg-accent/10 rounded-xl"
          >
            <p className="text-sm text-accent font-medium">{lastExecuted}</p>
          </motion.div>
        )}

        {/* Favorites */}
        {favoriteMacros.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Your Favorites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MacroGrid
                macros={favoriteMacros}
                onMacroClick={handleMacroSelect}
                onMacroFavoriteToggle={(macro) => toggleFavorite(macro.id)}
                favorites={favorites}
                size="sm"
              />
            </CardContent>
          </Card>
        )}

        {/* Recent */}
        {recentMacros.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-muted-foreground" />
                Recently Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MacroGrid
                macros={recentMacros}
                onMacroClick={handleMacroSelect}
                onMacroFavoriteToggle={(macro) => toggleFavorite(macro.id)}
                favorites={favorites}
                size="sm"
              />
            </CardContent>
          </Card>
        )}

        {/* All Macros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-accent" />
              All Macros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MacroGrid
              macros={macros}
              onMacroClick={handleMacroSelect}
              onMacroFavoriteToggle={(macro) => toggleFavorite(macro.id)}
              favorites={favorites}
              size="md"
            />
          </CardContent>
        </Card>

        {/* Features List */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid md:grid-cols-2 gap-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> iMessage-style sliding tray
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Categorized macros
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Favorites & Recent
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Search with keyboard nav
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Custom macro creator
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Template variables (@last, {'{{date}}'})
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Smooth spring animations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent">✓</span> Keyboard shortcuts (⌘K)
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions Tray */}
      <QuickActionsTray
        isOpen={isTrayOpen}
        onClose={() => setIsTrayOpen(false)}
        onMacroSelect={handleMacroSelect}
      />

      {/* Macro Creator */}
      <MacroCreator
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
      />
    </div>
  );
}
