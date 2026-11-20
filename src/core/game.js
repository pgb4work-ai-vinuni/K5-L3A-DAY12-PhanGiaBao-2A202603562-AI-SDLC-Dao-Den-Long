// Logic game thuần (không DOM, không WebGL). Dùng chung cho headless và bản 3D.
// Mọi luật bám Test Contract v1.0; giả định ghi ở docs/notes/phase-1-assumptions.md.
import { WORLD } from './world.js';
import { makeRng } from './rng.js';

const TR = WORLD.TICK_RATE;
// Dung sai số thực cho phép so sánh "trong bán kính r" (<= r) không bị lệch do cộng dồn float.
const EPS = 1e-6;

export function r3(v) {
  const x = Math.round(v * 1000) / 1000;
  return Object.is(x, -0) ? 0 : x;
}
export function distXZ(a, b) {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}
// Hướng di chuyển trong thế giới theo cam_yaw_deg (đúng công thức contract).
export function rotateMove(move, yawDeg) {
  let [x, z] = move;
  const len = Math.hypot(x, z);
  if (len > 1) { x /= len; z /= len; }
  const t = (yawDeg * Math.PI) / 180;
  const c = Math.cos(t), s = Math.sin(t);
  return [x * c + z * s, -x * s + z * c];
}

export function defaultLanterns(count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = (i * 2 * Math.PI) / count;
    out.push({
      id: `L${i + 1}`,
      pos: [r3(WORLD.LANTERN_RING * Math.sin(a)), 0, r3(WORLD.LANTERN_RING * Math.cos(a))],
      lit: false,
      deposited: 0,
    });
  }
  return out;
}

function clampIsland(pos) {
  const d = Math.hypot(pos[0], pos[2]);
  if (d > WORLD.ISLAND_RADIUS) {
    const k = WORLD.ISLAND_RADIUS / d;
    pos[0] *= k; pos[2] *= k;
  }
}

export class Game {
  /**
   * @param {object} tuning  phần "tuning" của game.contract.json
   * @param {object} opts    { seed, scenario }
   */
  constructor(tuning, opts = {}) {
    this.t = tuning;
    this.rng = makeRng(opts.seed ?? 0);
    this.tick = 0;
    this.state = 'playing';
    this.score = 0;
    this.timeLeftTicks = Math.round(tuning.night1_duration_s * TR);
    this.player = {
      pos: [0, 0, 0], vy: 0, flames: tuning.flames, carried: 0,
      invulnTicks: 0, pulseCdTicks: 0,
    };
    this.lanterns = defaultLanterns(tuning.lantern_count_night1);
    this.shades = [];
    this.motes = [];
    this.nextMoteId = 1;
    this.nextShadeId = 1;
    this.randomMotes = true;
    this.randomShades = true;
    this.prevButtons = { jump: false, interact: false, pulse: false, dash: false };
    this.moteTimer = Math.round(WORLD.MOTE_RESPAWN_S * TR);
    this.shadeTimer = Math.round(WORLD.SHADE_SPAWN_EVERY_S * TR);
    this.applyScenario(opts.scenario || {});
  }

  // ---- dựng tình huống: KHÔNG phát sự kiện, KHÔNG cộng điểm ----
  applyScenario(sc) {
    if (sc.player) {
      if (sc.player.pos) this.player.pos = sc.player.pos.slice(0, 3).map(Number);
      if (sc.player.carried !== undefined) this.player.carried = sc.player.carried;
      if (sc.player.flames !== undefined) this.player.flames = sc.player.flames;
    }
    if (sc.random_motes !== undefined) this.randomMotes = !!sc.random_motes;
    if (sc.random_shades !== undefined) this.randomShades = !!sc.random_shades;

    if (Array.isArray(sc.lanterns)) {
      for (const l of sc.lanterns) {
        const target = this.lanterns.find((x) => x.id === l.id);
        if (!target) continue; // id lạ: bỏ qua (ghi trong assumptions)
        if (l.pos) target.pos = l.pos.slice(0, 3).map(Number);
        if (l.deposited !== undefined) target.deposited = l.deposited;
        if (l.lit !== undefined) target.lit = !!l.lit;
      }
    }

    if (Array.isArray(sc.motes)) {
      this.motes = sc.motes.map((m) => {
        const pos = Array.isArray(m) ? m : m.pos;
        const id = !Array.isArray(m) && m.id ? String(m.id) : `M${this.nextMoteId}`;
        this.nextMoteId++;
        return { id, pos: pos.slice(0, 3).map(Number) };
      });
    } else if (this.randomMotes) {
      for (let i = 0; i < WORLD.INITIAL_MOTES; i++) this.spawnMote();
    }

    if (Array.isArray(sc.shades)) {
      this.shades = sc.shades.map((s) => {
        const id = s.id ? String(s.id) : `S${this.nextShadeId}`;
        this.nextShadeId++;
        const stunned = s.state === 'stunned';
        return {
          id, pos: s.pos.slice(0, 3).map(Number),
          state: stunned ? 'stunned' : 'chase',
          stunTicks: stunned ? Math.round(this.t.pulse_stun_s * TR) : 0,
        };
      });
    } else if (this.randomShades) {
      for (let i = 0; i < WORLD.INITIAL_SHADES; i++) this.spawnShade();
    }

    if (sc.time_left_s !== undefined) this.timeLeftTicks = Math.round(sc.time_left_s * TR);
  }

  randomPointInRing(minR, maxR) {
    const a = this.rng() * Math.PI * 2;
    const r = Math.sqrt(minR * minR + this.rng() * (maxR * maxR - minR * minR));
    return [r3(r * Math.sin(a)), 0, r3(r * Math.cos(a))];
  }

  spawnMote() {
    const pos = this.randomPointInRing(WORLD.MOTE_MIN_R, WORLD.MOTE_MAX_R);
    const m = { id: `M${this.nextMoteId++}`, pos };
    this.motes.push(m);
    return m;
  }

  spawnShade() {
    let pos;
    for (let tries = 0; tries < 20; tries++) {
      pos = this.randomPointInRing(WORLD.SHADE_SPAWN_MIN_R, WORLD.SHADE_SPAWN_MAX_R);
      const okPlayer = distXZ(pos, this.player.pos) >= WORLD.SHADE_SPAWN_MIN_PLAYER_DIST;
      const okSafe = this.lanterns.every((l) => !l.lit || distXZ(pos, l.pos) > this.t.safe_radius);
      if (okPlayer && okSafe) break;
    }
    pos[1] = WORLD.SHADE_Y;
    const s = { id: `S${this.nextShadeId++}`, pos, state: 'chase', stunTicks: 0 };
    this.shades.push(s);
    return s;
  }

  get timeLeftS() { return this.timeLeftTicks / TR; }

  // ---- một bước mô phỏng: đọc input của tick k, tạo trạng thái k+1 ----
  step(input = {}) {
    if (this.state !== 'playing') return [];
    const t = this.t;
    const events = [];
    const evTick = this.tick + 1;
    const emit = (name, data) => events.push({ type: 'event', tick: evTick, name, data });
    const p = this.player;
    this.timeLeftTicks--; // time_left_s = thời lượng - (số bước đã chạy)/60
    let over = false;
    const end = (result, reason) => {
      if (over) return;
      over = true;
      this.state = result;
      if (result === 'won') {
        this.score += t.score.per_second_left * Math.floor(Math.max(0, this.timeLeftTicks) / TR);
        this.score += t.score.per_flame_left * p.flames;
      }
      emit('game_over', { result, reason });
    };

    // Cạnh false -> true
    const btn = {};
    for (const k of ['jump', 'interact', 'pulse', 'dash']) {
      const cur = !!input[k];
      btn[k] = cur && !this.prevButtons[k];
      this.prevButtons[k] = cur;
    }

    // 1. Di chuyển + nhảy
    const [mx, mz] = rotateMove(input.move || [0, 0], input.cam_yaw_deg || 0);
    p.pos[0] += (mx * t.player_speed) / TR;
    p.pos[2] += (mz * t.player_speed) / TR;
    const grounded = p.pos[1] <= 0 && p.vy <= 0;
    if (btn.jump && grounded) p.vy = WORLD.JUMP_SPEED;
    if (!grounded || p.vy > 0) {
      p.vy -= WORLD.GRAVITY / TR;
      p.pos[1] += p.vy / TR;
      if (p.pos[1] <= 0) { p.pos[1] = 0; p.vy = 0; }
    }
    clampIsland(p.pos); // fall_enabled = false: mép đảo là tường vô hình

    // 2. Nhặt đom đóm (tự động khi trong pickup_radius)
    if (this.motes.length) {
      const keep = [];
      for (const m of this.motes) {
        if (p.carried < t.carry_capacity && distXZ(p.pos, m.pos) <= t.pickup_radius + EPS) {
          p.carried++;
          this.score += t.score.per_mote;
          emit('mote_picked', { carried: p.carried });
        } else keep.push(m);
      }
      this.motes = keep;
    }

    // 3. Tương tác: nạp ánh sáng vào đèn gần nhất chưa thắp
    if (btn.interact && p.carried > 0) {
      let best = null, bestD = Infinity;
      for (const l of this.lanterns) {
        if (l.lit) continue;
        const d = distXZ(p.pos, l.pos);
        if (d <= t.interact_radius + EPS && d < bestD) { best = l; bestD = d; }
      }
      if (best) {
        const amount = Math.min(p.carried, Math.max(0, t.lantern_cost - best.deposited));
        if (amount > 0) {
          p.carried -= amount;
          best.deposited += amount;
          emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
        }
        if (best.deposited >= t.lantern_cost) {
          best.lit = true;
          this.score += t.score.per_lantern;
          emit('lantern_lit', { lantern_id: best.id });
          if (this.lanterns.every((l) => l.lit)) end('won', 'all_lit');
        }
      }
    }

    if (!over) {
      // 4. Bóng Mực: đếm stun, đuổi theo, không vào vùng an toàn của đèn đã thắp
      const step = t.shade_speed / TR;
      for (const s of this.shades) {
        if (s.stunTicks > 0) {
          s.stunTicks--;
          if (s.stunTicks === 0) s.state = 'chase';
          continue;
        }
        const d = distXZ(s.pos, p.pos);
        if (d > 1e-9) {
          const k = Math.min(step, d) / d;
          s.pos[0] += (p.pos[0] - s.pos[0]) * k;
          s.pos[2] += (p.pos[2] - s.pos[2]) * k;
        }
        this.keepOutOfSafe(s);
      }

      // 5. Tỏa sáng (pulse)
      if (p.pulseCdTicks > 0) p.pulseCdTicks--;
      if (btn.pulse && p.pulseCdTicks === 0 && p.carried >= t.pulse_cost) {
        p.carried -= t.pulse_cost;
        p.pulseCdTicks = Math.round(t.pulse_cooldown_s * TR);
        const stunned = [];
        for (const s of this.shades) {
          const d = distXZ(s.pos, p.pos);
          if (d <= t.pulse_radius + EPS) {
            s.state = 'stunned';
            s.stunTicks = Math.round(t.pulse_stun_s * TR);
            let dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2];
            if (d < 1e-9) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
            s.pos[0] += dx * t.pulse_push_m;
            s.pos[2] += dz * t.pulse_push_m;
            clampIsland(s.pos);
            this.keepOutOfSafe(s);
            stunned.push(s.id);
            this.score += t.score.per_stun;
          }
        }
        emit('pulse', { stunned_ids: stunned });
      }

      // 6. Va chạm Bóng Mực
      if (p.invulnTicks > 0) p.invulnTicks--;
      if (p.invulnTicks === 0) {
        for (const s of this.shades) {
          if (s.state === 'stunned') continue;
          if (distXZ(s.pos, p.pos) <= t.shade_hit_radius + EPS) {
            p.flames = Math.max(0, p.flames - 1);
            const dropped = Math.floor(p.carried * t.hit_drop_ratio);
            p.carried -= dropped;
            p.invulnTicks = Math.round(t.invuln_s * TR);
            emit('player_hit', { by: 'shade', flames: p.flames, dropped });
            if (p.flames <= 0) end('lost', 'no_flames');
            break;
          }
        }
      }
    }

    // 7. Sinh thêm (chỉ khi random_* bật)
    if (!over) {
      if (this.randomMotes && --this.moteTimer <= 0) {
        this.moteTimer = Math.round(WORLD.MOTE_RESPAWN_S * TR);
        if (this.motes.length < WORLD.INITIAL_MOTES) this.spawnMote();
      }
      if (this.randomShades && --this.shadeTimer <= 0) {
        this.shadeTimer = Math.round(WORLD.SHADE_SPAWN_EVERY_S * TR);
        if (this.shades.length < WORLD.MAX_SHADES) {
          const s = this.spawnShade();
          emit('shade_spawned', { id: s.id });
        }
      }
    }

    // 8. Thời gian
    this.tick++;
    if (!over && this.timeLeftTicks <= 0) {
      this.timeLeftTicks = 0;
      end('lost', 'dawn');
    }
    return events;
  }

  keepOutOfSafe(s) {
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const d = distXZ(s.pos, l.pos);
      if (d < this.t.safe_radius) {
        let dx = s.pos[0] - l.pos[0], dz = s.pos[2] - l.pos[2];
        if (d < 1e-9) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        s.pos[0] = l.pos[0] + dx * this.t.safe_radius;
        s.pos[2] = l.pos[2] + dz * this.t.safe_radius;
      }
    }
  }

  snapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.tick,
      state: this.state,
      time_left_s: r3(Math.max(0, this.timeLeftTicks) / TR),
      score: this.score,
      player: {
        pos: this.player.pos.map(r3),
        flames: this.player.flames,
        carried: this.player.carried,
      },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: l.pos.map(r3), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map((s) => ({ id: s.id, pos: s.pos.map(r3), state: s.state })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: m.pos.map(r3) })),
    };
  }
}
