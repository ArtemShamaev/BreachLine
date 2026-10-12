#!/usr/bin/env node
/* Breachline server: serves the game, the accounts API and the multiplayer relay.
 *
 *   node server.js [port]        (default 8088; also BREACHLINE_PORT or PORT on hosting)
 *
 * Multiplayer works like a Minecraft server: players connect and wait in the server's lobby; a server
 * admin (op) picks mode and map and starts the match. The admin's browser then simulates the game and
 * the server relays messages between it and everyone else. Admins are set in the server console:
 * type "op <nickname>" (see "help"), or list them in BREACHLINE_OPS on hosting without a console.
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
const PROTOCOL = 'breachline-web/3', MAX_PLAYERS = 10, MAX_FRAME = 2 * 1024 * 1024;
const SERVER_NAME = String(process.env.BREACHLINE_NAME || os.hostname()).slice(0, 40);
const VERSION = require('./package.json').version;
// Accounts are shared: one site (the Render deploy) keeps them and signs tickets that every server trusts.
// A deploy on Render is that site itself; home servers use DEFAULT_AUTH. BREACHLINE_AUTH=self makes a server standalone.
const DEFAULT_AUTH = 'https://breachline-kumw.onrender.com';
const AUTH_SETTING = process.env.BREACHLINE_AUTH || (process.env.RENDER ? 'self' : DEFAULT_AUTH);
const AUTH = AUTH_SETTING === 'self' ? null : AUTH_SETTING.replace(/\/+$/, '');
let SERVER_ID = '', authKey = null;
const remoteNames = new Map(); // name → { registered, until }: names registered on the account site
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
const { handleAPI, userFromRequest, nameRegistered, ready, storageInfo, storageKind, loadOps, saveOps, verifyTicket, identityPublicKey, store } = require('./accounts');
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
        return publicJSON(res, { name: SERVER_NAME, id: SERVER_ID, auth: AUTH, version: VERSION, proto: PROTOCOL, storage: storageKind(), players: lobby.players.size, max: MAX_PLAYERS,
          state: lobby.state, settings: lobby.settings, names: [...lobby.players.values()].map(p => p.name), addresses: lanAddresses(), port: PORT });
      }
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

// ---------------------------------------------------------------- the server lobby and the match relay
// One lobby per server. state "lobby": everyone waits; state "playing": hostId's browser runs the match.
const lobby = { players: new Map(), nextId: 1, state: 'lobby', hostId: 0, settings: { mode: 'bomb', map: 'sandline', target: 8, diff: 'normal' } };
const MODES = ['bomb', 'elim', 'tdm', 'gungame'], DIFFS = ['easy', 'normal', 'hard'];
let ops = new Set();   // lower-case nicknames of admins
function log(text) { console.log('[MP] ' + text); }
function cleanName(n) { return String(n || '').normalize('NFKC').replace(/[^\p{L}\p{N}_ -]/gu, '').trim().slice(0, 24); }
const isOp = name => ops.has(name.toLowerCase());
// Until the first "op" command anybody may start (otherwise a fresh server could never play): the first in the lobby.
function canStart(p) { return ops.size ? isOp(p.name) : [...lobby.players.keys()][0] === p.id; }
function lobbyInfo() {
  return { state: lobby.state, settings: lobby.settings, hostId: lobby.hostId, server: SERVER_NAME, opsSet: ops.size > 0,
    players: [...lobby.players.values()].map(p => ({ id: p.id, name: p.name, op: isOp(p.name), leader: canStart(p) })) };
}
function broadcastLobby() { const msg = { type: 'lobby', lobby: lobbyInfo() }; for (const p of lobby.players.values()) p.socket.send(msg); }
function endMatch(reason) {
  if (lobby.state !== 'playing') return;
  lobby.state = 'lobby'; lobby.hostId = 0;
  for (const p of lobby.players.values()) p.socket.send({ type: 'match-end', reason });
  broadcastLobby(); log('Матч окончен' + (reason ? ' (' + reason + ')' : ''));
}
function startMatch(host) {
  lobby.state = 'playing'; lobby.hostId = host.id;
  const peers = [...lobby.players.values()].filter(p => p !== host).map(p => ({ peer: p.id, name: p.name, account: p.account }));
  host.socket.send({ type: 'role', role: 'host', settings: lobby.settings, peers });
  for (const p of lobby.players.values()) if (p !== host) p.socket.send({ type: 'role', role: 'guest', settings: lobby.settings });
  broadcastLobby(); log('Матч начал ' + host.name + ': ' + lobby.settings.mode + ' / ' + lobby.settings.map);
}
server.on('upgrade', (req, raw, head) => {
  // Any site may connect (players add servers by address). Account cookies are SameSite=Strict,
  // so a page from another site cannot borrow somebody's account here.
  if (new URL(req.url, 'http://localhost').pathname !== '/ws' || !req.headers['sec-websocket-key']) { raw.destroy(); return; }
  const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  raw.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const socket = new Socket(raw), remote = req.headers['x-forwarded-for'] || raw.remoteAddress;
  // The cookie arrives with the upgrade request, so the server knows which account really connected.
  const account = userFromRequest(req)?.name || null;
  let me = null, greeting = null;
  const reject = (reason, detail = '') => { socket.send({ type: 'relay-error', reason, detail }); log('Отказ ' + remote + ': ' + reason); socket.close(); };
  socket.onmessage = async m => {
    if (!m || typeof m !== 'object') return;
    if (greeting) await greeting; // messages that arrive while the hello is being checked
    if (!me) {
      if (m.type !== 'relay-hello') return reject('hello_expected');
      if (m.proto !== PROTOCOL) return reject('version_mismatch');
      let done; greeting = new Promise(r => { done = r; });
      try { await hello(m); } finally { done(); }
      return;
    }
    handle(m);
  };
  async function hello(m) {
      // signed in on this server, or holding a ticket from the account site
      // (the account site itself accepts its own tickets: pages from home servers carry no cookie for it)
      const key = AUTH ? authKey : identityPublicKey();
      const ticketName = !account && key && m.ticket ? verifyTicket(m.ticket, key, SERVER_ID) : null;
      const verified = account || ticketName;
      const name = verified || cleanName(m.name);
      if (!name) return reject('name_required');
      // A guest cannot pose as somebody's account: registered names need that account signed in.
      if (!verified && (nameRegistered(name) || await registeredRemotely(name))) return reject('name_reserved', name);
      if (socket.open === false) return;
      if ([...lobby.players.values()].some(p => p.name.toLowerCase() === name.toLowerCase())) return reject('name_in_use', name);
      if (lobby.players.size >= MAX_PLAYERS) return reject('server_full');
      me = { id: lobby.nextId++, socket, name, account: verified, remote };
      lobby.players.set(me.id, me);
      socket.send({ type: 'joined', id: me.id, name, server: SERVER_NAME });
      log(name + ' зашёл на сервер (' + remote + ')');
      if (lobby.state === 'playing') { // late arrival: straight into the running match
        lobby.players.get(lobby.hostId)?.socket.send({ type: 'peer-join', peer: me.id, name, account: verified });
        socket.send({ type: 'role', role: 'guest', settings: lobby.settings });
      }
      broadcastLobby();
  }
  function handle(m) {
    if (m.type === 'settings' && lobby.state === 'lobby' && canStart(me) && m.settings && typeof m.settings === 'object') {
      const o = m.settings, st = lobby.settings;
      if (MODES.includes(o.mode)) st.mode = o.mode;
      if (typeof o.map === 'string' && /^[a-z0-9]{1,24}$/.test(o.map)) st.map = o.map;
      if ([5, 8].includes(o.target)) st.target = o.target;
      if (DIFFS.includes(o.diff)) st.diff = o.diff;
      broadcastLobby(); return;
    }
    if (m.type === 'start') {
      if (lobby.state !== 'lobby') return;
      if (!canStart(me)) { socket.send({ type: 'notice', reason: 'not_admin' }); return; }
      startMatch(me); return;
    }
    if (lobby.state !== 'playing') return;
    if (me.id !== lobby.hostId) { lobby.players.get(lobby.hostId)?.socket.send({ from: me.id, msg: m }); return; }
    // the host: back to the lobby, or game messages for the others
    if (m.type === 'end') { endMatch(''); return; }
    if (!m.msg) return;
    if (m.to === 'all') { for (const p of lobby.players.values()) if (p !== me) p.socket.send(m.msg); }
    else lobby.players.get(m.to)?.socket.send(m.msg);
  };
  const helloTimeout = setTimeout(() => { if (!me) socket.close(); }, 10000);
  socket.onclose = () => {
    clearTimeout(helloTimeout);
    if (!me || lobby.players.get(me.id) !== me) return;
    lobby.players.delete(me.id);
    log(me.name + ' вышел с сервера');
    if (lobby.state === 'playing') {
      if (me.id === lobby.hostId) endMatch('host_left');
      else lobby.players.get(lobby.hostId)?.socket.send({ type: 'peer-leave', peer: me.id });
    }
    broadcastLobby();
  };
  if (head.length) { socket.buffer = head; socket.parse(); }
});

// Is this nickname an account on the account site? Cached; when the site is unreachable, allow it.
async function registeredRemotely(name) {
  if (!AUTH) return false;
  const key = name.toLowerCase(), hit = remoteNames.get(key);
  if (hit && hit.until > Date.now()) return hit.registered;
  try {
    const r = await fetch(AUTH + '/api/name?n=' + encodeURIComponent(name), { signal: AbortSignal.timeout(4000) });
    const registered = !!(await r.json()).registered;
    remoteNames.set(key, { registered, until: Date.now() + 600000 });
    return registered;
  } catch { return false; }
}
// This server's id (tickets are issued for it) and the account site's public key, cached for offline starts.
async function setupIdentity() {
  const raw = await store.get('server');
  const saved = raw ? JSON.parse(raw.toString('utf8')) : {};
  SERVER_ID = saved.id || crypto.randomUUID();
  authKey = saved.auth === AUTH ? saved.key || null : null;
  const save = () => store.put('server', JSON.stringify({ id: SERVER_ID, auth: AUTH, key: authKey }));
  await save();
  if (!AUTH) return;
  const fetchKey = async () => {
    try {
      const key = (await (await fetch(AUTH + '/api/identity', { signal: AbortSignal.timeout(8000) })).json()).publicKey;
      if (typeof key === 'string' && key.includes('PUBLIC KEY')) { const changed = key !== authKey; authKey = key; if (changed) { await save(); console.log('  аккаунты: ' + AUTH); } return true; }
    } catch {}
    return false;
  };
  // the site may be asleep (free Render): keep trying in the background
  if (!await fetchKey()) {
    console.log('  аккаунты: ' + AUTH + ' пока недоступен' + (authKey ? ' — использую сохранённый ключ' : ' — повторю попытку'));
    const timer = setInterval(async () => { if (await fetchKey()) clearInterval(timer); }, 30000); timer.unref();
  }
}

// ---------------------------------------------------------------- server console
const HELP = `Команды сервера:
  op <ник>      сделать игрока администратором (может выбирать карту и начинать матч)
  deop <ник>    снять права администратора
  ops           список администраторов
  list          кто сейчас на сервере
  kick <ник>    отключить игрока
  stop          остановить сервер
  help          эта справка`;
async function setOps(list) { ops = new Set(list.map(n => n.toLowerCase())); await saveOps([...ops]); broadcastLobby(); }
function command(line) {
  const [cmd, ...rest] = line.trim().split(/\s+/), arg = cleanName(rest.join(' '));
  switch ((cmd || '').toLowerCase()) {
    case '': return;
    case 'help': console.log(HELP); return;
    case 'op':
      if (!arg) return console.log('Укажите ник: op <ник>');
      setOps([...ops, arg]).then(() => console.log(arg + ' теперь администратор сервера.' + (nameRegistered(arg) ? '' : ' Совет: зарегистрируйте этот ник аккаунтом на сервере, чтобы его никто не занял.')));
      return;
    case 'deop':
      if (!ops.has(arg.toLowerCase())) return console.log(arg + ' не администратор.');
      setOps([...ops].filter(n => n !== arg.toLowerCase())).then(() => console.log(arg + ' больше не администратор.'));
      return;
    case 'ops': console.log(ops.size ? 'Администраторы: ' + [...ops].join(', ') : 'Администраторов нет — начать матч может первый игрок в лобби. Назначьте: op <ник>'); return;
    case 'list': {
      const names = [...lobby.players.values()].map(p => p.name + (isOp(p.name) ? ' (op)' : '') + (p.id === lobby.hostId ? ' — ведёт матч' : ''));
      console.log(names.length ? `Игроков ${names.length}/${MAX_PLAYERS}: ` + names.join(', ') : 'На сервере никого нет.'); return;
    }
    case 'kick': {
      const p = [...lobby.players.values()].find(p => p.name.toLowerCase() === arg.toLowerCase());
      if (!p) return console.log('Игрока ' + arg + ' нет на сервере.');
      p.socket.send({ type: 'relay-error', reason: 'kicked' }); p.socket.close(); console.log(p.name + ' отключён.'); return;
    }
    case 'stop': console.log('Сервер остановлен.'); process.kill(process.pid, 'SIGTERM'); return;
    default: console.log('Неизвестная команда. help — список команд.');
  }
}
if (process.stdin.isTTY || process.env.BREACHLINE_CONSOLE) {
  require('readline').createInterface({ input: process.stdin }).on('line', command);
}

server.on('error', e => {
  console.error(e.code === 'EADDRINUSE' ? 'Порт ' + PORT + ' занят. Укажите другой: node server.js 8088' : e.message);
  process.exit(1);
});
ready.then(setupIdentity).then(async () => {
  // admins: saved ones plus BREACHLINE_OPS (comma-separated) for hosting without a console
  ops = new Set([...(await loadOps()), ...String(process.env.BREACHLINE_OPS || '').split(',').map(cleanName).filter(Boolean)].map(n => n.toLowerCase()));
}).then(() => server.listen(PORT, '0.0.0.0', () => {
  console.log('Breachline «' + SERVER_NAME + '»: http://localhost:' + PORT + '/');
  console.log('  данные: ' + storageInfo());
  if (process.env.RENDER && storageKind() === 'files')
    console.warn('  ВНИМАНИЕ: DATABASE_URL не задан — аккаунты лежат в файлах контейнера и пропадут при следующем деплое. См. README, «Размещение на Render».');
  for (const a of lanAddresses()) console.log('  в локальной сети: http://' + a + ':' + PORT + '/');
  console.log(ops.size ? '  администраторы: ' + [...ops].join(', ') : '  администраторов нет — назначьте: op <ник>  (help — все команды)');
}), e => { console.error(e.message); process.exit(1); });
