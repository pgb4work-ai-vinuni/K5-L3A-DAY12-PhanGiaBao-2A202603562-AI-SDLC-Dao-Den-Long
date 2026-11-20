// Test đơn vị cho logic thuần (src/core) theo Ticket-02/03 / Contract v1.2. Chạy: npm test
// Test bị Ticket-03 [THAY THẾ] luật đã được sửa/xóa kèm lý do (xem CHANGELOG.md, docs/notes/phase-3-assumptions.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game, rotateMove } from '../src/core/game.js';
import { InputTimeline, validateScenario } from '../src/core/io.js';

const T = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url))).tuning;
const base = (extra = {}) => ({ random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
  motes: [], shades: [], drifters: [], ...extra });
const mk = (extra, night = 1, seed = 1) => new Game(T, { seed, night, scenario: base(extra) });
const run = (g, n, input = {}) => { const ev = []; for (let i = 0; i < n; i++) ev.push(...g.step(input)); return ev; };
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) <= e, `${a} != ${b}`);

test('contract v1.2: tuning = số chuẩn Ticket-02 + Ticket-03', () => {
  const c = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url)));
  assert.equal(c.contract_version, '1.2');
  assert.deepEqual([T.fuel_max, T.fuel_decay_per_s, T.fuel_per_mote, T.relight_cost, T.win_ratio, T.drain_per_s, T.low_fuel_threshold, T.capacity_max],
    [100, 1, 10, 5, 0.6, 5, 30, 20]);
  assert.deepEqual([T.player_speed, T.carry_capacity, T.lantern_cost, T.pickup_radius, T.interact_radius],
    [6, 10, 10, 1, 2]);
  assert.deepEqual([T.pulse_cost, T.pulse_radius, T.pulse_cooldown_s, T.pulse_stun_s, T.pulse_push_m], [3, 5, 3, 2, 4]);
  assert.deepEqual([T.dash_speed, T.dash_duration_s, T.dash_cooldown_s], [14, 0.2, 1.5]);
  assert.deepEqual([T.night1_duration_s, T.night2_duration_s, T.night3_duration_s], [240, 270, 300]); // Ticket-03 đổi
  assert.deepEqual([T.safe_radius, T.shade_speed, T.shade_hit_radius, T.invuln_s, T.flames], [6, 4, 1, 1.5, 3]);
  assert.equal(T.fall_enabled, true);
  // Ticket-03 [THAY THẾ] điểm: +5/đom đóm nạp, +100 thắp đầu, +40 thắp lại, bỏ thưởng thời gian
  assert.equal(T.score.per_mote, 5); assert.equal(T.score.per_relight, 40); assert.equal(T.score.per_second_left, 0);
});

test('bản đồ chuẩn: số đèn, thời gian, vị trí đèn mỗi Đêm', () => {
  const s = [1, 2, 3].map((n) => new Game(T, { seed: 1, night: n }).snapshot());
  assert.deepEqual(s.map((x) => x.lanterns.length), [5, 6, 7]);
  assert.deepEqual(s.map((x) => x.time_left_s), [240, 270, 300]);
  assert.deepEqual(s[0].lanterns[1].pos, [23.8, 0, 7.7]);
  assert.deepEqual(s[1].lanterns[4].pos, [87, 0, -10]);
  assert.deepEqual(s[2].lanterns[0].pos, [0, 6, 6]);
  assert.deepEqual(s.map((x) => x.motes.length), [20, 20, 20]);
  assert.ok(s[0].motes.every((m) => m.kind === 'random' && m.ttl_s === null));
  assert.deepEqual(s[0].player.pos, [0, 0, 0]);
  assert.equal(s[1].charms.length, 1);
  assert.equal(s[2].charms.length, 2);
});

test('player_speed 6 m/s: đi +Z 120 tick = 12 m', () => {
  const g = mk({});
  run(g, 120, { move: [0, 1] });
  assert.deepEqual(g.snapshot().player.pos, [0, 0, 12]);
  assert.equal(g.snapshot().time_left_s, 238);
});

test('cam_yaw_deg xoay hướng đi đúng công thức', () => {
  const [x, z] = rotateMove([0, 1], 90);
  near(x, 1); near(z, 0);
});

test('nhặt: XZ <= 1.0 và chênh cao <= 1.5', () => {
  const g = mk({ motes: [[0, 0, 5], [3, 3, 0]] });
  let pickTick = null;
  for (let k = 0; k < 60 && pickTick === null; k++) for (const e of g.step({ move: [0, 1] })) if (e.name === 'mote_picked') pickTick = e.tick;
  assert.equal(pickTick, 40); // z = 4.0 m sau 40 bước
  const g2 = mk({ player: { pos: [3, 0, 0] }, motes: [[3, 3, 0]] });
  run(g2, 5);
  assert.equal(g2.player.carried, 0); // chênh cao 3 m: không nhặt
});

test('nạp đèn: min(đang mang, còn thiếu), nhiều lần, +5 mỗi đom đóm nạp (Ticket-03)', () => {
  const g = mk({ player: { pos: [0, 0, 23.5], carried: 6 } });
  const e1 = g.step({ interact: true });
  assert.deepEqual(e1[0].data, { lantern_id: 'L1', amount: 6, deposited: 6 });
  assert.equal(g.score, 30);
  g.player.carried = 7;
  g.step({ interact: false });
  const e2 = g.step({ interact: true });
  assert.deepEqual(e2.map((e) => e.name), ['deposit', 'lantern_lit']);
  assert.equal(e2[0].data.amount, 4);
  assert.equal(e2[1].data.relight, false);
  assert.equal(g.player.carried, 3);
  assert.equal(g.score, 50 + 100);
});

test('nạp đèn: bằng khoảng cách thì chọn id nhỏ hơn', () => {
  const g = mk({ player: { pos: [0, 0, 0], carried: 5 }, lanterns: [{ id: 'L1', pos: [1, 0, 0] }, { id: 'L2', pos: [-1, 0, 0] }] });
  assert.equal(g.step({ interact: true })[0].data.lantern_id, 'L1');
});

test('lướt: 14 m/s trong 12 tick (2.8 m), hồi 90 tick, đứng yên thì theo hướng mặt', () => {
  const g = mk({});
  const ev = g.step({ dash: true });
  assert.equal(ev[0].name, 'dash');
  run(g, 11, { dash: true });
  near(g.player.pos[2], 2.8);
  g.step({ dash: false });
  assert.equal(g.step({ dash: true }).length, 0); // còn hồi chiêu
  const g2 = mk({});
  g2.step({ dash: true }); run(g2, 88, { dash: false });
  assert.equal(g2.step({ dash: true }).length, 0); // tick 89
  g2.step({ dash: false });
  assert.equal(g2.step({ dash: true })[0].name, 'dash'); // >= 90 tick
});

test('rơi khỏi đảo: -1 lửa, mất hết đom đóm, chờ 60 tick, hồi sinh ở xuất phát, bất tử 90', () => {
  const g = mk({ player: { pos: [39.5, 0, 0], carried: 4 } });
  const ev = run(g, 200, { move: [1, 0] });
  const hits = ev.filter((e) => e.name === 'player_hit');
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].data, { by: 'fall', flames: 2, dropped: 0, lost: 4 });
  const g2 = mk({ player: { pos: [39.9, 0, 0] } });
  let fallTick = null;
  for (let i = 0; i < 200 && fallTick === null; i++) for (const e of g2.step({ move: [1, 0] })) if (e.name === 'player_hit') fallTick = e.tick;
  run(g2, 59, {});
  assert.notDeepEqual(g2.player.pos.slice(0, 1), [0]);
  g2.step({});
  assert.deepEqual(g2.snapshot().player.pos, [0, 0, 0]);
  assert.equal(g2.snapshot().player.invuln, true);
});

test('rơi khi còn 1 lửa: thua ngay no_flames', () => {
  const g = mk({ player: { pos: [39.9, 0, 0], flames: 1 } });
  const ev = run(g, 200, { move: [1, 0] });
  assert.deepEqual(ev.at(-1).data, { result: 'lost', reason: 'no_flames' });
});

test('tạm dừng: tick tăng, sim_tick/thời gian đứng yên, state paused, sự kiện paused/resumed', () => {
  const g = mk({});
  g.step({ move: [0, 1] });
  const ev = g.step({ move: [0, 1], pause: true });
  assert.deepEqual(ev.map((e) => e.name), ['paused']);
  run(g, 10, { move: [0, 1], pause: true });
  const s = g.snapshot();
  assert.equal(s.state, 'paused');
  assert.equal(s.tick, 12);
  assert.equal(s.sim_tick, 1);
  near(s.player.pos[2], 0.1);
  g.step({ pause: false });
  assert.deepEqual(g.step({ pause: true }).map((e) => e.name), ['resumed']);
  assert.equal(g.simTick, 2);
});

test('bị Bóng Mực chạm: -1 lửa, rơi floor(mang/2) đom đóm dropped quanh Mây, recoil, bất tử 90', () => {
  const g = mk({ player: { carried: 5 }, shades: [{ id: 'S1', pos: [0.5, 1, 0] }] });
  const ev = g.step({});
  assert.deepEqual(ev[0].data, { by: 'shade', flames: 2, dropped: 2 });
  const s = g.snapshot();
  assert.equal(s.player.carried, 3);
  const dropped = s.motes.filter((m) => m.kind === 'dropped');
  assert.equal(dropped.length, 2);
  for (const m of dropped) { const r = Math.hypot(m.pos[0], m.pos[2]); assert.ok(r >= 1.5 - 1e-3 && r <= 2.5 + 1e-3); }
  near(dropped[0].ttl_s, 8);
  assert.equal(s.shades[0].state, 'recoil');
  assert.equal(run(g, 89).filter((e) => e.name === 'player_hit').length, 0);
});

test('đom đóm rơi: hết TTL 480 tick thì biến mất', () => {
  const g = mk({ motes: [{ pos: [10, 0, 0], kind: 'dropped', ttl_s: 1 }] });
  run(g, 59);
  assert.equal(g.motes.length, 1);
  g.step({});
  assert.equal(g.motes.length, 0);
});

test('Bóng Mực: wander khi xa, chase khi <= 12 m, tốc độ 4 m/s', () => {
  const g = mk({ shades: [{ id: 'A', pos: [11, 1, 0] }, { id: 'B', pos: [30, 1, 0] }] });
  assert.deepEqual(g.snapshot().shades.map((s) => s.state), ['chase', 'wander']);
  g.step({});
  near(g.shades[0].pos[0], 11 - 4 / 60);
});

test('vùng an toàn: bóng trong vùng lúc đèn vừa thắp bị đẩy ra mép 6 m trong <= 30 tick, không gây sát thương', () => {
  const g = mk({ player: { pos: [0, 0, 24], carried: 10 }, shades: [{ id: 'S1', pos: [0, 1, 25.5] }], lanterns: [{ id: 'L1', deposited: 0 }] });
  const ev = g.step({ interact: true });
  assert.ok(ev.some((e) => e.name === 'lantern_lit'));
  const more = run(g, 29);
  assert.equal([...ev, ...more].filter((e) => e.name === 'player_hit').length, 0);
  const d = Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2] - 25);
  assert.ok(d >= 6 - 1e-6, `d=${d}`);
});

test('Tỏa Sáng: 3 đom đóm, 3D <= 5 m từ chân+0.8, choáng 120 tick, đẩy 4 m trong 15 tick, +5 mỗi con', () => {
  const g = mk({ player: { carried: 5 }, shades: [{ id: 'S1', pos: [3, 1, 0] }, { id: 'S2', pos: [0, 1, 6] }] });
  const ev = g.step({ pulse: true });
  assert.deepEqual(ev.find((e) => e.name === 'pulse').data, { stunned_ids: ['S1'] });
  assert.equal(g.player.carried, 2);
  assert.equal(g.score, 5);
  run(g, 14);
  near(g.shades[0].pos[0], 7, 1e-6);
  assert.equal(g.shades[0].state, 'stunned');
  run(g, 105);
  assert.equal(g.shades[0].state, 'stunned');
  g.step({});
  assert.notEqual(g.shades[0].state, 'stunned');
  const g2 = mk({ player: { carried: 2 }, shades: [{ pos: [3, 1, 0] }] });
  assert.equal(g2.step({ pulse: true }).filter((e) => e.name === 'pulse').length, 0); // thiếu đom đóm
});

test('Gió Lạc: chase khi mang >= 5 và <= 15 m, cướp min(3, mang), Tỏa Sáng lúc flee thì thả lại', () => {
  const g = mk({ player: { carried: 6 }, drifters: [{ id: 'D1', pos: [5, 1.5, 0] }] }, 2);
  let steal = null;
  for (let i = 0; i < 60 && !steal; i++) steal = g.step({}).find((e) => e.name === 'drifter_steal');
  assert.deepEqual(steal.data, { drifter_id: 'D1', amount: 3, carried: 3 });
  assert.equal(g.drifters[0].state, 'flee');
  g.step({});
  const ev = g.step({ pulse: true });
  assert.deepEqual(ev.find((e) => e.name === 'drifter_drop').data, { drifter_id: 'D1', amount: 3 });
  assert.equal(g.motes.filter((m) => m.kind === 'dropped').length, 3);
  run(g, 120);
  assert.equal(g.drifters[0].state, 'removed');
});

test('Gió Lạc đang chase trúng Tỏa Sáng thì flee không cướp', () => {
  const g = mk({ player: { carried: 8 }, drifters: [{ id: 'D1', pos: [4, 1.5, 0], state: 'chase' }] }, 2);
  g.step({ pulse: true });
  assert.equal(g.drifters[0].state, 'flee');
  assert.equal(run(g, 30).filter((e) => e.name === 'drifter_steal').length, 0);
});

test('Bùa Gió: nhặt => 600 tick, chạy 7.2 m/s, lướt không hồi chiêu, xuất hiện lại sau 2700 tick', () => {
  const g = mk({ player: { pos: [34.5, 0, 0] } }, 2);
  const ev = g.step({});
  assert.deepEqual(ev.find((e) => e.name === 'charm_picked').data, { charm_id: 'C1', charm_ticks: 600 });
  const x0 = g.player.pos[0];
  g.step({ move: [1, 0] });
  near(g.player.pos[0] - x0, 7.2 / 60);
  g.step({ dash: true }); run(g, 12, { dash: false });
  assert.equal(g.step({ dash: true }).filter((e) => e.name === 'dash').length, 1);
  assert.equal(g.charms[0].available, false);
  run(g, 2700 - 15);
  assert.equal(g.charms[0].available, true);
});

test('Đêm 2: bục nhảy bắn sang đảo kia (~1.4 s), đáp trong đảo đích', () => {
  const g = mk({ player: { pos: [20, 0, 18] } }, 2);
  const ev = run(g, 120);
  assert.equal(ev.filter((e) => e.name === 'player_hit').length, 0);
  const p = g.player.pos;
  assert.ok(Math.hypot(p[0] - 70, p[2]) <= 28, `pos=${p}`);
  assert.equal(g.player.grounded, true);
});

test('Đêm 2: đi ra khỏi cầu tre (không lan can) thì rơi', () => {
  const g = mk({ player: { pos: [35, 0, 0] } }, 2);
  const ev = run(g, 200, { move: [0, 1] });
  assert.equal(ev.find((e) => e.name === 'player_hit').data.by, 'fall');
});

test('Đêm 3: vách tầng chặn, dốc đi lên được tầng 1, tháp chuông chặn, bục nhảy lên tầng 2', () => {
  const g = mk({ player: { pos: [0, 0, 26] } }, 3); // tầng 0 ngay dưới vách tầng 1 (r 24)
  run(g, 30, { move: [0, -1] });
  assert.ok(g.player.pos[2] >= 24 - 1e-6 && g.player.pos[1] === 0);
  const a = (30 * Math.PI) / 180;
  const g2 = mk({ player: { pos: [31 * Math.cos(a), 0, 31 * Math.sin(a)] } }, 3);
  run(g2, 120, { move: [-Math.cos(a), -Math.sin(a)] }); // đi vào tâm theo dốc 30°
  near(g2.player.pos[1], 3, 1e-6);
  const g3 = mk({ player: { pos: [0, 6, 5] } }, 3);
  run(g3, 120, { move: [0, -1] });
  assert.ok(Math.hypot(g3.player.pos[0], g3.player.pos[2]) >= 2 - 1e-6);
  const g4 = mk({ player: { pos: [0, 3, 13] } }, 3);
  run(g4, 120);
  near(g4.player.pos[1], 6); assert.ok(Math.hypot(g4.player.pos[0], g4.player.pos[2]) <= 8);
});

test('Đêm 3: gió mạnh mỗi 30 s kéo dài 5 s', () => {
  const g = new Game(T, { seed: 3, night: 3, scenario: { random_shades: false, random_drifters: false, wind_enabled: true } });
  run(g, 1799);
  assert.equal(g.snapshot().wind.active, false);
  g.step({});
  assert.equal(g.snapshot().wind.active, true);
  run(g, 300);
  assert.equal(g.snapshot().wind.active, false);
});

test('lịch sinh: 2 Bóng Mực ở tick 300 (S1, S2, spawning, cách >= 15 m), đom đóm +1 ở tick 240', () => {
  const g = new Game(T, { seed: 5, night: 1, scenario: { random_drifters: false } });
  run(g, 239);
  assert.equal(g.motes.length, 20);
  g.step({});
  assert.equal(g.motes.length, 21);
  const ev = run(g, 60);
  assert.deepEqual(ev.filter((e) => e.name === 'shade_spawned').map((e) => [e.tick, e.data.id]), [[300, 'S1'], [300, 'S2']]);
  assert.ok(g.shades.every((s) => s.state === 'spawning' && Math.hypot(s.pos[0], s.pos[2]) > 36));
  const ev2 = run(g, 480);
  assert.deepEqual(ev2.filter((e) => e.name === 'shade_spawned').map((e) => e.tick), [780]);
});

// Đã XÓA test 'thắng xét trước hết giờ: thắp đèn cuối đúng tick hết giờ vẫn thắng' (Phase 2):
// Ticket-03 [THAY THẾ] luật thắng; thay bằng các test dawn_survived bên dưới.
test('Ticket-03: thắp đủ đèn KHÔNG kết thúc Đêm', () => {
  const lit = ['L2', 'L3', 'L4', 'L5'].map((id) => ({ id, lit: true }));
  const g = mk({ player: { pos: [0, 0, 24], carried: 10 }, lanterns: lit });
  g.step({ interact: true });
  assert.equal(g.litCount(), 5);
  assert.equal(g.state, 'playing');
});

test('Ticket-03: bình minh với >= ceil(0.6 × tổng) đèn sáng => thắng dawn_survived, điểm thưởng mới', () => {
  const lit = ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true, fuel: 50 }));
  const g = mk({ lanterns: lit, time_left_s: 1 });
  const ev = run(g, 60);
  assert.deepEqual(ev.at(-1).data, { result: 'won', reason: 'dawn_survived' });
  // 3 đèn × (50 + floor(49)) + 3 lửa × 50
  assert.equal(g.score, 3 * (50 + 49) + 150);
  assert.deepEqual([1, 2, 3].map((n) => new Game(T, { night: n }).winNeed), [3, 4, 5]);
});

test('Ticket-03: bình minh mà thiếu đèn => thua dawn; hết lửa ở tick cuối => no_flames', () => {
  const g = mk({ lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }], time_left_s: 1 });
  assert.deepEqual(run(g, 60).at(-1).data, { result: 'lost', reason: 'dawn' });
  const lit = ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true }));
  const g2 = mk({ player: { flames: 1 }, lanterns: lit, shades: [{ pos: [0, 1, 0] }], time_left_s: 1 / 60 });
  assert.deepEqual(g2.step({}).at(-1).data, { result: 'lost', reason: 'no_flames' });
});

test('dầu: hao 1/giây, hết dầu => tắt, deposited=0, lantern_out, ever_lit giữ', () => {
  const g = mk({ lanterns: [{ id: 'L1', lit: true, fuel: 1 }] });
  run(g, 59);
  assert.equal(g.snapshot().lanterns[0].fuel, 0);
  assert.equal(g.lanterns[0].lit, true);
  const ev = g.step({});
  assert.deepEqual(ev.find((e) => e.name === 'lantern_out').data, { lantern_id: 'L1' });
  const l = g.snapshot().lanterns[0];
  assert.deepEqual([l.lit, l.fuel, l.deposited, l.ever_lit], [false, 0, 0, true]);
});

test('thắp lại: đèn ever_lit chỉ cần 5, relight=true, +40, relit_count++', () => {
  const g = mk({ player: { pos: [0, 0, 24], carried: 7 }, lanterns: [{ id: 'L1', lit: false, ever_lit: true }] });
  const ev = g.step({ interact: true });
  assert.deepEqual(ev.map((e) => e.name), ['deposit', 'lantern_lit']);
  assert.deepEqual(ev[1].data, { lantern_id: 'L1', relight: true });
  assert.equal(g.score, 5 * 5 + 40);
  const l = g.snapshot().lanterns[0];
  assert.deepEqual([l.lit, l.fuel, l.relit_count, g.player.carried], [true, 100, 1, 2]);
});

test('châm dầu: used = min(mang, ceil((100-fuel)/10)), fuel = min(100, fuel+10×used)', () => {
  const g = mk({ player: { pos: [0, 0, 24], carried: 9 }, lanterns: [{ id: 'L1', lit: true, fuel: 55.5 }] });
  const ev = g.step({ interact: true });
  assert.deepEqual(ev[0], { type: 'event', tick: 1, name: 'refuel', data: { lantern_id: 'L1', amount: 5, fuel: 100 } });
  assert.equal(g.player.carried, 4);
  assert.equal(g.score, 25);
});

test('đèn đầy dầu (fuel = 100) không được chọn khi tương tác', () => {
  const g = mk({ player: { pos: [0, 0, 24], carried: 3 }, lanterns: [{ id: 'L1', lit: true }] });
  g.lanterns[0].fuelU = g.FUEL_MAX_U + 1; // sau bước 2 vẫn = 100
  assert.equal(g.step({ interact: true }).length, 0);
  assert.equal(g.player.carried, 3);
});

test('sức chứa = 10 + 2 × successful_lights, tối đa 20', () => {
  const g = mk({ player: { pos: [0, 0, 24], carried: 10 } });
  assert.equal(g.snapshot().player.capacity, 10);
  g.step({ interact: true });
  assert.equal(g.snapshot().player.capacity, 12);
  assert.equal(mk({ player: { successful_lights: 9 } }).capacity, 20);
});

test('fuel < 30 mất vùng an toàn; đúng 30 vẫn còn', () => {
  const g = mk({ lanterns: [{ id: 'L1', lit: true, fuel: 30 }] });
  assert.ok(g.hasZone(g.lanterns[0]));
  g.lanterns[0].fuelU -= 1;
  assert.ok(!g.hasZone(g.lanterns[0]));
});

test('Bóng Mực wander tới đèn yếu, hút dầu (drain) 5/giây + hao 1/giây, fuel_drain mỗi 60 tick', () => {
  const g = mk({ player: { pos: [-30, 0, 0] }, lanterns: [{ id: 'L1', lit: true, fuel: 25 }], shades: [{ id: 'S1', pos: [0, 1, 20], state: 'wander' }] });
  let drainAt = null;
  for (let i = 0; i < 200 && drainAt === null; i++) { g.step({}); if (g.shades[0].state === 'drain') drainAt = g.tick; }
  assert.ok(drainAt !== null);
  assert.ok(Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2] - 25) <= 2 + 1e-6);
  const f0 = g.lanterns[0].fuelU;
  const ev = run(g, 60);
  assert.equal(f0 - g.lanterns[0].fuelU, 60 * 6);
  assert.deepEqual(ev.filter((e) => e.name === 'fuel_drain').map((e) => e.data.shade_id), ['S1']);
});

test('drain -> chase khi Mây vào 6 m; Tỏa Sáng trúng bóng đang drain +15', () => {
  const g = mk({ player: { pos: [0, 0, 14], carried: 3 }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [0, 1, 23], state: 'drain', target_lantern_id: 'L1' }] });
  g.step({});
  assert.equal(g.shades[0].state, 'drain');
  const g2 = mk({ player: { pos: [0, 0, 19.5], carried: 3 }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [0, 1, 23], state: 'drain', target_lantern_id: 'L1' }] });
  g2.step({ pulse: true });
  assert.equal(g2.score, 15);
  assert.equal(g2.shades[0].state, 'stunned');
  const g3 = mk({ player: { pos: [0, 0, 18] }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [0, 1, 23], state: 'drain', target_lantern_id: 'L1' }] });
  g3.step({});
  assert.equal(g3.shades[0].state, 'chase');
});

test('châm đèn lên >= 30 khi bóng đang hút => bóng bị đẩy ra mép 6 m trong <= 30 tick, không gây sát thương', () => {
  const g = mk({ player: { pos: [0, 0, 26.5], carried: 2 }, lanterns: [{ id: 'L1', lit: true, fuel: 20 }],
    shades: [{ id: 'S1', pos: [0, 1, 24], state: 'drain', target_lantern_id: 'L1' }] });
  const ev = [...g.step({ interact: true }), ...run(g, 30)];
  assert.ok(ev.some((e) => e.name === 'refuel'));
  assert.equal(ev.filter((e) => e.name === 'player_hit').length, 0);
  assert.ok(Math.hypot(g.shades[0].pos[0], g.shades[0].pos[2] - 25) >= 6 - 1e-6);
  assert.notEqual(g.shades[0].state, 'drain');
});

test('hết choáng thì về wander (Ticket-03)', () => {
  const g = mk({ player: { carried: 3 }, shades: [{ id: 'S1', pos: [3, 1, 0] }] });
  g.step({ pulse: true });
  run(g, 119);
  assert.equal(g.shades[0].state, 'stunned');
  g.player.pos = [-30, 0, 0]; // Mây ở xa (> 12 m) để wander không chuyển ngay sang chase
  g.step({});
  assert.equal(g.shades[0].state, 'wander');
});

test('hết giờ => thua dawn', () => {
  const g = mk({ time_left_s: 1 });
  const ev = run(g, 100);
  assert.equal(g.tick, 60);
  assert.deepEqual(ev.at(-1).data, { result: 'lost', reason: 'dawn' });
});

test('dựng scenario không phát sự kiện, không cộng điểm; đèn cập nhật theo id', () => {
  const g = mk({ lanterns: [{ id: 'L1', lit: true }] });
  assert.equal(g.score, 0);
  assert.deepEqual(g.lanterns.map((l) => l.lit), [true, false, false, false, false]);
});

test('InputTimeline + validateScenario', () => {
  const tl = new InputTimeline({ frames: [{ tick: 0, move: [1, 0] }, { tick: 5, dash: true, pause: false }] });
  assert.equal(tl.at(5).dash, true);
  assert.deepEqual(tl.at(6).move, [1, 0]);
  assert.throws(() => new InputTimeline({ frames: [{ tick: 3 }, { tick: 3 }] }));
  assert.notEqual(validateScenario({ shades: [{ pos: [0, 0, 0], state: 'angry' }] }), null);
  assert.equal(validateScenario({ drifters: [{ pos: [0, 0, 0] }], charms: [{ id: 'C1', available: false }] }), null);
});
