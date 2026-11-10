import React, { useEffect, useRef, useState } from 'react';
import { GameProject } from '../types/dos';
import { DosRuntime } from '../engine/dosRuntime';
import { soundBlaster } from '../engine/soundBlaster';
import { Play, RotateCcw, Crosshair, Volume2, Activity, Keyboard } from 'lucide-react';

interface DosPlayerProps {
  project: GameProject;
  crtEffect: boolean;
  onOpenSoundBlaster?: () => void;
  onOpenMzInspector?: () => void;
}

export const DosPlayer: React.FC<DosPlayerProps> = ({
  project,
  crtEffect,
  onOpenSoundBlaster,
  onOpenMzInspector,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<DosRuntime | null>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [, setTick] = useState(0);
  const [sbStatus, setSbStatus] = useState({
    dspBusy: false,
    irqFired: false,
    oplVoices: 0,
    dmaTransfers: 0,
    lastCmd: '0x00',
  });

  // Initialize or reconfigure DosRuntime
  useEffect(() => {
    const runtime = new DosRuntime(project);
    runtimeRef.current = runtime;

    if (canvasRef.current) {
      runtime.setCanvas(canvasRef.current);
    }

    runtime.onStateChange = () => {
      setTick((t) => t + 1);
    };

    runtime.start();

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ControlLeft', 'AltLeft', 'KeyZ'].includes(e.code)) {
        e.preventDefault();
      }
      runtime.keys[e.code] = true;

      // Shoot trigger
      if (e.code === 'KeyZ' || e.code === 'ControlLeft') {
        runtime.shootBullet();
      }

      // Retry on Space if gameover / victory
      if (e.code === 'Space' && (runtime.gameState === 'gameover' || runtime.gameState === 'victory')) {
        runtime.reset(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      runtime.keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Audio status & oscilloscope polling
    const timer = setInterval(() => {
      setSbStatus({
        dspBusy: soundBlaster.status.dspBusy,
        irqFired: soundBlaster.status.irqFired,
        oplVoices: soundBlaster.status.oplVoicesActive,
        dmaTransfers: soundBlaster.status.dmaTransfers,
        lastCmd: soundBlaster.status.dspLastCmd,
      });

      // Draw sound blaster oscilloscope
      const audioCanvas = audioCanvasRef.current;
      const analyser = soundBlaster.getAnalyser();
      if (audioCanvas && analyser) {
        const actx = audioCanvas.getContext('2d');
        if (actx) {
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(dataArray);

          actx.fillStyle = '#001100';
          actx.fillRect(0, 0, audioCanvas.width, audioCanvas.height);
          actx.lineWidth = 1.5;
          actx.strokeStyle = '#55ff55';
          actx.beginPath();

          const sliceWidth = audioCanvas.width / bufferLength;
          let x = 0;
          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * audioCanvas.height) / 2;
            if (i === 0) actx.moveTo(x, y);
            else actx.lineTo(x, y);
            x += sliceWidth;
          }
          actx.stroke();
        }
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(timer);
      runtime.stop();
    };
  }, [project]);

  // Restart DOS
  const handleReset = (showBoot: boolean) => {
    if (runtimeRef.current) {
      runtimeRef.current.reset(showBoot);
    }
  };

  // Virtual buttons
  const setVirtualKey = (code: string, pressed: boolean) => {
    if (runtimeRef.current) {
      runtimeRef.current.keys[code] = pressed;
      if (pressed && code === 'KeyZ') {
        runtimeRef.current.shootBullet();
      }
      if (pressed && code === 'Space' && (runtimeRef.current.gameState === 'gameover' || runtimeRef.current.gameState === 'victory')) {
        runtimeRef.current.reset(false);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto items-start">
      {/* LEFT: 320x200 CRT Canvas Display */}
      <div className="flex-1 flex flex-col items-center w-full">
        <div className="bg-[#111111] p-3 rounded-lg border-4 border-[#333333] shadow-[0_10px_30px_rgba(0,0,0,0.8)] w-full max-w-[720px]">
          {/* Monitor Bezel Header */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#aaaaaa] pb-2 border-b border-[#222222] mb-2 px-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block animate-pulse" />
              <span className="text-white font-bold">IBM 8514/A COLOR DISPLAY</span>
              <span className="text-yellow-400">VGA 320x200x256</span>
            </div>
            <div className="flex items-center space-x-3 text-[10px]">
              <span className="text-cyan-400">70.0 Hz</span>
              <span>18.4 kHz</span>
              <span className="bg-[#222222] px-1.5 py-0.5 text-white">MODE 13H</span>
            </div>
          </div>

          {/* Canvas Wrapper with CRT effect */}
          <div className={`relative bg-black rounded overflow-hidden aspect-[320/200] w-full ${crtEffect ? 'crt-overlay shadow-[inset_0_0_80px_rgba(0,0,0,0.9)]' : ''}`}>
            <canvas
              ref={canvasRef}
              width={320}
              height={200}
              className="w-full h-full pixelated block"
            />
          </div>

          {/* Under Monitor Quick Controls */}
          <div className="flex flex-wrap items-center justify-between mt-3 pt-2 border-t border-[#222222] text-xs font-mono text-[#aaaaaa] gap-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleReset(true)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#222222] hover:bg-[#333333] text-white border border-[#444444]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
                <span>COLD REBOOT (MS-DOS)</span>
              </button>
              <button
                onClick={() => handleReset(false)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#222222] hover:bg-[#333333] text-white border border-[#444444]"
              >
                <Play className="w-3.5 h-3.5 text-green-400" />
                <span>QUICK RESTART</span>
              </button>
            </div>

            <div className="text-[11px] text-[#888888]">
              Genre: <span className="text-yellow-300 capitalize">{project.genre.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Onscreen Retro DOS Controller Pad (For mouse & mobile play) */}
        <div className="mt-4 w-full max-w-[720px] bg-[#000044] border-2 border-[#5555ff] p-3 text-white">
          <div className="flex items-center justify-between border-b border-[#0000aa] pb-1.5 mb-3">
            <span className="font-pixel text-[10px] text-yellow-300 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" />
              MS-DOS INPUT CONTROLS
            </span>
            <span className="text-[10px] text-[#aaaaaa] font-mono">
              Desktop: <kbd className="bg-black text-white px-1">Arrows</kbd> Move, <kbd className="bg-black text-white px-1">Space</kbd> Jump, <kbd className="bg-black text-white px-1">Z/Ctrl</kbd> Fire
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* D-Pad */}
            <div className="grid grid-cols-3 gap-1 w-36">
              <div />
              <button
                onMouseDown={() => setVirtualKey('ArrowUp', true)}
                onMouseUp={() => setVirtualKey('ArrowUp', false)}
                onTouchStart={() => setVirtualKey('ArrowUp', true)}
                onTouchEnd={() => setVirtualKey('ArrowUp', false)}
                className="bg-[#333333] hover:bg-[#555555] active:bg-[#ffff55] active:text-black py-2 font-mono text-center font-bold border border-gray-500 shadow"
              >
                ▲
              </button>
              <div />
              <button
                onMouseDown={() => setVirtualKey('ArrowLeft', true)}
                onMouseUp={() => setVirtualKey('ArrowLeft', false)}
                onTouchStart={() => setVirtualKey('ArrowLeft', true)}
                onTouchEnd={() => setVirtualKey('ArrowLeft', false)}
                className="bg-[#333333] hover:bg-[#555555] active:bg-[#ffff55] active:text-black py-2 font-mono text-center font-bold border border-gray-500 shadow"
              >
                ◀
              </button>
              <div className="bg-[#222222] border border-gray-700" />
              <button
                onMouseDown={() => setVirtualKey('ArrowRight', true)}
                onMouseUp={() => setVirtualKey('ArrowRight', false)}
                onTouchStart={() => setVirtualKey('ArrowRight', true)}
                onTouchEnd={() => setVirtualKey('ArrowRight', false)}
                className="bg-[#333333] hover:bg-[#555555] active:bg-[#ffff55] active:text-black py-2 font-mono text-center font-bold border border-gray-500 shadow"
              >
                ▶
              </button>
              <div />
              <button
                onMouseDown={() => setVirtualKey('ArrowDown', true)}
                onMouseUp={() => setVirtualKey('ArrowDown', false)}
                onTouchStart={() => setVirtualKey('ArrowDown', true)}
                onTouchEnd={() => setVirtualKey('ArrowDown', false)}
                className="bg-[#333333] hover:bg-[#555555] active:bg-[#ffff55] active:text-black py-2 font-mono text-center font-bold border border-gray-500 shadow"
              >
                ▼
              </button>
              <div />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onMouseDown={() => setVirtualKey('KeyZ', true)}
                onMouseUp={() => setVirtualKey('KeyZ', false)}
                onTouchStart={() => setVirtualKey('KeyZ', true)}
                onTouchEnd={() => setVirtualKey('KeyZ', false)}
                className="w-16 h-16 rounded-full bg-[#aa0000] hover:bg-[#ff5555] active:bg-white active:text-black text-white font-pixel text-[9px] border-2 border-red-900 shadow-[2px_2px_0_#000] flex flex-col items-center justify-center"
              >
                <Crosshair className="w-4 h-4 mb-0.5" />
                FIRE (Z)
              </button>

              <button
                onMouseDown={() => setVirtualKey('Space', true)}
                onMouseUp={() => setVirtualKey('Space', false)}
                onTouchStart={() => setVirtualKey('Space', true)}
                onTouchEnd={() => setVirtualKey('Space', false)}
                className="w-16 h-16 rounded-full bg-[#00aa00] hover:bg-[#55ff55] active:bg-white active:text-black text-white font-pixel text-[9px] border-2 border-green-900 shadow-[2px_2px_0_#000] flex flex-col items-center justify-center"
              >
                <Play className="w-4 h-4 mb-0.5 fill-current" />
                JUMP
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: SOUND BLASTER 16 & HARDWARE DIAGNOSTICS RACK */}
      <div className="w-full lg:w-80 flex flex-col space-y-4">
        {/* Sound Blaster Card Hardware Panel */}
        <div className="bg-[#0b101b] border-2 border-[#5555ff] p-3 text-xs shadow-lg">
          <div className="flex items-center justify-between border-b border-[#5555ff] pb-2 mb-2">
            <div className="flex items-center space-x-1.5 font-pixel text-[10px] text-yellow-300">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span>SOUND BLASTER 16</span>
            </div>
            <span className="text-[10px] bg-[#0000aa] text-white px-1.5 py-0.5 font-mono">
              DSP v4.13
            </span>
          </div>

          {/* Card BLASTER Environment String */}
          <div className="bg-[#000000] p-2 border border-[#333333] font-mono text-[11px] mb-3">
            <div className="text-[#888888] text-[9px]">DOS ENVIRONMENT VARIABLE:</div>
            <div className="text-[#55ff55] font-bold tracking-wide">
              SET BLASTER=A{project.sbConfig.basePort.replace('h','')} I{project.sbConfig.irq} D{project.sbConfig.dma8} H{project.sbConfig.dma16} T{project.sbConfig.type}
            </div>
          </div>

          {/* Real-time Hardware LED Indicators */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] mb-3">
            <div className="bg-[#111827] p-2 border border-[#1f2937] flex items-center justify-between">
              <span className="text-[#aaaaaa]">PORT {project.sbConfig.basePort}:</span>
              <span className="flex items-center space-x-1 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>ONLINE</span>
              </span>
            </div>

            <div className="bg-[#111827] p-2 border border-[#1f2937] flex items-center justify-between">
              <span className="text-[#aaaaaa]">IRQ {project.sbConfig.irq}:</span>
              <span className={`w-2 h-2 rounded-full ${sbStatus.irqFired ? 'bg-red-500 ring-2 ring-red-300' : 'bg-gray-600'}`} />
            </div>

            <div className="bg-[#111827] p-2 border border-[#1f2937] flex items-center justify-between">
              <span className="text-[#aaaaaa]">OPL2 FM:</span>
              <span className="text-yellow-400 font-bold">
                {sbStatus.oplVoices > 0 ? `${sbStatus.oplVoices} VOICES` : 'STANDBY'}
              </span>
            </div>

            <div className="bg-[#111827] p-2 border border-[#1f2937] flex items-center justify-between">
              <span className="text-[#aaaaaa]">DSP 8-BIT:</span>
              <span className={`font-bold ${sbStatus.dspBusy ? 'text-red-400' : 'text-gray-400'}`}>
                {sbStatus.dspBusy ? 'BUSY' : 'READY'}
              </span>
            </div>
          </div>

          {/* Live OPL2 Audio Oscilloscope */}
          <div className="bg-[#000000] border border-[#222222] p-1.5 mb-3">
            <div className="flex items-center justify-between text-[9px] font-mono text-[#888888] mb-1">
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-green-400" />
                OPL2/OPL3 FM OUTPUT WAVEFORM
              </span>
              <span className="text-green-400">{project.sbConfig.dspSampleRate} Hz</span>
            </div>
            <canvas
              ref={audioCanvasRef}
              width={260}
              height={50}
              className="w-full h-12 bg-[#001100] border border-[#003300]"
            />
          </div>

          {/* Direct Link to Sound Studio */}
          <button
            onClick={onOpenSoundBlaster}
            className="w-full py-1.5 bg-[#0000aa] hover:bg-[#0000cc] text-white font-mono text-center border border-[#5555ff] flex items-center justify-center space-x-1"
          >
            <span>CONFIGURE SOUND BLASTER / OPL2</span>
            <span>&rarr;</span>
          </button>
        </div>

        {/* MS-DOS MZ Executable Quick Card */}
        <div className="bg-[#0b101b] border-2 border-[#55ffff] p-3 text-xs shadow-lg">
          <div className="flex items-center justify-between border-b border-[#55ffff] pb-1.5 mb-2">
            <span className="font-pixel text-[10px] text-cyan-300">DOS MZ HEADER INFO</span>
            <span className="text-white bg-[#00aaaa] px-1 text-[10px] font-mono">0x5A4D ('MZ')</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px] text-[#aaaaaa]">
            <div className="flex justify-between">
              <span>Signature:</span>
              <span className="text-white font-bold">"MZ" (Mark Zbikowski)</span>
            </div>
            <div className="flex justify-between">
              <span>Target Mode:</span>
              <span className="text-yellow-400">8086 Real Mode</span>
            </div>
            <div className="flex justify-between">
              <span>Entry Point:</span>
              <span className="text-green-400">CS:0000h IP:0000h</span>
            </div>
            <div className="flex justify-between">
              <span>Initial Stack:</span>
              <span className="text-white">SS:0010h SP:0400h</span>
            </div>
          </div>

          <button
            onClick={onOpenMzInspector}
            className="w-full mt-3 py-1.5 bg-[#00aaaa] hover:bg-[#55ffff] hover:text-black text-black font-mono font-bold text-center border border-white"
          >
            INSPECT MZ HEADER & HEX DUMP &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
