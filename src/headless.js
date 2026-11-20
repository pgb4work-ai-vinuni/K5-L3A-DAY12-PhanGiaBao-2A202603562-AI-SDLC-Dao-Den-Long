#!/usr/bin/env node
// Chế độ headless theo Test Contract v1.1.
// node src/headless.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json]
//                      --ticks <int> --out <f.jsonl> [--snapshot-every <int>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from './core/game.js';
import { InputTimeline, validateScenario } from './core/io.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(msg, code) {
  process.stderr.write(`headless: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const a = { seed: 0, night: 1, snapshotEvery: 10 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    const need = () => { if (v === undefined) fail(`thiếu giá trị cho ${k}`, 1); i++; return v; };
    const int = (s) => { if (!/^-?\d+$/.test(s)) fail(`${k} phải là số nguyên`, 1); return parseInt(s, 10); };
    switch (k) {
      case '--seed': a.seed = int(need()); break;
      case '--night': a.night = int(need()); break;
      case '--scenario': a.scenario = need(); break;
      case '--inputs': a.inputs = need(); break;
      case '--ticks': a.ticks = int(need()); break;
      case '--out': a.out = need(); break;
      case '--snapshot-every': a.snapshotEvery = int(need()); break;
      default: fail(`tham số không hợp lệ: ${k}`, 1);
    }
  }
  if (a.ticks === undefined || a.ticks < 0) fail('cần --ticks <int> >= 0', 1);
  if (![1, 2, 3].includes(a.night)) fail('--night phải là 1, 2 hoặc 3', 1);
  if (a.snapshotEvery <= 0) fail('--snapshot-every phải > 0', 1);
  return a;
}

function readJson(file, what) {
  let txt;
  try { txt = fs.readFileSync(file, 'utf8'); } catch (e) { fail(`không đọc được ${what} ${file}: ${e.message}`, 2); }
  try { return JSON.parse(txt); } catch (e) { fail(`${what} không phải JSON hợp lệ: ${e.message}`, 2); }
}

const args = parseArgs(process.argv.slice(2));
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8'));

let scenario;
if (args.scenario) {
  scenario = readJson(args.scenario, 'scenario');
  const err = validateScenario(scenario);
  if (err) fail(`scenario sai định dạng: ${err}`, 2);
}
let timeline;
try {
  timeline = new InputTimeline(args.inputs ? readJson(args.inputs, 'inputs') : { frames: [] });
} catch (e) { fail(`inputs sai định dạng: ${e.message}`, 2); }

const game = new Game(contract.tuning, { seed: args.seed, night: args.night, scenario });
const lines = [];
const out = (o) => lines.push(JSON.stringify(o));

out(game.snapshot());
for (const ev of game.startEvents()) out(ev);
for (let k = 0; k < args.ticks && game.state === 'playing'; k++) {
  for (const ev of game.step(timeline.at(k))) out(ev);
  if (game.tick % args.snapshotEvery === 0) out(game.snapshot());
}
out({ type: 'end', ticks: game.tick, state: game.state, score: game.score });

const text = lines.join('\n') + '\n';
if (args.out && args.out !== '-') {
  try { fs.writeFileSync(args.out, text); } catch (e) { fail(`không ghi được ${args.out}: ${e.message}`, 1); }
} else process.stdout.write(text);
