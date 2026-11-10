import React, { useState, useRef, useEffect } from 'react';
import { GameProject, GameMap, GameEntity } from '../types/dos';
import { DOS_16_COLORS, getColorCss } from '../engine/vgaPalette';
import { Layers, Plus, Trash2, Crosshair, Sparkles, Settings2 } from 'lucide-react';

interface MapEditorProps {
  project: GameProject;
  onUpdateProject: (newProject: GameProject) => void;
}

export const MapEditor: React.FC<MapEditorProps> = ({ project, onUpdateProject }) => {
  const [selectedTool, setSelectedTool] = useState<'tile' | 'entity' | 'erase'>('tile');
  const [selectedTileId, setSelectedTileId] = useState(1);
  const [selectedEntityType, setSelectedEntityType] = useState<'player' | 'enemy' | 'coin' | 'goal'>('coin');
  const [showGrid, setShowGrid] = useState(true);
  const [showCollisions, setShowCollisions] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMouseDown = useRef(false);

  const currentMap: GameMap = project.maps[project.activeMapIndex] || project.maps[0];
  const tileSize = currentMap.tileSize || 16;
  const width = currentMap.width;
  const height = currentMap.height;

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentMap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background color
    const bgColor = project.palette[currentMap.backgroundColor] || project.palette[0];
    ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render Tiles
    for (let ty = 0; ty < height; ty++) {
      for (let tx = 0; tx < width; tx++) {
        const tileId = currentMap.tiles[ty * width + tx];
        if (tileId === 0) continue;

        const tile = project.tiles.find((t) => t.id === tileId);
        if (tile) {
          renderPixelArray(ctx, tx * tileSize, ty * tileSize, 16, 16, tile.pixels);
        }

        // Collision overlay
        if (showCollisions && tile?.isSolid) {
          ctx.strokeStyle = 'rgba(255, 255, 85, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(tx * tileSize, ty * tileSize, tileSize, tileSize);
        }
      }
    }

    // Render Entities
    for (const ent of currentMap.entities) {
      const sprite = project.sprites.find((s) => s.id === ent.spriteId);
      if (sprite && sprite.frames[0]) {
        renderPixelArray(ctx, ent.x, ent.y, sprite.width, sprite.height, sprite.frames[0].pixels);
      }

      // Entity bounding box & label
      ctx.strokeStyle = ent.type === 'player' ? '#55ff55' : ent.type === 'goal' ? '#ffff55' : ent.type === 'enemy' ? '#ff5555' : '#55ffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(ent.x, ent.y, 16, 16);

      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '8px "Share Tech Mono", monospace';
      ctx.fillText(ent.type.toUpperCase(), ent.x, Math.max(8, ent.y - 2));
    }

    // Grid lines
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= width * tileSize; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height * tileSize);
        ctx.stroke();
      }
      for (let y = 0; y <= height * tileSize; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width * tileSize, y);
        ctx.stroke();
      }
    }
  }, [currentMap, project.palette, project.tiles, project.sprites, showGrid, showCollisions, width, height, tileSize]);

  const renderPixelArray = (
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    w: number,
    h: number,
    pixels: number[]
  ) => {
    const palette = project.palette;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const colorIdx = pixels[py * w + px];
        if (colorIdx > 0) {
          const c = palette[colorIdx] || palette[15];
          ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
          ctx.fillRect(dx + px, dy + py, 1, 1);
        }
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = (width * tileSize) / rect.width;
    const scaleY = (height * tileSize) / rect.height;

    const mouseX = Math.floor((e.clientX - rect.left) * scaleX);
    const mouseY = Math.floor((e.clientY - rect.top) * scaleY);

    const tileX = Math.floor(mouseX / tileSize);
    const tileY = Math.floor(mouseY / tileSize);

    if (tileX < 0 || tileX >= width || tileY < 0 || tileY >= height) return;

    if (selectedTool === 'tile') {
      const newTiles = [...currentMap.tiles];
      newTiles[tileY * width + tileX] = selectedTileId;
      updateMap({ ...currentMap, tiles: newTiles });
    } else if (selectedTool === 'erase') {
      // Erase tile and entities at this cell
      const newTiles = [...currentMap.tiles];
      newTiles[tileY * width + tileX] = 0;
      const snapX = tileX * tileSize;
      const snapY = tileY * tileSize;
      const newEntities = currentMap.entities.filter(
        (ent) => Math.abs(ent.x - snapX) >= tileSize || Math.abs(ent.y - snapY) >= tileSize
      );
      updateMap({ ...currentMap, tiles: newTiles, entities: newEntities });
    } else if (selectedTool === 'entity') {
      const snapX = tileX * tileSize;
      const snapY = tileY * tileSize;

      // Assign matching sprite
      let spriteId = project.sprites[0]?.id || 'spr_keen_player';
      let entName = 'Item';
      let behavior: 'static' | 'patrol' = 'static';
      let points = 100;

      if (selectedEntityType === 'player') {
        const pSprite = project.sprites.find((s) => s.type === 'player');
        if (pSprite) spriteId = pSprite.id;
        entName = 'Player Start';
      } else if (selectedEntityType === 'enemy') {
        const eSprite = project.sprites.find((s) => s.type === 'enemy');
        if (eSprite) spriteId = eSprite.id;
        entName = 'Enemy';
        behavior = 'patrol';
        points = 100;
      } else if (selectedEntityType === 'coin') {
        const cSprite = project.sprites.find((s) => s.type === 'item');
        if (cSprite) spriteId = cSprite.id;
        entName = 'Gem / Coin';
        points = 250;
      } else if (selectedEntityType === 'goal') {
        const gSprite = project.sprites.find((s) => s.id === 'spr_door') || project.sprites[0];
        if (gSprite) spriteId = gSprite.id;
        entName = 'Exit Door';
        points = 1000;
      }

      // If placing player, move existing player
      let filteredEntities = currentMap.entities;
      if (selectedEntityType === 'player') {
        filteredEntities = currentMap.entities.filter((e) => e.type !== 'player');
      }

      const newEnt: GameEntity = {
        id: 'ent_' + Date.now(),
        type: selectedEntityType,
        spriteId,
        name: entName,
        x: snapX,
        y: snapY,
        behavior,
        speed: selectedEntityType === 'enemy' ? 1.0 : 0,
        health: 1,
        points,
      };

      updateMap({ ...currentMap, entities: [...filteredEntities, newEnt] });
    }
  };

  const updateMap = (map: GameMap) => {
    const newMaps = [...project.maps];
    newMaps[project.activeMapIndex] = map;
    onUpdateProject({ ...project, maps: newMaps });
  };

  return (
    <div className="p-4 max-w-7xl mx-auto flex flex-col lg:flex-row gap-4">
      {/* LEFT: Map Canvas Area */}
      <div className="flex-1 bg-[#111111] border-2 border-[#555555] p-3 flex flex-col items-center">
        {/* Map Top Bar */}
        <div className="flex flex-wrap items-center justify-between w-full mb-2 pb-2 border-b border-[#333333] text-xs font-mono gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-[#ffff55] font-bold">{currentMap.name}</span>
            <span className="text-[#aaaaaa]">
              ({width}x{height} tiles = {width * tileSize}x{height * tileSize} px)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2 py-0.5 border ${
                showGrid ? 'bg-[#ffff55] text-black font-bold' : 'bg-[#222222] text-[#aaaaaa]'
              }`}
            >
              GRID: {showGrid ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => setShowCollisions(!showCollisions)}
              className={`px-2 py-0.5 border ${
                showCollisions ? 'bg-[#55ff55] text-black font-bold' : 'bg-[#222222] text-[#aaaaaa]'
              }`}
            >
              COLLISIONS: {showCollisions ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* 320x192 Interactive Canvas */}
        <div className="border-4 border-[#333333] shadow-2xl bg-black w-full max-w-[640px] aspect-[320/192] relative">
          <canvas
            ref={canvasRef}
            width={width * tileSize}
            height={height * tileSize}
            className="w-full h-full pixelated block cursor-crosshair"
            onMouseDown={(e) => {
              isMouseDown.current = true;
              handleCanvasClick(e);
            }}
            onMouseMove={(e) => {
              if (isMouseDown.current && selectedTool !== 'entity') {
                handleCanvasClick(e);
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

        <div className="mt-2 text-[10px] font-mono text-[#888888]">
          Click or drag across the 320x200 canvas to place tiles or spawn positions.
        </div>
      </div>

      {/* RIGHT: Tools & Tiles Palette */}
      <div className="w-full lg:w-80 bg-[#000044] border-2 border-[#5555ff] p-3 text-xs flex flex-col space-y-4">
        {/* Tool Mode Buttons */}
        <div>
          <span className="font-pixel text-[10px] text-yellow-300 block mb-2">MAP TOOLS</span>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => setSelectedTool('tile')}
              className={`py-1.5 font-mono text-center border ${
                selectedTool === 'tile' ? 'bg-[#ffff55] text-black font-bold' : 'bg-[#000022] text-white border-blue-900'
              }`}
            >
              PAINT TILE
            </button>
            <button
              onClick={() => setSelectedTool('entity')}
              className={`py-1.5 font-mono text-center border ${
                selectedTool === 'entity' ? 'bg-[#ffff55] text-black font-bold' : 'bg-[#000022] text-white border-blue-900'
              }`}
            >
              PUT ENTITY
            </button>
            <button
              onClick={() => setSelectedTool('erase')}
              className={`py-1.5 font-mono text-center border ${
                selectedTool === 'erase' ? 'bg-[#aa0000] text-white font-bold' : 'bg-[#000022] text-white border-blue-900'
              }`}
            >
              ERASER
            </button>
          </div>
        </div>

        {/* Tiles Palette */}
        {selectedTool === 'tile' && (
          <div>
            <span className="font-mono text-[#ffff55] font-bold block mb-2">VGA TILE PALETTE:</span>
            <div className="space-y-1.5">
              {project.tiles.map((tile) => (
                <button
                  key={tile.id}
                  onClick={() => setSelectedTileId(tile.id)}
                  className={`w-full p-2 flex items-center justify-between border font-mono text-[11px] ${
                    selectedTileId === tile.id
                      ? 'bg-[#aaaaaa] text-black border-white font-bold'
                      : 'bg-[#000022] text-[#aaaaaa] border-[#333333] hover:bg-[#000088]'
                  }`}
                >
                  <span className="truncate">{tile.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 ${tile.isSolid ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400'}`}>
                    {tile.isSolid ? 'SOLID' : 'AIR'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Entity Selector */}
        {selectedTool === 'entity' && (
          <div>
            <span className="font-mono text-[#ffff55] font-bold block mb-2">SPAWN ENTITY:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedEntityType('player')}
                className={`p-2 border font-mono text-xs text-left ${
                  selectedEntityType === 'player' ? 'bg-[#00aa00] text-white font-bold' : 'bg-[#000022] text-[#aaaaaa]'
                }`}
              >
                <div>PLAYER</div>
                <div className="text-[10px] text-green-300">Start Position</div>
              </button>

              <button
                onClick={() => setSelectedEntityType('enemy')}
                className={`p-2 border font-mono text-xs text-left ${
                  selectedEntityType === 'enemy' ? 'bg-[#aa0000] text-white font-bold' : 'bg-[#000022] text-[#aaaaaa]'
                }`}
              >
                <div>ENEMY</div>
                <div className="text-[10px] text-red-300">Patrol / Chase</div>
              </button>

              <button
                onClick={() => setSelectedEntityType('coin')}
                className={`p-2 border font-mono text-xs text-left ${
                  selectedEntityType === 'coin' ? 'bg-[#aa5500] text-white font-bold' : 'bg-[#000022] text-[#aaaaaa]'
                }`}
              >
                <div>GEM / COIN</div>
                <div className="text-[10px] text-yellow-300">+250 Points</div>
              </button>

              <button
                onClick={() => setSelectedEntityType('goal')}
                className={`p-2 border font-mono text-xs text-left ${
                  selectedEntityType === 'goal' ? 'bg-[#00aaaa] text-black font-bold' : 'bg-[#000022] text-[#aaaaaa]'
                }`}
              >
                <div>EXIT DOOR</div>
                <div className="text-[10px] text-cyan-200">Win Level</div>
              </button>
            </div>
          </div>
        )}

        {/* Background Sky / Void Color */}
        <div className="border-t border-[#5555ff] pt-2">
          <span className="font-mono text-[#aaaaaa] block mb-1.5">BACKGROUND COLOR:</span>
          <div className="grid grid-cols-8 gap-1 bg-black p-1.5 border border-gray-700">
            {DOS_16_COLORS.map((c) => (
              <button
                key={c.index}
                onClick={() => updateMap({ ...currentMap, backgroundColor: c.index })}
                className={`w-6 h-6 border ${
                  currentMap.backgroundColor === c.index ? 'border-white scale-110 z-10' : 'border-gray-800'
                }`}
                style={{ backgroundColor: getColorCss(c) }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Physics & Game Rules */}
        <div className="border-t border-[#5555ff] pt-2 space-y-2 font-mono text-[11px]">
          <span className="font-pixel text-[9px] text-yellow-300 block">PLAYER PHYSICS</span>
          <div className="flex justify-between items-center">
            <span>Walk Speed:</span>
            <input
              type="number"
              step="0.2"
              value={project.playerSettings.speed}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  playerSettings: { ...project.playerSettings, speed: parseFloat(e.target.value) || 2.0 },
                })
              }
              className="w-16 bg-black border border-gray-600 px-1 py-0.5 text-right text-white"
            />
          </div>

          <div className="flex justify-between items-center">
            <span>Jump Force:</span>
            <input
              type="number"
              step="0.5"
              value={project.playerSettings.jumpForce}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  playerSettings: { ...project.playerSettings, jumpForce: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-16 bg-black border border-gray-600 px-1 py-0.5 text-right text-white"
            />
          </div>

          <div className="flex justify-between items-center">
            <span>Max Health:</span>
            <input
              type="number"
              min="1"
              max="10"
              value={project.playerSettings.maxHealth}
              onChange={(e) =>
                onUpdateProject({
                  ...project,
                  playerSettings: { ...project.playerSettings, maxHealth: parseInt(e.target.value, 10) || 3 },
                })
              }
              className="w-16 bg-black border border-gray-600 px-1 py-0.5 text-right text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
