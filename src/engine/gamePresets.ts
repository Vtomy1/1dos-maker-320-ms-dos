import { GameProject, SpriteAsset, TileAsset, GameMap } from '../types/dos';
import { generateDefaultVgaPalette } from './vgaPalette';
import { DEFAULT_SB_CONFIG } from './soundBlaster';

// Helper to create 16x16 pixel array from strings
function parse16x16(art: string[]): number[] {
  const result: number[] = [];
  for (let y = 0; y < 16; y++) {
    const row = art[y] || '................';
    for (let x = 0; x < 16; x++) {
      const char = row[x] || '.';
      if (char === '.') result.push(0); // Transparent / background
      else if (char === '0') result.push(0);
      else if (char === '1') result.push(1); // Blue
      else if (char === '2') result.push(2); // Green
      else if (char === '3') result.push(3); // Cyan
      else if (char === '4') result.push(4); // Red
      else if (char === '5') result.push(5); // Magenta
      else if (char === '6') result.push(6); // Brown
      else if (char === '7') result.push(7); // Light Gray
      else if (char === '8') result.push(8); // Dark Gray
      else if (char === '9') result.push(9); // Bright Blue
      else if (char === 'A' || char === 'a') result.push(10); // Bright Green
      else if (char === 'B' || char === 'b') result.push(11); // Bright Cyan
      else if (char === 'C' || char === 'c') result.push(12); // Bright Red
      else if (char === 'D' || char === 'd') result.push(13); // Bright Magenta
      else if (char === 'E' || char === 'e') result.push(14); // Yellow
      else if (char === 'F' || char === 'f') result.push(15); // White
      else if (char === 'P' || char === 'p') result.push(248); // Peach skin
      else result.push(0);
    }
  }
  return result;
}

// === COMMANDER KEEN-STYLE PRESETS ===
const KEEN_PLAYER_SPRITE: SpriteAsset = {
  id: 'spr_keen_player',
  name: 'Commander Billy',
  type: 'player',
  width: 16,
  height: 16,
  fps: 6,
  frames: [
    {
      id: 'f1',
      name: 'Idle',
      width: 16,
      height: 16,
      pixels: parse16x16([
        '.....22222......',
        '....22AAAA22....',
        '....2AppppA2....',
        '....2App0pA2....',
        '....2ppppp2.....',
        '.....44444......',
        '....444E444.....',
        '....444E444.....',
        '....4144414.....',
        '.....11111......',
        '.....11.11......',
        '.....99.99......',
        '.....99.99......',
        '....FFF.FFF.....',
        '....FFF.FFF.....',
        '................',
      ]),
    },
    {
      id: 'f2',
      name: 'Walk',
      width: 16,
      height: 16,
      pixels: parse16x16([
        '.....22222......',
        '....22AAAA22....',
        '....2AppppA2....',
        '....2App0pA2....',
        '....2ppppp2.....',
        '.....44444......',
        '....444E444.....',
        '....444E444.....',
        '....4144414.....',
        '.....11111......',
        '....11...11.....',
        '....99...99.....',
        '...FFF...99.....',
        '...FFF...FFF....',
        '.........FFF....',
        '................',
      ]),
    },
  ],
};

const KEEN_ENEMY_SLUG: SpriteAsset = {
  id: 'spr_slug',
  name: 'Vorticon Slug',
  type: 'enemy',
  width: 16,
  height: 16,
  fps: 4,
  frames: [
    {
      id: 'f1',
      name: 'Crawl 1',
      width: 16,
      height: 16,
      pixels: parse16x16([
        '................',
        '................',
        '.......22.......',
        '......2FF2......',
        '......2002......',
        '.....2AAAA2.....',
        '....2AAAAAA2....',
        '...2AAEEEEAA2...',
        '..2AAEEEEEEAA2..',
        '..2AA222222AA2..',
        '.2AAAAAAAAAAAA2.',
        '.2AAAAAAAAAAAA2.',
        '2AAAAAAAAAAAAAA2',
        '2222222222222222',
        '................',
        '................',
      ]),
    },
    {
      id: 'f2',
      name: 'Crawl 2',
      width: 16,
      height: 16,
      pixels: parse16x16([
        '................',
        '................',
        '.......22.......',
        '......2FF2......',
        '......2002......',
        '.....2AAAA2.....',
        '....2AAEEAA2....',
        '...2AAAAAAAA2...',
        '..2AAEEEEEEAA2..',
        '.2AAAAAAAAAAAA2.',
        '.2AAAAAAAAAAAA2.',
        '2AAAAAAAAAAAAAA2',
        '2222222222222222',
        '................',
        '................',
        '................',
      ]),
    },
  ],
};

const KEEN_GEM_SPRITE: SpriteAsset = {
  id: 'spr_gem',
  name: 'VGA Crystal Gem',
  type: 'item',
  width: 16,
  height: 16,
  fps: 3,
  frames: [
    {
      id: 'f1',
      name: 'Glint',
      width: 16,
      height: 16,
      pixels: parse16x16([
        '................',
        '.....BBBBBB.....',
        '....BFFFFFFB....',
        '...BFFBBBBFFB...',
        '..BFFB....BFFB..',
        '..BFB......BFB..',
        '..BBB......BBB..',
        '...B........B...',
        '...B33333333B...',
        '....B333333B....',
        '.....B3333B.....',
        '......B33B......',
        '.......BB.......',
        '................',
        '................',
        '................',
      ]),
    },
  ],
};

const KEEN_DOOR_SPRITE: SpriteAsset = {
  id: 'spr_door',
  name: 'Air Lock Exit',
  type: 'item',
  width: 16,
  height: 16,
  fps: 1,
  frames: [
    {
      id: 'f1',
      name: 'Door',
      width: 16,
      height: 16,
      pixels: parse16x16([
        '8888888888888888',
        '8EEEEEEEEEEEEEE8',
        '8EFFFFFFFFFFFFE8',
        '8EF8888888888FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8111111118FE8',
        '8EF8888888888FE8',
        '8888888888888888',
      ]),
    },
  ],
};

// === TILES ===
export const DEFAULT_TILES: TileAsset[] = [
  {
    id: 0,
    name: 'Air / Sky (Transparent)',
    isSolid: false,
    isHazard: false,
    isWater: false,
    isLadder: false,
    pixels: new Array(256).fill(0),
  },
  {
    id: 1,
    name: 'Martian Red Brick',
    isSolid: true,
    isHazard: false,
    isWater: false,
    isLadder: false,
    pixels: parse16x16([
      'CCCCCCCCCCCCCCCC',
      'C4444444C4444444',
      'C4444444C4444444',
      'C4444444C4444444',
      'CCCCCCCCCCCCCCCC',
      '4444C4444444C444',
      '4444C4444444C444',
      '4444C4444444C444',
      'CCCCCCCCCCCCCCCC',
      'C4444444C4444444',
      'C4444444C4444444',
      'C4444444C4444444',
      'CCCCCCCCCCCCCCCC',
      '4444C4444444C444',
      '4444C4444444C444',
      'CCCCCCCCCCCCCCCC',
    ]),
  },
  {
    id: 2,
    name: 'Steel Girder',
    isSolid: true,
    isHazard: false,
    isWater: false,
    isLadder: false,
    pixels: parse16x16([
      '7777777777777777',
      '7FFFFFFFFFFFFFF8',
      '7F888888888888F8',
      '7F877888888778F8',
      '7F887788887788F8',
      '7F888778877888F8',
      '7F888877778888F8',
      '7F888887788888F8',
      '7F888887788888F8',
      '7F888877778888F8',
      '7F888778877888F8',
      '7F887788887788F8',
      '7F877888888778F8',
      '7F888888888888F8',
      '7FFFFFFFFFFFFFF8',
      '8888888888888888',
    ]),
  },
  {
    id: 3,
    name: 'Toxic Acid Slime',
    isSolid: false,
    isHazard: true,
    isWater: false,
    isLadder: false,
    pixels: parse16x16([
      '..AA..AAAA..AA..',
      '.AAAA2222AAAA22.',
      '2222222222222222',
      '2AAAA22AAAA22AA2',
      '2AAAA22AAAA22AA2',
      '2222222222222222',
      '2AAAA22AAAA22AA2',
      '2222222222222222',
      '2AAAA22AAAA22AA2',
      '2222222222222222',
      '2AAAA22AAAA22AA2',
      '2222222222222222',
      '2AAAA22AAAA22AA2',
      '2222222222222222',
      '2222222222222222',
      '2222222222222222',
    ]),
  },
  {
    id: 4,
    name: 'Dungeon Cobblestone',
    isSolid: true,
    isHazard: false,
    isWater: false,
    isLadder: false,
    pixels: parse16x16([
      '8888888888888888',
      '8777777877777778',
      '87FFFF787FFFFF78',
      '87FFFF787FFFFF78',
      '8777777877777778',
      '8888888888888888',
      '8777777877777778',
      '87FFFF787FFFFF78',
      '87FFFF787FFFFF78',
      '8777777877777778',
      '8888888888888888',
      '8777777877777778',
      '87FFFF787FFFFF78',
      '8777777877777778',
      '8888888888888888',
      '0000000000000000',
    ]),
  },
];

// Helper to create 20x12 screen tile map (320x192 + 8px HUD = 200px)
function createMap(width: number, height: number, layout: string[]): number[] {
  const tiles: number[] = [];
  for (let y = 0; y < height; y++) {
    const row = layout[y] || '....................';
    for (let x = 0; x < width; x++) {
      const c = row[x] || '.';
      if (c === '.') tiles.push(0);
      else if (c === '#') tiles.push(1); // Brick
      else if (c === '=') tiles.push(2); // Girder
      else if (c === '~') tiles.push(3); // Toxic acid
      else if (c === 'D') tiles.push(4); // Cobblestone
      else tiles.push(0);
    }
  }
  return tiles;
}

// 1. Commander Keen Style Preset Project
export function createKeenProject(): GameProject {
  const mapLayout = [
    '....................',
    '....................',
    '..........====......',
    '....................',
    '....===.......====..',
    '....................',
    '........===.........',
    '..===...............',
    '....................',
    '....................',
    '####################',
    '####################',
  ];

  const keenMap: GameMap = {
    name: 'Mars Outpost 1',
    width: 20,
    height: 12,
    tileSize: 16,
    backgroundColor: 1, // Classic Blue DOS Sky
    tiles: createMap(20, 12, mapLayout),
    entities: [
      {
        id: 'ent_player',
        spriteId: 'spr_keen_player',
        name: 'Player (Billy)',
        type: 'player',
        x: 32,
        y: 128,
        behavior: 'static',
        speed: 2.2,
        health: 3,
        points: 0,
      },
      {
        id: 'ent_slug_1',
        spriteId: 'spr_slug',
        name: 'Slug 1',
        type: 'enemy',
        x: 180,
        y: 144,
        behavior: 'patrol',
        speed: 0.8,
        health: 1,
        points: 100,
      },
      {
        id: 'ent_slug_2',
        spriteId: 'spr_slug',
        name: 'Slug 2',
        type: 'enemy',
        x: 90,
        y: 48,
        behavior: 'patrol',
        speed: 1.0,
        health: 1,
        points: 100,
      },
      {
        id: 'ent_gem_1',
        spriteId: 'spr_gem',
        name: 'Blue Gem',
        type: 'coin',
        x: 70,
        y: 48,
        behavior: 'static',
        speed: 0,
        health: 1,
        points: 250,
      },
      {
        id: 'ent_gem_2',
        spriteId: 'spr_gem',
        name: 'Blue Gem',
        type: 'coin',
        x: 168,
        y: 16,
        behavior: 'static',
        speed: 0,
        health: 1,
        points: 250,
      },
      {
        id: 'ent_gem_3',
        spriteId: 'spr_gem',
        name: 'Blue Gem',
        type: 'coin',
        x: 240,
        y: 48,
        behavior: 'static',
        speed: 0,
        health: 1,
        points: 250,
      },
      {
        id: 'ent_door',
        spriteId: 'spr_door',
        name: 'Exit Door',
        type: 'goal',
        x: 288,
        y: 144,
        behavior: 'static',
        speed: 0,
        health: 1,
        points: 1000,
      },
    ],
  };

  return {
    title: 'COMMANDER BILLY 320',
    author: 'Commander Keen Fan',
    version: '1.0.0',
    genre: 'platformer',
    description: 'Classic 1991-era MS-DOS platformer with 320x200 Mode 13h VGA graphics and Sound Blaster 16 OPL2 audio.',
    playerSettings: {
      speed: 2.2,
      jumpForce: 7.2,
      gravity: 0.38,
      maxHealth: 3,
      hasGun: true,
    },
    soundSettings: {
      sfxJump: 'sb_jump',
      sfxCoin: 'sb_coin',
      sfxHit: 'sb_hit',
      sfxShoot: 'sb_laser',
      sfxExplosion: 'sb_explosion',
      sfxWin: 'sb_powerup',
      bgmId: 'keen',
    },
    palette: generateDefaultVgaPalette(),
    sprites: [KEEN_PLAYER_SPRITE, KEEN_ENEMY_SLUG, KEEN_GEM_SPRITE, KEEN_DOOR_SPRITE],
    tiles: DEFAULT_TILES,
    maps: [keenMap],
    activeMapIndex: 0,
    sbConfig: { ...DEFAULT_SB_CONFIG },
    mzHeaderConfig: {},
  };
}

// 2. Dungeon Crawler / Catacomb 2D Preset Project
export function createDungeonProject(): GameProject {
  const base = createKeenProject();
  base.title = 'CATACOMB OF DOOM';
  base.genre = 'rpg_topdown';
  base.description = 'Top-down MS-DOS dungeon adventure with Sound Blaster FM synth and VGA Mode 13h palette.';
  base.playerSettings.jumpForce = 0; // No jump in top-down
  base.playerSettings.speed = 2.0;
  base.soundSettings.bgmId = 'dungeon';
  base.maps[0].name = 'Dungeon Floor B1';
  base.maps[0].backgroundColor = 0; // Black background

  // Enclose map with dungeon blocks
  const dungeonLayout = [
    'DDDDDDDDDDDDDDDDDDDD',
    'D..................D',
    'D.DDDD....DDDD.D...D',
    'D.D..........D.D...D',
    'D.D...DDDD...D.D...D',
    'D.....D..D.....D...D',
    'D.....D..D.....D...D',
    'D.DD..DDDD..DD.D...D',
    'D.D..........D.D...D',
    'D.DDDD....DDDD.D...D',
    'D..................D',
    'DDDDDDDDDDDDDDDDDDDD',
  ];
  base.maps[0].tiles = createMap(20, 12, dungeonLayout);
  base.maps[0].entities[0].x = 32;
  base.maps[0].entities[0].y = 32;
  return base;
}

// 3. Space Shooter / Raptor Preset Project
export function createSpaceProject(): GameProject {
  const base = createKeenProject();
  base.title = 'SOLAR WINDS 320';
  base.genre = 'space_shooter';
  base.description = 'MS-DOS vertical space shooter with Sound Blaster 16 DSP sample explosions and laser beams.';
  base.playerSettings.speed = 2.8;
  base.soundSettings.bgmId = 'cyber';
  base.maps[0].name = 'Deep Space Sector 7';
  base.maps[0].backgroundColor = 0;
  base.maps[0].tiles = new Array(20 * 12).fill(0);
  base.maps[0].entities[0].x = 152;
  base.maps[0].entities[0].y = 160;
  return base;
}
