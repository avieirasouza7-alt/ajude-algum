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

    const map: Record<string, number[]> = {
      water: [523.25, 659.25, 783.99],
      prune: [659.25, 830.61, 987.77],
      fertilizer: [392, 493.88, 587.33],
      clean: [587.33, 739.99, 880],
      pest: [440, 554.37, 659.25, 880],
      event: [523.25, 659.25, 783.99, 1046.5],
    };
    const notes = map[kind] || map.water;
    const now = this.ctx.currentTime;
    notes.forEach((f, i) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t0 = now + i * 0.09;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.11 * this.volume, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
      o.connect(g).connect(this.sfxGain!);
      o.start(t0);
      o.stop(t0 + 0.8);
    });
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
    this.musicPlaying = false;
  }
}
