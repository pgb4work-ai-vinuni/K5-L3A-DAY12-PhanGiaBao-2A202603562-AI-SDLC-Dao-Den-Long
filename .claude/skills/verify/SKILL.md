---
name: verify
description: Chạy toàn bộ kiểm chứng của Đảo Đèn Lồng (unit test, scenario headless, tất định) và lưu bằng chứng vào docs/proof/<phase>/. Dùng trước khi commit/tag một phase hoặc sau khi sửa src/core.
---

1. `npm test` — phải 0 fail. Nếu đỏ: sửa code, KHÔNG sửa test cho xanh trừ khi yêu cầu đổi (ghi lý do).
2. `npm run proof -- phase-N` — chạy scenario trong `tests/scenarios/`, kiểm tra tất định seed 42, kiểm tra mã thoát 2.
3. `npm test > docs/proof/phase-N/npm-test.txt 2>&1` — lưu báo cáo test.
4. Ảnh bản web: `npm start`, mở http://localhost:8080, chụp màn hình lưu vào `docs/proof/phase-N/`.
5. Cập nhật bảng truy vết trong `docs/proof/phase-N/README.md` (yêu cầu → cách kiểm → bằng chứng → kết quả). Ghi "chưa đạt" trung thực.
Không bao giờ sửa tay file .jsonl output.
