// ============================================================
// main.js — Penghubung semua modul.
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
  let isSolo         = false;   
  let world          = null;
  let canvas, ctx;
  let rafId          = null;
  let lastT          = 0;
  let clock          = 0;
  let broadcastAccum = 0;
  let inputAccum     = 0;
  let prevQuestCache = { gemsCollected: 0, slimesKilled: 0, stage: 'gems' };
  
  // Default nama player jika input kosong
  let playerName     = "Pemain"; 

  Render.buildBackground(World.grid);

  // Cegah scroll halaman dari sentuhan (mobile)
  document.addEventListener('touchmove', e => {
    if (screens['screen-game'].classList.contains('active')) {
      e.preventDefault();
    }
  }, { passive: false });

  // Ambil nama dari input sebelum pindah screen
  function updatePlayerName() {
    const inputName = el('player-name-input') ? el('player-name-input').value.trim() : "";
    if (inputName.length > 0) {
      playerName = inputName;
    } else {
      playerName = isHost ? "Pemain 1" : "Pemain 2";
    }
  }

  // ============================================================
  // EVENT TOMBOL MENU
  // ============================================================
  el('btn-host').addEventListener('click', () => {
    updatePlayerName();
    startHostFlow();
  });
  el('btn-join').addEventListener('click', () => {
    updatePlayerName();
    el('join-error').textContent = '';
    showScreen('screen-join');
  });
  el('btn-solo').addEventListener('click', () => {
    updatePlayerName();
    startSoloFlow();
  });

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
  // SOLO MODE
  // ============================================================
  function startSoloFlow() {
    isSolo  = true;
    isHost  = true;
    net     = null;
    initWorldAsHost();
    world.players.host.name = playerName; // Set nama custom
    showScreen('screen-game');
    startLoop();
  }

  // ============================================================
  // HOST FLOW
  // ============================================================
  function startHostFlow() {
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
      world.players.host.name = playerName; // Set nama host
      
      // Kirim info nama host ke guest saat pertama terkoneksi
      net.send({ type: 'init_name', name: playerName });
      
      showScreen('screen-game');
      startLoop();
    });
    net.on('data',         handleHostData);
    net.on('disconnected', handleDisconnect);
    net.on('error', err => {
      console.error('PeerJS error:', err);
      el('host-status-text').textContent = 'Gagal membuat room. Coba lagi.';
    });
    net.host(code);
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
    }, 12000);

    net.on('connected', () => {
      clearTimeout(timeout);
      resetJoinBtn();
      world = null;
      
      // Kirim nama guest ke host
      net.send({ type: 'join_name', name: playerName });
      
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

  // FIX SINKRONISASI KAMERA PC & HP (Menghilangkan Bug Karakter Hilang di PC)
  function resizeCanvas() {
    if (!canvas) return;
    const dpr = 1; 
    const w   = window.innerWidth;
    const h   = window.innerHeight;

    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';

    const desiredTiles = Config.BASE_VIEW_TILES;
    const scale  = w / (desiredTiles * Config.TILE);
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
  }

  function loop(now) {
    if (!rafId) return;
    let dt = (now - lastT) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastT  = now;
    clock += dt;

    if (isHost) hostTick(dt);
    else        clientTick(dt);

    if (world) {
      const localId = isHost ? 'host' : 'guest';
      Render.world(ctx, canvas, world, localId, clock);
      updateHud();
    }

    rafId = requestAnimationFrame(loop);
  }

  function hostTick(dt) {
    if (!world) return;

    const dir    = Input.getDirection();
    const attack = Input.consumeAttack();
    applyInputToPlayer(world.players.host, dir, attack);

    const gIn = world.lastInputGuest;
    applyInputToPlayer(world.players.guest, gIn, gIn.attack);
    gIn.attack = false;

    function applyInputToPlayer(p, d, didAttack) {
      if (!p.dead) {
        World.moveWithCollision(p, d.x * Config.PLAYER_SPEED * dt,
                                   d.y * Config.PLAYER_SPEED * dt);
        if (didAttack) Entities.tryAttack(p, world.slimes, world.boss);
      }
      if (p.attackFlash   > 0) p.attackFlash   -= dt;
      if (p.attackCooldown > 0) p.attackCooldown -= dt;
    }

    world.slimes.forEach(s => Entities.updateSlime(s, world.players, dt));
    if (world.boss) Entities.updateBoss(world.boss, world.players, dt);
    Object.values(world.players).forEach(p => Entities.respawnTick(p, dt));

    if (!world.players.host.dead) {
      world.gems.forEach(g => {
        if (!g.taken && Math.hypot(world.players.host.x - g.x, world.players.host.y - g.y) < world.players.host.r + 12) g.taken = true;
      });
    }
    if (!isSolo && !world.players.guest.dead) {
      world.gems.forEach(g => {
        if (!g.taken && Math.hypot(world.players.guest.x - g.x, world.players.guest.y - g.y) < world.players.guest.r + 12) g.taken = true;
      });
    }

    Quest.update(world);

    if (!isSolo) {
      broadcastAccum += dt;
      if (broadcastAccum >= 1 / Config.TICK_RATE) {
        broadcastAccum = 0;
        net.send({ type: 'world', world });
      }
    }
  }

  function handleHostData(msg) {
    if (!world) return;
    if (msg.type === 'input') {
      const gi = world.lastInputGuest;
      gi.x = msg.x;
      gi.y = msg.y;
      if (msg.attack) gi.attack = true;
    } else if (msg.type === 'join_name') {
      world.players.guest.name = msg.name; // Simpan nama guest yang dikirim ke host
    }
  }

  function clientTick(dt) {
    inputAccum  += dt;
    if (inputAccum >= 1 / Config.INPUT_SEND_RATE) {
      inputAccum = 0;
      const dir    = Input.getDirection();
      const attack = Input.consumeAttack();
      net.send({ type: 'input', x: dir.x, y: dir.y, attack });
    }
  }

  function handleClientData(msg) {
    if (msg.type === 'world') {
      world = msg.world;
    } else if (msg.type === 'init_name' && world) {
      world.players.host.name = msg.name; // Tampilkan nama host di screen guest
    }
  }

  // ============================================================
  // HUD
  // ============================================================
  function updateHud() {
    if (!world) return;
    const q = world.quest;

    let progressText = '';
    if      (q.stage === 'gems')   progressText = `💎 Kristal: ${q.gemsCollected}/${q.gemsTotal}`;
    else if (q.stage === 'slimes') progressText = `⚔️ Slime: ${q.slimesKilled}/${q.slimesTotal}`;
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
      t.addEventListener('transitionend', () => t.remove());
    }, big ? 3500 : 2000);
  }
})();
