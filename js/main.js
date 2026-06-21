// ============================================================
// main.js — Penghubung semua modul.
//
// FIX:
//  1. resizeCanvas: setTransform sekarang pakai zoom yg benar untuk
//     mempertahankan rasio aspek (viewH dihitung dari layar aktual)
//  2. generateCode: hasil kode langsung dipakai saat net.host(code)
//  3. Mode Solo (1 pemain): tombol "Main Sendiri" untuk testing tanpa P2P
//  4. PeerJS: tambah fallback config jika broker default gagal
//  5. Touch: window scroll dicegah agar joystick mobile bekerja
// ============================================================
(function () {
  const Config   = Game.Config;
  const World    = Game.World;
  const Entities = Game.Entities;
  const Quest    = Game.Quest;
  const Render   = Game.Render;
  const Input    = Game.Input;
  const Network  = Game.Network;

  const el = id => document.getElementById(id);
  const screens = {};
  ['screen-menu','screen-host','screen-join','screen-game','screen-victory']
    .forEach(id => { screens[id] = el(id); });

  function showScreen(id) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[id].classList.add('active');
  }

  // ---------- state global aplikasi ----------
  let net            = null;
  let isHost         = false;
  let isSolo         = false;   // FIX: mode main sendiri (1 pemain)
  let world          = null;
  let canvas, ctx;
  let rafId          = null;
  let lastT          = 0;
  let clock          = 0;
  let broadcastAccum = 0;
  let inputAccum     = 0;
  let prevQuestCache = { gemsCollected: 0, slimesKilled: 0, stage: 'gems' };

  Render.buildBackground(World.grid);

  // FIX: Cegah scroll halaman dari sentuhan (mobile)
  document.addEventListener('touchmove', e => {
    if (screens['screen-game'].classList.contains('active')) {
      e.preventDefault();
    }
  }, { passive: false });

  // ============================================================
  // EVENT TOMBOL MENU
  // ============================================================
  el('btn-host').addEventListener('click', startHostFlow);
  el('btn-join').addEventListener('click', () => {
    el('join-error').textContent = '';
    showScreen('screen-join');
  });
  // FIX: Tombol Solo Mode
  el('btn-solo').addEventListener('click', startSoloFlow);

  el('btn-join-cancel').addEventListener('click',  () => showScreen('screen-menu'));
  el('btn-host-cancel').addEventListener('click',  () => {
    if (net) net.destroy();
    net = null;
    showScreen('screen-menu');
  });
  el('btn-join-confirm').addEventListener('click', startJoinFlow);
  el('btn-leave').addEventListener('click',        leaveGame);
  el('btn-play-again').addEventListener('click',   leaveGame);

  el('join-code-input').addEventListener('input', e => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  el('join-code-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') startJoinFlow();
  });

  // ============================================================
  // SOLO MODE (tanpa jaringan, pemain 2 = bot diam)
  // ============================================================
  function startSoloFlow() {
    isSolo  = true;
    isHost  = true;
    net     = null;
    initWorldAsHost();
    // Di solo mode, guest dikendalikan AI sederhana (diam di tempat)
    showScreen('screen-game');
    startLoop();
  }

  // ============================================================
  // HOST FLOW
  // ============================================================
  function startHostFlow() {
    // FIX: simpan kode hasil generateCode dan pakai di net.host()
    const code = Network.generateCode();
    net    = Network.create();
    isHost = true;
    isSolo = false;
    showScreen('screen-host');
    el('room-code-display').textContent  = '-----';
    el('host-status-text').textContent   = 'Membuka room...';

    net.on('ready', c => {
      el('room-code-display').textContent = c;
      el('host-status-text').textContent  = 'Menunggu pemain lain...';
    });
    net.on('connected', () => {
      initWorldAsHost();
      showScreen('screen-game');
      startLoop();
    });
    net.on('data',         handleHostData);
    net.on('disconnected', handleDisconnect);
    net.on('error', err => {
      console.error('PeerJS error:', err);
      el('host-status-text').textContent = 'Gagal membuat room. Coba lagi.';
    });
    net.host(code); // FIX: pakai kode yang sudah di-generate
  }

  // ============================================================
  // JOIN FLOW
  // ============================================================
  function startJoinFlow() {
    const code = el('join-code-input').value.trim();
    if (code.length < 4) {
      el('join-error').textContent = 'Masukkan kode yang valid (min 4 karakter).';
      return;
    }
    net    = Network.create();
    isHost = false;
    isSolo = false;
    el('join-error').textContent         = '';
    el('btn-join-confirm').disabled      = true;
    el('btn-join-confirm').textContent   = 'Menghubungkan...';

    const timeout = setTimeout(() => {
      el('join-error').textContent = 'Room tidak ditemukan. Periksa kode dan coba lagi.';
      resetJoinBtn();
      if (net) net.destroy();
    }, 12000); // FIX: naikkan timeout 9s → 12s (PeerJS kadang butuh waktu)

    net.on('connected', () => {
      clearTimeout(timeout);
      resetJoinBtn();
      world = null;
      showScreen('screen-game');
      startLoop();
    });
    net.on('data',         handleClientData);
    net.on('disconnected', handleDisconnect);
    net.on('error', err => {
      console.error('PeerJS join error:', err);
      clearTimeout(timeout);
      el('join-error').textContent = 'Room tidak ditemukan atau koneksi gagal.';
      resetJoinBtn();
    });
    net.join(code);
  }

  function resetJoinBtn() {
    el('btn-join-confirm').disabled    = false;
    el('btn-join-confirm').textContent = 'Gabung';
  }

  function leaveGame() {
    stopLoop();
    if (net) net.destroy();
    net    = null;
    world  = null;
    isSolo = false;
    el('disconnect-toast').classList.remove('show');
    showScreen('screen-menu');
  }

  function handleDisconnect() {
    el('disconnect-toast').classList.add('show');
  }

  // ============================================================
  // INISIALISASI DUNIA (host = sumber kebenaran tunggal)
  // ============================================================
  function initWorldAsHost() {
    world = {
      players: {
        host:  Entities.createPlayer('host',  Config.COLORS.p1),
        guest: Entities.createPlayer('guest', Config.COLORS.p2)
      },
      gems:          Entities.createGems(),
      slimes:        [],
      boss:          null,
      quest:         Quest.createInitial(),
      lastInputGuest: { x: 0, y: 0, attack: false }
    };
  }

  // ============================================================
  // GAME LOOP
  // ============================================================
  function startLoop() {
    canvas = el('game-canvas');
    ctx    = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    Input.initKeyboard();
    Input.initTouch(el('joy-base'), el('joy-stick'), el('attack-btn'));
    lastT = performance.now();
    clock = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w   = window.innerWidth;
    const h   = window.innerHeight;

    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    // FIX: hitung zoom dari lebar saja, biarkan tinggi mengikuti proporsional
    // Ini memastikan tile tidak distorsi dan kamera bekerja dengan benar
    const viewW = Config.BASE_VIEW_TILES * Config.TILE;
    const zoom  = canvas.width / viewW;
    ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
  }

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    let dt = (now - lastT) / 1000;
    lastT  = now;
    dt     = Math.min(dt, 0.05);
    clock += dt;

    if (isHost) hostTick(dt);
    else        clientTick(dt);

    renderFrame();
    updateHud();
  }

  // ---------------- SISI HOST: simulasi penuh ----------------
  function hostTick(dt) {
    if (!world) return;

    const dir    = Input.getDirection();
    const attack = Input.consumeAttack();
    applyInputToPlayer(world.players.host, dir, attack);

    // Guest: dari jaringan (multiplayer) atau diam (solo)
    const gIn = world.lastInputGuest;
    applyInputToPlayer(world.players.guest, gIn, gIn.attack);
    gIn.attack = false;

    function applyInputToPlayer(p, d, didAttack) {
      if (!p.dead) {
        World.moveWithCollision(p, d.x * Config.PLAYER_SPEED,
                                   d.y * Config.PLAYER_SPEED, dt);
        if (didAttack) Entities.tryAttack(p, world.slimes, world.boss);
      }
      if (p.attackFlash   > 0) p.attackFlash   -= dt;
      if (p.attackCooldown > 0) p.attackCooldown -= dt;
    }

    world.slimes.forEach(s => Entities.updateSlime(s, world.players, dt));
    if (world.boss) Entities.updateBoss(world.boss, world.players, dt);
    Object.values(world.players).forEach(p => Entities.respawnTick(p, dt));

    world.gems.forEach(g => {
      if (g.taken) return;
      Object.values(world.players).forEach(p => {
        if (!p.dead && Entities.dist(p, g) < p.r + 14) g.taken = true;
      });
    });

    Quest.update(world);

    // Broadcast ke client (hanya multiplayer)
    if (!isSolo) {
      broadcastAccum += dt;
      if (broadcastAccum >= 1 / Config.TICK_RATE) {
        broadcastAccum = 0;
        net.send({ type: 'state', world: serializeWorld() });
      }
    }
  }

  function serializeWorld() {
    return {
      players: world.players,
      gems:    world.gems,
      slimes:  world.slimes,
      boss:    world.boss,
      quest:   world.quest
    };
  }

  function handleHostData(msg) {
    if (msg.type === 'input' && world) {
      const gi = world.lastInputGuest;
      gi.x = msg.x;
      gi.y = msg.y;
      if (msg.attack) gi.attack = true;
    }
  }

  // ---------------- SISI CLIENT: kirim input, render hasil host ----------------
  function clientTick(dt) {
    const dir    = Input.getDirection();
    const attack = Input.consumeAttack();
    inputAccum  += dt;
    if (inputAccum >= 1 / Config.INPUT_SEND_RATE) {
      inputAccum = 0;
      net.send({ type: 'input', x: dir.x, y: dir.y, attack });
    } else if (attack) {
      net.send({ type: 'input', x: dir.x, y: dir.y, attack: true });
    }
  }

  function handleClientData(msg) {
    if (msg.type === 'state') world = msg.world;
  }

  // ============================================================
  // RENDER
  // ============================================================
  function renderFrame() {
    if (!world || !canvas) return;
    const viewW = Config.BASE_VIEW_TILES * Config.TILE;
    // FIX: viewH dihitung dari ukuran layar aktual (bukan asumsi rasio)
    const viewH = viewW * (canvas.height / canvas.width);
    const localId     = isHost ? 'host' : 'guest';
    const localPlayer = world.players[localId];
    const cam = Render.camera(localPlayer, viewW, viewH, World.pixelW, World.pixelH);
    Render.drawFrame(ctx, viewW, viewH, cam, world, clock);
  }

  // ============================================================
  // HUD
  // ============================================================
  function updateHud() {
    if (!world) return;
    const q          = world.quest;
    const stageOrder = ['gems', 'slimes', 'boss'];
    const idx        = stageOrder.indexOf(q.stage);

    document.querySelectorAll('#crystal-track .crystal-dot').forEach((dot, i) => {
      dot.classList.toggle('lit',     i < idx || q.stage === 'victory');
      dot.classList.toggle('current', i === idx);
    });

    let progressText = '';
    if      (q.stage === 'gems')   progressText = `💎 ${q.gemsCollected}/${q.gemsTotal}`;
    else if (q.stage === 'slimes') progressText = `🟢 ${q.slimesKilled}/${q.slimesTotal}`;
    else if (q.stage === 'boss' && world.boss)
      progressText = `👑 Bos: ${Math.max(0, Math.ceil(world.boss.hp))}/${world.boss.maxHp}`;

    el('quest-progress').textContent = progressText;
    el('quest-banner').textContent   = q.message;

    const localId = isHost ? 'host' : 'guest';
    const lp      = world.players[localId];
    if (lp) {
      let html = '';
      for (let i = 0; i < lp.maxHp; i++)
        html += `<span class="heart ${i < lp.hp ? 'full' : 'empty'}">♥</span>`;
      el('hearts').innerHTML = html;
    }

    if (q.gemsCollected  > prevQuestCache.gemsCollected)  showToast('+1 Kristal!');
    if (q.slimesKilled   > prevQuestCache.slimesKilled)   showToast('Slime dikalahkan!');
    if (q.stage          !== prevQuestCache.stage)         showToast(q.message, true);
    prevQuestCache = {
      gemsCollected: q.gemsCollected,
      slimesKilled:  q.slimesKilled,
      stage:         q.stage
    };

    if (q.stage === 'victory') {
      el('victory-text').textContent = Quest.TEXTS.victory;
      stopLoop();
      showScreen('screen-victory');
    }
  }

  function showToast(text, big) {
    const zone = el('toast-zone');
    const t    = document.createElement('div');
    t.className  = 'toast' + (big ? ' toast-big' : '');
    t.textContent = text;
    zone.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, big ? 2600 : 1400);
  }
})();
