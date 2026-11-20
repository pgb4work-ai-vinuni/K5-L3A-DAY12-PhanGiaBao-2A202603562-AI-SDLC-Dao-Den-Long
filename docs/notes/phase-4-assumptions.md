# Phase 4 (Ticket-04 "Bình minh: phát hành v1.0.0") — Giả định và tiêu chí nghiệm thu

## Giả định
| Chủ đề | Giả định |
|---|---|
| Benchmark trên bản web | `bench_cmd` bật server tạm, mở **trình duyệt mặc định** ở `/?bench=1`. Canvas cố định 1280×720 (pixel ratio 1) trong cửa sổ trình duyệt. Script tự tắt server và thoát mã 0 khi nhận kết quả. |
| vsync | Trình duyệt luôn đồng bộ `requestAnimationFrame` với tần số màn hình, không tắt được từ trang → `vsync_off: false`. Muốn đo không giới hạn ở Chrome: chạy Chrome với `--disable-gpu-vsync --disable-frame-rate-limit` rồi mở URL mà `npm run bench -- --no-open` in ra. |
| `peak_mem_mb` | `null`: trang web không đọc được RSS của tiến trình trình duyệt. Thêm `js_heap_peak_mb` (Chrome `performance.memory`) để tham khảo. |
| `load_ms` | Từ lúc tiến trình `bench.js` khởi động tới khung hình đầu tiên của cảnh bench (gồm thời gian mở trình duyệt). |
| Cảnh bench | Bóng Mực "di chuyển theo luật wander bình thường" gồm cả chuyển `chase` khi cách Mây ≤ 12 m (luật Phase 2). Sát thương, nhặt, hao/hút dầu, sinh thêm, hết giờ đều tắt. |
| Soak: seed | Đêm thứ i (i = 1..N) dùng `seed + i`; loại Đêm = 1, 2, 3 xoay vòng. |
| Soak: bộ nhớ | Chạy với `--expose-gc` (dọn rác trước khi đo RSS) và `--jitless`. Đo cho thấy heap JS phẳng (≈ 4.3 → 4.8 MB qua 20 Đêm), RSS tăng là do bộ nhớ mã JIT/allocator của V8, không phải rò rỉ; `--jitless` loại phần JIT nên RSS phản ánh đúng bộ nhớ game. |
| Bảng xếp hạng | Lưu ở `data/leaderboard.json` (đĩa cục bộ, không commit). Tên 3–12 ký tự: chữ (kể cả tiếng Việt có dấu), số, `_`. `achieved_at` ISO 8601 có múi giờ (`+00:00`). `seed` là seed của lượt chơi. Bản web tĩnh (Release) dùng `localStorage` thay đĩa. |
| Đổi phím | Một phím cho mỗi hành động; phím ← → xoay camera cố định. |
| Giảm chuyển động | Game không có rung camera; tùy chọn tắt hiệu ứng chớp màn hình khi bị đánh. |

## Tiêu chí nghiệm thu
1. `npm run bench` ghi `bench.json` đủ trường; cảnh đúng 200/100/L1–L3 (test `release.test.js`). Ngưỡng `avg_fps ≥ 60`, `p1_low_fps ≥ 30`, `load_ms ≤ 10000` đo trên máy chấm.
2. `npm run soak`: `crashes = 0`, `mem_end_mb ≤ 1.2 × mem_start_mb`.
3. Bảng xếp hạng: top 10, sắp đúng, lưu qua lần mở lại, xuất `{"entries": [...]}` đúng thứ tự.
4. Đổi phím + báo trùng + khôi phục mặc định + lưu; phụ đề 4 loại; giảm chuyển động; chữ ≥ 18 px, ×1.25.
5. README ≤ 3 lệnh; CHANGELOG 4 phase; CREDITS; LICENSE; Release v1.0.0 có bản chạy được.
