/**
 * MS-DOS & VGA Type Definitions
 * Mode 13h (320x200, 256 colors), Sound Blaster 16 / OPL2, MZ Executable Header
 */

export interface VGAColor {
  index: number;
  r: number; // 0-255 in RGB (DAC uses 0-63)
  g: number;
  b: number;
  name: string;
}

export interface SpriteFrame {
  id: string;
  name: string;
  width: number; // 8 or 16
  height: number; // 8 or 16
  pixels: number[]; // Array of color palette indices (0-255), 0 usually transparent
}

export interface SpriteAsset {
  id: string;
  name: string;
  type: 'player' | 'enemy' | 'item' | 'bullet' | 'boss';
  width: number;
  height: number;
  frames: SpriteFrame[];
  fps: number;
}

export interface TileAsset {
  id: number; // 0 is empty/air
  name: string;
  isSolid: boolean;
  isHazard: boolean;
  isWater: boolean;
  isLadder: boolean;
  pixels: number[]; // 16x16 palette indices
}

export interface GameEntity {
  id: string;
  spriteId: string;
  x: number; // pixel coordinate
  y: number;
  type: 'player' | 'enemy' | 'coin' | 'key' | 'door' | 'goal' | 'hazard' | 'bullet';
  name: string;
  behavior: 'patrol' | 'chase' | 'static' | 'bounce' | 'flying' | 'shooter';
  speed: number;
  health: number;
  points: number;
}

export interface GameMap {
  width: number; // tiles (e.g. 20 for one screen, 40 for scrolling)
  height: number; // tiles (e.g. 12 tiles of 16x16 = 192px + 8px HUD = 200px)
  tileSize: number; // 16
  tiles: number[]; // Tile IDs
  entities: GameEntity[];
  backgroundColor: number; // Palette index
  name: string;
}

export interface SoundPreset {
  id: string;
  name: string;
  type: 'sfx' | 'music';
  category: 'jump' | 'coin' | 'hit' | 'explosion' | 'laser' | 'powerup' | 'step' | 'theme';
  synthType: 'opl2_fm' | 'dsp_pcm';
  // OPL2 2-Operator parameters
  carrierWave: 'sine' | 'square' | 'sawtooth' | 'triangle';
  modulatorWave: 'sine' | 'square' | 'sawtooth' | 'triangle';
  carrierFreq: number;
  modulatorFreq: number;
  modulationIndex: number; // FM depth
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  pitchDecay?: number;
  noiseMix?: number;
  duration: number;
}

export interface SoundBlasterConfig {
  basePort: string; // '220h'
  irq: number; // 7 or 5
  dma8: number; // 1
  dma16: number; // 5
  type: number; // 6 = SB16
  oplEnabled: boolean;
  dspSampleRate: number; // 11025, 22050
  masterVolume: number; // 0 - 100
}

export interface MZHeader {
  e_magic: number; // 0x5A4D ('MZ')
  e_cblp: number; // Bytes on last 512-byte page
  e_cp: number; // Pages in file
  e_crlc: number; // Relocations
  e_cparhdr: number; // Size of header in paragraphs (16-byte chunks)
  e_minalloc: number; // Minimum extra paragraphs needed
  e_maxalloc: number; // Maximum extra paragraphs needed
  e_ss: number; // Initial relative SS value
  e_sp: number; // Initial SP value
  e_csum: number; // Checksum
  e_ip: number; // Initial IP value
  e_cs: number; // Initial relative CS value
  e_lfarlc: number; // File address of relocation table
  e_ovno: number; // Overlay number
  e_res: number[]; // Reserved words
}

export interface CustomMelodyTrack {
  id: string;
  name: string;
  bpm: number; // 60 - 240
  stepsCount: number; // 16 or 32
  channel1: {
    name: string;
    instrument: 'square' | 'sine' | 'sawtooth' | 'brass';
    volume: number; // 0 to 1
    octave: number;
    steps: (string | null)[]; // array of note names like 'C4', 'E4' or null
  };
  channel2: {
    name: string;
    instrument: 'synth_bass' | 'opl_triangle' | 'pulse' | 'organ';
    volume: number;
    octave: number;
    steps: (string | null)[];
  };
}

export interface GameProject {
  title: string;
  author: string;
  version: string;
  genre: 'platformer' | 'rpg_topdown' | 'space_shooter';
  description: string;
  playerSettings: {
    speed: number;
    jumpForce: number;
    gravity: number;
    maxHealth: number;
    hasGun: boolean;
  };
  soundSettings: {
    sfxJump: string;
    sfxCoin: string;
    sfxHit: string;
    sfxShoot: string;
    sfxExplosion: string;
    sfxWin: string;
    bgmId: string;
  };
  customMelody?: CustomMelodyTrack;
  palette: VGAColor[];
  sprites: SpriteAsset[];
  tiles: TileAsset[];
  maps: GameMap[];
  activeMapIndex: number;
  sbConfig: SoundBlasterConfig;
  mzHeaderConfig: Partial<MZHeader>;
}
