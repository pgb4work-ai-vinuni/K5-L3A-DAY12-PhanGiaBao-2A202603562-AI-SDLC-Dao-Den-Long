// Bản chơi 3D trên web. CHỈ hiển thị + đọc phím; mọi luật nằm trong src/core (dùng chung với headless).
import * as THREE from 'three';
import { Game } from '../core/game.js';
import { WORLD } from '../core/world.js';

const tuning = (await (await fetch('/game.contract.json')).json()).tuning;
const TR = WORLD.TICK_RATE;
const COL = { warm: 0xffb347, ink: 0x2a0f45, inkEye: 0xc89bff, mote: 0xf6ff8a };

// ---------- Scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
const bgDark = new THREE.Color(0x0b0a1a), bgLit = new THREE.Color(0x2b2350);
scene.background = bgDark.clone();
scene.fog = new THREE.FogExp2(0x0b0a1a, 0.022);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const ambient = new THREE.AmbientLight(0x6a5acd, 0.6);
const moon = new THREE.DirectionalLight(0x9fa8ff, 0.7);
moon.position.set(-20, 40, -10);
scene.add(ambient, moon);

// Đảo + biển mây
const island = new THREE.Mesh(
  new THREE.CylinderGeometry(WORLD.ISLAND_RADIUS, WORLD.ISLAND_RADIUS - 3, 4, 64),
  new THREE.MeshStandardMaterial({ color: 0x2f4a3a, roughness: 0.95 }));
island.position.y = -2;
scene.add(island);
const sea = new THREE.Mesh(new THREE.CircleGeometry(220, 48),
  new THREE.MeshStandardMaterial({ color: 0x1b1838, roughness: 1 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -3.5;
scene.add(sea);
// vài bụi cỏ/đá trang trí (cố định, không ảnh hưởng logic)
const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a3550, roughness: 1 });
for (let i = 0; i < 40; i++) {
  const a = i * 2.39996, r = 6 + ((i * 37) % 31);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + (i % 4) * 0.15), rockMat);
  rock.position.set(r * Math.sin(a), 0.1, r * Math.cos(a));
  scene.add(rock);
}

// ---------- Mây ----------
function makeMay() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x4f7cc4 }));
  body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf2c9a0 }));
  head.position.y = 1.45;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 24),
    new THREE.MeshStandardMaterial({ color: 0xe8d7a0, roughness: 0.8 }));
  hat.position.y = 1.78;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x553311 }));
  string.position.set(0.55, 1.42, 0.25);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8),
    new THREE.MeshBasicMaterial({ color: COL.warm }));
  lamp.position.set(0.55, 1.2, 0.25);
  const light = new THREE.PointLight(COL.warm, 6, 9, 1.6);
  light.position.copy(lamp.position);
  g.add(body, head, hat, string, lamp, light);
  return g;
}
const may = makeMay();
scene.add(may);

// ---------- Thực thể đồng bộ theo id ----------
const moteGeo = new THREE.SphereGeometry(0.18, 8, 6);
const moteMat = new THREE.MeshBasicMaterial({ color: COL.mote });
const shadeGeo = new THREE.SphereGeometry(0.85, 20, 14);
const eyeGeo = new THREE.SphereGeometry(0.1, 8, 6);
let moteMeshes = new Map(), shadeMeshes = new Map(), lanternViews = [];
const dynamic = new THREE.Group();
scene.add(dynamic);

function makeShade() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: COL.ink, emissive: 0x1a0630, transparent: true, opacity: 0.92, roughness: 0.4 });
  const blob = new THREE.Mesh(shadeGeo, mat);
  blob.scale.set(1, 1.2, 1);
  const eyeMat = new THREE.MeshBasicMaterial({ color: COL.inkEye });
  const e1 = new THREE.Mesh(eyeGeo, eyeMat), e2 = new THREE.Mesh(eyeGeo, eyeMat);
  e1.position.set(-0.25, 0.25, 0.75); e2.position.set(0.25, 0.25, 0.75);
  g.add(blob, e1, e2);
  g.userData = { mat };
  return g;
}

function makeLantern(l) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x5a3a22 }));
  post.position.y = 1.6;
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x8a2a1a, emissive: 0x000000, roughness: 0.6 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), shellMat);
  shell.scale.set(1, 1.25, 1);
  shell.position.y = 3.8;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.2), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  cap.position.y = 4.75;
  const light = new THREE.PointLight(COL.warm, 0, 22, 1.3);
  light.position.y = 3.8;
  const ring = new THREE.Mesh(new THREE.RingGeometry(tuning.safe_radius - 0.12, tuning.safe_radius, 48),
    new THREE.MeshBasicMaterial({ color: COL.warm, transparent: true, opacity: 0.0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
  g.add(post, shell, cap, light, ring);
  g.position.set(l.pos[0], 0, l.pos[2]);
  return { group: g, shellMat, light, ring };
}

// ---------- Hiệu ứng ----------
const pulses = [];
function spawnPulseFx(pos) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.8, 48),
    new THREE.MeshBasicMaterial({ color: COL.warm, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos[0], 0.2, pos[2]);
  scene.add(m); pulses.push({ m, t: 0 });
}
// Sáng tạo nhỏ (chỉ hiển thị): đom đóm đang mang bay vòng quanh nón lá của Mây.
const orbit = new THREE.Group();
scene.add(orbit);
for (let i = 0; i < tuning.carry_capacity; i++) orbit.add(new THREE.Mesh(moteGeo, moteMat));

// ---------- Input ----------
const keys = new Set();
const tapped = { jump: false, interact: false, pulse: false };
let camYaw = 0, dragging = false, lastX = 0;
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') { tapped.jump = true; e.preventDefault(); }
  if (e.code === 'KeyE') tapped.interact = true;
  if (e.code === 'KeyF') tapped.pulse = true;
  if (e.code === 'KeyR') restart();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
renderer.domElement.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - lastX) * 0.3; lastX = e.clientX;
});

function readInput() {
  // Camera nhìn theo +Z khi yaw = 0 nên phím phải (D) tương ứng x = -1 của contract.
  let x = 0, z = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
  if (keys.has('KeyA')) x += 1;
  if (keys.has('KeyD')) x -= 1;
  const inp = {
    move: [x, z], cam_yaw_deg: camYaw,
    jump: keys.has('Space') || tapped.jump,
    interact: keys.has('KeyE') || tapped.interact,
    pulse: keys.has('KeyF') || tapped.pulse,
  };
  tapped.jump = tapped.interact = tapped.pulse = false;
  return inp;
}

// ---------- Vòng đời game ----------
let game, running = false, facing = 0;
const $ = (id) => document.getElementById(id);
const overlay = $('ov-btn').parentElement.parentElement;

function restart() {
  game = new Game(tuning, { seed: (Date.now() & 0x7fffffff) });
  dynamic.clear();
  moteMeshes = new Map(); shadeMeshes = new Map();
  lanternViews = game.lanterns.map((l) => { const v = makeLantern(l); dynamic.add(v.group); return v; });
  camYaw = 0; facing = 0;
  window.__game = game; // chỉ để debug/chụp bằng chứng
  running = true;
  overlay.classList.add('hidden');
}
$('ov-btn').addEventListener('click', restart);

function showEnd() {
  running = false;
  const won = game.state === 'won';
  $('ov-title').textContent = won ? 'Đảo đã sáng lại!' : 'Đêm đã nuốt ánh sáng…';
  const reason = game.lastReason === 'dawn' ? 'Trời đã sáng trước khi thắp đủ đèn.' : game.lastReason === 'no_flames' ? 'Mây đã hết ngọn lửa.' : 'Cả 5 Đèn Lồng Lớn đã cháy sáng.';
  $('ov-sub').textContent = `${won ? 'THẮNG' : 'THUA'} · Điểm: ${game.score}`;
  $('ov-body').textContent = reason;
  $('ov-btn').textContent = 'Chơi lại (R)';
  overlay.classList.remove('hidden');
}

function handleEvents(events) {
  for (const e of events) {
    if (e.name === 'pulse') spawnPulseFx(game.player.pos);
    if (e.name === 'player_hit') { $('flash').style.opacity = 1; setTimeout(() => ($('flash').style.opacity = 0), 250); }
    if (e.name === 'game_over') game.lastReason = e.data.reason;
  }
}

// ---------- Đồng bộ hiển thị ----------
function sync(time) {
  const p = game.player;
  may.position.set(p.pos[0], p.pos[1], p.pos[2]);
  const inv = p.invulnTicks > 0 && Math.floor(time * 10) % 2 === 0;
  may.visible = !inv;
  const mv = readInputPreview();
  if (mv) facing = mv;
  may.rotation.y = facing;

  const seen = new Set();
  for (const m of game.motes) {
    let mesh = moteMeshes.get(m.id);
    if (!mesh) { mesh = new THREE.Mesh(moteGeo, moteMat); moteMeshes.set(m.id, mesh); dynamic.add(mesh); }
    const ph = (m.pos[0] * 13 + m.pos[2] * 7) % 6.28;
    mesh.position.set(m.pos[0], 0.9 + 0.3 * Math.sin(time * 2 + ph), m.pos[2]); // lơ lửng chỉ là hiển thị
    seen.add(m.id);
  }
  for (const [id, mesh] of moteMeshes) if (!seen.has(id)) { dynamic.remove(mesh); moteMeshes.delete(id); }

  seen.clear();
  for (const s of game.shades) {
    let g = shadeMeshes.get(s.id);
    if (!g) { g = makeShade(); shadeMeshes.set(s.id, g); dynamic.add(g); }
    g.position.set(s.pos[0], Math.max(s.pos[1], 0.9) + 0.15 * Math.sin(time * 3 + s.pos[0]), s.pos[2]);
    g.lookAt(p.pos[0], g.position.y, p.pos[2]);
    const stunned = s.state === 'stunned';
    g.userData.mat.opacity = stunned ? 0.35 : 0.92;
    g.scale.setScalar(stunned ? 0.8 : 1);
    seen.add(s.id);
  }
  for (const [id, g] of shadeMeshes) if (!seen.has(id)) { dynamic.remove(g); shadeMeshes.delete(id); }

  let litCount = 0;
  game.lanterns.forEach((l, i) => {
    const v = lanternViews[i];
    const frac = Math.min(1, l.deposited / tuning.lantern_cost);
    if (l.lit) litCount++;
    v.shellMat.emissive.setHex(l.lit ? COL.warm : 0x331100).multiplyScalar(l.lit ? 1 : frac * 1.5);
    v.light.intensity = l.lit ? 40 + 6 * Math.sin(time * 4 + i) : frac * 6;
    v.ring.material.opacity = l.lit ? 0.45 : 0.0;
  });
  // Đảo sáng dần lên khi thắp đèn
  const k = litCount / game.lanterns.length;
  ambient.intensity = 0.6 + 0.9 * k;
  scene.background.copy(bgDark).lerp(bgLit, k);
  scene.fog.color.copy(scene.background);
  scene.fog.density = 0.022 - 0.012 * k;
  island.material.color.setHex(0x2f4a3a).lerp(new THREE.Color(0x4d7a4a), k);

  orbit.position.set(p.pos[0], p.pos[1] + 2.1, p.pos[2]);
  orbit.children.forEach((m, i) => {
    m.visible = i < p.carried;
    const a = time * 2 + (i * Math.PI * 2) / Math.max(1, p.carried);
    m.position.set(Math.cos(a) * 0.9, 0.15 * Math.sin(time * 3 + i), Math.sin(a) * 0.9);
  });

  // Camera góc nhìn thứ ba sau lưng Mây, theo cam_yaw
  const t = (camYaw * Math.PI) / 180;
  const fx = Math.sin(t), fz = Math.cos(t);
  camera.position.set(p.pos[0] - fx * 9, p.pos[1] + 5.5, p.pos[2] - fz * 9);
  camera.lookAt(p.pos[0] + fx * 2, p.pos[1] + 1.2, p.pos[2] + fz * 2);

  for (let i = pulses.length - 1; i >= 0; i--) {
    const fx2 = pulses[i]; fx2.t += 1 / 60;
    const s = 1 + (fx2.t / 0.4) * (tuning.pulse_radius / 0.8);
    fx2.m.scale.setScalar(Math.min(s, tuning.pulse_radius / 0.8));
    fx2.m.material.opacity = Math.max(0, 0.9 - fx2.t * 1.8);
    if (fx2.t > 0.5) { scene.remove(fx2.m); pulses.splice(i, 1); }
  }
  updateHud(p, litCount);
}

function readInputPreview() {
  let x = 0, z = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
  if (keys.has('KeyA')) x += 1;
  if (keys.has('KeyD')) x -= 1;
  if (!x && !z) return null;
  const t = (camYaw * Math.PI) / 180;
  const wx = x * Math.cos(t) + z * Math.sin(t), wz = -x * Math.sin(t) + z * Math.cos(t);
  return Math.atan2(wx, wz);
}

function updateHud(p, litCount) {
  $('flames').innerHTML = Array.from({ length: tuning.flames }, (_, i) => `<span class="f${i < p.flames ? '' : ' off'}">🔥</span>`).join('');
  $('carried').textContent = `${p.carried} / ${tuning.carry_capacity}`;
  $('lanterns').textContent = `${litCount} / ${game.lanterns.length}`;
  const s = Math.ceil(game.timeLeftS);
  $('time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('score').textContent = game.score;
  $('pulse').textContent = p.pulseCdTicks > 0 ? `hồi ${(p.pulseCdTicks / TR).toFixed(1)}s`
    : p.carried >= tuning.pulse_cost ? 'sẵn sàng (F)' : `cần ${tuning.pulse_cost} đom đóm`;
  // Gợi ý khi đứng gần đèn chưa thắp
  let hint = '';
  for (const l of game.lanterns) {
    if (l.lit) continue;
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if (d <= tuning.interact_radius) {
      hint = p.carried > 0 ? `Nhấn E để nạp ánh sáng (${l.deposited}/${tuning.lantern_cost})` : `Cần đom đóm để thắp đèn (${l.deposited}/${tuning.lantern_cost})`;
      break;
    }
  }
  $('hint').textContent = hint; $('hint').style.display = hint ? 'block' : 'none';
}

// ---------- Vòng lặp: logic cố định 60 tick/s, vẽ theo khung hình ----------
let acc = 0, last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (game && running) {
    if (keys.has('ArrowLeft')) camYaw += 90 * dt;
    if (keys.has('ArrowRight')) camYaw -= 90 * dt;
    acc += dt;
    while (acc >= 1 / TR && running) {
      acc -= 1 / TR;
      handleEvents(game.step(readInput()));
      if (game.state !== 'playing') showEnd();
    }
  }
  if (game) sync(now / 1000);
  renderer.render(scene, camera);
}
// Màn hình chờ: dựng sẵn một ván để có cảnh nền
game = new Game(tuning, { seed: 1 });
lanternViews = game.lanterns.map((l) => { const v = makeLantern(l); dynamic.add(v.group); return v; });
requestAnimationFrame(frame);
