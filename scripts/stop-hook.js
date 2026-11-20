// Hook "Stop" của Claude Code: chặn agent kết thúc lượt khi test đang đỏ.
// Exit 2 => Claude Code đưa stderr lại cho agent và buộc agent sửa tiếp.
import { spawnSync } from 'node:child_process';
const r = spawnSync('npm', ['test', '--silent'], { encoding: 'utf8', shell: true });
if (r.status !== 0) {
  process.stderr.write('npm test đang ĐỎ, chưa được kết thúc. Sửa test/logic trước.\n' + (r.stdout || '').slice(-3000));
  process.exit(2);
}
