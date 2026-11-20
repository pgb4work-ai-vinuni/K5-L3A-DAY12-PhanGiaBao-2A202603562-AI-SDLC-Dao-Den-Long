// Benchmark (Ticket-04 mục 1): node scripts/bench.js --seed 42 --duration 30 --out bench.json
// Bật server tạm, mở trình duyệt mặc định ở chế độ bench (canvas 1280×720, cảnh chuẩn), trang tự đo rồi gửi kết quả về;
// script ghi bench.json, TẮT server và thoát mã 0. Thêm --no-open để tự mở URL in ra (ví dụ trong trình duyệt khác).
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { createServer, listen } from './server-core.js';

const procStartEpoch = Date.now() - process.uptime() * 1000;
const args = { seed: 42, duration: 30, out: 'bench.json', open: true };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const k = argv[i], v = argv[i + 1];
  if (k === '--seed') { args.seed = parseInt(v, 10); i++; }
  else if (k === '--duration') { args.duration = Number(v); i++; }
  else if (k === '--out') { args.out = v; i++; }
  else if (k === '--no-open') args.open = false;
  else { process.stderr.write(`bench: tham số không hợp lệ: ${k}\n`); process.exit(1); }
}

let server;
const done = (code) => { if (server) server.close(); setTimeout(() => process.exit(code), 50); };
server = createServer({
  onPost: (url, body) => {
    if (url !== '/api/bench-result') return undefined;
    const report = {
      contract_version: '1.3',
      avg_fps: body.avg_fps, p1_low_fps: body.p1_low_fps, frame_ms_p95: body.frame_ms_p95, frames: body.frames,
      load_ms: Math.round(body.first_frame_epoch - procStartEpoch),
      peak_mem_mb: null, // bản web: trang không đọc được RSS của tiến trình trình duyệt (xem README)
      js_heap_peak_mb: body.js_heap_peak_mb ?? null,
      vsync_off: false, // trình duyệt luôn đồng bộ requestAnimationFrame với màn hình (xem README)
      renderer: body.renderer,
      os: `${os.type()} ${os.release()} ${os.arch()} · ${body.user_agent}`,
      seed: args.seed, duration_s: args.duration, canvas: body.canvas,
    };
    fs.writeFileSync(args.out, JSON.stringify(report, null, 2) + '\n');
    console.log(`bench: đã ghi ${args.out}: ${JSON.stringify(report)}`);
    setTimeout(() => done(0), 200);
    return { ok: true };
  },
});
const port = await listen(server, Number(process.env.PORT) || 8090);
const url = `http://localhost:${port}/?bench=1&seed=${args.seed}&duration=${args.duration}`;
console.log(`bench: mở ${url}`);
if (args.open) {
  const [cmd, cmdArgs] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : ['xdg-open', [url]];
  spawn(cmd, cmdArgs, { stdio: 'ignore', detached: true }).on('error', () => console.log('bench: không tự mở được trình duyệt, hãy mở URL trên.')).unref();
}
setTimeout(() => { console.error('bench: quá thời gian chờ kết quả'); done(1); }, (args.duration + 180) * 1000).unref();
