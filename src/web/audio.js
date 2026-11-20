// Âm thanh tổng hợp bằng WebAudio (tự tạo, không dùng file ngoài).
let ctx = null, master = null, music = null;
let volume = 0.6;

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  return true;
}

export function setVolume(v) { volume = v; if (master) master.gain.value = v; }

function tone(freq, dur, { type = 'sine', gain = 0.2, slide = 0, delay = 0 } = {}) {
  if (!ensure()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}
function noise(dur, gain = 0.15, freq = 800) {
  if (!ensure()) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = gain;
  src.connect(f).connect(g).connect(master);
  src.start();
}

export const sfx = {
  pick: () => tone(1200, 0.12, { gain: 0.12, slide: 400 }),
  deposit: () => tone(520, 0.2, { type: 'triangle', gain: 0.15 }),
  lit: () => { tone(523, 0.4, { gain: 0.2 }); tone(659, 0.4, { gain: 0.15, delay: 0.1 }); tone(784, 0.6, { gain: 0.15, delay: 0.2 }); },
  pulse: () => { tone(300, 0.5, { type: 'triangle', gain: 0.25, slide: 600 }); noise(0.3, 0.08, 2000); },
  hit: () => { tone(160, 0.35, { type: 'sawtooth', gain: 0.18, slide: -80 }); },
  jump: () => tone(400, 0.15, { type: 'square', gain: 0.06, slide: 300 }),
  dash: () => noise(0.2, 0.2, 1500),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { gain: 0.18, delay: i * 0.15 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.6, { type: 'triangle', gain: 0.18, delay: i * 0.25 })),
  shade: () => tone(90, 0.8, { type: 'sawtooth', gain: 0.08, slide: -30 }),
  tick: () => tone(880, 0.08, { type: 'square', gain: 0.06 }),
  wind: () => noise(1.8, 0.12, 400),
  steal: () => tone(700, 0.3, { type: 'triangle', gain: 0.12, slide: -400 }),
  charm: () => { tone(880, 0.2, { gain: 0.12 }); tone(1320, 0.3, { gain: 0.1, delay: 0.08 }); },
};

// Nhạc nền đêm: hai nốt trầm đan nhau, rất nhỏ.
export function startMusic() {
  if (!ensure() || music) return;
  if (ctx.state === 'suspended') ctx.resume();
  const g = ctx.createGain(); g.gain.value = 0.05; g.connect(master);
  const oscs = [110, 164.8, 220].map((f, i) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 3;
    lfo.connect(lg).connect(o.frequency); lfo.start();
    o.connect(g); o.start();
    return o;
  });
  music = { g, oscs };
}
export function resumeAudio() { if (ensure() && ctx.state === 'suspended') ctx.resume(); }
