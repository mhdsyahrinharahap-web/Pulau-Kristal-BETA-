cat > /home/claude/pulau-kristal/js/world.js << 'ENDOFFILE'
// ============================================================
// world.js — Peta pulau: grid tile, collision, titik-titik spawn.
//
// FIX KRITIS:
//   Spawn host & guest, serta 2 gem spot, berada di tile POHON (TREE).
//   circleBlocked() mengembalikan TRUE → moveWithCollision() tidak pernah
//   menggeser player → itulah kenapa karakter DIAM TOTAL meski input benar.
//
//   Koordinat yang diperbaiki:
//     spawnPoints.host  : y 11.5 → 12.5  (tile y=11 = TREE → tile y=12 = GRASS)
//     spawnPoints.guest : y 11.5 → 12.5  (tile y=11 = TREE → tile y=12 = GRASS)
//     gemSpots[0]       : y 2.5  → 3.5   (tile y=2  = TREE → tile y=3  = GRASS)
//     gemSpots[1]       : y 2.5  → 3.5   (tile y=2  = TREE → tile y=3  = GRASS)
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
    // Catatan: [x=3,y=11] dan [x=18,y=11] adalah TREE — spawn lama ada di sini!
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

  function circleBlocked(px, py, r) {
    const pts = [
      [px, py],
      [px + r, py], [px - r, py], [px, py + r], [px, py - r],
      [px + r * 0.7, py + r * 0.7], [px - r * 0.7, py + r * 0.7],
      [px + r * 0.7, py - r * 0.7], [px - r * 0.7, py - r * 0.7]
    ];
    return pts.some(([x, y]) => isBlockedTile(tileAt(x, y)));
  }

  function moveWithCollision(entity, dx, dy, dt) {
    const r = entity.r || 14;
    const nx = entity.x + dx * dt;
    const ny = entity.y + dy * dt;
    if (!circleBlocked(nx, entity.y, r)) entity.x = nx;
    if (!circleBlocked(entity.x, ny, r)) entity.y = ny;
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

  // FIX: y 11.5 → 12.5 (tile y=11 adalah TREE, tile y=12 adalah GRASS)
  const spawnPoints = {
    host:  { x: 3.5 * C.TILE, y: 12.5 * C.TILE },
    guest: { x: 18.5 * C.TILE, y: 12.5 * C.TILE }
  };

  // FIX: gem[0] dan gem[1] y 2.5 → 3.5 (tile y=2 adalah TREE, tile y=3 adalah GRASS)
  const gemSpots = [
    { x: 3.5  * C.TILE, y: 3.5  * C.TILE },  // FIX: was y=2.5 (TREE tile)
    { x: 18.5 * C.TILE, y: 3.5  * C.TILE },  // FIX: was y=2.5 (TREE tile)
    { x: 10.5 * C.TILE, y: 2.5  * C.TILE },
    { x: 10.5 * C.TILE, y: 12.5 * C.TILE },
    { x: 5.5  * C.TILE, y: 8.5  * C.TILE },
    { x: 15.5 * C.TILE, y: 8.5  * C.TILE }
  ];

  const slimeSpots = [
    { x: 6  * C.TILE, y: 5   * C.TILE },
    { x: 16 * C.TILE, y: 5   * C.TILE },
    { x: 6  * C.TILE, y: 9.5 * C.TILE },
    { x: 16 * C.TILE, y: 9.5 * C.TILE }
  ];

  const gatePos   = { x: 11 * C.TILE, y: 1.6 * C.TILE };
  const bossSpawn = { x: 11 * C.TILE, y: 7   * C.TILE };

  return {
    grid, tileAt, isBlockedTile, circleBlocked, moveWithCollision,
    randomWalkablePoint, pixelW, pixelH, spawnPoints, gemSpots,
    slimeSpots, gatePos, bossSpawn
  };
})();
