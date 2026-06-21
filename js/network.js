// ============================================================
// network.js — Pembungkus PeerJS (WebRTC) untuk koneksi 2 pemain.
// Tidak butuh server sendiri: PeerJS memakai signaling server publik
// gratis hanya untuk "memperkenalkan" 2 browser, lalu data game
// mengalir langsung peer-to-peer (P2P).
// ============================================================
Game.Network = (function () {
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa O/0/I/1 biar gak ambigu
  const PREFIX = 'pulaukristal-';

  function generateCode(len) {
    len = len || 5;
    let s = '';
    for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }

  function create() {
    let peer = null, conn = null, isHost = false;
    const handlers = {};

    function on(name, fn) { handlers[name] = fn; }
    function emit(name, payload) { if (handlers[name]) handlers[name](payload); }

    function bindConn(c) {
      conn = c;
      conn.on('open', () => emit('connected'));
      conn.on('data', data => emit('data', data));
      conn.on('close', () => emit('disconnected'));
    }

    function host(code) {
      isHost = true;
      peer = new Peer(PREFIX + code, { debug: 0 });
      peer.on('open', () => emit('ready', code));
      peer.on('connection', c => bindConn(c));
      peer.on('error', err => emit('error', err));
    }

    function join(code) {
      isHost = false;
      peer = new Peer(undefined, { debug: 0 });
      peer.on('open', () => {
        const c = peer.connect(PREFIX + code, { reliable: true });
        bindConn(c);
      });
      peer.on('error', err => emit('error', err));
    }

    function send(data) {
      if (conn && conn.open) conn.send(data);
    }

    function destroy() {
      try { if (conn) conn.close(); } catch (e) {}
      try { if (peer) peer.destroy(); } catch (e) {}
      peer = null; conn = null;
    }

    return { on, host, join, send, destroy, get isHost() { return isHost; } };
  }

  return { create, generateCode };
})();
