import React from 'react';
import { GameProject } from '../types/dos';
import { Volume2, VolumeX, Play, Edit3, Monitor, Download, Music, Cpu, Sparkles, Palette } from 'lucide-react';
import { soundBlaster } from '../engine/soundBlaster';

interface DosHeaderProps {
  project: GameProject;
  activeTab: 'play' | 'map' | 'sprite' | 'palette' | 'music' | 'sound' | 'exe' | 'code';
  setActiveTab: (tab: 'play' | 'map' | 'sprite' | 'palette' | 'music' | 'sound' | 'exe' | 'code') => void;
  crtEffect: boolean;
  setCrtEffect: (val: boolean) => void;
  onSelectTemplate: (template: 'keen' | 'dungeon' | 'space') => void;
  onDownloadPackage: () => void;
}

export const DosHeader: React.FC<DosHeaderProps> = ({
  project,
  activeTab,
  setActiveTab,
  crtEffect,
  setCrtEffect,
  onSelectTemplate,
  onDownloadPackage,
}) => {
  const [muted, setMuted] = React.useState(false);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundBlaster.setMasterVolume(next ? 0 : project.sbConfig.masterVolume);
  };

  return (
    <header className="bg-[#0000aa] text-[#ffffff] border-b-2 border-[#5555ff] select-none text-xs">
      {/* Top MS-DOS Turbo C Style Menu Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#000088] border-b border-[#0000aa]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-pixel text-yellow-300">
            <span className="bg-[#aa0000] px-1.5 py-0.5 text-white font-bold">DOS</span>
            <span>MAKER 320</span>
          </div>
          <span className="text-[#aaaaaa] font-mono">v1.3 [VGA 320x200 Mode 13h]</span>
          <span className="hidden md:inline-block bg-[#000000] text-[#55ff55] px-2 py-0.5 font-mono border border-[#555555]">
            BLASTER=A{project.sbConfig.basePort.replace('h','')} I{project.sbConfig.irq} D{project.sbConfig.dma8}
          </span>
        </div>

        {/* Template Quick Selectors */}
        <div className="flex items-center space-x-2">
          <span className="text-[#ffff55] hidden sm:inline font-mono">TEMPLATE:</span>
          <button
            onClick={() => onSelectTemplate('keen')}
            className={`px-2 py-0.5 font-mono text-[11px] transition-colors ${
              project.genre === 'platformer'
                ? 'bg-[#ffff55] text-[#000000] font-bold'
                : 'bg-[#000044] text-[#aaaaaa] hover:bg-[#0000aa] hover:text-white'
            }`}
          >
            Commander Keen
          </button>
          <button
            onClick={() => onSelectTemplate('dungeon')}
            className={`px-2 py-0.5 font-mono text-[11px] transition-colors ${
              project.genre === 'rpg_topdown'
                ? 'bg-[#ffff55] text-[#000000] font-bold'
                : 'bg-[#000044] text-[#aaaaaa] hover:bg-[#0000aa] hover:text-white'
            }`}
          >
            Catacomb 2D
          </button>
          <button
            onClick={() => onSelectTemplate('space')}
            className={`px-2 py-0.5 font-mono text-[11px] transition-colors ${
              project.genre === 'space_shooter'
                ? 'bg-[#ffff55] text-[#000000] font-bold'
                : 'bg-[#000044] text-[#aaaaaa] hover:bg-[#0000aa] hover:text-white'
            }`}
          >
            Solar Winds
          </button>
        </div>
      </div>

      {/* Main Studio Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 gap-2 bg-[#0000aa]">
        {/* Navigation Tabs (Turbo C style) */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('play')}
            className={`flex items-center space-x-1 px-3 py-1 font-mono transition-all ${
              activeTab === 'play'
                ? 'bg-[#aaaaaa] text-[#000000] shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#000000] font-bold'
                : 'text-[#ffffff] hover:bg-[#000088]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current text-green-700" />
            <span>F5 PLAY [320x200]</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center space-x-1 px-3 py-1 font-mono transition-all ${
              activeTab === 'map'
                ? 'bg-[#aaaaaa] text-[#000000] shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#000000] font-bold'
                : 'text-[#ffffff] hover:bg-[#000088]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>MAP EDITOR</span>
          </button>

          <button
            onClick={() => setActiveTab('sprite')}
            className={`flex items-center space-x-1 px-3 py-1 font-mono transition-all ${
              activeTab === 'sprite'
                ? 'bg-[#aaaaaa] text-[#000000] shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#000000] font-bold'
                : 'text-[#ffffff] hover:bg-[#000088]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>VGA SPRITES</span>
          </button>

          <button
            onClick={() => setActiveTab('palette')}
            className={`flex items-center space-x-1 px-3 py-1 font-mono transition-all ${
              activeTab === 'palette'
                ? 'bg-[#aaaaaa] text-[#000000] shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#000000] font-bold'
                : 'text-[#ffffff] hover:bg-[#000088]'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-yellow-300" />
            <span>PALETTE (256c)</span>
          </button>

          <button
            onClick={() => setActiveTab('music')}
            className={`flex items-center space-x-1 px-3 py-1 font-mono transition-all ${
              activeTab === 'music'
                ? 'bg-[#aaaaaa] text-[#000000] shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#000000] font-bold'
                : 'text-[#ffffff] hover:bg-[#000088]'
            }`}
          >
            <Music className="w-3.5 h-3.5 text-cyan-300" />
            <span>MUSIC SEQUENCER</span>
          </button>

          <button
            onClick={() => setActiveTab('sound')}
            className={`flex items-center space-x-1 px-3 py-1 font-mono transition-all ${
              activeTab === 'sound'
                ? 'bg-[#aaaaaa] text-[#000000] shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#000000] font-bold'
                : 'text-[#ffffff] hover:bg-[#000088]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-yellow-300" />
            <span>SOUND BLASTER 16</span>
          </button>

          <button
            onClick={() => setActiveTab('exe')}
            className={`flex items-center space-x-1 px-3 py-1 font-mono transition-all ${
              activeTab === 'exe'
                ? 'bg-[#aaaaaa] text-[#000000] shadow-[inset_1px_1px_0px_#ffffff,inset_-1px_-1px_0px_#000000] font-bold'
                : 'text-[#ffffff] hover:bg-[#000088]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-300" />
            <span>MZ .EXE HEADER</span>
          </button>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center space-x-2">
          {/* CRT scanline switch */}
          <button
            onClick={() => setCrtEffect(!crtEffect)}
            className={`flex items-center space-x-1 px-2 py-1 font-mono border text-[11px] ${
              crtEffect
                ? 'bg-[#00aa00] text-black border-white font-bold'
                : 'bg-[#000000] text-[#aaaaaa] border-[#555555]'
            }`}
            title="Toggle authentic CRT monitor scanlines"
          >
            <Monitor className="w-3 h-3" />
            <span>CRT: {crtEffect ? 'ON' : 'OFF'}</span>
          </button>

          {/* Sound Mute */}
          <button
            onClick={toggleMute}
            className="p-1 bg-[#000000] text-[#ffffff] border border-[#555555] hover:bg-[#222222]"
            title="Mute / Unmute Sound Blaster"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-green-400" />}
          </button>

          {/* Export / Download DOS package */}
          <button
            onClick={onDownloadPackage}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#aa5500] hover:bg-[#ff5555] text-white font-pixel text-[10px] shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <Download className="w-3 h-3" />
            <span>EXPORT .EXE</span>
          </button>
        </div>
      </div>
    </header>
  );
};
