import React, { useState } from 'react';
import { GameProject } from '../types/dos';
import {
  FileText,
  Download,
  Bold,
  Heading,
  List,
  CheckSquare,
  Code,
  Save,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ProjectNotesProps {
  project: GameProject;
  onUpdateProject: (updated: GameProject) => void;
}

const TEMPLATE_GDD = `# GAME DESIGN DOCUMENT: ${'{TITLE}'}
Target System: MS-DOS 6.22 / Intel 80386 / VGA Mode 13h
Audio Device: Creative Labs Sound Blaster 16 & Yamaha OPL2 FM

## 1. Core Gameplay & Premise
- Player controls the hero navigating through perilous platform levels.
- Collect diamonds and keys to open locked security doors.
- Stomp or blast green slug enemies to score bonus points.

## 2. Controls & Input Mapping
- Left / Right Arrow or A / D : Walk horizontally
- Space or Alt or Z : Jump / Fire raygun
- Up / Down : Climb ladders & enter doors
- Esc : Pause / Main menu

## 3. Level Progression & Objectives
- Level 1: Outpost on Mars (Beginner tutorial)
- Level 2: Subterranean Caverns (Hazardous acid pools)
- Level 3: Mothership Bridge (Boss confrontation)

## 4. Hardware Constraints & Memory
- 64KB Data Segment budget (DS:0000 to DS:FFFF)
- 320x200 256-color Mode 13h VGA double buffer at A000:0000
- 60Hz CRT frame synchronization via Port 0x3DA (V-Retrace)
`;

const TEMPLATE_CHANGELOG = `# PROJECT CHANGELOG: ${'{TITLE}'}

## Version 1.2.0 (Build 941014)
- [x] Integrated Yamaha OPL2 2-Operator FM Synthesizer for BGM.
- [x] Tightened player hitbox to 12x14 pixels for precision jumping.
- [x] Added Sound Blaster 16 DSP auto-detect at Port 220h, IRQ 7, DMA 1.
- [ ] Implement boss health bar on HUD.
- [ ] Add secret warp zone in Level 2.

## Version 1.0.0 (Build 940812)
- [x] Initial Mode 13h 320x200 graphics engine.
- [x] Implemented MZ executable file builder.
- [x] 16-color & 256-color palette editor.
`;

const TEMPLATE_AUDIO_CUES = `# SOUND BLASTER 16 AUDIO CUE SHEET
Synthesizer: Yamaha YM3812 (OPL2) @ Port 0x388
DSP PCM Output: 22,050 Hz 8-bit Mono @ Port 0x220

| Event Trigger     | Audio Channel | Asset ID       | Synth Notes / Description |
|-------------------|---------------|----------------|---------------------------|
| Player Jump       | DSP PCM       | sb_jump        | 150Hz -> 600Hz slide      |
| Gem Pickup        | DSP PCM       | sb_coin        | 987Hz (B5) -> 1318Hz (E6) |
| Stomp Enemy       | DSP PCM       | sb_hit         | 80Hz low impact thud      |
| Raygun Laser      | DSP PCM       | sb_laser       | High Q FM chirp           |
| Enemy Defeated    | DSP PCM       | sb_explosion   | White noise burst 180ms   |
| Level Exit Door   | DSP PCM       | sb_win         | Major triad fanfare       |
| Background Music  | OPL2 FM       | bgm_main       | 2-channel lead + bass     |
`;

export const ProjectNotes: React.FC<ProjectNotesProps> = ({
  project,
  onUpdateProject,
}) => {
  const [content, setContent] = useState<string>(
    project.notes || TEMPLATE_GDD.replace('{TITLE}', project.title.toUpperCase())
  );
  const [theme, setTheme] = useState<'amber' | 'green' | 'white'>('amber');
  const [saveStatus, setSaveStatus] = useState<string>('');

  const handleSave = () => {
    onUpdateProject({
      ...project,
      notes: content,
    });
    setSaveStatus('SAVED TO PROJECT');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleDownloadReadme = () => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.TXT';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const applyTemplate = (tmpl: string) => {
    const formatted = tmpl.replace(/\{TITLE\}/g, project.title.toUpperCase());
    setContent(formatted);
    onUpdateProject({
      ...project,
      notes: formatted,
    });
  };

  const insertSnippet = (prefix: string, suffix = '') => {
    setContent((prev) => `${prev}\n${prefix}text${suffix}`);
  };

  // Convert basic markdown to styled HTML for the preview pane
  const renderMarkdownPreview = (md: string) => {
    const lines = md.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-base font-bold underline mb-2 mt-4">
            {line.substring(2)}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-sm font-bold mb-1 mt-3 text-white">
            {line.substring(3)}
          </h2>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-xs font-bold mb-1 mt-2">
            {line.substring(4)}
          </h3>
        );
      }

      // Checkbox
      if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
        const checked = line.startsWith('- [x] ');
        return (
          <div key={idx} className="flex items-center space-x-2 my-0.5 ml-2">
            <span className={checked ? 'text-green-400 font-bold' : 'text-gray-500'}>
              [{checked ? 'X' : ' '}]
            </span>
            <span className={checked ? 'line-through opacity-75' : ''}>
              {line.substring(6)}
            </span>
          </div>
        );
      }

      // Bullets
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={idx} className="ml-3 my-0.5 flex items-start space-x-1.5">
            <span>•</span>
            <span>{line.substring(2)}</span>
          </div>
        );
      }

      // Table line
      if (line.startsWith('|')) {
        return (
          <div key={idx} className="font-mono text-[10px] whitespace-pre opacity-90 my-0.5">
            {line}
          </div>
        );
      }

      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="my-0.5 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  // Color theme classes for the preview CRT
  const themeClasses = {
    amber: 'bg-[#180e03] text-[#ffb000] border-[#553300] shadow-[inset_0_0_12px_rgba(255,176,0,0.2)]',
    green: 'bg-[#031505] text-[#33ff33] border-[#004411] shadow-[inset_0_0_12px_rgba(51,255,51,0.2)]',
    white: 'bg-[#050508] text-[#cccccc] border-[#333344] shadow-[inset_0_0_12px_rgba(200,200,255,0.1)]',
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-[#0000aa] border-2 border-[#5555ff] p-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_#000000]">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-yellow-300" />
          <h2 className="font-pixel text-sm text-yellow-300 tracking-wider">
            PROJECT NOTES & DESIGN DOCUMENTATION
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          {saveStatus && (
            <span className="bg-[#00aa00] text-black px-2 py-0.5 font-bold animate-pulse">
              {saveStatus}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-[#ffff55] hover:bg-[#ffffff] text-black font-bold border border-white flex items-center space-x-1"
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE NOTES</span>
          </button>
          <button
            onClick={handleDownloadReadme}
            className="px-3 py-1 bg-[#000088] hover:bg-[#0000cc] text-white border border-[#5555ff] flex items-center space-x-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT README.TXT</span>
          </button>
        </div>
      </div>

      {/* Editor & Preview Toolbar */}
      <div className="bg-[#000088] border-2 border-[#5555ff] p-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-white">
        {/* Formatting Quick Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => insertSnippet('## ')}
            className="p-1 hover:bg-[#0000aa] border border-[#5555ff] rounded"
            title="Heading 2"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('**', '**')}
            className="p-1 hover:bg-[#0000aa] border border-[#5555ff] rounded"
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('- ')}
            className="p-1 hover:bg-[#0000aa] border border-[#5555ff] rounded"
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('- [ ] ')}
            className="p-1 hover:bg-[#0000aa] border border-[#5555ff] rounded"
            title="Task item"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertSnippet('```\n', '\n```')}
            className="p-1 hover:bg-[#0000aa] border border-[#5555ff] rounded"
            title="Code block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Templates Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-yellow-300">LOAD TEMPLATE:</span>
          <button
            onClick={() => applyTemplate(TEMPLATE_GDD)}
            className="px-2 py-0.5 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] text-[11px]"
          >
            Game Design (GDD)
          </button>
          <button
            onClick={() => applyTemplate(TEMPLATE_CHANGELOG)}
            className="px-2 py-0.5 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] text-[11px]"
          >
            Changelog
          </button>
          <button
            onClick={() => applyTemplate(TEMPLATE_AUDIO_CUES)}
            className="px-2 py-0.5 bg-[#0000aa] hover:bg-[#ffff55] hover:text-black border border-[#5555ff] text-[11px]"
          >
            Audio Cue Sheet
          </button>
        </div>

        {/* CRT Phosphor Theme */}
        <div className="flex items-center space-x-1">
          <span className="text-[#aaaaaa] mr-1">CRT PHOSPHOR:</span>
          <button
            onClick={() => setTheme('amber')}
            className={`w-4 h-4 rounded-full border ${
              theme === 'amber' ? 'ring-2 ring-white' : ''
            } bg-[#ffb000]`}
            title="Amber P3 Phosphor"
          />
          <button
            onClick={() => setTheme('green')}
            className={`w-4 h-4 rounded-full border ${
              theme === 'green' ? 'ring-2 ring-white' : ''
            } bg-[#33ff33]`}
            title="Green P1 Phosphor"
          />
          <button
            onClick={() => setTheme('white')}
            className={`w-4 h-4 rounded-full border ${
              theme === 'white' ? 'ring-2 ring-white' : ''
            } bg-[#cccccc]`}
            title="Paper White Phosphor"
          />
        </div>
      </div>

      {/* Dual Pane Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Pane: Markdown Source Editor */}
        <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#0000aa] pb-1 text-xs font-mono">
            <span className="font-pixel text-[11px] text-yellow-300">
              MARKDOWN SOURCE (README.TXT)
            </span>
            <span className="text-[#aaaaaa]">
              {content.length.toLocaleString()} BYTES | {content.split('\n').length} LINES
            </span>
          </div>

          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
            className="w-full h-[450px] p-3 bg-[#000000] text-[#55ff55] font-mono text-xs border border-[#333333] outline-none leading-relaxed resize-none focus:border-yellow-300 selection:bg-yellow-400 selection:text-black"
            placeholder="Type your game design notes, storyline, audio cues, or dev logs..."
          />

          <div className="text-[10px] font-mono text-[#aaaaaa]">
            Tips: Use # for headers, - [ ] for todo checklist, | for markdown tables.
          </div>
        </div>

        {/* Right Pane: Retro CRT Live Preview */}
        <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white space-y-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#0000aa] pb-1 text-xs font-mono">
            <span className="font-pixel text-[11px] text-yellow-300">
              MONOCHROME CRT PREVIEW [{theme.toUpperCase()} PHOSPHOR]
            </span>
            <span className="text-[#55ff55] text-[10px]">LIVE RENDER</span>
          </div>

          <div
            className={`w-full h-[450px] p-4 overflow-y-auto font-mono text-xs border-2 select-text ${themeClasses[theme]} dos-crt-scanlines`}
          >
            {renderMarkdownPreview(content)}
          </div>

          <div className="text-[10px] font-mono text-[#aaaaaa]">
            Renders styled output simulating real IBM 5151 / Hercules monochrome monitors.
          </div>
        </div>
      </div>
    </div>
  );
};
