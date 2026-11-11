import React, { useState, useEffect, useRef } from 'react';
import { GameProject } from '../types/dos';
import { DosRuntime } from '../engine/dosRuntime';
import {
  Terminal,
  Play,
  RotateCcw,
  Cpu,
  Monitor,
  HelpCircle,
  HardDrive,
  CornerDownLeft,
} from 'lucide-react';

interface DosBoxEmulatorProps {
  project: GameProject;
  crtEffect: boolean;
}

interface CommandHistoryItem {
  id: string;
  type: 'input' | 'output' | 'info';
  text: string;
  color?: string;
}

export const DosBoxEmulator: React.FC<DosBoxEmulatorProps> = ({
  project,
  crtEffect: initialCrt,
}) => {
  const [mode, setMode] = useState<'prompt' | 'running'>('prompt');
  const [crt, setCrt] = useState<boolean>(initialCrt);
  const [cycles, setCycles] = useState<number>(15000);
  const [inputVal, setInputVal] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<CommandHistoryItem[]>([
    {
      id: 'boot1',
      type: 'info',
      text: 'DOSBox v0.74-3 Emulation Core [CPU: 80486DX, FPU: 80387]',
      color: '#55ffff',
    },
    {
      id: 'boot2',
      type: 'output',
      text: 'Mounted Drive C: Local Directory \\GAMES\\DOSMAKER',
      color: '#aaaaaa',
    },
    {
      id: 'boot3',
      type: 'output',
      text: `SET BLASTER=A${project.sbConfig.basePort.replace('h','')} I${project.sbConfig.irq} D${project.sbConfig.dma8} H${project.sbConfig.dma16} T${project.sbConfig.type}`,
      color: '#ffff55',
    },
    {
      id: 'boot4',
      type: 'output',
      text: 'Type "GAME.EXE" to execute or "HELP" for command list.',
      color: '#55ff55',
    },
  ]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<DosRuntime | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize and manage runtime when switching to 'running' mode
  useEffect(() => {
    if (mode === 'running' && canvasRef.current) {
      const runtime = new DosRuntime(project);
      runtimeRef.current = runtime;
      runtime.setCanvas(canvasRef.current);
      runtime.start();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (runtimeRef.current) {
          runtimeRef.current.keys[e.code] = true;
          if (e.code === 'KeyZ' || e.code === 'Space' || e.code === 'ControlLeft') {
            runtimeRef.current.shootBullet();
          }
          if (e.code === 'Escape') {
            stopGame();
          }
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (runtimeRef.current) {
          runtimeRef.current.keys[e.code] = false;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        runtime.stop();
        runtimeRef.current = null;
      };
    }
  }, [mode, project]);

  // Scroll terminal to bottom
  useEffect(() => {
    if (mode === 'prompt') {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandHistory, mode]);

  const launchGame = () => {
    setMode('running');
  };

  const stopGame = () => {
    if (runtimeRef.current) {
      runtimeRef.current.stop();
    }
    setMode('prompt');
    appendOutput('Returned to MS-DOS prompt. Execution terminated (exit code 0).', '#aaaaaa');
  };

  const appendOutput = (text: string, color = '#ffffff') => {
    setCommandHistory((prev) => [
      ...prev,
      { id: `out_${Date.now()}_${Math.random()}`, type: 'output', text, color },
    ]);
  };

  const handleCommand = (cmdStr: string) => {
    const raw = cmdStr.trim();
    if (!raw) return;

    // Append the user's typed command
    setCommandHistory((prev) => [
      ...prev,
      { id: `in_${Date.now()}`, type: 'input', text: `C:\\GAMES\\DOSMAKER> ${raw}` },
    ]);
    setInputVal('');

    const upper = raw.toUpperCase();

    if (upper === 'GAME' || upper === 'GAME.EXE' || upper === 'RUN') {
      appendOutput('Executing GAME.EXE (VGA 320x200 Mode 13h)...', '#55ff55');
      setTimeout(() => {
        launchGame();
      }, 400);
    } else if (upper === 'CLS') {
      setCommandHistory([]);
    } else if (upper === 'VER') {
      appendOutput('MS-DOS Version 6.22 [DOSBox Compatible Environment]', '#aaaaaa');
    } else if (upper === 'DIR' || upper === 'DIR /W' || upper === 'DIR/W') {
      appendOutput(' Volume in drive C is DOS_GAMES', '#aaaaaa');
      appendOutput(' Volume Serial Number is 1337-BEEF', '#aaaaaa');
      appendOutput(' Directory of C:\\GAMES\\DOSMAKER\n', '#aaaaaa');
      appendOutput('.            <DIR>       08-12-94  10:24a', '#55ffff');
      appendOutput('..           <DIR>       08-12-94  10:24a', '#55ffff');
      appendOutput('GAME     EXE    34,816   08-12-94   2:15p', '#ffffff');
      appendOutput('GAME     COM     4,096   08-12-94   2:15p', '#ffffff');
      appendOutput('README   TXT     2,480   08-12-94   1:10p', '#ffffff');
      appendOutput('ASSETS   DAT    16,384   08-12-94   2:00p', '#ffffff');
      appendOutput('AUTOEXEC BAT       256   08-12-94  10:25a', '#ffffff');
      appendOutput('CONFIG   SYS       180   08-12-94  10:25a', '#ffffff');
      appendOutput('         6 file(s)         58,212 bytes', '#aaaaaa');
      appendOutput('         2 dir(s)     536,870,912 bytes free', '#aaaaaa');
    } else if (upper.startsWith('SET BLASTER') || upper === 'BLASTER') {
      appendOutput(`BLASTER=A${project.sbConfig.basePort.replace('h','')} I${project.sbConfig.irq} D${project.sbConfig.dma8} H${project.sbConfig.dma16} T${project.sbConfig.type}`, '#ffff55');
      appendOutput('Sound Blaster 16 DSP 4.05 detected at port 220h, IRQ 7, DMA 1.', '#55ff55');
    } else if (upper.startsWith('DEBUG') || upper === 'DEBUG GAME.EXE') {
      appendOutput('-r', '#ffffff');
      appendOutput('AX=0000  BX=0000  CX=8800  DX=0000  SP=0400  BP=0000  SI=0000  DI=0000', '#55ff55');
      appendOutput('DS=1FA0  ES=1FA0  SS=23A0  CS=19A0  IP=0000   NV UP EI PL NZ NA PO NC', '#55ff55');
      appendOutput('19A0:0000 B81300        MOV     AX,0013   ; Switch to VGA Mode 13h', '#ffff55');
      appendOutput('19A0:0003 CD10          INT     10        ; BIOS Video Interrupt', '#ffff55');
      appendOutput('19A0:0005 8CD8          MOV     AX,DS', '#ffff55');
      appendOutput('19A0:0007 8EC0          MOV     ES,AX', '#ffff55');
    } else if (upper.startsWith('MEM')) {
      appendOutput('Memory Type          Total    Used       Free', '#aaaaaa');
      appendOutput('----------------  --------   -------   --------', '#aaaaaa');
      appendOutput('Conventional          640K       68K       572K', '#55ff55');
      appendOutput('Upper                   0K        0K         0K', '#aaaaaa');
      appendOutput('Reserved            384K      384K         0K', '#aaaaaa');
      appendOutput('Extended (XMS)    15,360K    1,024K    14,336K', '#55ffff');
      appendOutput('----------------  --------   -------   --------', '#aaaaaa');
      appendOutput('Total memory      16,384K    1,476K    14,908K', '#ffffff');
      appendOutput('Largest executable program size: 571K (585,216 bytes)', '#ffff55');
    } else if (upper === 'HELP') {
      appendOutput('MS-DOS Emulator Commands:', '#ffff55');
      appendOutput('  GAME.EXE     - Launch and play compiled VGA game', '#55ff55');
      appendOutput('  DIR          - List files on virtual Drive C:', '#ffffff');
      appendOutput('  SET BLASTER  - View Sound Blaster 16 configuration', '#ffffff');
      appendOutput('  DEBUG        - Inspect 8086 CPU registers and assembly', '#ffffff');
      appendOutput('  MEM          - Display 640KB conventional RAM usage', '#ffffff');
      appendOutput('  VER          - Show DOS version', '#ffffff');
      appendOutput('  CLS          - Clear terminal screen', '#ffffff');
    } else {
      appendOutput(`Bad command or file name: "${raw}"`, '#ff5555');
      appendOutput('Type "HELP" for valid commands.', '#aaaaaa');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-[#0000aa] border-2 border-[#5555ff] p-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-[4px_4px_0px_#000000]">
        <div className="flex items-center space-x-2">
          <Terminal className="w-5 h-5 text-yellow-300" />
          <h2 className="font-pixel text-sm text-yellow-300 tracking-wider">
            IN-BROWSER DOSBOX EMULATOR
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="bg-[#000088] px-2 py-0.5 border border-[#5555ff] text-green-300">
            CPU: 80486DX ({cycles.toLocaleString()} CYCLES)
          </span>
          <span className="text-[#aaaaaa]">VGA MODE 13H (320x200)</span>
        </div>
      </div>

      {/* Main Screen Container (CRT Monitor) */}
      <div className="bg-[#000000] border-4 border-[#333333] shadow-[0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden rounded">
        {/* Monitor Top Bezel */}
        <div className="bg-[#1a1a1a] px-3 py-1.5 border-b border-[#333333] flex items-center justify-between text-xs font-mono text-[#aaaaaa]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white font-bold">DOSBOX 0.74-3 EMULATION RUNNER</span>
            <span className="text-yellow-300">
              [{mode === 'running' ? 'RUNNING: GAME.EXE' : 'COMMAND PROMPT: C:\\>'}]
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Actions */}
            {mode === 'prompt' ? (
              <button
                onClick={launchGame}
                className="px-2.5 py-0.5 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-bold border border-white flex items-center space-x-1"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>LAUNCH GAME.EXE</span>
              </button>
            ) : (
              <button
                onClick={stopGame}
                className="px-2.5 py-0.5 bg-[#aa0000] hover:bg-[#ff5555] text-white font-bold border border-white flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>EXIT TO DOS (ESC)</span>
              </button>
            )}

            <button
              onClick={() => setCrt(!crt)}
              className={`px-2 py-0.5 border text-[11px] ${
                crt
                  ? 'bg-[#0000aa] text-white border-[#5555ff]'
                  : 'bg-[#222222] text-[#888888] border-[#444444]'
              }`}
            >
              CRT: {crt ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div
          className={`relative min-h-[420px] flex items-center justify-center p-4 bg-[#050508] ${
            crt ? 'dos-crt-scanlines' : ''
          }`}
        >
          {mode === 'running' ? (
            /* Mode 13h VGA Canvas */
            <div className="relative border-4 border-[#222222] shadow-[0_0_15px_rgba(0,170,0,0.3)]">
              <canvas
                ref={canvasRef}
                width={320}
                height={200}
                className="w-full max-w-[640px] aspect-[4/3] block image-pixelated cursor-pointer"
                tabIndex={0}
              />
              <div className="absolute top-2 right-2 bg-black/75 px-2 py-0.5 text-[10px] font-mono text-green-300 border border-green-500">
                ACTIVE 60 FPS • PRESS ESC TO EXIT
              </div>
            </div>
          ) : (
            /* Interactive DOS Command Console */
            <div
              className="w-full max-w-4xl h-[420px] overflow-y-auto font-mono text-xs text-[#ffffff] p-4 bg-[#000000] border-2 border-[#112211] shadow-[inset_0_0_10px_rgba(0,255,0,0.1)] flex flex-col justify-between cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              <div className="space-y-1">
                {commandHistory.map((item) => (
                  <div
                    key={item.id}
                    className="whitespace-pre-wrap leading-relaxed"
                    style={{ color: item.color || '#ffffff' }}
                  >
                    {item.text}
                  </div>
                ))}
                <div ref={terminalBottomRef} />
              </div>

              {/* Prompt Input Line */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCommand(inputVal);
                }}
                className="flex items-center space-x-1.5 mt-2 pt-2 border-t border-[#222222]"
              >
                <span className="text-[#ffff55] font-bold">C:\GAMES\DOSMAKER&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="flex-1 bg-transparent text-white font-mono text-xs outline-none caret-green-400"
                  autoFocus
                  placeholder="type GAME.EXE, DIR, MEM, or HELP..."
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-[#000088] hover:bg-[#0000aa] text-white border border-[#5555ff] text-[10px]"
                >
                  <CornerDownLeft className="w-3 h-3" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Emulator Hardware Control Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Quick Command 1 */}
        <button
          onClick={() => handleCommand('GAME.EXE')}
          className="p-2.5 bg-[#000088] hover:bg-[#0000cc] border-2 border-[#5555ff] text-white font-mono text-xs flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <Play className="w-3.5 h-3.5 text-green-400 fill-current" />
            <span className="font-bold text-yellow-300">GAME.EXE</span>
          </div>
          <span className="text-[10px] text-[#aaaaaa]">EXECUTE</span>
        </button>

        {/* Quick Command 2 */}
        <button
          onClick={() => handleCommand('DEBUG GAME.EXE')}
          className="p-2.5 bg-[#000088] hover:bg-[#0000cc] border-2 border-[#5555ff] text-white font-mono text-xs flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-cyan-300">DEBUG GAME</span>
          </div>
          <span className="text-[10px] text-[#aaaaaa]">REGISTERS</span>
        </button>

        {/* Quick Command 3 */}
        <button
          onClick={() => handleCommand('MEM')}
          className="p-2.5 bg-[#000088] hover:bg-[#0000cc] border-2 border-[#5555ff] text-white font-mono text-xs flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-bold text-purple-300">MEM /C</span>
          </div>
          <span className="text-[10px] text-[#aaaaaa]">RAM STATUS</span>
        </button>

        {/* Quick Command 4 */}
        <button
          onClick={() => handleCommand('DIR')}
          className="p-2.5 bg-[#000088] hover:bg-[#0000cc] border-2 border-[#5555ff] text-white font-mono text-xs flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-yellow-400" />
            <span className="font-bold text-white">DIR</span>
          </div>
          <span className="text-[10px] text-[#aaaaaa]">CATALOG</span>
        </button>
      </div>

      {/* CPU Cycle Slider & Hardware Spec */}
      <div className="bg-[#000088] border-2 border-[#5555ff] p-3 text-white flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center space-x-3">
          <span className="text-[#aaaaaa]">EMULATED CPU CYCLES:</span>
          <input
            type="range"
            min={3000}
            max={30000}
            step={1000}
            value={cycles}
            onChange={(e) => setCycles(parseInt(e.target.value, 10))}
            className="w-40 accent-yellow-400"
          />
          <span className="text-yellow-300 font-bold">{cycles.toLocaleString()} CYCLES</span>
        </div>

        <div className="text-[11px] text-cyan-300 flex items-center space-x-2">
          <span>PORT 0x3C8/0x3C9 (VGA DAC)</span>
          <span>•</span>
          <span>PORT 0x220 (SB16 DSP)</span>
          <span>•</span>
          <span>PORT 0x388 (OPL2 FM)</span>
        </div>
      </div>
    </div>
  );
};
