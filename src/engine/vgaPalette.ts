import { VGAColor } from '../types/dos';

/**
 * Standard 16-color MS-DOS CGA/EGA/VGA Palette
 */
export const DOS_16_COLORS: VGAColor[] = [
  { index: 0,  r: 0,   g: 0,   b: 0,   name: '00: Black' },
  { index: 1,  r: 0,   g: 0,   b: 170, name: '01: Blue' },
  { index: 2,  r: 0,   g: 170, b: 0,   name: '02: Green' },
  { index: 3,  r: 0,   g: 170, b: 170, name: '03: Cyan' },
  { index: 4,  r: 170, g: 0,   b: 0,   name: '04: Red' },
  { index: 5,  r: 170, g: 0,   b: 170, name: '05: Magenta' },
  { index: 6,  r: 170, g: 85,  b: 0,   name: '06: Brown' },
  { index: 7,  r: 170, g: 170, b: 170, name: '07: Light Gray' },
  { index: 8,  r: 85,  g: 85,  b: 85,  name: '08: Dark Gray' },
  { index: 9,  r: 85,  g: 85,  b: 255, name: '09: Bright Blue' },
  { index: 10, r: 85,  g: 255, b: 85,  name: '10: Bright Green' },
  { index: 11, r: 85,  g: 255, b: 255, name: '11: Bright Cyan' },
  { index: 12, r: 255, g: 85,  b: 85,  name: '12: Bright Red' },
  { index: 13, r: 255, g: 85,  b: 255, name: '13: Bright Magenta' },
  { index: 14, r: 255, g: 255, b: 85,  name: '14: Yellow' },
  { index: 15, r: 255, g: 255, b: 255, name: '15: Bright White' },
];

/**
 * Generate full 256-Color VGA Mode 13h Default Palette
 * Matches authentic IBM VGA BIOS DAC registers
 */
export function generateDefaultVgaPalette(): VGAColor[] {
  const palette: VGAColor[] = [...DOS_16_COLORS];

  // 16 Gray shades (16 - 31)
  for (let i = 0; i < 16; i++) {
    const val = Math.floor((i / 15) * 255);
    palette.push({
      index: 16 + i,
      r: val,
      g: val,
      b: val,
      name: `Gray scale ${i + 1}`,
    });
  }

  // Next 216 colors (32 - 247): 6x6x6 color cube / VGA color ramps
  const levels = [0, 51, 102, 153, 204, 255];
  let curIndex = 32;

  // Primary color ramps for rich retro DOS game art
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        if (curIndex < 248) {
          palette.push({
            index: curIndex,
            r: levels[r],
            g: levels[g],
            b: levels[b],
            name: `VGA #${curIndex} (R:${levels[r]} G:${levels[g]} B:${levels[b]})`,
          });
          curIndex++;
        }
      }
    }
  }

  // Remaining 8 colors (248-255) - Classic game colors (skin, gold, neon, deep purple)
  const specialColors = [
    { r: 235, g: 180, b: 140, name: 'Peach / Skin' },
    { r: 200, g: 140, b: 100, name: 'Tan Skin' },
    { r: 255, g: 215, b: 0,   name: 'Gold' },
    { r: 184, g: 134, b: 11,  name: 'Dark Goldenrod' },
    { r: 0,   g: 255, b: 128, name: 'Spring Green' },
    { r: 255, g: 105, b: 180, name: 'Hot Pink' },
    { r: 75,  g: 0,   b: 130, name: 'Indigo' },
    { r: 139, g: 69,  b: 19,  name: 'Saddle Brown' },
  ];

  for (let i = 0; i < specialColors.length; i++) {
    palette.push({
      index: 248 + i,
      r: specialColors[i].r,
      g: specialColors[i].g,
      b: specialColors[i].b,
      name: specialColors[i].name,
    });
  }

  return palette;
}

export function getColorCss(color: VGAColor, alpha = 1): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

export function getColorHex(color: VGAColor): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

/**
 * VGA hardware uses 6-bit DAC values (0 to 63)
 * Port 3C8h (PEL Address Write Mode), Port 3C9h (PEL Data Register)
 */
export function getVgaDac6Bit(color: VGAColor): { r6: number; g6: number; b6: number } {
  return {
    r6: Math.floor((color.r * 63) / 255),
    g6: Math.floor((color.g * 63) / 255),
    b6: Math.floor((color.b * 63) / 255),
  };
}

export function from6BitDac(r6: number, g6: number, b6: number): { r: number; g: number; b: number } {
  return {
    r: Math.min(255, Math.max(0, Math.round((r6 * 255) / 63))),
    g: Math.min(255, Math.max(0, Math.round((g6 * 255) / 63))),
    b: Math.min(255, Math.max(0, Math.round((b6 * 255) / 63))),
  };
}

/**
 * Generate Preset Palettes for Mode 13h
 */
export function generatePresetPalette(
  type: 'default' | 'doom' | 'cyberpunk' | 'amber' | 'gameboy' | 'grayscale'
): VGAColor[] {
  if (type === 'default') {
    return generateDefaultVgaPalette();
  }

  const result: VGAColor[] = [];

  if (type === 'grayscale') {
    for (let i = 0; i < 256; i++) {
      const v = Math.floor((i / 255) * 255);
      result.push({
        index: i,
        r: v,
        g: v,
        b: v,
        name: `Gray #${i}`,
      });
    }
    return result;
  }

  if (type === 'amber') {
    for (let i = 0; i < 256; i++) {
      const frac = i / 255;
      result.push({
        index: i,
        r: Math.floor(frac * 255),
        g: Math.floor(frac * 176),
        b: Math.floor(frac * 0),
        name: `Amber #${i}`,
      });
    }
    return result;
  }

  if (type === 'gameboy') {
    const gbTones = [
      { r: 15, g: 56, b: 15 },
      { r: 48, g: 98, b: 48 },
      { r: 139, g: 172, b: 15 },
      { r: 155, g: 188, b: 15 },
    ];
    for (let i = 0; i < 256; i++) {
      const tone = gbTones[Math.floor((i / 256) * gbTones.length)];
      const sub = (i % 64) / 64;
      result.push({
        index: i,
        r: Math.min(255, Math.floor(tone.r + sub * 40)),
        g: Math.min(255, Math.floor(tone.g + sub * 40)),
        b: Math.min(255, Math.floor(tone.b + sub * 40)),
        name: `GameBoy #${i}`,
      });
    }
    return result;
  }

  if (type === 'cyberpunk') {
    // Synthwave / Neon palette: Purples, hot pinks, cyans, neons
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let r = 0, g = 0, b = 0;
      if (t < 0.33) {
        // Deep purple to neon magenta
        const f = t / 0.33;
        r = Math.floor(50 + f * 205);
        g = Math.floor(f * 20);
        b = Math.floor(100 + f * 155);
      } else if (t < 0.66) {
        // Neon magenta to bright cyan
        const f = (t - 0.33) / 0.33;
        r = Math.floor(255 * (1 - f));
        g = Math.floor(f * 255);
        b = 255;
      } else {
        // Bright cyan to yellow neon
        const f = (t - 0.66) / 0.34;
        r = Math.floor(f * 255);
        g = 255;
        b = Math.floor(255 * (1 - f));
      }
      result.push({
        index: i,
        r,
        g,
        b,
        name: `Cyber #${i}`,
      });
    }
    return result;
  }

  if (type === 'doom') {
    // Gritty dark browns, blood reds, tarnished metals, hellfire
    for (let i = 0; i < 256; i++) {
      let r = 0, g = 0, b = 0;
      if (i < 32) {
        // Dark blacks to grays
        const f = i / 31;
        r = g = b = Math.floor(f * 120);
      } else if (i < 96) {
        // Dirt / Leather / Brown ramps
        const f = (i - 32) / 63;
        r = Math.floor(40 + f * 140);
        g = Math.floor(20 + f * 80);
        b = Math.floor(10 + f * 30);
      } else if (i < 160) {
        // Hellfire reds & blood
        const f = (i - 96) / 63;
        r = Math.floor(80 + f * 175);
        g = Math.floor(f * 35);
        b = Math.floor(f * 15);
      } else if (i < 224) {
        // Slime & toxic waste green
        const f = (i - 160) / 63;
        r = Math.floor(f * 60);
        g = Math.floor(60 + f * 180);
        b = Math.floor(f * 40);
      } else {
        // Plasma blue
        const f = (i - 224) / 31;
        r = Math.floor(f * 80);
        g = Math.floor(f * 150);
        b = Math.floor(120 + f * 135);
      }
      result.push({
        index: i,
        r,
        g,
        b,
        name: `Doom #${i}`,
      });
    }
    return result;
  }

  return generateDefaultVgaPalette();
}

/**
 * Generates 768-byte raw VGA .PAL file (standard 6-bit DAC values 0-63 per channel)
 */
export function exportRawPalBinary(palette: VGAColor[]): Uint8Array {
  const bytes = new Uint8Array(768);
  for (let i = 0; i < 256; i++) {
    const c = palette[i] || { r: 0, g: 0, b: 0 };
    const { r6, g6, b6 } = getVgaDac6Bit(c);
    bytes[i * 3] = r6;
    bytes[i * 3 + 1] = g6;
    bytes[i * 3 + 2] = b6;
  }
  return bytes;
}

/**
 * Generates Borland Turbo C palette loader code
 */
export function exportPaletteCCode(palette: VGAColor[]): string {
  const rows: string[] = [];
  for (let i = 0; i < 256; i++) {
    const c = palette[i] || { r: 0, g: 0, b: 0 };
    const { r6, g6, b6 } = getVgaDac6Bit(c);
    rows.push(`    {${r6}, ${g6}, ${b6}}, /* #${i} */`);
  }

  return `/*
 * MS-DOS VGA Mode 13h Custom 256-Color Palette
 * Format: 6-bit DAC values (0-63)
 * Load via Port 0x3C8 (PEL Address) & 0x3C9 (PEL Data)
 */

#include <dos.h>

const unsigned char vga_palette[256][3] = {
${rows.join('\n')}
};

void load_vga_palette(void) {
    int i;
    outp(0x3C8, 0); /* Start at color index 0 */
    for (i = 0; i < 256; i++) {
        outp(0x3C9, vga_palette[i][0]); /* Red   (0-63) */
        outp(0x3C9, vga_palette[i][1]); /* Green (0-63) */
        outp(0x3C9, vga_palette[i][2]); /* Blue  (0-63) */
    }
}
`;
}

