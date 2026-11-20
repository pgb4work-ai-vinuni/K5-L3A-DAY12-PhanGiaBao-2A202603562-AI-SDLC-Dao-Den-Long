// Test Phase 4 (Ticket-04): benchmark (cảnh chuẩn + thống kê), soak, bảng xếp hạng. Chạy: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createBenchGame, benchCamera, benchStats, BENCH } from '../src/core/bench.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'game.contract.json'))).tuning;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl4-'));

test('bench: cảnh chuẩn đúng 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng fuel 100, Mây ở (0,0,0)', () => {
  const g = createBenchGame(T, 42);
  const s = g.snapshot();
  assert.equal(s.shades.length, 200);
  assert.ok(s.shades.every((x) => x.state === 'wander' || x.state === 'chase'));
  assert.equal(s.motes.length, 100);
  assert.deepEqual(s.lanterns.slice(0, 3).map((l) => [l.lit, l.fuel]), [[true, 100], [true, 100], [true, 100]]);
  assert.deepEqual(s.player.pos, [0, 0, 0]);
  assert.ok(s.shades.every((x) => Math.hypot(x.pos[0], x.pos[2]) <= 40));
});

test('bench: tắt sinh thêm, sát thương, nhặt, hao dầu, kết thúc; Bóng Mực vẫn di chuyển', () => {
  const g = createBenchGame(T, 42);
  const before = g.snapshot().shades.map((x) => x.pos.join());
  const ev = [];
  for (let i = 0; i < 60 * 60; i++) ev.push(...g.step({}));
  const s = g.snapshot();
  assert.equal(ev.length, 0);
  assert.equal(s.shades.length, 200);
  assert.equal(s.motes.length, 100);
  assert.equal(s.player.flames, 3);
  assert.equal(s.lanterns[0].fuel, 100);
  assert.equal(s.state, 'playing');
  assert.notDeepEqual(s.shades.map((x) => x.pos.join()), before);
  assert.deepEqual(createBenchGame(T, 42).snapshot(), createBenchGame(T, 42).snapshot()); // tất định theo seed
});

test('bench: camera bay vòng r30, Y15, xuất phát (30,15,0), ngược chiều kim đồng hồ, 15 s/vòng', () => {
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  assert.ok(near(benchCamera(0), [30, 15, 0]));
  assert.ok(near(benchCamera(BENCH.LAP_S / 4), [0, 15, 30]));
  assert.ok(near(benchCamera(BENCH.LAP_S), [30, 15, 0]));
});

test('bench: thống kê đúng định nghĩa (avg_fps, p1_low_fps, p95)', () => {
  const dts = [...Array(98).fill(10), 50, 100]; // N = 100, k = 1
  const s = benchStats(dts);
  assert.equal(s.frames, 100);
  assert.equal(s.avg_fps, Math.round((1000 * 100) / (980 + 150) * 10) / 10);
  assert.equal(s.p1_low_fps, 10); // 1000 / 100
  assert.equal(s.frame_ms_p95, 10);
});

test('soak: 10 Đêm trong một tiến trình, 0 crash, ghi đủ trường', () => {
  const out = path.join(tmp, 'soak.json');
  const r = spawnSync(process.execPath, ['--expose-gc', '--jitless', path.join(ROOT, 'src', 'soak.js'), '--seed', '7', '--nights', '10', '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(j.nights, 10);
  assert.equal(j.crashes, 0);
  assert.equal(j.results.length, 10);
  for (const k of ['mem_start_mb', 'mem_end_mb', 'duration_s']) assert.equal(typeof j[k], 'number');
});

test('bảng xếp hạng: lưu đĩa, top 10, điểm giảm dần, bằng điểm thì ai đạt trước đứng trên; lệnh xuất', async () => {
  const file = path.join(tmp, 'lb.json');
  const env = { ...process.env, DDL_LEADERBOARD: file };
  const code = `
    const LB = await import(${JSON.stringify('file:///' + path.join(ROOT, 'scripts', 'leaderboard.js').replace(/\\/g, '/'))});
    for (let i = 0; i < 12; i++) LB.add({ name: 'Mây_' + i, score: i % 3 === 0 ? 500 : i * 10, nights_won: 1, achieved_at: new Date(Date.UTC(2026, 10, 20, 10, i)).toISOString(), seed: i });
    let bad = 0; for (const n of ['ab', 'tên có cách', 'x'.repeat(13)]) { try { LB.add({ name: n, score: 1, nights_won: 0, achieved_at: new Date().toISOString(), seed: 1 }); } catch { bad++; } }
    LB.add({ name: 'Đăng', score: 1, nights_won: 0, achieved_at: new Date().toISOString(), seed: 1 });
    console.log(bad);`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), '3');
  const out = path.join(tmp, 'export.json');
  const e = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'serve.js'), '--export-leaderboard', out], { encoding: 'utf8', env });
  assert.equal(e.status, 0, e.stderr);
  const { entries } = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(entries.length, 10);
  assert.deepEqual(entries.slice(0, 4).map((x) => x.name), ['Mây_0', 'Mây_3', 'Mây_6', 'Mây_9']);
  for (let i = 1; i < entries.length; i++) assert.ok(entries[i - 1].score >= entries[i].score);
  for (const k of ['name', 'score', 'nights_won', 'achieved_at', 'seed']) assert.ok(k in entries[0], k);
});
