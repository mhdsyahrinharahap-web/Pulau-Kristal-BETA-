// ============================================================
// render.js — Semua gambar dipakai bentuk vektor sederhana.
// Peta digambar SEKALI ke offscreen canvas (prerender).
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
      ctx.fillStyle = Colors.rock;
      ctx.fillRect(px, py, size, size);
      ctx.strokeStyle = '#3a4145'; ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);
    } else if (t === T.TREE) {
      ctx.fillStyle = Colors.grass;
      ctx.fillRect(px, py, size, size);
      ctx.fillStyle = Colors.tree;
      ctx.beginPath();
      ctx.arc(px + size / 2, py + size / 2, size * 0.46, 0, Math.PI * 2);
      ctx.fill();
    } else if (t === T.PATH) {
      ctx.fillStyle = Colors.path;
      ctx.fillRect(px, py, size, size);
    } else {
      ctx.fillStyle = (gx + gy) % 2 === 0 ? Colors.grass : Colors.grassLight;
      ctx.fillRect(px, py, size, size);
    }
  }

  function world(ctx, canvas, w, localId, clock) {
    const lp = w.players[localId];
    if (!lp) return;

    ctx.fillStyle = Colors.water;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    const viewW = (canvas.width / ctx.getTransform().a);
    const viewH = (canvas.height / ctx.getTransform().d);
    
    let targetX = lp.x - viewW / 2;
    let targetY = lp.y - viewH / 2;

    targetX = Math.max(0, Math.min(targetX, Game.World.pixelW - viewW));
    targetY = Math.max(0, Math.min(targetY, Game.World.pixelH - viewH));

    ctx.translate(-targetX, -targetY);

    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0);

    drawGate(ctx, w.quest, { x: targetX, y: targetY }, clock);

    w.gems.forEach(g => {
      if (g.taken) return;
      ctx.save();
      ctx.translate(g.x, g.y + Math.sin(clock * 5 + g.x) * 3);
      ctx.fillStyle = '#52e0d6';
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0);
      ctx.fill();
      ctx.restore();
    });

    w.slimes.forEach(s => {
      if (s.dead) return;
      ctx.save();
      const bounce = Math.abs(Math.sin(clock * 6 + s.x)) * 4;
      ctx.translate(s.x, s.y);
      ctx.scale(1 + bounce * 0.005, 1 - bounce * 0.01);
      ctx.fillStyle = s.hitFlash > 0 ? '#fff' : Colors.slime;
      ctx.beginPath();
      ctx.arc(0, -bounce, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(-5, -bounce - 3, 2, 4); ctx.fillRect(3, -bounce - 3, 2, 4);
      ctx.restore();
    });

    if (w.boss && !w.boss.dead) drawBoss(ctx, w.boss, clock);

    Object.values(w.players).forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);

      if (p.dead) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = 'bold 9px "Baloo 2", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Pingsan...', 0, -p.r - 6);
        ctx.restore();
        return;
      }
      
      if (p.invuln > 0 && Math.floor(clock * 12) % 2 === 0) {
        ctx.restore(); 
        return;
      }

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fill();

      // MEMASUKKAN NAMA PLAYER KE DALAM LINGKARAN KARAKTER[cite: 2]
      ctx.fillStyle = '#0b1f17';
      ctx.font = 'bold 9px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      // Ambil 5 huruf pertama saja supaya pas di dalam lingkaran karakter[cite: 2]
      const ringName = p.name ? p.name.substring(0, 5) : (p.id === 'host' ? 'P1' : 'P2');
      ctx.fillText(ringName, 0, 3); 

      if (p.attackFlash > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, C.ATTACK_RANGE, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    ctx.restore();
  }

  function drawBoss(ctx, b, clock) {
    const sx = b.x, sy = b.y;
    ctx.save();
    ctx.translate(sx, sy);
    if (b.charging) {
      ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
      ctx.fillStyle = 'rgba(235,94,85,0.25)';
      ctx.beginPath(); ctx.arc(0, 0, C.BOSS_SLAM_RADIUS, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = b.hitFlash > 0 ? '#fff' : (b.charging ? Colors.ember : Colors.boss);
    ctx.beginPath();
    ctx.arc(0, 0, b.r, 0, Math.PI * 2);
    ctx.fill();
    const spikes = 6;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + clock;
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
    const gx = 11 * C.TILE, gy = 3 * C.TILE;
    if (quest.stage === 'gems') {
      ctx.fillStyle = '#3a4145';
      ctx.fillRect(gx - C.TILE, gy, C.TILE * 2, 12);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TERKUNCI', gx, gy - 6);
    } else if (quest.stage === 'slimes') {
      ctx.fillStyle = Colors.ember;
      ctx.fillRect(gx - C.TILE, gy, C.TILE * 2, 12);
    }
  }

  return { buildBackground, world };
})();
