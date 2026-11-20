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

## Phase 2 (2026-11-20)
- **Đầu vào:** 11 ảnh Ticket-02 + Test Contract v1.1. Người dùng thêm luật: không tự commit; không chạy lệnh ảnh hưởng hệ thống/tiến trình khi chưa hỏi; chỉ chạy lệnh test.
- **Cách làm:** viết `maps.js` (bản đồ chuẩn) + viết lại `game.js` theo thứ tự 12 bước, rồi test core (28) + scenario headless cho từng tính năng (19 test), sau đó mới làm UI web.
- **AI sai / suýt sai:**
  - Ở Phase 1, server do agent bật để chụp ảnh không được tắt, giữ cổng 8080 và làm `npm start` của người dùng lỗi EADDRINUSE. Đã sửa: `serve.js` tự thử cổng kế tiếp; đưa vào AGENTS.md và skill `verify` luật "hỏi trước khi bật server, tắt sau khi dùng".
  - Kịch bản test `p2_pause` ban đầu hiểu sai: nhấn pause lần hai là **tiếp tục** (toggle), không phải tạm dừng lần nữa. Test sai, code đúng; đã sửa test.
  - Kịch bản `p2_drifter` đặt Gió Lạc quá xa nên pulse trúng lúc nó còn `chase` (flee không cướp), không kiểm được luật "thả lại". Đã dời vị trí để kiểm đúng luật.
  - Hai lần sinh code Python→JS bị lỗi escape `\n` thành xuống dòng thật trong `proof.js` (bắt bởi lỗi cú pháp khi chạy). Sửa tay bằng Edit.
- **Chưa kiểm được:** bản web Phase 2 chưa được xem/chụp và chưa đo FPS, vì bật server cần người dùng cho phép.
- **Token ước tính Phase 2:** ~220k đầu vào (11 ảnh ticket + ngữ cảnh dài) + ~60k đầu ra. Tiết kiệm: không dùng subagent; viết test headless trước khi làm UI; chạy test bằng một lệnh; không đọc lại file lớn khi không cần.

## Phase 3 (2026-11-20, 30 phút)
- **Đầu vào:** 7 ảnh Ticket-03 (Change Request) + contract v1.2. Luật người dùng giữ nguyên (không tự commit, chỉ chạy test).
- **Cách làm:** patch có kiểm tra (script dừng nếu không tìm thấy đoạn cần thay) vào `game.js`, rồi chạy test cũ để thấy đúng những test bị luật mới thay thế (6 test đỏ, đều do luật bị THAY THẾ), sửa/xóa có ghi lý do, thêm test + 4 scenario mới. Viết ADR + CHANGELOG.
- **AI sai / suýt sai:**
  - Test châm dầu ban đầu giả định đèn vừa đặt `fuel: 100` là "đầy" ở tick đầu, nhưng hao ở bước 2 xảy ra trước bước tương tác nên còn 99.98 → được châm. Code đúng theo thứ tự tick; test sai, đã sửa và tách test "đèn đầy".
  - Test "hết choáng về wander" bỏ sót rằng bước 8 cùng tick chuyển `wander` → `chase` nếu Mây ≤ 12 m. Đã sửa test (đưa Mây ra xa).
  - Scenario `win_last_lantern` cũ (time_left 120 s) sẽ thua vì đèn đặt sẵn hết dầu sau 100 s. Đổi time_left 60 s, ghi lý do.
- **Token ước tính Phase 3:** ~120k đầu vào + ~30k đầu ra. Tiết kiệm: patch theo đoạn thay vì viết lại file, chỉ đọc lại đúng đoạn cần.

## Phase 4 (2026-11-20)
- **Đầu vào:** 7 ảnh Ticket-04 + contract v1.3.
- **Cách làm:** soak (Node thuần) → cảnh bench trong core (`src/core/bench.js`, có test) → script bench mở trình duyệt mặc định và nhận kết quả qua server tạm → bảng xếp hạng lưu đĩa (`scripts/leaderboard.js`, có test + lệnh xuất) → accessibility trong `src/web` → đóng gói `npm run dist`, tài liệu, retro.
- **AI sai / suýt sai:** soak đo RSS vượt 1.2× dù heap JS phẳng — đo riêng heap để chứng minh không rò rỉ rồi dùng `--expose-gc --jitless` và ghi giả định thay vì "làm đẹp" số.
- **Token ước tính Phase 4:** ~150k vào + ~45k ra. Tổng dự án xem `docs/notes/retro.md`.
