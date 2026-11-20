# Bằng chứng Phase 2 (tag `phase-2`)

Tái tạo: `npm install && npm test && npm run proof -- phase-2`. Output headless KHÔNG sửa tay.
Kết quả test: `npm-test.txt` (47/47 đạt). Tóm tắt proof: `proof-summary.txt`. Mỗi scenario headless có file `<tên>.jsonl` ở đây, đầu vào ở `tests/scenarios/`.

| # | Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| 1 | Số liệu chuẩn, contract v1.1 | test `contract v1.1: tuning = số chuẩn` | `npm-test.txt` | Đạt |
| 2 | Bản đồ chuẩn 3 Đêm (đèn, điểm sinh, thời gian) | test `bản đồ chuẩn…`, `lịch sinh…` | `npm-test.txt` | Đạt |
| 3 | Thứ tự 12 bước trong tick | đọc code `Game.step` (comment đánh số 1–11 + snapshot ở headless); test thắng trước hết giờ | `src/core/game.js`, `npm-test.txt` | Đạt |
| 4 | Lướt 14 m/s · 0.2 s · hồi 1.5 s | test core + scenario `p2_dash` | `p2_dash.jsonl` (dash ở tick 1 và 91) | Đạt |
| 5 | Rơi khỏi đảo, hồi sinh, bất tử 90 | test core + scenario `p2_fall` | `p2_fall.jsonl` | Đạt |
| 6 | Tạm dừng (tick tăng, sim_tick đứng) | test core + scenario `p2_pause` | `p2_pause.jsonl` | Đạt |
| 7 | Bị chạm: rơi đom đóm ra vành, recoil, TTL | test core + scenario `p2_hit_drop` | `p2_hit_drop.jsonl` | Đạt |
| 8 | Vùng an toàn 6 m, đẩy ra ≤ 30 tick | test core + scenario `p2_safe_zone` | `p2_safe_zone.jsonl` | Đạt |
| 9 | Tỏa Sáng 3 đom đóm / 5 m 3D / choáng 120 / đẩy 4 m trong 15 tick | test core + scenario `p2_pulse` | `p2_pulse.jsonl` | Đạt |
| 10 | Gió Lạc | test core ×2 + scenario `p2_drifter` | `p2_drifter.jsonl` | Đạt |
| 11 | Bùa Gió | test core + scenario `p2_charm` | `p2_charm.jsonl` | Đạt |
| 12 | Đêm 2: cầu tre, bục nhảy | test core ×2 + scenario `p2_jump_pad` | `p2_jump_pad.jsonl` | Đạt |
| 13 | Đêm 3: 3 tầng, vách, dốc, tháp, bục nhảy | test core + scenario `p2_night3_tiers` | `p2_night3_tiers.jsonl` | Đạt |
| 14 | Đêm 3: gió mạnh 30 s / 5 s | test core + scenario `p2_wind` | `p2_wind.jsonl` | Đạt |
| 15 | Trạng thái Bóng Mực đúng tên v1.1 | test `wander/chase`, `lịch sinh` (spawning), `recoil`, `stunned` | `npm-test.txt` | Đạt |
| 16 | Snapshot/scenario/input/sự kiện v1.1 | test `v1.1 snapshot có đủ trường mới` | `npm-test.txt` | Đạt |
| 17 | Tất định cùng seed (cả 3 Đêm) | proof chạy 2 lần, so byte | `proof-summary.txt` | Đạt |
| 18 | Một Đêm đầy đủ ≤ 30 s | proof chạy 18 000 / 19 800 / 21 600 tick | `proof-summary.txt` (≈ 0.2–0.3 s) | Đạt |
| 19 | Hồi quy Phase 1 | `contract_example`, `win_last_lantern`, test định dạng/exit 2 | `npm-test.txt` | Đạt (test cũ chỉnh theo số chuẩn, lý do ở `docs/notes/phase-2-assumptions.md`) |
| 20 | Web: chuỗi 3 Đêm, menu, tạm dừng, cài đặt, âm thanh, HUD, bảng màu | chơi thử trên trình duyệt | — | **Chưa có bằng chứng**: code đã viết và qua kiểm cú pháp, nhưng chưa chạy server để xem/chụp (cần người dùng cho phép chạy server) |
| 21 | ≥ 30 FPS ở 1280×720 | bộ đếm FPS góc dưới trái (`window.__fps`) | — | **Chưa đo** (cùng lý do mục 20) |
