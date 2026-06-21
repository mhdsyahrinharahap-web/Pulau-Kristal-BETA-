// ============================================================
// entities.js — Pembuat & pembaru entitas: pemain, kristal, slime, boss.
// Logika gerak/AI/combat di file ini HANYA dijalankan oleh HOST
// (host = pemegang kebenaran dunia game). Client hanya menampilkan
// hasil yang dikirim oleh host.
// ============================================================
Game.Entities = (function () {
  const C = Game.Config;
  const World = Game.World;

  function createPlayer(id, color) {
    const sp = World.spawnPoints[id] || { x: 100, y: 100 };
    return {
      id, x: sp.x, y: sp.y, r: C.PLAYER_RADIUS,
      hp: C.PLAYER_MAX_HP, maxHp: C.PLAYER_MAX_HP,
      dead: false, respawnTimer: 0, invuln: 0,
      attackCooldown: 0, attackFlash: 0,
      color, name: id === 'host' ? 'Pemain 1' : 'Pemain 2'
    };
  }

  function createGems() {
    return World.gemSpots.map((p, i) => ({ id: 'g' + i, x: p.x, y: p.y, taken: false }));
  }

  function createSlime(i) {
    const p = World.slimeSpots[i % World.slimeSpots.length];
    return {
      id: 's' + i, x: p.x, y: p.y, r: C.SLIME_RADIUS,
      hp: C.SLIME_HP, maxHp: C.SLIME_HP, dead: false,
      target: World.randomWalkablePoint(), wanderTimer: 1 + Math.random() * 2,
      hitFlash: 0, bumpCooldown: 0
    };
  }

  function createBoss() {
    return {
      id: 'boss', x: World.bossSpawn.x, y: World.bossSpawn.y, r: C.BOSS_RADIUS,
      hp: C.BOSS_HP, maxHp: C.BOSS_HP, dead: false,
      slamTimer: 3 + Math.random() * 2, charging: false, hitFlash: 0
    };
  }

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  // --- AI Slime: mengembara santai, mengejar pemain terdekat kalau dekat ---
  function updateSlime(slime, players, dt) {
    if (slime.dead) return;
    if (slime.hitFlash > 0) slime.hitFlash -= dt;
    if (slime.bumpCooldown > 0) slime.bumpCooldown -= dt;

    let chase = null, best = C.SLIME_AGGRO_RANGE;
    Object.values(players).forEach(p => {
      if (p.dead) return;
      const d = dist(slime, p);
      if (d < best) { best = d; chase = p; }
    });

    let tx, ty;
    if (chase) { tx = chase.x; ty = chase.y; }
    else {
      slime.wanderTimer -= dt;
      if (slime.wanderTimer <= 0 || dist(slime, slime.target) < 10) {
        slime.target = World.randomWalkablePoint();
        slime.wanderTimer = 2 + Math.random() * 2.5;
      }
      tx = slime.target.x; ty = slime.target.y;
    }

    const dx = tx - slime.x, dy = ty - slime.y;
    const len = Math.hypot(dx, dy) || 1;
    World.moveWithCollision(slime, (dx / len) * C.SLIME_SPEED, (dy / len) * C.SLIME_SPEED, dt);

    if (chase && slime.bumpCooldown <= 0 && dist(slime, chase) < slime.r + chase.r) {
      damagePlayer(chase, C.SLIME_DAMAGE);
      slime.bumpCooldown = 1;
    }
  }

  // --- AI Boss: mengejar pemain terdekat, sesekali "hentakan tanah" ---
  function updateBoss(boss, players, dt) {
    if (boss.dead) return;
    if (boss.hitFlash > 0) boss.hitFlash -= dt;

    let target = null, best = Infinity;
    Object.values(players).forEach(p => {
      if (p.dead) return;
      const d = dist(boss, p);
      if (d < best) { best = d; target = p; }
    });

    if (target) {
      const dx = target.x - boss.x, dy = target.y - boss.y;
      const len = Math.hypot(dx, dy) || 1;
      if (len > boss.r) {
        World.moveWithCollision(boss, (dx / len) * C.BOSS_SPEED, (dy / len) * C.BOSS_SPEED, dt);
      }
      if (dist(boss, target) < boss.r + target.r + 4) {
        damagePlayer(target, C.BOSS_DAMAGE * dt * 1.2);
      }
    }

    boss.slamTimer -= dt;
    boss.charging = boss.slamTimer < 1;
    if (boss.slamTimer <= 0) {
      Object.values(players).forEach(p => {
        if (!p.dead && dist(boss, p) < C.BOSS_SLAM_RADIUS) damagePlayer(p, C.BOSS_SLAM_DAMAGE);
      });
      const [a, b] = C.BOSS_SLAM_INTERVAL;
      boss.slamTimer = a + Math.random() * (b - a);
    }
  }

  function damagePlayer(p, amount) {
    if (p.dead || p.invuln > 0) return;
    p.hp -= amount;
    p.invuln = C.PLAYER_INVULN_TIME;
    if (p.hp <= 0) { p.hp = 0; p.dead = true; p.respawnTimer = C.RESPAWN_TIME; }
  }

  function respawnTick(p, dt) {
    if (p.invuln > 0) p.invuln -= dt;
    if (p.dead) {
      p.respawnTimer -= dt;
      if (p.respawnTimer <= 0) {
        const sp = World.spawnPoints[p.id] || { x: 100, y: 100 };
        p.x = sp.x; p.y = sp.y; p.hp = p.maxHp; p.dead = false; p.invuln = 1.2;
      }
    }
  }

  // pemain menyerang musuh dalam radius — efek "tebasan area" sederhana
  function tryAttack(p, slimes, boss) {
    if (p.dead || p.attackCooldown > 0) return false;
    p.attackCooldown = C.ATTACK_COOLDOWN;
    p.attackFlash = 0.15;
    let hit = false;
    slimes.forEach(s => {
      if (!s.dead && dist(p, s) < C.ATTACK_RANGE) {
        s.hp -= 1; s.hitFlash = 0.15; hit = true;
        if (s.hp <= 0) s.dead = true;
      }
    });
    if (boss && !boss.dead && dist(p, boss) < C.ATTACK_RANGE + boss.r - 14) {
      boss.hp -= 1; boss.hitFlash = 0.15; hit = true;
      if (boss.hp <= 0) boss.dead = true;
    }
    return hit;
  }

  return {
    createPlayer, createGems, createSlime, createBoss,
    updateSlime, updateBoss, damagePlayer, respawnTick, tryAttack, dist
  };
})();
