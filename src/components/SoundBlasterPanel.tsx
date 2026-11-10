import React, { useState } from 'react';
import { GameProject, SoundPreset } from '../types/dos';
import { soundBlaster, DEFAULT_SOUND_PRESETS } from '../engine/soundBlaster';
import { Volume2, Play, Square, Activity, Sliders, Music, Zap, Cpu } from 'lucide-react';

interface SoundBlasterPanelProps {
  project: GameProject;
  onUpdateProject: (newProject: GameProject) => void;
}

export const SoundBlasterPanel: React.FC<SoundBlasterPanelProps> = ({ project, onUpdateProject }) => {
  const [selectedPreset, setSelectedPreset] = useState<SoundPreset>(DEFAULT_SOUND_PRESETS[0]);
  const [activeTheme, setActiveTheme] = useState<'keen' | 'dungeon' | 'cyber'>('keen');
  const [isBgmPlaying, setIsBgmPlaying] = useState(soundBlaster.isBgmActive());

  const sbConfig = project.sbConfig;

  const updateConfig = (key: keyof typeof sbConfig, val: unknown) => {
    const updated = { ...sbConfig, [key]: val };
    onUpdateProject({ ...project, sbConfig: updated });
    if (key === 'masterVolume') {
      soundBlaster.setMasterVolume(val as number);
    }
  };

  const handleTestSound = (preset: SoundPreset) => {
    if (preset.synthType === 'dsp_pcm') {
      soundBlaster.playDspPcm(preset.category as 'jump' | 'coin' | 'explosion' | 'laser' | 'hit' | 'win');
    } else {
      soundBlaster.playOpl2FM(preset);
    }
  };

  const handleToggleBgm = (theme: 'keen' | 'dungeon' | 'cyber') => {
    if (isBgmPlaying && activeTheme === theme) {
      soundBlaster.stopBgm();
      setIsBgmPlaying(false);
    } else {
      setActiveTheme(theme);
      soundBlaster.playBgm(theme);
      setIsBgmPlaying(true);
      onUpdateProject({
        ...project,
        soundSettings: { ...project.soundSettings, bgmId: theme },
      });
    }
  };

  // Virtual piano notes (Octaves 3 & 4)
  const pianoKeys = [
    { note: 'C3', freq: 130.81, isBlack: false },
    { note: 'C#3', freq: 138.59, isBlack: true },
    { note: 'D3', freq: 146.83, isBlack: false },
    { note: 'D#3', freq: 155.56, isBlack: true },
    { note: 'E3', freq: 164.81, isBlack: false },
    { note: 'F3', freq: 174.61, isBlack: false },
    { note: 'F#3', freq: 185.00, isBlack: true },
    { note: 'G3', freq: 196.00, isBlack: false },
    { note: 'G#3', freq: 207.65, isBlack: true },
    { note: 'A3', freq: 220.00, isBlack: false },
    { note: 'A#3', freq: 233.08, isBlack: true },
    { note: 'B3', freq: 246.94, isBlack: false },
    { note: 'C4', freq: 261.63, isBlack: false },
    { note: 'C#4', freq: 277.18, isBlack: true },
    { note: 'D4', freq: 293.66, isBlack: false },
    { note: 'D#4', freq: 311.13, isBlack: true },
    { note: 'E4', freq: 329.63, isBlack: false },
    { note: 'F4', freq: 349.23, isBlack: false },
    { note: 'F#4', freq: 369.99, isBlack: true },
    { note: 'G4', freq: 392.00, isBlack: false },
    { note: 'G#4', freq: 415.30, isBlack: true },
    { note: 'A4', freq: 440.00, isBlack: false },
    { note: 'A#4', freq: 466.16, isBlack: true },
    { note: 'B4', freq: 493.88, isBlack: false },
    { note: 'C5', freq: 523.25, isBlack: false },
  ];

  const playPianoNote = (freq: number) => {
    soundBlaster.playOpl2FM(selectedPreset, freq);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Sound Blaster 16 Card Top Banner */}
      <div className="bg-[#000044] border-2 border-[#5555ff] p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-[#5555ff] pb-2 mb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <span className="font-pixel text-xs text-yellow-300">CREATIVE SOUND BLASTER 16 DSP / OPL3</span>
            <span className="bg-[#aa0000] text-white px-2 py-0.5 font-mono text-[10px]">MODEL CT2230</span>
          </div>

          <div className="font-mono text-[#55ff55] bg-black px-2 py-1 border border-green-800 text-[11px]">
            SET BLASTER=A{sbConfig.basePort.replace('h','')} I{sbConfig.irq} D{sbConfig.dma8} H{sbConfig.dma16} T{sbConfig.type}
          </div>
        </div>

        {/* Hardware Port & IRQ Jumpers Config */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 font-mono text-[11px]">
          <div className="bg-[#000022] p-2 border border-[#333333]">
            <label className="text-[#888888] block text-[9px] mb-1">BASE I/O PORT</label>
            <select
              value={sbConfig.basePort}
              onChange={(e) => updateConfig('basePort', e.target.value)}
              className="w-full bg-black border border-gray-600 text-yellow-300 px-1 py-0.5"
            >
              <option value="220h">220h (Standard)</option>
              <option value="240h">240h</option>
              <option value="260h">260h</option>
              <option value="280h">280h</option>
            </select>
          </div>

          <div className="bg-[#000022] p-2 border border-[#333333]">
            <label className="text-[#888888] block text-[9px] mb-1">IRQ LINE</label>
            <select
              value={sbConfig.irq}
              onChange={(e) => updateConfig('irq', parseInt(e.target.value, 10))}
              className="w-full bg-black border border-gray-600 text-yellow-300 px-1 py-0.5"
            >
              <option value={7}>IRQ 7 (Default)</option>
              <option value={5}>IRQ 5 (SB 16)</option>
              <option value={10}>IRQ 10</option>
            </select>
          </div>

          <div className="bg-[#000022] p-2 border border-[#333333]">
            <label className="text-[#888888] block text-[9px] mb-1">8-BIT LOW DMA</label>
            <select
              value={sbConfig.dma8}
              onChange={(e) => updateConfig('dma8', parseInt(e.target.value, 10))}
              className="w-full bg-black border border-gray-600 text-yellow-300 px-1 py-0.5"
            >
              <option value={1}>DMA 1 (Default)</option>
              <option value={0}>DMA 0</option>
              <option value={3}>DMA 3</option>
            </select>
          </div>

          <div className="bg-[#000022] p-2 border border-[#333333]">
            <label className="text-[#888888] block text-[9px] mb-1">16-BIT HIGH DMA</label>
            <select
              value={sbConfig.dma16}
              onChange={(e) => updateConfig('dma16', parseInt(e.target.value, 10))}
              className="w-full bg-black border border-gray-600 text-yellow-300 px-1 py-0.5"
            >
              <option value={5}>DMA 5 (Default)</option>
              <option value={6}>DMA 6</option>
              <option value={7}>DMA 7</option>
            </select>
          </div>

          <div className="bg-[#000022] p-2 border border-[#333333]">
            <label className="text-[#888888] block text-[9px] mb-1">OPL2/OPL3 PORT</label>
            <div className="text-cyan-400 font-bold px-1 py-0.5 bg-black border border-gray-700">
              388h (AdLib)
            </div>
          </div>

          <div className="bg-[#000022] p-2 border border-[#333333]">
            <label className="text-[#888888] block text-[9px] mb-1">OUTPUT VOLUME</label>
            <input
              type="range"
              min="0"
              max="100"
              value={sbConfig.masterVolume}
              onChange={(e) => updateConfig('masterVolume', parseInt(e.target.value, 10))}
              className="w-full accent-green-400"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: SFX Library + OPL2 FM Synthesizer Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* COL 1: Sound Effects Library */}
        <div className="bg-[#000044] border-2 border-[#5555ff] p-3 text-xs">
          <div className="flex items-center justify-between border-b border-[#5555ff] pb-2 mb-3">
            <span className="font-pixel text-[10px] text-yellow-300">SFX PRESETS</span>
            <span className="text-[10px] text-cyan-300 font-mono">OPL2 & 8-BIT DSP</span>
          </div>

          <div className="space-y-2">
            {DEFAULT_SOUND_PRESETS.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPreset(p)}
                className={`p-2 border font-mono text-[11px] cursor-pointer transition-colors flex items-center justify-between ${
                  selectedPreset.id === p.id
                    ? 'bg-[#aaaaaa] text-black border-white font-bold'
                    : 'bg-[#000022] text-[#aaaaaa] border-[#333333] hover:bg-[#000088]'
                }`}
              >
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-[9px] text-[#55ff55]">
                    {p.synthType === 'opl2_fm' ? 'Yamaha OPL2 FM Synth' : 'Sound Blaster DSP PCM'}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTestSound(p);
                  }}
                  className="px-2.5 py-1 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-pixel text-[9px] shadow"
                >
                  ▶ TEST
                </button>
              </div>
            ))}
          </div>

          {/* Quick DSP PCM Trigger Buttons */}
          <div className="mt-4 border-t border-[#5555ff] pt-3">
            <span className="font-mono text-[#ffff55] block mb-2 font-bold">DSP 8-BIT SAMPLER TRIGGERS:</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => soundBlaster.playDspPcm('jump')}
                className="py-1 bg-[#222222] hover:bg-[#444444] text-white border border-gray-600 font-mono text-[10px]"
              >
                DSP Jump
              </button>
              <button
                onClick={() => soundBlaster.playDspPcm('coin')}
                className="py-1 bg-[#222222] hover:bg-[#444444] text-white border border-gray-600 font-mono text-[10px]"
              >
                DSP Coin
              </button>
              <button
                onClick={() => soundBlaster.playDspPcm('laser')}
                className="py-1 bg-[#222222] hover:bg-[#444444] text-white border border-gray-600 font-mono text-[10px]"
              >
                DSP Laser
              </button>
              <button
                onClick={() => soundBlaster.playDspPcm('explosion')}
                className="py-1 bg-[#222222] hover:bg-[#444444] text-white border border-gray-600 font-mono text-[10px]"
              >
                DSP Explosion
              </button>
            </div>
          </div>
        </div>

        {/* COL 2: 2-Operator OPL2 FM Synth Synthesizer Parameters */}
        <div className="bg-[#000044] border-2 border-[#5555ff] p-3 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#5555ff] pb-2 mb-3">
              <span className="font-pixel text-[10px] text-yellow-300">OPL2 2-OPERATOR FM SYNTH</span>
              <span className="text-[10px] text-[#55ff55] font-mono">YM3812</span>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              {/* Carrier Waveform */}
              <div className="bg-[#000022] p-2 border border-[#333333]">
                <label className="text-[#aaaaaa] block text-[10px] mb-1">CARRIER WAVEFORM (OP 1):</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['sine', 'square', 'sawtooth', 'triangle'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedPreset({ ...selectedPreset, carrierWave: w })}
                      className={`py-1 text-center border uppercase text-[10px] ${
                        selectedPreset.carrierWave === w
                          ? 'bg-[#ffff55] text-black font-bold'
                          : 'bg-black text-[#aaaaaa] border-gray-700'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modulator Waveform */}
              <div className="bg-[#000022] p-2 border border-[#333333]">
                <label className="text-[#aaaaaa] block text-[10px] mb-1">MODULATOR WAVEFORM (OP 2):</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['sine', 'square', 'sawtooth', 'triangle'] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setSelectedPreset({ ...selectedPreset, modulatorWave: w })}
                      className={`py-1 text-center border uppercase text-[10px] ${
                        selectedPreset.modulatorWave === w
                          ? 'bg-[#ffff55] text-black font-bold'
                          : 'bg-black text-[#aaaaaa] border-gray-700'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modulation Index / FM Depth */}
              <div className="bg-[#000022] p-2 border border-[#333333]">
                <div className="flex justify-between text-[10px] text-[#aaaaaa] mb-1">
                  <span>FM MODULATION INDEX (DEPTH):</span>
                  <span className="text-yellow-300 font-bold">{selectedPreset.modulationIndex || 1.5}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={selectedPreset.modulationIndex || 1.5}
                  onChange={(e) =>
                    setSelectedPreset({ ...selectedPreset, modulationIndex: parseFloat(e.target.value) })
                  }
                  className="w-full accent-yellow-400"
                />
              </div>

              {/* ADSR Sliders */}
              <div className="bg-[#000022] p-2 border border-[#333333] space-y-2">
                <span className="text-[#aaaaaa] block text-[10px]">ENVELOPE GENERATOR (ADSR):</span>
                <div className="grid grid-cols-4 gap-2 text-[10px]">
                  <div>
                    <span className="text-[#888888] block">ATK:</span>
                    <input
                      type="range"
                      min="0.005"
                      max="0.2"
                      step="0.005"
                      value={selectedPreset.attack || 0.01}
                      onChange={(e) =>
                        setSelectedPreset({ ...selectedPreset, attack: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[#888888] block">DEC:</span>
                    <input
                      type="range"
                      min="0.05"
                      max="0.5"
                      step="0.01"
                      value={selectedPreset.decay || 0.1}
                      onChange={(e) =>
                        setSelectedPreset({ ...selectedPreset, decay: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[#888888] block">SUS:</span>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={selectedPreset.sustain || 0.2}
                      onChange={(e) =>
                        setSelectedPreset({ ...selectedPreset, sustain: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <span className="text-[#888888] block">REL:</span>
                    <input
                      type="range"
                      min="0.01"
                      max="0.4"
                      step="0.01"
                      value={selectedPreset.release || 0.1}
                      onChange={(e) =>
                        setSelectedPreset({ ...selectedPreset, release: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleTestSound(selectedPreset)}
            className="w-full mt-3 py-2 bg-[#aa0000] hover:bg-[#ff5555] text-white font-pixel text-[10px] shadow"
          >
            FIRE SYNTHESIZER NOTE
          </button>
        </div>

        {/* COL 3: DOS Chiptune Tracker & Music Sequencer */}
        <div className="bg-[#000044] border-2 border-[#5555ff] p-3 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#5555ff] pb-2 mb-3">
              <span className="font-pixel text-[10px] text-yellow-300">OPL2 MUSIC TRACKER</span>
              <span className="text-[10px] text-[#55ff55] font-mono">Apogee Style</span>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              <div className="bg-[#000022] p-2.5 border border-[#333333]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white">Commander Keen Anthem</span>
                  <span className="text-[9px] text-[#aaaaaa]">Upbeat Platformer</span>
                </div>
                <p className="text-[10px] text-[#aaaaaa] mb-2">Iconic Bobby Prince-style FM brass and square lead.</p>
                <button
                  onClick={() => handleToggleBgm('keen')}
                  className={`w-full py-1.5 font-mono text-center border font-bold flex items-center justify-center space-x-1 ${
                    isBgmPlaying && activeTheme === 'keen'
                      ? 'bg-[#ff5555] text-white border-red-400'
                      : 'bg-[#00aa00] text-white border-green-400 hover:bg-[#55ff55] hover:text-black'
                  }`}
                >
                  {isBgmPlaying && activeTheme === 'keen' ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>STOP BGM</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>PLAY TRACK</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[#000022] p-2.5 border border-[#333333]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white">Catacomb 2D Crypts</span>
                  <span className="text-[9px] text-[#aaaaaa]">Dungeon Crawler</span>
                </div>
                <p className="text-[10px] text-[#aaaaaa] mb-2">Spooky minor arpeggios echoing in dark corridors.</p>
                <button
                  onClick={() => handleToggleBgm('dungeon')}
                  className={`w-full py-1.5 font-mono text-center border font-bold flex items-center justify-center space-x-1 ${
                    isBgmPlaying && activeTheme === 'dungeon'
                      ? 'bg-[#ff5555] text-white border-red-400'
                      : 'bg-[#00aa00] text-white border-green-400 hover:bg-[#55ff55] hover:text-black'
                  }`}
                >
                  {isBgmPlaying && activeTheme === 'dungeon' ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>STOP BGM</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>PLAY TRACK</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-[#000022] p-2.5 border border-[#333333]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white">Solar Winds Deep Sector</span>
                  <span className="text-[9px] text-[#aaaaaa]">Cyber Space Theme</span>
                </div>
                <p className="text-[10px] text-[#aaaaaa] mb-2">Driving 16th-note FM bassline with FM noise hits.</p>
                <button
                  onClick={() => handleToggleBgm('cyber')}
                  className={`w-full py-1.5 font-mono text-center border font-bold flex items-center justify-center space-x-1 ${
                    isBgmPlaying && activeTheme === 'cyber'
                      ? 'bg-[#ff5555] text-white border-red-400'
                      : 'bg-[#00aa00] text-white border-green-400 hover:bg-[#55ff55] hover:text-black'
                  }`}
                >
                  {isBgmPlaying && activeTheme === 'cyber' ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>STOP BGM</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>PLAY TRACK</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Interactive Virtual OPL2 Keyboard / Piano Roll */}
      <div className="bg-[#000022] border-2 border-[#5555ff] p-3 text-xs">
        <div className="flex items-center justify-between border-b border-[#5555ff] pb-1.5 mb-2 font-mono">
          <span className="font-pixel text-[10px] text-yellow-300">OPL2 LIVE PIANO ROLL / SYNTH TRIGGER</span>
          <span className="text-[#aaaaaa] text-[10px]">Click any key to test instrument</span>
        </div>

        {/* Piano Keys */}
        <div className="flex justify-center overflow-x-auto py-2">
          <div className="relative flex h-28 select-none">
            {pianoKeys.map((k) => {
              if (k.isBlack) {
                return (
                  <button
                    key={k.note}
                    onClick={() => playPianoNote(k.freq)}
                    className="w-6 h-16 bg-black text-white hover:bg-yellow-400 hover:text-black -mx-3 z-10 border border-gray-600 rounded-b text-[8px] font-mono flex items-end justify-center pb-1 shadow-lg"
                  >
                    {k.note}
                  </button>
                );
              } else {
                return (
                  <button
                    key={k.note}
                    onClick={() => playPianoNote(k.freq)}
                    className="w-9 h-28 bg-[#eeeeee] text-black hover:bg-yellow-200 active:bg-yellow-400 border border-gray-400 rounded-b text-[9px] font-mono flex items-end justify-center pb-1.5 shadow"
                  >
                    {k.note}
                  </button>
                );
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
