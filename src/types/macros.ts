/**
 * Macro Type Definitions
 * Types for the Quick Actions Menu system
 */

import type { LucideIcon } from 'lucide-react';

// ============================================
// Macro Categories
// ============================================

export type MacroCategory =
  | 'system' // Built-in macros
  | 'context' // Context-aware (e.g., @last)
  | 'prompts' // Saved prompts
  | 'files' // File operations
  | 'tools' // Agent tools
  | 'custom'; // User-created

export const MACRO_CATEGORIES: MacroCategory[] = [
  'system',
  'context',
  'prompts',
  'files',
  'tools',
  'custom',
];

export const MACRO_CATEGORY_LABELS: Record<MacroCategory, string> = {
  system: 'System',
  context: 'Context',
  prompts: 'Prompts',
  files: 'Files',
  tools: 'Tools',
  custom: 'Custom',
};

export const MACRO_CATEGORY_COLORS: Record<MacroCategory, string> = {
  system: '#6366f1', // indigo-500
  context: '#8b5cf6', // violet-500
  prompts: '#10b981', // emerald-500
  files: '#f59e0b', // amber-500
  tools: '#06b6d4', // cyan-500
  custom: '#ec4899', // pink-500
};

// ============================================
// Macro Actions
// ============================================

export type MacroActionType =
  | 'insert_text'
  | 'run_command'
  | 'upload_file'
  | 'set_variable'
  | 'open_menu';

export interface InsertTextPayload {
  text: string;
  position?: 'start' | 'end' | 'cursor' | 'replace';
}

export interface RunCommandPayload {
  command: string;
  args?: string[];
}

export interface UploadFilePayload {
  accept?: string;
  multiple?: boolean;
}

export interface SetVariablePayload {
  key: string;
  value: unknown;
}

export interface OpenMenuPayload {
  menuId: string;
}

export type MacroActionPayload =
  | InsertTextPayload
  | RunCommandPayload
  | UploadFilePayload
  | SetVariablePayload
  | OpenMenuPayload;

export interface MacroAction {
  type: MacroActionType;
  payload: MacroActionPayload;
}

// ============================================
// Macro Definition
// ============================================

export interface Macro {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color?: string; // Hex color override
  category: MacroCategory;
  action: MacroAction;
  shortcut?: string; // Keyboard shortcut (e.g., 'cmd+shift+e')
  isCustom: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// Execution Context
// ============================================

export interface ExecutionContext {
  conversationId: string;
  agentId: string;
  lastMessage?: {
    id: string;
    content: string;
    role: string;
  };
  referencedFiles?: string[];
  variables: Map<string, unknown>;
}

// ============================================
// Macro Store State
// ============================================

export interface MacroStoreState {
  macros: Macro[];
  favorites: string[]; // Macro IDs
  recent: string[]; // Recently used macro IDs (ordered by recency)
  isTrayOpen: boolean;
  searchQuery: string;
  activeCategory: MacroCategory | 'all';
  isCreatorOpen: boolean;
  editingMacroId: string | null;
}

export interface MacroStoreActions {
  // Macro CRUD
  addMacro: (macro: Omit<Macro, 'id' | 'createdAt' | 'updatedAt'>) => Macro;
  removeMacro: (id: string) => void;
  updateMacro: (id: string, updates: Partial<Macro>) => void;

  // Favorites
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  // Recent usage
  recordUsage: (id: string) => void;
  clearRecent: () => void;

  // Reordering
  reorderMacros: (orderedIds: string[]) => void;
  reorderFavorites: (orderedIds: string[]) => void;

  // UI State
  setTrayOpen: (isOpen: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveCategory: (category: MacroCategory | 'all') => void;
  openCreator: (initialMacro?: Partial<Macro>) => void;
  closeCreator: () => void;

  // Getters (computed)
  getMacrosByCategory: (category: MacroCategory) => Macro[];
  getFavoriteMacros: () => Macro[];
  getRecentMacros: (limit?: number) => Macro[];
  getMacroById: (id: string) => Macro | undefined;
  searchMacros: (query: string) => Macro[];
}

export type MacroStore = MacroStoreState & MacroStoreActions;

// ============================================
// Default Macros
// ============================================

export const defaultMacros: Macro[] = [
  {
    id: 'macro-explain',
    name: 'Explain',
    description: 'Explain this code or concept',
    icon: 'Lightbulb',
    category: 'prompts',
    action: {
      type: 'insert_text',
      payload: { text: 'Please explain this in detail:\n\n', position: 'end' },
    },
    isCustom: false,
    sortOrder: 0,
  },
  {
    id: 'macro-refactor',
    name: 'Refactor',
    description: 'Refactor the code',
    icon: 'Wand2',
    category: 'prompts',
    action: {
      type: 'insert_text',
      payload: {
        text: 'Please refactor this code to be more efficient and readable:\n\n',
        position: 'end',
      },
    },
    isCustom: false,
    sortOrder: 1,
  },
  {
    id: 'macro-debug',
    name: 'Debug',
    description: 'Debug this code',
    icon: 'Bug',
    category: 'prompts',
    action: {
      type: 'insert_text',
      payload: {
        text: 'There seems to be an issue with this code. Please debug it:\n\n',
        position: 'end',
      },
    },
    isCustom: false,
    sortOrder: 2,
  },
  {
    id: 'macro-summarize',
    name: 'Summarize',
    description: 'Summarize conversation',
    icon: 'FileText',
    category: 'context',
    action: {
      type: 'insert_text',
      payload: {
        text: '@last Please summarize our conversation so far.',
        position: 'replace',
      },
    },
    isCustom: false,
    sortOrder: 3,
  },
  {
    id: 'macro-clear',
    name: 'Clear',
    description: 'Clear conversation',
    icon: 'Trash2',
    category: 'system',
    action: {
      type: 'run_command',
      payload: { command: '/clear' },
    },
    shortcut: 'cmd+shift+k',
    isCustom: false,
    sortOrder: 4,
  },
  {
    id: 'macro-image',
    name: 'Image',
    description: 'Upload image',
    icon: 'ImagePlus',
    category: 'files',
    action: {
      type: 'upload_file',
      payload: { accept: 'image/*', multiple: false },
    },
    isCustom: false,
    sortOrder: 5,
  },
  {
    id: 'macro-code',
    name: 'Code',
    description: 'Insert code block',
    icon: 'Code',
    category: 'system',
    action: {
      type: 'insert_text',
      payload: { text: '```\n\n```', position: 'cursor' },
    },
    shortcut: 'cmd+shift+c',
    isCustom: false,
    sortOrder: 6,
  },
  {
    id: 'macro-reset',
    name: 'Reset',
    description: 'Reset agent context',
    icon: 'RotateCcw',
    category: 'system',
    action: {
      type: 'run_command',
      payload: { command: '/reset' },
    },
    isCustom: false,
    sortOrder: 7,
  },
  {
    id: 'macro-improve',
    name: 'Improve',
    description: 'Improve writing',
    icon: 'Sparkles',
    category: 'prompts',
    action: {
      type: 'insert_text',
      payload: {
        text: 'Please improve the writing of the following text:\n\n',
        position: 'end',
      },
    },
    isCustom: false,
    sortOrder: 8,
  },
  {
    id: 'macro-translate',
    name: 'Translate',
    description: 'Translate to English',
    icon: 'Languages',
    category: 'prompts',
    action: {
      type: 'insert_text',
      payload: {
        text: 'Please translate the following to English:\n\n',
        position: 'end',
      },
    },
    isCustom: false,
    sortOrder: 9,
  },
  {
    id: 'macro-document',
    name: 'Document',
    description: 'Generate documentation',
    icon: 'FileCode',
    category: 'prompts',
    action: {
      type: 'insert_text',
      payload: {
        text: 'Please generate documentation for this code:\n\n',
        position: 'end',
      },
    },
    isCustom: false,
    sortOrder: 10,
  },
  {
    id: 'macro-test',
    name: 'Test',
    description: 'Generate unit tests',
    icon: 'TestTube',
    category: 'prompts',
    action: {
      type: 'insert_text',
      payload: {
        text: 'Please generate comprehensive unit tests for this code:\n\n',
        position: 'end',
      },
    },
    isCustom: false,
    sortOrder: 11,
  },
];

// ============================================
// Icon Mapping Type
// ============================================

export type MacroIconName =
  | 'Lightbulb'
  | 'Wand2'
  | 'Bug'
  | 'FileText'
  | 'Trash2'
  | 'ImagePlus'
  | 'Code'
  | 'RotateCcw'
  | 'Sparkles'
  | 'Languages'
  | 'FileCode'
  | 'TestTube'
  | 'Plus'
  | 'Star'
  | 'History'
  | 'Search'
  | 'Settings'
  | 'Edit'
  | 'Copy'
  | 'Check'
  | 'X'
  | 'MoreHorizontal'
  | 'Grid3X3'
  | 'List'
  | 'Folder'
  | 'FileUp'
  | 'Camera'
  | 'Mic'
  | 'Send'
  | 'MessageSquare'
  | 'Terminal'
  | 'Database'
  | 'Globe'
  | 'Link'
  | 'Share'
  | 'Download'
  | 'Upload'
  | 'RefreshCw'
  | 'Zap'
  | 'Shield'
  | 'Lock'
  | 'Unlock'
  | 'Eye'
  | 'EyeOff'
  | 'Bookmark'
  | 'Tag'
  | 'Filter'
  | 'SortAsc'
  | 'SortDesc'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ChevronUp'
  | 'ChevronDown'
  | 'ChevronLeft'
  | 'ChevronRight'
  | 'Maximize'
  | 'Minimize'
  | 'Maximize2'
  | 'Minimize2'
  | 'ExternalLink'
  | 'CornerDownLeft'
  | 'CornerUpRight'
  | 'Undo'
  | 'Redo'
  | 'Scissors'
  | 'Clipboard'
  | 'ClipboardCopy'
  | 'ClipboardList'
  | 'ClipboardCheck'
  | 'Type'
  | 'AlignLeft'
  | 'AlignCenter'
  | 'AlignRight'
  | 'Bold'
  | 'Italic'
  | 'Underline'
  | 'Strikethrough'
  | 'Highlighter'
  | 'Palette'
  | 'Brush'
  | 'Pencil'
  | 'Eraser'
  | 'Ruler'
  | 'Compass'
  | 'Calculator'
  | 'FunctionSquare'
  | 'Sigma'
  | 'Pi'
  | 'Hash'
  | 'AtSign'
  | 'DollarSign'
  | 'Percent'
  | 'PlusCircle'
  | 'MinusCircle'
  | 'XCircle'
  | 'CheckCircle'
  | 'HelpCircle'
  | 'Info'
  | 'AlertCircle'
  | 'AlertTriangle'
  | 'AlertOctagon'
  | 'Bell'
  | 'BellOff'
  | 'Mail'
  | 'Inbox'
  | 'SendHorizontal'
  | 'MessageCircle'
  | 'MessagesSquare'
  | 'Video'
  | 'Phone'
  | 'PhoneCall'
  | 'Smartphone'
  | 'Tablet'
  | 'Laptop'
  | 'Monitor'
  | 'Tv'
  | 'Radio'
  | 'Wifi'
  | 'Bluetooth'
  | 'Battery'
  | 'BatteryCharging'
  | 'Plug'
  | 'ZapOff'
  | 'Flashlight'
  | 'Sun'
  | 'Moon'
  | 'Cloud'
  | 'CloudRain'
  | 'CloudSnow'
  | 'CloudLightning'
  | 'CloudSun'
  | 'CloudMoon'
  | 'Wind'
  | 'Thermometer'
  | 'Droplets'
  | 'Umbrella'
  | 'Snowflake'
  | 'Flame'
  | 'ThermometerSun'
  | 'ThermometerSnowflake'
  | 'Timer'
  | 'Clock'
  | 'Watch'
  | 'Hourglass'
  | 'Calendar'
  | 'CalendarDays'
  | 'CalendarClock'
  | 'CalendarCheck'
  | 'CalendarX'
  | 'CalendarPlus'
  | 'CalendarMinus'
  | 'CalendarRange'
  | 'CalendarSearch'
  | 'CalendarHeart'
  | 'CalendarOff'
  | 'Pin'
  | 'PinOff'
  | 'Map'
  | 'MapPin'
  | 'Navigation'
  | 'Compass2'
  | 'Locate'
  | 'LocateFixed'
  | 'LocateOff'
  | 'Home'
  | 'Building'
  | 'Building2'
  | 'Castle'
  | 'School'
  | 'University'
  | 'Banknote'
  | 'CreditCard'
  | 'Wallet'
  | 'Coins'
  | 'Receipt'
  | 'ReceiptText'
  | 'ShoppingCart'
  | 'ShoppingBag'
  | 'Package'
  | 'PackageOpen'
  | 'PackageCheck'
  | 'PackageX'
  | 'PackageSearch'
  | 'PackagePlus'
  | 'PackageMinus'
  | 'Boxes'
  | 'Container'
  | 'Truck'
  | 'Plane'
  | 'Ship'
  | 'Train'
  | 'Car'
  | 'Bus'
  | 'Bike'
  | 'Footprints'
  | 'Rocket'
  | 'Ufo'
  | 'Satellite'
  | 'Radar'
  | 'Scan'
  | 'ScanLine'
  | 'ScanFace'
  | 'Fingerprint'
  | 'FaceId'
  | 'Contact'
  | 'Contact2'
  | 'User'
  | 'UserPlus'
  | 'UserMinus'
  | 'UserX'
  | 'UserCheck'
  | 'UserCog'
  | 'Users'
  | 'UsersRound'
  | 'Group'
  | 'PersonStanding'
  | 'Baby'
  | 'Accessibility'
  | 'Heart'
  | 'HeartOff'
  | 'HeartHandshake'
  | 'HeartPulse'
  | 'Activity'
  | 'Pulse'
  | 'Stethoscope'
  | 'Syringe'
  | 'Pill'
  | 'Capsule'
  | 'Tablets'
  | 'Microscope'
  | 'Dna'
  | 'Atom'
  | 'Atom2'
  | 'Binary'
  | 'Code2'
  | 'Codepen'
  | 'Codesandbox'
  | 'TerminalSquare'
  | 'Command'
  | 'Keyboard'
  | 'Mouse'
  | 'MousePointer'
  | 'MousePointer2'
  | 'MousePointerClick'
  | 'Touchpad'
  | 'Gamepad'
  | 'Gamepad2'
  | 'Joystick'
  | 'Dice'
  | 'Puzzle'
  | 'ToyBrick'
  | 'Shapes'
  | 'Circle'
  | 'Square'
  | 'Triangle'
  | 'Hexagon'
  | 'Octagon'
  | 'Pentagon'
  | 'Star2'
  | 'Heart2'
  | 'Diamond'
  | 'Sword'
  | 'Crown'
  | 'Trophy'
  | 'Medal'
  | 'Award'
  | 'Certificate'
  | 'Badge'
  | 'BadgeCheck'
  | 'Verified'
  | 'Crown2'
  | 'Gem'
  | 'Gem2'
  | 'Crystal'
  | 'Candle'
  | 'Lamp'
  | 'LampDesk'
  | 'LampFloor'
  | 'LampWall'
  | 'Lightbulb2'
  | 'LightbulbOff'
  | 'Spotlight'
  | 'Flashlight2'
  | 'BatteryWarning'
  | 'BatteryFull'
  | 'BatteryMedium'
  | 'BatteryLow'
  | 'Power'
  | 'PowerOff'
  | 'ToggleLeft'
  | 'ToggleRight'
  | 'Sliders'
  | 'SlidersHorizontal'
  | 'Slider'
  | 'Option'
  | 'Subscript'
  | 'Superscript'
  | 'Quote'
  | 'Quote2'
  | 'Apostrophe'
  | 'Parentheses'
  | 'Brackets'
  | 'Braces'
  | 'Asterisk'
  | 'Ampersand'
  | 'Slash'
  | 'Backslash'
  | 'Divide'
  | 'Equal'
  | 'NotEqual'
  | 'LessThan'
  | 'GreaterThan'
  | 'LessThanOrEqual'
  | 'GreaterThanOrEqual'
  | 'Infinity'
  | 'Omega'
  | 'Delta'
  | 'Nabla'
  | 'Partial'
  | 'Integral'
  | 'SquareRoot'
  | 'Radical'
  | 'Percentage'
  | 'Permille'
  | 'Tilde'
  | 'Grave'
  | 'Acute'
  | 'Circumflex'
  | 'Caron'
  | 'Cedilla'
  | 'Macron'
  | 'Breve'
  | 'Ring'
  | 'Dot'
  | 'Comma'
  | 'Period'
  | 'Colon'
  | 'Semicolon'
  | 'Exclamation'
  | 'Question'
  | 'Interrobang'
  | 'Section'
  | 'Paragraph'
  | 'Pilcrow'
  | 'Copyright'
  | 'Registered'
  | 'Trademark'
  | 'Service'
  | 'SoundRecording'
  | 'Currency'
  | 'Euro'
  | 'Pound'
  | 'Yen'
  | 'Won'
  | 'Rupee'
  | 'Ruble'
  | 'Lira'
  | 'Franc'
  | 'Baht'
  | 'Hryvnia'
  | 'Lari'
  | 'Tenge'
  | 'Rial'
  | 'Shekel'
  | 'Bitcoin'
  | 'Ethereum'
  | 'Litecoin'
  | 'Monero'
  | 'Ripple'
  | 'Tether'
  | 'Dollar'
  | 'Cent'
  | 'Mill'
  | 'Bitcoin2'
  | 'Nfc'
  | 'Qr'
  | 'Barcode'
  | 'Rss'
  | 'Wifi2'
  | 'WifiOff'
  | 'Signal'
  | 'SignalHigh'
  | 'SignalMedium'
  | 'SignalLow'
  | 'SignalZero'
  | 'Airplay'
  | 'Cast'
  | 'Chromecast'
  | 'MonitorSpeaker'
  | 'MonitorPlay'
  | 'MonitorPause'
  | 'MonitorStop'
  | 'MonitorX'
  | 'MonitorCheck'
  | 'MonitorDot'
  | 'SmartphoneSpeaker'
  | 'SmartphonePlay'
  | 'SmartphonePause'
  | 'SmartphoneStop'
  | 'SmartphoneX'
  | 'SmartphoneCheck'
  | 'SmartphoneDot'
  | 'SmartphoneNfc'
  | 'SmartphoneCharging'
  | 'SmartphoneVibration'
  | 'SmartphoneOff'
  | 'TabletSpeaker'
  | 'TabletPlay'
  | 'TabletPause'
  | 'TabletStop'
  | 'TabletX'
  | 'TabletCheck'
  | 'TabletDot'
  | 'LaptopSpeaker'
  | 'LaptopPlay'
  | 'LaptopPause'
  | 'LaptopStop'
  | 'LaptopX'
  | 'LaptopCheck'
  | 'LaptopDot'
  | 'Server'
  | 'Server2'
  | 'ServerOff'
  | 'ServerCrash'
  | 'ServerCog'
  | 'HardDrive'
  | 'HardDriveDownload'
  | 'HardDriveUpload'
  | 'Cpu'
  | 'Cpu2'
  | 'MemoryStick'
  | 'Disc'
  | 'Disc2'
  | 'Disc3'
  | 'Save'
  | 'SaveAll'
  | 'FolderOpen'
  | 'FolderClosed'
  | 'FolderGit'
  | 'FolderGit2'
  | 'FolderKanban'
  | 'FolderTree'
  | 'FolderSync'
  | 'FolderCog'
  | 'FolderCheck'
  | 'FolderX'
  | 'FolderPlus'
  | 'FolderMinus'
  | 'FolderHeart'
  | 'FolderEdit'
  | 'FolderSearch'
  | 'FolderLock'
  | 'FolderRoot'
  | 'File'
  | 'File2'
  | 'FileAxis3d'
  | 'FileBadge'
  | 'FileBadge2'
  | 'FileBarChart'
  | 'FileBarChart2'
  | 'FileBox'
  | 'FileCheck'
  | 'FileCheck2'
  | 'FileClock'
  | 'FileCode2'
  | 'FileCog'
  | 'FileDiff'
  | 'FileDigit'
  | 'FileDown'
  | 'FileEdit'
  | 'FileHeart'
  | 'FileImage'
  | 'FileJson'
  | 'FileJson2'
  | 'FileKey'
  | 'FileKey2'
  | 'FileLock'
  | 'FileLock2'
  | 'FileMinus'
  | 'FileMinus2'
  | 'FileMusic'
  | 'FileOutput'
  | 'FilePieChart'
  | 'FilePlus'
  | 'FilePlus2'
  | 'FileQuestion'
  | 'FileScan'
  | 'FileSearch'
  | 'FileSearch2'
  | 'FileSignature'
  | 'FileSpreadsheet'
  | 'FileStack'
  | 'FileSymlink'
  | 'FileTerminal'
  | 'FileText2'
  | 'FileType'
  | 'FileType2'
  | 'FileUp'
  | 'FileVideo'
  | 'FileVideo2'
  | 'FileVolume'
  | 'FileVolume2'
  | 'FileWarning'
  | 'FileX'
  | 'FileX2'
  | 'Files'
  | 'GalleryHorizontal'
  | 'GalleryHorizontalEnd'
  | 'GalleryThumbnails'
  | 'GalleryVertical'
  | 'GalleryVerticalEnd'
  | 'Image'
  | 'Image2'
  | 'ImageDown'
  | 'ImageMinus'
  | 'ImageOff'
  | 'ImagePlay'
  | 'ImagePlus'
  | 'Images'
  | 'PictureInPicture'
  | 'PictureInPicture2'
  | 'Focus'
  | 'Focus2'
  | 'Aperture'
  | 'Shutter'
  | 'Lens'
  | 'View'
  | 'View2'
  | 'ViewOff'
  | 'ZoomIn'
  | 'ZoomOut'
  | 'ZoomReset'
  | 'Search2'
  | 'SearchX'
  | 'SearchSlash'
  | 'Funnel'
  | 'FunnelPlus'
  | 'FunnelMinus'
  | 'FunnelX'
  | 'Filter2'
  | 'FilterX'
  | 'ListFilter'
  | 'ListOrdered'
  | 'ListStart'
  | 'ListEnd'
  | 'ListTree'
  | 'ListVideo'
  | 'ListMusic'
  | 'ListTodo'
  | 'ListChecks'
  | 'ListX'
  | 'ListCollapse'
  | 'LayoutGrid'
  | 'LayoutList'
  | 'LayoutTemplate'
  | 'LayoutDashboard'
  | 'LayoutPanelLeft'
  | 'LayoutPanelTop'
  | 'LayoutPanelBottom'
  | 'LayoutPanelRight'
  | 'Rows2'
  | 'Rows3'
  | 'Rows4'
  | 'Columns2'
  | 'Columns3'
  | 'Columns4'
  | 'Grid2X2'
  | 'Grid2X3'
  | 'Grid3X2'
  | 'Grid3X3'
  | 'Grip'
  | 'GripHorizontal'
  | 'GripVertical'
  | 'Move'
  | 'Move2'
  | 'Move3d'
  | 'MoveDiagonal'
  | 'MoveDiagonal2'
  | 'MoveHorizontal'
  | 'MoveVertical'
  | 'ArrowUpLeft'
  | 'ArrowUpRight'
  | 'ArrowDownLeft'
  | 'ArrowDownRight'
  | 'ArrowLeftRight'
  | 'ArrowUpDown'
  | 'Merge'
  | 'Split'
  | 'GitBranch'
  | 'GitBranchPlus'
  | 'GitCommit'
  | 'GitCommitHorizontal'
  | 'GitCommitVertical'
  | 'GitCompare'
  | 'GitCompareArrows'
  | 'GitFork'
  | 'GitGraph'
  | 'GitMerge'
  | 'GitPullRequest'
  | 'GitPullRequestClosed'
  | 'GitPullRequestCreate'
  | 'GitPullRequestDraft'
  | 'GitPullRequestArrow'
  | 'Github'
  | 'Gitlab'
  | 'Bitbucket'
  | 'Repo'
  | 'RepoForked'
  | 'RepoPull'
  | 'RepoPush'
  | 'RepoClone'
  | 'RepoLocked'
  | 'RepoDeleted'
  | 'CircleDot'
  | 'CircleDashed'
  | 'CircleSlash'
  | 'CircleEqual'
  | 'CircleOff'
  | 'SquareDot'
  | 'SquareDashed'
  | 'SquareSlash'
  | 'SquareEqual'
  | 'SquareSplitHorizontal'
  | 'SquareSplitVertical'
  | 'PanelLeft'
  | 'PanelRight'
  | 'PanelTop'
  | 'PanelBottom'
  | 'PanelLeftClose'
  | 'PanelRightClose'
  | 'PanelTopClose'
  | 'PanelBottomClose'
  | 'PanelLeftOpen'
  | 'PanelRightOpen'
  | 'PanelTopOpen'
  | 'PanelBottomOpen'
  | 'Sidebar'
  | 'SidebarClose'
  | 'SidebarOpen'
  | 'AppWindow'
  | 'AppWindowMac'
  | 'Basement'
  | 'WashingMachine'
  | 'Refrigerator'
  | 'Microwave'
  | 'Oven'
  | 'Dishwasher'
  | 'Fan'
  | 'AirVent'
  | 'AirConditioning'
  | 'Heater'
  | 'Thermometer2'
  | 'SprayCan'
  | 'Paintbrush'
  | 'PaintBucket'
  | 'PaintRoller'
  | 'Pen'
  | 'PenTool'
  | 'Pencil2'
  | 'Highlighter2'
  | 'Marker'
  | 'Stamp'
  | 'Sticker'
  | 'Sticker2'
  | 'Paperclip2'
  | 'Link2'
  | 'Link2Off'
  | 'Unlink'
  | 'Unlink2'
  | 'Anchor'
  | 'Paper'
  | 'Newspaper'
  | 'Book'
  | 'BookOpen'
  | 'BookOpenCheck'
  | 'BookX'
  | 'BookPlus'
  | 'BookMinus'
  | 'BookUp'
  | 'BookDown'
  | 'BookKey'
  | 'BookLock'
  | 'BookUser'
  | 'BookHeart'
  | 'BookA'
  | 'BookText'
  | 'BookAudio'
  | 'BookVideo'
  | 'BookImage'
  | 'BookHeadphones'
  | 'Library'
  | 'LibrarySquare'
  | 'Bookmark2'
  | 'BookmarkPlus'
  | 'BookmarkMinus'
  | 'BookmarkX'
  | 'BookmarkCheck'
  | 'BookmarkEdit'
  | 'GraduationCap'
  | 'Award2'
  | 'Medal2'
  | 'Trophy2'
  | 'Crown3'
  | 'Sword2'
  | 'Shield2'
  | 'ShieldAlert'
  | 'ShieldCheck'
  | 'ShieldClose'
  | 'ShieldMinus'
  | 'ShieldPlus'
  | 'ShieldOff'
  | 'ShieldQuestion'
  | 'ShieldX'
  | 'ShieldEllipsis'
  | 'Swords'
  | 'Bomb'
  | 'Target'
  | 'Crosshair'
  | 'Goal'
  | 'Tent'
  | 'TentTree'
  | 'Campfire'
  | 'Trees'
  | 'TreePine'
  | 'TreeDeciduous'
  | 'Leaf'
  | 'Flower'
  | 'Flower2'
  | 'Sprout'
  | 'Seed'
  | 'Seedling'
  | 'Vegan'
  | 'Beef'
  | 'Ham'
  | 'Candy'
  | 'Candy2'
  | 'CandyOff'
  | 'Cookie'
  | 'Pizza'
  | 'Sandwich'
  | 'Soup'
  | 'Salad'
  | 'IceCream'
  | 'IceCream2'
  | 'CupSoda'
  | 'Coffee'
  | 'Tea'
  | 'Wine'
  | 'Beer'
  | 'Martini'
  | 'Cocktail'
  | 'Drumstick'
  | 'Utensils'
  | 'UtensilsCrossed'
  | 'ForkKnife'
  | 'ChefHat'
  | 'Plug2'
  | 'PlugZap'
  | 'Bug2'
  | 'BugOff'
  | 'BugPlay'
  | 'Ant'
  | 'Beetle'
  | 'Bird'
  | 'Cat'
  | 'Dog'
  | 'Fish'
  | 'FishSymbol'
  | 'Rabbit'
  | 'Rat'
  | 'Snail'
  | 'Snake'
  | 'Squirrel'
  | 'Turtle'
  | 'Worm'
  | 'Bone'
  | 'Ghost'
  | 'Ghost2'
  | 'Skull'
  | 'Alien'
  | 'Bot'
  | 'Bot2'
  | 'Bot3'
  | 'Bot4'
  | 'Robot'
  | 'Brain'
  | 'BrainCircuit'
  | 'BrainCog'
  | 'Cpu3'
  | 'CircuitBoard'
  | 'Network'
  | 'Share2'
  | 'Share3'
  | 'Share4'
  | 'Share5'
  | 'Forward'
  | 'Reply'
  | 'ReplyAll'
  | 'Reply2'
  | 'ReplyAll2'
  | 'Send2'
  | 'Mail2'
  | 'MailPlus'
  | 'MailMinus'
  | 'MailCheck'
  | 'MailX'
  | 'MailQuestion'
  | 'MailWarning'
  | 'MailSearch'
  | 'Mails'
  | 'Inbox2'
  | 'InboxPlus'
  | 'InboxMinus'
  | 'InboxCheck'
  | 'InboxX'
  | 'Archive'
  | 'ArchiveRestore'
  | 'ArchiveX'
  | 'Trash'
  | 'Trash2'
  | 'Trash3'
  | 'Trash4'
  | 'History2'
  | 'Clock2'
  | 'Clock3'
  | 'Clock4'
  | 'Clock5'
  | 'Clock6'
  | 'Clock7'
  | 'Clock8'
  | 'Clock9'
  | 'Clock10'
  | 'Clock11'
  | 'Clock12'
  | 'AlarmClock'
  | 'AlarmClockCheck'
  | 'AlarmClockMinus'
  | 'AlarmClockPlus'
  | 'AlarmClockOff'
  | 'Timer2'
  | 'Timer3'
  | 'TimerOff'
  | 'TimerReset'
  | 'Stopwatch'
  | 'Gauge'
  | 'Gauge2'
  | 'Gauge3'
  | 'Gauge4'
  | 'Gauge5'
  | 'Gauge6'
  | 'Gauge7'
  | 'Gauge8'
  | 'Gauge9'
  | 'Gauge10'
  | 'Gauge11'
  | 'Gauge12'
  | 'GaugeCircle'
  | 'GaugeDashed';
