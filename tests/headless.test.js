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

// ---------------- Phase 2: mỗi tính năng mới có ít nhất 1 scenario headless ----------------
const p2 = (name, night, ticks, extra = []) => headless(['--seed', '1', '--night', String(night), '--ticks', String(ticks),
  '--scenario', path.join(SC, `${name}.scenario.json`), '--inputs', path.join(SC, `${name}.inputs.json`), ...extra]);
const evs = (r, name) => r.lines.filter((l) => l.type === 'event' && l.name === name);

test('v1.1 snapshot có đủ trường mới, night_start ở đầu', () => {
  const r = headless(['--seed', '2', '--night', '2', '--ticks', '10']);
  const s = r.lines[0];
  for (const k of ['night', 'wind', 'motes', 'drifters', 'charms']) assert.ok(k in s, k);
  for (const k of ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s']) assert.ok(k in s.player, k);
  assert.deepEqual(r.lines[1], { type: 'event', tick: 0, name: 'night_start', data: { night: 2 } });
  assert.equal(headless(['--night', '4', '--ticks', '1']).code !== 0, true);
});

test('scenario p2_dash: lướt 2 lần (lần 2 bị hồi chiêu chặn, lần 3 sau 90 tick)', () => {
  const r = p2('p2_dash', 1, 120);
  assert.deepEqual(evs(r, 'dash').map((e) => e.tick), [1, 91]);
});

test('scenario p2_fall: rơi khỏi Đêm 1, hồi sinh ở (0,0,0)', () => {
  const r = p2('p2_fall', 1, 200, ['--snapshot-every', '200']);
  assert.deepEqual(evs(r, 'player_hit').map((e) => e.data), [{ by: 'fall', flames: 2, dropped: 0, lost: 4 }]);
  assert.deepEqual(r.lines.find((l) => l.type === 'snapshot' && l.tick === 200).player.pos, [0, 0, 0]);
});

test('scenario p2_pause: paused/resumed, snapshot state paused, sim_tick < tick', () => {
  const r = p2('p2_pause', 1, 60);
  assert.deepEqual(evs(r, 'paused').map((e) => e.tick), [11]);
  assert.deepEqual(evs(r, 'resumed').map((e) => e.tick), [51]);
  const s = r.lines.find((l) => l.type === 'snapshot' && l.tick === 50);
  assert.equal(s.state, 'paused');
  assert.equal(s.sim_tick, 10);
  const s2 = r.lines.find((l) => l.type === 'snapshot' && l.tick === 60);
  assert.equal(s2.state, 'playing');
  assert.equal(s2.sim_tick, 20);
});

test('scenario p2_hit_drop: bị chạm, 2 đom đóm dropped, Bóng Mực recoil', () => {
  const r = p2('p2_hit_drop', 1, 60, ['--snapshot-every', '60']);
  assert.deepEqual(evs(r, 'player_hit')[0].data, { by: 'shade', flames: 2, dropped: 2 });
  const s = r.lines.find((l) => l.type === 'snapshot' && l.tick === 60);
  assert.equal(s.motes.filter((m) => m.kind === 'dropped').length, 2);
});

test('scenario p2_safe_zone: thắp đèn đẩy Bóng Mực ra mép 6 m, không bị chạm', () => {
  const r = p2('p2_safe_zone', 1, 30, ['--snapshot-every', '30']);
  assert.equal(evs(r, 'lantern_lit').length, 1);
  assert.equal(evs(r, 'player_hit').length, 0);
  const sh = r.lines.find((l) => l.type === 'snapshot' && l.tick === 30).shades[0];
  assert.ok(Math.hypot(sh.pos[0], sh.pos[2] - 25) >= 5.999);
});

test('scenario p2_pulse: chỉ S1 (trong 5 m) bị choáng, score 5', () => {
  const r = p2('p2_pulse', 1, 20, ['--snapshot-every', '20']);
  assert.deepEqual(evs(r, 'pulse')[0].data, { stunned_ids: ['S1'] });
  const s = r.lines.find((l) => l.type === 'snapshot' && l.tick === 20);
  assert.equal(s.shades[0].state, 'stunned');
  assert.equal(s.score, 5);
});

test('scenario p2_drifter: Gió Lạc cướp 3 rồi bị Tỏa Sáng thả lại', () => {
  const r = p2('p2_drifter', 2, 60);
  assert.deepEqual(evs(r, 'drifter_steal')[0].data, { drifter_id: 'D1', amount: 3, carried: 3 });
  assert.deepEqual(evs(r, 'drifter_drop')[0].data, { drifter_id: 'D1', amount: 3 });
});

test('scenario p2_charm: nhặt Bùa Gió, lướt 2 lần liền không hồi chiêu', () => {
  const r = p2('p2_charm', 2, 60);
  assert.deepEqual(evs(r, 'charm_picked')[0].data, { charm_id: 'C1', charm_ticks: 600 });
  assert.equal(evs(r, 'dash').length, 2);
});

test('scenario p2_jump_pad: Đêm 2 bục nhảy sang đảo B, không rơi', () => {
  const r = p2('p2_jump_pad', 2, 120, ['--snapshot-every', '120']);
  assert.equal(evs(r, 'player_hit').length, 0);
  const p = r.lines.find((l) => l.type === 'snapshot' && l.tick === 120).player;
  assert.ok(Math.hypot(p.pos[0] - 70, p.pos[2]) <= 28 && p.grounded);
});

test('scenario p2_night3_tiers: bục nhảy tầng 1 đáp lên tầng 2 (Y = 6)', () => {
  const r = p2('p2_night3_tiers', 3, 120, ['--snapshot-every', '120']);
  const p = r.lines.find((l) => l.type === 'snapshot' && l.tick === 120).player;
  assert.equal(p.pos[1], 6);
});

test('scenario p2_wind: Đêm 3 có gió từ tick 1800 tới 2100', () => {
  const r = p2('p2_wind', 3, 2100, ['--snapshot-every', '300']);
  const w = (t) => r.lines.find((l) => l.type === 'snapshot' && l.tick === t).wind.active;
  assert.deepEqual([w(1500), w(1800), w(2100)], [false, true, false]);
});

test('hiệu năng: chạy trọn một Đêm 21.600 tick <= 30 s', () => {
  const t0 = Date.now();
  const r = headless(['--seed', '9', '--night', '3', '--ticks', '21600']);
  assert.equal(r.code, 0);
  assert.ok(Date.now() - t0 < 30000);
});
