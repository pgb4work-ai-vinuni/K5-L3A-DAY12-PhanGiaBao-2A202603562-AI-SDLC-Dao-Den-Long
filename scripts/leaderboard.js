// Bảng xếp hạng cục bộ (Ticket-04 mục 3). Lưu trên đĩa: data/leaderboard.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LB_FILE = process.env.DDL_LEADERBOARD || path.join(ROOT, 'data', 'leaderboard.json');
export const TOP = 10;
// 3–12 ký tự: chữ (kể cả tiếng Việt có dấu), số, gạch dưới.
export const NAME_RE = /^[\p{L}\p{M}0-9_]{3,12}$/u;

export function validEntry(e) {
  return e && typeof e === 'object' && typeof e.name === 'string' && NAME_RE.test(e.name.normalize('NFC')) &&
    Number.isInteger(e.score) && e.score >= 0 && Number.isInteger(e.nights_won) && e.nights_won >= 0 && e.nights_won <= 3 &&
    typeof e.achieved_at === 'string' && !Number.isNaN(Date.parse(e.achieved_at)) && Number.isInteger(e.seed);
}

// Điểm giảm dần; bằng điểm thì ai đạt trước đứng trên. Giữ top 10.
export function sortTop(entries) {
  return [...entries]
    .sort((a, b) => (b.score - a.score) || (Date.parse(a.achieved_at) - Date.parse(b.achieved_at)))
    .slice(0, TOP);
}

export function load() {
  try {
    const doc = JSON.parse(fs.readFileSync(LB_FILE, 'utf8'));
    return sortTop((doc.entries || []).filter(validEntry));
  } catch { return []; }
}

export function add(entry) {
  const e = {
    name: String(entry.name).normalize('NFC'), score: entry.score, nights_won: entry.nights_won,
    achieved_at: entry.achieved_at, seed: entry.seed,
  };
  if (!validEntry(e)) throw new Error('mục bảng xếp hạng không hợp lệ');
  const entries = sortTop([...load(), e]);
  fs.mkdirSync(path.dirname(LB_FILE), { recursive: true });
  fs.writeFileSync(LB_FILE, JSON.stringify({ entries }, null, 2) + '\n');
  return entries;
}

export function exportTo(out) {
  fs.writeFileSync(out, JSON.stringify({ entries: load() }, null, 2) + '\n');
}
