// Chạy bản web: node scripts/serve.js   (hoặc npm start) — mở http://localhost:8080
// Xuất bảng xếp hạng: node scripts/serve.js --export-leaderboard out.json
import { createServer, listen } from './server-core.js';
import { exportTo, LB_FILE } from './leaderboard.js';

const argv = process.argv.slice(2);
const i = argv.indexOf('--export-leaderboard');
if (i >= 0) {
  const out = argv[i + 1];
  if (!out) { process.stderr.write('cần đường dẫn: --export-leaderboard out.json\n'); process.exit(1); }
  exportTo(out);
  console.log(`Đã xuất bảng xếp hạng (${LB_FILE}) ra ${out}`);
  process.exit(0);
}

const port = await listen(createServer(), Number(process.env.PORT) || 8080).catch((e) => {
  console.error(`Không mở được server: ${e.message}. Thử: PORT=9000 npm start`);
  process.exit(1);
});
console.log(`Đảo Đèn Lồng: mở http://localhost:${port}`);
