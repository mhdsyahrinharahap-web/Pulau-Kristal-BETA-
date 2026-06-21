Game.Input = (function () {
  const keys = {};
  let attackQueued = false;
  const joystick = { active: false, dx: 0, dy: 0 };

  const PREVENT_KEYS = new Set([
    'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '
  ]);

  function initKeyboard() {
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (PREVENT_KEYS.has(k)) e.preventDefault();
      if (e.key === ' ') attackQueued = true;
    });
    window.addEventListener('keyup', e => {
      keys[e.key.toLowerCase()] = false;
    });
  }

  function initTouch(joyBaseEl, joyStickEl, attackBtnEl) {
    let originX = 0, originY = 0, touchId = null;

    function start(e) {
      if (joystick.active) return;
      const t = e.touches ? e.touches[0] : e;
      if (e.touches) touchId = t.identifier;
      
      joystick.active = true;
      const rect = joyBaseEl.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
      move(e);
    }

    function move(e) {
      if (!joystick.active) return;
      let t = null;
      if (e.touches) {
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === touchId) { t = e.touches[i]; break; }
        }
        if (!t) return;
        e.preventDefault();
      } else {
        t = e;
      }

      const rawDx = t.clientX - originX;
      const rawDy = t.clientY - originY;
      const dist = Math.hypot(rawDx, rawDy);
      const maxR = 36;

      if (dist === 0) {
        joystick.dx = 0; joystick.dy = 0;
        joyStickEl.style.transform = 'translate(0,0)';
      } else {
        const angle = Math.atan2(rawDy, rawDx);
        const clampR = Math.min(dist, maxR);
        joystick.dx = Math.cos(angle) * (clampR / maxR);
        joystick.dy = Math.sin(angle) * (clampR / maxR);
        joyStickEl.style.transform = `translate(${Math.cos(angle)*clampR}px, ${Math.sin(angle)*clampR}px)`;
      }
    }

    function end(e) {
      if (!joystick.active) return;
      if (e.touches) {
        let stillHas = false;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === touchId) stillHas = true;
        }
        if (stillHas) return;
      }
      joystick.active = false;
      joystick.dx = 0; joystick.dy = 0;
      joyStickEl.style.transform = 'translate(0,0)';
      touchId = null;
    }

    joyBaseEl.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end, { passive: true });

    joyBaseEl.addEventListener('mousedown', start);
    window.addEventListener('mousemove', e => { if (joystick.active) move(e); });
    window.addEventListener('mouseup', end);

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
    const q = attackQueued;
    attackQueued = false;
    return q;
  }

  return { initKeyboard, initTouch, getDirection, consumeAttack };
})();
