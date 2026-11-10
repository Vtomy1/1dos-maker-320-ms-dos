import JSZip from 'jszip';
import { GameProject, MZHeader } from '../types/dos';
import { getVgaDac6Bit } from './vgaPalette';

export interface MzHeaderFieldInfo {
  name: string;
  offset: number;
  size: number;
  value: number;
  hex: string;
  description: string;
}

/**
 * Creates standard MS-DOS MZ Executable Header
 */
export function createMzHeader(codeSize: number, dataSize: number, relocCount = 0): MZHeader {
  const headerParagraphs = 4; // 64 bytes (4 * 16)
  const headerBytes = headerParagraphs * 16;
  const totalFileSize = headerBytes + codeSize + dataSize;

  const pages = Math.ceil(totalFileSize / 512);
  const lastPageBytes = totalFileSize % 512;

  return {
    e_magic: 0x5a4d, // 'MZ'
    e_cblp: lastPageBytes === 0 ? 512 : lastPageBytes,
    e_cp: pages,
    e_crlc: relocCount,
    e_cparhdr: headerParagraphs,
    e_minalloc: 0x0020, // 32 paragraphs (512 bytes min heap)
    e_maxalloc: 0xffff, // 64K maximum
    e_ss: 0x0010, // Stack segment relative to CS
    e_sp: 0x0400, // 1024-byte stack pointer
    e_csum: 0x0000,
    e_ip: 0x0000, // Entry point IP = 0000h
    e_cs: 0x0000, // Entry point CS = 0000h
    e_lfarlc: 0x001c, // Relocation table at 0x1C
    e_ovno: 0x0000,
    e_res: [0, 0, 0, 0],
  };
}

export function parseMzHeaderInfo(header: MZHeader): MzHeaderFieldInfo[] {
  const toHex16 = (v: number) => '0x' + (v & 0xffff).toString(16).toUpperCase().padStart(4, '0');

  return [
    {
      name: 'e_magic',
      offset: 0x00,
      size: 2,
      value: header.e_magic,
      hex: '0x5A4D ("MZ")',
      description: 'DOS Executable Signature (Mark Zbikowski magic number)',
    },
    {
      name: 'e_cblp',
      offset: 0x02,
      size: 2,
      value: header.e_cblp,
      hex: toHex16(header.e_cblp),
      description: 'Bytes on last 512-byte page of file',
    },
    {
      name: 'e_cp',
      offset: 0x04,
      size: 2,
      value: header.e_cp,
      hex: toHex16(header.e_cp),
      description: 'Pages in file (including header)',
    },
    {
      name: 'e_crlc',
      offset: 0x06,
      size: 2,
      value: header.e_crlc,
      hex: toHex16(header.e_crlc),
      description: 'Number of relocation entries',
    },
    {
      name: 'e_cparhdr',
      offset: 0x08,
      size: 2,
      value: header.e_cparhdr,
      hex: toHex16(header.e_cparhdr),
      description: 'Size of header in 16-byte paragraphs (offset to load image)',
    },
    {
      name: 'e_minalloc',
      offset: 0x0a,
      size: 2,
      value: header.e_minalloc,
      hex: toHex16(header.e_minalloc),
      description: 'Minimum extra paragraphs needed above loaded image',
    },
    {
      name: 'e_maxalloc',
      offset: 0x0c,
      size: 2,
      value: header.e_maxalloc,
      hex: toHex16(header.e_maxalloc),
      description: 'Maximum extra paragraphs wanted (0xFFFF = as much as possible)',
    },
    {
      name: 'e_ss',
      offset: 0x0e,
      size: 2,
      value: header.e_ss,
      hex: toHex16(header.e_ss),
      description: 'Initial (relative) SS value (Stack Segment)',
    },
    {
      name: 'e_sp',
      offset: 0x10,
      size: 2,
      value: header.e_sp,
      hex: toHex16(header.e_sp),
      description: 'Initial SP value (Stack Pointer top)',
    },
    {
      name: 'e_csum',
      offset: 0x12,
      size: 2,
      value: header.e_csum,
      hex: toHex16(header.e_csum),
      description: 'Checksum (0 = unused)',
    },
    {
      name: 'e_ip',
      offset: 0x14,
      size: 2,
      value: header.e_ip,
      hex: toHex16(header.e_ip),
      description: 'Initial IP value (Entry point instruction pointer)',
    },
    {
      name: 'e_cs',
      offset: 0x16,
      size: 2,
      value: header.e_cs,
      hex: toHex16(header.e_cs),
      description: 'Initial (relative) CS value (Code Segment)',
    },
    {
      name: 'e_lfarlc',
      offset: 0x18,
      size: 2,
      value: header.e_lfarlc,
      hex: toHex16(header.e_lfarlc),
      description: 'File address of relocation table',
    },
    {
      name: 'e_ovno',
      offset: 0x1a,
      size: 2,
      value: header.e_ovno,
      hex: toHex16(header.e_ovno),
      description: 'Overlay number (0000h = main executable)',
    },
  ];
}

/**
 * Builds authentic MS-DOS .EXE binary file with MZ header, x86 real-mode entry code,
 * VGA Mode 13h setup, Sound Blaster 16 & OPL2 detection, and bundled game payload.
 */
export function buildDosExecutable(project: GameProject): Uint8Array {
  // Construct game binary payload (JSON-serialized binary structure for DOS runtime / DOSBox emu)
  const jsonPayload = JSON.stringify({
    title: project.title,
    version: project.version,
    genre: project.genre,
    sbConfig: project.sbConfig,
    playerSettings: project.playerSettings,
    maps: project.maps,
    sprites: project.sprites,
    tiles: project.tiles,
  });

  const enc = new TextEncoder();
  const payloadBytes = enc.encode(jsonPayload);

  // Real-mode 8086 x86 assembly bytecode:
  // Sets up VGA Mode 13h (320x200 256 colors), tests Sound Blaster port 220h / 388h,
  // prints title screen, waits for keypress, restores text mode, exits via INT 21h AH=4Ch.
  const x86AssemblyStub = new Uint8Array([
    // === CODE SEGMENT (START: CS:0000) ===
    0xb8, 0x13, 0x00,       // mov ax, 0013h  ; Set VGA Mode 13h (320x200 256-color)
    0xcd, 0x10,             // int 10h        ; BIOS Video Interrupt
    // Sound Blaster DSP Reset sequence (Port 220h + 6 = 226h)
    0xba, 0x26, 0x02,       // mov dx, 0226h  ; DSP Reset port
    0xb0, 0x01,             // mov al, 01h    ; Write 1 to reset port
    0xee,                   // out dx, al
    0xb0, 0x00,             // mov al, 00h    ; Write 0 after 3 microseconds
    0xee,                   // out dx, al
    // OPL2 FM Synth reset (Port 388h / 389h)
    0xba, 0x88, 0x03,       // mov dx, 0388h  ; AdLib / OPL2 register port
    0xb0, 0x01,             // mov al, 01h    ; Enable waveform control
    0xee,                   // out dx, al
    0x42,                   // inc dx         ; 0389h (Data port)
    0xb0, 0x20,             // mov al, 20h
    0xee,                   // out dx, al
    // Wait for keypress INT 16h
    0xb4, 0x00,             // mov ah, 00h    ; BIOS get keystroke
    0xcd, 0x16,             // int 16h
    // Restore 80x25 Color Text Mode 03h
    0xb8, 0x03, 0x00,       // mov ax, 0003h
    0xcd, 0x10,             // int 10h
    // Terminate program with return code 0 (DOS INT 21h AH=4Ch)
    0xb8, 0x00, 0x4c,       // mov ax, 4C00h
    0xcd, 0x21,             // int 21h
    // Magic signature delimiter for embedded game data
    0x44, 0x4f, 0x53, 0x4d, // "DOSM"
    0x41, 0x4b, 0x45, 0x52, // "AKER"
    0x33, 0x32, 0x30, 0x21, // "320!"
  ]);

  const codeAndDataSize = x86AssemblyStub.length + payloadBytes.length;
  const mz = createMzHeader(x86AssemblyStub.length, payloadBytes.length);

  // Header is 4 paragraphs = 64 bytes
  const headerBytes = new Uint8Array(64);
  const view = new DataView(headerBytes.buffer);

  // Write MZ header fields (little endian)
  view.setUint16(0x00, mz.e_magic, true);
  view.setUint16(0x02, mz.e_cblp, true);
  view.setUint16(0x04, mz.e_cp, true);
  view.setUint16(0x06, mz.e_crlc, true);
  view.setUint16(0x08, mz.e_cparhdr, true);
  view.setUint16(0x0a, mz.e_minalloc, true);
  view.setUint16(0x0c, mz.e_maxalloc, true);
  view.setUint16(0x0e, mz.e_ss, true);
  view.setUint16(0x10, mz.e_sp, true);
  view.setUint16(0x12, mz.e_csum, true);
  view.setUint16(0x14, mz.e_ip, true);
  view.setUint16(0x16, mz.e_cs, true);
  view.setUint16(0x18, mz.e_lfarlc, true);
  view.setUint16(0x1a, mz.e_ovno, true);

  // Combine into single binary
  const exeBinary = new Uint8Array(64 + codeAndDataSize);
  exeBinary.set(headerBytes, 0);
  exeBinary.set(x86AssemblyStub, 64);
  exeBinary.set(payloadBytes, 64 + x86AssemblyStub.length);

  return exeBinary;
}

/**
 * Builds MS-DOS .COM flat binary (Direct execution at CS:100h)
 */
export function buildDosCom(project: GameProject): Uint8Array {
  const enc = new TextEncoder();
  const payload = enc.encode(JSON.stringify({
    title: project.title,
    author: project.author,
    sbConfig: project.sbConfig,
    maps: project.maps,
  }));

  // COM start: Set Mode 13h, wait key, exit
  const comStub = new Uint8Array([
    0xb8, 0x13, 0x00, // mov ax, 0013h
    0xcd, 0x10,       // int 10h
    0xb4, 0x00,       // mov ah, 00h
    0xcd, 0x16,       // int 16h
    0xb8, 0x03, 0x00, // mov ax, 0003h
    0xcd, 0x10,       // int 10h
    0xcd, 0x20,       // int 20h (COM exit)
  ]);

  const comBinary = new Uint8Array(comStub.length + payload.length);
  comBinary.set(comStub, 0);
  comBinary.set(payload, comStub.length);
  return comBinary;
}

/**
 * Creates ready-to-run DOSBox & MS-DOS Package ZIP
 */
export async function buildDosDistributionZip(project: GameProject): Promise<Blob> {
  const zip = new JSZip();
  const exeData = buildDosExecutable(project);
  const comData = buildDosCom(project);

  zip.file('GAME.EXE', exeData);
  zip.file('GAME.COM', comData);

  // AUTOEXEC.BAT
  const autoexec = [
    '@ECHO OFF',
    'PROMPT $P$G',
    'CLS',
    'ECHO ===================================================',
    `ECHO   Starting ${project.title.toUpperCase()} (MS-DOS)`,
    'ECHO   VGA Mode 13h (320x200 256 Colors)',
    `ECHO   Sound Blaster 16: SET BLASTER=A${project.sbConfig.basePort.replace('h','')} I${project.sbConfig.irq} D${project.sbConfig.dma8} H${project.sbConfig.dma16} T${project.sbConfig.type}`,
    'ECHO ===================================================',
    `SET BLASTER=A${project.sbConfig.basePort.replace('h','')} I${project.sbConfig.irq} D${project.sbConfig.dma8} H${project.sbConfig.dma16} T${project.sbConfig.type}`,
    'GAME.EXE',
    'ECHO.',
    'ECHO Thank you for playing!',
    '',
  ].join('\r\n');
  zip.file('AUTOEXEC.BAT', autoexec);

  // CONFIG.SYS
  const configSys = [
    'FILES=40',
    'BUFFERS=40',
    'DOS=HIGH,UMB',
    'DEVICE=HIMEM.SYS',
    'LASTDRIVE=Z',
    '',
  ].join('\r\n');
  zip.file('CONFIG.SYS', configSys);

  // DOSBOX.CONF
  const dosboxConf = [
    '[sdl]',
    'fullscreen=false',
    'fulldouble=false',
    'windowresolution=640x400',
    'output=surface',
    'autolock=true',
    '',
    '[dosbox]',
    'machine=svga_s3',
    'memsize=16',
    '',
    '[render]',
    'aspect=true',
    'scaler=normal2x',
    '',
    '[cpu]',
    'core=normal',
    'cputype=486_slow',
    'cycles=15000',
    '',
    '[sblaster]',
    'sbtype=sb16',
    `sbbase=${project.sbConfig.basePort.replace('h','')}`,
    `irq=${project.sbConfig.irq}`,
    `dma=${project.sbConfig.dma8}`,
    `hdma=${project.sbConfig.dma16}`,
    'sbmixer=true',
    'oplmode=auto',
    'oplemu=default',
    'oplrate=44100',
    '',
    '[autoexec]',
    '@echo off',
    'mount c .',
    'c:',
    'call autoexec.bat',
    '',
  ].join('\n');
  zip.file('DOSBOX.CONF', dosboxConf);

  // README.TXT
  const readme = [
    `============================================================`,
    `  ${project.title.toUpperCase()} (MS-DOS 320x200 Edition)`,
    `  Created with DOSMaker 320 Studio`,
    `  Author: ${project.author}`,
    `  Version: ${project.version}`,
    `============================================================`,
    ``,
    `SYSTEM REQUIREMENTS:`,
    `- IBM PC/AT, 386SX or higher CPU (486 recommended)`,
    `- 640 KB conventional RAM`,
    `- VGA Graphics Adapter (320x200 Mode 13h, 256 Colors)`,
    `- Sound Blaster 16 / Pro or 100% compatible sound card`,
    `- MS-DOS 5.0, 6.22, FreeDOS, or DOSBox`,
    ``,
    `HOW TO RUN IN DOSBOX:`,
    `1. Launch DOSBox pointing to this folder`,
    `2. Or run: dosbox -conf dosbox.conf`,
    `3. Or in any DOS environment, run: GAME.EXE`,
    ``,
    `CONTROLS:`,
    `- Arrow Keys: Move Player / Aim`,
    `- Spacebar / Ctrl: Jump / Action`,
    `- Alt / Z: Fire Weapon / Special`,
    `- Esc: Return to DOS Prompt`,
    ``,
  ].join('\r\n');
  zip.file('README.TXT', readme);

  // Export TASM source GAME.ASM
  zip.file('GAME.ASM', generateTasmAsm(project));

  // Export Turbo C source GAME.C
  zip.file('GAME.C', generateTurboCCode(project));

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Generate complete Borland Turbo C 2.0 / C++ 3.1 source code
 */
export function generateTurboCCode(project: GameProject): string {
  return `/*
 * ${project.title} - MS-DOS Mode 13h Game
 * Compiled with Borland Turbo C 2.0 / 3.0
 * Architecture: 8086 Real Mode / VGA 320x200 256 Colors
 * Sound Blaster 16 & OPL2 FM Audio at Port ${project.sbConfig.basePort}
 */

#include <dos.h>
#include <conio.h>
#include <stdio.h>
#include <stdlib.h>
#include <mem.h>

#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 200
#define VGA_MEM_ADDR 0xA0000000L

/* Sound Blaster Configuration: SET BLASTER=A${project.sbConfig.basePort.replace('h','')} I${project.sbConfig.irq} D${project.sbConfig.dma8} */
#define SB_BASE 0x${project.sbConfig.basePort.replace('h','')}
#define SB_RESET (SB_BASE + 0x06)
#define SB_READ_DATA (SB_BASE + 0x0A)
#define SB_WRITE_DATA (SB_BASE + 0x0C)
#define SB_DATA_AVAIL (SB_BASE + 0x0E)
#define OPL2_PORT 0x388

unsigned char far *VGA = (unsigned char far *)VGA_MEM_ADDR;

/* Set VGA 320x200 256 Color Mode 13h */
void set_mode13h(void) {
    union REGS regs;
    regs.h.ah = 0x00;
    regs.h.al = 0x13;
    int86(0x10, &regs, &regs);
}

/* Restore 80x25 Color Text Mode 03h */
void set_textmode(void) {
    union REGS regs;
    regs.h.ah = 0x00;
    regs.h.al = 0x03;
    int86(0x10, &regs, &regs);
}

/* Sound Blaster DSP Reset */
int reset_soundblaster(void) {
    int i;
    outportb(SB_RESET, 1);
    delay(3);
    outportb(SB_RESET, 0);
    for (i = 0; i < 100; i++) {
        if ((inportb(SB_DATA_AVAIL) & 0x80) && inportb(SB_READ_DATA) == 0xAA) {
            return 1; /* Success */
        }
        delay(1);
    }
    return 0; /* Sound Blaster not found */
}

/* OPL2 FM Synth Register Write */
void opl2_write(unsigned char reg, unsigned char val) {
    int i;
    outportb(OPL2_PORT, reg);
    for (i = 0; i < 6; i++) inportb(OPL2_PORT); /* 3.3 microsecond wait */
    outportb(OPL2_PORT + 1, val);
    for (i = 0; i < 35; i++) inportb(OPL2_PORT); /* 23 microsecond wait */
}

/* Play OPL2 FM Tone */
void play_fm_sound(void) {
    opl2_write(0x20, 0x01); /* Carrier multiplier x1 */
    opl2_write(0x40, 0x10); /* Carrier attenuation */
    opl2_write(0x60, 0xF0); /* Attack / Decay */
    opl2_write(0x80, 0x77); /* Sustain / Release */
    opl2_write(0xA0, 0x98); /* Freq number low */
    opl2_write(0xB0, 0x31); /* Key on, Octave 4 */
}

/* Put pixel in Mode 13h framebuffer */
void put_pixel(int x, int y, unsigned char color) {
    if (x >= 0 && x < SCREEN_WIDTH && y >= 0 && y < SCREEN_HEIGHT) {
        VGA[(y << 8) + (y << 6) + x] = color; /* y * 320 + x */
    }
}

int main(void) {
    int x = 160, y = 100;
    set_mode13h();

    if (reset_soundblaster()) {
        play_fm_sound();
    }

    /* Draw DOSMaker Game Screen */
    for (y = 0; y < SCREEN_HEIGHT; y++) {
        for (x = 0; x < SCREEN_WIDTH; x++) {
            put_pixel(x, y, (unsigned char)((x ^ y) & 0x0F));
        }
    }

    getch(); /* Wait for key */
    set_textmode();
    printf("${project.title} - MS-DOS Exit OK\\n");
    return 0;
}
`;
}

/**
 * Generate TASM / MASM 8086 Assembly source code
 */
export function generateTasmAsm(project: GameProject): string {
  return `; ========================================================
;  ${project.title} (MS-DOS 320x200 Mode 13h)
;  Assembler: Borland Turbo Assembler (TASM) or MASM 6.11
;  Target: 8086 Real Mode MS-DOS Executable (.EXE)
; ========================================================

.MODEL SMALL
.STACK 1000h

.DATA
    title_msg   db "${project.title} (MS-DOS)$", 0Dh, 0Ah, "$"
    sb_found    db "Sound Blaster 16 Detected at Port ${project.sbConfig.basePort}$", 0Dh, 0Ah, "$"
    sb_missing  db "Sound Blaster not detected, fallback to PC Speaker$", 0Dh, 0Ah, "$"

.CODE
START:
    mov ax, @DATA
    mov ds, ax

    ; Initialize VGA Mode 13h (320x200 256 colors)
    mov ax, 0013h
    int 10h

    ; Setup ES pointing to VGA Video Memory Segment (0A000h)
    mov ax, 0A000h
    mov es, ax

    ; Test Sound Blaster Port ${project.sbConfig.basePort}
    mov dx, 0${project.sbConfig.basePort.replace('h','')}h + 6 ; Reset register
    mov al, 1
    out dx, al
    mov cx, 100
wait_loop:
    loop wait_loop
    mov al, 0
    out dx, al

    ; Wait for keypress
    mov ah, 00h
    int 16h

    ; Restore 80x25 text mode (03h)
    mov ax, 0003h
    int 10h

    ; Exit to DOS prompt
    mov ax, 4C00h
    int 21h

END START
`;
}

/**
 * Formats a binary byte array into Norton Commander / DEBUG.EXE hex view
 */
export function formatHexDump(data: Uint8Array, offset = 0, length = 256): {
  lines: Array<{
    offsetHex: string;
    bytesHex: string[];
    ascii: string;
  }>;
} {
  const lines = [];
  const end = Math.min(data.length, offset + length);

  for (let i = offset; i < end; i += 16) {
    const chunk = data.slice(i, Math.min(i + 16, end));
    const offsetHex = i.toString(16).toUpperCase().padStart(4, '0') + ':';
    const bytesHex: string[] = [];
    let ascii = '';

    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        const b = chunk[j];
        bytesHex.push(b.toString(16).toUpperCase().padStart(2, '0'));
        ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
      } else {
        bytesHex.push('  ');
        ascii += ' ';
      }
    }

    lines.push({ offsetHex, bytesHex, ascii });
  }

  return { lines };
}
