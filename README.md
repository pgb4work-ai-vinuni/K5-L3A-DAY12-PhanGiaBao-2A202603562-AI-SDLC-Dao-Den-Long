# Đảo Đèn Lồng — K5-L3A-DAY12 · Phan Gia Bảo · 2A202603562

> 🎬 **Video demo:** _(sẽ bổ sung ở Phase 4)_

Game 3D góc nhìn thứ ba chạy trên **trình duyệt** (Three.js). Mây — người giữ đèn nhỏ tuổi đội nón lá treo đèn lồng — gom đom đóm để thắp lại các Đèn Lồng Lớn qua **3 Đêm**: Đảo Bến (5 đèn), Đảo Cau (6 đèn, hai đảo nối cầu tre, bục nhảy) và Đảo Chuông (7 đèn, 3 tầng, gió mạnh). Né Bóng Mực, cẩn thận Gió Lạc giật đom đóm, nhặt Bùa Gió để chạy nhanh. Logic game tách riêng (`src/core/`) nên chạy được **headless** theo Test Contract **v1.1**.

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
| E | Nạp ánh sáng vào đèn gần nhất (trong 2 m) |
| F | Tỏa Sáng: tốn 3 đom đóm, làm choáng + đẩy lùi Bóng Mực trong 5 m |
| Esc / P | Tạm dừng (Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu) |

## Luật chơi (số chuẩn Ticket-02 = `game.contract.json` v1.1)

- Mang tối đa 10 đom đóm, tự nhặt khi cách ≤ 1 m. Mỗi đèn cần 10, nạp nhiều lần được. Đèn sáng tạo vùng an toàn 6 m mà Bóng Mực không vào được.
- Bóng Mực phát hiện ở 12 m, bỏ đuổi ở 18 m, chạy 4 m/s (Đêm 3: 4.5). Bị chạm: −1 Ngọn Lửa, rơi một nửa đom đóm ra quanh Mây (nhặt lại được trong 8 s), bất tử 1.5 s.
- Rơi khỏi đảo: −1 Ngọn Lửa, mất hết đom đóm, hồi sinh ở điểm xuất phát sau 1 s.
- **Thắng:** thắp đủ đèn. **Thua:** hết 3 Ngọn Lửa hoặc hết giờ (300 / 330 / 360 s). Thắng Đêm 3 là tới Bình Minh.

### Cách tính điểm

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm **nạp** vào đèn | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực trúng Tỏa Sáng (mỗi con mỗi lần) | +5 |
| Khi **thắng** một Đêm: mỗi giây còn lại (làm tròn xuống) | +2 |
| Khi **thắng** một Đêm: mỗi Ngọn Lửa còn lại | +50 |

Tổng điểm game là tổng điểm các Đêm đã thắng.

## Test và chế độ headless

```bash
npm test                     # 47 test: logic + scenario headless cho từng tính năng
npm run proof -- phase-2     # chạy mọi scenario, tất định, hiệu năng, lưu vào docs/proof/phase-2
node src/headless.js --seed 1 --night 2 --ticks 600 --out out.jsonl \
  [--scenario tests/scenarios/win_last_lantern.scenario.json] [--inputs f.json] [--snapshot-every 10]
```

`headless_cmd` trong contract là `node src/headless.js` (không cần `npm install`, không cần cửa sổ/GPU). Chi tiết luật và giả định: [Phase 1](docs/notes/phase-1-assumptions.md), [Phase 2](docs/notes/phase-2-assumptions.md).

## Sáng tạo của tôi

- **Đom đóm bay quanh nón lá:** số đom đóm Mây đang mang hiển thị thành các đốm sáng bay vòng quanh đầu Mây. Chỉ nằm ở `src/web/` (hiển thị), không đổi output headless — bằng chứng: `npm test` và `docs/proof/phase-1/` vẫn đạt; ảnh `docs/proof/phase-1/screenshot-lanterns-lit.jpg`.
- Vòng sáng vùng an toàn quanh đèn đã thắp; đom đóm rơi nhấp nháy khi sắp hết hạn; lời dẫn của Ông Đăng mỗi Đêm; âm thanh tự tổng hợp bằng WebAudio (không dùng file ngoài).

## Tài liệu

- Bằng chứng: [Phase 1](docs/proof/phase-1/README.md), [Phase 2](docs/proof/phase-2/README.md)
- Giả định: [Phase 1](docs/notes/phase-1-assumptions.md), [Phase 2](docs/notes/phase-2-assumptions.md) · Nhật ký AI: [docs/notes/ai-log.md](docs/notes/ai-log.md)
- Harness AI: [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md), skill [.claude/skills/verify](.claude/skills/verify/SKILL.md), Stop hook [.claude/settings.json](.claude/settings.json), CI [.github/workflows/ci.yml](.github/workflows/ci.yml)
