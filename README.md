# Đảo Đèn Lồng — K5-L3A-DAY12 · Phan Gia Bảo · 2A202603562

> 🎬 **Video demo:** _(sẽ bổ sung ở Phase 4)_

Game 3D góc nhìn thứ ba chạy trên **trình duyệt** (Three.js). Mây — người giữ đèn nhỏ tuổi đội nón lá treo đèn lồng — gom đom đóm để thắp lại các Đèn Lồng Lớn qua **3 Đêm**: Đảo Bến (5 đèn), Đảo Cau (6 đèn, hai đảo nối cầu tre, bục nhảy) và Đảo Chuông (7 đèn, 3 tầng, gió mạnh). Né Bóng Mực, cẩn thận Gió Lạc giật đom đóm, nhặt Bùa Gió để chạy nhanh. Từ Phase 3, **đèn cạn dầu dần**: phải châm dầu, thắp lại đèn tắt và giữ đủ đèn sáng tới **bình minh**. Logic game tách riêng (`src/core/`) nên chạy được **headless** theo Test Contract **v1.2**.

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
| Shift | Lướt (14 m/s, 0.2 s, hồi 1.5 s) |
| Kéo chuột / ← → | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| E | Nạp ánh sáng / thắp lại / châm dầu vào đèn gần nhất (trong 2 m) |
| F | Tỏa Sáng: tốn 3 đom đóm, làm choáng + đẩy lùi Bóng Mực trong 5 m |
| Esc / P | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |

## Luật chơi (số chuẩn Ticket-02/03 = `game.contract.json` v1.2)

- Sức chứa đom đóm = 10 + 2 × số lần thắp thành công (tối đa 20), tự nhặt khi cách ≤ 1 m.
- Đèn mới cần 10 đom đóm, đèn đã từng sáng chỉ cần 5 để thắp lại. Đèn sáng có 100 dầu, hao 1/giây; châm dầu: mỗi đom đóm +10. Hết dầu đèn tắt.
- Đèn có dầu ≥ 30 tạo vùng an toàn 6 m. Dưới 30, Bóng Mực kéo tới **hút dầu** (5/giây) — xua bằng Tỏa Sáng hoặc châm dầu lên ≥ 30.
- Bóng Mực phát hiện ở 12 m, bỏ đuổi ở 18 m, chạy 4 m/s (Đêm 3: 4.5). Bị chạm: −1 Ngọn Lửa, rơi một nửa đom đóm ra quanh Mây, bất tử 1.5 s. Rơi khỏi đảo: −1 Ngọn Lửa, mất hết đom đóm.
- **Thắng:** còn sống khi hết giờ (240 / 270 / 300 s) và có ≥ 60% đèn đang sáng (3/5, 4/6, 5/7). **Thua:** hết 3 Ngọn Lửa, hoặc bình minh mà thiếu đèn. Thắp đủ đèn không kết thúc Đêm.

### Cách tính điểm (Ticket-03)

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm nạp vào đèn (thắp mới, thắp lại, châm dầu) | +5 |
| Thắp lần đầu / thắp lại | +100 / +40 |
| Mỗi Bóng Mực trúng Tỏa Sáng (+15 nếu nó đang hút dầu) | +5 |
| Bình minh (khi thắng): mỗi đèn đang sáng | +50 + floor(dầu) |
| Bình minh (khi thắng): mỗi Ngọn Lửa còn lại | +50 |

Tổng điểm game là tổng điểm các Đêm đã thắng.

## Test và chế độ headless

```bash
npm test                     # 63 test: logic + scenario headless cho từng tính năng
npm run proof -- phase-3     # chạy mọi scenario, tất định, hiệu năng, lưu vào docs/proof/phase-3
node src/headless.js --seed 1 --night 2 --ticks 600 --out out.jsonl \
  [--scenario tests/scenarios/win_last_lantern.scenario.json] [--inputs f.json] [--snapshot-every 10]
```

`headless_cmd` trong contract là `node src/headless.js` (không cần `npm install`, không cần cửa sổ/GPU). Chi tiết luật và giả định: [Phase 1](docs/notes/phase-1-assumptions.md), [Phase 2](docs/notes/phase-2-assumptions.md), [Phase 3](docs/notes/phase-3-assumptions.md), [ADR 001](docs/adr/001-lantern-fuel-and-dawn-win.md), [CHANGELOG](CHANGELOG.md).

## Sáng tạo của tôi

- **Đom đóm bay quanh nón lá:** số đom đóm Mây đang mang hiển thị thành các đốm sáng bay vòng quanh đầu Mây. Chỉ nằm ở `src/web/` (hiển thị), không đổi output headless — bằng chứng: `npm test` và `docs/proof/phase-1/` vẫn đạt; ảnh `docs/proof/phase-1/screenshot-lanterns-lit.jpg`.
- Vòng sáng vùng an toàn quanh đèn đã thắp; đom đóm rơi nhấp nháy khi sắp hết hạn; lời dẫn của Ông Đăng mỗi Đêm; âm thanh tự tổng hợp bằng WebAudio (không dùng file ngoài).

## Tài liệu

- Bằng chứng: [Phase 1](docs/proof/phase-1/README.md), [Phase 2](docs/proof/phase-2/README.md), [Phase 3](docs/proof/phase-3/README.md)
- Giả định: [Phase 1](docs/notes/phase-1-assumptions.md), [Phase 2](docs/notes/phase-2-assumptions.md) · Nhật ký AI: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Harness AI: [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), skill [.claude/skills/verify](.claude/skills/verify/SKILL.md), Stop hook [.claude/settings.json](.claude/settings.json), CI [.github/workflows/ci.yml](.github/workflows/ci.yml)
