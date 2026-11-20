---
name: verify
description: Chạy toàn bộ kiểm chứng của Đảo Đèn Lồng (unit test, scenario headless, tất định) và lưu bằng chứng vào docs/proof/<phase>/. Dùng trước khi commit/tag một phase hoặc sau khi sửa src/core.
---

1. `npm test` — phải 0 fail. Nếu đỏ: sửa code, KHÔNG sửa test cho xanh trừ khi yêu cầu đổi (ghi lý do).
2. `npm run proof -- phase-N` — chạy MỌI scenario trong `tests/scenarios/` (đêm theo bảng NIGHT trong scripts/proof.js), tất định seed 42 cả 3 Đêm, hiệu năng 1 Đêm đầy đủ (≤ 30 s), mã thoát 2.
3. `npm test > docs/proof/phase-N/npm-test.txt 2>&1` — lưu báo cáo test.
4. Ảnh bản web: HỎI người dùng trước khi bật server (`npm start`); tắt server sau khi chụp. Lưu ảnh vào `docs/proof/phase-N/`. FPS đọc ở góc dưới trái hoặc `window.__fps`.
5. Cập nhật bảng truy vết trong `docs/proof/phase-N/README.md` (yêu cầu → cách kiểm → bằng chứng → kết quả). Ghi "chưa đạt" trung thực.
Không bao giờ sửa tay file .jsonl output.
