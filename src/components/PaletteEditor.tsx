import React, { useState } from 'react';
import { GameProject, VGAColor } from '../types/dos';
import {
  getColorCss,
  getColorHex,
  getVgaDac6Bit,
  from6BitDac,
  generatePresetPalette,
  exportRawPalBinary,
  exportPaletteCCode,
} from '../engine/vgaPalette';
import {
  Palette,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  Code2,
  HelpCircle,
} from 'lucide-react';

interface PaletteEditorProps {
  project: GameProject;
  onUpdateProject: (newProject: GameProject) => void;
}

export const PaletteEditor: React.FC<PaletteEditorProps> = ({ project, onUpdateProject }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(14); // Default to Yellow #14
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeSubView, setActiveSubView] = useState<'editor' | 'ramp' | 'code'>('editor');

  // Gradient Ramp Generator State
  const [rampStartIdx, setRampStartIdx] = useState<number>(32);
  const [rampEndIdx, setRampEndIdx] = useState<number>(47);
  const [rampStartColor, setRampStartColor] = useState<string>('#000000');
  const [rampEndColor, setRampEndColor] = useState<string>('#FF5500');

  const palette = project.palette;
  const activeColor: VGAColor = palette[selectedIndex] || {
    index: selectedIndex,
    r: 0,
    g: 0,
    b: 0,
    name: `VGA #${selectedIndex}`,
  };

  const { r6, g6, b6 } = getVgaDac6Bit(activeColor);

  // Update a single color in the palette
  const updateColor = (index: number, newR: number, newG: number, newB: number, newName?: string) => {
    const clampedR = Math.max(0, Math.min(255, Math.round(newR)));
    const clampedG = Math.max(0, Math.min(255, Math.round(newG)));
    const clampedB = Math.max(0, Math.min(255, Math.round(newB)));

    const newPalette = [...palette];
    newPalette[index] = {
      index,
      r: clampedR,
      g: clampedG,
      b: clampedB,
      name: newName !== undefined ? newName : activeColor.name,
    };

    onUpdateProject({ ...project, palette: newPalette });
  };

  // Update via 6-bit DAC values (0 to 63)
  const updateViaDac6 = (newR6: number, newG6: number, newB6: number) => {
    const { r, g, b } = from6BitDac(newR6, newG6, newB6);
    updateColor(selectedIndex, r, g, b);
  };

  // Update via Hex code string
  const handleHexChange = (hex: string) => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length === 6) {
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        updateColor(selectedIndex, r, g, b);
      }
    }
  };

  // Quick Filters
  const applyInvert = () => {
    updateColor(selectedIndex, 255 - activeColor.r, 255 - activeColor.g, 255 - activeColor.b);
  };

  const applyGrayscale = () => {
    const avg = Math.round((activeColor.r + activeColor.g + activeColor.b) / 3);
    updateColor(selectedIndex, avg, avg, avg);
  };

  const applyBrighten = (factor: number) => {
    updateColor(
      selectedIndex,
      Math.min(255, activeColor.r * factor),
      Math.min(255, activeColor.g * factor),
      Math.min(255, activeColor.b * factor)
    );
  };

  // Apply Preset Palette
  const handleApplyPreset = (type: 'default' | 'doom' | 'cyberpunk' | 'amber' | 'gameboy' | 'grayscale') => {
    const presetPalette = generatePresetPalette(type);
    onUpdateProject({ ...project, palette: presetPalette });
  };

  // Generate Smooth Color Ramp / Gradient across index range
  const handleGenerateRamp = () => {
    const start = Math.min(rampStartIdx, rampEndIdx);
    const end = Math.max(rampStartIdx, rampEndIdx);
    const steps = end - start;
    if (steps <= 0) return;

    // Parse start and end RGB
    const parseHex = (hex: string) => {
      const c = hex.replace('#', '');
      return {
        r: parseInt(c.substring(0, 2), 16) || 0,
        g: parseInt(c.substring(2, 4), 16) || 0,
        b: parseInt(c.substring(4, 6), 16) || 0,
      };
    };

    const sRgb = parseHex(rampStartColor);
    const eRgb = parseHex(rampEndColor);

    const newPalette = [...palette];
    for (let i = 0; i <= steps; i++) {
      const idx = start + i;
      const t = i / steps;
      const r = Math.round(sRgb.r + t * (eRgb.r - sRgb.r));
      const g = Math.round(sRgb.g + t * (eRgb.g - sRgb.g));
      const b = Math.round(sRgb.b + t * (eRgb.b - sRgb.b));

      newPalette[idx] = {
        index: idx,
        r,
        g,
        b,
        name: `Ramp ${start}-${end} #${idx}`,
      };
    }

    onUpdateProject({ ...project, palette: newPalette });
  };

  // Download raw 768-byte .PAL binary
  const handleDownloadPal = () => {
    const bytes = exportRawPalBinary(palette);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}.PAL`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick preset ramps
  const setQuickRamp = (startColor: string, endColor: string) => {
    setRampStartColor(startColor);
    setRampEndColor(endColor);
  };

  const hoveredColor = hoverIndex !== null ? palette[hoverIndex] : null;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 font-mono">
      {/* Top Banner */}
      <div className="bg-[#000044] border-2 border-[#5555ff] p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-[#5555ff] pb-3 mb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-yellow-300" />
            <div>
              <span className="font-pixel text-xs text-yellow-300 block">
                VGA MODE 13H 256-COLOR PALETTE EDITOR
              </span>
              <span className="text-[11px] text-[#aaaaaa]">
                6-Bit DAC Registers (Port 0x3C8 PEL Address / Port 0x3C9 PEL Data) &bull; Range 0-63 per channel
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPal}
              className="px-3 py-1.5 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-pixel text-[9px] shadow-[2px_2px_0_#000] flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT 768-BYTE .PAL</span>
            </button>

            <button
              onClick={() => handleApplyPreset('default')}
              className="px-3 py-1.5 bg-[#222222] hover:bg-[#333333] text-white font-mono text-xs border border-gray-600 flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3 text-yellow-400" />
              <span>RESET DEFAULT VGA</span>
            </button>
          </div>
        </div>

        {/* Preset Theme Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#ffff55] font-bold text-[11px]">PALETTE PRESETS:</span>
          <button
            onClick={() => handleApplyPreset('default')}
            className="px-2.5 py-1 bg-[#000022] hover:bg-[#000088] text-white border border-[#333333]"
          >
            IBM VGA BIOS (Default)
          </button>
          <button
            onClick={() => handleApplyPreset('doom')}
            className="px-2.5 py-1 bg-[#000022] hover:bg-[#aa0000] text-white border border-[#333333]"
          >
            Hell / Doom Gritty
          </button>
          <button
            onClick={() => handleApplyPreset('cyberpunk')}
            className="px-2.5 py-1 bg-[#000022] hover:bg-[#aa00aa] text-white border border-[#333333]"
          >
            Cyberpunk Neon
          </button>
          <button
            onClick={() => handleApplyPreset('amber')}
            className="px-2.5 py-1 bg-[#000022] hover:bg-[#aa5500] text-white border border-[#333333]"
          >
            Monochrome Amber CRT
          </button>
          <button
            onClick={() => handleApplyPreset('gameboy')}
            className="px-2.5 py-1 bg-[#000022] hover:bg-[#00aa00] text-white border border-[#333333]"
          >
            Game Boy 4-Green
          </button>
          <button
            onClick={() => handleApplyPreset('grayscale')}
            className="px-2.5 py-1 bg-[#000022] hover:bg-[#555555] text-white border border-[#333333]"
          >
            256 Grayscale Ramp
          </button>
        </div>
      </div>

      {/* Main Layout: 256 Color Matrix (Left) + Color Tweaker & Tools (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT: 256 Color Grid (16 columns x 16 rows) */}
        <div className="lg:col-span-7 bg-[#111111] border-2 border-[#555555] p-3 text-xs shadow-xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#333333]">
            <div className="flex items-center space-x-2">
              <span className="font-pixel text-[10px] text-yellow-300">256 VGA COLOR MATRIX</span>
              <span className="text-[10px] text-[#aaaaaa]">(16x16 Grid)</span>
            </div>

            {/* Hover Info Badge */}
            <div className="text-[11px] font-mono text-cyan-300 h-5 flex items-center">
              {hoveredColor ? (
                <span>
                  Hover: #{hoveredColor.index} &bull; {getColorHex(hoveredColor)} &bull; DAC 6-bit ({getVgaDac6Bit(hoveredColor).r6},{getVgaDac6Bit(hoveredColor).g6},{getVgaDac6Bit(hoveredColor).b6})
                </span>
              ) : (
                <span className="text-[#666666]">Click any slot to tweak color</span>
              )}
            </div>
          </div>

          {/* 16x16 Color Palette Grid */}
          <div className="grid grid-cols-16 gap-1 bg-[#000000] p-2 border border-[#222222] select-none">
            {palette.map((c) => {
              const isSelected = selectedIndex === c.index;
              return (
                <button
                  key={c.index}
                  onClick={() => setSelectedIndex(c.index)}
                  onMouseEnter={() => setHoverIndex(c.index)}
                  onMouseLeave={() => setHoverIndex(null)}
                  className={`aspect-square relative border transition-all ${
                    isSelected
                      ? 'border-white ring-2 ring-yellow-400 z-10 scale-125 shadow-lg'
                      : 'border-black hover:border-white hover:scale-110 hover:z-10'
                  }`}
                  style={{ backgroundColor: getColorCss(c) }}
                  title={`#${c.index}: ${c.name} (${getColorHex(c)})`}
                >
                  {/* Subtle marker for standard 16 DOS colors (0-15) */}
                  {c.index < 16 && (
                    <span className="absolute bottom-0 right-0 w-1 h-1 bg-white opacity-40 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Color Section Legend */}
          <div className="mt-3 pt-2 border-t border-[#222222] flex flex-wrap items-center justify-between text-[10px] text-[#888888] gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-[#aa0000] inline-block border border-gray-600" />
              <span>Indices 0-15: Standard DOS / EGA</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-[#888888] inline-block border border-gray-600" />
              <span>16-31: 16 Gray Shades</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-[#00aaaa] inline-block border border-gray-600" />
              <span>32-247: 6x6x6 VGA Cube Ramps</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-[#ffff55] inline-block border border-gray-600" />
              <span>248-255: Custom Tones</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Active Color Inspector & Ramp Generator Tools */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Sub-view switcher tabs */}
          <div className="flex bg-[#000022] border-2 border-[#5555ff] p-1 text-xs">
            <button
              onClick={() => setActiveSubView('editor')}
              className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                activeSubView === 'editor'
                  ? 'bg-[#ffff55] text-black shadow'
                  : 'text-[#aaaaaa] hover:text-white'
              }`}
            >
              COLOR INSPECTOR
            </button>
            <button
              onClick={() => setActiveSubView('ramp')}
              className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                activeSubView === 'ramp'
                  ? 'bg-[#ffff55] text-black shadow'
                  : 'text-[#aaaaaa] hover:text-white'
              }`}
            >
              RAMP GENERATOR
            </button>
            <button
              onClick={() => setActiveSubView('code')}
              className={`flex-1 py-1.5 text-center font-bold transition-colors ${
                activeSubView === 'code'
                  ? 'bg-[#ffff55] text-black shadow'
                  : 'text-[#aaaaaa] hover:text-white'
              }`}
            >
              C / ASM EXPORT
            </button>
          </div>

          {/* TAB 1: COLOR INSPECTOR & TWEAKER */}
          {activeSubView === 'editor' && (
            <div className="bg-[#000044] border-2 border-[#5555ff] p-4 text-xs space-y-4">
              {/* Active Color Banner */}
              <div className="flex items-center space-x-4 bg-black p-3 border border-gray-700">
                <div
                  className="w-16 h-16 border-2 border-white shadow-lg flex-shrink-0"
                  style={{ backgroundColor: getColorCss(activeColor) }}
                />

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-300 font-bold text-sm">
                      Index #{selectedIndex}
                    </span>
                    <span className="text-[#55ff55] font-mono text-[11px]">
                      {getColorHex(activeColor)}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={activeColor.name}
                    onChange={(e) => updateColor(selectedIndex, activeColor.r, activeColor.g, activeColor.b, e.target.value)}
                    className="w-full bg-[#111111] border border-gray-700 px-2 py-0.5 text-white text-[11px]"
                    placeholder="Color Name"
                  />
                </div>
              </div>

              {/* VGA 6-Bit DAC Sliders (Port 0x3C9) */}
              <div className="bg-[#000022] p-3 border border-[#333333] space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#333333] pb-1">
                  <span className="text-[#55ff55] font-bold text-[11px]">
                    VGA 6-BIT DAC REGISTERS (0 - 63)
                  </span>
                  <span className="text-[10px] text-[#aaaaaa]">Port 3C9h</span>
                </div>

                {/* DAC Red 0-63 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-red-400 font-bold">RED (DAC):</span>
                    <span className="text-white font-bold">{r6} / 63</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="63"
                    value={r6}
                    onChange={(e) => updateViaDac6(parseInt(e.target.value, 10), g6, b6)}
                    className="w-full accent-red-500"
                  />
                </div>

                {/* DAC Green 0-63 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-green-400 font-bold">GREEN (DAC):</span>
                    <span className="text-white font-bold">{g6} / 63</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="63"
                    value={g6}
                    onChange={(e) => updateViaDac6(r6, parseInt(e.target.value, 10), b6)}
                    className="w-full accent-green-500"
                  />
                </div>

                {/* DAC Blue 0-63 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-blue-400 font-bold">BLUE (DAC):</span>
                    <span className="text-white font-bold">{b6} / 63</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="63"
                    value={b6}
                    onChange={(e) => updateViaDac6(r6, g6, parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>

              {/* 8-Bit RGB Inputs (0 - 255) */}
              <div className="bg-[#000022] p-3 border border-[#333333] space-y-2">
                <span className="text-[#aaaaaa] text-[10px] block font-bold">
                  8-BIT RGB VALUE (0 - 255):
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <span className="text-[9px] text-red-400 block">R:</span>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={activeColor.r}
                      onChange={(e) => updateColor(selectedIndex, parseInt(e.target.value, 10) || 0, activeColor.g, activeColor.b)}
                      className="w-full bg-black border border-gray-600 px-1 py-0.5 text-center text-white text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-green-400 block">G:</span>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={activeColor.g}
                      onChange={(e) => updateColor(selectedIndex, activeColor.r, parseInt(e.target.value, 10) || 0, activeColor.b)}
                      className="w-full bg-black border border-gray-600 px-1 py-0.5 text-center text-white text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-blue-400 block">B:</span>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={activeColor.b}
                      onChange={(e) => updateColor(selectedIndex, activeColor.r, activeColor.g, parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-black border border-gray-600 px-1 py-0.5 text-center text-white text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-yellow-400 block">HEX:</span>
                    <input
                      type="text"
                      value={getColorHex(activeColor)}
                      onChange={(e) => handleHexChange(e.target.value)}
                      className="w-full bg-black border border-gray-600 px-1 py-0.5 text-center text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Adjustment Tools */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                <button
                  onClick={applyInvert}
                  className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-gray-600 text-[10px]"
                >
                  INVERT
                </button>
                <button
                  onClick={applyGrayscale}
                  className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-gray-600 text-[10px]"
                >
                  GRAY
                </button>
                <button
                  onClick={() => applyBrighten(1.15)}
                  className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-gray-600 text-[10px]"
                >
                  +15% BRIGHT
                </button>
                <button
                  onClick={() => applyBrighten(0.85)}
                  className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-gray-600 text-[10px]"
                >
                  -15% DARK
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COLOR RAMP / GRADIENT GENERATOR */}
          {activeSubView === 'ramp' && (
            <div className="bg-[#000044] border-2 border-[#5555ff] p-4 text-xs space-y-3">
              <div className="border-b border-[#5555ff] pb-2 mb-2">
                <span className="font-pixel text-[10px] text-yellow-300 block">
                  COLOR RAMP / GRADIENT GENERATOR
                </span>
                <span className="text-[10px] text-[#aaaaaa]">
                  Smoothly interpolates colors across a range of indices (for fire, water, lighting ramps).
                </span>
              </div>

              {/* Range Selectors */}
              <div className="grid grid-cols-2 gap-3 bg-[#000022] p-2.5 border border-[#333333]">
                <div>
                  <label className="text-[10px] text-[#aaaaaa] block mb-1">START INDEX (0-255):</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={rampStartIdx}
                    onChange={(e) => setRampStartIdx(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-black border border-gray-600 px-2 py-1 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#aaaaaa] block mb-1">END INDEX (0-255):</label>
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={rampEndIdx}
                    onChange={(e) => setRampEndIdx(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-black border border-gray-600 px-2 py-1 text-white text-xs"
                  />
                </div>
              </div>

              {/* Start & End Color Pickers */}
              <div className="grid grid-cols-2 gap-3 bg-[#000022] p-2.5 border border-[#333333]">
                <div>
                  <label className="text-[10px] text-[#aaaaaa] block mb-1">START COLOR:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={rampStartColor}
                      onChange={(e) => setRampStartColor(e.target.value)}
                      className="w-8 h-8 cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={rampStartColor}
                      onChange={(e) => setRampStartColor(e.target.value)}
                      className="w-full bg-black border border-gray-600 px-2 py-1 text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#aaaaaa] block mb-1">END COLOR:</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={rampEndColor}
                      onChange={(e) => setRampEndColor(e.target.value)}
                      className="w-8 h-8 cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={rampEndColor}
                      onChange={(e) => setRampEndColor(e.target.value)}
                      className="w-full bg-black border border-gray-600 px-2 py-1 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Ramp Presets */}
              <div>
                <span className="text-[10px] text-[#ffff55] font-bold block mb-1.5">QUICK PRESETS:</span>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <button
                    onClick={() => setQuickRamp('#000000', '#FF3300')}
                    className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-red-800"
                  >
                    Fire / Lava
                  </button>
                  <button
                    onClick={() => setQuickRamp('#001133', '#00FFFF')}
                    className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-cyan-800"
                  >
                    Ice / Water
                  </button>
                  <button
                    onClick={() => setQuickRamp('#002200', '#55FF55')}
                    className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-green-800"
                  >
                    Toxic Slime
                  </button>
                  <button
                    onClick={() => setQuickRamp('#220033', '#FF00FF')}
                    className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-purple-800"
                  >
                    Neon Violet
                  </button>
                  <button
                    onClick={() => setQuickRamp('#332200', '#FFFF55')}
                    className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-yellow-800"
                  >
                    Gold Ramp
                  </button>
                  <button
                    onClick={() => setQuickRamp('#000000', '#FFFFFF')}
                    className="py-1 bg-[#222222] hover:bg-[#333333] text-white border border-gray-600"
                  >
                    Monochrome
                  </button>
                </div>
              </div>

              {/* Gradient Preview Bar */}
              <div
                className="h-6 w-full border border-white shadow"
                style={{
                  background: `linear-gradient(to right, ${rampStartColor}, ${rampEndColor})`,
                }}
              />

              <button
                onClick={handleGenerateRamp}
                className="w-full py-2 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-pixel text-[10px] shadow"
              >
                APPLY GRADIENT RAMP (#{rampStartIdx} to #{rampEndIdx})
              </button>
            </div>
          )}

          {/* TAB 3: TURBO C / ASSEMBLY PALETTE CODE */}
          {activeSubView === 'code' && (
            <div className="bg-[#000022] border-2 border-[#5555ff] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-[#5555ff] pb-2">
                <span className="text-yellow-300 font-bold">BORLAND TURBO C PALETTE LOADER</span>
                <button
                  onClick={() => copyCode(exportPaletteCCode(palette))}
                  className="px-2 py-0.5 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white text-[10px] flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'COPIED!' : 'COPY CODE'}</span>
                </button>
              </div>

              <pre className="overflow-x-auto text-[#aaaaaa] p-2 bg-black border border-gray-800 text-[10px] leading-relaxed max-h-72">
                {exportPaletteCCode(palette)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
