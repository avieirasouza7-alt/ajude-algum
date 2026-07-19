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

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    if (this.musicPlaying) {
      this.master.gain.linearRampToValueAtTime(0.28 * this.volume, t + 0.25);
    }
  }

  /** Soft garden pad — warm open fifths, never stacks. */
  async startMusic() {
    await this.unlock();
    if (!this.ctx || !this.master || !this.musicGain) return;
    if (this.musicPlaying) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(0.28 * this.volume, t + 0.4);
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
    this.master.gain.linearRampToValueAtTime(0.28 * this.volume, t + 1.2);
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
      this.master.gain.linearRampToValueAtTime(0.28 * this.volume, t + 0.03);
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
    if (opts.freqEnd) filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, opts.t0 + opts.dur);
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
      this.master.gain.linearRampToValueAtTime(0.28 * this.volume, t + 0.05);
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
        /* Splash de água + pingos caindo em sequência. */
        this.playNoise({ t0: now, dur: 0.35, filter: "bandpass", freq: 1800, freqEnd: 600, q: 0.9, gain: 0.14 });
        [880, 740, 620].forEach((f, i) => {
          this.playTone({ t0: now + 0.08 + i * 0.11, f, fEnd: f * 0.72, dur: 0.22, gain: 0.09 });
        });
        this.playTone({ t0: now + 0.42, f: 523.25, dur: 0.5, gain: 0.06 });
        break;
      }
      case "prune": {
        /* Dois "snips" de tesoura + notinha de alívio. */
        [0, 0.16].forEach((d) => {
          this.playNoise({ t0: now + d, dur: 0.07, filter: "highpass", freq: 2600, q: 2, gain: 0.16 });
          this.playTone({ t0: now + d, f: 2200, fEnd: 1400, dur: 0.06, type: "square", gain: 0.03 });
        });
        this.playTone({ t0: now + 0.34, f: 659.25, dur: 0.4, gain: 0.08 });
        this.playTone({ t0: now + 0.44, f: 987.77, dur: 0.45, gain: 0.06 });
        break;
      }
      case "fertilizer": {
        /* Baque suave de terra + farfalhada granular + acorde quente. */
        this.playTone({ t0: now, f: 110, fEnd: 55, dur: 0.28, gain: 0.18 });
        for (let i = 0; i < 5; i++) {
          this.playNoise({
            t0: now + 0.05 + i * 0.05,
            dur: 0.06,
            filter: "bandpass",
            freq: 900 + i * 250,
            q: 3,
            gain: 0.05,
          });
        }
        this.playTone({ t0: now + 0.3, f: 392, dur: 0.55, gain: 0.07 });
        this.playTone({ t0: now + 0.38, f: 587.33, dur: 0.55, gain: 0.05 });
        break;
      }
      case "clean": {
        /* Whoosh de varrida subindo + brilhinhos. */
        this.playNoise({ t0: now, dur: 0.4, filter: "bandpass", freq: 500, freqEnd: 3200, q: 1.4, gain: 0.12 });
        [1318.5, 1567.98, 2093].forEach((f, i) => {
          this.playTone({ t0: now + 0.22 + i * 0.09, f, dur: 0.3, type: "triangle", gain: 0.05 });
        });
        break;
      }
      case "pest": {
        /* Zumbido de inseto fugindo (desce e some) + arpejo de vitória. */
        const buzz = this.ctx.createOscillator();
        const buzzGain = this.ctx.createGain();
        buzz.type = "sawtooth";
        buzz.frequency.setValueAtTime(340, now);
        buzz.frequency.exponentialRampToValueAtTime(120, now + 0.4);
        const trem = this.ctx.createOscillator();
        const tremGain = this.ctx.createGain();
        trem.frequency.value = 28;
        tremGain.gain.value = 0.035 * this.volume;
        trem.connect(tremGain).connect(buzzGain.gain);
        buzzGain.gain.setValueAtTime(0.05 * this.volume, now);
        buzzGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
        buzz.connect(buzzGain).connect(this.sfxGain);
        buzz.start(now);
        buzz.stop(now + 0.45);
        trem.start(now);
        trem.stop(now + 0.45);
        [523.25, 659.25, 880].forEach((f, i) => {
          this.playTone({ t0: now + 0.42 + i * 0.09, f, dur: 0.4, gain: 0.09 });
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
    this.stopPadNodes();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
    }
    this.ctx = undefined;
    this.master = undefined;
    this.musicGain = undefined;
    this.sfxGain = undefined;
    this.noiseBuf = undefined;
    this.musicPlaying = false;
  }
}
