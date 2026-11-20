# Nhật ký dùng AI

## Phase 1 (2026-11-20)
- **Công cụ:** Claude Code (desktop, model Opus) trong project có coordinator + 1 thread làm Phase 1.
- **Cách làm:** người dùng đưa docs + 10 ảnh PRD-0/Test Contract; agent đọc, ghi giả định, thiết kế core tách khỏi render, viết headless + test trước, rồi mới làm bản web.
- **Lời nhắc chính:** "Build Phase 1… tách logic khỏi render, headless đúng Test Contract (tick 0 trước input, sự kiện tick=k+1, cạnh false→true, XZ ≤ r, scenario không phát sự kiện, exit 2, dòng end, tất định), tuning khớp code." Bổ sung của người dùng: "game 3d trên giao diện web".
- **AI sai / suýt sai và cách phát hiện:**
  - Điểm thưởng thời gian khi thắng tính trước khi trừ thời gian của bước → test `thắng all_lit` đỏ (450 ≠ 448). Sửa: trừ thời gian ở đầu bước.
  - Test headless giả định dòng áp chót luôn là `game_over`, nhưng có snapshot chen vào ở tick chia hết → sửa test tìm sự kiện theo tên (test sai, không phải code).
  - `node --test tests/` không chạy được trên Node 24 (coi thư mục là module) → liệt kê file cụ thể trong `npm test`.
  - Nguy cơ lệch so sánh `≤ r` do cộng dồn 0.1 → thêm dung sai 1e-6.
- **Harness thêm:** AGENTS.md (+CLAUDE.md trỏ tới), skill `verify`, Stop hook chặn kết thúc khi `npm test` đỏ, CI GitHub Actions.
- **Token ước tính:** ~150k token đầu vào (phần lớn là đọc 10 ảnh + docs) + ~35k token đầu ra. Tiết kiệm: đọc docs 1 lần, không dùng subagent, viết test headless trước để không phải chạy thử game nhiều lần, chụp ảnh ở độ phân giải 0.6.
