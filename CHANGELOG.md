# Changelog

## [phase-4] / v1.0.0 — Ticket-04 "Bình minh: phát hành v1.0.0" (contract v1.3)
### Thêm
- **Benchmark** `node scripts/bench.js --seed 42 --duration 30 --out bench.json` (`npm run bench`): cảnh chuẩn Đêm 1, 200 Bóng Mực wander, 100 đom đóm, L1–L3 sáng; camera bay vòng r30/Y15/15 s; canvas 1280×720; khởi động 3 s rồi đo; ghi `avg_fps`, `p1_low_fps`, `frame_ms_p95`, `frames`, `load_ms`.
- **Soak test** `node --expose-gc --jitless src/soak.js --seed 7 --nights 10 --out soak.json` (`npm run soak`).
- **Bảng xếp hạng cục bộ** (top 10, lưu `data/leaderboard.json`), nhập tên sau Bình Minh hoặc khi thua, màn hình từ menu chính, lệnh `node scripts/serve.js --export-leaderboard out.json`.
- **Dễ tiếp cận**: đổi phím mọi hành động (báo trùng phím, khôi phục mặc định, được lưu); phụ đề/chỉ báo hình ảnh (Bóng Mực xuất hiện + mũi tên ở mép màn hình, gió sắp thổi, 10 s cuối, đèn sắp hết dầu); giảm chuyển động (tắt chớp màn hình); chữ tối thiểu 18 px, tùy chọn chữ lớn ×1.25.
- **Đóng gói**: `npm run dist` tạo bản web tĩnh `dist/dao-den-long-v1.0.0/` cho GitHub Release.
### Thay đổi
- `contract_version` 1.2 → **1.3**, thêm `bench_cmd`, `soak_cmd`. `run_cmd` đổi từ `npm start` sang `node scripts/serve.js` (để nhận tham số `--export-leaderboard` trực tiếp; `npm start` vẫn chạy được).
- Server tách thành `scripts/server-core.js` (dùng chung cho game và benchmark).
- Mọi luật/số liệu v1.0–v1.2 giữ nguyên; không có test cũ nào bị đổi.

## [phase-3] — Ticket-03 "Đèn cạn dầu" (contract v1.2)
### Breaking changes
- `contract_version` 1.1 → **1.2**. `tuning` thêm `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`; `score` thêm `per_relight`, `per_stun_drain`, `per_lit_lantern_dawn`.
- Thời lượng Đêm 1/2/3: 300/330/360 s → **240/270/300 s**.
- **Không còn thắng sớm**: thắp đủ đèn không kết thúc Đêm. Thắng khi sống tới bình minh với ≥ `ceil(0.6 × tổng đèn)` đèn sáng. `game_over.reason` `all_lit` bị bỏ, thêm `dawn_survived`.
- **Đèn có dầu và có thể tắt** (`lantern_out`); thắp lại chỉ cần 5 đom đóm; châm dầu đèn đang sáng (`refuel`).
- **Vùng an toàn** chỉ còn ở đèn có `fuel ≥ 30`.
- **Bóng Mực** thêm trạng thái `drain` (hút dầu, `fuel_drain` mỗi 60 tick); hết choáng về `wander` (trước: `chase` nếu ≤ 18 m).
- **Điểm**: +10 → **+5** mỗi đom đóm nạp; thêm +40 thắp lại, +15 Tỏa Sáng trúng bóng đang hút; bỏ thưởng thời gian; bình minh +50 + floor(fuel) mỗi đèn sáng.
- **Sức chứa** không cố định 10 nữa: `10 + 2 × successful_lights`, tối đa 20.
- Snapshot: đèn thêm `fuel`, `ever_lit`, `relit_count`; `player.capacity`. `lantern_lit` thêm `relight`.
- Scenario: đèn nhận `fuel`, `ever_lit`; `player.successful_lights`; `shades[].target_lantern_id`.
### Thêm
- Web: thanh dầu trên đèn, nhấp nháy 1 Hz khi fuel < 30, đèn tắt xẹp 20% + vết rách, HUD `đang mang / sức chứa`, cài đặt "Bảng màu dễ phân biệt".
### Test thay đổi
- Sửa: `contract`, `bản đồ chuẩn` (thời lượng), `player_speed` (time_left 238), `nạp đèn` (+5), headless `win_last_lantern` (giờ thắng ở bình minh, time_left 60).
- Xóa: `thắng xét trước hết giờ: thắp đèn cuối đúng tick hết giờ vẫn thắng` — luật bị Ticket-03 thay thế; thay bằng test `dawn_survived`/`dawn`/`no_flames`.

## [phase-2] — Ticket-02 "Ba hòn đảo" (contract v1.1)
- Số liệu chuẩn, 3 Đêm, lướt, rơi khỏi đảo, tạm dừng, đom đóm rơi, recoil, Gió Lạc, Bùa Gió, gió mạnh, menu/chuỗi Đêm/âm thanh/HUD.

## [phase-1] — PRD-0 (contract v1.0)
- Đêm 1, 5 đèn, đom đóm, Bóng Mực, Tỏa Sáng, thắng/thua, headless.
