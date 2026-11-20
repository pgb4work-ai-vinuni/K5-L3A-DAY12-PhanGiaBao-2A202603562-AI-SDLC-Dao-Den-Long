// Hằng số thế giới KHÔNG nằm trong Test Contract (tuning nằm ở game.contract.json).
// Giữ tập trung ở đây để phase sau (contract v1.1) chỉ cần sửa một chỗ.
export const WORLD = {
  TICK_RATE: 60,              // tick/giây cố định
  ISLAND_RADIUS: 40,          // đảo tròn, tâm (0,0,0), bán kính 40 m
  LANTERN_RING: 25,           // 5 đèn đặt đều trên vòng tròn bán kính 25 m, L1 tại (0,0,25)
  JUMP_SPEED: 7,              // m/s vận tốc nhảy ban đầu
  GRAVITY: 20,                // m/s^2
  SHADE_Y: 1.0,               // tâm Bóng Mực lơ lửng 1 m
  INITIAL_MOTES: 24,          // số đom đóm ban đầu (random_motes)
  MOTE_RESPAWN_S: 3,          // mỗi 3 s sinh lại 1 đom đóm nếu đang < INITIAL_MOTES
  MOTE_MIN_R: 3,
  MOTE_MAX_R: 38,
  INITIAL_SHADES: 2,          // số Bóng Mực ban đầu (random_shades)
  MAX_SHADES: 5,
  SHADE_SPAWN_EVERY_S: 45,    // mỗi 45 s thêm 1 Bóng Mực (tới MAX_SHADES)
  SHADE_SPAWN_MIN_R: 15,
  SHADE_SPAWN_MAX_R: 38,
  SHADE_SPAWN_MIN_PLAYER_DIST: 12,
};
