import React, { useState, useEffect, useRef } from 'react';
import { GameProject, CustomMelodyTrack } from '../types/dos';
import { soundBlaster, NOTE_FREQUENCIES, DEFAULT_CUSTOM_MELODY } from '../engine/soundBlaster';
import {
  Play,
  Square,
  Volume2,
  Download,
  RotateCcw,
  Sparkles,
  Music,
  Check,
  Radio,
  Sliders,
  Copy,
} from 'lucide-react';

interface MusicSequencerProps {
  project: GameProject;
  onUpdateProject: (newProject: GameProject) => void;
}

// 12 Semitones in an octave
const NOTE_NAMES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];

export const MusicSequencer: React.FC<MusicSequencerProps> = ({ project, onUpdateProject }) => {
  // Initialize from project.customMelody or fallback to DEFAULT_CUSTOM_MELODY
  const [track, setTrack] = useState<CustomMelodyTrack>(() => {
    return project.customMelody ? JSON.parse(JSON.stringify(project.customMelody)) : JSON.parse(JSON.stringify(DEFAULT_CUSTOM_MELODY));
  });

  const [activeChannel, setActiveChannel] = useState<'ch1' | 'ch2'>('ch1');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Octaves for each channel's piano roll display
  const ch1Octaves = [5, 4]; // C4 to B5
  const ch2Octaves = [3, 2]; // C2 to B3

  const activeOctaves = activeChannel === 'ch1' ? ch1Octaves : ch2Octaves;

  // Build rows from high to low pitch
  const rows: string[] = [];
  for (const oct of activeOctaves) {
    for (const name of NOTE_NAMES) {
      rows.push(`${name}${oct}`);
    }
  }

  // Handle Play / Stop
  const togglePlay = () => {
    if (isPlaying) {
      soundBlaster.stopBgm();
      setIsPlaying(false);
      setCurrentStep(-1);
    } else {
      setIsPlaying(true);
      soundBlaster.playCustomMelody(track, (step) => {
        setCurrentStep(step);
      });
    }
  };

  useEffect(() => {
    return () => {
      soundBlaster.stopBgm();
    };
  }, []);

  // Update a single step note
  const handleCellClick = (stepIdx: number, note: string) => {
    const newTrack = { ...track };
    const ch = activeChannel === 'ch1' ? newTrack.channel1 : newTrack.channel2;
    const currentNoteAtStep = ch.steps[stepIdx];

    if (currentNoteAtStep === note) {
      // Toggle off / clear step
      ch.steps[stepIdx] = null;
    } else {
      // Set note & audition tone
      ch.steps[stepIdx] = note;
      soundBlaster.playNotePreview(note, activeChannel === 'ch1' ? 'lead' : 'bass');
    }

    setTrack(newTrack);
  };

  // Change Steps Count (16 or 32)
  const setStepsCount = (count: number) => {
    const newTrack = { ...track, stepsCount: count };
    // Resize step arrays
    while (newTrack.channel1.steps.length < count) newTrack.channel1.steps.push(null);
    while (newTrack.channel2.steps.length < count) newTrack.channel2.steps.push(null);
    if (newTrack.channel1.steps.length > count) newTrack.channel1.steps.length = count;
    if (newTrack.channel2.steps.length > count) newTrack.channel2.steps.length = count;
    setTrack(newTrack);
    if (isPlaying) {
      soundBlaster.playCustomMelody(newTrack, (step) => setCurrentStep(step));
    }
  };

  // Clear current active channel or both
  const clearChannel = (ch: 'ch1' | 'ch2' | 'both') => {
    const newTrack = { ...track };
    if (ch === 'ch1' || ch === 'both') {
      newTrack.channel1.steps = new Array(newTrack.stepsCount).fill(null);
    }
    if (ch === 'ch2' || ch === 'both') {
      newTrack.channel2.steps = new Array(newTrack.stepsCount).fill(null);
    }
    setTrack(newTrack);
    if (isPlaying) {
      soundBlaster.playCustomMelody(newTrack, (step) => setCurrentStep(step));
    }
  };

  // Load Presets
  const loadPreset = (presetName: 'keen' | 'dungeon' | 'cyber' | 'arpeggio') => {
    let newTrack: CustomMelodyTrack;

    if (presetName === 'keen') {
      newTrack = {
        id: 'melody_keen',
        name: 'Vorticon Adventure',
        bpm: 135,
        stepsCount: 16,
        channel1: {
          name: 'Lead Melody (Ch 1)',
          instrument: 'square',
          volume: 0.85,
          octave: 4,
          steps: ['C4', null, 'E4', null, 'G4', 'C5', null, 'G4', 'F4', null, 'A4', null, 'G4', null, 'D4', null],
        },
        channel2: {
          name: 'OPL2 Bass (Ch 2)',
          instrument: 'synth_bass',
          volume: 0.9,
          octave: 3,
          steps: ['C3', 'C3', null, 'C3', 'E3', null, 'E3', null, 'F3', 'F3', null, 'F3', 'G3', null, 'G3', null],
        },
      };
    } else if (presetName === 'dungeon') {
      newTrack = {
        id: 'melody_dungeon',
        name: 'Crypt Arpeggio',
        bpm: 110,
        stepsCount: 16,
        channel1: {
          name: 'Lead Melody (Ch 1)',
          instrument: 'sawtooth',
          volume: 0.8,
          octave: 4,
          steps: ['D4', 'F4', 'A4', 'G#4', 'D4', 'F4', 'E4', null, 'F4', 'A4', 'C5', 'B4', 'A4', 'F4', 'D4', null],
        },
        channel2: {
          name: 'OPL2 Bass (Ch 2)',
          instrument: 'organ',
          volume: 0.85,
          octave: 3,
          steps: ['D3', null, 'D3', null, 'A2', null, 'A2', null, 'F3', null, 'F3', null, 'C3', null, 'C3', null],
        },
      };
    } else if (presetName === 'cyber') {
      newTrack = {
        id: 'melody_cyber',
        name: 'Cyber Drive',
        bpm: 140,
        stepsCount: 16,
        channel1: {
          name: 'Lead Melody (Ch 1)',
          instrument: 'brass',
          volume: 0.85,
          octave: 4,
          steps: ['A4', null, 'C5', null, 'B4', null, 'A4', 'G4', 'E4', null, 'G4', null, 'A4', 'B4', 'C5', null],
        },
        channel2: {
          name: 'OPL2 Bass (Ch 2)',
          instrument: 'synth_bass',
          volume: 0.95,
          octave: 2,
          steps: ['A2', 'A2', 'A3', 'A2', 'C3', 'B2', 'A2', 'A2', 'G2', 'G2', 'G3', 'G2', 'A2', 'A2', 'E2', 'G2'],
        },
      };
    } else {
      // Arpeggio
      newTrack = {
        id: 'melody_arp',
        name: 'Apogee Synth Wave',
        bpm: 125,
        stepsCount: 16,
        channel1: {
          name: 'Lead Melody (Ch 1)',
          instrument: 'square',
          volume: 0.8,
          octave: 4,
          steps: ['C4', 'E4', 'G4', 'B4', 'C5', 'B4', 'G4', 'E4', 'A4', 'C5', 'E5', 'G5', 'E5', 'C5', 'A4', 'G4'],
        },
        channel2: {
          name: 'OPL2 Bass (Ch 2)',
          instrument: 'pulse',
          volume: 0.85,
          octave: 3,
          steps: ['C3', null, 'G2', null, 'C3', null, 'E3', null, 'A2', null, 'E2', null, 'A2', null, 'G2', null],
        },
      };
    }

    setTrack(newTrack);
    if (isPlaying) {
      soundBlaster.playCustomMelody(newTrack, (step) => setCurrentStep(step));
    }
  };

  // EXPORT TO PROJECT CONFIGURATION:
  // Saves this melody into project.customMelody and activates it as the in-game BGM!
  const handleExportToProject = () => {
    const updatedProject: GameProject = {
      ...project,
      customMelody: JSON.parse(JSON.stringify(track)),
      soundSettings: {
        ...project.soundSettings,
        bgmId: 'custom',
      },
    };

    onUpdateProject(updatedProject);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Generate C Code Array for Turbo C GAME.C
  const generateCCode = (): string => {
    const ch1Steps = track.channel1.steps.map((s) => (s ? `"${s}"` : 'NULL')).join(', ');
    const ch2Steps = track.channel2.steps.map((s) => (s ? `"${s}"` : 'NULL')).join(', ');

    return `/*
 * Sound Blaster OPL2 2-Channel Melody: ${track.name}
 * Tempo: ${track.bpm} BPM | Length: ${track.stepsCount} steps
 */

#define BGM_BPM ${track.bpm}
#define BGM_STEPS ${track.stepsCount}

const char *melody_ch1[BGM_STEPS] = { ${ch1Steps} };
const char *melody_ch2[BGM_STEPS] = { ${ch2Steps} };
`;
  };

  const copyCCode = () => {
    navigator.clipboard.writeText(generateCCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isExportedAsBgm = project.soundSettings.bgmId === 'custom' && project.customMelody?.name === track.name;

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4 font-mono text-xs">
      {/* Top Banner & Control Deck */}
      <div className="bg-[#000044] border-2 border-[#5555ff] p-4">
        <div className="flex flex-wrap items-center justify-between border-b border-[#5555ff] pb-3 mb-3 gap-3">
          <div className="flex items-center space-x-2">
            <Music className="w-5 h-5 text-yellow-300" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-pixel text-xs text-yellow-300">
                  OPL2 2-CHANNEL FM MUSIC SEQUENCER
                </span>
                {isExportedAsBgm && (
                  <span className="bg-[#00aa00] text-black px-2 py-0.5 text-[10px] font-bold rounded">
                    ACTIVE GAME BGM
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#aaaaaa]">
                Interactive piano roll for Yamaha YM3812 / AdLib chiptune melodies (Lead & Bass channels)
              </span>
            </div>
          </div>

          {/* Export to Project Configuration Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportToProject}
              className={`px-3 py-1.5 font-pixel text-[9px] shadow-[2px_2px_0_#000] flex items-center space-x-1.5 transition-all ${
                savedSuccess
                  ? 'bg-[#55ff55] text-black font-bold'
                  : 'bg-[#aa5500] hover:bg-[#ff5555] text-white'
              }`}
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span>{savedSuccess ? 'SAVED TO GAME!' : 'EXPORT TO PROJECT (SET AS BGM)'}</span>
            </button>

            <button
              onClick={copyCCode}
              className="px-2.5 py-1.5 bg-[#222222] hover:bg-[#333333] text-white border border-gray-600 flex items-center space-x-1"
            >
              <Copy className="w-3 h-3 text-cyan-400" />
              <span>{copiedCode ? 'COPIED!' : 'COPY C CODE'}</span>
            </button>
          </div>
        </div>

        {/* Sequencer Transport & Playback Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#000022] p-2.5 border border-[#333333]">
          {/* Play / Stop Button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={togglePlay}
              className={`px-4 py-1.5 font-pixel text-[10px] flex items-center space-x-1.5 shadow ${
                isPlaying
                  ? 'bg-[#ff5555] text-white animate-pulse'
                  : 'bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white'
              }`}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'STOP SEQUENCER' : 'PLAY SEQUENCER'}</span>
            </button>

            <div className="font-mono text-[#55ff55] bg-black px-2 py-1 border border-gray-700 text-[11px]">
              STEP: <span className="font-bold">{currentStep >= 0 ? currentStep + 1 : '--'}</span> / {track.stepsCount}
            </div>
          </div>

          {/* Tempo BPM & Step Length */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-[#aaaaaa] text-[11px]">TEMPO:</span>
              <input
                type="range"
                min="60"
                max="220"
                value={track.bpm}
                onChange={(e) => {
                  const bpm = parseInt(e.target.value, 10);
                  const updated = { ...track, bpm };
                  setTrack(updated);
                  if (isPlaying) {
                    soundBlaster.playCustomMelody(updated, (step) => setCurrentStep(step));
                  }
                }}
                className="w-24 accent-yellow-400"
              />
              <span className="text-yellow-300 font-bold w-12">{track.bpm} BPM</span>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[#aaaaaa] text-[11px]">STEPS:</span>
              <button
                onClick={() => setStepsCount(16)}
                className={`px-2 py-0.5 border ${
                  track.stepsCount === 16
                    ? 'bg-[#ffff55] text-black font-bold'
                    : 'bg-black text-[#aaaaaa] border-gray-700'
                }`}
              >
                16 Steps (1 Bar)
              </button>
              <button
                onClick={() => setStepsCount(32)}
                className={`px-2 py-0.5 border ${
                  track.stepsCount === 32
                    ? 'bg-[#ffff55] text-black font-bold'
                    : 'bg-black text-[#aaaaaa] border-gray-700'
                }`}
              >
                32 Steps (2 Bars)
              </button>
            </div>
          </div>

          {/* Melodic Presets */}
          <div className="flex items-center space-x-1.5 text-[10px]">
            <span className="text-[#ffff55] font-bold">PRESETS:</span>
            <button
              onClick={() => loadPreset('keen')}
              className="px-2 py-0.5 bg-black hover:bg-[#000088] text-white border border-gray-700"
            >
              Keen Platformer
            </button>
            <button
              onClick={() => loadPreset('dungeon')}
              className="px-2 py-0.5 bg-black hover:bg-[#aa0000] text-white border border-gray-700"
            >
              Catacomb
            </button>
            <button
              onClick={() => loadPreset('cyber')}
              className="px-2 py-0.5 bg-black hover:bg-[#aa00aa] text-white border border-gray-700"
            >
              Cyber Pulse
            </button>
            <button
              onClick={() => loadPreset('arpeggio')}
              className="px-2 py-0.5 bg-black hover:bg-[#00aaaa] text-white border border-gray-700"
            >
              Apogee Wave
            </button>
          </div>
        </div>
      </div>

      {/* Main Piano Roll Container */}
      <div className="bg-[#111111] border-2 border-[#555555] p-3 shadow-xl">
        {/* Channel Selection Header */}
        <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-[#333333] gap-2">
          {/* Channel Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveChannel('ch1')}
              className={`px-3 py-1.5 font-mono text-xs flex items-center space-x-1.5 border transition-all ${
                activeChannel === 'ch1'
                  ? 'bg-[#ffff55] text-black font-bold border-yellow-300 shadow'
                  : 'bg-[#222222] text-[#aaaaaa] border-gray-700 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>CHANNEL 1: LEAD MELODY</span>
            </button>

            <button
              onClick={() => setActiveChannel('ch2')}
              className={`px-3 py-1.5 font-mono text-xs flex items-center space-x-1.5 border transition-all ${
                activeChannel === 'ch2'
                  ? 'bg-[#55ffff] text-black font-bold border-cyan-300 shadow'
                  : 'bg-[#222222] text-[#aaaaaa] border-gray-700 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>CHANNEL 2: BASS & ARPEGGIO</span>
            </button>
          </div>

          {/* Active Channel Synth Instrument & Volume Settings */}
          <div className="flex items-center space-x-3 text-[11px]">
            {activeChannel === 'ch1' ? (
              <div className="flex items-center space-x-2">
                <span className="text-yellow-400">LEAD INSTRUMENT:</span>
                <select
                  value={track.channel1.instrument}
                  onChange={(e) => {
                    const inst = e.target.value as 'square' | 'sine' | 'sawtooth' | 'brass';
                    setTrack({ ...track, channel1: { ...track.channel1, instrument: inst } });
                  }}
                  className="bg-black border border-gray-600 text-white px-2 py-0.5"
                >
                  <option value="square">OPL2 Square Lead (Keen style)</option>
                  <option value="sine">Pure Sine Bell</option>
                  <option value="sawtooth">Sawtooth Synth</option>
                  <option value="brass">FM Brass Horn</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-cyan-400">BASS INSTRUMENT:</span>
                <select
                  value={track.channel2.instrument}
                  onChange={(e) => {
                    const inst = e.target.value as 'synth_bass' | 'opl_triangle' | 'pulse' | 'organ';
                    setTrack({ ...track, channel2: { ...track.channel2, instrument: inst } });
                  }}
                  className="bg-black border border-gray-600 text-white px-2 py-0.5"
                >
                  <option value="synth_bass">YM3812 Synth Bass</option>
                  <option value="opl_triangle">Triangle Pluck</option>
                  <option value="pulse">Pulse Bass</option>
                  <option value="organ">Catacomb Pipe Organ</option>
                </select>
              </div>
            )}

            <button
              onClick={() => clearChannel(activeChannel)}
              className="px-2 py-1 bg-[#aa0000] hover:bg-[#ff5555] text-white border border-red-800 text-[10px] flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>CLEAR CHANNEL</span>
            </button>
          </div>
        </div>

        {/* The Piano Roll Matrix */}
        <div className="overflow-x-auto border border-[#333333] bg-[#000000] max-h-[500px]">
          <table className="w-full border-collapse select-none">
            {/* Step Header Row */}
            <thead>
              <tr className="bg-[#000044] text-[#aaaaaa] border-b border-[#333333] text-[10px]">
                <th className="p-1 w-16 text-center border-r border-[#333333] bg-[#000066] text-white sticky left-0 z-20">
                  NOTE
                </th>
                {Array.from({ length: track.stepsCount }).map((_, stepIdx) => {
                  const isCurrent = currentStep === stepIdx;
                  const isBeat = stepIdx % 4 === 0;
                  return (
                    <th
                      key={stepIdx}
                      className={`p-1 min-w-[32px] text-center border-r border-[#222222] ${
                        isCurrent
                          ? 'bg-[#ffff55] text-black font-bold animate-pulse'
                          : isBeat
                          ? 'bg-[#000088] text-white font-bold'
                          : 'bg-[#000022]'
                      }`}
                    >
                      {stepIdx + 1}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Note Pitch Rows */}
            <tbody>
              {rows.map((note) => {
                const isBlackKey = note.includes('#');
                const ch = activeChannel === 'ch1' ? track.channel1 : track.channel2;

                return (
                  <tr
                    key={note}
                    className={`border-b border-[#1a1a1a] hover:bg-[#111122] ${
                      isBlackKey ? 'bg-[#080808]' : 'bg-[#000000]'
                    }`}
                  >
                    {/* Piano Key Header Column */}
                    <td
                      onClick={() => soundBlaster.playNotePreview(note, activeChannel === 'ch1' ? 'lead' : 'bass')}
                      className={`p-1 w-16 font-mono text-[10px] text-center border-r border-[#333333] cursor-pointer sticky left-0 z-10 ${
                        isBlackKey
                          ? 'bg-[#151515] text-[#aaaaaa] hover:bg-yellow-400 hover:text-black'
                          : 'bg-[#222222] text-white font-bold hover:bg-yellow-200 hover:text-black'
                      }`}
                    >
                      {note}
                    </td>

                    {/* Step Cells */}
                    {Array.from({ length: track.stepsCount }).map((_, stepIdx) => {
                      const isCellActive = ch.steps[stepIdx] === note;
                      const isCurrent = currentStep === stepIdx;
                      const isBeat = stepIdx % 4 === 0;

                      // Check if other channel has a note here (for counterpoint preview)
                      const otherCh = activeChannel === 'ch1' ? track.channel2 : track.channel1;
                      const hasGhostNote = otherCh.steps[stepIdx] === note;

                      return (
                        <td
                          key={stepIdx}
                          onClick={() => handleCellClick(stepIdx, note)}
                          className={`p-1 min-w-[32px] h-6 text-center border-r border-[#1a1a1a] cursor-pointer transition-colors relative ${
                            isCurrent ? 'bg-[rgba(255,255,85,0.15)]' : isBeat ? 'bg-[#0a0a14]' : ''
                          }`}
                        >
                          {/* Active Note Block */}
                          {isCellActive && (
                            <div
                              className={`w-full h-4 rounded-sm flex items-center justify-center font-bold text-[9px] shadow ${
                                activeChannel === 'ch1'
                                  ? 'bg-[#ffff55] text-black ring-1 ring-white'
                                  : 'bg-[#55ffff] text-black ring-1 ring-white'
                              }`}
                            >
                              &#9679;
                            </div>
                          )}

                          {/* Ghost Note from other channel */}
                          {!isCellActive && hasGhostNote && (
                            <div className="w-2 h-2 rounded-full bg-gray-600 mx-auto opacity-50" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Sequencer Guide / Tips */}
        <div className="mt-3 pt-2 border-t border-[#333333] flex flex-wrap items-center justify-between text-[11px] text-[#888888]">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-yellow-400 inline-block" />
              <span>Ch 1 (Lead Melody)</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-3 h-3 bg-cyan-400 inline-block" />
              <span>Ch 2 (Bass / Counterpoint)</span>
            </span>
            <span>&bull; Click any cell to place/remove note</span>
            <span>&bull; Click left note labels to audition</span>
          </div>

          <div className="text-yellow-400">
            Total Length: {track.stepsCount} 16th notes = {(track.stepsCount / 4)} Quarter Beats
          </div>
        </div>
      </div>
    </div>
  );
};
