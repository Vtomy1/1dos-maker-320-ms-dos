import React, { useState, useRef, useEffect } from 'react';
import { GameProject, SpriteAsset, VGAColor } from '../types/dos';
import { DOS_16_COLORS, getColorCss } from '../engine/vgaPalette';
import { Play, Pause, Plus, Trash2, Copy, Paintbrush, Eraser, Eye, RotateCcw } from 'lucide-react';

interface SpriteEditorProps {
  project: GameProject;
  onUpdateProject: (newProject: GameProject) => void;
}

export const SpriteEditor: React.FC<SpriteEditorProps> = ({ project, onUpdateProject }) => {
  const [selectedSpriteIndex, setSelectedSpriteIndex] = useState(0);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(14); // Default Yellow
  const [activeTool, setActiveTool] = useState<'pencil' | 'eraser' | 'bucket' | 'picker'>('pencil');
  const [isPlaying, setIsPlaying] = useState(true);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [showFullPalette, setShowFullPalette] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMouseDown = useRef(false);

  const activeSprite: SpriteAsset = project.sprites[selectedSpriteIndex] || project.sprites[0];
  const activeFrame = activeSprite?.frames[selectedFrameIndex] || activeSprite?.frames[0];
  const width = activeSprite?.width || 16;
  const height = activeSprite?.height || 16;

  // Animation preview timer
  useEffect(() => {
    if (!isPlaying || !activeSprite || activeSprite.frames.length <= 1) return;
    const interval = setInterval(() => {
      setPreviewFrame((f) => (f + 1) % activeSprite.frames.length);
    }, 1000 / (activeSprite.fps || 6));
    return () => clearInterval(interval);
  }, [isPlaying, activeSprite]);

  // Redraw the pixel canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFrame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cellSize = canvas.width / width;

    // Draw grid & pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const colorIdx = activeFrame.pixels[y * width + x];

        if (colorIdx === 0) {
          // Checkerboard for transparent
          const isCheck = (x + y) % 2 === 0;
          ctx.fillStyle = isCheck ? '#222222' : '#333333';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        } else {
          const c = project.palette[colorIdx] || project.palette[15];
          ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }

        // Cell border
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }, [activeFrame, project.palette, width, height]);

  // Handle pixel click / drag
  const handleCanvasAction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !activeFrame) return;
    const rect = canvas.getBoundingClientRect();
    const cellSize = rect.width / width;
    const px = Math.floor((e.clientX - rect.left) / cellSize);
    const py = Math.floor((e.clientY - rect.top) / cellSize);

    if (px < 0 || px >= width || py < 0 || py >= height) return;

    if (activeTool === 'picker') {
      const idx = activeFrame.pixels[py * width + px];
      setSelectedColorIndex(idx);
      setActiveTool('pencil');
      return;
    }

    if (activeTool === 'bucket') {
      floodFill(px, py, selectedColorIndex);
      return;
    }

    const color = activeTool === 'eraser' ? 0 : selectedColorIndex;
    setPixel(px, py, color);
  };

  const setPixel = (x: number, y: number, colorIdx: number) => {
    if (!activeFrame) return;
    const newPixels = [...activeFrame.pixels];
    const pos = y * width + x;
    if (newPixels[pos] === colorIdx) return;
    newPixels[pos] = colorIdx;

    const newSprites = [...project.sprites];
    const s = { ...newSprites[selectedSpriteIndex] };
    const f = [...s.frames];
    f[selectedFrameIndex] = { ...f[selectedFrameIndex], pixels: newPixels };
    s.frames = f;
    newSprites[selectedSpriteIndex] = s;

    onUpdateProject({ ...project, sprites: newSprites });
  };

  const floodFill = (startX: number, startY: number, fillColor: number) => {
    if (!activeFrame) return;
    const targetColor = activeFrame.pixels[startY * width + startX];
    if (targetColor === fillColor) return;

    const newPixels = [...activeFrame.pixels];
    const queue: [number, number][] = [[startX, startY]];
    const visited = new Set<number>();

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const key = y * width + x;
      if (visited.has(key)) continue;
      visited.add(key);

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (newPixels[key] !== targetColor) continue;

      newPixels[key] = fillColor;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    const newSprites = [...project.sprites];
    const s = { ...newSprites[selectedSpriteIndex] };
    const f = [...s.frames];
    f[selectedFrameIndex] = { ...f[selectedFrameIndex], pixels: newPixels };
    s.frames = f;
    newSprites[selectedSpriteIndex] = s;

    onUpdateProject({ ...project, sprites: newSprites });
  };

  // Frame operations
  const addFrame = () => {
    const newSprites = [...project.sprites];
    const s = { ...newSprites[selectedSpriteIndex] };
    const newFrame = {
      id: 'f' + Date.now(),
      name: `Frame ${s.frames.length + 1}`,
      width: s.width,
      height: s.height,
      pixels: new Array(s.width * s.height).fill(0),
    };
    s.frames = [...s.frames, newFrame];
    newSprites[selectedSpriteIndex] = s;
    onUpdateProject({ ...project, sprites: newSprites });
    setSelectedFrameIndex(s.frames.length - 1);
  };

  const duplicateFrame = () => {
    if (!activeFrame) return;
    const newSprites = [...project.sprites];
    const s = { ...newSprites[selectedSpriteIndex] };
    const newFrame = {
      id: 'f' + Date.now(),
      name: `${activeFrame.name} (Copy)`,
      width: activeFrame.width,
      height: activeFrame.height,
      pixels: [...activeFrame.pixels],
    };
    s.frames = [...s.frames, newFrame];
    newSprites[selectedSpriteIndex] = s;
    onUpdateProject({ ...project, sprites: newSprites });
    setSelectedFrameIndex(s.frames.length - 1);
  };

  const deleteFrame = () => {
    if (!activeSprite || activeSprite.frames.length <= 1) return;
    const newSprites = [...project.sprites];
    const s = { ...newSprites[selectedSpriteIndex] };
    s.frames = s.frames.filter((_, idx) => idx !== selectedFrameIndex);
    newSprites[selectedSpriteIndex] = s;
    onUpdateProject({ ...project, sprites: newSprites });
    setSelectedFrameIndex(Math.max(0, selectedFrameIndex - 1));
  };

  const clearCanvas = () => {
    if (!activeFrame) return;
    const newSprites = [...project.sprites];
    const s = { ...newSprites[selectedSpriteIndex] };
    const f = [...s.frames];
    f[selectedFrameIndex] = { ...f[selectedFrameIndex], pixels: new Array(width * height).fill(0) };
    s.frames = f;
    newSprites[selectedSpriteIndex] = s;
    onUpdateProject({ ...project, sprites: newSprites });
  };

  const currentColor = project.palette[selectedColorIndex] || project.palette[15];

  return (
    <div className="p-4 max-w-7xl mx-auto flex flex-col md:flex-row gap-4">
      {/* LEFT: Sprite List & Selector */}
      <div className="w-full md:w-64 bg-[#000044] border-2 border-[#5555ff] p-3 text-xs">
        <div className="flex items-center justify-between border-b border-[#5555ff] pb-2 mb-2">
          <span className="font-pixel text-[10px] text-yellow-300">VGA SPRITES</span>
          <span className="text-[10px] text-[#aaaaaa]">Mode 13h</span>
        </div>

        <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
          {project.sprites.map((spr, idx) => (
            <button
              key={spr.id}
              onClick={() => {
                setSelectedSpriteIndex(idx);
                setSelectedFrameIndex(0);
              }}
              className={`w-full text-left p-2 flex items-center justify-between font-mono text-[11px] border transition-colors ${
                selectedSpriteIndex === idx
                  ? 'bg-[#aaaaaa] text-black border-white font-bold shadow'
                  : 'bg-[#000022] text-[#aaaaaa] border-[#333333] hover:bg-[#000088] hover:text-white'
              }`}
            >
              <span>{spr.name}</span>
              <span className="text-[9px] px-1 bg-black text-cyan-400">
                {spr.width}x{spr.height} ({spr.frames.length}f)
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            const newSprite: SpriteAsset = {
              id: 'spr_' + Date.now(),
              name: `New Sprite ${project.sprites.length + 1}`,
              type: 'item',
              width: 16,
              height: 16,
              fps: 6,
              frames: [
                {
                  id: 'f1',
                  name: 'Idle',
                  width: 16,
                  height: 16,
                  pixels: new Array(256).fill(0),
                },
              ],
            };
            onUpdateProject({ ...project, sprites: [...project.sprites, newSprite] });
            setSelectedSpriteIndex(project.sprites.length);
            setSelectedFrameIndex(0);
          }}
          className="w-full mt-3 py-1.5 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-mono font-bold text-center border border-white flex items-center justify-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>NEW SPRITE (16x16)</span>
        </button>
      </div>

      {/* CENTER: Drawing Canvas */}
      <div className="flex-1 bg-[#111111] border-2 border-[#555555] p-4 flex flex-col items-center">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between w-full max-w-[420px] mb-3 pb-2 border-b border-[#333333] gap-2">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTool('pencil')}
              className={`p-1.5 border font-mono text-xs flex items-center space-x-1 ${
                activeTool === 'pencil' ? 'bg-[#ffff55] text-black font-bold' : 'bg-[#222222] text-white'
              }`}
              title="Pencil Tool"
            >
              <Paintbrush className="w-3.5 h-3.5" />
              <span>PEN</span>
            </button>

            <button
              onClick={() => setActiveTool('eraser')}
              className={`p-1.5 border font-mono text-xs flex items-center space-x-1 ${
                activeTool === 'eraser' ? 'bg-[#ffff55] text-black font-bold' : 'bg-[#222222] text-white'
              }`}
              title="Eraser (Transparent)"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>ERASER</span>
            </button>

            <button
              onClick={() => setActiveTool('bucket')}
              className={`p-1.5 border font-mono text-xs flex items-center space-x-1 ${
                activeTool === 'bucket' ? 'bg-[#ffff55] text-black font-bold' : 'bg-[#222222] text-white'
              }`}
              title="Flood Fill"
            >
              <span>FILL</span>
            </button>

            <button
              onClick={() => setActiveTool('picker')}
              className={`p-1.5 border font-mono text-xs flex items-center space-x-1 ${
                activeTool === 'picker' ? 'bg-[#ffff55] text-black font-bold' : 'bg-[#222222] text-white'
              }`}
              title="Color Eyedropper"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>PICK</span>
            </button>
          </div>

          <button
            onClick={clearCanvas}
            className="p-1.5 bg-[#aa0000] hover:bg-[#ff5555] text-white font-mono text-xs border border-red-500 flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>CLEAR</span>
          </button>
        </div>

        {/* Pixel Canvas */}
        <div className="border-4 border-[#333333] shadow-2xl p-1 bg-[#1a1a1a]">
          <canvas
            ref={canvasRef}
            width={384}
            height={384}
            className="cursor-crosshair block pixelated"
            onMouseDown={(e) => {
              isMouseDown.current = true;
              handleCanvasAction(e);
            }}
            onMouseMove={(e) => {
              if (isMouseDown.current && activeTool !== 'bucket' && activeTool !== 'picker') {
                handleCanvasAction(e);
              }
            }}
            onMouseUp={() => {
              isMouseDown.current = false;
            }}
            onMouseLeave={() => {
              isMouseDown.current = false;
            }}
          />
        </div>

        {/* Frames Strip */}
        <div className="mt-4 flex items-center space-x-2 w-full max-w-[420px] overflow-x-auto pb-2">
          {activeSprite?.frames.map((fr, idx) => (
            <button
              key={fr.id}
              onClick={() => setSelectedFrameIndex(idx)}
              className={`px-3 py-1 font-mono text-xs border whitespace-nowrap ${
                selectedFrameIndex === idx
                  ? 'bg-[#ffff55] text-black font-bold border-yellow-300'
                  : 'bg-[#222222] text-[#aaaaaa] border-[#444444]'
              }`}
            >
              {fr.name}
            </button>
          ))}

          <button
            onClick={addFrame}
            className="p-1 bg-[#00aa00] text-white border border-green-600 hover:bg-[#55ff55] hover:text-black"
            title="Add New Frame"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={duplicateFrame}
            className="p-1 bg-[#0000aa] text-white border border-blue-600 hover:bg-[#5555ff]"
            title="Duplicate Current Frame"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {activeSprite?.frames.length > 1 && (
            <button
              onClick={deleteFrame}
              className="p-1 bg-[#aa0000] text-white border border-red-600 hover:bg-[#ff5555]"
              title="Delete Frame"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: VGA Mode 13h Color Palette & Live Preview */}
      <div className="w-full md:w-72 bg-[#000044] border-2 border-[#5555ff] p-3 text-xs flex flex-col space-y-4">
        {/* Active Color Info */}
        <div className="border-b border-[#5555ff] pb-2">
          <span className="font-pixel text-[10px] text-yellow-300 block mb-2">ACTIVE VGA COLOR</span>
          <div className="flex items-center space-x-3 bg-black p-2 border border-gray-700">
            <div
              className="w-10 h-10 border-2 border-white shadow"
              style={{ backgroundColor: getColorCss(currentColor) }}
            />
            <div className="font-mono text-[11px]">
              <div className="text-white font-bold">Index: #{selectedColorIndex}</div>
              <div className="text-[#aaaaaa]">{currentColor.name}</div>
              <div className="text-[#55ff55] text-[10px]">
                RGB({currentColor.r}, {currentColor.g}, {currentColor.b})
              </div>
            </div>
          </div>
        </div>

        {/* Standard 16 DOS Colors Palette */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[#ffff55] text-[11px] font-bold">DOS 16-COLOR PALETTE:</span>
            <button
              onClick={() => setShowFullPalette(!showFullPalette)}
              className="text-[10px] text-cyan-300 underline font-mono"
            >
              {showFullPalette ? 'Hide 256 VGA' : 'Full 256 VGA'}
            </button>
          </div>

          <div className="grid grid-cols-8 gap-1.5 bg-black p-2 border border-gray-700">
            {DOS_16_COLORS.map((c) => (
              <button
                key={c.index}
                onClick={() => setSelectedColorIndex(c.index)}
                className={`w-6 h-6 border transition-transform ${
                  selectedColorIndex === c.index ? 'border-white scale-110 z-10 ring-2 ring-yellow-400' : 'border-gray-800'
                }`}
                style={{ backgroundColor: getColorCss(c) }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Full 256 VGA Mode 13h palette if expanded */}
        {showFullPalette && (
          <div className="max-h-40 overflow-y-auto bg-black p-1.5 border border-gray-700">
            <div className="grid grid-cols-16 gap-0.5">
              {project.palette.map((c) => (
                <button
                  key={c.index}
                  onClick={() => setSelectedColorIndex(c.index)}
                  className={`w-3.5 h-3.5 border ${
                    selectedColorIndex === c.index ? 'border-white scale-125 z-10' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: getColorCss(c) }}
                  title={`#${c.index} RGB(${c.r},${c.g},${c.b})`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Live Animation Preview Box */}
        <div className="bg-[#111111] p-3 border border-[#333333] flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="font-mono text-[#aaaaaa] text-[11px]">ANIMATION PREVIEW</span>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1 bg-[#222222] text-white hover:bg-[#333333]"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>

          <div className="w-24 h-24 bg-[#000000] border-2 border-[#555555] flex items-center justify-center p-1">
            <SpritePreviewRenderer
              sprite={activeSprite}
              frameIndex={previewFrame}
              palette={project.palette}
              scale={5}
            />
          </div>

          <div className="mt-2 text-[10px] font-mono text-[#888888]">
            Speed: {activeSprite.fps} FPS ({activeSprite.frames.length} frames)
          </div>
        </div>
      </div>
    </div>
  );
};

// Mini Canvas component to render live sprite preview
const SpritePreviewRenderer: React.FC<{
  sprite: SpriteAsset;
  frameIndex: number;
  palette: VGAColor[];
  scale: number;
}> = ({ sprite, frameIndex, palette, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frame = sprite.frames[frameIndex] || sprite.frames[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = frame.width;
    const h = frame.height;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const colorIdx = frame.pixels[y * w + x];
        if (colorIdx > 0) {
          const c = palette[colorIdx] || palette[15];
          ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [frame, palette, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={sprite.width * scale}
      height={sprite.height * scale}
      className="pixelated block"
    />
  );
};
