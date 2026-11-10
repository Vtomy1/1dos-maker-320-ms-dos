import { SoundPreset, SoundBlasterConfig } from '../types/dos';

/**
 * Sound Blaster 16 & OPL2 (Yamaha YM3812) FM Synth Audio Engine
 * Uses Web Audio API to authentically simulate FM synthesis and 8-bit DSP PCM
 */
class SoundBlasterEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isOplActive = false;
  private bgmTimeout: number | null = null;
  private bgmPlaying = false;
  private currentBgmNoteIndex = 0;

  // Active status registers for UI monitor
  public status = {
    dspBusy: false,
    dspLastCmd: '0x00',
    oplVoicesActive: 0,
    sampleRate: 22050,
    dmaTransfers: 0,
    irqFired: false,
  };

  public init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public setMasterVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(100, vol)) / 100;
      this.masterGain.gain.setValueAtTime(clamped * 0.4, this.ctx.currentTime);
    }
  }

  /**
   * Play an authentic 2-Operator OPL2 FM Synthesizer sound
   */
  public playOpl2FM(preset: SoundPreset, freqOverride?: number) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    this.status.oplVoicesActive++;
    this.status.dspLastCmd = '0x14 (DMA 8-bit DAC)';
    this.status.irqFired = true;
    setTimeout(() => { this.status.irqFired = false; }, 80);

    const now = this.ctx.currentTime;
    const duration = preset.duration || 0.3;

    // Carrier & Modulator frequencies
    const baseFreq = freqOverride || preset.carrierFreq || 440;
    const modFreq = preset.modulatorFreq || baseFreq * 2;
    const modDepth = preset.modulationIndex ? preset.modulationIndex * 400 : 300;

    // Modulator Oscillator (Modulates Carrier frequency)
    const modulator = this.ctx.createOscillator();
    modulator.type = preset.modulatorWave || 'sine';
    modulator.frequency.setValueAtTime(modFreq, now);

    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(modDepth, now);

    if (preset.pitchDecay) {
      modGain.gain.exponentialRampToValueAtTime(1, now + duration);
    }

    // Carrier Oscillator
    const carrier = this.ctx.createOscillator();
    carrier.type = preset.carrierWave || 'sawtooth';
    carrier.frequency.setValueAtTime(baseFreq, now);

    if (preset.pitchDecay) {
      carrier.frequency.exponentialRampToValueAtTime(Math.max(20, baseFreq * 0.2), now + duration);
    }

    // Connect Modulator -> Carrier Frequency
    modulator.connect(modGain);
    modGain.connect(carrier.frequency);

    // Envelope Generator (ADSR)
    const envGain = this.ctx.createGain();
    const attack = preset.attack || 0.01;
    const decay = preset.decay || 0.1;
    const sustain = preset.sustain !== undefined ? preset.sustain : 0.4;
    const release = preset.release || 0.1;

    envGain.gain.setValueAtTime(0.0001, now);
    envGain.gain.linearRampToValueAtTime(0.5, now + attack);
    envGain.gain.exponentialRampToValueAtTime(Math.max(0.001, sustain * 0.5), now + attack + decay);
    envGain.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

    // Optional 8-bit Noise Mix (Classic Sound Blaster percussion/explosion)
    if (preset.noiseMix && preset.noiseMix > 0) {
      const bufferSize = this.ctx.sampleRate * duration;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Bitcrush / 8-bit quantized noise
        const raw = Math.random() * 2 - 1;
        output[i] = Math.round(raw * 16) / 16;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(preset.noiseMix * 0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      whiteNoise.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      whiteNoise.start(now);
      whiteNoise.stop(now + duration);
    }

    carrier.connect(envGain);
    envGain.connect(this.masterGain);

    modulator.start(now);
    carrier.start(now);

    const stopTime = now + duration + release;
    modulator.stop(stopTime);
    carrier.stop(stopTime);

    setTimeout(() => {
      this.status.oplVoicesActive = Math.max(0, this.status.oplVoicesActive - 1);
    }, (duration + release) * 1000);
  }

  /**
   * Sound Blaster DSP 8-bit PCM Sample Generator
   * Generates authentic 8-bit stepped, quantized PCM waveform
   */
  public playDspPcm(type: 'jump' | 'coin' | 'explosion' | 'laser' | 'hit' | 'win') {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    this.status.dspBusy = true;
    this.status.dmaTransfers++;
    this.status.dspLastCmd = '0x40 (Set Time Constant)';

    const sampleRate = 11025; // Authentic early Sound Blaster sample rate
    const now = this.ctx.currentTime;
    let duration = 0.2;

    if (type === 'explosion') duration = 0.45;
    if (type === 'win') duration = 0.6;

    const numSamples = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let val = 0;

      if (type === 'jump') {
        // Frequency sweep 180Hz -> 540Hz
        const f = 180 + 360 * (i / numSamples);
        val = Math.sin(2 * Math.PI * f * t);
      } else if (type === 'coin') {
        // High dual pitch 987Hz -> 1318Hz
        const f = i < numSamples * 0.4 ? 987 : 1318;
        val = Math.sin(2 * Math.PI * f * t) * 0.8;
      } else if (type === 'laser') {
        // Fast downward chirping FM
        const f = 1200 * Math.exp(-t * 12);
        val = Math.sin(2 * Math.PI * f * t);
      } else if (type === 'explosion') {
        // Quantized 8-bit noise with bass decay
        const noise = (Math.random() * 2 - 1);
        const sub = Math.sin(2 * Math.PI * 65 * t);
        const decay = Math.exp(-t * 6);
        val = (noise * 0.7 + sub * 0.3) * decay;
      } else if (type === 'hit') {
        // Punchy low distortion hit
        const f = 140 * Math.exp(-t * 18);
        val = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 10);
      } else if (type === 'win') {
        // Arpeggiated fanfare
        const note = Math.floor(t * 8) % 4;
        const notes = [523.25, 659.25, 783.99, 1046.5];
        val = Math.sin(2 * Math.PI * notes[note] * t) * (1 - t / duration);
      }

      // Quantize to 8-bit resolution (256 discrete amplitude steps: -128 to 127)
      const quantized = Math.round(val * 127) / 128;
      data[i] = quantized;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    source.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.onended = () => {
      this.status.dspBusy = false;
    };
  }

  /**
   * Sound Blaster OPL2 Background Music Player
   * Plays iconic Apogee/Id Software style DOS chip music sequences
   */
  public playBgm(theme: 'keen' | 'dungeon' | 'cyber') {
    this.stopBgm();
    this.init();
    this.bgmPlaying = true;
    this.currentBgmNoteIndex = 0;

    // DOS Chiptune note patterns
    const keenTheme = [
      { note: 261.63, dur: 0.15 }, // C4
      { note: 329.63, dur: 0.15 }, // E4
      { note: 392.00, dur: 0.15 }, // G4
      { note: 523.25, dur: 0.30 }, // C5
      { note: 392.00, dur: 0.15 }, // G4
      { note: 523.25, dur: 0.30 }, // C5
      { note: 0,      dur: 0.10 }, // Rest
      { note: 349.23, dur: 0.15 }, // F4
      { note: 440.00, dur: 0.15 }, // A4
      { note: 523.25, dur: 0.15 }, // C5
      { note: 587.33, dur: 0.30 }, // D5
      { note: 392.00, dur: 0.30 }, // G4
    ];

    const dungeonTheme = [
      { note: 146.83, dur: 0.25 }, // D3
      { note: 174.61, dur: 0.25 }, // F3
      { note: 220.00, dur: 0.25 }, // A3
      { note: 207.65, dur: 0.25 }, // G#3
      { note: 146.83, dur: 0.25 }, // D3
      { note: 164.81, dur: 0.25 }, // E3
      { note: 174.61, dur: 0.50 }, // F3
      { note: 130.81, dur: 0.25 }, // C3
      { note: 164.81, dur: 0.25 }, // E3
      { note: 196.00, dur: 0.50 }, // G3
    ];

    const cyberTheme = [
      { note: 110.00, dur: 0.12 }, // A2
      { note: 110.00, dur: 0.12 },
      { note: 220.00, dur: 0.12 }, // A3
      { note: 110.00, dur: 0.12 },
      { note: 261.63, dur: 0.12 }, // C4
      { note: 246.94, dur: 0.12 }, // B3
      { note: 110.00, dur: 0.12 },
      { note: 329.63, dur: 0.24 }, // E4
    ];

    const song = theme === 'keen' ? keenTheme : theme === 'dungeon' ? dungeonTheme : cyberTheme;

    const playNext = () => {
      if (!this.bgmPlaying) return;
      const item = song[this.currentBgmNoteIndex % song.length];
      this.currentBgmNoteIndex++;

      if (item.note > 0) {
        this.playOpl2FM({
          id: 'bgm-note',
          name: 'BGM Synth Note',
          type: 'music',
          category: 'theme',
          synthType: 'opl2_fm',
          carrierWave: 'square',
          modulatorWave: 'sine',
          carrierFreq: item.note,
          modulatorFreq: item.note * 2.01,
          modulationIndex: 1.2,
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 0.05,
          duration: item.dur * 0.9,
        }, item.note);
      }

      this.bgmTimeout = window.setTimeout(playNext, item.dur * 1000);
    };

    playNext();
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimeout !== null) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
  }

  public isBgmActive(): boolean {
    return this.bgmPlaying;
  }
}

export const soundBlaster = new SoundBlasterEngine();

/**
 * Built-in Sound Blaster Sound Presets
 */
export const DEFAULT_SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'sb_jump',
    name: 'Keen Pogo Jump',
    type: 'sfx',
    category: 'jump',
    synthType: 'opl2_fm',
    carrierWave: 'sine',
    modulatorWave: 'sine',
    carrierFreq: 240,
    modulatorFreq: 480,
    modulationIndex: 1.8,
    attack: 0.01,
    decay: 0.12,
    sustain: 0.1,
    release: 0.08,
    pitchDecay: 1.5,
    duration: 0.18,
  },
  {
    id: 'sb_coin',
    name: 'VGA Gem / Coin',
    type: 'sfx',
    category: 'coin',
    synthType: 'opl2_fm',
    carrierWave: 'sine',
    modulatorWave: 'sine',
    carrierFreq: 987,
    modulatorFreq: 1974,
    modulationIndex: 1.4,
    attack: 0.01,
    decay: 0.15,
    sustain: 0.2,
    release: 0.05,
    duration: 0.15,
  },
  {
    id: 'sb_laser',
    name: 'Ray Gun Laser',
    type: 'sfx',
    category: 'laser',
    synthType: 'opl2_fm',
    carrierWave: 'sawtooth',
    modulatorWave: 'square',
    carrierFreq: 950,
    modulatorFreq: 300,
    modulationIndex: 3.5,
    attack: 0.005,
    decay: 0.18,
    sustain: 0.05,
    release: 0.05,
    pitchDecay: 2.0,
    duration: 0.2,
  },
  {
    id: 'sb_explosion',
    name: '8-bit DSP Explosion',
    type: 'sfx',
    category: 'explosion',
    synthType: 'dsp_pcm',
    carrierWave: 'triangle',
    modulatorWave: 'square',
    carrierFreq: 80,
    modulatorFreq: 120,
    modulationIndex: 4.0,
    attack: 0.01,
    decay: 0.35,
    sustain: 0.05,
    release: 0.15,
    noiseMix: 0.7,
    duration: 0.45,
  },
  {
    id: 'sb_hit',
    name: 'Player Hurt / Thud',
    type: 'sfx',
    category: 'hit',
    synthType: 'opl2_fm',
    carrierWave: 'sawtooth',
    modulatorWave: 'sine',
    carrierFreq: 130,
    modulatorFreq: 80,
    modulationIndex: 2.5,
    attack: 0.01,
    decay: 0.15,
    sustain: 0.1,
    release: 0.05,
    duration: 0.18,
  },
  {
    id: 'sb_powerup',
    name: 'OPL2 Fanfare Powerup',
    type: 'sfx',
    category: 'powerup',
    synthType: 'opl2_fm',
    carrierWave: 'square',
    modulatorWave: 'sine',
    carrierFreq: 587.33,
    modulatorFreq: 1174.66,
    modulationIndex: 2.0,
    attack: 0.02,
    decay: 0.25,
    sustain: 0.3,
    release: 0.1,
    duration: 0.35,
  },
];

export const DEFAULT_SB_CONFIG: SoundBlasterConfig = {
  basePort: '220h',
  irq: 7,
  dma8: 1,
  dma16: 5,
  type: 6, // SB16
  oplEnabled: true,
  dspSampleRate: 22050,
  masterVolume: 75,
};
