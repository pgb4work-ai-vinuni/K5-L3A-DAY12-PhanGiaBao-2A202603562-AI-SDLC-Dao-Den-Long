# Retro — Đảo Đèn Lồng (4 phase)

## Số liệu
| Phase | Nội dung | Test cuối phase | Thời gian | Token ước tính (vào / ra) |
|---|---|---|---|---|
| 1 | PRD-0, contract v1.0: Đêm 1, headless, web 3D | 23 | ~45 phút | ~150k / ~35k |
| 2 | Ticket-02, v1.1: số chuẩn, 3 Đêm, 8 tính năng mới, UI đầy đủ | 47 | ~45 phút | ~220k / ~60k |
| 3 | Ticket-03, v1.2: dầu đèn, hút dầu, thắng ở bình minh (Change Request) | 63 | ~25 phút | ~120k / ~30k |
| 4 | Ticket-04, v1.3: benchmark, soak, bảng xếp hạng, accessibility, phát hành | 69 | ~45 phút | ~150k / ~45k |
| **Tổng** | | | ~2h40 | **~640k / ~170k** |

Ước tính dựa trên độ dài ngữ cảnh (ảnh ticket chiếm nhiều nhất: 35 ảnh ≈ 1.5–2k token/ảnh) và lượng code sinh ra; không có số đo chính xác từ công cụ.

## Đánh giá từng phase
- **Phase 1:** đạt mọi yêu cầu. Quyết định tách `src/core` (logic thuần) khỏi `src/web` ngay từ đầu là quyết định đúng nhất cả dự án: mọi phase sau chỉ sửa core + test headless.
- **Phase 2:** đạt phần logic + headless (scenario cho từng tính năng). UI viết xong nhưng không được xem bằng mắt trong phiên agent (chặn bật server). Test Phase 1 phải đổi theo số chuẩn — ghi lý do.
- **Phase 3:** Change Request thay 5 luật. Chạy test cũ trước khi sửa cho ra đúng danh sách 6 test bị thay thế → sửa/xóa có lý do, ADR + CHANGELOG. Không hỏng phase trước ngoài các luật bị thay.
- **Phase 4:** đạt soak, bench (logic cảnh + thống kê có test), bảng xếp hạng, accessibility, đóng gói. `bench.json` cần chạy trên trình duyệt thật.

## Điều hiệu quả khi làm với AI
- Viết **test + scenario headless trước UI**: mỗi lần ticket đổi luật, `npm test` chỉ ra chính xác chỗ cần sửa.
- Patch bằng script có kiểm tra "không tìm thấy đoạn thì dừng" thay vì viết lại cả file: rẻ token và không âm thầm làm hỏng.
- Một nơi duy nhất cho số liệu (`game.contract.json`) + `world.js`/`maps.js`: khai báo contract không thể lệch code.

## Điều không hiệu quả / AI sai
| Lần sai | Phát hiện bằng | Chỉnh harness |
|---|---|---|
| Server tự bật để chụp ảnh không tắt, giữ cổng 8080, làm `npm start` của người dùng lỗi | Người dùng báo EADDRINUSE | `serve.js` tự thử cổng kế; luật "hỏi trước khi bật server, tắt sau khi dùng" trong AGENTS.md + skill `verify` |
| Test hiểu sai pause là toggle; scenario Gió Lạc đặt sai vị trí | Test đỏ khi chạy | Ghi trong ai-log; luôn chạy scenario và đọc output trước khi viết assert |
| Điểm thưởng thời gian tính trước khi trừ thời gian (Phase 1) | Test đỏ (450 ≠ 448) | Thứ tự tick đánh số trong comment `Game.step` |
| Python sinh JS làm `\n` thành xuống dòng thật | `node --check`/lỗi cú pháp | Kiểm cú pháp ngay sau mỗi lần patch |
| Đo RSS soak vượt ngưỡng dù heap phẳng | Chạy soak và đo heap riêng | Ghi giả định, dùng `--expose-gc --jitless` có giải thích |
| Không kiểm được UI bằng mắt từ Phase 2 | Bị chặn lệnh bật server nền | Ghi trung thực "chưa xem bằng mắt" trong bảng bằng chứng; nhờ người dùng chơi thử |

## Harness giúp nhiều nhất
1. **Stop hook** chạy `npm test` trước khi agent kết thúc: không có lượt nào kết thúc khi test đỏ.
2. **AGENTS.md** ngắn, cập nhật mỗi phase (lệnh, thứ tự tick, quy tắc người dùng).
3. **Skill `verify`** + `npm run proof`: một lệnh sinh toàn bộ bằng chứng headless.

## Tiết kiệm token
- Không dùng subagent; đọc docs/ảnh ticket một lần; chỉ đọc lại đoạn file cần sửa.
- Patch theo đoạn thay vì viết lại file lớn; test headless thay cho chơi thử nhiều lần.

## Nếu làm lại
- Xin quyền bật server tạm ngay từ đầu (có tự tắt) để có ảnh chụp và số FPS thật ở mỗi phase.
- Dùng InstancedMesh cho Bóng Mực/đom đóm ngay từ Phase 1 để benchmark 200 bóng nhẹ hơn.
- Viết sẵn bảng truy vết dạng file dữ liệu để proof tự điền cột "kết quả".
