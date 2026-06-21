// ============================================================
// render.js — Semua gambar dipakai bentuk vektor sederhana (lingkaran,
// kotak, segitiga) supaya RINGAN dan jalan mulus di HP kelas menengah-bawah.
// Peta digambar SEKALI ke offscreen canvas (prerender), lalu tiap frame
// cukup 1 kali drawImage — bukan menggambar ratusan tile tiap frame.
// ============================================================
Game.Render = (function () {
  const C = Game.Config;
  const Colors = C.COLORS;
  let bgCanvas = null;

  function buildBackground(grid) {
    const w = grid[0].length, h = grid.length;
    const cv = document.createElement('canvas');
    cv.width = w * C.TILE; cv.height = h * C.TILE;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) drawTile(ctx, grid[y][x], x * C.TILE, y * C.TILE, x, y);
    }
    bgCanvas = cv;
    return cv;
  }

  function drawTile(ctx, t, px, py, gx, gy) {
    const T = C.TILE_TYPE;
    const size = C.TILE;
    if (t === T.WATER) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? Colors.water : Colors.waterLight;
      ctx.fillRect(px, py, size, size);
    } else if (t === T.ROCK) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? Colors.rock : Colors.rockDark;
      ctx.fillRect(px, py, size, size);
    } else if (t === T.PATH) {
      ctx.fillStyle = Colors.path;
      ctx.fillRect(px, py, size, size);
      ctx.fillStyle = Colors.pathEdge;
      ctx.fillRect(px, py + size - 4, size, 4);
    } else if (t === T.TREE) {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? Colors.grass : Colors.grassAlt;
      ctx.fillRect(px, py, size, size);
      ctx.fillStyle = Colors.treeTrunk;
      ctx.fillRect(px + size / 2 - 4, py + size / 2, 8, size / 2 - 4);
      ctx.fillStyle = Colors.treeLeaf;
      ctx.beginPath();
      ctx.arc(px + size / 2, py + size / 2 - 4, size / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? Colors.grass : Colors.grassAlt;
      ctx.fillRect(px, py, size, size);
    }
  }

  // hitung posisi kamera (world units), tetap di dalam batas peta, atau
  // dipusatkan jika layar lebih besar dari peta
  function camera(localPlayer, viewW, viewH, mapW, mapH) {
    let x, y;
    if (mapW <= viewW) x = (mapW - viewW) / 2;
    else {
      x = (localPlayer ? localPlayer.x : mapW / 2) - viewW / 2;
      x = Math.max(0, Math.min(x, mapW - viewW));
    }
    if (mapH <= viewH) y = (mapH - viewH) / 2;
    else {
      y = (localPlayer ? localPlayer.y : mapH / 2) - viewH / 2;
      y = Math.max(0, Math.min(y, mapH - viewH));
    }
    return { x, y };
  }

  function drawFrame(ctx, viewW, viewH, cam, state, t) {
    ctx.clearRect(0, 0, viewW, viewH);
    if (bgCanvas) ctx.drawImage(bgCanvas, cam.x, cam.y, viewW, viewH, 0, 0, viewW, viewH);

    drawGate(ctx, state.quest, cam, t);
    state.gems.forEach(g => { if (!g.taken) drawGem(ctx, g, cam, t); });
    state.slimes.forEach(s => { if (!s.dead) drawSlime(ctx, s, cam, t); });
    if (state.boss && !state.boss.dead) drawBoss(ctx, state.boss, cam, t);
    Object.values(state.players).forEach(p => drawPlayer(ctx, p, cam, t));
  }

  function drawGem(ctx, g, cam, t) {
    const sx = g.x - cam.x, sy = g.y - cam.y;
    const bob = Math.sin(t * 4 + g.x) * 3;
    const scale = 1 + Math.sin(t * 5 + g.x) * 0.08;
    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.rotate(Math.PI / 4);
    ctx.scale(scale, scale);
    ctx.fillStyle = Colors.gem;
    ctx.fillRect(-9, -9, 18, 18);
    ctx.fillStyle = Colors.gemLight;
    ctx.fillRect(-9, -9, 9, 9);
    ctx.restore();
  }

  function drawBlobBody(ctx, sx, sy, r, mainColor, ringColor, bob) {
    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.beginPath();
    ctx.ellipse(0, 4, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, r * 0.3, r, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawEyes(ctx, sx, sy, bob, spread) {
    ctx.save();
    ctx.translate(sx, sy + bob);
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.arc(side * spread, -2, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
    });
    ctx.restore();
  }

  function drawPlayer(ctx, p, cam, t) {
    const sx = p.x - cam.x, sy = p.y - cam.y;
    const ringColor = p.color === Colors.p1 ? Colors.p1Dark : Colors.p2Dark;
    if (p.dead) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      drawBlobBody(ctx, sx, sy, p.r, p.color, ringColor, 0);
      ctx.restore();
      ctx.font = '11px "Baloo 2", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('Pingsan...', sx, sy - p.r - 10);
      return;
    }
    const blink = p.invuln > 0 && Math.floor(t * 12) % 2 === 0;
    ctx.globalAlpha = blink ? 0.4 : 1;
    const bob = Math.sin(t * 6) * 1.5;
    drawBlobBody(ctx, sx, sy, p.r, p.color, ringColor, bob);
    drawEyes(ctx, sx, sy, bob - 2, 5);
    ctx.globalAlpha = 1;
    if (p.attackFlash > 0) {
      ctx.save();
      ctx.translate(sx, sy + bob);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.globalAlpha = p.attackFlash * 3;
      ctx.beginPath();
      ctx.arc(0, 0, C.ATTACK_RANGE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.font = '11px "Baloo 2", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, sx, sy - p.r - 10);
  }

  function drawSlime(ctx, s, cam, t) {
    const sx = s.x - cam.x, sy = s.y - cam.y;
    const bob = Math.abs(Math.sin(t * 5 + s.x)) * -4;
    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.beginPath();
    ctx.ellipse(0, 6, s.r, s.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, s.r, s.r * 0.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = s.hitFlash > 0 ? '#ffffff' : Colors.slime;
    ctx.fill();
    ctx.strokeStyle = Colors.slimeDark;
    ctx.lineWidth = 2;
    ctx.stroke();
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.arc(side * 5, -2, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
    });
    ctx.restore();
    drawHpBar(ctx, sx, sy - s.r - 10, s.hp, s.maxHp, 28);
  }

  function drawBoss(ctx, b, cam, t) {
    const sx = b.x - cam.x, sy = b.y - cam.y;
    const pulse = b.charging ? (Math.sin(t * 20) * 0.5 + 0.5) : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.beginPath();
    ctx.ellipse(0, 10, b.r, b.r * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : (pulse > 0.5 ? '#ff5b5b' : Colors.boss);
    ctx.fill();
    ctx.strokeStyle = Colors.bossDark;
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * b.r, Math.sin(a) * b.r);
      ctx.lineTo(Math.cos(a) * (b.r + 9), Math.sin(a) * (b.r + 9));
      ctx.lineTo(Math.cos(a + 0.25) * b.r, Math.sin(a + 0.25) * b.r);
      ctx.fillStyle = Colors.bossDark;
      ctx.fill();
    }
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.arc(side * 9, -3, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff200';
      ctx.fill();
    });
    ctx.restore();
    drawHpBar(ctx, sx, sy - b.r - 16, b.hp, b.maxHp, 60);
  }

  function drawHpBar(ctx, sx, sy, hp, maxHp, w) {
    const h = 5;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(sx - w / 2, sy, w, h);
    ctx.fillStyle = '#ff6b5b';
    ctx.fillRect(sx - w / 2, sy, w * Math.max(0, hp / maxHp), h);
  }

  function drawGate(ctx, quest, cam, t) {
    const g = Game.World.gatePos;
    const sx = g.x - cam.x, sy = g.y - cam.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = quest.gateOpen ? Colors.gateOpen : Colors.gate;
    ctx.fillRect(-26, -34, 52, 40);
    ctx.beginPath();
    ctx.arc(0, -34, 26, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = quest.gateOpen ? '#5a3e00' : '#2a2a26';
    ctx.fillRect(-14, -10, 28, 16);
    if (quest.gateOpen) {
      ctx.globalAlpha = Math.sin(t * 4) * 0.3 + 0.7;
      ctx.fillStyle = '#fff3c0';
      ctx.beginPath();
      ctx.arc(0, -34, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return { buildBackground, camera, drawFrame };
})();
