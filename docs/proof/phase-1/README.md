# Bằng chứng Phase 1 (tag `phase-1`)

Tái tạo: `npm install && npm test && npm run proof -- phase-1`. Output headless KHÔNG sửa tay.

| # | Yêu cầu (PRD-0 / Contract v1.0) | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| 1 | Màn Đêm 1, đảo tròn, 5 Đèn Lồng Lớn | test `tick 0…`, ảnh | `npm-test.txt`, `screenshot-play.jpg` | Đạt |
| 2 | Đi lại, nhảy, camera 3D | test `player_speed`, `cam_yaw`, `nhảy`; chơi thử | `npm-test.txt`, `screenshot-play.jpg` | Đạt |
| 3 | Đom đóm rải rác, nhặt được | test `nhặt đom đóm` (tick 35), `carry_capacity` | `npm-test.txt`, `contract_example.jsonl` | Đạt |
| 4 | Nạp ánh sáng, thắp đèn | test `interact…`, scenario thắng | `win_last_lantern.jsonl` | Đạt |
| 5 | Bóng Mực xuất hiện, đuổi | test chạm/flames; chạy cả đêm seed 42 khi Mây đứng yên: Bóng Mực đuổi tới, 3 lần `player_hit`, thua `no_flames` ở tick 734 | `seed42_run1.jsonl` | Đạt (sự kiện `shade_spawned` mỗi 45 s chưa có bằng chứng riêng) |
| 6 | Tỏa sáng xua Bóng Mực, tốn ánh sáng | test `pulse…`, `không đủ ánh sáng` | `npm-test.txt` | Đạt |
| 7 | Bóng Mực sợ đèn (safe_radius) | test `safe_radius` | `npm-test.txt` | Đạt |
| 8 | Thắng / thua / điểm | test `all_lit`, `no_flames`, `dawn` | `npm-test.txt`, `win_last_lantern.jsonl` (score 532) | Đạt |
| 9 | HUD, chơi lại | chơi thử trên web, ảnh | `screenshot-lanterns-lit.jpg`, `screenshot-win.jpg` | Đạt (kiểm bằng mắt) |
| 10 | Headless: tick model, `--ticks N`, snapshot, dòng `end` | test `định dạng…` | `npm-test.txt` | Đạt |
| 11 | Tất định cùng seed | chạy 2 lần seed 42, so byte | `proof-summary.txt` | Đạt |
| 12 | File sai định dạng → exit 2 | test + proof | `proof-summary.txt` | Đạt |
| 13 | Đảo sáng dần khi thắp đèn | ảnh 3/5 đèn | `screenshot-lanterns-lit.jpg` | Đạt (kiểm bằng mắt) |

Chưa đạt / giới hạn: chưa có âm thanh; chưa đo FPS; ảnh chụp trong trình duyệt nhúng (độ phân giải thấp). Ảnh `screenshot-lanterns-lit.jpg` và `screenshot-win.jpg` dựng trạng thái bằng `window.__game` (đặt đèn đã thắp, đặt vị trí Mây) rồi nhấn E thật để thắng — không phải một ván chơi liền mạch.
