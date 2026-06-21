// ============================================================
// world.js — Peta pulau: grid tile, collision, titik-titik spawn.
// ============================================================
Game.World = (function () {
  const C = Game.Config;
  const T = C.TILE_TYPE;

  function buildGrid() {
    const w = C.MAP_W, h = C.MAP_H;
    const grid = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        row.push(border ? T.ROCK : T.GRASS);
      }
      grid.push(row);
    }
    // kolam air di tengah atas
    for (let y = 3; y <= 5; y++) {
      for (let x = 7; x <= 11; x++) grid[y][x] = T.WATER;
    }
    // gerumbul pohon di pojok-pojok
    [[2, 2], [3, 2], [2, 3], [19, 2], [18, 2], [19, 3],
     [2, 10], [3, 11], [18, 11], [19, 10]].forEach(([x, y]) => {
      if (grid[y] && grid[y][x] !== undefined) grid[y][x] = T.TREE;
    });
    // jalur batu yang menghubungkan area
    for (let x = 4; x <= 17; x++) grid[7][x] = T.PATH;
    for (let y = 4; y <= 10; y++) { grid[y][4] = T.PATH; grid[y][17] = T.PATH; }
    return grid;
  }

  const grid = buildGrid();

  function tileAt(px, py) {
    const tx = Math.floor(px / C.TILE);
    const ty = Math.floor(py / C.TILE);
    if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return T.ROCK;
    return grid[ty][tx];
  }

  function isBlockedTile(type) {
    return type === T.ROCK || type === T.WATER || type === T.TREE;
  }

  function circleBlocked(cx, cy, r) {
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (isBlockedTile(tileAt(px, py))) return true;
    }
    return false;
  }

  function moveWithCollision(entity, dx, dy) {
    if (dx === 0 && dy === 0) return;
    
    // Coba gerak horizontal dulu
    const newX = entity.x + dx;
    if (!circleBlocked(newX, entity.y, entity.r)) {
      entity.x = newX;
    }
    
    // Coba gerak vertikal
    const newY = entity.y + dy;
    if (!circleBlocked(entity.x, newY, entity.r)) {
      entity.y = newY;
    }
  }

  function randomWalkablePoint() {
    const w = C.MAP_W, h = C.MAP_H;
    for (let i = 0; i < 40; i++) {
      const x = 2 + Math.random() * (w - 4);
      const y = 2 + Math.random() * (h - 4);
      const px = x * C.TILE, py = y * C.TILE;
      if (!circleBlocked(px, py, 16)) return { x: px, y: py };
    }
    return { x: (w / 2) * C.TILE, y: (h / 2) * C.TILE };
  }

  const pixelW = grid[0].length * C.TILE;
  const pixelH = grid.length * C.TILE;

  // DI SINI FIX-NYA: Mengubah koordinat Y dari 11.5 -> 12.5 dan 2.5 -> 3.5
  const spawnPoints = {
    host:  { x: 3.5  * C.TILE, y: 12.5 * C.TILE },
    guest: { x: 18.5 * C.TILE, y: 12.5 * C.TILE }
  };

  const gemSpots = [
    { x: 3.5  * C.TILE, y: 3.5  * C.TILE },
    { x: 18.5 * C.TILE, y: 3.5  * C.TILE },
    { x: 11.0 * C.TILE, y: 8.5  * C.TILE },
    { x: 5.0  * C.TILE, y: 5.0  * C.TILE },
    { x: 16.0 * C.TILE, y: 5.0  * C.TILE },
    { x: 11.0 * C.TILE, y: 2.0  * C.TILE }
  ];

  const slimeSpots = [
    { x: 5 * C.TILE, y: 4 * C.TILE },
    { x: 16 * C.TILE, y: 4 * C.TILE },
    { x: 4 * C.TILE, y: 9 * C.TILE },
    { x: 17 * C.TILE, y: 9 * C.TILE }
  ];

  const bossSpawn = { x: 11 * C.TILE, y: 5.5 * C.TILE };

  return {
    grid, tileAt, circleBlocked, moveWithCollision, randomWalkablePoint,
    pixelW, pixelH, spawnPoints, gemSpots, slimeSpots, bossSpawn
  };
})();
