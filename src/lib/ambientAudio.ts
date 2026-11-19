import { AmbientSoundId } from '../types/thinklive';

export interface AmbientSoundOption {
  id: AmbientSoundId;
  label: string;
  description: string;
}

export const AMBIENT_SOUND_OPTIONS: AmbientSoundOption[] = [
  { id: 'piano', label: 'Piano instrumental', description: 'Acordes lentos em feltro suave' },
  { id: 'violao', label: 'Violão acústico', description: 'Dedilhado calmo em cordas de náilon' },
  { id: 'cordas', label: 'Cordas & violino', description: 'Harmonia lírica e sustentada' },
  { id: 'chuva_janela', label: 'Chuva na janela', description: 'Chuva abafada com gotas no vidro' },
  { id: 'chuva', label: 'Chuva suave', description: 'Garoa contínua e serena sobre folhas' },
  { id: 'biblioteca', label: 'Sons de biblioteca', description: 'Sala silenciosa, lareira baixa e papel' },
  { id: 'floresta', label: 'Sons de floresta', description: 'Brisa entre copas e cantos suaves' },
  { id: 'mar', label: 'Ondas do mar', description: 'Maré calma em vaivém contínuo' },
  { id: 'vento', label: 'Vento', description: 'Sopro macio de fim de tarde' },
  { id: 'natureza', label: 'Sons de natureza', description: 'Riacho límpido e entardecer no campo' },
];

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private activeSources: AudioScheduledSourceNode[] = [];
  private timers: number[] = [];
  private currentSound: AmbientSoundId | null = null;
  private pinkBuffer: AudioBuffer | null = null;
  private brownBuffer: AudioBuffer | null = null;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getNoiseBuffer(kind: 'pink' | 'brown'): AudioBuffer {
    const ctx = this.ensureContext();
    if (kind === 'pink' && this.pinkBuffer) return this.pinkBuffer;
    if (kind === 'brown' && this.brownBuffer) return this.brownBuffer;

    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (kind === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
        b6 = white * 0.115926;
      }
      // Crossfade edges smoothly for click-free loop
      const fade = Math.floor(ctx.sampleRate * 0.08);
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        const blended = data[i] * t + data[length - fade + i] * (1 - t);
        data[i] = blended;
      }
      this.pinkBuffer = buffer;
      return buffer;
    }

    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 2.2;
    }
    const fade = Math.floor(ctx.sampleRate * 0.08);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[i] = data[i] * t + data[length - fade + i] * (1 - t);
    }
    this.brownBuffer = buffer;
    return buffer;
  }

  private createLoopedNoise(kind: 'pink' | 'brown'): AudioBufferSourceNode {
    const ctx = this.ensureContext();
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(kind);
    src.loop = true;
    this.activeSources.push(src);
    return src;
  }

  private cleanupGraph() {
    for (const id of this.timers) {
      window.clearInterval(id);
      window.clearTimeout(id);
    }
    this.timers = [];
    for (const src of this.activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeSources = [];
    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeNodes = [];
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // ignore
      }
      this.masterGain = null;
    }
    this.currentSound = null;
  }

  public start(soundId: AmbientSoundId, volume: number) {
    this.cleanupGraph();
    const ctx = this.ensureContext();
    const master = ctx.createGain();
    const safeVol = Math.max(0, Math.min(1, volume));
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(safeVol * 0.72, ctx.currentTime + 0.45);
    master.connect(ctx.destination);
    this.masterGain = master;
    this.currentSound = soundId;

    if (soundId === 'chuva') {
      const noise = this.createLoopedNoise('pink');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1850;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 260;
      const bedGain = ctx.createGain();
      bedGain.gain.value = 0.65;
      noise.connect(hp).connect(lp).connect(bedGain).connect(master);
      noise.start();
      this.activeNodes.push(lp, hp, bedGain);

      // Gentle rain droplets
      const timer = window.setInterval(() => {
        if (!this.ctx || !this.masterGain || this.currentSound !== 'chuva') return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        const base = 900 + Math.random() * 1400;
        osc.frequency.setValueAtTime(base, t);
        osc.frequency.exponentialRampToValueAtTime(base * 0.65, t + 0.06);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.028 * Math.random() + 0.01, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
        osc.connect(g).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.08);
      }, 170);
      this.timers.push(timer);
      return;
    }

    if (soundId === 'chuva_janela') {
      const noise = this.createLoopedNoise('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 540;
      const g = ctx.createGain();
      g.gain.value = 0.85;
      noise.connect(lp).connect(g).connect(master);
      noise.start();
      this.activeNodes.push(lp, g);

      const timer = window.setInterval(() => {
        if (!this.ctx || !this.masterGain || this.currentSound !== 'chuva_janela') return;
        if (Math.random() < 0.38) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const dg = this.ctx.createGain();
        osc.type = 'triangle';
        const f = 520 + Math.random() * 680;
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.72, t + 0.045);
        dg.gain.setValueAtTime(0.0001, t);
        dg.gain.linearRampToValueAtTime(0.035, t + 0.005);
        dg.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
        osc.connect(dg).connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.06);
      }, 210);
      this.timers.push(timer);
      return;
    }

    if (soundId === 'mar') {
      const noise = this.createLoopedNoise('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 480;

      const waveGain = ctx.createGain();
      waveGain.gain.value = 0.48;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.11; // ~9s ocean wave cycle

      const lfoGainAmp = ctx.createGain();
      lfoGainAmp.gain.value = 0.34;
      lfo.connect(lfoGainAmp).connect(waveGain.gain);

      const lfoFreqAmp = ctx.createGain();
      lfoFreqAmp.gain.value = 420;
      lfo.connect(lfoFreqAmp).connect(lp.frequency);

      noise.connect(lp).connect(waveGain).connect(master);
      noise.start();
      lfo.start();
      this.activeSources.push(lfo);
      this.activeNodes.push(lp, waveGain, lfoGainAmp, lfoFreqAmp);
      return;
    }

    if (soundId === 'vento') {
      const noise = this.createLoopedNoise('pink');
      const bp1 = ctx.createBiquadFilter();
      bp1.type = 'bandpass';
      bp1.frequency.value = 410;
      bp1.Q.value = 3.2;

      const bp2 = ctx.createBiquadFilter();
      bp2.type = 'bandpass';
      bp2.frequency.value = 740;
      bp2.Q.value = 2.6;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoMod = ctx.createGain();
      lfoMod.gain.value = 180;
      lfo.connect(lfoMod).connect(bp1.frequency);

      const lfo2 = ctx.createOscillator();
      lfo2.frequency.value = 0.055;
      const lfoMod2 = ctx.createGain();
      lfoMod2.gain.value = 230;
      lfo2.connect(lfoMod2).connect(bp2.frequency);

      const g = ctx.createGain();
      g.gain.value = 0.85;
      noise.connect(bp1).connect(g).connect(master);
      noise.connect(bp2).connect(g);
      noise.start();
      lfo.start();
      lfo2.start();
      this.activeSources.push(lfo, lfo2);
      this.activeNodes.push(bp1, bp2, lfoMod, lfoMod2, g);
      return;
    }

    if (soundId === 'floresta' || soundId === 'natureza') {
      const noise = this.createLoopedNoise('pink');
      const bp = ctx.createBiquadFilter();
      bp.type = soundId === 'natureza' ? 'bandpass' : 'lowpass';
      bp.frequency.value = soundId === 'natureza' ? 1150 : 920;
      bp.Q.value = soundId === 'natureza' ? 0.9 : 0.7;

      const g = ctx.createGain();
      g.gain.value = soundId === 'natureza' ? 0.45 : 0.36;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = soundId === 'natureza' ? 0.25 : 0.14;
      const lfoMod = ctx.createGain();
      lfoMod.gain.value = 260;
      lfo.connect(lfoMod).connect(bp.frequency);

      noise.connect(bp).connect(g).connect(master);
      noise.start();
      lfo.start();
      this.activeSources.push(lfo);
      this.activeNodes.push(bp, g, lfoMod);

      // Soft forest birds / evening nature notes
      const timer = window.setInterval(() => {
        if (!this.ctx || !this.masterGain) return;
        if (this.currentSound !== 'floresta' && this.currentSound !== 'natureza') return;
        if (Math.random() > 0.6) return;
        const t = this.ctx.currentTime;
        const notes = [1950, 2340, 2630, 1760];
        const count = Math.random() > 0.5 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const offset = i * 0.14;
          const osc = this.ctx.createOscillator();
          const cg = this.ctx.createGain();
          osc.type = 'sine';
          const base = notes[Math.floor(Math.random() * notes.length)];
          osc.frequency.setValueAtTime(base, t + offset);
          osc.frequency.exponentialRampToValueAtTime(base * 1.18, t + offset + 0.05);
          osc.frequency.exponentialRampToValueAtTime(base * 0.96, t + offset + 0.11);
          cg.gain.setValueAtTime(0.0001, t + offset);
          cg.gain.linearRampToValueAtTime(0.025, t + offset + 0.02);
          cg.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.12);
          osc.connect(cg).connect(this.masterGain);
          osc.start(t + offset);
          osc.stop(t + offset + 0.13);
        }
      }, 2400);
      this.timers.push(timer);
      return;
    }

    if (soundId === 'biblioteca') {
      // Warm cozy wooden library room tone + subtle fireplace warmth + occasional soft page turn
      const brown = this.createLoopedNoise('brown');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 260;
      const warmGain = ctx.createGain();
      warmGain.gain.value = 0.42;
      brown.connect(lp).connect(warmGain).connect(master);
      brown.start();
      this.activeNodes.push(lp, warmGain);

      const timer = window.setInterval(() => {
        if (!this.ctx || !this.masterGain || this.currentSound !== 'biblioteca') return;
        const t = this.ctx.currentTime;
        if (Math.random() < 0.75) {
          // Faint cozy hearth crackle
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(160 + Math.random() * 420, t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.016, t + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
          osc.connect(g).connect(this.masterGain);
          osc.start(t);
          osc.stop(t + 0.035);
        } else {
          // Gentle soft page rustle
          const pink = this.ctx.createBufferSource();
          pink.buffer = this.getNoiseBuffer('pink');
          const bp = this.ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = 1800;
          bp.Q.value = 1.6;
          const pg = this.ctx.createGain();
          pg.gain.setValueAtTime(0.0001, t);
          pg.gain.linearRampToValueAtTime(0.035, t + 0.07);
          pg.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
          pink.connect(bp).connect(pg).connect(this.masterGain);
          pink.start(t, Math.random() * 2, 0.3);
        }
      }, 650);
      this.timers.push(timer);
      return;
    }

    if (soundId === 'piano') {
      // Soft felt-piano autumn chords (Fmaj7 - Dm9 - Bbmaj7 - C6)
      const progressions = [
        [174.61, 261.63, 329.63, 440.0], // Fmaj7
        [146.83, 220.0, 293.66, 329.63], // Dm9
        [116.54, 233.08, 293.66, 349.23], // Bbmaj7
        [130.81, 261.63, 329.63, 440.0], // C6
      ];
      let step = 0;

      const playChord = () => {
        if (!this.ctx || !this.masterGain || this.currentSound !== 'piano') return;
        const chord = progressions[step % progressions.length];
        step++;
        const now = this.ctx.currentTime;

        chord.forEach((freq, idx) => {
          if (!this.ctx || !this.masterGain) return;
          const t = now + idx * 0.24;
          const osc = this.ctx.createOscillator();
          const sub = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const noteGain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          sub.type = 'sine';
          sub.frequency.setValueAtTime(freq * 2, t);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(980, t);
          filter.frequency.exponentialRampToValueAtTime(340, t + 3.2);

          const subGain = this.ctx.createGain();
          subGain.gain.value = 0.16;

          noteGain.gain.setValueAtTime(0.0001, t);
          noteGain.gain.linearRampToValueAtTime(0.11, t + 0.045);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);

          osc.connect(filter);
          sub.connect(subGain).connect(filter);
          filter.connect(noteGain).connect(this.masterGain);

          osc.start(t);
          sub.start(t);
          osc.stop(t + 3.5);
          sub.stop(t + 3.5);
        });
      };

      playChord();
      const timer = window.setInterval(playChord, 3800);
      this.timers.push(timer);
      return;
    }

    if (soundId === 'violao') {
      // Gentle plucked nylon guitar arpeggios (Dmaj7 - Bm7 - Gmaj7 - A6)
      const arpeggios = [
        [146.83, 220.0, 277.18, 369.99, 277.18, 220.0], // Dmaj7
        [123.47, 196.0, 246.94, 329.63, 246.94, 196.0], // Bm7
        [98.0, 196.0, 246.94, 369.99, 246.94, 196.0],   // Gmaj7
        [110.0, 220.0, 277.18, 369.99, 277.18, 220.0],  // A6
      ];
      let bar = 0;

      const playArpeggio = () => {
        if (!this.ctx || !this.masterGain || this.currentSound !== 'violao') return;
        const notes = arpeggios[bar % arpeggios.length];
        bar++;
        const now = this.ctx.currentTime;

        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.masterGain) return;
          const t = now + idx * 0.42;
          const osc = this.ctx.createOscillator();
          const harm = this.ctx.createOscillator();
          const lp = this.ctx.createBiquadFilter();
          const g = this.ctx.createGain();
          const hg = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          harm.type = 'sine';
          harm.frequency.setValueAtTime(freq * 2, t);

          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(1400, t);
          lp.frequency.exponentialRampToValueAtTime(380, t + 1.8);

          hg.gain.value = 0.22;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.13, t + 0.018);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);

          osc.connect(lp);
          harm.connect(hg).connect(lp);
          lp.connect(g).connect(this.masterGain);

          osc.start(t);
          harm.start(t);
          osc.stop(t + 2.2);
          harm.stop(t + 2.2);
        });
      };

      playArpeggio();
      const timer = window.setInterval(playArpeggio, 2650);
      this.timers.push(timer);
      return;
    }

    if (soundId === 'cordas') {
      // Warm sustained lyrical string swells (Am7 - Fmaj7 - Cmaj7 - Em7)
      const swells = [
        [110.0, 220.0, 261.63, 392.0],  // Am7
        [87.31, 174.61, 261.63, 329.63], // Fmaj7
        [130.81, 196.0, 246.94, 329.63], // Cmaj7
        [164.81, 246.94, 293.66, 392.0], // Em7
      ];
      let idx = 0;

      const playSwell = () => {
        if (!this.ctx || !this.masterGain || this.currentSound !== 'cordas') return;
        const chord = swells[idx % swells.length];
        idx++;
        const now = this.ctx.currentTime;

        chord.forEach((freq) => {
          if (!this.ctx || !this.masterGain) return;
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const lp = this.ctx.createBiquadFilter();
          const g = this.ctx.createGain();

          osc1.type = 'sawtooth';
          osc1.frequency.setValueAtTime(freq, now);
          osc2.type = 'sawtooth';
          osc2.frequency.setValueAtTime(freq * 1.004, now); // gentle chorus detune

          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(420, now);
          lp.frequency.linearRampToValueAtTime(920, now + 2.1);
          lp.frequency.linearRampToValueAtTime(380, now + 4.4);

          g.gain.setValueAtTime(0.0001, now);
          g.gain.linearRampToValueAtTime(0.048, now + 1.4);
          g.gain.linearRampToValueAtTime(0.036, now + 3.0);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

          osc1.connect(lp);
          osc2.connect(lp);
          lp.connect(g).connect(this.masterGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 4.6);
          osc2.stop(now + 4.6);
        });
      };

      playSwell();
      const timer = window.setInterval(playSwell, 4200);
      this.timers.push(timer);
    }
  }

  public setVolume(volume: number) {
    if (!this.ctx || !this.masterGain) return;
    const safeVol = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.setTargetAtTime(safeVol * 0.72, this.ctx.currentTime, 0.08);
  }

  public stop() {
    this.cleanupGraph();
  }
}

export const ambientAudioEngine = new AmbientAudioEngine();
