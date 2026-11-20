// Test đầu-cuối cho CLI headless (Test Contract v1.0). Chạy: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SC = path.join(ROOT, 'tests', 'scenarios');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-'));

function headless(args) {
  const out = path.join(tmp, `o${Math.random().toString(36).slice(2)}.jsonl`);
  const r = spawnSync(process.execPath, [path.join(ROOT, 'src', 'headless.js'), ...args, '--out', out], { encoding: 'utf8' });
  const lines = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [];
  return { code: r.status, stderr: r.stderr, lines, raw: fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '' };
}

test('định dạng: snapshot tick 0 đầu tiên, end cuối cùng, --ticks N chạy đúng N bước', () => {
  const r = headless(['--seed', '1', '--night', '1', '--ticks', '25', '--snapshot-every', '10',
    '--scenario', path.join(SC, 'contract_example.scenario.json')]);
  assert.equal(r.code, 0);
  const snaps = r.lines.filter((l) => l.type === 'snapshot').map((l) => l.tick);
  assert.deepEqual(snaps, [0, 10, 20]);
  assert.deepEqual(r.lines.at(-1), { type: 'end', ticks: 25, state: 'playing', score: 0 });
  const s0 = r.lines[0];
  for (const k of ['tick', 'sim_tick', 'state', 'time_left_s', 'score', 'player', 'lanterns', 'shades', 'motes_active']) assert.ok(k in s0, k);
});

test('ví dụ inputs của contract: tick 120 người chơi ở z = 12', () => {
  const r = headless(['--seed', '3', '--night', '1', '--ticks', '120',
    '--scenario', path.join(SC, 'contract_example.scenario.json'),
    '--inputs', path.join(SC, 'contract_example.inputs.json')]);
  const s = r.lines.find((l) => l.type === 'snapshot' && l.tick === 120);
  assert.deepEqual(s.player.pos, [0, 0, 12]);
  assert.equal(s.time_left_s, 298);
});

test('tính tất định: cùng seed => output giống hệt', () => {
  const a = headless(['--seed', '42', '--night', '1', '--ticks', '3000']);
  const b = headless(['--seed', '42', '--night', '1', '--ticks', '3000']);
  assert.equal(a.raw, b.raw);
  const c = headless(['--seed', '43', '--night', '1', '--ticks', '3000']);
  assert.notEqual(a.raw, c.raw);
});

test('inputs/scenario sai định dạng => mã thoát 2', () => {
  const bad = path.join(tmp, 'bad.json');
  fs.writeFileSync(bad, '{not json');
  assert.equal(headless(['--ticks', '5', '--inputs', bad]).code, 2);
  assert.equal(headless(['--ticks', '5', '--scenario', bad]).code, 2);
  const dup = path.join(tmp, 'dup.json');
  fs.writeFileSync(dup, JSON.stringify({ frames: [{ tick: 2 }, { tick: 1 }] }));
  assert.equal(headless(['--ticks', '5', '--inputs', dup]).code, 2);
});

test('game kết thúc trước --ticks thì dừng, end.ticks = số bước đã chạy', () => {
  const sc = path.join(tmp, 'dawn.json');
  fs.writeFileSync(sc, JSON.stringify({ random_motes: false, random_shades: false, motes: [], shades: [], time_left_s: 0.5 }));
  const r = headless(['--ticks', '1000', '--scenario', sc]);
  assert.equal(r.code, 0);
  assert.deepEqual(r.lines.at(-1), { type: 'end', ticks: 30, state: 'lost', score: 0 });
  assert.deepEqual(r.lines.find((l) => l.name === 'game_over'), { type: 'event', tick: 30, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
});

test('kịch bản thắng trọn vẹn từ file', () => {
  const r = headless(['--ticks', '2000', '--scenario', path.join(SC, 'win_last_lantern.scenario.json'),
    '--inputs', path.join(SC, 'win_last_lantern.inputs.json')]);
  const end = r.lines.at(-1);
  assert.equal(end.state, 'won');
  assert.ok(r.lines.some((l) => l.name === 'lantern_lit' && l.data.lantern_id === 'L1'));
});
