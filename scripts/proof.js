// Sinh bằng chứng headless cho phase hiện tại: npm run proof
// Chạy các scenario trong tests/scenarios, kiểm tra tất định, lưu output vào docs/proof/<phase>/.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHASE = process.argv[2] || 'phase-1';
const OUT = path.join(ROOT, 'docs', 'proof', PHASE);
fs.mkdirSync(OUT, { recursive: true });
const H = path.join(ROOT, 'src', 'headless.js');
const run = (args) => spawnSync(process.execPath, [H, ...args], { encoding: 'utf8' });
const log = [];
const say = (s) => { console.log(s); log.push(s); };

const SC = path.join(ROOT, 'tests', 'scenarios');
const NIGHT = { p2_drifter: 2, p2_charm: 2, p2_jump_pad: 2, p2_night3_tiers: 3, p2_wind: 3 };
const names = fs.readdirSync(SC).filter((f) => f.endsWith('.scenario.json')).map((f) => f.replace('.scenario.json', '')).sort();
for (const name of names) {
  const out = path.join(OUT, `${name}.jsonl`);
  const ticks = name === 'p2_wind' ? '2100' : name === 'win_last_lantern' ? '4000' : '600';
  const r = run(['--seed', '1', '--night', String(NIGHT[name] || 1), '--scenario', path.join(SC, `${name}.scenario.json`),
    '--inputs', path.join(SC, `${name}.inputs.json`), '--ticks', ticks, '--snapshot-every', '60', '--out', out]);
  const lines = fs.readFileSync(out, 'utf8').trim().split('\n');
  say(`${name}: exit=${r.status}, ${lines.length} dòng, end=${lines.at(-1)}`);
}
// Tất định + hiệu năng: mỗi Đêm chạy 2 lần với seed 42 (tối đa 21.600 tick)
let same = true;
for (const n of [1, 2, 3]) {
  const a = path.join(OUT, `seed42_night${n}_run1.jsonl`), b = path.join(OUT, `seed42_night${n}_run2.jsonl`);
  const t0 = Date.now();
  run(['--seed', '42', '--night', String(n), '--ticks', '21600', '--snapshot-every', '60', '--out', a]);
  const ms = Date.now() - t0;
  run(['--seed', '42', '--night', String(n), '--ticks', '21600', '--snapshot-every', '60', '--out', b]);
  const ok = fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
  same = same && ok;
  say(`night ${n} determinism seed 42: ${ok ? 'GIỐNG HỆT' : 'KHÁC NHAU'} (run1 ${ms} ms, ${fs.readFileSync(a, 'utf8').trim().split('\n').at(-1)})`);
  fs.unlinkSync(b);
}
// Hiệu năng: một Đêm đầy đủ 21.600 tick (Mây có nhiều Ngọn Lửa để không thua sớm)
const perfSc = path.join(OUT, '_perf.json');
fs.writeFileSync(perfSc, JSON.stringify({ player: { flames: 100000 } }));
for (const n of [1, 2, 3]) {
  const t0 = Date.now();
  const r = run(['--seed', '7', '--night', String(n), '--ticks', '21600', '--scenario', perfSc, '--out', path.join(OUT, '_perf.jsonl')]);
  const end = fs.readFileSync(path.join(OUT, '_perf.jsonl'), 'utf8').trim().split('\n').at(-1);
  say(`perf night ${n}: ${Date.now() - t0} ms cho ${JSON.parse(end).ticks} tick (exit ${r.status}, yêu cầu <= 30000 ms)`);
}
fs.unlinkSync(perfSc); fs.unlinkSync(path.join(OUT, '_perf.jsonl'));
// File lỗi => mã thoát 2
const bad = path.join(OUT, '_bad.json');
fs.writeFileSync(bad, '{oops');
say(`bad inputs exit code: ${run(['--ticks', '5', '--inputs', bad, '--out', '-']).status}`);
fs.unlinkSync(bad);
fs.writeFileSync(path.join(OUT, 'proof-summary.txt'), log.join('\n') + '\n');
if (!same) process.exit(1);
