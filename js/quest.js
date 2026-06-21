Game.Quest = (function () {
  const C = Game.Config;
  const Entities = Game.Entities;

  const TEXTS = {
    gems: 'Kumpulkan 6 Kristal yang berserakan di pulau!',
    slimes: 'Kristal lengkap! Singkirkan para Slime penjaga hutan.',
    boss: 'Gerbang Kuno terbuka! Kalahkan Penjaga Kristal bersama-sama!',
    victory: 'Kalian berhasil menyelamatkan Pulau Kristal!'
  };

  function createInitial() {
    return {
      stage: 'gems',
      gemsCollected: 0,
      gemsTotal: C.GEM_TOTAL,
      slimesKilled: 0,
      slimesTotal: C.SLIME_TOTAL,
      gateOpen: false,
      message: TEXTS.gems
    };
  }

  function update(world) {
    const q = world.quest;

    if (q.stage === 'gems') {
      q.gemsCollected = world.gems.filter(g => g.taken).length;
      if (q.gemsCollected >= q.gemsTotal) {
        q.stage = 'slimes';
        q.message = TEXTS.slimes;
        world.slimes = [0, 1, 2, 3].map(i => Entities.createSlime(i));
      }
    } else if (q.stage === 'slimes') {
      q.slimesKilled = world.slimes.filter(s => s.dead).length;
      if (q.slimesKilled >= q.slimesTotal) {
        q.stage = 'boss';
        q.message = TEXTS.boss;
        q.gateOpen = true;
        world.boss = Entities.createBoss();
      }
    } else if (q.stage === 'boss') {
      if (world.boss && world.boss.dead) {
        q.stage = 'victory';
        q.message = TEXTS.victory;
      }
    }
  }

  return { TEXTS, createInitial, update };
})();
