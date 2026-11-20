# AGENTS.md — Đảo Đèn Lồng

Game 3D web (Three.js), 3 Đêm, + chế độ headless theo Test Contract (hiện tại **v1.1**, Ticket-02).

## Lệnh
- Cài: `npm install` · Chạy web: `npm start` (http://localhost:8080)
- Test: `npm test` (node:test, phải xanh trước khi kết thúc — có Stop hook chặn)
- Headless: `node src/headless.js --seed 1 --night 1|2|3 --ticks 600 --out out.jsonl [--scenario f] [--inputs f] [--snapshot-every 10]`
- Bằng chứng: `npm run proof -- phase-N` (skill `.claude/skills/verify`)

## Kiến trúc
- `src/core/` logic thuần, KHÔNG import DOM/three. `game.js` (luật, thứ tự 12 bước), `maps.js` (bản đồ chuẩn 3 Đêm), `io.js` (đọc inputs/scenario), `world.js` (hằng số chuẩn ngoài contract), `rng.js` (PRNG tất định).
- `src/headless.js` CLI theo contract. `src/web/main.js` chỉ hiển thị + menu + đọc phím; `src/web/audio.js` âm thanh WebAudio.
- Tuning DUY NHẤT ở `game.contract.json`; code đọc từ đó, không hard-code số tuning.

## Quy tắc contract (đừng phá)
- Snapshot tick 0 trước input; bước k ghi sự kiện tick=k+1; `--ticks N` = đúng N bước.
- Nút kích hoạt cạnh false→true; trường vắng giữ giá trị cũ; khoảng cách XZ, `<= r`.
- Dựng scenario không phát sự kiện/không cộng điểm; lanterns cập nhật theo id.
- File inputs/scenario sai → exit 2. Dòng cuối luôn là `end`. Cùng seed → output giống hệt.
- v1.1: thứ tự tick theo Ticket-02 (pause trước → bộ đếm → di chuyển/rơi → nhặt → đèn → vùng an toàn → pulse → bóng/Gió Lạc → va chạm → sinh → thắng/thua → snapshot). Trạng thái bóng: spawning/wander/chase/recoil/stunned.
- Số chuẩn KHÔNG được tự đổi (ticket bắt buộc). Bảng màu ở `web/style.css` và `C` trong `main.js`.
- Mỗi tính năng mới cần ≥ 1 scenario trong `tests/scenarios/` + test trong `tests/headless.test.js`.
- Sáng tạo thêm chỉ ở `src/web` (hiển thị), không đổi output headless.
- Không sửa tay output .jsonl; không viết test luôn-đạt.

## Quy tắc của người dùng
- KHÔNG tự commit/push/tag. KHÔNG chạy lệnh ảnh hưởng hệ thống/tiến trình (kill, cài toàn cục, server chạy nền) khi chưa hỏi. Chỉ chạy lệnh để test.

## Ghi chép
- Giả định: `docs/notes/phase-N-assumptions.md` · Nhật ký AI: `docs/notes/ai-log.md` · Bằng chứng: `docs/proof/phase-N/`
