# Bằng chứng Phase 4 (tag `phase-4`, Release `v1.0.0`)

Tái tạo: `npm install && npm test && npm run soak && npm run proof -- phase-4`. Benchmark: `npm run bench` (mở trình duyệt).

| # | Yêu cầu Ticket-04 | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|---|
| 1 | Cảnh benchmark chuẩn (200 bóng wander, 100 đom đóm, L1–L3 fuel 100, tắt sinh/sát thương/nhặt/hao dầu/kết thúc, camera bay vòng) | test `release.test.js` (4 test bench) | `npm-test.txt` | Đạt |
| 2 | `bench.json` (avg_fps, p1_low_fps, p95, frames, load_ms…) | `npm run bench` trên máy thật | `bench.json` ở gốc repo | **Chờ chạy**: cần mở trình duyệt, agent không được phép bật server — người dùng chạy |
| 3 | Soak 10 Đêm, 0 crash, RSS cuối ≤ 1.2 × đầu | `npm run soak` + test | `soak.json` (gốc repo và ở đây) | Đạt: 0 crash, 40.5 → 44.2 MB (≤ 48.6) |
| 4 | Bảng xếp hạng top 10, sắp xếp, lưu đĩa, lệnh xuất | test `bảng xếp hạng…` | `npm-test.txt` | Đạt (phần logic + lệnh xuất); màn hình web chưa xem bằng mắt |
| 5 | Đổi phím, báo trùng, mặc định, lưu | code `src/web/main.js` (`renderKeys`, `DEFAULT_KEYS`) | — | Đã viết, **chưa xem bằng mắt** |
| 6 | Phụ đề/chỉ báo, giảm chuyển động, cỡ chữ | code `caption()`, `edgeArrow()`, CSS `html { font-size: 18px }`, `body.large` | — | Đã viết, **chưa xem bằng mắt** |
| 7 | Hồi quy Phase 1–3 | toàn bộ test cũ (không test nào bị đổi ở Phase 4) | `npm-test.txt` (69/69) | Đạt |
| 8 | Tất định + hiệu năng headless | proof | `proof-summary.txt` | Đạt |
| 9 | Đóng gói (README ≤ 3 lệnh, CHANGELOG, CREDITS, LICENSE, Release) | `npm run dist` tạo `dist/dao-den-long-v1.0.0/` | — | Đã có; Release do người dùng tạo |
| 10 | Video demo < 5 phút | — | — | **Người dùng quay** |
