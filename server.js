#!/usr/bin/env node
/* Breachline server: serves the game, the accounts API and the multiplayer relay.
 *
 *   node server.js [port]        (default 8088; also BREACHLINE_PORT or PORT on hosting)
 *
 * Multiplayer: a host's browser opens a match (a lobby with a code); guests join it, the server
 * relays messages between them and the host simulates the game. Any number of matches at once.
 * Accounts live in files or PostgreSQL (see storage.js). The relay needs no npm packages.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.BREACHLINE_PORT || process.env.PORT || 8088);
// On a cloud host the container addresses mean nothing to players.
const HOSTED = !!process.env.PORT && !process.argv[2];
const PROTOCOL = 'breachline-web/2', MAX_PLAYERS = 10, MAX_FRAME = 2 * 1024 * 1024;
const SERVER_NAME = String(process.env.BREACHLINE_NAME || os.hostname()).slice(0, 40);
const VERSION = require('./package.json').version;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.css': 'text/css', '.md': 'text/markdown; charset=utf-8', '.py': 'text/plain; charset=utf-8', '.txt': 'text/plain' };

function lanAddresses() {
  const result = [];
  if (HOSTED) return result;
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    if (/^(docker|br-|veth|tun|virbr|vmnet|lo)/.test(name)) continue;
    for (const a of list || []) if ((a.family === 'IPv4' || a.family === 4) && !a.internal) result.push(a.address);
  }
  return result;
}

// ---------------------------------------------------------------- static files
const { handleAPI, userFromRequest, nameRegistered, ready, storageInfo } = require('./accounts');
// Public, read-only answers that other sites may ask for: the game's server list pings any server.
function publicJSON(res, body) {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(body));
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'GET' && url.pathname === '/api/ping') {
        let players = 0; for (const r of rooms.values()) players += 1 + r.guests.size;
        return publicJSON(res, { name: SERVER_NAME, version: VERSION, proto: PROTOCOL, players, matches: rooms.size, addresses: lanAddresses(), port: PORT });
      }
      if (req.method === 'GET' && url.pathname === '/api/rooms') return publicJSON(res, { rooms: [...rooms.values()].map(roomInfo) });
      return await handleAPI(req, res, url);
    }
    const allowed = { '/': 'index.html', '/index.html': 'index.html', '/game.js': 'game.js', '/maps.js': 'maps.js', '/i18n.js': 'i18n.js' };
    const file = allowed[url.pathname];
    if (!file) { res.writeHead(404); return res.end('Not found'); }
    fs.readFile(path.join(ROOT, file), (err, data) => {
      res.writeHead(err ? 404 : 200, { 'content-type': TYPES[path.extname(file)], 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
      res.end(err ? 'Not found' : data);
    });
  } catch { res.writeHead(400); res.end('Bad request'); }
});

// ---------------------------------------------------------------- minimal RFC 6455 WebSocket
class Socket {
  constructor(raw) {
    this.raw = raw; this.buffer = Buffer.alloc(0); this.fragments = []; this.open = true;
    this.onmessage = () => {}; this.onclose = () => {};
    raw.on('data', chunk => { this.buffer = Buffer.concat([this.buffer, chunk]); this.parse(); });
    raw.on('close', () => this.closed());
    raw.on('end', () => { this.closed(); raw.end(); });
    raw.on('error', () => this.closed());
    raw.setNoDelay(true);
    raw.setTimeout(45000, () => this.close());
  }
  parse() {
    while (this.buffer.length >= 2) {
      const b0 = this.buffer[0], b1 = this.buffer[1], opcode = b0 & 15, masked = (b1 & 128) !== 0;
      let length = b1 & 127, offset = 2;
      if (length === 126) { if (this.buffer.length < 4) return; length = this.buffer.readUInt16BE(2); offset = 4; }
      else if (length === 127) { if (this.buffer.length < 10) return; length = Number(this.buffer.readBigUInt64BE(2)); offset = 10; }
      if (!masked || length > MAX_FRAME || this.fragments.reduce((n, b) => n + b.length, 0) + length > MAX_FRAME) { this.close(1009); return; }
      const total = offset + (masked ? 4 : 0) + length;
      if (this.buffer.length < total) return;
      let payload = this.buffer.subarray(offset + (masked ? 4 : 0), total);
      if (masked) { const mask = this.buffer.subarray(offset, offset + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3]; }
      this.buffer = this.buffer.subarray(total);
      if (opcode === 8) { this.close(1000); return; }
      if (opcode === 9) { this.frame(10, payload); continue; }
      if (opcode === 10) continue;
      if (opcode === 1 || opcode === 0) {
        this.fragments.push(payload);
        if (b0 & 128) {
          const text = Buffer.concat(this.fragments).toString('utf8'); this.fragments = [];
          try { this.onmessage(JSON.parse(text)); } catch (e) { /* ignore malformed */ }
        }
      }
    }
  }
  frame(opcode, payload) {
    if (!this.open) return;
    if (this.raw.writableLength > MAX_FRAME) { this.raw.destroy(); this.closed(); return; }
    const n = payload.length; let header;
    if (n < 126) header = Buffer.from([128 | opcode, n]);
    else if (n < 65536) { header = Buffer.alloc(4); header[0] = 128 | opcode; header[1] = 126; header.writeUInt16BE(n, 2); }
    else { header = Buffer.alloc(10); header[0] = 128 | opcode; header[1] = 127; header.writeBigUInt64BE(BigInt(n), 2); }
    this.raw.write(Buffer.concat([header, payload]));
  }
  send(object) { this.frame(1, Buffer.from(JSON.stringify(object), 'utf8')); }
  close(code = 1000) {
    if (!this.open) return;
    const p = Buffer.alloc(2); p.writeUInt16BE(code, 0); this.frame(8, p);
    this.raw.end(); this.closed();
  }
  closed() { if (!this.open) return; this.open = false; this.onclose(); }
}

// ---------------------------------------------------------------- relay (matches)
// code → { code, name, host, hostName, mode, map, target, max, allowed, state, guests: Map(id → {socket, name}), nextId, created }
const rooms = new Map();
const MAX_ROOMS = 200;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I to misread
function log(text) { console.log('[MP] ' + text); }
function cleanName(n) { return String(n || '').normalize('NFKC').replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 24); }
function newCode() {
  for (;;) { let c = ''; for (let i = 0; i < 5; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]; if (!rooms.has(c)) return c; }
}
function roomInfo(r) {
  return { code: r.code, name: r.name, host: r.hostName, mode: r.mode, map: r.map, target: r.target, max: r.max, allowed: r.allowed,
    state: r.state, players: [{ id: 0, name: r.hostName, host: true }, ...[...r.guests].map(([id, g]) => ({ id, name: g.name }))], created: r.created };
}
function broadcastLobby(r) {
  const msg = { type: 'lobby', room: roomInfo(r) };
  r.host.send(msg);
  for (const g of r.guests.values()) g.socket.send(msg);
}
server.on('upgrade', (req, raw, head) => {
  // Any site may connect (the game lists other people's servers). Account cookies are SameSite=Strict,
  // so a cross-site page cannot borrow somebody's account here.
  if (new URL(req.url, 'http://localhost').pathname !== '/ws' || !req.headers['sec-websocket-key']) { raw.destroy(); return; }
  const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  raw.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const socket = new Socket(raw), remote = req.headers['x-forwarded-for'] || raw.remoteAddress;
  // The cookie arrives with the upgrade request, so the server knows which account really connected.
  const account = userFromRequest(req)?.name || null;
  let role = null, id = -1, room = null, code = '', name = '';
  const reject = (reason, detail = '') => { socket.send({ type: 'relay-error', reason, detail }); log('Отказ ' + remote + ': ' + reason); socket.close(); };
  socket.onmessage = m => {
    if (!role) {
      if (!m || m.type !== 'relay-hello') return reject('hello_expected');
      if (m.proto !== PROTOCOL) return reject('version_mismatch');
      name = account || cleanName(m.name);
      if (!name) return reject('name_required');
      // A guest cannot pose as somebody's account: registered names need that account signed in.
      if (!account && nameRegistered(name)) return reject('name_reserved', name);
      if (m.role === 'host') {
        if (rooms.size >= MAX_ROOMS) return reject('server_full');
        const o = m.match && typeof m.match === 'object' ? m.match : {};
        code = typeof m.room === 'string' && /^[A-Za-z0-9]{1,16}$/.test(m.room) ? m.room.toUpperCase() : newCode();
        if (rooms.has(code)) return reject('code_taken', code);
        const allowed = Array.isArray(o.allowed) ? [...new Set(o.allowed.map(cleanName).filter(Boolean))].slice(0, 9) : [];
        room = { code, host: socket, hostName: name, name: cleanName(o.name) || name, mode: String(o.mode || 'bomb').slice(0, 16), map: String(o.map || '').slice(0, 24),
          target: Number(o.target) || 8, max: Math.max(2, Math.min(MAX_PLAYERS, Number(o.max) || MAX_PLAYERS)), allowed, state: 'lobby', guests: new Map(), nextId: 1, created: Date.now() };
        rooms.set(code, room);
        role = 'host'; id = 0;
        socket.send({ type: 'relay-ok', role, code, name, addresses: lanAddresses(), port: PORT }); broadcastLobby(room);
        log('Матч ' + code + ' создан: ' + name + ' (' + remote + ')');
      } else {
        code = typeof m.room === 'string' ? m.room.trim().toUpperCase() : '';
        room = rooms.get(code);
        if (!room) return reject('room_not_found', code);
        if (room.guests.size + 1 >= room.max) return reject('room_full');
        const key = name.toLowerCase();
        if (room.allowed.length && !room.allowed.some(a => a.toLowerCase() === key)) return reject('not_invited', name);
        if (room.hostName.toLowerCase() === key || [...room.guests.values()].some(g => g.name.toLowerCase() === key)) return reject('name_in_use', name);
        role = 'guest'; id = room.nextId++; room.guests.set(id, { socket, name });
        socket.send({ type: 'relay-ok', role, id, code, name });
        room.host.send({ type: 'peer-join', peer: id, account, name }); broadcastLobby(room);
        log('Игрок ' + name + ' зашёл в ' + code + ' (' + remote + ')');
      }
      return;
    }
    if (role === 'guest') { room.host.send({ from: id, msg: m }); return; }
    // host → server: start the match / host → guests: game messages
    if (m && m.type === 'start') { room.state = 'playing'; broadcastLobby(room); log('Матч ' + code + ' начался'); return; }
    if (m && m.type === 'lobby-reset') { room.state = 'lobby'; broadcastLobby(room); return; }
    if (!m || !m.msg) return;
    if (m.to === 'all') { for (const g of room.guests.values()) g.socket.send(m.msg); }
    else { const g = room.guests.get(m.to); if (g) g.socket.send(m.msg); }
  };
  const helloTimeout = setTimeout(() => { if (!role) socket.close(); }, 10000);
  socket.onclose = () => {
    clearTimeout(helloTimeout);
    if (role === 'host' && rooms.get(code) === room) {
      rooms.delete(code); log('Матч ' + code + ' закрыт');
      for (const g of room.guests.values()) { g.socket.send({ type: 'relay-error', reason: 'host_left' }); g.socket.close(); }
    } else if (role === 'guest' && room.guests.get(id)?.socket === socket) {
      room.guests.delete(id);
      if (rooms.get(code) === room) { room.host.send({ type: 'peer-leave', peer: id }); broadcastLobby(room); }
      log('Игрок ' + name + ' вышел из ' + code);
    }
  };
  if (head.length) { socket.buffer = head; socket.parse(); }
});

server.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? 'Порт ' + PORT + ' занят. Укажите другой: node server.js 8088' : e.message);
  process.exit(1);
});
ready.then(() => server.listen(PORT, '0.0.0.0', () => {
  console.log('Breachline «' + SERVER_NAME + '»: http://localhost:' + PORT + '/');
  console.log('  данные: ' + storageInfo());
  for (const a of lanAddresses()) console.log('  в локальной сети: http://' + a + ':' + PORT + '/');
}), e => { console.error(e.message); process.exit(1); });
