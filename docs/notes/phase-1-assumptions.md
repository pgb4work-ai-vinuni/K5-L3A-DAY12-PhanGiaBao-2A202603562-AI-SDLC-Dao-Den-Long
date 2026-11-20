# Phase 1 — Giả định và tiêu chí nghiệm thu

## Lựa chọn công nghệ
- Web 3D bằng Three.js (người dùng yêu cầu chạy trên giao diện web). Node.js chạy server tĩnh và headless. Logic thuần JS dùng chung cho cả hai, nên headless và bản chơi cùng một luật.

## Giả định cho chỗ PRD-0 mơ hồ
| Chủ đề | Giả định |
|---|---|
| Đảo | Tròn, tâm (0,0,0), bán kính 40 m. 5 đèn L1..L5 đều trên vòng 25 m, L1 tại (0,0,25) (khớp ví dụ contract), L2..L5 theo chiều quay +X. |
| Rơi khỏi đảo | Không có (`fall_enabled: false`); mép đảo chặn lại, không phát `player_hit` by `fall`. |
| "Máu" | = `flames` (3 ngọn lửa). |
| "Ánh sáng" để tỏa sáng | = đom đóm đang mang; mỗi lần tỏa sáng tốn `pulse_cost` = 1. Không đủ hoặc còn hồi chiêu thì không có gì xảy ra (không phát sự kiện). |
| Nhặt đom đóm | Tự động khi khoảng cách XZ ≤ `pickup_radius`, chỉ khi `carried < carry_capacity`. Nhiều con trong cùng bước thì nhặt theo thứ tự danh sách. |
| Nạp đèn | Cạnh nhấn interact, chọn đèn **chưa thắp** gần nhất trong `interact_radius`. Nạp `min(carried, lantern_cost - deposited)`. Đủ `lantern_cost` thì thắp (`lantern_lit`). |
| Bóng Mực | Luôn đuổi thẳng tới Mây theo XZ với `shade_speed`. Trạng thái: `chase`, `stunned`. Tâm lơ lửng y = 1 m khi tự sinh; y của scenario giữ nguyên. |
| Vùng an toàn | Chỉ quanh đèn **đã thắp** (đèn tắt không có ánh sáng). Bóng Mực bị đẩy ra đúng mép `safe_radius`. |
| Bị chạm | Khoảng cách ≤ `shade_hit_radius`, Bóng Mực không choáng, Mây không bất tử: −1 flame, rơi `floor(carried × hit_drop_ratio)` đom đóm (mất hẳn), bất tử `invuln_s`. Tối đa 1 lần chạm mỗi bước. |
| Tỏa sáng | Mọi Bóng Mực trong `pulse_radius` bị choáng `pulse_stun_s` (không di chuyển, không gây sát thương) và bị đẩy `pulse_push_m` ra xa Mây. Luôn phát `pulse` kể cả `stunned_ids` rỗng. +`per_stun` mỗi con. |
| Sinh ngẫu nhiên | `random_motes`: 24 đom đóm lúc đầu, cứ 3 s sinh lại 1 nếu < 24. `random_shades`: 2 con lúc đầu, mỗi 45 s thêm 1 (tối đa 5, phát `shade_spawned`). Vị trí từ PRNG mulberry32 theo `--seed`. |
| Điểm thưởng | `per_second_left × floor(time_left_s)` và `per_flame_left × flames` chỉ cộng khi **thắng**. |
| Thứ tự trong 1 bước | thời gian −1/60 s → di chuyển/nhảy → nhặt → nạp đèn (thắng thì dừng ngay) → Bóng Mực di chuyển → tỏa sáng → va chạm → sinh thêm → kiểm tra bình minh. |
| Nhảy | Vận tốc 7 m/s, trọng lực 20 m/s². Chỉ ảnh hưởng y; mọi khoảng cách vẫn tính XZ nên nhảy không né được Bóng Mực. |
| So sánh "≤ r" | Có dung sai 1e-6 để không lệch vì cộng dồn số thực. |
| `dash` | Chưa có ở Phase 1; đọc được trong inputs nhưng bỏ qua. |
| Input | `move` ngoài [−1,1] bị kẹp; sai kiểu (không phải số/boolean, tick không tăng nghiêm ngặt) → exit 2. |
| Scenario | Đèn có id lạ bị bỏ qua. `motes` có thể là `[x,y,z]` hoặc `{id,pos}`. `shades[]` có thể kèm `id`, `state: "stunned"`. Scenario sai kiểu → exit 2. |
| CLI | `--night` khác 1 hoặc thiếu `--ticks` → exit 1. Không có `--out` hoặc `--out -` → ghi ra stdout. Snapshot chỉ ở các tick chia hết cho `--snapshot-every`. |

## Tiêu chí nghiệm thu (kiểm bằng `npm test`)
1. Tick 0: Mây ở (0,0,0), 5 đèn, 3 flames, 300 s.
2. Đi `[0,1]` 120 tick → z = 12, time_left 298 (ví dụ contract).
3. Đom đóm ở z = 5 được nhặt ở tick 35.
4. Nạp đủ 5 → `deposit` rồi `lantern_lit`, giữ nút không nạp lần hai.
5. Thắp đèn cuối → `game_over won all_lit`, điểm thưởng đúng.
6. Chạm Bóng Mực → `player_hit` đúng data, bất tử 120 tick; hết flame → `lost no_flames`.
7. Tỏa sáng → stun + đẩy đúng, tốn 1, có hồi chiêu.
8. Bóng Mực không vào vùng an toàn đèn đã thắp.
9. Hết giờ → `lost dawn` đúng tick, headless dừng sớm, `end.ticks` đúng.
10. Cùng seed → output giống hệt; file hỏng → exit 2.
