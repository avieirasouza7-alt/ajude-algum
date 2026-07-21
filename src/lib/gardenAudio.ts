/**
 * Garden audio: soft procedural pad + care chimes.
 * HTML track playback is preferred when Lovable CDN assets resolve;
 * otherwise this pad keeps music working locally.
 */

type OscHandle = { osc: OscillatorNode; gain: GainNode; lfo?: OscillatorNode; lfoGain?: GainNode };

export class GardenAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private padNodes: OscHandle[] = [];
  private musicPlaying = false;
  private volume = 0.6;

  private ensure() {
    if (this.ctx) return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.55;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
  }

  private async unlock() {
    this.ensure();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
  }

  /** Libera o AudioContext no mesmo gesto do clique (obrigatório no Chrome/Safari). */
  async unlockFromGesture() {
    await this.unlock();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    if (this.musicPlaying) {
      this.master.gain.linearRampToValueAtTime(0.42 * this.volume, t + 0.25);
    }
  }

  /** Soft garden pad — warm open fifths, never stacks. */
  async startMusic() {
    await this.unlock();
    if (!this.ctx || !this.master || !this.musicGain) return;
    if (this.musicPlaying) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(0.42 * this.volume, t + 0.4);
      return;
    }

    this.stopPadNodes();
    this.musicPlaying = true;

    // C major-ish warm pad: C3, G3, E4, A4
    const voices: { f: number; type: OscillatorType; amp: number; lfo: number }[] = [
      { f: 130.81, type: "sine", amp: 0.09, lfo: 0.03 },
      { f: 196.0, type: "sine", amp: 0.07, lfo: 0.04 },
      { f: 329.63, type: "triangle", amp: 0.035, lfo: 0.05 },
      { f: 440.0, type: "sine", amp: 0.025, lfo: 0.06 },
    ];

    voices.forEach((v) => {
      const osc = this.ctx!.createOscillator();
      osc.type = v.type;
      osc.frequency.value = v.f;
      const gain = this.ctx!.createGain();
      gain.gain.value = v.amp;

      const lfo = this.ctx!.createOscillator();
      lfo.frequency.value = v.lfo;
      const lfoGain = this.ctx!.createGain();
      lfoGain.gain.value = v.amp * 0.35;
      lfo.connect(lfoGain).connect(gain.gain);

      osc.connect(gain).connect(this.musicGain!);
      osc.start();
      lfo.start();
      this.padNodes.push({ osc, gain, lfo, lfoGain });
    });

    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), t);
    this.master.gain.linearRampToValueAtTime(0.42 * this.volume, t + 0.8);
  }

  async stopMusic() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(0.0001, t + 0.45);
    this.musicPlaying = false;
    window.setTimeout(() => this.stopPadNodes(), 500);
  }

  private stopPadNodes() {
    for (const n of this.padNodes) {
      try {
        n.osc.stop();
        n.lfo?.stop();
      } catch {
        /* already stopped */
      }
      try {
        n.osc.disconnect();
        n.gain.disconnect();
        n.lfo?.disconnect();
        n.lfoGain?.disconnect();
      } catch {
        /* noop */
      }
    }
    this.padNodes = [];
  }

  /** Toque suave de interface — uma "gotinha" musical para cada ação do jogador. */
  async uiClick() {
    await this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    if (!this.musicPlaying && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(0.42 * this.volume, t + 0.03);
      window.setTimeout(() => {
        if (!this.musicPlaying && this.ctx && this.master) {
          const t2 = this.ctx.currentTime;
          this.master.gain.linearRampToValueAtTime(0.0001, t2 + 0.6);
        }
      }, 500);
    }

    const now = this.ctx.currentTime;
    /* Gota principal: desliza levemente para baixo, como pingo na água. */
    const drop = this.ctx.createOscillator();
    const dropGain = this.ctx.createGain();
    drop.type = "sine";
    drop.frequency.setValueAtTime(987.77, now);
    drop.frequency.exponentialRampToValueAtTime(740, now + 0.16);
    dropGain.gain.setValueAtTime(0.0001, now);
    dropGain.gain.linearRampToValueAtTime(0.075 * this.volume, now + 0.012);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    drop.connect(dropGain).connect(this.sfxGain);
    drop.start(now);
    drop.stop(now + 0.32);

    /* Brilho curto uma oitava acima, bem discreto. */
    const spark = this.ctx.createOscillator();
    const sparkGain = this.ctx.createGain();
    spark.type = "triangle";
    spark.frequency.value = 1975.5;
    sparkGain.gain.setValueAtTime(0.0001, now + 0.015);
    sparkGain.gain.linearRampToValueAtTime(0.02 * this.volume, now + 0.03);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    spark.connect(sparkGain).connect(this.sfxGain);
    spark.start(now + 0.015);
    spark.stop(now + 0.2);
  }

  /** Ruído branco cacheado para splashes, farfalhadas e whooshes. */
  private noiseBuf?: AudioBuffer;

  private noise(): AudioBuffer {
    if (this.noiseBuf) return this.noiseBuf;
    const len = this.ctx!.sampleRate;
    const buf = this.ctx!.createBuffer(1, len, this.ctx!.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  /** Rajada de ruído filtrado (splash, snip, whoosh, farfalhada). */
  private playNoise(opts: {
    t0: number;
    dur: number;
    filter: BiquadFilterType;
    freq: number;
    freqEnd?: number;
    q?: number;
    gain: number;
  }) {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noise();
    const filter = this.ctx!.createBiquadFilter();
    filter.type = opts.filter;
    filter.frequency.setValueAtTime(opts.freq, opts.t0);
    if (opts.freqEnd)
      filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, opts.t0 + opts.dur);
    filter.Q.value = opts.q ?? 1;
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, opts.t0);
    g.gain.linearRampToValueAtTime(opts.gain * this.volume, opts.t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, opts.t0 + opts.dur);
    src.connect(filter).connect(g).connect(this.sfxGain!);
    src.start(opts.t0);
    src.stop(opts.t0 + opts.dur + 0.05);
  }

  /** Nota simples com envelope e glide opcional. */
  private playTone(opts: {
    t0: number;
    f: number;
    fEnd?: number;
    dur: number;
    type?: OscillatorType;
    gain: number;
  }) {
    const o = this.ctx!.createOscillator();
    o.type = opts.type ?? "sine";
    o.frequency.setValueAtTime(opts.f, opts.t0);
    if (opts.fEnd) o.frequency.exponentialRampToValueAtTime(opts.fEnd, opts.t0 + opts.dur);
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, opts.t0);
    g.gain.linearRampToValueAtTime(opts.gain * this.volume, opts.t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, opts.t0 + opts.dur);
    o.connect(g).connect(this.sfxGain!);
    o.start(opts.t0);
    o.stop(opts.t0 + opts.dur + 0.05);
  }

  async chime(kind: string) {
    await this.unlock();
    if (!this.ctx || !this.sfxGain) return;
    // Ensure master audible for SFX even if music was faded
    if (!this.musicPlaying && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(0.42 * this.volume, t + 0.05);
      window.setTimeout(() => {
        if (!this.musicPlaying && this.ctx && this.master) {
          const t2 = this.ctx.currentTime;
          this.master.gain.linearRampToValueAtTime(0.0001, t2 + 0.8);
        }
      }, 900);
    }

    const now = this.ctx.currentTime;

    switch (kind) {
      case "water": {
        /* Regar: splash molhado + pingos caindo (grave → agudo). */
        this.playNoise({
          t0: now,
          dur: 0.42,
          filter: "lowpass",
          freq: 2400,
          freqEnd: 480,
          q: 0.7,
          gain: 0.28,
        });
        this.playNoise({
          t0: now + 0.04,
          dur: 0.28,
          filter: "bandpass",
          freq: 1600,
          freqEnd: 700,
          q: 1.1,
          gain: 0.18,
        });
        [980, 820, 690, 560].forEach((f, i) => {
          this.playTone({
            t0: now + 0.06 + i * 0.1,
            f,
            fEnd: f * 0.68,
            dur: 0.26,
            gain: 0.14,
          });
        });
        this.playTone({ t0: now + 0.48, f: 523.25, dur: 0.55, gain: 0.1 });
        break;
      }
      case "prune": {
        /* Podar: dois cortes metálicos de tesoura + acorde leve. */
        [0, 0.14, 0.28].forEach((d, i) => {
          this.playNoise({
            t0: now + d,
            dur: 0.08,
            filter: "highpass",
            freq: 2800 + i * 200,
            q: 2.4,
            gain: 0.26,
          });
          this.playTone({
            t0: now + d,
            f: 2400 - i * 180,
            fEnd: 1100,
            dur: 0.07,
            type: "square",
            gain: 0.055,
          });
        });
        this.playTone({ t0: now + 0.4, f: 659.25, dur: 0.45, gain: 0.12 });
        this.playTone({ t0: now + 0.5, f: 987.77, dur: 0.5, gain: 0.09 });
        break;
      }
      case "fertilizer": {
        /* Adubar: baque de terra + granulos + acorde quente de crescimento. */
        this.playTone({ t0: now, f: 95, fEnd: 48, dur: 0.35, type: "triangle", gain: 0.28 });
        this.playNoise({
          t0: now,
          dur: 0.22,
          filter: "lowpass",
          freq: 400,
          freqEnd: 180,
          q: 0.8,
          gain: 0.22,
        });
        for (let i = 0; i < 7; i++) {
          this.playNoise({
            t0: now + 0.06 + i * 0.045,
            dur: 0.07,
            filter: "bandpass",
            freq: 700 + i * 220,
            q: 3.2,
            gain: 0.08,
          });
        }
        this.playTone({ t0: now + 0.32, f: 349.23, dur: 0.6, gain: 0.12 });
        this.playTone({ t0: now + 0.4, f: 440, dur: 0.6, gain: 0.1 });
        this.playTone({ t0: now + 0.48, f: 523.25, dur: 0.65, gain: 0.08 });
        break;
      }
      case "clean": {
        /* Limpar: varredura whoosh + brilhos de folhas limpas. */
        this.playNoise({
          t0: now,
          dur: 0.48,
          filter: "bandpass",
          freq: 420,
          freqEnd: 3800,
          q: 1.2,
          gain: 0.24,
        });
        this.playNoise({
          t0: now + 0.12,
          dur: 0.3,
          filter: "highpass",
          freq: 1800,
          freqEnd: 4200,
          q: 1.6,
          gain: 0.12,
        });
        [1174.7, 1396.9, 1760, 2093].forEach((f, i) => {
          this.playTone({
            t0: now + 0.2 + i * 0.08,
            f,
            dur: 0.32,
            type: "triangle",
            gain: 0.09,
          });
        });
        break;
      }
      case "pest": {
        /* Remover pragas: zumbido fugindo + “poof” + arpejo de vitória. */
        const buzz = this.ctx.createOscillator();
        const buzzGain = this.ctx.createGain();
        buzz.type = "sawtooth";
        buzz.frequency.setValueAtTime(380, now);
        buzz.frequency.exponentialRampToValueAtTime(90, now + 0.48);
        const trem = this.ctx.createOscillator();
        const tremGain = this.ctx.createGain();
        trem.frequency.value = 32;
        tremGain.gain.value = 0.055 * this.volume;
        trem.connect(tremGain).connect(buzzGain.gain);
        buzzGain.gain.setValueAtTime(0.09 * this.volume, now);
        buzzGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        buzz.connect(buzzGain).connect(this.sfxGain);
        buzz.start(now);
        buzz.stop(now + 0.52);
        trem.start(now);
        trem.stop(now + 0.52);
        this.playNoise({
          t0: now + 0.35,
          dur: 0.18,
          filter: "bandpass",
          freq: 1200,
          freqEnd: 400,
          q: 1.5,
          gain: 0.2,
        });
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.playTone({ t0: now + 0.48 + i * 0.085, f, dur: 0.42, gain: 0.13 });
        });
        break;
      }
      default: {
        /* Eventos raros e afins: arpejo brilhante original. */
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.playTone({ t0: now + i * 0.09, f, dur: 0.7, gain: 0.11 });
        });
      }
    }
  }

  dispose() {
    this.musicPlaying = false;
    this.stopPadNodes();
    if (this.ctx) {
      try {
        this.master?.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {
        /* noop */
      }
      void this.ctx.close().catch(() => {});
    }
    this.ctx = undefined;
    this.master = undefined;
    this.musicGain = undefined;
    this.sfxGain = undefined;
    this.noiseBuf = undefined;
  }
}
