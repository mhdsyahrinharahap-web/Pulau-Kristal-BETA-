// ============================================================
// config.js — Semua angka & konstanta game ada di sini.
// File ini dimuat PALING AWAL, jadi modul lain bisa pakai Game.Config
// ============================================================
window.Game = window.Game || {};

Game.Config = {
  // ukuran dunia
  TILE: 48,
  MAP_W: 22,
  MAP_H: 14,
  BASE_VIEW_TILES: 12, // berapa petak yang terlihat secara horizontal di layar

  // pemain
  PLAYER_SPEED: 165,
  PLAYER_RADIUS: 15,
  PLAYER_MAX_HP: 5,
  PLAYER_INVULN_TIME: 0.8,
  ATTACK_RANGE: 50,
  ATTACK_COOLDOWN: 0.4,
  RESPAWN_TIME: 2.5,

  // jaringan
  TICK_RATE: 18,       // berapa kali per detik host mengirim data dunia
  INPUT_SEND_RATE: 20,  // berapa kali per detik client mengirim input

  // quest 1: kristal
  GEM_TOTAL: 6,

  // quest 2: slime
  SLIME_TOTAL: 4,
  SLIME_HP: 2,
  SLIME_SPEED: 65,
  SLIME_DAMAGE: 1,
  SLIME_AGGRO_RANGE: 150,
  SLIME_RADIUS: 14,

  // quest 3: boss
  BOSS_HP: 24,
  BOSS_SPEED: 75,
  BOSS_DAMAGE: 2,
  BOSS_RADIUS: 26,
  BOSS_SLAM_RADIUS: 95,
  BOSS_SLAM_DAMAGE: 2,
  BOSS_SLAM_INTERVAL: [4, 6.5],

  TILE_TYPE: { GRASS: 0, ROCK: 1, WATER: 2, TREE: 3, PATH: 4 },

  COLORS: {
    grass: '#1c4a36',
    grassAlt: '#225840',
    path: '#c9a467',
    pathEdge: '#a8824a',
    water: '#2a6f7f',
    waterLight: '#3a8a9c',
    rock: '#4a4a44',
    rockDark: '#36352f',
    treeTrunk: '#5b4128',
    treeLeaf: '#2f6e4a',
    p1: '#52e0d6',
    p1Dark: '#2bb8ad',
    p2: '#ff8a5b',
    p2Dark: '#e0653a',
    gem: '#ffd166',
    gemLight: '#fff0c2',
    slime: '#7fd66e',
    slimeDark: '#57a84a',
    boss: '#8a5cff',
    bossDark: '#5c3bb0',
    gate: '#8d8a7c',
    gateOpen: '#ffd166'
  }
};
