// Bản đồ chuẩn (Ticket-02 Phần 2). Góc đo từ +X: điểm = (r·cosθ, y, r·sinθ).
const rad = (d) => (d * Math.PI) / 180;
const ring = (cx, cz, r, degs, y = 0) => degs.map((d) => [cx + r * Math.cos(rad(d)), y, cz + r * Math.sin(rad(d))]);
const range = (start, step, n) => Array.from({ length: n }, (_, i) => start + i * step);
const lan = (list) => list.map((pos, i) => ({ id: `L${i + 1}`, pos }));

// ---- Đêm 1: Đảo Bến ----
const night1 = {
  night: 1,
  name: 'Đảo Bến',
  durationKey: 'night1_duration_s',
  start: [0, 0, 0],
  lanterns: lan([[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]]),
  moteSpawns: [...ring(0, 0, 12, range(0, 45, 8)), ...ring(0, 0, 33, range(0, 22.5, 16))],
  shadeSpawns: ring(0, 0, 37, range(15, 30, 12), 1),
  shadeFirstTick: 300, shadeEveryTicks: 480, shadeMax: 6, shadeSpeed: null,
  pads: [], charms: [], drifters: false, wind: false,
  ground(x, z) { return x * x + z * z <= 40 * 40 ? 0 : null; },
  obstacles: [],
};

// ---- Đêm 2: Đảo Cau ----
const night2 = {
  night: 2,
  name: 'Đảo Cau',
  durationKey: 'night2_duration_s',
  start: [0, 0, 0],
  lanterns: lan([[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]]),
  moteSpawns: [0, 70].flatMap((cx) => [...ring(cx, 0, 10, [0, 90, 180, 270]), ...ring(cx, 0, 22, range(0, 45, 8))]),
  shadeSpawns: [0, 70].flatMap((cx) => ring(cx, 0, 26, range(22.5, 45, 8), 1)),
  shadeFirstTick: 300, shadeEveryTicks: 420, shadeMax: 8, shadeSpeed: null,
  pads: [
    { pos: [20, 0, 18], r: 1, vy: 14, hspeed: 24, target: [70, 0, 0] },
    { pos: [50, 0, -18], r: 1, vy: 14, hspeed: 24, target: [0, 0, 0] },
  ],
  charms: [{ id: 'C1', pos: [35, 0, 0] }],
  drifters: true, wind: false,
  ground(x, z) {
    if (x * x + z * z <= 28 * 28) return 0;
    if ((x - 70) * (x - 70) + z * z <= 28 * 28) return 0;
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0; // cầu tre
    return null;
  },
  obstacles: [],
};

// ---- Đêm 3: Đảo Chuông ----
const RAMPS = [30, 150].map((d) => ({ ux: Math.cos(rad(d)), uz: Math.sin(rad(d)) }));
const night3 = {
  night: 3,
  name: 'Đảo Chuông',
  durationKey: 'night3_duration_s',
  start: [0, 0, -30], // giả định: tâm đảo là tháp chuông nên xuất phát ở tầng 0 phía nam
  lanterns: lan([[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]]),
  moteSpawns: [
    ...ring(0, 0, 34, range(0, 20, 18), 0),
    ...ring(0, 0, 18, range(20, 20, 8), 3),
    ...ring(0, 0, 5, [45, 135, 225, 315], 6),
  ],
  shadeSpawns: ring(0, 0, 43, range(0, 22.5, 16), 1),
  shadeFirstTick: 300, shadeEveryTicks: 360, shadeMax: 10, shadeSpeed: 4.5,
  pads: [{ pos: [0, 3, 13], r: 1, vy: 12, hspeed: 8, dir: [0, -1] }],
  charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }],
  drifters: true, wind: true,
  ground(x, z) {
    const r = Math.hypot(x, z);
    if (r > 45) return null;
    if (r <= 8) return 6;                       // tầng 2
    if (z > 0 && r >= 12 && r <= 24) return 3;  // tầng 1 (nửa z > 0)
    for (const rp of RAMPS) {                   // dốc: r 30 (Y=0) -> r 24 (Y=3), rộng 3 m
      const s = x * rp.ux + z * rp.uz;
      const t = -x * rp.uz + z * rp.ux;
      if (s >= 24 && s <= 30 && Math.abs(t) <= 1.5) return (3 * (30 - s)) / 6;
    }
    return 0;
  },
  obstacles: [{ pos: [0, 6, 0], r: 2, top: 14 }], // tháp chuông, không leo được
};

export const MAPS = { 1: night1, 2: night2, 3: night3 };
