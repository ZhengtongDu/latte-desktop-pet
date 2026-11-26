export type GearThemeId = 'dark-rgb' | 'snow-white' | 'cream-retro' | 'sakura-pink';
export type SceneId = 'none' | 'bookshelf' | 'kitchen' | 'litterbox' | 'window';

export interface GearPalette {
  id: GearThemeId;
  name: string;
  // Keyboard
  glowStops: [string, string, string];
  glowAlphaScale: number;
  shadowColor: string;
  caseFill: string;
  caseStroke: string;
  wellFill: string;
  keyTop: string;
  keySide: string;
  modTop: string;
  modSide: string;
  accentTop: string;
  accentSide: string;
  pressTop: string;
  pressSide: string;
  legendMain: string;
  legendAccent: string;
  legendPress: string;
  // Mouse
  mouseShell: [string, string, string];
  mouseButton: string;
  mousePress: string;
  mouseSeam: string;
  mouseOutline: string;
  mouseHighlight: string;
  mouseCable: string;
  mouseWheelSlot: string;
  mouseWheelIdle: string;
  mouseLedStops: [string, string, string];
  // Key bubbles
  bubbleBg: string;
  bubbleText: string;
  bubbleAccentL: string;
  bubbleAccentR: string;
}

export const GEAR_THEMES: Record<GearThemeId, GearPalette> = {
  'dark-rgb': {
    id: 'dark-rgb',
    name: '暗夜',
    glowStops: ['#4fe3d1', '#8b7bff', '#ff7ac6'],
    glowAlphaScale: 1,
    shadowColor: 'rgba(0, 0, 0, 0.34)',
    caseFill: '#2a292e',
    caseStroke: '#4a4850',
    wellFill: '#1c1b1f',
    keyTop: '#3c3b41',
    keySide: '#232227',
    modTop: '#56545c',
    modSide: '#36343b',
    accentTop: '#f2c14e',
    accentSide: '#a9822a',
    pressTop: '#8ff3e6',
    pressSide: '#3fb3a5',
    legendMain: '#d8dbe3',
    legendAccent: '#2a2418',
    legendPress: '#111214',
    mouseShell: ['#232227', '#38363d', '#232227'],
    mouseButton: '#302e35',
    mousePress: '#8ff3e6',
    mouseSeam: 'rgba(10, 10, 12, 0.85)',
    mouseOutline: '#0f0e11',
    mouseHighlight: 'rgba(255, 255, 255, 0.14)',
    mouseCable: '#1b1a1e',
    mouseWheelSlot: '#121115',
    mouseWheelIdle: '#4fe3d1',
    mouseLedStops: ['#ff7ac6', '#8b7bff', '#4fe3d1'],
    bubbleBg: 'rgba(24, 24, 30, 0.90)',
    bubbleText: '#f8f9fc',
    bubbleAccentL: '#8ff3e6',
    bubbleAccentR: '#f5c84b',
  },
  'snow-white': {
    id: 'snow-white',
    name: '纯白',
    glowStops: ['#7de8ff', '#b2a3ff', '#ffa6d6'],
    glowAlphaScale: 0.92,
    shadowColor: 'rgba(22, 30, 48, 0.24)',
    caseFill: '#f3f6fa',
    caseStroke: '#c7d0de',
    wellFill: '#dbe2ec',
    keyTop: '#ffffff',
    keySide: '#d4dce7',
    modTop: '#e7edf5',
    modSide: '#c1cbd9',
    accentTop: '#7cd4f8',
    accentSide: '#4da7cc',
    pressTop: '#64d8ff',
    pressSide: '#359ec4',
    legendMain: '#424c5c',
    legendAccent: '#1b3d4f',
    legendPress: '#ffffff',
    mouseShell: ['#e4eaf2', '#ffffff', '#e4eaf2'],
    mouseButton: '#f5f8fc',
    mousePress: '#7cd4f8',
    mouseSeam: 'rgba(130, 145, 168, 0.58)',
    mouseOutline: '#9aa7ba',
    mouseHighlight: 'rgba(255, 255, 255, 0.92)',
    mouseCable: '#b7c2d2',
    mouseWheelSlot: '#d0d8e4',
    mouseWheelIdle: '#6bcff5',
    mouseLedStops: ['#7de8ff', '#b2a3ff', '#ffa6d6'],
    bubbleBg: 'rgba(250, 252, 255, 0.95)',
    bubbleText: '#2c3545',
    bubbleAccentL: '#56c7f5',
    bubbleAccentR: '#9d8cff',
  },
  'cream-retro': {
    id: 'cream-retro',
    name: '奶霜',
    glowStops: ['#f2c97d', '#eda48a', '#98c79d'],
    glowAlphaScale: 0.8,
    shadowColor: 'rgba(54, 42, 30, 0.25)',
    caseFill: '#ede6d8',
    caseStroke: '#c5b9a6',
    wellFill: '#d6ccb9',
    keyTop: '#fbf7ef',
    keySide: '#d8cebc',
    modTop: '#e5dccb',
    modSide: '#bfb4a0',
    accentTop: '#e88f72',
    accentSide: '#b8644a',
    pressTop: '#96c99b',
    pressSide: '#649469',
    legendMain: '#52473b',
    legendAccent: '#fffaf4',
    legendPress: '#1f3322',
    mouseShell: ['#e5ddce', '#fbf7ef', '#e5ddce'],
    mouseButton: '#f4eee2',
    mousePress: '#96c99b',
    mouseSeam: 'rgba(138, 124, 106, 0.55)',
    mouseOutline: '#9c8f7e',
    mouseHighlight: 'rgba(255, 252, 245, 0.85)',
    mouseCable: '#b2a594',
    mouseWheelSlot: '#cec3b0',
    mouseWheelIdle: '#84b98a',
    mouseLedStops: ['#f2c97d', '#eda48a', '#98c79d'],
    bubbleBg: 'rgba(252, 247, 238, 0.95)',
    bubbleText: '#473c31',
    bubbleAccentL: '#7ab882',
    bubbleAccentR: '#e38768',
  },
  'sakura-pink': {
    id: 'sakura-pink',
    name: '樱粉',
    glowStops: ['#ff98c8', '#c8a6ff', '#8be8da'],
    glowAlphaScale: 0.92,
    shadowColor: 'rgba(64, 30, 48, 0.22)',
    caseFill: '#fdebf1',
    caseStroke: '#e3b6c6',
    wellFill: '#efd0db',
    keyTop: '#fffafc',
    keySide: '#e7c9d4',
    modTop: '#fbd7e4',
    modSide: '#d8a4b7',
    accentTop: '#f58ab1',
    accentSide: '#c96288',
    pressTop: '#ff8ec2',
    pressSide: '#d15a91',
    legendMain: '#634150',
    legendAccent: '#fff8fb',
    legendPress: '#ffffff',
    mouseShell: ['#f5dce5', '#fff8fb', '#f5dce5'],
    mouseButton: '#fdeef3',
    mousePress: '#ff8ec2',
    mouseSeam: 'rgba(178, 122, 144, 0.55)',
    mouseOutline: '#c993a8',
    mouseHighlight: 'rgba(255, 255, 255, 0.90)',
    mouseCable: '#ddb2c2',
    mouseWheelSlot: '#e3becb',
    mouseWheelIdle: '#f58ab1',
    mouseLedStops: ['#ff98c8', '#c8a6ff', '#8be8da'],
    bubbleBg: 'rgba(255, 247, 251, 0.95)',
    bubbleText: '#5c3849',
    bubbleAccentL: '#f58ab1',
    bubbleAccentR: '#b58cff',
  },
};

export const GEAR_THEME_OPTIONS: ReadonlyArray<{ id: GearThemeId; name: string }> = [
  { id: 'dark-rgb', name: '暗夜' },
  { id: 'snow-white', name: '纯白' },
  { id: 'cream-retro', name: '奶霜' },
  { id: 'sakura-pink', name: '樱粉' },
];

export const SCENE_OPTIONS: ReadonlyArray<{ id: SceneId; name: string }> = [
  { id: 'none', name: '无' },
  { id: 'bookshelf', name: '书房' },
  { id: 'kitchen', name: '厨房' },
  { id: 'litterbox', name: '猫砂盆' },
  { id: 'window', name: '窗台' },
];

export function normalizeGearTheme(raw: unknown): GearThemeId {
  if (raw === 'snow-white' || raw === 'cream-retro' || raw === 'sakura-pink') return raw;
  return 'dark-rgb';
}

export function normalizeSceneId(raw: unknown): SceneId {
  if (raw === 'bookshelf' || raw === 'kitchen' || raw === 'litterbox' || raw === 'window') return raw;
  return 'none';
}
