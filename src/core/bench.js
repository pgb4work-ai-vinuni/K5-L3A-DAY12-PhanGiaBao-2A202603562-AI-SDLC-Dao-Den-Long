// Cảnh benchmark chuẩn (Ticket-04 mục 1): Đêm 1, đúng 200 Bóng Mực wander rải đều trên đảo (theo seed),
// đúng 100 đom đóm, L1–L3 sáng fuel 100. Tắt sinh thêm, sát thương, nhặt, hao dầu và điều kiện kết thúc.
import { Game } from './game.js';
import { makeRng } from './rng.js';

export const BENCH = { SHADES: 200, MOTES: 100, ISLAND_R: 38, CAM_R: 30, CAM_Y: 15, LAP_S: 15, WARMUP_S: 3 };

function spread(rng, n, rMax, y) {
  // Rải đều theo diện tích (sqrt) trên đĩa bán kính rMax
  return Array.from({ length: n }, () => {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * rMax;
    return [r * Math.cos(a), y, r * Math.sin(a)];
  });
}

export function createBenchGame(tuning, seed = 42) {
  const rng = makeRng(seed);
  const scenario = {
    random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false,
    motes: spread(rng, BENCH.MOTES, BENCH.ISLAND_R, 0),
    shades: spread(rng, BENCH.SHADES, BENCH.ISLAND_R, 1).map((pos) => ({ pos, state: 'wander' })),
    lanterns: ['L1', 'L2', 'L3'].map((id) => ({ id, lit: true, fuel: 100 })),
  };
  return new Game(tuning, { seed, night: 1, scenario, bench: true });
}

// Camera bay vòng: tâm (0,0,0), r 30, Y 15, xuất phát (30,15,0), ngược chiều kim đồng hồ nhìn từ trên, 15 s/vòng.
export function benchCamera(tSec) {
  const a = (2 * Math.PI * tSec) / BENCH.LAP_S;
  return [BENCH.CAM_R * Math.cos(a), BENCH.CAM_Y, BENCH.CAM_R * Math.sin(a)];
}

// Thống kê theo định nghĩa của Ticket-04 từ danh sách dt (ms) của các khung hình trong khoảng đo.
export function benchStats(dts) {
  const N = dts.length;
  const sum = dts.reduce((a, b) => a + b, 0);
  const sorted = [...dts].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(0.01 * N));
  const worst = sorted.slice(N - k);
  const p95 = sorted[Math.min(N - 1, Math.ceil(0.95 * N) - 1)];
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    frames: N,
    avg_fps: r1((1000 * N) / sum),
    p1_low_fps: r1(1000 / (worst.reduce((a, b) => a + b, 0) / k)),
    frame_ms_p95: r1(p95),
  };
}
