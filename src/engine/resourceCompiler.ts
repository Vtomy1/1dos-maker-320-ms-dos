import { GameProject, VGAColor, TileAsset, SpriteAsset, GameMap, CustomMelodyTrack } from '../types/dos';
import { getVgaDac6Bit } from './vgaPalette';
import { DEFAULT_SOUND_PRESETS } from './soundBlaster';

export interface ResourceChunkInfo {
  tag: string; // e.g. 'VPAL', 'VTIL', 'VSPR', 'VMAP', 'VAUD', 'VSEQ'
  name: string;
  category: 'graphics' | 'audio' | 'level' | 'meta';
  offset: number;
  rawSize: number;
  compiledSize: number;
  compressionRatio: number; // percentage saved, e.g. 35.4%
  isCompressed: boolean;
  itemCount: number;
  data: Uint8Array;
}

export interface CompilerOptimizationOptions {
  enableRleCompression: boolean;
  packDacPalette: boolean; // Pack 6-bit DAC to 3 bytes per color
  alignParagraph16: boolean; // Align chunk offsets to 16-byte paragraph boundaries for fast REP MOVSW
  stripTransparentBorders: boolean;
}

export const DEFAULT_OPTIMIZATION_OPTIONS: CompilerOptimizationOptions = {
  enableRleCompression: true,
  packDacPalette: false,
  alignParagraph16: true,
  stripTransparentBorders: true,
};

/**
 * Authentic MS-DOS RLE (Run-Length Encoding) Compressor
 * Similar to Id Software / Carmack RLE for Mode 13h VGA pixel buffers
 */
export function rleCompress(input: Uint8Array): Uint8Array {
  const output: number[] = [];
  const RLE_MARKER = 0xfe; // Escape token

  let i = 0;
  while (i < input.length) {
    const val = input[i];
    let runLength = 1;

    // Find run of identical bytes up to 255
    while (i + runLength < input.length && input[i + runLength] === val && runLength < 255) {
      runLength++;
    }

    if (runLength >= 3 || val === RLE_MARKER) {
      output.push(RLE_MARKER, runLength, val);
      i += runLength;
    } else {
      for (let k = 0; k < runLength; k++) {
        output.push(input[i + k]);
      }
      i += runLength;
    }
  }

  return new Uint8Array(output);
}

export function rleDecompress(input: Uint8Array, expectedLength: number): Uint8Array {
  const output = new Uint8Array(expectedLength);
  const RLE_MARKER = 0xfe;
  let outIdx = 0;
  let inIdx = 0;

  while (inIdx < input.length && outIdx < expectedLength) {
    const byte = input[inIdx++];
    if (byte === RLE_MARKER) {
      const count = input[inIdx++];
      const val = input[inIdx++];
      for (let k = 0; k < count; k++) {
        if (outIdx < expectedLength) output[outIdx++] = val;
      }
    } else {
      output[outIdx++] = byte;
    }
  }

  return output;
}

/**
 * Compiles 256-color Mode 13h palette chunk
 */
export function compilePaletteChunk(palette: VGAColor[]): { rawSize: number; data: Uint8Array } {
  const raw = new Uint8Array(768); // 256 * 3 bytes (6-bit DAC values)
  for (let i = 0; i < 256; i++) {
    const c = palette[i] || { r: 0, g: 0, b: 0 };
    const { r6, g6, b6 } = getVgaDac6Bit(c);
    raw[i * 3] = r6;
    raw[i * 3 + 1] = g6;
    raw[i * 3 + 2] = b6;
  }
  return { rawSize: 768, data: raw };
}

/**
 * Compiles 16x16 VGA tile bank with collision bitmasks
 */
export function compileTilesChunk(
  tiles: TileAsset[],
  useRle: boolean
): { rawSize: number; data: Uint8Array; isCompressed: boolean; count: number } {
  // Tile format:
  // Header: numTiles (uint16)
  // Per tile: id (uint8), isSolid (uint8), isHazard (uint8), 256 pixels (uint8[256]) = 259 bytes/tile
  const tileRecordSize = 259;
  const raw = new Uint8Array(2 + tiles.length * tileRecordSize);
  const view = new DataView(raw.buffer);
  view.setUint16(0, tiles.length, true);

  let offset = 2;
  for (const t of tiles) {
    raw[offset++] = t.id;
    raw[offset++] = t.isSolid ? 1 : 0;
    raw[offset++] = t.isHazard ? 1 : 0;
    for (let p = 0; p < 256; p++) {
      raw[offset++] = t.pixels[p] || 0;
    }
  }

  if (useRle) {
    const compressed = rleCompress(raw);
    if (compressed.length < raw.length) {
      return { rawSize: raw.length, data: compressed, isCompressed: true, count: tiles.length };
    }
  }

  return { rawSize: raw.length, data: raw, isCompressed: false, count: tiles.length };
}

/**
 * Compiles Sprite assets with multi-frame pixel arrays & metadata
 */
export function compileSpritesChunk(
  sprites: SpriteAsset[],
  useRle: boolean
): { rawSize: number; data: Uint8Array; isCompressed: boolean; count: number } {
  // Encodes: sprite count, width, height, frame count, pixel indices
  const parts: number[] = [];
  parts.push(sprites.length & 0xff, (sprites.length >> 8) & 0xff);

  for (const spr of sprites) {
    parts.push(spr.width, spr.height, spr.fps, spr.frames.length);
    for (const fr of spr.frames) {
      const numPixels = spr.width * spr.height;
      for (let p = 0; p < numPixels; p++) {
        parts.push(fr.pixels[p] || 0);
      }
    }
  }

  const raw = new Uint8Array(parts);
  if (useRle) {
    const compressed = rleCompress(raw);
    if (compressed.length < raw.length) {
      return { rawSize: raw.length, data: compressed, isCompressed: true, count: sprites.length };
    }
  }

  return { rawSize: raw.length, data: raw, isCompressed: false, count: sprites.length };
}

/**
 * Compiles Map layouts, tile indices, and packed entity tables
 */
export function compileMapsChunk(
  maps: GameMap[],
  useRle: boolean
): { rawSize: number; data: Uint8Array; isCompressed: boolean; count: number } {
  const parts: number[] = [];
  parts.push(maps.length & 0xff, (maps.length >> 8) & 0xff);

  for (const m of maps) {
    parts.push(m.width, m.height, m.tileSize, m.backgroundColor);
    // Tiles array
    const totalTiles = m.width * m.height;
    for (let t = 0; t < totalTiles; t++) {
      parts.push(m.tiles[t] || 0);
    }

    // Entities count
    parts.push(m.entities.length & 0xff, (m.entities.length >> 8) & 0xff);
    for (const ent of m.entities) {
      // 8-byte entity record: x (16b), y (16b), type (8b), speed (8b), health (8b), points (8b)
      const typeCode = ent.type === 'player' ? 1 : ent.type === 'enemy' ? 2 : ent.type === 'coin' ? 3 : 4;
      parts.push(ent.x & 0xff, (ent.x >> 8) & 0xff);
      parts.push(ent.y & 0xff, (ent.y >> 8) & 0xff);
      parts.push(typeCode);
      parts.push(Math.round(ent.speed * 10) & 0xff);
      parts.push(ent.health & 0xff);
      parts.push(Math.min(255, Math.floor(ent.points / 10)));
    }
  }

  const raw = new Uint8Array(parts);
  if (useRle) {
    const compressed = rleCompress(raw);
    if (compressed.length < raw.length) {
      return { rawSize: raw.length, data: compressed, isCompressed: true, count: maps.length };
    }
  }

  return { rawSize: raw.length, data: raw, isCompressed: false, count: maps.length };
}

/**
 * Compiles Sound Blaster presets & OPL2 synthesizer parameters
 */
export function compileAudioChunk(): { rawSize: number; data: Uint8Array; count: number } {
  const presets = DEFAULT_SOUND_PRESETS;
  // 16 bytes per preset: carrierFreq (16b), modFreq (16b), modIndex (8b), ADSR (32b), duration (16b), type (8b)
  const raw = new Uint8Array(2 + presets.length * 16);
  const view = new DataView(raw.buffer);
  view.setUint16(0, presets.length, true);

  let offset = 2;
  for (const p of presets) {
    view.setUint16(offset, p.carrierFreq || 440, true); offset += 2;
    view.setUint16(offset, p.modulatorFreq || 880, true); offset += 2;
    raw[offset++] = Math.round((p.modulationIndex || 1.5) * 10);
    raw[offset++] = Math.round((p.attack || 0.01) * 100);
    raw[offset++] = Math.round((p.decay || 0.1) * 100);
    raw[offset++] = Math.round((p.sustain || 0.3) * 100);
    raw[offset++] = Math.round((p.release || 0.1) * 100);
    view.setUint16(offset, Math.round((p.duration || 0.2) * 1000), true); offset += 2;
    raw[offset++] = p.synthType === 'opl2_fm' ? 1 : 2;
    raw[offset++] = p.noiseMix ? Math.round(p.noiseMix * 100) : 0;
    offset += 2; // padding to 16 bytes
  }

  return { rawSize: raw.length, data: raw, count: presets.length };
}

/**
 * Compiles OPL2 2-Channel Music Sequencer track
 */
export function compileMusicSequencerChunk(melody?: CustomMelodyTrack): { rawSize: number; data: Uint8Array } {
  if (!melody) {
    return { rawSize: 0, data: new Uint8Array(0) };
  }

  // Header: BPM (16b), stepCount (16b), ch1Inst (8b), ch2Inst (8b)
  const headerSize = 6;
  const numSteps = melody.stepsCount;
  const raw = new Uint8Array(headerSize + numSteps * 2);
  const view = new DataView(raw.buffer);
  view.setUint16(0, melody.bpm, true);
  view.setUint16(2, melody.stepsCount, true);
  raw[4] = melody.channel1.instrument === 'square' ? 1 : melody.channel1.instrument === 'brass' ? 2 : 3;
  raw[5] = melody.channel2.instrument === 'synth_bass' ? 1 : 2;

  let offset = 6;
  for (let i = 0; i < numSteps; i++) {
    // Pack note names to 1-byte note index (1-48, 0 for rest)
    const n1 = melody.channel1.steps[i];
    const n2 = melody.channel2.steps[i];
    raw[offset++] = n1 ? n1.charCodeAt(0) + (parseInt(n1.slice(-1), 10) || 4) : 0;
    raw[offset++] = n2 ? n2.charCodeAt(0) + (parseInt(n2.slice(-1), 10) || 3) : 0;
  }

  return { rawSize: raw.length, data: raw };
}

/**
 * Compiles entire MS-DOS Game Resource Blob (.DAT / .RES)
 */
export function compileProjectResources(
  project: GameProject,
  options: CompilerOptimizationOptions = DEFAULT_OPTIMIZATION_OPTIONS
): {
  chunks: ResourceChunkInfo[];
  totalRawBytes: number;
  totalCompiledBytes: number;
  totalSavedBytes: number;
  combinedBinary: Uint8Array;
} {
  const chunks: ResourceChunkInfo[] = [];

  // 1. Palette Chunk (VPAL)
  const pal = compilePaletteChunk(project.palette);
  chunks.push({
    tag: 'VPAL',
    name: 'VGA Mode 13h DAC Palette',
    category: 'graphics',
    offset: 0,
    rawSize: pal.rawSize,
    compiledSize: pal.data.length,
    compressionRatio: 0,
    isCompressed: false,
    itemCount: 256,
    data: pal.data,
  });

  // 2. Tiles Chunk (VTIL)
  const til = compileTilesChunk(project.tiles, options.enableRleCompression);
  const tilRatio = Math.max(0, Math.round(((til.rawSize - til.data.length) / til.rawSize) * 100));
  chunks.push({
    tag: 'VTIL',
    name: '16x16 VGA Tilemap Bank',
    category: 'graphics',
    offset: 0,
    rawSize: til.rawSize,
    compiledSize: til.data.length,
    compressionRatio: tilRatio,
    isCompressed: til.isCompressed,
    itemCount: til.count,
    data: til.data,
  });

  // 3. Sprites Chunk (VSPR)
  const spr = compileSpritesChunk(project.sprites, options.enableRleCompression);
  const sprRatio = Math.max(0, Math.round(((spr.rawSize - spr.data.length) / spr.rawSize) * 100));
  chunks.push({
    tag: 'VSPR',
    name: 'VGA Sprite Bank & Animations',
    category: 'graphics',
    offset: 0,
    rawSize: spr.rawSize,
    compiledSize: spr.data.length,
    compressionRatio: sprRatio,
    isCompressed: spr.isCompressed,
    itemCount: spr.count,
    data: spr.data,
  });

  // 4. Map & Entities Chunk (VMAP)
  const map = compileMapsChunk(project.maps, options.enableRleCompression);
  const mapRatio = Math.max(0, Math.round(((map.rawSize - map.data.length) / map.rawSize) * 100));
  chunks.push({
    tag: 'VMAP',
    name: '320x200 Level & Entity Table',
    category: 'level',
    offset: 0,
    rawSize: map.rawSize,
    compiledSize: map.data.length,
    compressionRatio: mapRatio,
    isCompressed: map.isCompressed,
    itemCount: map.count,
    data: map.data,
  });

  // 5. Sound Blaster 16 & OPL2 SFX Chunk (VAUD)
  const aud = compileAudioChunk();
  chunks.push({
    tag: 'VAUD',
    name: 'Sound Blaster 16 SFX Bank',
    category: 'audio',
    offset: 0,
    rawSize: aud.rawSize,
    compiledSize: aud.data.length,
    compressionRatio: 0,
    isCompressed: false,
    itemCount: aud.count,
    data: aud.data,
  });

  // 6. OPL2 Music Sequencer Track Chunk (VSEQ)
  if (project.customMelody) {
    const seq = compileMusicSequencerChunk(project.customMelody);
    chunks.push({
      tag: 'VSEQ',
      name: 'OPL2 2-Channel Music Track',
      category: 'audio',
      offset: 0,
      rawSize: seq.rawSize,
      compiledSize: seq.data.length,
      compressionRatio: 0,
      isCompressed: false,
      itemCount: project.customMelody.stepsCount,
      data: seq.data,
    });
  }

  // Calculate file layout and offsets
  // Header: 'DOSM' (4B), Version (2B), numChunks (2B) = 8 bytes
  // Chunk Directory: per chunk: tag (4B), flags (2B), offset (32b), rawSize (32b), compSize (32b) = 16 bytes
  const headerSize = 8;
  const dirSize = chunks.length * 16;
  let currentOffset = headerSize + dirSize;

  let totalRaw = 0;
  let totalComp = currentOffset;

  for (const c of chunks) {
    if (options.alignParagraph16 && currentOffset % 16 !== 0) {
      currentOffset += 16 - (currentOffset % 16); // Align to 16-byte paragraph
    }
    c.offset = currentOffset;
    currentOffset += c.compiledSize;
    totalRaw += c.rawSize;
    totalComp = currentOffset;
  }

  // Build the unified binary package
  const combined = new Uint8Array(totalComp);
  const view = new DataView(combined.buffer);

  // Magic 'DOSM' (0x44, 0x4F, 0x53, 0x4D)
  combined[0] = 0x44; combined[1] = 0x4f; combined[2] = 0x53; combined[3] = 0x4d;
  view.setUint16(4, 0x0100, true); // v1.0
  view.setUint16(6, chunks.length, true);

  // Write Directory
  let dirOffset = 8;
  for (const c of chunks) {
    // 4-char tag
    for (let i = 0; i < 4; i++) {
      combined[dirOffset + i] = c.tag.charCodeAt(i) || 0x20;
    }
    view.setUint16(dirOffset + 4, c.isCompressed ? 0x0001 : 0x0000, true);
    view.setUint32(dirOffset + 6, c.offset, true);
    view.setUint32(dirOffset + 10, c.rawSize, true);
    view.setUint32(dirOffset + 14, c.compiledSize, true);
    dirOffset += 18; // 4 + 2 + 4 + 4 + 4 = 18 bytes
  }

  // Write Chunk Payloads
  for (const c of chunks) {
    combined.set(c.data, c.offset);
  }

  return {
    chunks,
    totalRawBytes: totalRaw,
    totalCompiledBytes: totalComp,
    totalSavedBytes: Math.max(0, totalRaw - totalComp),
    combinedBinary: combined,
  };
}

/**
 * Generates C Header defining resource chunk offsets & structures for Turbo C
 */
export function generateResourceCHeader(chunks: ResourceChunkInfo[]): string {
  const defines = chunks
    .map(
      (c) =>
        `#define RES_${c.tag}_OFFSET 0x${c.offset.toString(16).toUpperCase().padStart(4, '0')}L /* ${c.name} (${c.compiledSize} B) */\n` +
        `#define RES_${c.tag}_SIZE   ${c.compiledSize}L`
    )
    .join('\n');

  return `/*
 * MS-DOS Game Resource Table Header (RESOURCES.H)
 * Target: Borland Turbo C 2.0 / 3.0 / Mode 13h
 * Auto-generated by DOSMaker 320 Resource Compiler
 */

#ifndef _RESOURCES_H_
#define _RESOURCES_H_

#define RES_MAGIC 0x4D534F44L /* 'DOSM' */
#define RES_NUM_CHUNKS ${chunks.length}

/* Chunk Offsets in GAME.DAT / Executable Data Segment */
${defines}

struct ResourceEntry {
    char tag[4];
    unsigned short flags;
    unsigned long offset;
    unsigned long raw_size;
    unsigned long comp_size;
};

#endif /* _RESOURCES_H_ */
`;
}
