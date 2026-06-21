window.Game = window.Game || {};

Game.Config = {
  TILE: 48,
  MAP_W: 22,
  MAP_H: 14,
  BASE_VIEW_TILES: 12,

  PLAYER_SPEED: 165,
  PLAYER_RADIUS: 15,
  PLAYER_MAX_HP: 5,
  PLAYER_INVULN_TIME: 0.8,
  ATTACK_RANGE: 50,
  ATTACK_COOLDOWN: 0.4,
  RESPAWN_TIME: 2.5,

  TICK_RATE: 18,
  INPUT_SEND_RATE: 20,

  GEM_TOTAL: 6,

  SLIME_TOTAL: 4,
  SLIME_HP: 2,
  SLIME_SPEED: 65,
  SLIME_DAMAGE: 1,
  SLIME_AGGRO_RANGE: 150,
  SLIME_RADIUS: 14,

  BOSS_HP: 24,
  BOSS_SPEED: 75,
  BOSS_DAMAGE: 2,
  BOSS_RADIUS: 26,
  BOSS_SLAM_RADIUS: 95,
  BOSS_SLAM_DAMAGE: 2,
  BOSS_SLAM_INTERVAL: [3, 5],

  TILE_TYPE: {
    GRASS: 0,
    ROCK: 1,
    WATER: 2,
    TREE: 3,
    PATH: 4
  },

  COLORS: {
    water: '#1d4f40',
    waterLight: '#225a49',
    grass: '#2e6f40',
    grassLight: '#357d4a',
    rock: '#4a5359',
    tree: '#163a21',
    path: '#6d755d',
    p1: '#ffd166',
    p2: '#52e0d6',
    slime: '#74c365',
    boss: '#9b5de5',
    bossDark: '#6f2dbd'
  }
};
