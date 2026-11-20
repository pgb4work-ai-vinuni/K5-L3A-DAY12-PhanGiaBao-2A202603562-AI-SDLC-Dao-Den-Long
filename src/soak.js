#!/usr/bin/env node
// Soak test (Ticket-04 mục 2): node src/soak.js --seed 7 --nights 10 --out soak.json
// Chạy N Đêm liên tiếp trong CÙNG một tiến trình (Đêm 1 → 2 → 3 xoay vòng), Đêm thứ i (i = 1..N) dùng seed + i.
// Input ngẫu nhiên theo seed: mỗi 30 tick đổi hướng; mỗi tick 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from './core/game.js';
import { makeRng } from './core/rng.js';
import { WORLD } from './core/world.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = { seed: 7, nights: 10, out: 'soak.json' };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = argv[i + 1];
  if (k === '--seed') { args.seed = parseInt(v, 10); i++; }
  else if (k === '--nights') { args.nights = parseInt(v, 10); i++; }
  else if (k === '--out') { args.out = v; i++; }
  else { process.stderr.write(`soak: tham số không hợp lệ: ${k}\n`); process.exit(1); }
}
if (!Number.isInteger(args.seed) || !Number.isInteger(args.nights) || args.nights < 1) {
  process.stderr.write('soak: --seed và --nights phải là số nguyên (nights >= 1)\n');
  process.exit(1);
}

const tuning = JSON.parse(fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8')).tuning;
// Thu gom rác trước khi đo (nếu chạy với --expose-gc) để RSS phản ánh bộ nhớ còn giữ, không phải rác chưa dọn.
const gc = () => { if (typeof globalThis.gc === 'function') { globalThis.gc(); globalThis.gc(); } };
const mb = () => { gc(); return Math.round((process.memoryUsage().rss / 1048576) * 10) / 10; };
const t0 = Date.now();
const results = [];
let crashes = 0, memStart = null, memEnd = null;

for (let i = 1; i <= args.nights; i++) {
  const night = ((i - 1) % 3) + 1;
  const seed = args.seed + i;
  let game = null;
  try {
    game = new Game(tuning, { seed, night });
    if (i === 1) memStart = mb(); // sau khi tải xong Đêm đầu tiên
    const rnd = makeRng(seed ^ 0x5eed);
    const maxTicks = Math.round(tuning[game.map.durationKey] * WORLD.TICK_RATE);
    let move = [0, 0];
    for (let k = 0; k < maxTicks && game.state === 'playing'; k++) {
      if (k % 30 === 0) { const a = rnd() * Math.PI * 2; move = [Math.cos(a), Math.sin(a)]; }
      game.step({
        move, cam_yaw_deg: 0,
        jump: rnd() < 0.05, dash: rnd() < 0.03, pulse: rnd() < 0.02, interact: rnd() < 0.10,
      });
      if (k % 600 === 0) game.snapshot(); // dựng snapshot định kỳ như headless thật
    }
    results.push(game.state === 'playing' ? 'timeout' : game.state);
  } catch (e) {
    crashes++;
    results.push('crash');
    process.stderr.write(`soak: Đêm ${i} lỗi: ${e.stack || e}\n`);
  }
  game = null; // reset Đêm
}
memEnd = mb(); // sau khi reset xong Đêm cuối cùng

const report = {
  nights: args.nights, crashes, results,
  mem_start_mb: memStart, mem_end_mb: memEnd,
  duration_s: Math.round((Date.now() - t0) / 100) / 10,
};
fs.writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
process.exit(0);
