# Phase 2 (Ticket-02 "Ba hòn đảo") — Spec, giả định, tiêu chí nghiệm thu

## Thay đổi so với Phase 1 (và lý do)
| Phase 1 | Phase 2 | Lý do |
|---|---|---|
| Số liệu tự chọn (đèn 5, nhặt 1.5 m, nạp 3 m, pulse 1/6 m, bóng 3 m/s…) | Số chuẩn Ticket-02 trong `game.contract.json` v1.1 | Ticket bắt buộc thay mọi giá trị tự chọn |
| Điểm khi **nhặt** đom đóm | Điểm khi **nạp** đom đóm (+10/con), stun +5 | Điểm chuẩn hóa |
| Không rơi khỏi đảo (tường vô hình) | `fall_enabled: true`, Y < −10 là rơi | Ngoài đảo là biển mây |
| Bị chạm: rơi mất đom đóm | Rơi ra vành 1.5–2.5 m, nhặt lại được (TTL 480 tick) | Ticket |
| Trạng thái bóng `chase`/`stunned` | `spawning`/`wander`/`chase`/`recoil`/`stunned` | Contract v1.1 |
| Điểm thưởng tính sau khi trừ thời gian | Giữ nguyên; thứ tự 12 bước theo ticket | Ticket |

Test Phase 1 bị đổi (không tắt âm thầm):
- `tests/core.test.js` viết lại theo số chuẩn (ví dụ đom đóm ở z = 5 giờ nhặt ở tick 40 vì bán kính 1.0).
- `win_last_lantern.scenario.json`: 10 đom đóm thay vì 5 vì `lantern_cost` = 10. Điểm thắng giờ là 582.
- Bỏ test "Bóng Mực không vào safe_radius quanh đèn đứng yên 600 tick" bản cũ; thay bằng test đẩy ra mép 6 m trong 30 tick.

## Giả định cho chỗ Ticket-02 không quy định
| Chủ đề | Giả định |
|---|---|
| Tăng tốc ≤ 0.1 s | Vận tốc đạt ngay trong 1 tick (0 s ≤ 0.1 s), giữ khớp test Phase 1 (12 m sau 120 tick). |
| Góc bản đồ | Điểm = (r·cosθ, y, r·sinθ). Kiểm chứng: tầng 1 Đêm 3 "z > 0" ứng với 20°…160°. |
| Xuất phát Đêm 2 / Đêm 3 | Đêm 2: (0,0,0) đảo A. Đêm 3: (0,0,−30) vì tâm là tháp chuông trên tầng 2. |
| Vách / dốc | Bước lên tối đa 0.35 m mỗi tick; cao hơn là vách (chặn). Dốc rộng 3 m tuyến tính r30→r24. Tháp chuông chặn trong r 2 m. |
| Bục nhảy | Kích hoạt khi chân Mây đứng trên bục (XZ ≤ 1 m, cùng độ cao). Vận tốc phóng giữ tới khi chạm đất; lướt vẫn dùng được và ghi đè trong 12 tick lướt. |
| `spawning` | Kéo dài 30 tick, đứng yên, không gây hit; sau đó `chase` nếu ≤ 12 m, ngược lại `wander`. |
| `wander` | Bay chậm 1.5 m/s tới điểm ngẫu nhiên (PRNG theo seed). |
| Hết `stunned` / `recoil` | `chase` nếu ≤ 18 m, ngược lại `wander`. |
| Bóng Mực bay | Bay tự do trên XZ (không rơi), tâm cao hơn mặt đất 1 m. Bị chặn ở mép vùng an toàn và tháp chuông. |
| Chênh cao khi chạm | So `player.pos.y` (chân) với `shade.pos.y` (tâm), ≤ 1.5 m. |
| Đẩy ra vùng an toàn | Tốc độ đẩy = (6 − d)/30 m/tick nên ra tới mép đúng ≤ 30 tick. Trong lúc đẩy không gây sát thương, không đuổi. |
| Scenario shade không có `state` | `chase` nếu ≤ 12 m, ngược lại `wander` (hoạt động bình thường ngay). |
| Trần 30 đom đóm | Chỉ đếm đom đóm `random` (đom đóm rơi không chiếm điểm sinh). |
| Gió Lạc | Sinh tại điểm sinh Bóng Mực (điểm sương) ngẫu nhiên. `idle` bay 2 m/s; `removed` vẫn nằm trong mảng `drifters` (không tính vào tối đa 2). Gió Lạc đã cướp hoặc đã bị pulse thì không đuổi lại. |
| Gió mạnh | Bắt đầu ở sim_tick 1800, 3600…; hướng `dir_deg` nguyên, ngẫu nhiên theo seed; cộng 2 m/s vào vận tốc ngang Mây. |
| `night_start` | Ghi ngay sau snapshot tick 0, với `tick: 0`. |
| `invuln` trong snapshot | Boolean (true khi còn bất tử hoặc đang chờ hồi sinh). `*_cd_s`, `charm_s`, `ttl_s`, `respawn_s` là giây. `ttl_s` của đom đóm random là `null`. |
| Pulse | Luôn phát `pulse` khi kích hoạt (kể cả `stunned_ids` rỗng). `stunned_ids` chỉ chứa Bóng Mực. |
| Rơi khỏi đảo | `player_hit {by:"fall", flames, dropped: 0, lost}`. Trong 60 tick chờ: không nhặt, không bị chạm, đứng yên. |

## Tiêu chí nghiệm thu Phần 3 (mỗi mục có test, xem bảng bằng chứng)
1. **Gió Lạc:** mang ≥ 5 và ≤ 15 m thì `chase`; chạm ≤ 1.2 m cướp min(3, mang) → `flee` 240 tick → `removed`; pulse lúc `chase` → `flee` không cướp; pulse lúc `flee` có đồ → `drifter_drop`, đom đóm rơi lại, biến mất sau 120 tick.
2. **Bùa Gió:** nhặt như đom đóm → `charm_picked {charm_id, charm_ticks: 600}`; chạy 7.2 m/s; lướt không hồi chiêu; xuất hiện lại sau 2700 tick.
3. **Chuỗi 3 Đêm (web):** Menu → giới thiệu Đêm → chơi → kết quả → Đêm kế; thắng Đêm 3 → Bình Minh + tổng điểm; thua → chơi lại Đêm đó.
4. **Tạm dừng:** Esc/P; headless: `tick` tăng, `sim_tick`/thời gian/hồi chiêu/TTL đứng yên, snapshot `state: "paused"`, sự kiện `paused`/`resumed`. Web: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu.
5. **Cài đặt:** âm lượng, độ nhạy chuột lưu trong `localStorage`.
6. **Âm thanh:** nhạc nền + hiệu ứng nhặt, thắp đèn, tỏa sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối, báo gió.
7. **HUD:** Ngọn Lửa trên trái; mm:ss trên giữa (đỏ + nhấp nháy ≤ 30 s); đèn k/n + điểm trên phải; thanh 10 ô dưới giữa; hồi chiêu Lướt/Tỏa Sáng dưới phải; "E — Nạp ánh sáng (x/10)"; mũi tên tới đèn chưa sáng gần nhất khi ngoài màn hình.
8. **Bảng màu chuẩn** + ánh sáng môi trường = 0.15 + 0.55 × (đèn sáng / tổng).
