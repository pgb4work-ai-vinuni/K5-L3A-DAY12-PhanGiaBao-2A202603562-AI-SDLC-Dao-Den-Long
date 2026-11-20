// Đọc/kiểm tra file inputs và scenario theo Test Contract v1.0.
const BUTTONS = ['jump', 'interact', 'pulse', 'dash'];
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isNum);

export class InputTimeline {
  constructor(doc) {
    if (!doc || typeof doc !== 'object' || !Array.isArray(doc.frames)) throw new Error('cần {"frames": [...]}');
    let last = -1;
    this.frames = doc.frames.map((f, i) => {
      if (!f || typeof f !== 'object' || !Number.isInteger(f.tick) || f.tick < 0) throw new Error(`frame ${i}: tick phải là số nguyên >= 0`);
      if (f.tick <= last) throw new Error(`frame ${i}: tick phải tăng nghiêm ngặt`);
      last = f.tick;
      if (f.move !== undefined && !(Array.isArray(f.move) && f.move.length === 2 && f.move.every(isNum))) throw new Error(`frame ${i}: move phải là [x, z]`);
      if (f.cam_yaw_deg !== undefined && !isNum(f.cam_yaw_deg)) throw new Error(`frame ${i}: cam_yaw_deg phải là số`);
      for (const b of BUTTONS) if (f[b] !== undefined && typeof f[b] !== 'boolean') throw new Error(`frame ${i}: ${b} phải là boolean`);
      return f;
    });
    this.cur = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false };
    this.idx = 0;
  }
  // Gọi tuần tự k = 0,1,2...; trường vắng mặt giữ giá trị cũ.
  at(k) {
    while (this.idx < this.frames.length && this.frames[this.idx].tick <= k) {
      const f = this.frames[this.idx++];
      if (f.move) this.cur.move = f.move.map((v) => Math.max(-1, Math.min(1, v)));
      if (f.cam_yaw_deg !== undefined) this.cur.cam_yaw_deg = f.cam_yaw_deg;
      for (const b of BUTTONS) if (f[b] !== undefined) this.cur[b] = f[b];
    }
    return this.cur;
  }
}

export function validateScenario(sc) {
  if (!sc || typeof sc !== 'object' || Array.isArray(sc)) return 'scenario phải là object';
  if (sc.player !== undefined) {
    const p = sc.player;
    if (!p || typeof p !== 'object') return 'player phải là object';
    if (p.pos !== undefined && !isVec3(p.pos)) return 'player.pos phải là [x,y,z]';
    if (p.carried !== undefined && !(Number.isInteger(p.carried) && p.carried >= 0)) return 'player.carried';
    if (p.flames !== undefined && !(Number.isInteger(p.flames) && p.flames >= 0)) return 'player.flames';
  }
  for (const k of ['random_motes', 'random_shades']) if (sc[k] !== undefined && typeof sc[k] !== 'boolean') return `${k} phải là boolean`;
  if (sc.motes !== undefined) {
    if (!Array.isArray(sc.motes)) return 'motes phải là mảng';
    for (const m of sc.motes) if (!(isVec3(m) || (m && isVec3(m.pos)))) return 'mỗi mote phải là [x,y,z]';
  }
  if (sc.shades !== undefined) {
    if (!Array.isArray(sc.shades)) return 'shades phải là mảng';
    for (const s of sc.shades) if (!s || !isVec3(s.pos)) return 'mỗi shade cần pos [x,y,z]';
  }
  if (sc.lanterns !== undefined) {
    if (!Array.isArray(sc.lanterns)) return 'lanterns phải là mảng';
    for (const l of sc.lanterns) {
      if (!l || typeof l.id !== 'string') return 'mỗi lantern cần id';
      if (l.pos !== undefined && !isVec3(l.pos)) return 'lantern.pos phải là [x,y,z]';
      if (l.lit !== undefined && typeof l.lit !== 'boolean') return 'lantern.lit phải là boolean';
      if (l.deposited !== undefined && !(Number.isInteger(l.deposited) && l.deposited >= 0)) return 'lantern.deposited';
    }
  }
  if (sc.time_left_s !== undefined && !(isNum(sc.time_left_s) && sc.time_left_s >= 0)) return 'time_left_s phải là số >= 0';
  return null;
}
