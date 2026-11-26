export interface KeySpec {
  id: string;
  label: string;
  bubble: string;
  row: number;
  uStart: number;
  uWidth: number;
  accent?: 'orange' | 'mod';
  vkCodes: number[];
}

export const TOTAL_UNITS = 15;
export const TOTAL_ROWS = 5;
export const VK_NUMPAD_ENTER = 0x10d;

export const KEYBOARD_KEYS: KeySpec[] = [
  // Row 0
  { id: 'esc', label: 'ESC', bubble: 'Esc', row: 0, uStart: 0, uWidth: 1, accent: 'orange', vkCodes: [0x1b, 0xc0] },
  { id: '1', label: '1', bubble: '1', row: 0, uStart: 1, uWidth: 1, vkCodes: [0x31, 0x61, 0x70] },
  { id: '2', label: '2', bubble: '2', row: 0, uStart: 2, uWidth: 1, vkCodes: [0x32, 0x62, 0x71] },
  { id: '3', label: '3', bubble: '3', row: 0, uStart: 3, uWidth: 1, vkCodes: [0x33, 0x63, 0x72] },
  { id: '4', label: '4', bubble: '4', row: 0, uStart: 4, uWidth: 1, vkCodes: [0x34, 0x64, 0x73] },
  { id: '5', label: '5', bubble: '5', row: 0, uStart: 5, uWidth: 1, vkCodes: [0x35, 0x65, 0x74] },
  { id: '6', label: '6', bubble: '6', row: 0, uStart: 6, uWidth: 1, vkCodes: [0x36, 0x66, 0x75] },
  { id: '7', label: '7', bubble: '7', row: 0, uStart: 7, uWidth: 1, vkCodes: [0x37, 0x67, 0x76] },
  { id: '8', label: '8', bubble: '8', row: 0, uStart: 8, uWidth: 1, vkCodes: [0x38, 0x68, 0x77] },
  { id: '9', label: '9', bubble: '9', row: 0, uStart: 9, uWidth: 1, vkCodes: [0x39, 0x69, 0x78] },
  { id: '0', label: '0', bubble: '0', row: 0, uStart: 10, uWidth: 1, vkCodes: [0x30, 0x60, 0x79] },
  { id: 'minus', label: '-', bubble: '-', row: 0, uStart: 11, uWidth: 1, vkCodes: [0xbd, 0x6d, 0x7a] },
  { id: 'equal', label: '=', bubble: '=', row: 0, uStart: 12, uWidth: 1, vkCodes: [0xbb, 0x6b, 0x7b] },
  { id: 'bs', label: '⌫', bubble: '⌫', row: 0, uStart: 13, uWidth: 2, accent: 'mod', vkCodes: [0x08, 0x2e] },

  // Row 1
  { id: 'tab', label: '↹', bubble: 'Tab', row: 1, uStart: 0, uWidth: 1.5, accent: 'mod', vkCodes: [0x09] },
  { id: 'q', label: 'Q', bubble: 'Q', row: 1, uStart: 1.5, uWidth: 1, vkCodes: [0x51] },
  { id: 'w', label: 'W', bubble: 'W', row: 1, uStart: 2.5, uWidth: 1, vkCodes: [0x57] },
  { id: 'e', label: 'E', bubble: 'E', row: 1, uStart: 3.5, uWidth: 1, vkCodes: [0x45] },
  { id: 'r', label: 'R', bubble: 'R', row: 1, uStart: 4.5, uWidth: 1, vkCodes: [0x52] },
  { id: 't', label: 'T', bubble: 'T', row: 1, uStart: 5.5, uWidth: 1, vkCodes: [0x54] },
  { id: 'y', label: 'Y', bubble: 'Y', row: 1, uStart: 6.5, uWidth: 1, vkCodes: [0x59] },
  { id: 'u', label: 'U', bubble: 'U', row: 1, uStart: 7.5, uWidth: 1, vkCodes: [0x55] },
  { id: 'i', label: 'I', bubble: 'I', row: 1, uStart: 8.5, uWidth: 1, vkCodes: [0x49] },
  { id: 'o', label: 'O', bubble: 'O', row: 1, uStart: 9.5, uWidth: 1, vkCodes: [0x4f] },
  { id: 'p', label: 'P', bubble: 'P', row: 1, uStart: 10.5, uWidth: 1, vkCodes: [0x50] },
  { id: 'lb', label: '[', bubble: '[', row: 1, uStart: 11.5, uWidth: 1, vkCodes: [0xdb] },
  { id: 'rb', label: ']', bubble: ']', row: 1, uStart: 12.5, uWidth: 1, vkCodes: [0xdd] },
  { id: 'bslash', label: '\\', bubble: '\\', row: 1, uStart: 13.5, uWidth: 1.5, accent: 'mod', vkCodes: [0xdc, 0x2d, 0x24] },

  // Row 2
  { id: 'caps', label: '⇪', bubble: 'Caps', row: 2, uStart: 0, uWidth: 1.75, accent: 'mod', vkCodes: [0x14] },
  { id: 'a', label: 'A', bubble: 'A', row: 2, uStart: 1.75, uWidth: 1, vkCodes: [0x41] },
  { id: 's', label: 'S', bubble: 'S', row: 2, uStart: 2.75, uWidth: 1, vkCodes: [0x53] },
  { id: 'd', label: 'D', bubble: 'D', row: 2, uStart: 3.75, uWidth: 1, vkCodes: [0x44] },
  { id: 'f', label: 'F', bubble: 'F', row: 2, uStart: 4.75, uWidth: 1, vkCodes: [0x46] },
  { id: 'g', label: 'G', bubble: 'G', row: 2, uStart: 5.75, uWidth: 1, vkCodes: [0x47] },
  { id: 'h', label: 'H', bubble: 'H', row: 2, uStart: 6.75, uWidth: 1, vkCodes: [0x48] },
  { id: 'j', label: 'J', bubble: 'J', row: 2, uStart: 7.75, uWidth: 1, vkCodes: [0x4a] },
  { id: 'k', label: 'K', bubble: 'K', row: 2, uStart: 8.75, uWidth: 1, vkCodes: [0x4b] },
  { id: 'l', label: 'L', bubble: 'L', row: 2, uStart: 9.75, uWidth: 1, vkCodes: [0x4c] },
  { id: 'semi', label: ';', bubble: ';', row: 2, uStart: 10.75, uWidth: 1, vkCodes: [0xba] },
  { id: 'quote', label: "'", bubble: "'", row: 2, uStart: 11.75, uWidth: 1, vkCodes: [0xde] },
  { id: 'enter', label: '↵', bubble: '↵', row: 2, uStart: 12.75, uWidth: 2.25, accent: 'mod', vkCodes: [0x0d, VK_NUMPAD_ENTER] },

  // Row 3
  { id: 'lshift', label: '⇧', bubble: '⇧', row: 3, uStart: 0, uWidth: 2.25, accent: 'mod', vkCodes: [0xa0, 0x10] },
  { id: 'z', label: 'Z', bubble: 'Z', row: 3, uStart: 2.25, uWidth: 1, vkCodes: [0x5a] },
  { id: 'x', label: 'X', bubble: 'X', row: 3, uStart: 3.25, uWidth: 1, vkCodes: [0x58] },
  { id: 'c', label: 'C', bubble: 'C', row: 3, uStart: 4.25, uWidth: 1, vkCodes: [0x43] },
  { id: 'v', label: 'V', bubble: 'V', row: 3, uStart: 5.25, uWidth: 1, vkCodes: [0x56] },
  { id: 'b', label: 'B', bubble: 'B', row: 3, uStart: 6.25, uWidth: 1, vkCodes: [0x42] },
  { id: 'n', label: 'N', bubble: 'N', row: 3, uStart: 7.25, uWidth: 1, vkCodes: [0x4e] },
  { id: 'm', label: 'M', bubble: 'M', row: 3, uStart: 8.25, uWidth: 1, vkCodes: [0x4d] },
  { id: 'comma', label: ',', bubble: ',', row: 3, uStart: 9.25, uWidth: 1, vkCodes: [0xbc] },
  { id: 'dot', label: '.', bubble: '.', row: 3, uStart: 10.25, uWidth: 1, vkCodes: [0xbe, 0x6e] },
  { id: 'slash', label: '/', bubble: '/', row: 3, uStart: 11.25, uWidth: 1, vkCodes: [0xbf, 0x6f] },
  { id: 'rshift', label: '⇧', bubble: '⇧', row: 3, uStart: 12.25, uWidth: 2.75, accent: 'orange', vkCodes: [0xa1] },

  // Row 4 (macOS symbols)
  { id: 'lctrl', label: '⌃', bubble: '⌃', row: 4, uStart: 0, uWidth: 1.25, accent: 'mod', vkCodes: [0xa2, 0x11] },
  { id: 'lwin', label: '⌘', bubble: '⌘', row: 4, uStart: 1.25, uWidth: 1.25, accent: 'mod', vkCodes: [0x5b, 0x5c] },
  { id: 'lalt', label: '⌥', bubble: '⌥', row: 4, uStart: 2.5, uWidth: 1.25, accent: 'mod', vkCodes: [0xa4, 0x12] },
  { id: 'space', label: '␣', bubble: '␣', row: 4, uStart: 3.75, uWidth: 6.25, vkCodes: [0x20] },
  { id: 'ralt', label: '⌥', bubble: '⌥', row: 4, uStart: 10, uWidth: 1, accent: 'mod', vkCodes: [0xa5, 0xa3] },
  { id: 'left', label: '←', bubble: '←', row: 4, uStart: 11, uWidth: 1, accent: 'mod', vkCodes: [0x25, 0x23] },
  { id: 'down', label: '↓', bubble: '↓', row: 4, uStart: 12, uWidth: 1, accent: 'mod', vkCodes: [0x28, 0x22] },
  { id: 'up', label: '↑', bubble: '↑', row: 4, uStart: 13, uWidth: 1, accent: 'mod', vkCodes: [0x26, 0x21] },
  { id: 'right', label: '→', bubble: '→', row: 4, uStart: 14, uWidth: 1, accent: 'mod', vkCodes: [0x27] },
];

const vkLookup = new Map<number, KeySpec>();
for (const key of KEYBOARD_KEYS) {
  for (const vk of key.vkCodes) vkLookup.set(vk, key);
}

export function resolveKeyByVk(vk: number): KeySpec | null {
  const direct = vkLookup.get(vk);
  if (direct) return direct;
  if (vk >= 0x70 && vk <= 0x87) {
    const idx = Math.min(12, Math.max(1, vk - 0x6f));
    return KEYBOARD_KEYS[idx] ?? KEYBOARD_KEYS[0];
  }
  return null;
}

export function formatBubbleForVk(vk: number, fallbackSpec: KeySpec | null): string {
  if (fallbackSpec?.bubble) return fallbackSpec.bubble;
  if (vk >= 0x70 && vk <= 0x7b) return `F${vk - 0x6f}`;
  if (vk === VK_NUMPAD_ENTER) return '↵';
  if (vk === 0xc0) return '`';
  if (vk === 0x2e) return 'Del';
  return '';
}
