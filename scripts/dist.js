// Đóng gói bản web tĩnh cho GitHub Release: node scripts/dist.js  ->  dist/dao-den-long-v1.0.0/
// Thư mục này chạy được bằng bất kỳ server tĩnh nào (ví dụ: npx serve, python3 -m http.server).
// Ở bản tĩnh, bảng xếp hạng lưu trong trình duyệt (localStorage) vì không có server Node.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'dao-den-long-v1.0.0');
fs.rmSync(OUT, { recursive: true, force: true });
const copy = (rel, dest = rel) => {
  const d = path.join(OUT, dest);
  fs.mkdirSync(path.dirname(d), { recursive: true });
  fs.cpSync(path.join(ROOT, rel), d, { recursive: true });
};
for (const f of ['index.html', 'game.contract.json', 'web', 'src/core', 'src/web', 'LICENSE', 'CREDITS.md']) copy(f);
copy('node_modules/three/build/three.module.js');
fs.writeFileSync(path.join(OUT, 'CHAY-GAME.txt'), [
  'Đảo Đèn Lồng v1.0.0 — bản web tĩnh',
  '1) Mở terminal trong thư mục này',
  '2) python3 -m http.server 8080   (hoặc: npx serve -l 8080)',
  '3) Mở http://localhost:8080 bằng Chrome/Firefox/Edge',
  'Bản đầy đủ (bảng xếp hạng lưu đĩa, benchmark, headless): xem README trên GitHub.',
].join('\n') + '\n');
console.log(`dist: ${OUT}`);
