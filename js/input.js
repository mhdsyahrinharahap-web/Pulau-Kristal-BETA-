// ============================================================
// input.js — Menangkap input keyboard (desktop) & joystick virtual
// (mobile/touch). Modul lain cukup panggil getDirection() & consumeAttack().
//
// FIX:
//  1. preventDefault pada Arrow keys agar halaman tidak scroll
//  2. touchmove dipasang di window (bukan hanya joyBase) agar
//     jari bisa geser keluar area joystick tanpa kehilangan tracking
//  3. touchstart joystick dibuat non-passive agar bisa preventDefault
//  4. touchend juga dipasang di window untuk antisipasi lepas di luar elemen
// ============================================================
Game.Input = (function () {
  const keys = {};
  let attackQueued = false;
  const joystick = { active: false, dx: 0, dy: 0 };

  // Tombol yang harus dicegah scroll-nya
  const PREVENT_KEYS = new Set([
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '
  ]);

  function initKeyboard() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      keys[k] = true;

      // FIX #1: Cegah scroll browser saat main game
      if (PREVENT_KEYS.has(k)) e.preventDefault();

      if (e.key === ' ') attackQueued = true;
    });
    window.addEventListener('keyup', e => {
      keys[e.key.toLowerCase()] = false;
    });
  }

  function initTouch(joyBaseEl, joyStickEl, attackBtnEl) {
    let originX = 0, originY = 0, touchId = null;
    const maxDist = 38;

    function start(e) {
      // FIX #3: non-passive supaya bisa preventDefault
      e.preventDefault();
      const t = e.changedTouches ? e.changedTouches[0] : e;
      touchId = t.identifier !== undefined ? t.identifier : 'mouse';
      const rect = joyBaseEl.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      joystick.active = true;
      move(e);
    }

    function move(e) {
      if (!joystick.active) return;
      // FIX #2: handle both touch dan mouse, cari touch yang sesuai
      let t;
      if (e.changedTouches) {
        t = Array.prototype.find.call(e.changedTouches,
          tt => tt.identifier === touchId);
        if (!t && e.touches) {
          t = Array.prototype.find.call(e.touches,
            tt => tt.identifier === touchId);
        }
      } else {
        t = e;
      }
      if (!t) return;
      let dx = t.clientX - originX, dy = t.clientY - originY;
      const d = Math.hypot(dx, dy);
      if (d > maxDist) { dx = (dx / d) * maxDist; dy = (dy / d) * maxDist; }
      joyStickEl.style.transform = `translate(${dx}px, ${dy}px)`;
      joystick.dx = dx / maxDist;
      joystick.dy = dy / maxDist;
    }

    function end(e) {
      // Cek apakah touch yang berakhir adalah touch joystick kita
      if (e.changedTouches) {
        const t = Array.prototype.find.call(e.changedTouches,
          tt => tt.identifier === touchId);
        if (!t) return; // touch lain yang berakhir, bukan joystick
      }
      joystick.active = false;
      joystick.dx = 0;
      joystick.dy = 0;
      joyStickEl.style.transform = 'translate(0,0)';
      touchId = null;
    }

    // FIX #3: { passive: false } agar bisa preventDefault mencegah scroll
    joyBaseEl.addEventListener('touchstart', start, { passive: false });

    // FIX #2: touchmove & touchend dipasang di window agar tracking tetap
    // berjalan meski jari bergerak keluar area joystick
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: true });

    // Support mouse untuk testing di desktop
    joyBaseEl.addEventListener('mousedown', start);
    window.addEventListener('mousemove', e => { if (joystick.active) move(e); });
    window.addEventListener('mouseup', end);

    // Tombol serangan
    attackBtnEl.addEventListener('touchstart', e => {
      e.preventDefault();
      attackQueued = true;
    }, { passive: false });
    attackBtnEl.addEventListener('click', () => { attackQueued = true; });
  }

  function getDirection() {
    let dx = joystick.dx, dy = joystick.dy;
    if (keys['arrowup']    || keys['w']) dy -= 1;
    if (keys['arrowdown']  || keys['s']) dy += 1;
    if (keys['arrowleft']  || keys['a']) dx -= 1;
    if (keys['arrowright'] || keys['d']) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    return { x: dx, y: dy };
  }

  function consumeAttack() {
    if (attackQueued) { attackQueued = false; return true; }
    return false;
  }

  return { initKeyboard, initTouch, getDirection, consumeAttack };
})();
