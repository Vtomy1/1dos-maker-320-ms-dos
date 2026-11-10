import React, { useState, useMemo } from 'react';
import { GameProject } from '../types/dos';
import {
  createMzHeader,
  parseMzHeaderInfo,
  buildDosExecutable,
  buildDosCom,
  buildDosDistributionZip,
  formatHexDump,
  generateTurboCCode,
  generateTasmAsm,
} from '../engine/mzHeader';
import { Download, FileCode, Cpu, ShieldCheck, Binary, Terminal, Check } from 'lucide-react';

interface ExeHeaderInspectorProps {
  project: GameProject;
}

export const ExeHeaderInspector: React.FC<ExeHeaderInspectorProps> = ({ project }) => {
  const [activeSubTab, setActiveSubTab] = useState<'mz_header' | 'hex_dump' | 'turbo_c' | 'assembly'>('mz_header');
  const [copied, setCopied] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  // Generate binary and header for current project
  const exeBinary = useMemo(() => {
    return buildDosExecutable(project);
  }, [project]);

  const comBinary = useMemo(() => {
    return buildDosCom(project);
  }, [project]);

  const mzHeader = useMemo(() => {
    return createMzHeader(48, exeBinary.length - 64 - 48);
  }, [exeBinary]);

  const headerFields = useMemo(() => {
    return parseMzHeaderInfo(mzHeader);
  }, [mzHeader]);

  const hexDump = useMemo(() => {
    return formatHexDump(exeBinary, 0, 512);
  }, [exeBinary]);

  const turboCCode = useMemo(() => {
    return generateTurboCCode(project);
  }, [project]);

  const tasmCode = useMemo(() => {
    return generateTasmAsm(project);
  }, [project]);

  // Download standalone .EXE file
  const handleDownloadExe = () => {
    const blob = new Blob([exeBinary.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GAME.EXE';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download standalone .COM file
  const handleDownloadCom = () => {
    const blob = new Blob([comBinary.buffer as ArrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GAME.COM';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download complete DOSBox zip package
  const handleDownloadZip = async () => {
    setIsExportingZip(true);
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
      console.error('Failed to create DOS package zip:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Top Banner & Export Actions */}
      <div className="bg-[#000044] border-2 border-[#5555ff] p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between border-b border-[#5555ff] pb-3 mb-3 gap-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="font-pixel text-xs text-yellow-300 block">MS-DOS MZ EXECUTABLE (.EXE) GENERATOR</span>
              <span className="text-[11px] text-[#aaaaaa] font-mono">
                Real-Mode 8086 / Mode 13h (320x200x256) / Sound Blaster 16
              </span>
            </div>
          </div>

          {/* Quick Binary Download Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadExe}
              className="px-3 py-1.5 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-pixel text-[9px] shadow-[2px_2px_0_#000] flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD GAME.EXE ({exeBinary.length} B)</span>
            </button>

            <button
              onClick={handleDownloadCom}
              className="px-3 py-1.5 bg-[#0000aa] hover:bg-[#5555ff] text-white font-pixel text-[9px] shadow-[2px_2px_0_#000] flex items-center space-x-1.5"
            >
              <Binary className="w-3.5 h-3.5" />
              <span>DOWNLOAD GAME.COM</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isExportingZip}
              className="px-3 py-1.5 bg-[#aa5500] hover:bg-[#ff5555] text-white font-pixel text-[9px] shadow-[2px_2px_0_#000] flex items-center space-x-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{isExportingZip ? 'PACKAGING ZIP...' : 'DOSBOX FULL SUITE (.ZIP)'}</span>
            </button>
          </div>
        </div>

        {/* Binary Quick Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
          <div className="bg-[#000022] p-2 border border-[#333333]">
            <span className="text-[#888888] block text-[9px]">HEADER SIGNATURE</span>
            <span className="text-[#55ff55] font-bold">0x5A4D ('MZ')</span>
          </div>
          <div className="bg-[#000022] p-2 border border-[#333333]">
            <span className="text-[#888888] block text-[9px]">TARGET ARCHITECTURE</span>
            <span className="text-yellow-300 font-bold">Intel 8086 / Real Mode</span>
          </div>
          <div className="bg-[#000022] p-2 border border-[#333333]">
            <span className="text-[#888888] block text-[9px]">TOTAL BINARY SIZE</span>
            <span className="text-cyan-300 font-bold">{exeBinary.length} Bytes</span>
          </div>
          <div className="bg-[#000022] p-2 border border-[#333333]">
            <span className="text-[#888888] block text-[9px]">SOUND BLASTER INIT</span>
            <span className="text-white font-bold">Port {project.sbConfig.basePort} / IRQ {project.sbConfig.irq}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b-2 border-[#5555ff] bg-[#000022] px-2 text-xs font-mono">
        <button
          onClick={() => setActiveSubTab('mz_header')}
          className={`px-4 py-2 border-t-2 border-l-2 border-r-2 -mb-0.5 font-bold flex items-center space-x-1.5 ${
            activeSubTab === 'mz_header'
              ? 'bg-[#000044] text-[#ffff55] border-[#5555ff]'
              : 'text-[#aaaaaa] border-transparent hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>MZ HEADER FIELDS (14 PARAMS)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('hex_dump')}
          className={`px-4 py-2 border-t-2 border-l-2 border-r-2 -mb-0.5 font-bold flex items-center space-x-1.5 ${
            activeSubTab === 'hex_dump'
              ? 'bg-[#000044] text-[#ffff55] border-[#5555ff]'
              : 'text-[#aaaaaa] border-transparent hover:text-white'
          }`}
        >
          <Binary className="w-4 h-4 text-green-400" />
          <span>NORTON HEX DUMP / DEBUG.EXE</span>
        </button>

        <button
          onClick={() => setActiveSubTab('turbo_c')}
          className={`px-4 py-2 border-t-2 border-l-2 border-r-2 -mb-0.5 font-bold flex items-center space-x-1.5 ${
            activeSubTab === 'turbo_c'
              ? 'bg-[#000044] text-[#ffff55] border-[#5555ff]'
              : 'text-[#aaaaaa] border-transparent hover:text-white'
          }`}
        >
          <FileCode className="w-4 h-4 text-yellow-400" />
          <span>TURBO C 2.0 (GAME.C)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('assembly')}
          className={`px-4 py-2 border-t-2 border-l-2 border-r-2 -mb-0.5 font-bold flex items-center space-x-1.5 ${
            activeSubTab === 'assembly'
              ? 'bg-[#000044] text-[#ffff55] border-[#5555ff]'
              : 'text-[#aaaaaa] border-transparent hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4 text-red-400" />
          <span>TASM / MASM 8086 (GAME.ASM)</span>
        </button>
      </div>

      {/* TAB 1: MZ HEADER DETAILED TABLE */}
      {activeSubTab === 'mz_header' && (
        <div className="bg-[#000044] border-2 border-[#5555ff] p-4 text-xs font-mono">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-[#333333]">
              <thead>
                <tr className="bg-[#000088] text-[#ffff55] border-b border-[#5555ff]">
                  <th className="p-2 border border-[#333333]">Offset</th>
                  <th className="p-2 border border-[#333333]">Field Name</th>
                  <th className="p-2 border border-[#333333]">Hex Value</th>
                  <th className="p-2 border border-[#333333]">Decimal</th>
                  <th className="p-2 border border-[#333333]">Description / Role in DOS Execution</th>
                </tr>
              </thead>
              <tbody>
                {headerFields.map((field) => (
                  <tr
                    key={field.name}
                    className="border-b border-[#222244] hover:bg-[#000066] transition-colors"
                  >
                    <td className="p-2 text-cyan-400 font-bold border border-[#333333]">
                      0x{field.offset.toString(16).toUpperCase().padStart(2, '0')}
                    </td>
                    <td className="p-2 text-yellow-300 font-bold border border-[#333333]">{field.name}</td>
                    <td className="p-2 text-[#55ff55] font-bold border border-[#333333]">{field.hex}</td>
                    <td className="p-2 text-white border border-[#333333]">{field.value}</td>
                    <td className="p-2 text-[#aaaaaa] border border-[#333333]">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-[#000022] border border-[#5555ff] text-[11px] space-y-1 text-[#aaaaaa]">
            <div className="text-yellow-300 font-bold mb-1">MS-DOS EXECUTION CYCLE:</div>
            <div>
              1. MS-DOS checks first 2 bytes for signature <code className="text-green-400">0x5A4D</code> ('MZ').
            </div>
            <div>
              2. Program segment is allocated in conventional RAM, calculating extra memory needed from{' '}
              <code className="text-green-400">e_minalloc</code> and <code className="text-green-400">e_maxalloc</code>.
            </div>
            <div>
              3. Relocations from offset <code className="text-green-400">e_lfarlc</code> are processed relative to actual load segment.
            </div>
            <div>
              4. CPU registers are primed: <code className="text-green-400">SS:SP</code> set from header, and jump to{' '}
              <code className="text-green-400">CS:IP</code>.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NORTON / DEBUG.EXE HEX DUMP */}
      {activeSubTab === 'hex_dump' && (
        <div className="bg-[#000000] border-2 border-[#5555ff] p-4 text-xs font-mono">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#333333] text-[#aaaaaa]">
            <span className="text-green-400 font-bold">MS-DOS DEBUG.EXE MEMORY INSPECTOR (OFFSET 0000h - 0200h)</span>
            <span className="text-[10px]">16 Bytes per line | Little-Endian x86 Machine Code</span>
          </div>

          <div className="overflow-x-auto space-y-1 text-[11px]">
            {hexDump.lines.map((line, idx) => (
              <div key={idx} className="flex items-center space-x-3 hover:bg-[#111122]">
                <span className="text-cyan-400 select-none w-16">{line.offsetHex}</span>
                <div className="flex space-x-1.5 text-[#55ff55]">
                  {line.bytesHex.map((b, bIdx) => (
                    <span
                      key={bIdx}
                      className={
                        idx === 0 && (bIdx === 0 || bIdx === 1)
                          ? 'bg-[#aa0000] text-white px-0.5 font-bold'
                          : bIdx === 8
                          ? 'ml-2 text-white'
                          : ''
                      }
                    >
                      {b}
                    </span>
                  ))}
                </div>
                <span className="text-[#ffff55] border-l border-gray-700 pl-3 select-none">
                  |{line.ascii}|
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-2 bg-[#111111] border border-gray-800 text-[10px] text-[#aaaaaa]">
            <span className="text-red-400 font-bold">Red highlight at 0000:0000:</span> 4D 5A represents 'MZ', the DOS magic signature.
            Bytes at 0000:0040 begin the real-mode 8086 instructions (<code className="text-yellow-300">B8 13 00 CD 10</code> = INT 10h AH=0 AL=13h VGA 320x200).
          </div>
        </div>
      )}

      {/* TAB 3: TURBO C SOURCE CODE */}
      {activeSubTab === 'turbo_c' && (
        <div className="bg-[#000022] border-2 border-[#5555ff] p-4 text-xs font-mono relative">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#5555ff]">
            <span className="text-yellow-300 font-bold">BORLAND TURBO C 2.0 / BORLAND C++ 3.1 (GAME.C)</span>
            <button
              onClick={() => copyToClipboard(turboCCode)}
              className="px-2.5 py-1 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-mono text-[10px] flex items-center space-x-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
              <span>{copied ? 'COPIED!' : 'COPY C CODE'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto text-[#aaaaaa] p-3 bg-black border border-gray-800 text-[11px] leading-relaxed max-h-[480px]">
            {turboCCode}
          </pre>
        </div>
      )}

      {/* TAB 4: TASM / MASM 8086 ASSEMBLY */}
      {activeSubTab === 'assembly' && (
        <div className="bg-[#000022] border-2 border-[#5555ff] p-4 text-xs font-mono relative">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#5555ff]">
            <span className="text-red-400 font-bold">TURBO ASSEMBLER / MASM 6.11 (GAME.ASM)</span>
            <button
              onClick={() => copyToClipboard(tasmCode)}
              className="px-2.5 py-1 bg-[#00aa00] hover:bg-[#55ff55] hover:text-black text-white font-mono text-[10px] flex items-center space-x-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <FileCode className="w-3 h-3" />}
              <span>{copied ? 'COPIED!' : 'COPY ASM CODE'}</span>
            </button>
          </div>
          <pre className="overflow-x-auto text-[#55ff55] p-3 bg-black border border-gray-800 text-[11px] leading-relaxed max-h-[480px]">
            {tasmCode}
          </pre>
        </div>
      )}
    </div>
  );
};
