# Changelog

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
