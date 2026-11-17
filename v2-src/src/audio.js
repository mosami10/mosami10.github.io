// Generative soundtrack: wind tunnel air, a low engine drone and a slow pad. No samples, no licences.
export class Sound {
  constructor() { this.on = false; this.ctx = null; }
  start() {
    if (this.ctx) { this.setOn(true); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    const master = this.master = c.createGain(); master.gain.value = 0;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp).connect(c.destination);

    // space: feedback delay used as a cheap reverb tail
    const send = this.send = c.createGain(); send.gain.value = 0.5;
    const d1 = c.createDelay(1), d2 = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter();
    d1.delayTime.value = 0.37; d2.delayTime.value = 0.53; fb.gain.value = 0.45; lp.type = 'lowpass'; lp.frequency.value = 1800;
    send.connect(d1).connect(d2).connect(lp).connect(fb).connect(d1); lp.connect(master); d1.connect(master);

    // wind: looped noise through a moving bandpass
    const len = c.sampleRate * 3, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.2 + w * 0.05; } }
    const noise = c.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const bp = this.windF = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
    const wg = this.windG = c.createGain(); wg.gain.value = 0.5;
    noise.connect(bp).connect(wg).connect(master); wg.connect(send); noise.start();

    // drone: two detuned saws and a sub
    const dl = c.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 160; dl.Q.value = 4; this.droneF = dl;
    const dg = c.createGain(); dg.gain.value = 0.16; dl.connect(dg).connect(master);
    [[55, 'sawtooth', 1], [55.4, 'sawtooth', 1], [27.5, 'sine', 2.2], [82.4, 'triangle', 0.5]].forEach(([f, t, g]) => {
      const o = c.createOscillator(), og = c.createGain(); o.type = t; o.frequency.value = f; og.gain.value = g; o.connect(og).connect(dl); o.start();
    });

    // pad: A minor 9 voices that swell in and out on slow, unsynced LFOs
    [220, 261.63, 329.63, 392, 493.88, 659.25].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
      o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 2.5) * 4;
      g.gain.value = 0.012; l.frequency.value = 0.03 + i * 0.017; lg.gain.value = 0.012;
      l.connect(lg).connect(g.gain); o.connect(g); g.connect(send); g.connect(master); o.start(); l.start();
    });

    // disc whine: follows the "rpm" of the scene
    const w = this.whine = c.createOscillator(), wgn = this.whineG = c.createGain();
    w.type = 'sine'; w.frequency.value = 600; wgn.gain.value = 0; w.connect(wgn).connect(send); w.start();

    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; document.hidden ? this.ctx.suspend() : (this.on && this.ctx.resume()); });
    this.setOn(true);
  }
  setOn(v) {
    this.on = v; if (!this.ctx) return;
    if (v) this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(v ? 0.55 : 0, t, v ? 0.8 : 0.15);
  }
  toggle() { if (!this.ctx) this.start(); else this.setOn(!this.on); return this.on; }
  // speed 0..1 (scroll energy), spin 0..1 (disc on screen), heat 0..1
  update(speed, spin, heat, brake = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    this.windF.frequency.setTargetAtTime(380 + speed * 1500 + brake * 2200, t, 0.1);
    this.windG.gain.setTargetAtTime(0.35 + speed * 0.6 + brake * 1.1, t, 0.1);
    this.droneF.frequency.setTargetAtTime(140 + heat * 260 + speed * 200, t, 0.3);
    this.whine.frequency.setTargetAtTime(240 + spin * 900, t, 0.12);
    this.whineG.gain.setTargetAtTime(spin * 0.008 + brake * 0.03, t, 0.15);
  }
  blip(f = 880, dur = 0.09, vol = 0.05) {
    if (!this.ctx || !this.on) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); g.connect(this.send); o.start(t); o.stop(t + dur + 0.02);
  }
  whoosh() {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    this.windG.gain.cancelScheduledValues(t); this.windG.gain.setValueAtTime(1.6, t); this.windG.gain.setTargetAtTime(0.5, t + 0.1, 0.5);
    this.windF.frequency.setValueAtTime(2200, t); this.windF.frequency.setTargetAtTime(420, t + 0.05, 0.6);
  }
}
