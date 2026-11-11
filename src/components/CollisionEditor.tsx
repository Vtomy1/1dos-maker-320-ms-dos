import React, { useState, useRef, useEffect } from 'react';
import { GameProject, CollisionBox, SpriteAsset } from '../types/dos';
import { Box, Play, Check, Shield, Crosshair, RefreshCw, Zap } from 'lucide-react';

interface CollisionEditorProps {
  project: GameProject;
  onUpdateProject: (updated: GameProject) => void;
}

export const CollisionEditor: React.FC<CollisionEditorProps> = ({
  project,
  onUpdateProject,
}) => {
  const [selectedSpriteId, setSelectedSpriteId] = useState<string>(
    project.sprites[0]?.id || ''
  );
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [isPlayingAnim, setIsPlayingAnim] = useState<boolean>(true);

  // Test collision dummy player state
  const [dummyX, setDummyX] = useState<number>(30);
  const [dummyY, setDummyY] = useState<number>(30);
  const [isDraggingDummy, setIsDraggingDummy] = useState<boolean>(false);

  // Canvas ref for magnified sprite editor
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedSprite: SpriteAsset | undefined = project.sprites.find(
    (s) => s.id === selectedSpriteId
  ) || project.sprites[0];

  const hitbox: CollisionBox = selectedSprite?.hitbox || {
    x: 0,
    y: 0,
    width: selectedSprite?.width || 16,
    height: selectedSprite?.height || 16,
    solid: true,
  };

  // Animation frame cycling
  useEffect(() => {
    if (!isPlayingAnim || !selectedSprite || selectedSprite.frames.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % selectedSprite.frames.length);
    }, 1000 / (selectedSprite.fps || 6));
    return () => clearInterval(interval);
  }, [isPlayingAnim, selectedSprite]);

  // Update sprite hitbox
  const updateHitbox = (partial: Partial<CollisionBox>) => {
    if (!selectedSprite) return;
    const newHitbox: CollisionBox = {
      ...hitbox,
      ...partial,
    };

    // Clamp values within sprite bounds
    newHitbox.x = Math.max(0, Math.min(selectedSprite.width - 1, Math.round(newHitbox.x)));
    newHitbox.y = Math.max(0, Math.min(selectedSprite.height - 1, Math.round(newHitbox.y)));
    newHitbox.width = Math.max(1, Math.min(selectedSprite.width - newHitbox.x, Math.round(newHitbox.width)));
    newHitbox.height = Math.max(1, Math.min(selectedSprite.height - newHitbox.y, Math.round(newHitbox.height)));

    const updatedSprites = project.sprites.map((s) =>
      s.id === selectedSprite.id ? { ...s, hitbox: newHitbox } : s
    );

    onUpdateProject({
      ...project,
      sprites: updatedSprites,
    });
  };

  // Presets
  const applyPreset = (preset: 'full' | 'tight' | 'feet' | 'head' | 'center') => {
    if (!selectedSprite) return;
    const w = selectedSprite.width;
    const h = selectedSprite.height;

    switch (preset) {
      case 'full':
        updateHitbox({ x: 0, y: 0, width: w, height: h, solid: true });
        break;
      case 'tight':
        updateHitbox({
          x: Math.max(0, Math.floor(w * 0.125)),
          y: Math.max(0, Math.floor(h * 0.0625)),
          width: Math.max(1, Math.floor(w * 0.75)),
          height: Math.max(1, Math.floor(h * 0.875)),
          solid: true,
        });
        break;
      case 'feet':
        updateHitbox({
          x: Math.max(0, Math.floor(w * 0.125)),
          y: Math.max(0, Math.floor(h * 0.625)),
          width: Math.max(1, Math.floor(w * 0.75)),
          height: Math.max(1, Math.floor(h * 0.375)),
          solid: true,
        });
        break;
      case 'head':
        updateHitbox({
          x: Math.max(0, Math.floor(w * 0.2)),
          y: 0,
          width: Math.max(1, Math.floor(w * 0.6)),
          height: Math.max(1, Math.floor(h * 0.4)),
          solid: true,
        });
        break;
      case 'center':
        updateHitbox({
          x: Math.max(0, Math.floor(w * 0.2)),
          y: Math.max(0, Math.floor(h * 0.2)),
          width: Math.max(1, Math.floor(w * 0.6)),
          height: Math.max(1, Math.floor(h * 0.6)),
          solid: true,
        });
        break;
    }
  };

  // Draw magnified sprite on 320x320 canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSprite) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const w = selectedSprite.width;
    const h = selectedSprite.height;
    const scale = Math.floor(canvas.width / w);

    // Background checkerboard for transparency
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#111827' : '#1f2937';
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    // Render active frame pixels
    const frame = selectedSprite.frames[activeFrameIndex] || selectedSprite.frames[0];
    if (frame) {
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const colorIdx = frame.pixels[py * w + px];
          if (colorIdx > 0) {
            const c = project.palette[colorIdx] || project.palette[15];
            ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
            ctx.fillRect(px * scale, py * scale, scale, scale);
          }
        }
      }
    }

    // Draw pixel grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x++) {
      ctx.beginPath();
      ctx.moveTo(x * scale, 0);
      ctx.lineTo(x * scale, h * scale);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * scale);
      ctx.lineTo(w * scale, y * scale);
      ctx.stroke();
    }

    // Draw collision box overlay
    const hx = hitbox.x * scale;
    const hy = hitbox.y * scale;
    const hw = hitbox.width * scale;
    const hh = hitbox.height * scale;

    // Fill semi-transparent
    ctx.fillStyle = hitbox.solid ? 'rgba(255, 50, 50, 0.3)' : 'rgba(50, 200, 255, 0.3)';
    ctx.fillRect(hx, hy, hw, hh);

    // Border line
    ctx.strokeStyle = hitbox.solid ? '#ff3333' : '#33ccff';
    ctx.lineWidth = 2;
    ctx.strokeRect(hx, hy, hw, hh);

    // Corner handle ticks
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx - 3, hy - 3, 6, 6);
    ctx.fillRect(hx + hw - 3, hy - 3, 6, 6);
    ctx.fillRect(hx - 3, hy + hh - 3, 6, 6);
    ctx.fillRect(hx + hw - 3, hy + hh - 3, 6, 6);

    // Center crosshair
    const cx = hx + hw / 2;
    const cy = hy + hh / 2;
    ctx.strokeStyle = '#ffff55';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy);
    ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx, cy + 4);
    ctx.stroke();
  }, [selectedSprite, activeFrameIndex, hitbox, project.palette]);

  // Check collision with dummy player in the test simulator
  const playerSprite = project.sprites.find((s) => s.type === 'player') || project.sprites[0];
  const pHb = playerSprite?.hitbox || { x: 0, y: 0, width: 14, height: 16, solid: true };

  // Center static target sprite at (110, 50)
  const targetX = 110;
  const targetY = 50;
  const targetBox = {
    x: targetX + hitbox.x,
    y: targetY + hitbox.y,
    w: hitbox.width,
    h: hitbox.height,
  };

  const dummyBox = {
    x: dummyX + pHb.x,
    y: dummyY + pHb.y,
    w: pHb.width,
    h: pHb.height,
  };

  const isColliding =
    dummyBox.x < targetBox.x + targetBox.w &&
    dummyBox.x + dummyBox.w > targetBox.x &&
    dummyBox.y < targetBox.y + targetBox.h &&
    dummyBox.y + dummyBox.h > targetBox.y;

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-[#0000aa] border-2 border-[#5555ff] p-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_#000000]">
        <div className="flex items-center space-x-2">
          <Box className="w-5 h-5 text-yellow-300" />
          <h2 className="font-pixel text-sm text-yellow-300 tracking-wider">
            VGA SPRITE COLLISION BOX EDITOR
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="bg-[#000088] px-2 py-0.5 border border-[#5555ff] text-green-300">
            AABB 2D AXIS-ALIGNED BOUNDING BOX
          </span>
          <span className="text-[#aaaaaa]">16-BIT REAL MODE COMPATIBLE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Sprite List & Selector */}
        <div className="lg:col-span-3 bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-3">
          <div className="flex items-center justify-between border-b border-[#0000aa] pb-1">
            <span className="font-pixel text-[11px] text-yellow-300">SELECT SPRITE</span>
            <span className="text-[10px] font-mono text-cyan-300">
              ({project.sprites.length} ASSETS)
            </span>
          </div>

          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {project.sprites.map((s) => {
              const hasCustomBox = !!s.hitbox;
              const isSel = s.id === selectedSprite?.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSpriteId(s.id);
                    setActiveFrameIndex(0);
                  }}
                  className={`w-full text-left p-2 font-mono text-xs flex items-center justify-between transition-colors border ${
                    isSel
                      ? 'bg-[#ffff55] text-black border-white font-bold'
                      : 'bg-[#0000aa] hover:bg-[#0000cc] text-white border-[#5555ff]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        s.type === 'player'
                          ? 'bg-green-400'
                          : s.type === 'enemy'
                          ? 'bg-red-400'
                          : s.type === 'item'
                          ? 'bg-yellow-400'
                          : 'bg-blue-400'
                      }`}
                    />
                    <span className="truncate">{s.name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[10px]">
                    {hasCustomBox && (
                      <span className="bg-[#aa0000] text-white px-1 font-bold">
                        BOX
                      </span>
                    )}
                    <span className="opacity-75">{s.width}x{s.height}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-2 bg-[#000044] border border-[#5555ff] text-[11px] font-mono text-[#cccccc] space-y-1">
            <div className="text-yellow-300 font-bold">Collision Physics Tip:</div>
            <p className="text-[10px] leading-relaxed">
              Real-mode DOS platformers like <em>Commander Keen</em> use smaller hitboxes
              than visible sprites to give players fair jumping physics and prevent unfair edge bumps.
            </p>
          </div>
        </div>

        {/* Center Column: Magnified Hitbox Canvas */}
        <div className="lg:col-span-5 bg-[#000088] border-2 border-[#5555ff] p-4 text-white flex flex-col items-center justify-between space-y-4">
          <div className="w-full flex items-center justify-between border-b border-[#0000aa] pb-2">
            <span className="font-pixel text-xs text-yellow-300">
              {selectedSprite?.name.toUpperCase()} (FRAME {activeFrameIndex + 1}/{selectedSprite?.frames.length || 1})
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlayingAnim(!isPlayingAnim)}
                className={`px-2 py-0.5 text-xs font-mono border flex items-center space-x-1 ${
                  isPlayingAnim
                    ? 'bg-[#00aa00] text-black border-white font-bold'
                    : 'bg-[#000000] text-white border-gray-600'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>{isPlayingAnim ? 'ANIM: ON' : 'PAUSED'}</span>
              </button>
            </div>
          </div>

          {/* 320x320 Canvas with Hitbox overlay */}
          <div className="relative p-2 bg-[#000000] border-4 border-[#333333] shadow-[inset_0px_0px_8px_#000000]">
            <canvas
              ref={canvasRef}
              width={256}
              height={256}
              className="cursor-crosshair block"
            />
            <div className="absolute bottom-3 left-3 bg-[#000000]/80 text-[#55ff55] font-mono text-[10px] px-2 py-0.5 border border-[#55ff55]">
              BOX: X:{hitbox.x} Y:{hitbox.y} W:{hitbox.width} H:{hitbox.height}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="w-full space-y-2">
            <div className="text-[11px] font-mono text-cyan-300 font-bold">
              HITBOX GEOMETRY PRESETS:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                onClick={() => applyPreset('full')}
                className="px-2 py-1 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] text-xs font-mono transition-colors text-center"
              >
                Full (16x16)
              </button>
              <button
                onClick={() => applyPreset('tight')}
                className="px-2 py-1 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] text-xs font-mono transition-colors text-center font-bold text-yellow-300"
              >
                Tight (12x14)
              </button>
              <button
                onClick={() => applyPreset('feet')}
                className="px-2 py-1 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] text-xs font-mono transition-colors text-center"
              >
                Feet Only (12x6)
              </button>
              <button
                onClick={() => applyPreset('head')}
                className="px-2 py-1 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] text-xs font-mono transition-colors text-center"
              >
                Head Only (10x6)
              </button>
              <button
                onClick={() => applyPreset('center')}
                className="px-2 py-1 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] text-xs font-mono transition-colors text-center"
              >
                Center (10x10)
              </button>
              <button
                onClick={() => applyPreset('full')}
                className="px-2 py-1 bg-[#aa0000] hover:bg-[#ff5555] text-white border border-red-400 text-xs font-mono transition-colors text-center"
              >
                Reset Box
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Numeric Controls & Live Collision Simulator */}
        <div className="lg:col-span-4 space-y-4">
          {/* Coordinates & Dimensions Form */}
          <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#0000aa] pb-1">
              <span className="font-pixel text-[11px] text-yellow-300">BOUNDS CONFIG</span>
              <span className="text-[10px] font-mono text-cyan-300">PIXEL OFFSETS</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[#aaaaaa]">OFFSET X (0-{selectedSprite?.width || 16}):</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="range"
                    min={0}
                    max={(selectedSprite?.width || 16) - 1}
                    value={hitbox.x}
                    onChange={(e) => updateHitbox({ x: parseInt(e.target.value, 10) })}
                    className="w-full accent-yellow-400"
                  />
                  <span className="w-8 text-right font-bold text-yellow-300">{hitbox.x}px</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#aaaaaa]">OFFSET Y (0-{selectedSprite?.height || 16}):</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="range"
                    min={0}
                    max={(selectedSprite?.height || 16) - 1}
                    value={hitbox.y}
                    onChange={(e) => updateHitbox({ y: parseInt(e.target.value, 10) })}
                    className="w-full accent-yellow-400"
                  />
                  <span className="w-8 text-right font-bold text-yellow-300">{hitbox.y}px</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#aaaaaa]">WIDTH:</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="range"
                    min={1}
                    max={(selectedSprite?.width || 16) - hitbox.x}
                    value={hitbox.width}
                    onChange={(e) => updateHitbox({ width: parseInt(e.target.value, 10) })}
                    className="w-full accent-green-400"
                  />
                  <span className="w-8 text-right font-bold text-green-300">{hitbox.width}px</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#aaaaaa]">HEIGHT:</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="range"
                    min={1}
                    max={(selectedSprite?.height || 16) - hitbox.y}
                    value={hitbox.height}
                    onChange={(e) => updateHitbox({ height: parseInt(e.target.value, 10) })}
                    className="w-full accent-green-400"
                  />
                  <span className="w-8 text-right font-bold text-green-300">{hitbox.height}px</span>
                </div>
              </div>
            </div>

            {/* Solid Physical Barrier Toggle */}
            <div className="pt-2 border-t border-[#0000aa] flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-white flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-yellow-300" />
                  <span>SOLID COLLISION (WALL / BLOCK)</span>
                </div>
                <div className="text-[10px] text-[#aaaaaa] font-mono">
                  Checked = Physical barrier; Unchecked = Trigger zone
                </div>
              </div>
              <button
                onClick={() => updateHitbox({ solid: !hitbox.solid })}
                className={`px-3 py-1 text-xs font-mono border ${
                  hitbox.solid
                    ? 'bg-[#00aa00] text-black border-white font-bold'
                    : 'bg-[#000044] text-[#aaaaaa] border-[#5555ff]'
                }`}
              >
                {hitbox.solid ? 'YES (SOLID)' : 'NO (TRIGGER)'}
              </button>
            </div>
          </div>

          {/* Interactive Live Collision Tester */}
          <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#0000aa] pb-1">
              <span className="font-pixel text-[11px] text-yellow-300">LIVE COLLISION TESTER</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 border ${
                  isColliding
                    ? 'bg-[#aa0000] text-white border-red-300 font-bold animate-pulse'
                    : 'bg-[#00aa00] text-black border-white font-bold'
                }`}
              >
                {isColliding ? '! COLLISION DETECTED !' : 'STATUS: CLEAR'}
              </span>
            </div>

            <p className="text-[10px] font-mono text-[#aaaaaa]">
              Drag the green box (Player hitbox) across the canvas to verify AABB intersection with {selectedSprite?.name}.
            </p>

            {/* Mini 240x120 interactive collision field */}
            <div
              className="relative w-full h-32 bg-[#000000] border-2 border-[#555555] overflow-hidden select-none"
              onMouseMove={(e) => {
                if (!isDraggingDummy) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const newX = Math.max(0, Math.min(220, e.clientX - rect.left - 8));
                const newY = Math.max(0, Math.min(100, e.clientY - rect.top - 8));
                setDummyX(newX);
                setDummyY(newY);
              }}
              onMouseUp={() => setIsDraggingDummy(false)}
              onMouseLeave={() => setIsDraggingDummy(false)}
            >
              {/* Target Sprite Box (Fixed in center) */}
              <div
                className="absolute border-2 border-red-400 bg-red-600/30 flex items-center justify-center font-mono text-[9px] text-red-200 pointer-events-none"
                style={{
                  left: `${targetBox.x}px`,
                  top: `${targetBox.y}px`,
                  width: `${targetBox.w * 2}px`,
                  height: `${targetBox.h * 2}px`,
                }}
              >
                {selectedSprite?.name.substring(0, 6)}
              </div>

              {/* Draggable Player Dummy Box */}
              <div
                onMouseDown={() => setIsDraggingDummy(true)}
                className="absolute border-2 border-green-300 bg-green-500/40 cursor-grab active:cursor-grabbing flex items-center justify-center font-mono text-[9px] text-green-100 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                style={{
                  left: `${dummyBox.x}px`,
                  top: `${dummyBox.y}px`,
                  width: `${dummyBox.w * 2}px`,
                  height: `${dummyBox.h * 2}px`,
                }}
              >
                PLAYER
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-cyan-300">
                DX: {Math.round(dummyBox.x - targetBox.x)}px | DY: {Math.round(dummyBox.y - targetBox.y)}px
              </span>
              <button
                onClick={() => {
                  setDummyX(30);
                  setDummyY(30);
                }}
                className="px-2 py-0.5 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] flex items-center space-x-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>RESET TEST</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
