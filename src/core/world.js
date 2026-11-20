// Hằng số chuẩn của Ticket-02 KHÔNG có khóa trong tuning của contract.
// (Tuning nằm ở game.contract.json.) Giữ tập trung ở đây để ticket sau chỉ sửa một chỗ.
export const WORLD = {
  TICK_RATE: 60,
  JUMP_SPEED: 7,              // m/s
  GRAVITY: 20,                // m/s^2
  STEP_UP: 0.35,              // bậc cao nhất đi lên được (dốc ok, vách tầng thì không)
  FALL_Y: -10,                // dưới Y này = rơi khỏi đảo
  FALL_WAIT_TICKS: 60,
  PICKUP_DY: 1.5,             // chênh cao tối đa khi nhặt đom đóm / bùa
  HIT_DY: 1.5,                // chênh cao tối đa khi Bóng Mực chạm
  SHADE_HOVER: 1.0,           // tâm Bóng Mực cao hơn mặt đất 1 m
  SHADE_DETECT: 12,
  SHADE_LOSE: 18,
  SHADE_WANDER_SPEED: 1.5,    // giả định (ticket không quy định)
  SHADE_SPAWNING_TICKS: 30,   // giả định: trạng thái "spawning" 0.5 s
  SHADE_SPAWN_MIN_PLAYER_DIST: 15,
  RECOIL_M: 2, RECOIL_TICKS: 60,
  STUN_PUSH_TICKS: 15,
  SAFE_EVICT_TICKS: 30,       // bóng đang trong vùng lúc đèn vừa thắp bị đẩy ra trong <= 30 tick
  PULSE_CENTER_DY: 0.8,
  MOTES_START: 20, MOTES_CAP: 30, MOTE_SPAWN_EVERY: 240,
  DROP_RING_MIN: 1.5, DROP_RING_MAX: 2.5, DROP_TTL: 480,
  DRIFTER_SPEED: 7, DRIFTER_IDLE_SPEED: 2, DRIFTER_MAX: 2, DRIFTER_EVERY: 1200,
  DRIFTER_CHASE_CARRY: 5, DRIFTER_CHASE_DIST: 15, DRIFTER_HIT_R: 1.2,
  DRIFTER_STEAL: 3, DRIFTER_FLEE_TICKS: 240, DRIFTER_DROP_REMOVE_TICKS: 120, DRIFTER_HOVER: 1.5,
  CHARM_TICKS: 600, CHARM_RESPAWN: 2700, CHARM_SPEED: 7.2,
  WIND_EVERY: 1800, WIND_TICKS: 300, WIND_SPEED: 2, WIND_WARN_TICKS: 120,
};
