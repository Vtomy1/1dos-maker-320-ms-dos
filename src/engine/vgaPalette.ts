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
