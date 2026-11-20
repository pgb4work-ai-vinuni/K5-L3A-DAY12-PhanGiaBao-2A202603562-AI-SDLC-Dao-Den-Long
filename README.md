# Đảo Đèn Lồng — K5-L3A-DAY12 · Phan Gia Bảo · 2A202603562

> 🎬 **Video demo:** _(sẽ bổ sung ở Phase 4)_

Game 3D góc nhìn thứ ba chạy trên **trình duyệt** (Three.js). Mây — người giữ đèn nhỏ tuổi đội nón lá treo đèn lồng — gom đom đóm để thắp lại 5 Đèn Lồng Lớn của **Đêm 1 – Đảo Bến**, né Bóng Mực trong sương đen. Logic game tách riêng (`src/core/`) nên chạy được **headless** theo Test Contract v1.0.

## Cài đặt và chạy (macOS/Linux, cần Node.js ≥ 18)

```bash
git clone https://github.com/pgb4work-ai-vinuni/K5-L3A-DAY12-PhanGiaBao-2A202603562-AI-SDLC-Dao-Den-Long.git && cd K5-L3A-DAY12-PhanGiaBao-2A202603562-AI-SDLC-Dao-Den-Long
npm install
npm start          # mở http://localhost:8080 (cổng bận thì tự sang 8081…, hoặc PORT=9000 npm start)
```

## Điều khiển

| Phím | Hành động |
|---|---|
| W A S D / ↑ ↓ | Di chuyển (theo hướng camera) |
| Space | Nhảy |
| Kéo chuột / ← → | Xoay camera |
| E | Nạp ánh sáng (đom đóm đang mang) vào đèn gần nhất |
| F | Tỏa sáng: tốn 1 đom đóm, làm choáng + đẩy lùi Bóng Mực xung quanh |
| R | Chơi lại |

## Luật chơi (số liệu = `game.contract.json`)

- Đảo tròn bán kính 40 m, mép đảo là tường vô hình (`fall_enabled: false`). 5 đèn trên vòng tròn 25 m.
- Đi gần đom đóm (≤ 1.5 m) để tự nhặt, mang tối đa 10. Mỗi đèn cần 5 đom đóm; nhấn E trong 3 m để nạp.
- Bóng Mực đuổi theo (3 m/s, Mây 6 m/s). Chạm (≤ 1 m) mất 1 ngọn lửa, rơi mất 50% đom đóm đang mang, bất tử 2 s. Không vào được vòng 4 m quanh **đèn đã thắp**. Có 2 con lúc đầu, mỗi 45 s thêm 1 (tối đa 5).
- Tỏa sáng: bán kính 6 m, choáng 3 s, đẩy lùi 4 m, hồi 2 s.
- **Thắng:** thắp đủ 5 đèn. **Thua:** hết 3 ngọn lửa, hoặc hết 300 s (bình minh).

### Cách tính điểm

| Sự kiện | Điểm |
|---|---|
| Nhặt 1 đom đóm | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực bị choáng bởi tỏa sáng | +25 |
| Khi **thắng**: mỗi giây còn lại (làm tròn xuống) | +2 |
| Khi **thắng**: mỗi ngọn lửa còn lại | +50 |

## Test và chế độ headless

```bash
npm test                     # 23 test đơn vị + đầu-cuối headless
npm run proof -- phase-1     # chạy scenario, kiểm tra tất định, lưu vào docs/proof/phase-1
node src/headless.js --seed 1 --night 1 --ticks 600 --out out.jsonl \
  [--scenario tests/scenarios/win_last_lantern.scenario.json] [--inputs f.json] [--snapshot-every 10]
```

`headless_cmd` trong contract là `node src/headless.js` (không cần `npm install`, không cần cửa sổ/GPU). Chi tiết luật và giả định: [docs/notes/phase-1-assumptions.md](docs/notes/phase-1-assumptions.md).

## Sáng tạo của tôi

- **Đom đóm bay quanh nón lá:** số đom đóm Mây đang mang hiển thị thành các đốm sáng bay vòng quanh đầu Mây. Chỉ nằm ở `src/web/` (hiển thị), không đổi output headless — bằng chứng: `npm test` và `docs/proof/phase-1/` vẫn đạt; ảnh `docs/proof/phase-1/screenshot-lanterns-lit.jpg`.
- Đảo sáng dần (nền, sương, ánh sáng môi trường) theo số đèn đã thắp; vòng sáng vùng an toàn quanh đèn đã thắp.

## Tài liệu

- Bằng chứng Phase 1: [docs/proof/phase-1/README.md](docs/proof/phase-1/README.md)
- Giả định: [docs/notes/phase-1-assumptions.md](docs/notes/phase-1-assumptions.md) · Nhật ký AI: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Harness AI: [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), skill [.claude/skills/verify](.claude/skills/verify/SKILL.md), Stop hook [.claude/settings.json](.claude/settings.json), CI [.github/workflows/ci.yml](.github/workflows/ci.yml)
