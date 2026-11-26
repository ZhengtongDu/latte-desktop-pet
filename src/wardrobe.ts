/**
 * Latte accessories (colored-pencil layered art).
 *
 * Built-in accessories are full-canvas transparent layers that share the same 1024² coordinate
 * space as the cat body, so they are simply stacked — no per-item offsets needed.
 *
 * - Neck slot (`outfitId`): none | donut-yellow | bell-collar | custom:<id>
 * - Harness (`harnessOn`): can be combined with any neck item.
 *
 * Users can still drop their own transparent PNG/WebP into the accessories folder:
 * a square image is treated as a full 1024² layer aligned with the cat; any other
 * aspect ratio is centered on the neck.
 */

export type AccessorySlot = 'outfit' | 'headwear' | 'eyewear';

export interface CustomAccessoryMeta {
  id: string;
  name: string;
  emoji?: string;
  slot: AccessorySlot;
  anchorX?: number;
  anchorY?: number;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  layer?: 'front' | 'back';
  fileName?: string;
}

export type CustomImageLoader = (accessoryId: string) => Promise<string | null>;

export interface WardrobeSelection {
  outfitId: string;
  harnessOn: boolean;
}

export const DEFAULT_WARDROBE: WardrobeSelection = {
  outfitId: 'donut-yellow',
  harnessOn: false,
};

export interface AccessoryOption {
  id: string;
  name: string;
}

export const NECK_OPTIONS: readonly AccessoryOption[] = [
  { id: 'none', name: '无' },
  { id: 'donut-yellow', name: '甜甜圈' },
  { id: 'bell-collar', name: '铃铛项圈' },
];

export function normalizeOutfitId(raw?: string | null): string {
  const s = (raw || '').trim();
  if (!s) return DEFAULT_WARDROBE.outfitId;
  if (s.startsWith('custom:') || NECK_OPTIONS.some((o) => o.id === s)) return s;
  return 'none';
}
