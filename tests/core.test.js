// Test đơn vị cho logic thuần (src/core). Chạy: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game, rotateMove } from '../src/core/game.js';
import { InputTimeline, validateScenario } from '../src/core/io.js';

const T = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;
const base = (extra = {}) => ({ random_motes: false, random_shades: false, motes: [], shades: [], ...extra });
const run = (g, n, input = {}) => { const ev = []; for (let i = 0; i < n; i++) ev.push(...g.step(input)); return ev; };

test('tick 0: người chơi ở (0,0,0), 5 đèn, đúng flames/thời gian', () => {
  const g = new Game(T, { seed: 1 });
  const s = g.snapshot();
  assert.deepEqual(s.player.pos, [0, 0, 0]);
  assert.equal(s.lanterns.length, T.lantern_count_night1);
  assert.equal(s.player.flames, T.flames);
  assert.equal(s.time_left_s, T.night1_duration_s);
  assert.equal(s.tick, 0);
});

test('player_speed: đi +Z 120 tick = 12 m (khớp ví dụ contract)', () => {
  const g = new Game(T, { scenario: base() });
  run(g, 120, { move: [0, 1], cam_yaw_deg: 0 });
  assert.deepEqual(g.snapshot().player.pos, [0, 0, 12]);
  assert.equal(g.snapshot().time_left_s, 298);
});

test('cam_yaw_deg xoay hướng đi đúng công thức', () => {
  const [x, z] = rotateMove([0, 1], 90); // x' = z·sinθ = 1, z' = z·cosθ = 0
  assert.ok(Math.abs(x - 1) < 1e-9 && Math.abs(z) < 1e-9);
  const [a, b] = rotateMove([1, 1], 0); // chuẩn hóa về độ dài 1
  assert.ok(Math.abs(Math.hypot(a, b) - 1) < 1e-9);
});

test('nhặt đom đóm trong pickup_radius (<=), sự kiện ghi tick = k+1', () => {
  const g = new Game(T, { scenario: base({ motes: [[0, 0, 5]] }) });
  let pickTick = null;
  for (let k = 0; k < 60 && pickTick === null; k++) {
    for (const e of g.step({ move: [0, 1] })) if (e.name === 'mote_picked') pickTick = e.tick;
  }
  // khoảng cách còn 1.5 m khi z = 3.5 m = 35 bước * 0.1 m
  assert.equal(pickTick, 35);
  assert.equal(g.player.carried, 1);
  assert.equal(g.score, T.score.per_mote);
});

test('không nhặt quá carry_capacity', () => {
  const g = new Game(T, { scenario: base({ player: { carried: T.carry_capacity }, motes: [[0, 0, 0]] }) });
  run(g, 5);
  assert.equal(g.player.carried, T.carry_capacity);
  assert.equal(g.motes.length, 1);
});

test('interact cạnh false->true nạp đèn, đủ lantern_cost thì thắp', () => {
  const g = new Game(T, { scenario: base({ player: { pos: [0, 0, 23], carried: T.lantern_cost } }) });
  const ev = [...g.step({ interact: true }), ...g.step({ interact: true })];
  const names = ev.map((e) => e.name);
  assert.deepEqual(names, ['deposit', 'lantern_lit']); // giữ nút không kích hoạt lần 2
  assert.deepEqual(ev[0].data, { lantern_id: 'L1', amount: T.lantern_cost, deposited: T.lantern_cost });
  assert.equal(ev[0].tick, 1);
  assert.equal(g.score, T.score.per_lantern);
});

test('thắp đèn cuối cùng => thắng all_lit, có điểm thưởng', () => {
  const lit = ['L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true }));
  const g = new Game(T, { scenario: base({ player: { pos: [0, 0, 24], carried: 5 }, lanterns: lit, time_left_s: 100 }) });
  const ev = g.step({ interact: true });
  assert.equal(g.state, 'won');
  assert.deepEqual(ev.at(-1).data, { result: 'won', reason: 'all_lit' });
  const expected = T.score.per_lantern + T.score.per_second_left * Math.floor(100 - 1 / 60) + T.score.per_flame_left * T.flames;
  assert.equal(g.score, expected);
});

test('dựng scenario không phát sự kiện, không cộng điểm', () => {
  const g = new Game(T, { scenario: base({ lanterns: [{ id: 'L1', lit: true }] }) });
  assert.equal(g.score, 0);
  assert.equal(g.lanterns[0].lit, true);
  assert.equal(g.lanterns[1].lit, false); // đèn không nhắc tới giữ nguyên
});

test('Bóng Mực đuổi với shade_speed và chạm => mất flame, rơi đom đóm, bất tử invuln_s', () => {
  const g = new Game(T, { scenario: base({ player: { carried: 4 }, shades: [{ pos: [0.5, 1, 0] }] }) });
  const ev = g.step({});
  const hit = ev.find((e) => e.name === 'player_hit');
  assert.deepEqual(hit.data, { by: 'shade', flames: T.flames - 1, dropped: Math.floor(4 * T.hit_drop_ratio) });
  const ev2 = run(g, T.invuln_s * 60 - 1);
  assert.equal(ev2.filter((e) => e.name === 'player_hit').length, 0);
  assert.equal(g.step({}).filter((e) => e.name === 'player_hit').length, 1);
});

test('hết flames => thua no_flames', () => {
  const g = new Game(T, { scenario: base({ player: { flames: 1 }, shades: [{ pos: [0, 1, 0] }] }) });
  const ev = g.step({});
  assert.equal(g.state, 'lost');
  assert.deepEqual(ev.at(-1).data, { result: 'lost', reason: 'no_flames' });
});

test('pulse tốn pulse_cost, stun + đẩy Bóng Mực trong pulse_radius, có cooldown', () => {
  const g = new Game(T, { scenario: base({ player: { carried: 3 }, shades: [{ id: 'A', pos: [5, 1, 0] }, { id: 'B', pos: [20, 1, 0] }] }) });
  const ev = g.step({ pulse: true });
  const p = ev.find((e) => e.name === 'pulse');
  assert.deepEqual(p.data, { stunned_ids: ['A'] });
  assert.equal(g.player.carried, 3 - T.pulse_cost);
  const a = g.shades[0];
  assert.equal(a.state, 'stunned');
  assert.ok(Math.abs(a.pos[0] - (5 - T.shade_speed / 60 + T.pulse_push_m)) < 1e-9);
  g.step({ pulse: false });
  assert.equal(g.step({ pulse: true }).filter((e) => e.name === 'pulse').length, 0); // còn cooldown
});

test('không đủ ánh sáng thì không pulse', () => {
  const g = new Game(T, { scenario: base({ player: { carried: 0 }, shades: [{ pos: [3, 1, 0] }] }) });
  assert.equal(g.step({ pulse: true }).length, 0);
});

test('Bóng Mực không vào safe_radius của đèn đã thắp', () => {
  const g = new Game(T, { scenario: base({ player: { pos: [0, 0, 25] }, lanterns: [{ id: 'L1', lit: true }], shades: [{ pos: [0, 1, 35] }] }) });
  const ev = run(g, 600);
  assert.equal(ev.filter((e) => e.name === 'player_hit').length, 0);
  const d = Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2] - 25);
  assert.ok(d >= T.safe_radius - 1e-9);
});

test('hết giờ => thua dawn đúng tick', () => {
  const g = new Game(T, { scenario: base({ time_left_s: 1 }) });
  const ev = run(g, 100);
  assert.equal(g.tick, 60);
  assert.deepEqual(ev.at(-1), { type: 'event', tick: 60, name: 'game_over', data: { result: 'lost', reason: 'dawn' } });
});

test('InputTimeline: giữ giá trị cũ, tick phải tăng nghiêm ngặt', () => {
  const tl = new InputTimeline({ frames: [{ tick: 0, move: [1, 0] }, { tick: 5, jump: true }] });
  assert.deepEqual(tl.at(0).move, [1, 0]);
  assert.equal(tl.at(4).jump, false);
  assert.equal(tl.at(5).jump, true);
  assert.deepEqual(tl.at(6).move, [1, 0]);
  assert.throws(() => new InputTimeline({ frames: [{ tick: 3 }, { tick: 3 }] }));
  assert.throws(() => new InputTimeline({ frames: 'x' }));
});

test('validateScenario bắt lỗi định dạng', () => {
  assert.equal(validateScenario({ player: { pos: [0, 0] } }) !== null, true);
  assert.equal(validateScenario({ motes: [[0, 0, 5]], shades: [{ pos: [1, 0, 0] }] }), null);
});

test('nhảy: rời mặt đất rồi quay về Y = 0', () => {
  const g = new Game(T, { scenario: base() });
  g.step({ jump: true });
  assert.ok(g.player.pos[1] > 0);
  run(g, 120, { jump: true });
  assert.equal(g.player.pos[1], 0);
});
