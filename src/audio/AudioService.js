export class AudioService {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicNodes = [];
    this.enabled = { music: true, sfx: true };
    this.vols = { master: 0.85, music: 0.35, sfx: 0.8 };
    this.platformMute = false;
    this.started = false;
    this.musicOn = false;
  }

  applySettings(s, platformMute) {
    this.enabled.music = s.music;
    this.enabled.sfx = s.sfx;
    this.vols.master = s.master;
    this.vols.music = s.musicVol;
    this.vols.sfx = s.sfxVol;
    this.platformMute = platformMute;
    this.sync();
  }

  async unlock() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.started = true;
    this.sync();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  sync() {
    if (!this.master) return;
    const mute = this.platformMute ? 0 : 1;
    this.master.gain.value = this.vols.master * mute;
    this.musicGain.gain.value = this.enabled.music ? this.vols.music : 0;
    this.sfxGain.gain.value = this.enabled.sfx ? this.vols.sfx : 0;
  }

  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const ctx = this.ctx;
    const makePad = (freq, type, gainVal) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      o.type = type;
      o.frequency.value = freq;
      f.type = "lowpass";
      f.frequency.value = 680;
      g.gain.value = gainVal;
      o.connect(f);
      f.connect(g);
      g.connect(this.musicGain);
      o.start();
      return { o, g };
    };
    this.musicNodes = [
      makePad(110, "sine", 0.07),
      makePad(165, "triangle", 0.035),
      makePad(220.5, "sine", 0.025),
    ];
    const lfo = ctx.createOscillator();
    const lfoG = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoG.gain.value = 18;
    lfo.connect(lfoG);
    lfoG.connect(this.musicNodes[0].o.frequency);
    lfo.start();
    this.musicNodes.push({ o: lfo, g: lfoG });
  }

  stopMusic() {
    for (const n of this.musicNodes) {
      try {
        n.o.stop();
      } catch {}
    }
    this.musicNodes = [];
    this.musicOn = false;
  }

  tone(freq, dur = 0.12, type = "sine", vol = 0.12, slide = 0) {
    if (!this.ctx || this.platformMute || !this.enabled.sfx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur = 0.08, vol = 0.08) {
    if (!this.ctx || this.platformMute || !this.enabled.sfx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    src.buffer = buf;
    f.type = "lowpass";
    f.frequency.value = 420;
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
  }

  move() {
    this.tone(320, 0.1, "sine", 0.06, -40);
  }
  collide() {
    this.noise(0.07, 0.1);
    this.tone(90, 0.09, "sine", 0.08);
  }
  wake() {
    this.tone(520, 0.08, "triangle", 0.04, 30);
  }
  anchor() {
    this.tone(440, 0.16, "sine", 0.1, 80);
    this.tone(660, 0.18, "triangle", 0.05);
  }
  well() {
    this.tone(380, 0.22, "sine", 0.09, 120);
  }
  pop() {
    this.tone(880, 0.06, "sine", 0.035, 200);
  }
  click() {
    this.tone(700, 0.05, "triangle", 0.05);
  }
  fail() {
    this.tone(180, 0.2, "sine", 0.08, -80);
  }
  complete() {
    this.tone(392, 0.18, "sine", 0.1);
    setTimeout(() => this.tone(494, 0.18, "sine", 0.1), 90);
    setTimeout(() => this.tone(587, 0.28, "triangle", 0.09), 180);
    setTimeout(() => this.tone(784, 0.35, "sine", 0.07), 280);
  }
  reward() {
    this.tone(523, 0.12, "triangle", 0.08);
    this.tone(784, 0.2, "sine", 0.07);
  }
}
