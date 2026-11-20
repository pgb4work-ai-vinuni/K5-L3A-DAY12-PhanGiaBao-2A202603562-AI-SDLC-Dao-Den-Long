# Bằng chứng Phase 3 (tag `phase-3`)

Tái tạo: `npm install && npm test && npm run proof -- phase-3`. Output headless KHÔNG sửa tay.
Kết quả: `npm-test.txt` (63/63 đạt). Tóm tắt: `proof-summary.txt`. Quyết định thiết kế: `docs/adr/001-lantern-fuel-and-dawn-win.md`. Breaking changes: `CHANGELOG.md`.

| # | Yêu cầu Ticket-03 | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| 1 | Contract v1.2, tuning mới, thời lượng 240/270/300 | test `contract v1.2`, `bản đồ chuẩn` | `npm-test.txt` | Đạt |
| 2 | Dầu hao 1/giây, hết dầu tắt (`lantern_out`, deposited 0, ever_lit) | test `dầu: hao…` + scenario `p3_fuel_out` | `p3_fuel_out.jsonl` | Đạt |
| 3 | Thắp lại 5 đom đóm, `relight`, +40, `relit_count` | test `thắp lại…` + `p3_fuel_out` | `p3_fuel_out.jsonl` | Đạt |
| 4 | Châm dầu (công thức, đèn đầy không chọn) | test `châm dầu…`, `đèn đầy…` + scenario `p3_refuel` | `p3_refuel.jsonl` | Đạt |
| 5 | Dầu tính bằng đơn vị 1/60 | ADR mục 2; test hút 60 tick trừ đúng 360 đơn vị | `npm-test.txt` | Đạt |
| 6 | fuel < 30 mất vùng an toàn | test `fuel < 30…` | `npm-test.txt` | Đạt |
| 7 | Bóng hút dầu (`drain`, 5/giây, `fuel_drain` mỗi 60 tick) | test core + scenario `p3_drain` | `p3_drain.jsonl` | Đạt |
| 8 | Thoát `drain` (chase ≤ 6 m, stunned, wander); hết choáng về wander | test `drain -> chase…`, `hết choáng…` | `npm-test.txt` | Đạt |
| 9 | Châm ≥ 30 đẩy bóng ra mép ≤ 30 tick, không gây hit | test `châm đèn lên >= 30…` | `npm-test.txt` | Đạt |
| 10 | Luật thắng mới (`dawn_survived`, `dawn`, `no_flames` trước) | test core ×3 + scenario `p3_dawn_win`, `win_last_lantern` | `p3_dawn_win.jsonl`, `win_last_lantern.jsonl` | Đạt |
| 11 | Sức chứa 10 + 2 × lần thắp, tối đa 20 | test `sức chứa…` | `npm-test.txt` | Đạt |
| 12 | Điểm mới | test nạp (+5), thắp lại (+40), pulse drain (+15), thưởng bình minh | `npm-test.txt` | Đạt |
| 13 | Snapshot/scenario/sự kiện v1.2 | test `v1.1/v1.2 snapshot…`, scenario dùng `fuel`/`ever_lit`/`target_lantern_id`/`successful_lights` | `npm-test.txt` | Đạt |
| 14 | Hồi quy Phase 1–2 không bị thay thế | toàn bộ test cũ còn hiệu lực vẫn chạy | `npm-test.txt` | Đạt |
| 15 | Tất định + hiệu năng | proof | `proof-summary.txt` | Đạt (≤ 0.5 s/Đêm) |
| 16 | Web: thanh dầu, nhấp nháy 1 Hz, đèn tắt xẹp + rách, HUD sức chứa, chế độ mù màu | — | — | **Chưa có bằng chứng bằng mắt**: code đã viết, qua kiểm cú pháp; chưa bật server (cần người dùng cho phép) |
