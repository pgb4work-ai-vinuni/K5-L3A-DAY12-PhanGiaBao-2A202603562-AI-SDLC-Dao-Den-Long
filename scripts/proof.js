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
for (const name of ['contract_example', 'win_last_lantern']) {
  const out = path.join(OUT, `${name}.jsonl`);
  const r = run(['--seed', '1', '--night', '1', '--scenario', path.join(SC, `${name}.scenario.json`),
    '--inputs', path.join(SC, `${name}.inputs.json`), '--ticks', '600', '--snapshot-every', '60', '--out', out]);
  const lines = fs.readFileSync(out, 'utf8').trim().split('\n');
  say(`${name}: exit=${r.status}, ${lines.length} dòng, end=${lines.at(-1)}`);
}
// Tất định: chạy 2 lần cả đêm với seed 42
const a = path.join(OUT, 'seed42_run1.jsonl'), b = path.join(OUT, 'seed42_run2.jsonl');
const t0 = Date.now();
run(['--seed', '42', '--night', '1', '--ticks', '18000', '--out', a]);
const ms = Date.now() - t0;
run(['--seed', '42', '--night', '1', '--ticks', '18000', '--out', b]);
const same = fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
say(`determinism seed 42: ${same ? 'GIỐNG HỆT' : 'KHÁC NHAU'} (run1 ${ms} ms)`);
fs.unlinkSync(b);
// File lỗi => mã thoát 2
const bad = path.join(OUT, '_bad.json');
fs.writeFileSync(bad, '{oops');
say(`bad inputs exit code: ${run(['--ticks', '5', '--inputs', bad, '--out', '-']).status}`);
fs.unlinkSync(bad);
fs.writeFileSync(path.join(OUT, 'proof-summary.txt'), log.join('\n') + '\n');
if (!same) process.exit(1);
