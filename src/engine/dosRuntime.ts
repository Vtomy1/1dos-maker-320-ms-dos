import { GameProject, GameEntity, GameMap } from '../types/dos';
import { soundBlaster } from './soundBlaster';

export interface RuntimePlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  facing: 'left' | 'right' | 'up' | 'down';
  health: number;
  maxHealth: number;
  score: number;
  invulnerableTime: number;
  ammo: number;
}

export interface RuntimeBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEnemy: boolean;
  life: number;
}

export interface StarParticle {
  x: number;
  y: number;
  speed: number;
  color: number;
}

export class DosRuntime {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private project: GameProject;
  private running = false;
  private animationFrameId: number | null = null;

  // Key states
  public keys: { [key: string]: boolean } = {};

  // Game state
  public player: RuntimePlayerState;
  public entities: GameEntity[] = [];
  public bullets: RuntimeBullet[] = [];
  public stars: StarParticle[] = [];
  public gameState: 'boot' | 'title' | 'playing' | 'gameover' | 'victory' = 'boot';
  public bootTimer = 0;
  public tickCount = 0;
  public cameraX = 0;

  // Callbacks for UI updates
  public onStateChange?: () => void;

  constructor(project: GameProject) {
    this.project = project;
    this.player = this.initPlayer();
    this.initStars();
  }

  private initPlayer(): RuntimePlayerState {
    const map = this.project.maps[this.project.activeMapIndex] || this.project.maps[0];
    const playerEnt = map.entities.find((e) => e.type === 'player');
    return {
      x: playerEnt ? playerEnt.x : 32,
      y: playerEnt ? playerEnt.y : 100,
      vx: 0,
      vy: 0,
      width: 14,
      height: 16,
      isGrounded: false,
      facing: 'right',
      health: this.project.playerSettings.maxHealth,
      maxHealth: this.project.playerSettings.maxHealth,
      score: 0,
      invulnerableTime: 0,
      ammo: 99,
    };
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * 320,
        y: Math.random() * 200,
        speed: 0.5 + Math.random() * 1.5,
        color: Math.random() > 0.5 ? 15 : 7, // White or Light Gray
      });
    }
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  public updateProject(newProject: GameProject) {
    this.project = newProject;
  }

  public start() {
    if (this.running) return;
    this.running = true;
    this.reset(true);
    this.loop();
  }

  public stop() {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    soundBlaster.stopBgm();
  }

  public reset(showBoot = true) {
    const map = this.project.maps[this.project.activeMapIndex] || this.project.maps[0];
    this.player = this.initPlayer();
    this.entities = JSON.parse(JSON.stringify(map.entities.filter((e) => e.type !== 'player')));
    this.bullets = [];
    this.cameraX = 0;
    this.tickCount = 0;

    if (showBoot) {
      this.gameState = 'boot';
      this.bootTimer = 100; // ~1.5 seconds of MS-DOS boot prompt
      soundBlaster.stopBgm();
    } else {
      this.gameState = 'playing';
      if (this.project.soundSettings.bgmId === 'custom' && this.project.customMelody) {
        soundBlaster.playCustomMelody(this.project.customMelody);
      } else if (this.project.soundSettings.bgmId) {
        soundBlaster.playBgm(this.project.soundSettings.bgmId as 'keen' | 'dungeon' | 'cyber');
      }
    }

    if (this.onStateChange) this.onStateChange();
  }

  public shootBullet() {
    if (this.gameState !== 'playing') return;
    if (this.bullets.length > 5) return;

    soundBlaster.playDspPcm('laser');

    let vx = 0;
    let vy = 0;

    if (this.project.genre === 'space_shooter') {
      vx = 0;
      vy = -5.0;
    } else if (this.project.genre === 'rpg_topdown') {
      if (this.player.facing === 'left') vx = -4;
      else if (this.player.facing === 'right') vx = 4;
      else if (this.player.facing === 'up') vy = -4;
      else if (this.player.facing === 'down') vy = 4;
    } else {
      // Platformer
      vx = this.player.facing === 'left' ? -4.5 : 4.5;
      vy = 0;
    }

    this.bullets.push({
      x: this.player.x + 8,
      y: this.player.y + 6,
      vx,
      vy,
      isEnemy: false,
      life: 60,
    });
  }

  private loop = () => {
    if (!this.running) return;
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update() {
    this.tickCount++;

    if (this.gameState === 'boot') {
      this.bootTimer--;
      if (this.bootTimer <= 0) {
        this.gameState = 'playing';
        if (this.project.soundSettings.bgmId === 'custom' && this.project.customMelody) {
          soundBlaster.playCustomMelody(this.project.customMelody);
        } else if (this.project.soundSettings.bgmId) {
          soundBlaster.playBgm(this.project.soundSettings.bgmId as 'keen' | 'dungeon' | 'cyber');
        }
        if (this.onStateChange) this.onStateChange();
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    const map = this.project.maps[this.project.activeMapIndex] || this.project.maps[0];
    const settings = this.project.playerSettings;

    if (this.player.invulnerableTime > 0) {
      this.player.invulnerableTime--;
    }

    // --- Space shooter stars background animation ---
    if (this.project.genre === 'space_shooter') {
      for (const s of this.stars) {
        s.y += s.speed;
        if (s.y > 200) {
          s.y = 0;
          s.x = Math.random() * 320;
        }
      }
    }

    // --- Player Movement Controls ---
    const left = this.keys['ArrowLeft'] || this.keys['KeyA'];
    const right = this.keys['ArrowRight'] || this.keys['KeyD'];
    const up = this.keys['ArrowUp'] || this.keys['KeyW'];
    const down = this.keys['ArrowDown'] || this.keys['KeyS'];
    const jump = this.keys['Space'] || this.keys['ControlLeft'] || this.keys['KeyZ'];

    if (this.project.genre === 'platformer') {
      // Horizontal motion
      if (left) {
        this.player.vx = -settings.speed;
        this.player.facing = 'left';
      } else if (right) {
        this.player.vx = settings.speed;
        this.player.facing = 'right';
      } else {
        this.player.vx = 0;
      }

      // Jump
      if (jump && this.player.isGrounded) {
        this.player.vy = -settings.jumpForce;
        this.player.isGrounded = false;
        soundBlaster.playDspPcm('jump');
      }

      // Gravity
      this.player.vy += settings.gravity;
      if (this.player.vy > 8) this.player.vy = 8;
    } else {
      // Top-down RPG or Space Shooter (Free 2D movement)
      this.player.vx = 0;
      this.player.vy = 0;
      if (left) {
        this.player.vx = -settings.speed;
        this.player.facing = 'left';
      }
      if (right) {
        this.player.vx = settings.speed;
        this.player.facing = 'right';
      }
      if (up) {
        this.player.vy = -settings.speed;
        this.player.facing = 'up';
      }
      if (down) {
        this.player.vy = settings.speed;
        this.player.facing = 'down';
      }
    }

    // Move player with tile collisions
    this.movePlayerWithCollision(map);

    // Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;

      if (b.life <= 0 || b.x < 0 || b.x > 320 || b.y < 0 || b.y > 200) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Check bullet against enemies
      if (!b.isEnemy) {
        for (let j = this.entities.length - 1; j >= 0; j--) {
          const e = this.entities[j];
          if (e.type === 'enemy') {
            if (Math.abs(b.x - (e.x + 8)) < 12 && Math.abs(b.y - (e.y + 8)) < 12) {
              e.health--;
              this.bullets.splice(i, 1);
              if (e.health <= 0) {
                soundBlaster.playDspPcm('explosion');
                this.player.score += e.points;
                this.entities.splice(j, 1);
              } else {
                soundBlaster.playDspPcm('hit');
              }
              break;
            }
          }
        }
      }
    }

    // Update Entities (Enemies & Items)
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];

      // Enemy AI
      if (e.type === 'enemy') {
        if (e.behavior === 'patrol') {
          e.x += e.speed;
          // Bounce off screen borders or walls
          if (e.x < 16) {
            e.x = 16;
            e.speed = Math.abs(e.speed);
          } else if (e.x > (map.width * map.tileSize) - 24) {
            e.x = (map.width * map.tileSize) - 24;
            e.speed = -Math.abs(e.speed);
          }
        } else if (e.behavior === 'chase') {
          const dx = this.player.x - e.x;
          const dy = this.player.y - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 2 && dist < 120) {
            e.x += (dx / dist) * e.speed;
            e.y += (dy / dist) * e.speed;
          }
        }

        // Check collision with player
        if (Math.abs(this.player.x - e.x) < 12 && Math.abs(this.player.y - e.y) < 14) {
          if (this.player.invulnerableTime <= 0) {
            // Did player stomp the enemy from above? (Platformer)
            if (this.project.genre === 'platformer' && this.player.vy > 0 && this.player.y < e.y) {
              soundBlaster.playDspPcm('hit');
              this.player.vy = -4.5;
              this.player.score += e.points;
              this.entities.splice(i, 1);
              continue;
            } else {
              // Hurt player
              soundBlaster.playDspPcm('hit');
              this.player.health--;
              this.player.invulnerableTime = 40;
              if (this.player.health <= 0) {
                this.gameState = 'gameover';
                soundBlaster.playDspPcm('explosion');
                soundBlaster.stopBgm();
                if (this.onStateChange) this.onStateChange();
              }
            }
          }
        }
      }

      // Coin / Gem Pickup
      if (e.type === 'coin') {
        if (Math.abs(this.player.x - e.x) < 14 && Math.abs(this.player.y - e.y) < 14) {
          soundBlaster.playDspPcm('coin');
          this.player.score += e.points;
          this.entities.splice(i, 1);
          continue;
        }
      }

      // Goal / Exit Door
      if (e.type === 'goal') {
        if (Math.abs(this.player.x - e.x) < 16 && Math.abs(this.player.y - e.y) < 16) {
          soundBlaster.playDspPcm('win');
          this.player.score += e.points;
          this.gameState = 'victory';
          soundBlaster.stopBgm();
          if (this.onStateChange) this.onStateChange();
        }
      }
    }

    // Fall below bottom of screen
    if (this.player.y > 184) {
      if (this.project.genre === 'platformer') {
        this.player.health = 0;
        this.gameState = 'gameover';
        soundBlaster.playDspPcm('hit');
        soundBlaster.stopBgm();
        if (this.onStateChange) this.onStateChange();
      } else {
        this.player.y = 184;
      }
    }
  }

  private movePlayerWithCollision(map: GameMap) {
    const p = this.player;
    const tileSize = map.tileSize;

    // Move X
    p.x += p.vx;
    if (p.x < 0) p.x = 0;
    if (p.x > 320 - p.width) p.x = 320 - p.width;

    // Check solid tile collision in X
    let tileLeft = Math.floor(p.x / tileSize);
    let tileRight = Math.floor((p.x + p.width - 1) / tileSize);
    let tileTop = Math.floor(p.y / tileSize);
    let tileBottom = Math.floor((p.y + p.height - 1) / tileSize);

    for (let ty = tileTop; ty <= tileBottom; ty++) {
      for (let tx = tileLeft; tx <= tileRight; tx++) {
        const tIndex = ty * map.width + tx;
        const tileId = map.tiles[tIndex];
        const tileAsset = this.project.tiles.find((t) => t.id === tileId);
        if (tileAsset?.isSolid) {
          if (p.vx > 0) p.x = tx * tileSize - p.width;
          else if (p.vx < 0) p.x = (tx + 1) * tileSize;
        }
      }
    }

    // Move Y
    p.y += p.vy;
    if (p.y < 0) {
      p.y = 0;
      p.vy = 0;
    }

    // Check solid tile collision in Y
    tileLeft = Math.floor(p.x / tileSize);
    tileRight = Math.floor((p.x + p.width - 1) / tileSize);
    tileTop = Math.floor(p.y / tileSize);
    tileBottom = Math.floor((p.y + p.height - 1) / tileSize);

    p.isGrounded = false;
    for (let ty = tileTop; ty <= tileBottom; ty++) {
      for (let tx = tileLeft; tx <= tileRight; tx++) {
        const tIndex = ty * map.width + tx;
        const tileId = map.tiles[tIndex];
        const tileAsset = this.project.tiles.find((t) => t.id === tileId);
        if (tileAsset?.isSolid) {
          if (p.vy > 0) {
            p.y = ty * tileSize - p.height;
            p.vy = 0;
            p.isGrounded = true;
          } else if (p.vy < 0) {
            p.y = (ty + 1) * tileSize;
            p.vy = 0;
          }
        }
      }
    }
  }

  public render() {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const map = this.project.maps[this.project.activeMapIndex] || this.project.maps[0];
    const palette = this.project.palette;

    // --- BOOT SEQUENCE SCREEN ---
    if (this.gameState === 'boot') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 320, 200);

      ctx.fillStyle = '#aaaaaa';
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.fillText('MS-DOS Version 6.22 (C)Copyright 1981-1994 Microsoft', 8, 18);
      ctx.fillText('HIMEM: DOS XMS Driver, 640K Conventional RAM OK', 8, 30);
      ctx.fillStyle = '#55ffff';
      ctx.fillText(`SOUND BLASTER 16 DETECTED:`, 8, 46);
      ctx.fillStyle = '#ffff55';
      ctx.fillText(`  SET BLASTER=A${this.project.sbConfig.basePort.replace('h','')} I${this.project.sbConfig.irq} D${this.project.sbConfig.dma8} H${this.project.sbConfig.dma16} T${this.project.sbConfig.type}`, 8, 58);
      ctx.fillText(`  OPL2/OPL3 FM Synthesis at Port 388h: OK`, 8, 70);

      ctx.fillStyle = '#55ff55';
      ctx.fillText('VGA Mode 13h: 320x200 256 Colors Initialized', 8, 86);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`C:\\GAMES\\DOSMAKER> GAME.EXE`, 8, 108);

      const progress = Math.min(100, Math.floor((1 - this.bootTimer / 100) * 100));
      ctx.fillStyle = '#555555';
      ctx.fillRect(8, 130, 304, 12);
      ctx.fillStyle = '#00aaaa';
      ctx.fillRect(10, 132, (300 * progress) / 100, 8);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Loading binary segments... ${progress}%`, 8, 158);
      return;
    }

    // --- GAME SCREEN RENDERING (Mode 13h) ---
    // Background color
    const bgColor = palette[map.backgroundColor] || palette[0];
    ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
    ctx.fillRect(0, 0, 320, 200);

    // Render stars if space shooter
    if (this.project.genre === 'space_shooter') {
      for (const s of this.stars) {
        ctx.fillStyle = s.color === 15 ? '#ffffff' : '#aaaaaa';
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
      }
    }

    // Render Tilemap
    const tileSize = map.tileSize;
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        const tileId = map.tiles[ty * map.width + tx];
        if (tileId === 0) continue; // air

        const tile = this.project.tiles.find((t) => t.id === tileId);
        if (tile) {
          this.renderPixelArray(ctx, tx * tileSize, ty * tileSize, 16, 16, tile.pixels);
        }
      }
    }

    // Render Entities (Coins, Exit, Enemies)
    for (const ent of this.entities) {
      const sprite = this.project.sprites.find((s) => s.id === ent.spriteId);
      if (sprite && sprite.frames.length > 0) {
        const frameIdx = Math.floor(this.tickCount / (sprite.fps || 6)) % sprite.frames.length;
        const frame = sprite.frames[frameIdx] || sprite.frames[0];
        this.renderPixelArray(ctx, Math.floor(ent.x), Math.floor(ent.y), frame.width, frame.height, frame.pixels);
      } else {
        // Fallback placeholder box
        ctx.fillStyle = ent.type === 'coin' ? '#ffff55' : ent.type === 'enemy' ? '#ff5555' : '#55ff55';
        ctx.fillRect(Math.floor(ent.x), Math.floor(ent.y), 16, 16);
      }
    }

    // Render Bullets
    for (const b of this.bullets) {
      ctx.fillStyle = '#ffff55';
      ctx.fillRect(Math.floor(b.x), Math.floor(b.y), 4, 3);
      ctx.fillStyle = '#ff5555';
      ctx.fillRect(Math.floor(b.x) + 1, Math.floor(b.y) + 1, 2, 1);
    }

    // Render Player
    if (this.player.invulnerableTime % 4 < 2) {
      const pSprite = this.project.sprites.find((s) => s.type === 'player') || this.project.sprites[0];
      if (pSprite && pSprite.frames.length > 0) {
        const isMoving = Math.abs(this.player.vx) > 0.1 || Math.abs(this.player.vy) > 0.1;
        const frameIdx = isMoving ? Math.floor(this.tickCount / 6) % pSprite.frames.length : 0;
        const frame = pSprite.frames[frameIdx] || pSprite.frames[0];
        const flip = this.player.facing === 'left';
        this.renderPixelArray(ctx, Math.floor(this.player.x), Math.floor(this.player.y), frame.width, frame.height, frame.pixels, flip);
      }
    }

    // --- Mode 13h Bottom HUD / Status Bar (y = 188 to 200) ---
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 188, 320, 12);
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 188, 320, 1); // border line

    ctx.fillStyle = '#ffff55';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`SCORE:${String(this.player.score).padStart(5, '0')}`, 4, 197);

    // Health hearts / blocks
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('HP:', 120, 197);
    for (let h = 0; h < this.player.maxHealth; h++) {
      ctx.fillStyle = h < this.player.health ? '#ff5555' : '#333333';
      ctx.fillRect(145 + h * 10, 191, 7, 6);
    }

    // Sound Blaster Indicator in HUD
    ctx.fillStyle = '#55ff55';
    ctx.fillText(`SB16:${this.project.sbConfig.basePort}`, 235, 197);

    // --- GAME OVER OR VICTORY OVERLAYS ---
    if (this.gameState === 'gameover') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(40, 60, 240, 80);
      ctx.strokeStyle = '#ff5555';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 60, 240, 80);

      ctx.fillStyle = '#ff5555';
      ctx.font = '14px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', 160, 95);
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText('PRESS SPACE TO RETRY', 160, 120);
      ctx.textAlign = 'left';
    } else if (this.gameState === 'victory') {
      ctx.fillStyle = 'rgba(0, 0, 170, 0.85)';
      ctx.fillRect(40, 50, 240, 100);
      ctx.strokeStyle = '#ffff55';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 50, 240, 100);

      ctx.fillStyle = '#ffff55';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('MISSION COMPLETE!', 160, 80);
      ctx.fillStyle = '#55ff55';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillText(`FINAL SCORE: ${this.player.score}`, 160, 105);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PRESS SPACE TO REPLAY', 160, 130);
      ctx.textAlign = 'left';
    }
  }

  private renderPixelArray(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    w: number,
    h: number,
    pixels: number[],
    flipX = false
  ) {
    const palette = this.project.palette;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const srcX = flipX ? w - 1 - px : px;
        const colorIndex = pixels[py * w + srcX];
        if (colorIndex === 0) continue; // 0 = transparent

        const c = palette[colorIndex] || palette[15];
        ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
        ctx.fillRect(dx + px, dy + py, 1, 1);
      }
    }
  }
}
