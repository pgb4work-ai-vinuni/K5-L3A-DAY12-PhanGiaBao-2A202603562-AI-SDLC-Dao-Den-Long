// Server tĩnh tối giản dùng chung cho `npm start` và benchmark (không phụ thuộc thư viện).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as LB from './leaderboard.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const ALLOWED = ['/index.html', '/game.contract.json', '/src/', '/node_modules/three/build/', '/web/'];

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': MIME['.json'] }); res.end(JSON.stringify(obj)); };

/** onPost(urlPath, body) -> object | undefined : xử lý thêm cho POST (ví dụ kết quả benchmark). */
export function createServer({ onPost } = {}) {
  return http.createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (url === '/api/leaderboard') {
      if (req.method === 'GET') return json(res, 200, { entries: LB.load() });
      if (req.method === 'POST') {
        try { return json(res, 200, { entries: LB.add(await readBody(req)) }); } catch (e) { return json(res, 400, { error: e.message }); }
      }
    }
    if (req.method === 'POST' && onPost) {
      try { const r = await onPost(url, await readBody(req)); if (r !== undefined) return json(res, 200, r); } catch (e) { return json(res, 400, { error: e.message }); }
    }
    const p = url === '/' ? '/index.html' : url;
    const file = path.normalize(path.join(ROOT, p));
    if (!file.startsWith(ROOT) || !ALLOWED.some((a) => p.startsWith(a))) { res.writeHead(404); return res.end('not found'); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  });
}

// Mở cổng; nếu bận thì thử cổng kế tiếp (tối đa 10 lần).
export function listen(server, startPort) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && port < startPort + 10) { console.warn(`Cổng ${port} đang bận, thử cổng ${port + 1}...`); server.listen(++port); }
      else reject(err);
    });
    server.on('listening', () => resolve(port));
    server.listen(port);
  });
}
