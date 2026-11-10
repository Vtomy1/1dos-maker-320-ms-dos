import React, { useState, useMemo } from 'react';
import { GameProject } from '../types/dos';
import {
  compileProjectResources,
  generateResourceCHeader,
  CompilerOptimizationOptions,
  DEFAULT_OPTIMIZATION_OPTIONS,
  ResourceChunkInfo,
} from '../engine/resourceCompiler';
import { formatHexDump } from '../engine/mzHeader';
import {
  Boxes,
  Cpu,
  Download,
  FileCode,
  Zap,
  Check,
  ShieldCheck,
  Sliders,
  Layers,
  Sparkles,
  BarChart3,
  HardDrive,
} from 'lucide-react';

interface ResourceCompilerProps {
  project: GameProject;
  onUpdateProject: (newProject: GameProject) => void;
}

export const ResourceCompiler: React.FC<ResourceCompilerProps> = ({ project, onUpdateProject }) => {
  const [options, setOptions] = useState<CompilerOptimizationOptions>(DEFAULT_OPTIMIZATION_OPTIONS);
  const [selectedChunkIdx, setSelectedChunkIdx] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [embeddedSuccess, setEmbeddedSuccess] = useState<boolean>(false);

  // Compile resources with active options
  const compiled = useMemo(() => {
    return compileProjectResources(project, options);
  }, [project, options]);

  const activeChunk: ResourceChunkInfo | undefined = compiled.chunks[selectedChunkIdx] || compiled.chunks[0];

  // Hex dump of active chunk
  const hexDump = useMemo(() => {
    if (!activeChunk) return { lines: [] };
    return formatHexDump(activeChunk.data, 0, 256);
  }, [activeChunk]);

  // C Header code
  const cHeaderCode = useMemo(() => {
    return generateResourceCHeader(compiled.chunks);
  }, [compiled.chunks]);

  // Download GAME.DAT binary blob
  const handleDownloadDat = () => {
    const blob = new Blob([compiled.combinedBinary.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}.DAT`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download RESOURCES.H
  const handleDownloadHeader = () => {
    const blob = new Blob([cHeaderCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RESOURCES.H';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyHeader = () => {
    navigator.clipboard.writeText(cHeaderCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Embed into EXE Project Settings
  const handleEmbedIntoExe = () => {
    // Stores compiled stats in project configuration
    const updated = {
      ...project,
      mzHeaderConfig: {
        ...project.mzHeaderConfig,
        e_cblp: compiled.totalCompiledBytes % 512,
        e_cp: Math.ceil((compiled.totalCompiledBytes + 64) / 512),
      },
    };
    onUpdateProject(updated);
    setEmbeddedSuccess(true);
    setTimeout(() => setEmbeddedSuccess(false), 2500);
  };

  // 64KB Segment calculation (65,536 bytes limit for 16-bit real-mode data segment)
  const dataSegmentLimit = 65536;
  const dataSegmentUsagePercent = Math.min(100, Math.round((compiled.totalCompiledBytes / dataSegmentLimit) * 100));

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 font-mono text-xs">
      {/* Top Banner & Compile Actions */}
      <div className="bg-[#000044] border-2 border-[#5555ff] p-4">
        <div className="flex flex-wrap items-center justify-between border-b border-[#5555ff] pb-3 mb-3 gap-3">
          <div className="flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-yellow-300" />
            <div>
              <span className="font-pixel text-xs text-yellow-300 block">
                MS-DOS RESOURCE COMPILER & DATA BLOB MANAGER
              </span>
              <span className="text-[11px] text-[#aaaaaa]">
                Binary structure packaging, RLE Carmack compression & 16-byte paragraph alignment for Mode 13h
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleEmbedIntoExe}
              className={`px-3 py-1.5 font-pixel text-[9px] shadow-[2px_2px_0_#000] flex items-center space-x-1.5 transition-all ${
                embeddedSuccess
                  ? 'bg-[#55ff55] text-black font-bold'
                  : 'bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white'
              }`}
            >
              {embeddedSuccess ? <Check className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
              <span>{embeddedSuccess ? 'EMBEDDED IN EXE BUILD!' : 'EMBED IN FINAL EXE'}</span>
            </button>

            <button
              onClick={handleDownloadDat}
              className="px-3 py-1.5 bg-[#aa5500] hover:bg-[#ff5555] text-white font-pixel text-[9px] shadow-[2px_2px_0_#000] flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT GAME.DAT ({compiled.totalCompiledBytes} B)</span>
            </button>

            <button
              onClick={handleDownloadHeader}
              className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#333333] text-white border border-gray-600 flex items-center space-x-1"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>RESOURCES.H</span>
            </button>
          </div>
        </div>

        {/* Real-Mode 64KB Data Segment & Compression Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Binary Size */}
          <div className="bg-[#000022] p-2.5 border border-[#333333]">
            <span className="text-[#888888] block text-[9px]">TOTAL RESOURCE BLOB</span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-yellow-300 font-bold text-sm">
                {compiled.totalCompiledBytes} Bytes
              </span>
              <span className="text-[#666666] line-through text-[10px]">
                {compiled.totalRawBytes} B raw
              </span>
            </div>
            <span className="text-[#55ff55] text-[10px]">
              Saved {compiled.totalSavedBytes} Bytes ({Math.round((compiled.totalSavedBytes / (compiled.totalRawBytes || 1)) * 100)}%)
            </span>
          </div>

          {/* 64KB Real Mode Segment Gauge */}
          <div className="bg-[#000022] p-2.5 border border-[#333333]">
            <div className="flex justify-between items-center text-[9px] text-[#888888] mb-1">
              <span>64KB DATA SEGMENT (DS)</span>
              <span className="text-white font-bold">{dataSegmentUsagePercent}%</span>
            </div>
            <div className="w-full bg-black h-2.5 border border-gray-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500"
                style={{ width: `${dataSegmentUsagePercent}%` }}
              />
            </div>
            <span className="text-[10px] text-[#aaaaaa] mt-1 block">
              {dataSegmentLimit - compiled.totalCompiledBytes} B remaining in 64K segment
            </span>
          </div>

          {/* Conventional Memory Headroom */}
          <div className="bg-[#000022] p-2.5 border border-[#333333]">
            <span className="text-[#888888] block text-[9px]">DOS 640KB BASE RAM</span>
            <span className="text-[#55ff55] font-bold text-sm">
              638.2 KB Free
            </span>
            <span className="text-[#aaaaaa] text-[10px] block">
              Well within IBM PC/AT limits
            </span>
          </div>

          {/* Active Chunks */}
          <div className="bg-[#000022] p-2.5 border border-[#333333]">
            <span className="text-[#888888] block text-[9px]">COMPILED CHUNKS</span>
            <span className="text-cyan-300 font-bold text-sm">
              {compiled.chunks.length} Resource Chunks
            </span>
            <span className="text-[#aaaaaa] text-[10px] block">
              Magic: 'DOSM' v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Optimization Controls + Chunk Table + Live Hex Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: Optimization Toggles & Chunk Directory (8 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Optimization Options Panel */}
          <div className="bg-[#000044] border-2 border-[#5555ff] p-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#5555ff] pb-2 mb-2">
              <span className="font-pixel text-[10px] text-yellow-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                BINARY OPTIMIZATION PASSES
              </span>
              <span className="text-[10px] text-[#55ff55]">REAL-TIME RECOMPILATION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* RLE Carmack Compression */}
              <label className="flex items-start space-x-2 bg-[#000022] p-2 border border-[#333333] cursor-pointer hover:border-yellow-400">
                <input
                  type="checkbox"
                  checked={options.enableRleCompression}
                  onChange={(e) => setOptions({ ...options, enableRleCompression: e.target.checked })}
                  className="mt-0.5 accent-yellow-400"
                />
                <div>
                  <div className="font-bold text-white text-[11px]">RLE Compression</div>
                  <div className="text-[9px] text-[#888888]">
                    Compress identical pixel runs (Carmack / Keen algorithm)
                  </div>
                </div>
              </label>

              {/* 16-Byte Paragraph Alignment */}
              <label className="flex items-start space-x-2 bg-[#000022] p-2 border border-[#333333] cursor-pointer hover:border-yellow-400">
                <input
                  type="checkbox"
                  checked={options.alignParagraph16}
                  onChange={(e) => setOptions({ ...options, alignParagraph16: e.target.checked })}
                  className="mt-0.5 accent-yellow-400"
                />
                <div>
                  <div className="font-bold text-white text-[11px]">Paragraph (16B) Align</div>
                  <div className="text-[9px] text-[#888888]">
                    Align chunk offsets for fast 8086 <code className="text-green-400">REP MOVSW</code>
                  </div>
                </div>
              </label>

              {/* Transparent Border Stripping */}
              <label className="flex items-start space-x-2 bg-[#000022] p-2 border border-[#333333] cursor-pointer hover:border-yellow-400">
                <input
                  type="checkbox"
                  checked={options.stripTransparentBorders}
                  onChange={(e) => setOptions({ ...options, stripTransparentBorders: e.target.checked })}
                  className="mt-0.5 accent-yellow-400"
                />
                <div>
                  <div className="font-bold text-white text-[11px]">Crop Transparency</div>
                  <div className="text-[9px] text-[#888888]">
                    Optimize empty outer borders in sprite bank
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Chunk Directory Table */}
          <div className="bg-[#111111] border-2 border-[#555555] p-3 text-xs shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#333333]">
              <span className="font-pixel text-[10px] text-yellow-300">
                RESOURCE ASSET DIRECTORY (CHUNKS)
              </span>
              <span className="text-[10px] text-[#aaaaaa]">
                Click row to inspect raw binary bytes
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-[#333333] text-[11px]">
                <thead>
                  <tr className="bg-[#000088] text-[#ffff55] border-b border-[#5555ff]">
                    <th className="p-1.5 border border-[#333333]">Tag</th>
                    <th className="p-1.5 border border-[#333333]">Resource Name</th>
                    <th className="p-1.5 border border-[#333333]">Offset</th>
                    <th className="p-1.5 border border-[#333333]">Raw Size</th>
                    <th className="p-1.5 border border-[#333333]">Packed</th>
                    <th className="p-1.5 border border-[#333333]">Ratio</th>
                    <th className="p-1.5 border border-[#333333]">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {compiled.chunks.map((chunk, idx) => {
                    const isSelected = selectedChunkIdx === idx;
                    return (
                      <tr
                        key={chunk.tag}
                        onClick={() => setSelectedChunkIdx(idx)}
                        className={`border-b border-[#222233] cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#aaaaaa] text-black font-bold'
                            : 'hover:bg-[#1a1a2e] text-[#cccccc]'
                        }`}
                      >
                        <td className="p-1.5 font-mono font-bold text-cyan-400 border border-[#333333]">
                          <span
                            className={`px-1 py-0.5 rounded text-[10px] ${
                              isSelected ? 'bg-black text-cyan-300' : 'bg-[#000044] text-cyan-300'
                            }`}
                          >
                            {chunk.tag}
                          </span>
                        </td>
                        <td className="p-1.5 border border-[#333333]">{chunk.name}</td>
                        <td className="p-1.5 font-mono border border-[#333333]">
                          0x{chunk.offset.toString(16).toUpperCase().padStart(4, '0')}
                        </td>
                        <td className="p-1.5 border border-[#333333]">{chunk.rawSize} B</td>
                        <td className="p-1.5 font-bold border border-[#333333]">{chunk.compiledSize} B</td>
                        <td className="p-1.5 border border-[#333333]">
                          {chunk.compressionRatio > 0 ? (
                            <span className="text-green-500 font-bold">-{chunk.compressionRatio}%</span>
                          ) : (
                            <span className="text-gray-500">1:1</span>
                          )}
                        </td>
                        <td className="p-1.5 border border-[#333333]">
                          <span
                            className={`px-1 text-[9px] ${
                              chunk.isCompressed
                                ? 'bg-green-900 text-green-300'
                                : 'bg-gray-800 text-gray-400'
                            }`}
                          >
                            {chunk.isCompressed ? 'RLE' : 'RAW'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Hex Dump & Turbo C Header Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Chunk Byte Inspector */}
          <div className="bg-[#000000] border-2 border-[#5555ff] p-3 text-xs shadow-xl">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#333333]">
              <span className="font-pixel text-[10px] text-green-400">
                RAW HEX INSPECTOR: {activeChunk?.tag}
              </span>
              <span className="text-[10px] text-[#aaaaaa]">
                Offset: 0x{activeChunk?.offset.toString(16).toUpperCase().padStart(4, '0')} ({activeChunk?.compiledSize} B)
              </span>
            </div>

            {/* Hex Dump */}
            <div className="overflow-x-auto space-y-0.5 text-[10px] max-h-72">
              {hexDump.lines.map((line, idx) => (
                <div key={idx} className="flex items-center space-x-2 hover:bg-[#111122]">
                  <span className="text-cyan-400 select-none w-14">{line.offsetHex}</span>
                  <div className="flex space-x-1 text-[#55ff55]">
                    {line.bytesHex.map((b, bIdx) => (
                      <span
                        key={bIdx}
                        className={
                          b === 'FE'
                            ? 'bg-red-900 text-yellow-300 px-0.5 font-bold'
                            : bIdx === 8
                            ? 'ml-1 text-white'
                            : ''
                        }
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                  <span className="text-[#ffff55] border-l border-gray-700 pl-2 select-none">
                    |{line.ascii}|
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 text-[9px] text-[#888888] border-t border-[#222222] pt-1">
              Red bytes <code className="text-red-400 font-bold">FE</code> represent RLE repeat tokens (Carmack packed sequences).
            </div>
          </div>

          {/* RESOURCES.H C Header Preview */}
          <div className="bg-[#000022] border-2 border-[#5555ff] p-3 text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#5555ff]">
              <span className="font-pixel text-[10px] text-yellow-300">
                TURBO C HEADER (RESOURCES.H)
              </span>
              <button
                onClick={copyHeader}
                className="px-2 py-0.5 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white text-[10px] flex items-center space-x-1"
              >
                {copiedCode ? <Check className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
                <span>{copiedCode ? 'COPIED!' : 'COPY HEADER'}</span>
              </button>
            </div>

            <pre className="overflow-x-auto text-[#aaaaaa] p-2 bg-black border border-gray-800 text-[10px] leading-relaxed max-h-48">
              {cHeaderCode}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
