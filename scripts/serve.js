// Server tĩnh tối giản (không phụ thuộc thư viện) để chạy bản web: npm start
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const ALLOWED = ['/index.html', '/game.contract.json', '/src/', '/node_modules/three/build/', '/web/'];

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/') url = '/index.html';
  const file = path.normalize(path.join(ROOT, url));
  if (!file.startsWith(ROOT) || !ALLOWED.some((p) => url.startsWith(p))) { res.writeHead(404); return res.end('not found'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// Cổng mặc định 8080 (đổi bằng biến PORT). Nếu bận thì tự thử cổng kế tiếp (tối đa 10 lần).
let port = PORT;
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < PORT + 10) {
    console.warn(`Cổng ${port} đang bận, thử cổng ${port + 1}...`);
    server.listen(++port);
  } else {
    console.error(`Không mở được server: ${err.message}. Thử: PORT=9000 npm start`);
    process.exit(1);
  }
});
server.on('listening', () => console.log(`Đảo Đèn Lồng: mở http://localhost:${port}`));
server.listen(port);
