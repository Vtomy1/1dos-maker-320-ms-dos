import React from 'react';
import { GameProject } from '../types/dos';
import {
  BarChart2,
  HardDrive,
  Cpu,
  Layers,
  Music,
  FileCode,
  Download,
  Disc,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { buildDosDistributionZip, buildDosExecutable } from '../engine/mzHeader';

interface ProjectSummaryProps {
  project: GameProject;
}

export const ProjectSummary: React.FC<ProjectSummaryProps> = ({ project }) => {
  // --- Calculate Metrics ---
  const spriteCount = project.sprites.length;
  const totalFrames = project.sprites.reduce((acc, s) => acc + s.frames.length, 0);
  const spritePixelBytes = project.sprites.reduce((acc, s) => {
    return acc + s.frames.reduce((fAcc, f) => fAcc + f.width * f.height, 0);
  }, 0);

  const tileCount = project.tiles.length;
  const tilePixelBytes = tileCount * 16 * 16; // each tile is 16x16 = 256 bytes

  const map = project.maps[project.activeMapIndex] || project.maps[0];
  const mapTilesCount = (map?.width || 20) * (map?.height || 12);
  const mapDataBytes = mapTilesCount * 2 + (map?.entities.length || 0) * 16; // 2 bytes per tile index + entity structs

  const paletteBytes = 256 * 3; // 768 bytes for VGA 256-color RGB DAC registers

  // Audio metrics
  const melodyNotesCount = project.customMelody
    ? project.customMelody.channel1.steps.filter(Boolean).length +
      project.customMelody.channel2.steps.filter(Boolean).length
    : 0;
  const audioDataBytes = 1024 + melodyNotesCount * 4; // SFX tables + BGM pattern buffer

  // Real-mode Data Segment (DS) size in bytes
  const totalDataSegmentBytes =
    spritePixelBytes +
    tilePixelBytes +
    mapDataBytes +
    paletteBytes +
    audioDataBytes +
    2048; // Global variables & string literals

  const maxDataSegmentLimit = 65536; // 64KB standard real-mode segment
  const dsUsagePercent = Math.min(100, Math.round((totalDataSegmentBytes / maxDataSegmentLimit) * 100));

  // Estimated Executable size
  const mzHeaderBytes = 512;
  const codeSegmentBytes = 8192; // x86 runtime engine code
  const totalExeBytes = mzHeaderBytes + codeSegmentBytes + totalDataSegmentBytes;

  // Conventional RAM footprint (DOS 640KB)
  // VGA Mode 13h video buffer at A000:0000 is 64,000 bytes (outside 640K conventional RAM),
  // but Double-buffering offscreen buffer takes 64,000 bytes in conventional RAM.
  const doubleBufferBytes = 64000;
  const conventionalRamUsed = totalExeBytes + doubleBufferBytes + 32768; // + DOS heap/stack
  const conventionalRamTotal = 640 * 1024; // 655,360 bytes
  const ramUsagePercent = Math.min(100, Math.round((conventionalRamUsed / conventionalRamTotal) * 100));

  // Floppy media percentages
  const floppy360Kb = 360 * 1024;
  const floppy720Kb = 720 * 1024;
  const floppy144Mb = 1440 * 1024;

  const pct360 = Math.min(100, Math.round((totalExeBytes / floppy360Kb) * 100));
  const pct720 = Math.min(100, Math.round((totalExeBytes / floppy720Kb) * 100));
  const pct144 = Math.min(100, Math.round((totalExeBytes / floppy144Mb) * 100));

  // Recommended DOSBox CPU Cycles
  let recommendedCpu = '80386DX 25MHz';
  let recommendedCycles = '10,000 CYCLES';
  if (totalDataSegmentBytes > 45000 || spriteCount > 10) {
    recommendedCpu = '80486DX 33MHz';
    recommendedCycles = '18,000 CYCLES';
  } else if (totalDataSegmentBytes < 15000) {
    recommendedCpu = '80286 12MHz (IBM AT)';
    recommendedCycles = '6,000 CYCLES';
  }

  // Handle direct download
  const handleDownloadExe = () => {
    try {
      const exeBinary = buildDosExecutable(project);
      const blob = new Blob([exeBinary.buffer as ArrayBuffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}.EXE`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading EXE:', err);
    }
  };

  const handleDownloadZip = async () => {
    try {
      const zipBlob = await buildDosDistributionZip(project);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}_DOS.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading ZIP:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-[#0000aa] border-2 border-[#5555ff] p-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_#000000]">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-yellow-300" />
          <h2 className="font-pixel text-sm text-yellow-300 tracking-wider">
            PROJECT SUMMARY & DOS HARDWARE BUDGET
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="bg-[#000088] px-2 py-0.5 border border-[#5555ff] text-green-300">
            TARGET: INTEL 8086/80286/80386/80486 REAL-MODE
          </span>
          <span className="text-[#ffff55] font-bold">MS-DOS 6.22</span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Estimated EXE Size */}
        <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white">
          <div className="text-[10px] font-mono text-[#aaaaaa] flex items-center justify-between">
            <span>BINARY FILE SIZE</span>
            <FileCode className="w-3.5 h-3.5 text-cyan-300" />
          </div>
          <div className="mt-1 font-pixel text-base text-yellow-300">
            {(totalExeBytes / 1024).toFixed(1)} KB
          </div>
          <div className="text-[10px] font-mono text-[#55ff55]">
            {totalExeBytes.toLocaleString()} BYTES COMPILED
          </div>
        </div>

        {/* KPI 2: 64KB Data Segment Meter */}
        <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white">
          <div className="text-[10px] font-mono text-[#aaaaaa] flex items-center justify-between">
            <span>64KB DS SEGMENT BUDGET</span>
            <Database className="w-3.5 h-3.5 text-yellow-300" />
          </div>
          <div className="mt-1 font-pixel text-base text-cyan-300">
            {dsUsagePercent}%
          </div>
          <div className="text-[10px] font-mono text-[#aaaaaa]">
            {(totalDataSegmentBytes / 1024).toFixed(1)} / 64.0 KB USED
          </div>
        </div>

        {/* KPI 3: Conventional RAM */}
        <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white">
          <div className="text-[10px] font-mono text-[#aaaaaa] flex items-center justify-between">
            <span>CONVENTIONAL RAM (640K)</span>
            <HardDrive className="w-3.5 h-3.5 text-green-300" />
          </div>
          <div className="mt-1 font-pixel text-base text-green-300">
            {Math.round(conventionalRamUsed / 1024)} KB
          </div>
          <div className="text-[10px] font-mono text-[#55ff55]">
            {Math.round((conventionalRamTotal - conventionalRamUsed) / 1024)} KB FREE HEADROOM
          </div>
        </div>

        {/* KPI 4: Recommended DOSBox Cycles */}
        <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white">
          <div className="text-[10px] font-mono text-[#aaaaaa] flex items-center justify-between">
            <span>RECOMMENDED CPU</span>
            <Cpu className="w-3.5 h-3.5 text-purple-300" />
          </div>
          <div className="mt-1 font-pixel text-sm text-yellow-300 truncate">
            {recommendedCycles}
          </div>
          <div className="text-[10px] font-mono text-[#aaaaaa]">
            {recommendedCpu}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Asset Breakdown & Segment Memory Map */}
        <div className="lg:col-span-7 space-y-4">
          {/* Detailed Memory & Asset Table */}
          <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#0000aa] pb-1">
              <span className="font-pixel text-[11px] text-yellow-300">
                DATA SEGMENT CHUNK BREAKDOWN
              </span>
              <span className="text-[10px] font-mono text-cyan-300">
                REAL-MODE 8086 DS:OFFSET
              </span>
            </div>

            <div className="divide-y divide-[#0000aa] text-xs font-mono">
              <div className="py-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-yellow-400 inline-block" />
                  <span>VGA Sprite Bitmaps ({spriteCount} Sprites, {totalFrames} Frames)</span>
                </div>
                <span className="font-bold text-yellow-300">
                  {spritePixelBytes.toLocaleString()} B ({(spritePixelBytes / 1024).toFixed(1)} KB)
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-green-400 inline-block" />
                  <span>Tile Graphics ({tileCount} Tiles @ 16x16 256c)</span>
                </div>
                <span className="font-bold text-green-300">
                  {tilePixelBytes.toLocaleString()} B ({(tilePixelBytes / 1024).toFixed(1)} KB)
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-cyan-400 inline-block" />
                  <span>World Tilemap ({map?.width}x{map?.height} Tiles + {map?.entities.length} Entities)</span>
                </div>
                <span className="font-bold text-cyan-300">
                  {mapDataBytes.toLocaleString()} B ({(mapDataBytes / 1024).toFixed(1)} KB)
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-purple-400 inline-block" />
                  <span>Mode 13h VGA Palette (256 Colors x 3 RGB DAC)</span>
                </div>
                <span className="font-bold text-purple-300">
                  {paletteBytes.toLocaleString()} B (0.75 KB)
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-red-400 inline-block" />
                  <span>Audio & Sequencer ({melodyNotesCount} Notes, OPL2 synth)</span>
                </div>
                <span className="font-bold text-red-300">
                  {audioDataBytes.toLocaleString()} B ({(audioDataBytes / 1024).toFixed(1)} KB)
                </span>
              </div>

              <div className="py-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 bg-gray-400 inline-block" />
                  <span>Game Rules & Script Triggers ({project.events?.length || 0} Events)</span>
                </div>
                <span className="font-bold text-gray-300">
                  {((project.events?.length || 0) * 64 + 1024).toLocaleString()} B
                </span>
              </div>
            </div>

            {/* DS Segment Progress Bar */}
            <div className="pt-2 border-t border-[#0000aa] space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#aaaaaa]">64KB Real Mode Segment Ceiling:</span>
                <span className={dsUsagePercent > 85 ? 'text-red-400 font-bold' : 'text-green-300'}>
                  {totalDataSegmentBytes} / 65,536 Bytes ({dsUsagePercent}%)
                </span>
              </div>
              <div className="w-full bg-[#000033] h-3 border border-[#5555ff] overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    dsUsagePercent > 85 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-green-400'
                  }`}
                  style={{ width: `${dsUsagePercent}%` }}
                />
              </div>
              {dsUsagePercent < 85 ? (
                <div className="text-[10px] font-mono text-[#55ff55] flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Segment OK: Fits cleanly in single 64KB DS register without EMS/XMS bank switching.</span>
                </div>
              ) : (
                <div className="text-[10px] font-mono text-yellow-300 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  <span>Warning: Approaching 64KB limit! Consider enabling Carmack RLE compression.</span>
                </div>
              )}
            </div>
          </div>

          {/* Floppy Disk Media Capacity Comparison */}
          <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-[#0000aa] pb-1">
              <span className="font-pixel text-[11px] text-yellow-300">
                RETRO FLOPPY DISK DISTRIBUTION SIZING
              </span>
              <Disc className="w-4 h-4 text-cyan-300" />
            </div>

            <div className="space-y-2 text-xs font-mono">
              {/* 360 KB */}
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>5.25" 360 KB Double-Density Floppy (IBM PC/XT):</span>
                  <span className="text-yellow-300">{pct360}%</span>
                </div>
                <div className="w-full bg-[#000033] h-2 border border-[#5555ff] mt-0.5">
                  <div className="h-full bg-yellow-400" style={{ width: `${pct360}%` }} />
                </div>
              </div>

              {/* 720 KB */}
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>3.5" 720 KB Double-Density Floppy (IBM PS/2):</span>
                  <span className="text-green-300">{pct720}%</span>
                </div>
                <div className="w-full bg-[#000033] h-2 border border-[#5555ff] mt-0.5">
                  <div className="h-full bg-green-400" style={{ width: `${pct720}%` }} />
                </div>
              </div>

              {/* 1.44 MB */}
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>3.5" 1.44 MB High-Density Floppy (MS-DOS Standard):</span>
                  <span className="text-cyan-300">{pct144}%</span>
                </div>
                <div className="w-full bg-[#000033] h-2 border border-[#5555ff] mt-0.5">
                  <div className="h-full bg-cyan-400" style={{ width: `${pct144}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Project Meta & Quick Download Tools */}
        <div className="lg:col-span-5 space-y-4">
          {/* Project Metadata Card */}
          <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#0000aa] pb-1">
              <span className="font-pixel text-[11px] text-yellow-300">PROJECT METADATA</span>
              <span className="text-[10px] font-mono text-[#55ff55]">VALIDATED</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#aaaaaa]">TITLE:</span>
                <span className="font-bold text-white">{project.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#aaaaaa]">GENRE:</span>
                <span className="text-yellow-300 uppercase">{project.genre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#aaaaaa]">AUTHOR:</span>
                <span className="text-cyan-300">{project.author || 'Retro Dev'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#aaaaaa]">VERSION:</span>
                <span className="text-white">{project.version || '1.0.0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#aaaaaa]">VGA MODE:</span>
                <span className="text-green-300">Mode 13h (320x200x256c)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#aaaaaa]">SOUND CARD:</span>
                <span className="text-yellow-300">Sound Blaster 16 + OPL2</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#0000aa] text-[10px] font-mono text-[#cccccc] leading-relaxed">
              {project.description || 'MS-DOS game written with DOSMaker 320.'}
            </div>
          </div>

          {/* Export & Distribution Actions */}
          <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#0000aa] pb-1">
              <span className="font-pixel text-[11px] text-yellow-300">DISTRIBUTION BUILDS</span>
              <Download className="w-3.5 h-3.5 text-yellow-300" />
            </div>

            <div className="space-y-2">
              <button
                onClick={handleDownloadExe}
                className="w-full p-2 bg-[#aa5500] hover:bg-[#ff5555] text-white font-pixel text-xs border border-white shadow-[2px_2px_0px_#000000] flex items-center justify-center space-x-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD STANDALONE .EXE</span>
              </button>

              <button
                onClick={handleDownloadZip}
                className="w-full p-2 bg-[#0000aa] hover:bg-[#00aa00] text-white font-pixel text-xs border border-[#5555ff] shadow-[2px_2px_0px_#000000] flex items-center justify-center space-x-2 transition-all active:translate-x-0.5 active:translate-y-0.5"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>DOWNLOAD DOSBOX PACKAGE (.ZIP)</span>
              </button>
            </div>

            <div className="p-2 bg-[#000044] border border-[#5555ff] text-[10px] font-mono text-[#aaaaaa]">
              Package includes: <code className="text-yellow-300">GAME.EXE</code>, <code className="text-cyan-300">DOSBOX.CONF</code>, <code className="text-green-300">AUTOEXEC.BAT</code>, and <code className="text-white">README.TXT</code>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
