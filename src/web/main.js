// Bản chơi 3D trên web. CHỈ hiển thị + đọc phím + menu; mọi luật nằm trong src/core (dùng chung với headless).
import * as THREE from 'three';
import { Game } from '../core/game.js';
import { WORLD } from '../core/world.js';
import { MAPS } from '../core/maps.js';
import { sfx, startMusic, setVolume, resumeAudio } from './audio.js';

const tuning = (await (await fetch('/game.contract.json')).json()).tuning;
const TR = WORLD.TICK_RATE;
// Bảng màu chuẩn Ticket-02
const C = {
  sky: 0x0e1430, fog: 0x1b2350, grass: 0x2f5d50, sand: 0xc9b48a, wood: 0x6b4a2f, sea: 0x12384a,
  lit: 0xffb347, core: 0xffe9b0, off: 0x5b5f6e, mote: 0xfff6c2, moteGlow: 0xffe58a,
  ink: 0x120a1a, inkEdge: 0x7a3cff, stunned: 0x3a3450, shirt: 0xe8e2d0, scarf: 0xc8102e,
  gold: 0xf2c14e, drifter: 0x8fa3b8,
};
const INTRO = {
  1: 'Ông Đăng: "Sương đen nuốt mất Đảo Bến rồi, Mây ơi. Gom đom đóm, thắp lại năm ngọn đèn nhé."',
  2: 'Ông Đăng: "Đảo Cau có hai nửa, nối nhau bằng cầu tre. Coi chừng Gió Lạc giật đom đóm của con."',
  3: 'Ông Đăng: "Đảo Chuông cao ba tầng, gió thổi mạnh lắm. Thắp xong là trời sáng!"',
};

// ---------------- Cài đặt (lưu giữa các lần mở) ----------------
const settings = { volume: 0.6, sens: 0.3 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ddl-settings') || '{}')); } catch { /* bỏ qua */ }
const saveSettings = () => { try { localStorage.setItem('ddl-settings', JSON.stringify(settings)); } catch { /* bỏ qua */ } };
setVolume(settings.volume);

// ---------------- Scene ----------------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.Fog(C.fog, 25, 110);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 400);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
const ambient = new THREE.AmbientLight(0xbfc6ff, 0.15);
const moon = new THREE.DirectionalLight(0x9fa8ff, 0.35);
moon.position.set(-20, 40, -10);
scene.add(ambient, moon);
const sea = new THREE.Mesh(new THREE.CircleGeometry(300, 48), new THREE.MeshStandardMaterial({ color: C.sea, roughness: 1 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -8;
scene.add(sea);

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const M = { grass: mat(C.grass), sand: mat(C.sand), wood: mat(C.wood), stone: mat(0x4a4e5e) };

// ---------------- Dựng bản đồ ----------------
let level = new THREE.Group();
scene.add(level);
function cyl(r, h, y, m, x = 0, z = 0, seg = 64) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), m);
  g.position.set(x, y - h / 2, z); return g;
}
function buildLevel(night) {
  scene.remove(level);
  level = new THREE.Group();
  const map = MAPS[night];
  if (night === 1) {
    level.add(cyl(40, 6, 0, M.grass), cyl(40.6, 1, -0.6, M.sand));
  } else if (night === 2) {
    level.add(cyl(28, 6, 0, M.grass), cyl(28, 6, 0, M.grass, 70, 0), cyl(28.6, 1, -0.6, M.sand), cyl(28.6, 1, -0.6, M.sand, 70, 0));
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 4), M.wood);
    bridge.position.set(35, -0.15, 0); level.add(bridge);
    for (let x = 27; x <= 43; x += 2) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 4.1), mat(0x4a3220)); s.position.set(x, -0.1, 0); level.add(s); }
  } else {
    level.add(cyl(45, 6, 0, M.grass), cyl(45.6, 1, -0.6, M.sand));
    // tầng 1: nửa vành khăn z > 0, r 12..24, cao 3
    const sh = new THREE.Shape();
    sh.absarc(0, 0, 24, 0, Math.PI, false);
    sh.absarc(0, 0, 12, Math.PI, 0, true);
    const t1 = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false, curveSegments: 48 }), mat(0x3c6b58));
    t1.rotation.x = Math.PI / 2; t1.position.y = 3; t1.scale.y = -1; // shape (x, y) -> thế giới (x, z>0)
    level.add(t1);
    level.add(cyl(8, 6, 6, mat(0x4a7a63)));
    for (const deg of [30, 150]) { // dốc từ r30 (Y0) lên r24 (Y3)
      const a = (deg * Math.PI) / 180, len = Math.hypot(6, 3);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 3), M.wood);
      ramp.position.set(27 * Math.cos(a), 1.5, 27 * Math.sin(a));
      ramp.rotation.y = -a;                 // trục X cục bộ = hướng bán kính ra ngoài
      ramp.rotation.z = -Math.atan2(3, 6);  // đầu ngoài (r30) thấp, đầu trong (r24) cao
      level.add(ramp);
    }
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 8, 24), M.stone);
    tower.position.set(0, 10, 0); level.add(tower);
    const bell = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(C.gold, { metalness: 0.6 }));
    bell.position.set(0, 14, 0); level.add(bell);
  }
  for (const pad of map.pads) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(pad.r, pad.r, 0.15, 24), mat(C.gold, { emissive: 0x553300 }));
    p.position.set(pad.pos[0], pad.pos[1] + 0.07, pad.pos[2]); level.add(p);
  }
  // Đá trang trí (cố định, không ảnh hưởng logic)
  for (let i = 0; i < 30; i++) {
    const a = i * 2.39996, r = 5 + ((i * 37) % 20);
    const sp = map.moteSpawns[i % map.moteSpawns.length];
    const x = sp[0] + Math.cos(a) * 3, z = sp[2] + Math.sin(a) * 3;
    const h = map.ground(x, z);
    if (h === null) continue;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.25 + (r % 4) * 0.1), M.stone);
    rock.position.set(x, h + 0.1, z); level.add(rock);
  }
  scene.add(level);
}

// ---------------- Mây ----------------
function makeMay() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 6, 12), mat(C.shirt));
  body.position.y = 0.75;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), mat(C.scarf));
  scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat(0xf2c9a0));
  head.position.y = 1.45;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.45, 24), mat(C.sand));
  hat.position.y = 1.78;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: C.lit }));
  lamp.position.set(0.55, 1.2, 0.25);
  const light = new THREE.PointLight(C.lit, 5, 9, 1.6);
  light.position.copy(lamp.position);
  g.add(body, scarf, head, hat, lamp, light);
  return g;
}
const may = makeMay();
scene.add(may);

// ---------------- Thực thể động ----------------
const moteGeo = new THREE.SphereGeometry(0.18, 8, 6);
const moteMat = new THREE.MeshBasicMaterial({ color: C.mote });
const dropMat = new THREE.MeshBasicMaterial({ color: C.moteGlow });
const shadeGeo = new THREE.SphereGeometry(0.85, 16, 12);
const eyeGeo = new THREE.SphereGeometry(0.1, 8, 6);
const edgeMat = new THREE.MeshBasicMaterial({ color: C.inkEdge, side: THREE.BackSide });
const dyn = new THREE.Group();
scene.add(dyn);
let views = { motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map(), lanterns: [] };

function makeShade() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: C.ink, roughness: 0.5 });
  const blob = new THREE.Mesh(shadeGeo, body); blob.scale.set(1, 1.2, 1);
  const edge = new THREE.Mesh(shadeGeo, edgeMat); edge.scale.set(1.08, 1.28, 1.08);
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.inkEdge });
  const e1 = new THREE.Mesh(eyeGeo, eyeMat), e2 = new THREE.Mesh(eyeGeo, eyeMat);
  e1.position.set(-0.25, 0.25, 0.75); e2.position.set(0.25, 0.25, 0.75);
  g.add(blob, edge, e1, e2);
  g.userData = { body };
  return g;
}
function makeDrifter() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: C.drifter, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.25, 8, 1), m);
    ribbon.position.y = i * 0.25; ribbon.rotation.y = i * 0.6; g.add(ribbon);
  }
  return g;
}
function makeCharm() {
  const g = new THREE.Group();
  const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.45, 6), new THREE.MeshBasicMaterial({ color: C.scarf, side: THREE.DoubleSide }));
  const rim = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.55, 6), new THREE.MeshBasicMaterial({ color: C.gold, side: THREE.DoubleSide }));
  leaf.scale.y = 1.5; rim.scale.y = 1.5;
  g.add(leaf, rim);
  return g;
}
function makeLantern(l) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3.2), M.wood);
  post.position.y = 1.6;
  const shellMat = new THREE.MeshStandardMaterial({ color: C.off, emissive: 0x000000, roughness: 0.6 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), shellMat);
  shell.scale.set(1, 1.25, 1); shell.position.y = 3.8;
  const coreMat = new THREE.MeshBasicMaterial({ color: C.off });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), coreMat);
  core.position.y = 3.8;
  const light = new THREE.PointLight(C.lit, 0, 24, 1.3);
  light.position.y = 3.8;
  const ring = new THREE.Mesh(new THREE.RingGeometry(tuning.safe_radius - 0.12, tuning.safe_radius, 48),
    new THREE.MeshBasicMaterial({ color: C.lit, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
  g.add(post, shell, core, light, ring);
  g.position.set(l.pos[0], l.pos[1], l.pos[2]);
  return { group: g, shellMat, coreMat, light, ring };
}
const pulses = [];
function pulseFx(pos) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.8, 48),
    new THREE.MeshBasicMaterial({ color: C.lit, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos[0], pos[1] + 0.3, pos[2]);
  scene.add(m); pulses.push({ m, t: 0 });
}
// Sáng tạo Phase 1 (chỉ hiển thị): đom đóm đang mang bay vòng quanh nón lá.
const orbit = new THREE.Group();
scene.add(orbit);
for (let i = 0; i < tuning.carry_capacity; i++) orbit.add(new THREE.Mesh(moteGeo, moteMat));
// Lá bay báo trước gió mạnh (chỉ hiển thị)
const leaves = new THREE.Group();
scene.add(leaves);
for (let i = 0; i < 24; i++) {
  const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ color: 0x9bbf5a, side: THREE.DoubleSide }));
  leaves.add(lf);
}

// ---------------- Input ----------------
const keys = new Set();
const tapped = { jump: false, interact: false, pulse: false, dash: false, pause: false };
let camYaw = 0, dragging = false, lastX = 0;
const KEYMAP = { Space: 'jump', KeyE: 'interact', KeyF: 'pulse', ShiftLeft: 'dash', ShiftRight: 'dash', Escape: 'pause', KeyP: 'pause' };
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  if (KEYMAP[e.code] && (mode === 'play' || (mode === 'paused' && KEYMAP[e.code] === 'pause'))) tapped[KEYMAP[e.code]] = true;
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
renderer.domElement.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; resumeAudio(); });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', (e) => {
  if (!dragging || mode !== 'play') return;
  camYaw -= (e.clientX - lastX) * settings.sens; lastX = e.clientX;
});
function moveKeys() {
  // Camera nhìn theo +Z khi yaw = 0 nên phím phải (D) tương ứng x = -1 của contract.
  let x = 0, z = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
  if (keys.has('KeyA')) x += 1;
  if (keys.has('KeyD')) x -= 1;
  return [x, z];
}
function readInput() {
  const inp = { move: moveKeys(), cam_yaw_deg: camYaw };
  for (const k of Object.keys(tapped)) {
    const held = Object.entries(KEYMAP).some(([code, a]) => a === k && keys.has(code));
    inp[k] = (k !== 'pause' && held) || tapped[k];
    tapped[k] = false;
  }
  return inp;
}

// ---------------- Màn hình & vòng đời ----------------
const $ = (id) => document.getElementById(id);
let game = null, mode = 'menu', night = 1, totalScore = 0, settingsReturn = 'menu', facing = 0;
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
  $('hud').classList.toggle('hidden', !(mode === 'play' || mode === 'paused'));
}
function startNight(n) {
  night = n;
  game = new Game(tuning, { seed: (Date.now() & 0x7fffffff), night: n });
  window.__game = game; // chỉ để debug/chụp bằng chứng
  buildLevel(n);
  dyn.clear();
  views = { motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map(), lanterns: [] };
  views.lanterns = game.lanterns.map((l) => { const v = makeLantern(l); dyn.add(v.group); return v; });
  $('bar').innerHTML = '<i></i>'.repeat(tuning.carry_capacity);
  camYaw = 0; facing = 0;
  mode = 'play'; acc = 0;
  show(null);
  startMusic();
}
function intro(n) {
  night = n; mode = 'intro';
  $('intro-night').textContent = `Đêm ${n}`;
  $('intro-name').textContent = MAPS[n].name;
  $('intro-quote').textContent = INTRO[n];
  if (!game || game.night !== n) previewLevel(n);
  show('intro');
}
function previewLevel(n) {
  buildLevel(n);
  game = new Game(tuning, { seed: 1, night: n });
  dyn.clear();
  views = { motes: new Map(), shades: new Map(), drifters: new Map(), charms: new Map(), lanterns: [] };
  views.lanterns = game.lanterns.map((l) => { const v = makeLantern(l); dyn.add(v.group); return v; });
}
function endNight() {
  const won = game.state === 'won';
  mode = 'result';
  (won ? sfx.win : sfx.lose)();
  if (won) totalScore += game.score;
  if (won && night === 3) { $('dawn-score').textContent = totalScore; mode = 'dawn'; show('dawn'); return; }
  $('res-title').textContent = won ? `Đêm ${night} đã sáng!` : 'Đêm đã nuốt ánh sáng…';
  const reason = { all_lit: 'Mọi Đèn Lồng Lớn đã cháy sáng.', dawn: 'Trời sáng trước khi thắp đủ đèn.', no_flames: 'Mây đã hết Ngọn Lửa.' }[game.result];
  $('res-sub').textContent = `${won ? 'THẮNG' : 'THUA'} · Điểm đêm: ${game.score} · Tổng: ${totalScore}`;
  $('res-body').textContent = reason;
  $('res-next').classList.toggle('hidden', !won);
  $('res-retry').classList.toggle('hidden', won);
  show('result');
}
document.addEventListener('click', (e) => {
  const act = e.target?.dataset?.act;
  if (!act) return;
  resumeAudio();
  if (act === 'play') { totalScore = 0; intro(1); }
  else if (act === 'start-night') startNight(night);
  else if (act === 'next') intro(night + 1);
  else if (act === 'retry') { startNight(night); }
  else if (act === 'menu') { mode = 'menu'; show('menu'); }
  else if (act === 'resume') { tapped.pause = true; mode = 'play'; show(null); }
  else if (act === 'settings') { settingsReturn = mode === 'paused' ? 'pause' : 'menu'; $('set-vol').value = settings.volume; $('set-sens').value = settings.sens; show('settings'); }
  else if (act === 'settings-back') { show(settingsReturn); }
});
$('set-vol').addEventListener('input', (e) => { settings.volume = +e.target.value; setVolume(settings.volume); saveSettings(); });
$('set-sens').addEventListener('input', (e) => { settings.sens = +e.target.value; saveSettings(); });

function handleEvents(events) {
  for (const e of events) {
    switch (e.name) {
      case 'mote_picked': sfx.pick(); break;
      case 'deposit': sfx.deposit(); break;
      case 'lantern_lit': sfx.lit(); break;
      case 'pulse': sfx.pulse(); pulseFx(game.player.pos); break;
      case 'player_hit': sfx.hit(); $('flash').style.opacity = 1; setTimeout(() => ($('flash').style.opacity = 0), 250); break;
      case 'dash': sfx.dash(); break;
      case 'shade_spawned': sfx.shade(); break;
      case 'drifter_steal': sfx.steal(); break;
      case 'charm_picked': sfx.charm(); break;
      case 'paused': mode = 'paused'; show('pause'); break;
      case 'resumed': mode = 'play'; show(null); break;
      default: break;
    }
  }
}

// ---------------- Đồng bộ hiển thị ----------------
function syncSet(map, list, make, place) {
  const seen = new Set();
  for (const e of list) {
    let v = map.get(e.id);
    if (!v) { v = make(e); map.set(e.id, v); dyn.add(v); }
    place(v, e); seen.add(e.id);
  }
  for (const [id, v] of map) if (!seen.has(id)) { dyn.remove(v); map.delete(id); }
}
let lastJumpVy = 0, lastSecond = null, windWarned = false;
function sync(time) {
  const p = game.player;
  may.position.set(p.pos[0], p.pos[1], p.pos[2]);
  may.visible = !(p.invulnTicks > 0 && Math.floor(time * 10) % 2 === 0) && p.respawnTicks === 0;
  const [mx, mz] = moveKeys();
  if (mx || mz) {
    const t = (camYaw * Math.PI) / 180;
    facing = Math.atan2(mx * Math.cos(t) + mz * Math.sin(t), -mx * Math.sin(t) + mz * Math.cos(t));
  }
  may.rotation.y = facing;
  if (p.vel[1] > 5 && lastJumpVy <= 5) sfx.jump();
  lastJumpVy = p.vel[1];

  syncSet(views.motes, game.motes, (m) => new THREE.Mesh(moteGeo, m.kind === 'dropped' ? dropMat : moteMat), (v, m) => {
    const ph = (m.pos[0] * 13 + m.pos[2] * 7) % 6.28;
    v.position.set(m.pos[0], m.pos[1] + 0.9 + 0.3 * Math.sin(time * 2 + ph), m.pos[2]); // lơ lửng chỉ là hiển thị
    if (m.kind === 'dropped') v.visible = m.ttl > 120 || Math.floor(time * 8) % 2 === 0;
  });
  syncSet(views.shades, game.shades, makeShade, (g, s) => {
    g.position.set(s.pos[0], s.pos[1] + 0.15 * Math.sin(time * 3 + s.pos[0]), s.pos[2]);
    g.lookAt(p.pos[0], g.position.y, p.pos[2]);
    g.userData.body.color.setHex(s.state === 'stunned' ? C.stunned : C.ink);
    g.scale.setScalar(s.state === 'spawning' ? 0.4 + 0.6 * (1 - s.stateTicks / WORLD.SHADE_SPAWNING_TICKS) : 1);
  });
  syncSet(views.drifters, game.drifters.filter((d) => d.state !== 'removed'), makeDrifter, (g, d) => {
    g.position.set(d.pos[0], d.pos[1] + 0.2 * Math.sin(time * 4), d.pos[2]);
    g.rotation.y = time * 3;
  });
  syncSet(views.charms, game.charms.filter((c) => c.available), makeCharm, (g, c) => {
    g.position.set(c.pos[0], c.pos[1] + 1 + 0.2 * Math.sin(time * 2), c.pos[2]);
    g.rotation.y = time * 1.5;
  });

  let lit = 0;
  game.lanterns.forEach((l, i) => {
    const v = views.lanterns[i];
    const frac = Math.min(1, l.deposited / tuning.lantern_cost);
    if (l.lit) lit++;
    v.shellMat.color.setHex(l.lit ? C.lit : C.off);
    v.shellMat.emissive.setHex(l.lit ? C.lit : C.lit).multiplyScalar(l.lit ? 0.9 : frac * 0.5);
    v.coreMat.color.setHex(l.lit ? C.core : frac > 0 ? C.lit : C.off);
    v.light.intensity = l.lit ? 40 + 5 * Math.sin(time * 4 + i) : frac * 6;
    v.ring.material.opacity = l.lit ? 0.45 : 0;
  });
  // Ánh sáng môi trường chuẩn: 0.15 + 0.55 × (đèn sáng / tổng đèn)
  ambient.intensity = 0.15 + 0.55 * (lit / game.lanterns.length);

  orbit.position.set(p.pos[0], p.pos[1] + 2.1, p.pos[2]);
  orbit.children.forEach((m, i) => {
    m.visible = i < p.carried && may.visible;
    const a = time * 2 + (i * Math.PI * 2) / Math.max(1, p.carried);
    m.position.set(Math.cos(a) * 0.9, 0.15 * Math.sin(time * 3 + i), Math.sin(a) * 0.9);
  });

  // Gió: báo trước 2 s bằng lá bay + âm thanh
  const toGust = game.ticksToNextGust();
  const warn = toGust !== null && toGust <= WORLD.WIND_WARN_TICKS && game.state === 'playing';
  if (warn && !windWarned) { sfx.wind(); windWarned = true; }
  if (!warn) windWarned = false;
  leaves.visible = warn || game.wind.active;
  if (leaves.visible) {
    const a = (game.wind.dirDeg * Math.PI) / 180;
    leaves.children.forEach((lf, i) => {
      const k = (time * 6 + i * 1.7) % 16 - 8;
      lf.position.set(p.pos[0] + Math.cos(a) * k + Math.sin(i * 3) * 4, p.pos[1] + 1 + (i % 5) * 0.5, p.pos[2] + Math.sin(a) * k + Math.cos(i * 5) * 4);
      lf.rotation.set(time * 5 + i, time * 3, 0);
    });
  }
  $('wind-warn').classList.toggle('hidden', !warn);

  // Camera góc nhìn thứ ba
  const t = (camYaw * Math.PI) / 180;
  const fx = Math.sin(t), fz = Math.cos(t);
  camera.position.set(p.pos[0] - fx * 9, p.pos[1] + 5.5, p.pos[2] - fz * 9);
  camera.lookAt(p.pos[0] + fx * 2, p.pos[1] + 1.2, p.pos[2] + fz * 2);

  for (let i = pulses.length - 1; i >= 0; i--) {
    const f = pulses[i]; f.t += 1 / 60;
    f.m.scale.setScalar(Math.min(1 + (f.t / 0.3) * (tuning.pulse_radius / 0.8), tuning.pulse_radius / 0.8));
    f.m.material.opacity = Math.max(0, 0.9 - f.t * 1.8);
    if (f.t > 0.5) { scene.remove(f.m); pulses.splice(i, 1); }
  }
  updateHud(p, lit);
}

const tmpV = new THREE.Vector3();
function updateHud(p, lit) {
  $('flames').innerHTML = Array.from({ length: tuning.flames }, (_, i) => `<span class="f${i < p.flames ? '' : ' off'}">🔥</span>`).join('');
  const s = Math.ceil(game.timeLeftS);
  $('clock').textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  $('clock').classList.toggle('danger', s <= 30);
  if (s <= 10 && s > 0 && s !== lastSecond && mode === 'play') sfx.tick();
  lastSecond = s;
  $('lanterns').textContent = `🏮 ${lit}/${game.lanterns.length}`;
  $('score').textContent = game.score;
  [...$('bar').children].forEach((el, i) => el.classList.toggle('on', i < p.carried));
  const cd = (id, ticks, total) => { $(id).querySelector('i').style.height = `${total ? (100 * ticks) / total : 0}%`; };
  cd('cd-dash', p.charmTicks > 0 ? 0 : p.dashCdTicks, tuning.dash_cooldown_s * TR);
  cd('cd-pulse', p.carried < tuning.pulse_cost ? 1 : p.pulseCdTicks, p.carried < tuning.pulse_cost ? 1 : tuning.pulse_cooldown_s * TR);
  $('charm').classList.toggle('hidden', p.charmTicks <= 0);
  $('charm').querySelector('span').textContent = `${(p.charmTicks / TR).toFixed(1)}s`;
  let hint = '', nearest = null, nd = Infinity;
  for (const l of game.lanterns) {
    if (l.lit) continue;
    const d = Math.hypot(l.pos[0] - p.pos[0], l.pos[2] - p.pos[2]);
    if (d < nd) { nd = d; nearest = l; }
    if (d <= tuning.interact_radius && !hint) hint = `E — Nạp ánh sáng (${l.deposited}/${tuning.lantern_cost})`;
  }
  $('hint').textContent = hint; $('hint').style.display = hint ? 'block' : 'none';
  // Mũi tên chỉ tới đèn chưa sáng gần nhất khi nó ở ngoài màn hình
  const arrow = $('arrow');
  if (nearest) {
    tmpV.set(nearest.pos[0], nearest.pos[1] + 3.8, nearest.pos[2]).project(camera);
    const off = tmpV.z > 1 || Math.abs(tmpV.x) > 1 || Math.abs(tmpV.y) > 1;
    arrow.style.display = off ? 'block' : 'none';
    if (off) {
      let x = tmpV.x, y = tmpV.y;
      if (tmpV.z > 1) { x = -x; y = -y; }
      const ang = Math.atan2(-y, x);
      const r = Math.min(innerWidth, innerHeight) * 0.42;
      arrow.style.left = `${innerWidth / 2 + Math.cos(ang) * r - 16}px`;
      arrow.style.top = `${innerHeight / 2 + Math.sin(ang) * r - 16}px`;
      arrow.style.transform = `rotate(${ang}rad)`;
    }
  } else arrow.style.display = 'none';
}

// ---------------- Vòng lặp: logic cố định 60 tick/s, vẽ theo khung hình ----------------
let acc = 0, last = performance.now(), fpsN = 0, fpsT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  fpsN++; fpsT += dt;
  if (fpsT >= 1) { $('fps').textContent = `${fpsN} FPS`; window.__fps = fpsN; fpsN = 0; fpsT = 0; }
  if (game && (mode === 'play' || mode === 'paused')) {
    if (mode === 'play') {
      if (keys.has('ArrowLeft')) camYaw += 90 * dt;
      if (keys.has('ArrowRight')) camYaw -= 90 * dt;
    }
    acc += dt;
    while (acc >= 1 / TR) {
      acc -= 1 / TR;
      handleEvents(game.step(readInput()));
      if (game.state !== 'playing') { endNight(); break; }
    }
  }
  if (game) sync(now / 1000);
  renderer.render(scene, camera);
}
previewLevel(1);
show('menu');
requestAnimationFrame(frame);
