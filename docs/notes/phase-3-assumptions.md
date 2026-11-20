# Phase 3 (Ticket-03 "Đèn cạn dầu") — Giả định và tiêu chí nghiệm thu

Quyết định thiết kế: [ADR 001](../adr/001-lantern-fuel-and-dawn-win.md). Breaking changes: [CHANGELOG.md](../../CHANGELOG.md).

## Giả định
| Chủ đề | Giả định |
|---|---|
| Scenario `lit: true` không có `ever_lit` | Coi như `ever_lit: true` (đèn đã từng sáng). Không tính vào `successful_lights`. |
| Scenario `lit: false` | `fuel` = 0 dù có truyền `fuel`. |
| Đèn đầy | "Đầy" là fuel đúng 100 sau bước 2. Vì đèn tự hao ở bước 2 nên đèn vừa thắp tick trước đã nhận được châm 1 đom đóm. |
| `fuel_drain` | Mỗi bóng đang hút ghi một sự kiện mỗi 60 tick hút liên tục của chính nó; `fuel` trong sự kiện là sau khi trừ ở tick đó. |
| Bóng đi tới đèn yếu | Đi với tốc độ wander (1.5 m/s), dừng ở 2 m. Không có đèn yếu thì đi về đèn tắt gần nhất; không có đèn tắt thì đi lang thang như Phase 2. |
| Bóng đang `drain` | Không gây sát thương (chỉ `chase`/`wander` gây hit). |
| Tỏa Sáng trúng bóng `drain` | +15 tổng (5 + 10 thêm). |
| Thắng | Xét sau mọi cập nhật của tick cuối (time_left = 0). Đếm đèn `lit` lúc đó. |
| Thưởng bình minh | Chỉ khi thắng; `floor(fuel)` dùng dầu tại tick cuối. |

## Tiêu chí nghiệm thu (đều có test trong `tests/core.test.js` hoặc scenario `tests/scenarios/p3_*`)
1. Đèn vừa thắp/thắp lại: fuel = 100; hao 1/giây; fuel ≤ 0 → tắt, `deposited = 0`, `lantern_out`, `ever_lit = true`.
2. Thắp lại cần 5; `lantern_lit.relight = true`; +40; `relit_count` tăng.
3. Châm dầu: `used = min(mang, ceil((100 − fuel)/10))`, `fuel = min(100, fuel + 10·used)`, `refuel`; đèn đầy không được chọn.
4. fuel < 30 mất vùng an toàn; đúng 30 vẫn còn.
5. Bóng `wander` tới đèn yếu gần nhất, ≤ 2 m thì `drain`, hút 5/giây cộng dồn, `fuel_drain` mỗi 60 tick; thoát `drain` đúng 3 điều kiện; hết choáng về `wander`.
6. Châm lên ≥ 30 khi bóng trong 6 m → bóng bị đẩy ra mép trong ≤ 30 tick, không gây sát thương.
7. Thắng `dawn_survived` khi sống tới hết giờ và đèn sáng ≥ ceil(0.6 × tổng) (3/5, 4/6, 5/7); thiếu → `dawn`; hết lửa → `no_flames` trước, kể cả tick cuối; thắp đủ không kết thúc Đêm.
8. Sức chứa `10 + 2 × successful_lights`, tối đa 20.
9. Điểm mới (+5/đom đóm, +100/+40, +5/+15, bình minh +50 + floor(fuel), +50/lửa, không thưởng thời gian).
10. Web: thanh dầu, nhấp nháy 1 Hz khi fuel < 30, đèn tắt xẹp 20% + vết rách, HUD `mang / sức chứa`, chế độ mù màu (#00B3FF, #FFFFFF + ⚠) được lưu.
