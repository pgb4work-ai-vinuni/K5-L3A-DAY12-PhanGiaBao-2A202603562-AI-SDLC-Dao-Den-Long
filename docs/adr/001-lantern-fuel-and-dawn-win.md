# ADR 001 — Đèn có nhiên liệu, thắng ở bình minh (Ticket-03, contract v1.2)

**Trạng thái:** Chấp nhận · 2026-11-20 · Phase 3

## Bối cảnh
Ticket-03 (Change Request) thay ba luật cốt lõi: đèn thắp rồi vẫn có thể tắt, Bóng Mực không còn luôn bị chặn bởi vùng an toàn, và mục tiêu đổi từ "thắp hết" sang "giữ đảo sáng tới bình minh".

## Quyết định
1. **Mô hình trạng thái đèn** đổi từ 2 trạng thái (`chưa sáng` → `sáng`, một chiều) sang vòng lặp:
   `tắt (ever_lit=false)` → nạp 10 → `sáng (fuel 100)` → hao/bị hút → `fuel ≤ 0` → `tắt (ever_lit=true, deposited=0)` → nạp 5 → `sáng (relight)` …
   Trong trạng thái sáng có thêm hai mức: `fuel ≥ 30` (có vùng an toàn) và `fuel < 30` (yếu: mất vùng an toàn, Bóng Mực đi tới hút).
2. **Dầu lưu bằng số nguyên đơn vị 1/60** (`fuelU = fuel × 60`): hao 1 đơn vị/tick, mỗi bóng hút 5 đơn vị/tick, mỗi đom đóm châm 600 đơn vị. Không có sai số thực; chỉ làm tròn 1 chữ số khi xuất snapshot.
3. **Hao + hút ở bước 2** (bộ đếm), tắt đèn ngay sau bước 2, nên đèn tắt trong tick này không còn vùng an toàn ở bước 6 và không được tính lúc xét thắng.
4. **Bóng Mực thêm trạng thái `drain`**: chỉ bóng `wander` mới chọn đèn yếu gần nhất; tới ≤ 2 m thì đứng yên hút. Thoát `drain` khi Mây vào 6 m (→ `chase`), trúng Tỏa Sáng (→ `stunned`), hoặc đèn tắt / được châm ≥ 30 / cách > 2 m (→ `wander`). Hết choáng luôn về `wander`.
5. **Luật thắng** chuyển hẳn sang bước 11: hết Ngọn Lửa → `no_flames` (ưu tiên trước), hết giờ → so số đèn sáng với `ceil(0.6 × tổng)` → `dawn_survived` hoặc `dawn`. Bỏ hẳn `all_lit`.
6. **Điểm** thay toàn bộ: +5/đom đóm nạp, +100 thắp đầu, +40 thắp lại, +5/+15 Tỏa Sáng, bình minh +50 + floor(fuel) mỗi đèn sáng, +50 mỗi Ngọn Lửa. Các khóa mới trong `tuning.score`: `per_relight`, `per_stun_drain`, `per_lit_lantern_dawn`; `per_second_left = 0` (đã bỏ).
7. **Sức chứa** là thuộc tính tính ra (`10 + 2 × successful_lights`, tối đa 20), không lưu riêng.

## Hệ quả
- Test Phase 1–2 dựa trên "thắng ngay khi thắp hết", điểm cũ, thời lượng cũ đã được sửa hoặc xóa có ghi lý do (xem `CHANGELOG.md`).
- Headless có thể chạy hết đêm khi Mây đứng yên (bóng ưu tiên đi tới đèn), nên kiểm thử hiệu năng dài hơn.
- Phase sau thêm luật về dầu chỉ cần sửa `game.js` (bước 2, 5, 8) và các khóa tuning.
