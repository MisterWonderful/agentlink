/**
 * Macro Creator Component
 * Form for creating and editing custom macros
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Type,
  Terminal,
  Upload,
  Settings,
  Menu,
  Check,
  ChevronDown,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  Macro,
  MacroCategory,
  MacroActionType,
  MacroActionPayload,
} from '@/types/macros';
import {
  MACRO_CATEGORIES,
  MACRO_CATEGORY_LABELS,
  MACRO_CATEGORY_COLORS,
} from '@/types/macros';
import { useMacroStore } from '@/stores/macro-store';

// ============================================
// Types
// ============================================

export interface MacroCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  initialMacro?: Partial<Macro>;
}

// ============================================
// Action Types Configuration
// ============================================

const ACTION_TYPES: { value: MacroActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'insert_text', label: 'Insert Text', icon: <Type className="w-4 h-4" /> },
  { value: 'run_command', label: 'Run Command', icon: <Terminal className="w-4 h-4" /> },
  { value: 'upload_file', label: 'Upload File', icon: <Upload className="w-4 h-4" /> },
  { value: 'set_variable', label: 'Set Variable', icon: <Settings className="w-4 h-4" /> },
  { value: 'open_menu', label: 'Open Menu', icon: <Menu className="w-4 h-4" /> },
];

// ============================================
// Icon Options (subset of popular icons)
// ============================================

const ICON_OPTIONS = [
  'Lightbulb',
  'Wand2',
  'Bug',
  'FileText',
  'Trash2',
  'ImagePlus',
  'Code',
  'RotateCcw',
  'Sparkles',
  'Languages',
  'FileCode',
  'TestTube',
  'Plus',
  'Star',
  'History',
  'Search',
  'Settings',
  'Edit',
  'Copy',
  'Send',
  'MessageSquare',
  'Terminal',
  'Database',
  'Globe',
  'Link',
  'Share',
  'Download',
  'Upload',
  'RefreshCw',
  'Zap',
  'Shield',
  'Bookmark',
  'Tag',
  'Filter',
  'Folder',
  'File',
  'Image',
  'Video',
  'Music',
  'Mic',
  'Camera',
  'Mail',
  'Calendar',
  'Clock',
  'Timer',
  'Map',
  'Home',
  'User',
  'Users',
  'Heart',
  'ThumbsUp',
  'Check',
  'X',
  'AlertCircle',
  'Info',
  'HelpCircle',
];

// ============================================
// Color Options
// ============================================

const COLOR_OPTIONS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#64748b', // slate
];

// ============================================
// Component
// ============================================

export function MacroCreator({ isOpen, onClose, initialMacro }: MacroCreatorProps) {
  const { addMacro, updateMacro } = useMacroStore();
  const isEditing = !!initialMacro?.id;

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    icon: string;
    color: string;
    category: MacroCategory;
    actionType: MacroActionType;
    actionPayload: string;
    shortcut: string;
  }>({
    name: '',
    description: '',
    icon: 'Lightbulb',
    color: COLOR_OPTIONS[0],
    category: 'custom',
    actionType: 'insert_text',
    actionPayload: '',
    shortcut: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Load initial data when editing
  useEffect(() => {
    if (initialMacro) {
      setFormData({
        name: initialMacro.name || '',
        description: initialMacro.description || '',
        icon: initialMacro.icon || 'Lightbulb',
        color: initialMacro.color || COLOR_OPTIONS[0],
        category: initialMacro.category || 'custom',
        actionType: initialMacro.action?.type || 'insert_text',
        actionPayload: initialMacro.action?.payload
          ? JSON.stringify(initialMacro.action.payload, null, 2)
          : '',
        shortcut: initialMacro.shortcut || '',
      });
    } else {
      // Reset form for new macro
      setFormData({
        name: '',
        description: '',
        icon: 'Lightbulb',
        color: COLOR_OPTIONS[0],
        category: 'custom',
        actionType: 'insert_text',
        actionPayload: '',
        shortcut: '',
      });
    }
    setErrors({});
  }, [initialMacro, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // Validate payload based on action type
    if (formData.actionType === 'insert_text') {
      if (!formData.actionPayload.trim()) {
        newErrors.actionPayload = 'Text content is required';
      }
    } else if (formData.actionType === 'run_command') {
      if (!formData.actionPayload.trim()) {
        newErrors.actionPayload = 'Command is required';
      } else if (!formData.actionPayload.startsWith('/')) {
        newErrors.actionPayload = 'Command must start with /';
      }
    } else if (formData.actionType === 'upload_file') {
      try {
        if (formData.actionPayload) {
          JSON.parse(formData.actionPayload);
        }
      } catch {
        newErrors.actionPayload = 'Invalid JSON format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildActionPayload = (): MacroActionPayload => {
    switch (formData.actionType) {
      case 'insert_text':
        return { text: formData.actionPayload, position: 'end' };
      case 'run_command':
        return { command: formData.actionPayload };
      case 'upload_file':
        try {
          return formData.actionPayload
            ? JSON.parse(formData.actionPayload)
            : { accept: '*', multiple: false };
        } catch {
          return { accept: '*', multiple: false };
        }
      case 'set_variable':
        try {
          return formData.actionPayload
            ? JSON.parse(formData.actionPayload)
            : { key: '', value: '' };
        } catch {
          return { key: '', value: '' };
        }
      case 'open_menu':
        return { menuId: formData.actionPayload };
      default:
        return {} as MacroActionPayload;
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const macroData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      icon: formData.icon,
      color: formData.color,
      category: formData.category,
      action: {
        type: formData.actionType,
        payload: buildActionPayload(),
      },
      shortcut: formData.shortcut.trim() || undefined,
      isCustom: true,
    };

    if (isEditing && initialMacro?.id) {
      updateMacro(initialMacro.id, macroData);
    } else {
      addMacro(macroData);
    }

    onClose();
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const getActionPlaceholder = () => {
    switch (formData.actionType) {
      case 'insert_text':
        return 'Enter text to insert...\n\nUse @last for last message, {{date}} for current date';
      case 'run_command':
        return '/command or /command arg1 arg2';
      case 'upload_file':
        return '{ "accept": "image/*", "multiple": false }';
      case 'set_variable':
        return '{ "key": "variableName", "value": "value" }';
      case 'open_menu':
        return 'menu-id';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            {isEditing ? 'Edit Macro' : 'Create Custom Macro'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Name & Icon Row */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">
                Name <span className="text-error">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Macro name"
                className={cn(errors.name && 'border-error')}
              />
              {errors.name && (
                <p className="text-xs text-error">{errors.name}</p>
              )}
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  'border-2 transition-colors',
                  showIconPicker ? 'border-accent' : 'border-border hover:border-accent/50'
                )}
                style={{ backgroundColor: `${formData.color}20` }}
              >
                <span style={{ color: formData.color }}>
                  {formData.icon.charAt(0)}
                </span>
              </button>
            </div>
          </div>

          {/* Icon Picker Dropdown */}
          <AnimatePresence>
            {showIconPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-8 gap-2 p-3 bg-muted/50 rounded-xl">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => {
                        updateField('icon', icon);
                        setShowIconPicker(false);
                      }}
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center',
                        'hover:bg-background transition-colors',
                        formData.icon === icon && 'bg-accent/20 ring-2 ring-accent'
                      )}
                    >
                      <span className="text-sm">{icon.charAt(0)}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateField('color', color)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-transform',
                    'hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    formData.color === color && 'ring-2 ring-offset-2 ring-foreground scale-110'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-error">*</span>
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="What does this macro do?"
              className={cn(errors.description && 'border-error')}
            />
            {errors.description && (
              <p className="text-xs text-error">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => updateField('category', value as MacroCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MACRO_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: MACRO_CATEGORY_COLORS[cat] }}
                      />
                      {MACRO_CATEGORY_LABELS[cat]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Type */}
          <div className="space-y-2">
            <Label>Action Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {ACTION_TYPES.map((action) => (
                <button
                  key={action.value}
                  onClick={() => updateField('actionType', action.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl',
                    'border transition-colors',
                    formData.actionType === action.value
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  {action.icon}
                  <span className="text-xs font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Payload */}
          <div className="space-y-2">
            <Label htmlFor="actionPayload">
              Action Details <span className="text-error">*</span>
            </Label>
            <Textarea
              id="actionPayload"
              value={formData.actionPayload}
              onChange={(e) => updateField('actionPayload', e.target.value)}
              placeholder={getActionPlaceholder()}
              rows={4}
              className={cn(
                'font-mono text-sm resize-none',
                errors.actionPayload && 'border-error'
              )}
            />
            {errors.actionPayload && (
              <p className="text-xs text-error">{errors.actionPayload}</p>
            )}
          </div>

          {/* Keyboard Shortcut */}
          <div className="space-y-2">
            <Label htmlFor="shortcut">Keyboard Shortcut (optional)</Label>
            <Input
              id="shortcut"
              value={formData.shortcut}
              onChange={(e) => updateField('shortcut', e.target.value)}
              placeholder="cmd+shift+m"
            />
            <p className="text-xs text-muted-foreground">
              Format: cmd/ctrl/alt/shift + key
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Check className="w-4 h-4" />
            {isEditing ? 'Save Changes' : 'Create Macro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Quick Macro Creator (simplified inline version)
// ============================================

export interface QuickMacroCreatorProps {
  onCreate: (macro: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  className?: string;
}

export function QuickMacroCreator({ onCreate, onCancel, className }: QuickMacroCreatorProps) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !text.trim()) return;

    onCreate({
      name: name.trim(),
      description: `Quick macro: ${name}`,
      icon: 'Zap',
      category: 'custom',
      action: {
        type: 'insert_text',
        payload: { text: text.trim(), position: 'end' },
      },
      isCustom: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn('space-y-3 p-4 bg-muted/50 rounded-xl', className)}
    >
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium">Quick Create</span>
      </div>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Macro name"
        className="h-9"
      />
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Text to insert..."
        rows={2}
        className="resize-none text-sm"
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit} className="flex-1">
          Create
        </Button>
      </div>
    </motion.div>
  );
}
