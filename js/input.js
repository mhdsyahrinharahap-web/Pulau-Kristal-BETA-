// ============================================================
// input.js — Menangkap input keyboard (desktop) & joystick virtual
// (mobile/touch). Modul lain cukup panggil getDirection() & consumeAttack().
// ============================================================
Game.Input = (function () {
  const keys = {};
  let attackQueued = false;
  const joystick = { active: false, dx: 0, dy: 0 };

  function initKeyboard() {
    window.addEventListener('keydown', e => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') attackQueued = true;
    });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  }

  function initTouch(joyBaseEl, joyStickEl, attackBtnEl) {
    let originX = 0, originY = 0, touchId = null;
    const maxDist = 38;

    function start(e) {
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
      const t = e.changedTouches
        ? Array.prototype.find.call(e.changedTouches, tt => tt.identifier === touchId)
        : e;
      if (!t) return;
      let dx = t.clientX - originX, dy = t.clientY - originY;
      const d = Math.hypot(dx, dy);
      if (d > maxDist) { dx = (dx / d) * maxDist; dy = (dy / d) * maxDist; }
      joyStickEl.style.transform = `translate(${dx}px, ${dy}px)`;
      joystick.dx = dx / maxDist; joystick.dy = dy / maxDist;
    }
    function end() {
      joystick.active = false; joystick.dx = 0; joystick.dy = 0;
      joyStickEl.style.transform = 'translate(0,0)';
    }

    joyBaseEl.addEventListener('touchstart', start, { passive: true });
    joyBaseEl.addEventListener('touchmove', move, { passive: true });
    joyBaseEl.addEventListener('touchend', end);
    joyBaseEl.addEventListener('mousedown', start);
    window.addEventListener('mousemove', e => { if (joystick.active) move(e); });
    window.addEventListener('mouseup', end);

    attackBtnEl.addEventListener('touchstart', e => { e.preventDefault(); attackQueued = true; }, { passive: false });
    attackBtnEl.addEventListener('click', () => { attackQueued = true; });
  }

  function getDirection() {
    let dx = joystick.dx, dy = joystick.dy;
    if (keys['arrowup'] || keys['w']) dy -= 1;
    if (keys['arrowdown'] || keys['s']) dy += 1;
    if (keys['arrowleft'] || keys['a']) dx -= 1;
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
