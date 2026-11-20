// Logic game thuần (không DOM, không WebGL). Dùng chung cho headless và bản web.
// Bám Ticket-02 + Test Contract v1.1. Giả định: docs/notes/phase-2-assumptions.md.
import { WORLD as W } from './world.js';
import { MAPS } from './maps.js';
import { makeRng } from './rng.js';

const TR = W.TICK_RATE;
const EPS = 1e-6; // dung sai cho so sánh "<= r"

export function r3(v) {
  const x = Math.round(v * 1000) / 1000;
  return Object.is(x, -0) ? 0 : x;
}
export function distXZ(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
export function dist3(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
// Hướng di chuyển trong thế giới theo cam_yaw_deg (công thức contract).
export function rotateMove(move, yawDeg) {
  let [x, z] = move;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  const t = (yawDeg * Math.PI) / 180;
  const c = Math.cos(t), s = Math.sin(t);
  return [x * c + z * s, -x * s + z * c];
}
const idNum = (id) => { const m = /(\d+)$/.exec(id); return m ? Number(m[1]) : 0; };
const byId = (a, b) => (idNum(a.id) - idNum(b.id)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const norm2 = (x, z) => { const l = Math.hypot(x, z); return l < 1e-9 ? null : [x / l, z / l]; };

export class Game {
  /**
   * @param {object} tuning  phần "tuning" của game.contract.json
   * @param {object} opts    { seed, night, scenario }
   */
  constructor(tuning, opts = {}) {
    this.t = tuning;
    this.night = opts.night ?? 1;
    this.map = MAPS[this.night];
    if (!this.map) throw new Error(`night ${this.night} không tồn tại`);
    this.rng = makeRng(opts.seed ?? 0);
    this.tick = 0;
    this.simTick = 0;
    this.paused = false;
    this.state = 'playing';
    this.result = null;
    this.score = 0;
    this.timeLeftTicks = Math.round(tuning[this.map.durationKey] * TR);
    this.shadeSpeed = this.map.shadeSpeed ?? tuning.shade_speed;
    this.player = {
      pos: this.map.start.slice(), vel: [0, 0, 0], facing: [0, 1], grounded: true,
      flames: tuning.flames, carried: 0,
      invulnTicks: 0, dashCdTicks: 0, dashTicks: 0, dashDir: [0, 1],
      pulseCdTicks: 0, charmTicks: 0, launch: null, respawnTicks: 0,
    };
    this.lanterns = this.map.lanterns.map((l) => ({ id: l.id, pos: l.pos.slice(), lit: false, deposited: 0 }));
    this.shades = [];
    this.motes = [];
    this.drifters = [];
    this.charms = this.map.charms.map((c) => ({ id: c.id, pos: c.pos.slice(), available: true, respawnTicks: 0 }));
    this.wind = { active: false, dirDeg: 0, ticks: 0 };
    this.nextId = { M: 1, S: 1, D: 1 };
    this.randomMotes = true;
    this.randomShades = true;
    this.randomDrifters = this.map.drifters;
    this.windEnabled = this.map.wind;
    this.prevButtons = { jump: false, interact: false, pulse: false, dash: false, pause: false };
    this.applyScenario(opts.scenario || {});
  }

  ground(x, z) { return this.map.ground(x, z); }

  // ---------------- Dựng scenario: KHÔNG phát sự kiện, KHÔNG cộng điểm ----------------
  applyScenario(sc) {
    const p = this.player;
    const T = (s) => Math.round(s);
    if (sc.player) {
      const sp = sc.player;
      if (sp.pos) p.pos = sp.pos.slice(0, 3).map(Number);
      if (sp.carried !== undefined) p.carried = sp.carried;
      if (sp.flames !== undefined) p.flames = sp.flames;
      if (sp.invuln_ticks !== undefined) p.invulnTicks = T(sp.invuln_ticks);
      if (sp.dash_cd_ticks !== undefined) p.dashCdTicks = T(sp.dash_cd_ticks);
      if (sp.pulse_cd_ticks !== undefined) p.pulseCdTicks = T(sp.pulse_cd_ticks);
      if (sp.charm_ticks !== undefined) p.charmTicks = T(sp.charm_ticks);
      const h = this.ground(p.pos[0], p.pos[2]);
      p.grounded = h !== null && Math.abs(p.pos[1] - h) < 1e-6;
    }
    for (const [k, f] of [['random_motes', 'randomMotes'], ['random_shades', 'randomShades'],
      ['random_drifters', 'randomDrifters'], ['wind_enabled', 'windEnabled']]) {
      if (sc[k] !== undefined) this[f] = !!sc[k];
    }
    if (Array.isArray(sc.lanterns)) {
      for (const l of sc.lanterns) {
        const target = this.lanterns.find((x) => x.id === l.id);
        if (!target) continue;
        if (l.pos) target.pos = l.pos.slice(0, 3).map(Number);
        if (l.deposited !== undefined) target.deposited = l.deposited;
        if (l.lit !== undefined) target.lit = !!l.lit;
      }
    }
    if (Array.isArray(sc.motes)) {
      this.motes = sc.motes.map((m) => {
        const o = Array.isArray(m) ? { pos: m } : m;
        const pos = o.pos.slice(0, 3).map(Number);
        const kind = o.kind === 'dropped' ? 'dropped' : 'random';
        const id = o.id ? String(o.id) : `M${this.nextId.M}`;
        this.nextId.M++;
        const ttl = kind === 'dropped' ? Math.round((o.ttl_s ?? W.DROP_TTL / TR) * TR) : null;
        return { id, pos, kind, ttl, spawnIdx: this.spawnIndexOf(pos) };
      });
    } else if (this.randomMotes) {
      const idx = this.map.moteSpawns.map((_, i) => i);
      for (let i = 0; i < W.MOTES_START && idx.length; i++) {
        const j = Math.floor(this.rng() * idx.length);
        this.addRandomMote(idx.splice(j, 1)[0]);
      }
    }
    if (Array.isArray(sc.shades)) {
      this.shades = sc.shades.map((s) => {
        const id = s.id ? String(s.id) : `S${this.nextId.S}`;
        this.nextId.S++;
        const pos = s.pos.slice(0, 3).map(Number);
        const d = distXZ(pos, p.pos);
        const state = s.state || (d <= W.SHADE_DETECT + EPS ? 'chase' : 'wander');
        const sh = this.newShade(id, pos, state);
        if (s.state_ticks_left !== undefined) sh.stateTicks = T(s.state_ticks_left);
        else if (state === 'stunned') sh.stateTicks = Math.round(this.t.pulse_stun_s * TR);
        else if (state === 'recoil') sh.stateTicks = W.RECOIL_TICKS;
        else if (state === 'spawning') sh.stateTicks = W.SHADE_SPAWNING_TICKS;
        return sh;
      });
    }
    if (Array.isArray(sc.drifters)) {
      this.drifters = sc.drifters.map((d) => {
        const id = d.id ? String(d.id) : `D${this.nextId.D}`;
        this.nextId.D++;
        const dr = this.newDrifter(id, d.pos.slice(0, 3).map(Number));
        if (d.state) dr.state = d.state;
        if (d.stolen !== undefined) { dr.stolen = d.stolen; dr.hasStolen = d.stolen > 0; }
        if (dr.state === 'flee') { dr.ticks = W.DRIFTER_FLEE_TICKS; dr.hasStolen = true; }
        return dr;
      });
    }
    if (Array.isArray(sc.charms)) {
      this.charms = sc.charms.map((c, i) => ({
        id: c.id ? String(c.id) : `C${i + 1}`,
        pos: (c.pos || this.map.charms[i]?.pos || [0, 0, 0]).slice(0, 3).map(Number),
        available: c.available !== undefined ? !!c.available : true,
        respawnTicks: c.respawn_ticks !== undefined ? T(c.respawn_ticks)
          : c.respawn_s !== undefined ? T(c.respawn_s * TR) : 0,
      }));
      for (const c of this.charms) if (!c.available && c.respawnTicks === 0) c.respawnTicks = W.CHARM_RESPAWN;
    }
    if (sc.time_left_s !== undefined) this.timeLeftTicks = Math.round(sc.time_left_s * TR);
  }

  spawnIndexOf(pos) {
    return this.map.moteSpawns.findIndex((s) => Math.abs(s[0] - pos[0]) < 1e-3 && Math.abs(s[2] - pos[2]) < 1e-3);
  }
  addRandomMote(i) {
    const m = { id: `M${this.nextId.M++}`, pos: this.map.moteSpawns[i].slice(), kind: 'random', ttl: null, spawnIdx: i };
    this.motes.push(m);
    return m;
  }
  newShade(id, pos, state) {
    return { id, pos, state, stateTicks: 0, pushTicks: 0, pushDir: [1, 0], recoilDir: [1, 0], evicting: false, evictStep: 0, target: null };
  }
  newDrifter(id, pos) {
    return { id, pos, state: 'idle', stolen: 0, hasStolen: false, ticks: 0, removeTicks: 0, target: null };
  }
  litZoneOf(pos) {
    let best = null, bestD = Infinity;
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const d = distXZ(pos, l.pos);
      if (d < this.t.safe_radius - 1e-9 && d < bestD) { best = l; bestD = d; }
    }
    return best ? { l: best, d: bestD } : null;
  }
  blockedForShade(pos) {
    if (this.litZoneOf(pos)) return true;
    for (const o of this.map.obstacles) if (distXZ(pos, o.pos) < o.r) return true;
    return false;
  }
  hover(e, dy) {
    const h = this.ground(e.pos[0], e.pos[2]);
    if (h !== null) e.pos[1] = h + dy;
  }

  get timeLeftS() { return Math.max(0, this.timeLeftTicks) / TR; }
  // Còn bao nhiêu tick tới cơn gió kế tiếp (cho UI báo trước). null nếu không có gió.
  ticksToNextGust() {
    if (!this.windEnabled) return null;
    return W.WIND_EVERY - (this.simTick % W.WIND_EVERY);
  }
  startEvents() {
    return [{ type: 'event', tick: this.tick, name: 'night_start', data: { night: this.night } }];
  }

  // ---------------- Một bước: đọc input tick k, tạo trạng thái k+1 ----------------
  step(input = {}) {
    if (this.state !== 'playing') return [];
    const t = this.t, p = this.player;
    const events = [];
    const evTick = this.tick + 1;
    const emit = (name, data) => events.push({ type: 'event', tick: evTick, name, data });

    // 1. Input (pause trước)
    const btn = {};
    for (const k of Object.keys(this.prevButtons)) {
      const cur = !!input[k];
      btn[k] = cur && !this.prevButtons[k];
      this.prevButtons[k] = cur;
    }
    if (btn.pause) {
      this.paused = !this.paused;
      emit(this.paused ? 'paused' : 'resumed', {});
    }
    if (this.paused) { this.tick++; return events; }
    this.simTick++;

    // 2. Bộ đếm
    this.timeLeftTicks--;
    for (const k of ['dashCdTicks', 'pulseCdTicks', 'invulnTicks', 'charmTicks']) if (p[k] > 0) p[k]--;
    if (p.respawnTicks > 0 && --p.respawnTicks === 0) {
      p.pos = this.map.start.slice(); p.vel = [0, 0, 0]; p.launch = null; p.dashTicks = 0;
      p.grounded = true; p.invulnTicks = Math.round(t.invuln_s * TR);
    }
    for (const s of this.shades) {
      if (s.stateTicks > 0 && --s.stateTicks === 0) {
        const d = distXZ(s.pos, p.pos);
        if (s.state === 'spawning') s.state = d <= W.SHADE_DETECT + EPS ? 'chase' : 'wander';
        else if (s.state === 'stunned' || s.state === 'recoil') s.state = d <= W.SHADE_LOSE + EPS ? 'chase' : 'wander';
      }
    }
    this.motes = this.motes.filter((m) => m.kind !== 'dropped' || --m.ttl > 0);
    for (const c of this.charms) if (!c.available && c.respawnTicks > 0 && --c.respawnTicks === 0) c.available = true;
    for (const d of this.drifters) {
      if (d.state === 'flee' && d.ticks > 0 && --d.ticks === 0) d.state = 'removed';
      if (d.removeTicks > 0 && --d.removeTicks === 0) d.state = 'removed';
    }
    if (this.wind.active && --this.wind.ticks <= 0) this.wind.active = false;

    // 3. Di chuyển Mây (nhảy, lướt, bục nhảy, gió) rồi kiểm tra rơi
    if (p.respawnTicks === 0) this.movePlayer(input, btn, emit);

    // 4. Nhặt đom đóm và bùa
    if (p.respawnTicks === 0) {
      const keep = [];
      for (const m of this.motes) {
        if (p.carried < t.carry_capacity && distXZ(p.pos, m.pos) <= t.pickup_radius + EPS &&
            Math.abs(p.pos[1] - m.pos[1]) <= W.PICKUP_DY + EPS) {
          p.carried++;
          emit('mote_picked', { carried: p.carried });
        } else keep.push(m);
      }
      this.motes = keep;
      for (const c of this.charms) {
        if (c.available && distXZ(p.pos, c.pos) <= t.pickup_radius + EPS && Math.abs(p.pos[1] - c.pos[1]) <= W.PICKUP_DY + EPS) {
          c.available = false; c.respawnTicks = W.CHARM_RESPAWN;
          p.charmTicks = W.CHARM_TICKS;
          emit('charm_picked', { charm_id: c.id, charm_ticks: p.charmTicks });
        }
      }
    }

    // 5. Tương tác với đèn
    if (btn.interact && p.respawnTicks === 0 && p.carried > 0) {
      let best = null, bestD = Infinity;
      for (const l of [...this.lanterns].sort(byId)) {
        if (l.lit) continue;
        const d = distXZ(p.pos, l.pos);
        if (d <= t.interact_radius + EPS && d < bestD - 1e-9) { best = l; bestD = d; }
      }
      if (best) {
        const amount = Math.min(p.carried, Math.max(0, t.lantern_cost - best.deposited));
        if (amount > 0) {
          p.carried -= amount;
          best.deposited += amount;
          this.score += amount * t.score.per_mote;
          emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
        }
        if (best.deposited >= t.lantern_cost) {
          best.lit = true;
          this.score += t.score.per_lantern;
          emit('lantern_lit', { lantern_id: best.id });
        }
      }
    }

    // 6. Vùng an toàn: bóng đang ở trong bị đẩy ra mép trong <= 30 tick
    for (const s of this.shades) {
      const z = this.litZoneOf(s.pos);
      if (!z) { s.evicting = false; continue; }
      if (!s.evicting) { s.evicting = true; s.evictStep = Math.max((t.safe_radius - z.d) / W.SAFE_EVICT_TICKS, 1e-3); }
      const dir = norm2(s.pos[0] - z.l.pos[0], s.pos[2] - z.l.pos[2]) || [1, 0];
      const nd = Math.min(t.safe_radius, z.d + s.evictStep);
      s.pos[0] = z.l.pos[0] + dir[0] * nd;
      s.pos[2] = z.l.pos[2] + dir[1] * nd;
      if (nd >= t.safe_radius - 1e-9) s.evicting = false;
    }

    // 7. Tỏa Sáng
    if (btn.pulse && p.respawnTicks === 0 && p.pulseCdTicks === 0 && p.carried >= t.pulse_cost) {
      p.carried -= t.pulse_cost;
      p.pulseCdTicks = Math.round(t.pulse_cooldown_s * TR);
      const c = [p.pos[0], p.pos[1] + W.PULSE_CENTER_DY, p.pos[2]];
      const stunned = [];
      for (const s of [...this.shades].sort(byId)) {
        if (dist3(c, s.pos) <= t.pulse_radius + EPS) {
          s.state = 'stunned';
          s.stateTicks = Math.round(t.pulse_stun_s * TR);
          s.pushTicks = W.STUN_PUSH_TICKS;
          s.pushDir = norm2(s.pos[0] - p.pos[0], s.pos[2] - p.pos[2]) || [1, 0];
          s.evicting = false;
          stunned.push(s.id);
          this.score += t.score.per_stun;
        }
      }
      for (const d of [...this.drifters].sort(byId)) {
        if (d.state === 'removed' || dist3(c, d.pos) > t.pulse_radius + EPS) continue;
        if (d.state === 'chase') { d.state = 'flee'; d.ticks = W.DRIFTER_FLEE_TICKS; d.hasStolen = true; }
        else if (d.state === 'flee' && d.stolen > 0) {
          const amount = d.stolen;
          for (let i = 0; i < amount; i++) this.addDroppedMote(d.pos);
          d.stolen = 0;
          d.removeTicks = W.DRIFTER_DROP_REMOVE_TICKS;
          emit('drifter_drop', { drifter_id: d.id, amount });
        }
      }
      emit('pulse', { stunned_ids: stunned });
    }

    // 8. Di chuyển Bóng Mực và Gió Lạc
    this.moveShades();
    this.moveDrifters();

    // 9. Va chạm: Gió Lạc cướp trước, rồi Bóng Mực (theo id tăng dần)
    if (p.respawnTicks === 0) {
      for (const d of [...this.drifters].sort(byId)) {
        if (d.state !== 'chase' || distXZ(d.pos, p.pos) > W.DRIFTER_HIT_R + EPS) continue;
        const amount = Math.min(W.DRIFTER_STEAL, p.carried);
        p.carried -= amount;
        d.stolen = amount; d.hasStolen = true;
        d.state = 'flee'; d.ticks = W.DRIFTER_FLEE_TICKS;
        emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
      }
      if (p.invulnTicks === 0) {
        for (const s of [...this.shades].sort(byId)) {
          if ((s.state !== 'chase' && s.state !== 'wander') || s.evicting) continue;
          if (distXZ(s.pos, p.pos) > t.shade_hit_radius + EPS || Math.abs(p.pos[1] - s.pos[1]) > W.HIT_DY + EPS) continue;
          p.flames = Math.max(0, p.flames - 1);
          const dropped = Math.floor(p.carried * t.hit_drop_ratio);
          p.carried -= dropped;
          for (let i = 0; i < dropped; i++) this.addDroppedMote(p.pos, true);
          p.invulnTicks = Math.round(t.invuln_s * TR);
          s.state = 'recoil'; s.stateTicks = W.RECOIL_TICKS;
          s.recoilDir = norm2(s.pos[0] - p.pos[0], s.pos[2] - p.pos[2]) || [1, 0];
          emit('player_hit', { by: 'shade', flames: p.flames, dropped });
          break; // tối đa 1 lần mất Ngọn Lửa mỗi tick
        }
      }
    }

    // 10. Sinh theo lịch (thực thể mới chỉ tương tác từ tick sau)
    this.spawnScheduled(emit);

    // 11. Thắng / thua
    this.tick++;
    if (p.flames <= 0) this.finish('lost', 'no_flames', emit);
    else if (this.lanterns.every((l) => l.lit)) this.finish('won', 'all_lit', emit);
    else if (this.timeLeftTicks <= 0) { this.timeLeftTicks = 0; this.finish('lost', 'dawn', emit); }
    return events;
  }

  finish(result, reason, emit) {
    this.state = result;
    this.result = reason;
    if (result === 'won') {
      this.score += this.t.score.per_second_left * Math.floor(Math.max(0, this.timeLeftTicks) / TR);
      this.score += this.t.score.per_flame_left * this.player.flames;
    }
    emit('game_over', { result, reason });
  }

  addDroppedMote(center, ring = false) {
    let x = center[0], z = center[2];
    if (ring) {
      const a = this.rng() * Math.PI * 2;
      const r = W.DROP_RING_MIN + this.rng() * (W.DROP_RING_MAX - W.DROP_RING_MIN);
      x += r * Math.cos(a); z += r * Math.sin(a);
    }
    const h = this.ground(x, z);
    const y = h !== null ? h : (this.ground(center[0], center[2]) ?? center[1]);
    const m = { id: `M${this.nextId.M++}`, pos: [x, y, z], kind: 'dropped', ttl: W.DROP_TTL, spawnIdx: -1 };
    this.motes.push(m);
    return m;
  }

  movePlayer(input, btn, emit) {
    const t = this.t, p = this.player;
    const speed = p.charmTicks > 0 ? W.CHARM_SPEED : t.player_speed;
    const [mx, mz] = rotateMove(input.move || [0, 0], input.cam_yaw_deg || 0);
    const moving = Math.hypot(mx, mz) > 1e-9;
    if (moving) p.facing = norm2(mx, mz);

    // Lướt: cạnh nhấn, không đang lướt, hết hồi chiêu (Bùa Gió: không hồi chiêu)
    if (btn.dash && p.dashTicks === 0 && (p.dashCdTicks === 0 || p.charmTicks > 0)) {
      p.dashTicks = Math.round(t.dash_duration_s * TR);
      p.dashDir = moving ? norm2(mx, mz) : p.facing.slice();
      p.dashCdTicks = p.charmTicks > 0 ? 0 : Math.round(t.dash_cooldown_s * TR);
      emit('dash', {});
    }
    let hx, hz;
    if (p.dashTicks > 0) { hx = p.dashDir[0] * t.dash_speed; hz = p.dashDir[1] * t.dash_speed; p.dashTicks--; }
    else if (p.launch) { [hx, hz] = p.launch; }
    else { hx = mx * speed; hz = mz * speed; }
    if (this.wind.active) {
      const a = (this.wind.dirDeg * Math.PI) / 180;
      hx += Math.cos(a) * W.WIND_SPEED; hz += Math.sin(a) * W.WIND_SPEED;
    }

    const h0 = this.ground(p.pos[0], p.pos[2]);
    let grounded = h0 !== null && p.pos[1] <= h0 + 1e-6 && p.vel[1] <= 0;
    let vy = p.vel[1];
    let jumped = false;
    if (btn.jump && grounded) { vy = W.JUMP_SPEED; grounded = false; jumped = true; }

    // Ngang + vách đứng + tháp
    let nx = p.pos[0] + hx / TR, nz = p.pos[2] + hz / TR;
    const hn = this.ground(nx, nz);
    if (hn !== null && hn > p.pos[1] + W.STEP_UP) { nx = p.pos[0]; nz = p.pos[2]; hx = 0; hz = 0; p.launch = null; }
    for (const o of this.map.obstacles) {
      const d = Math.hypot(nx - o.pos[0], nz - o.pos[2]);
      if (d < o.r && p.pos[1] < o.top) {
        const dir = norm2(nx - o.pos[0], nz - o.pos[2]) || [1, 0];
        nx = o.pos[0] + dir[0] * o.r; nz = o.pos[2] + dir[1] * o.r;
      }
    }
    p.pos[0] = nx; p.pos[2] = nz;

    // Dọc
    const h = this.ground(nx, nz);
    const prevY = p.pos[1];
    let landed = false;
    if (grounded && !jumped && h !== null && Math.abs(h - prevY) <= W.STEP_UP) {
      p.pos[1] = h; vy = 0; landed = true; // bám mặt đất / dốc
    } else {
      vy -= W.GRAVITY / TR;
      p.pos[1] += vy / TR;
      if (h !== null && p.pos[1] <= h && prevY >= h - W.STEP_UP && vy <= 0) {
        p.pos[1] = h; vy = 0; landed = true; p.launch = null;
      }
    }
    p.grounded = landed;
    p.vel = [hx, vy, hz];

    // Bục nhảy
    if (p.grounded) {
      for (const pad of this.map.pads) {
        if (distXZ(p.pos, pad.pos) <= pad.r + EPS && Math.abs(p.pos[1] - pad.pos[1]) < 0.05) {
          const dir = pad.dir ? pad.dir : norm2(pad.target[0] - pad.pos[0], pad.target[2] - pad.pos[2]);
          p.launch = [dir[0] * pad.hspeed, dir[1] * pad.hspeed];
          p.vel = [p.launch[0], pad.vy, p.launch[1]];
          p.grounded = false;
          break;
        }
      }
    }

    // Rơi khỏi đảo: đúng 1 lần, bỏ qua bất tử
    if (t.fall_enabled && p.pos[1] < W.FALL_Y) {
      p.flames = Math.max(0, p.flames - 1);
      const lost = p.carried;
      p.carried = 0;
      p.respawnTicks = W.FALL_WAIT_TICKS;
      p.vel = [0, 0, 0]; p.launch = null; p.dashTicks = 0;
      emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }

  moveShades() {
    const p = this.player;
    for (const s of this.shades) {
      if (s.evicting) continue;
      const d = distXZ(s.pos, p.pos);
      let step = null; // [dx, dz]
      switch (s.state) {
        case 'stunned':
          if (s.pushTicks > 0) {
            s.pushTicks--;
            const k = this.t.pulse_push_m / W.STUN_PUSH_TICKS;
            const np = [s.pos[0] + s.pushDir[0] * k, s.pos[1], s.pos[2] + s.pushDir[1] * k];
            if (this.blockedForShade(np)) s.pushTicks = 0; else { s.pos[0] = np[0]; s.pos[2] = np[2]; }
          }
          break;
        case 'recoil':
          step = [s.recoilDir[0] * W.RECOIL_M / W.RECOIL_TICKS, s.recoilDir[1] * W.RECOIL_M / W.RECOIL_TICKS];
          break;
        case 'wander':
        case 'chase': {
          if (s.state === 'wander' && d <= W.SHADE_DETECT + EPS) s.state = 'chase';
          else if (s.state === 'chase' && d > W.SHADE_LOSE + EPS) s.state = 'wander';
          if (s.state === 'chase') {
            const v = Math.min(this.shadeSpeed / TR, d);
            if (d > 1e-9) step = [(p.pos[0] - s.pos[0]) / d * v, (p.pos[2] - s.pos[2]) / d * v];
          } else {
            if (!s.target || distXZ(s.pos, s.target) < 0.5) {
              const sp = this.map.shadeSpawns[Math.floor(this.rng() * this.map.shadeSpawns.length)];
              s.target = [sp[0] * 0.6, 0, sp[2] * 0.6];
            }
            const dt = distXZ(s.pos, s.target);
            const v = Math.min(W.SHADE_WANDER_SPEED / TR, dt);
            if (dt > 1e-9) step = [(s.target[0] - s.pos[0]) / dt * v, (s.target[2] - s.pos[2]) / dt * v];
          }
          break;
        }
        default: break; // spawning: đứng yên
      }
      if (step) {
        const np = [s.pos[0] + step[0], s.pos[1], s.pos[2] + step[1]];
        const z = this.litZoneOf(np);
        if (z) { // chặn ở mép vùng an toàn
          const dir = norm2(np[0] - z.l.pos[0], np[2] - z.l.pos[2]) || [1, 0];
          np[0] = z.l.pos[0] + dir[0] * this.t.safe_radius;
          np[2] = z.l.pos[2] + dir[1] * this.t.safe_radius;
        }
        for (const o of this.map.obstacles) {
          if (distXZ(np, o.pos) < o.r) {
            const dir = norm2(np[0] - o.pos[0], np[2] - o.pos[2]) || [1, 0];
            np[0] = o.pos[0] + dir[0] * o.r; np[2] = o.pos[2] + dir[1] * o.r;
          }
        }
        s.pos[0] = np[0]; s.pos[2] = np[2];
      }
      this.hover(s, W.SHADE_HOVER);
    }
  }

  moveDrifters() {
    const p = this.player;
    for (const d of this.drifters) {
      if (d.state === 'removed') continue;
      const dist = distXZ(d.pos, p.pos);
      const want = !d.hasStolen && p.respawnTicks === 0 && p.carried >= W.DRIFTER_CHASE_CARRY && dist <= W.DRIFTER_CHASE_DIST + EPS;
      if (d.state === 'idle' && want) d.state = 'chase';
      else if (d.state === 'chase' && !want) d.state = 'idle';
      let dir = null, v = 0;
      if (d.state === 'chase') { dir = norm2(p.pos[0] - d.pos[0], p.pos[2] - d.pos[2]); v = Math.min(W.DRIFTER_SPEED / TR, dist); }
      else if (d.state === 'flee') { dir = norm2(d.pos[0] - p.pos[0], d.pos[2] - p.pos[2]) || [1, 0]; v = W.DRIFTER_SPEED / TR; }
      else {
        if (!d.target || distXZ(d.pos, d.target) < 0.5) {
          const sp = this.map.shadeSpawns[Math.floor(this.rng() * this.map.shadeSpawns.length)];
          d.target = [sp[0], 0, sp[2]];
        }
        const dt = distXZ(d.pos, d.target);
        dir = norm2(d.target[0] - d.pos[0], d.target[2] - d.pos[2]); v = Math.min(W.DRIFTER_IDLE_SPEED / TR, dt);
      }
      if (dir) { d.pos[0] += dir[0] * v; d.pos[2] += dir[1] * v; }
      this.hover(d, W.DRIFTER_HOVER);
    }
  }

  spawnScheduled(emit) {
    const st = this.simTick, p = this.player, m = this.map;
    if (this.randomMotes && st % W.MOTE_SPAWN_EVERY === 0) {
      const randoms = this.motes.filter((x) => x.kind === 'random');
      if (randoms.length < W.MOTES_CAP) {
        const used = new Set(randoms.map((x) => x.spawnIdx));
        const free = m.moteSpawns.map((_, i) => i).filter((i) => !used.has(i));
        if (free.length) this.addRandomMote(free[Math.floor(this.rng() * free.length)]);
      }
    }
    if (this.randomShades) {
      let n = 0;
      if (st === m.shadeFirstTick) n = 2;
      else if (st > m.shadeFirstTick && (st - m.shadeFirstTick) % m.shadeEveryTicks === 0) n = 1;
      for (let i = 0; i < n && this.shades.length < m.shadeMax; i++) {
        const ok = m.shadeSpawns.filter((sp) => distXZ(sp, p.pos) >= W.SHADE_SPAWN_MIN_PLAYER_DIST - EPS && !this.litZoneOf(sp));
        if (!ok.length) break;
        const sp = ok[Math.floor(this.rng() * ok.length)];
        const s = this.newShade(`S${this.nextId.S++}`, sp.slice(), 'spawning');
        s.stateTicks = W.SHADE_SPAWNING_TICKS;
        this.hover(s, W.SHADE_HOVER);
        this.shades.push(s);
        emit('shade_spawned', { id: s.id });
      }
    }
    if (this.randomDrifters && m.drifters && st % W.DRIFTER_EVERY === 0) {
      const active = this.drifters.filter((d) => d.state !== 'removed').length;
      if (active < W.DRIFTER_MAX) {
        const sp = m.shadeSpawns[Math.floor(this.rng() * m.shadeSpawns.length)];
        const d = this.newDrifter(`D${this.nextId.D++}`, sp.slice());
        this.hover(d, W.DRIFTER_HOVER);
        this.drifters.push(d);
      }
    }
    if (this.windEnabled && st % W.WIND_EVERY === 0) {
      this.wind = { active: true, dirDeg: Math.floor(this.rng() * 360), ticks: W.WIND_TICKS };
    }
  }

  snapshot() {
    const p = this.player;
    const s = (n) => r3(n / TR);
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.simTick,
      night: this.night,
      state: this.state === 'playing' && this.paused ? 'paused' : this.state,
      time_left_s: r3(Math.max(0, this.timeLeftTicks) / TR),
      score: this.score,
      wind: { active: this.wind.active, dir_deg: this.wind.dirDeg },
      player: {
        pos: p.pos.map(r3), vel: p.vel.map(r3), grounded: p.grounded,
        flames: p.flames, carried: p.carried, invuln: p.invulnTicks > 0 || p.respawnTicks > 0,
        dash_cd_s: s(p.dashCdTicks), pulse_cd_s: s(p.pulseCdTicks), charm_s: s(p.charmTicks),
      },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: l.pos.map(r3), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map((x) => ({ id: x.id, pos: x.pos.map(r3), state: x.state })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: m.pos.map(r3), kind: m.kind, ttl_s: m.ttl === null ? null : s(m.ttl) })),
      drifters: this.drifters.map((d) => ({ id: d.id, pos: d.pos.map(r3), state: d.state, stolen: d.stolen })),
      charms: this.charms.map((c) => ({ id: c.id, pos: c.pos.map(r3), available: c.available, respawn_s: s(c.respawnTicks) })),
    };
  }
}
