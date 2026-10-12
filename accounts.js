'use strict';
/* Accounts, sessions and per-account match saves, kept in storage.js (files or PostgreSQL):
 *
 * accounts         users and sessions (only SHA-256 of session tokens is stored)
 * save/<id>        one checkpoint per account
 * avatar/<id>      uploaded profile picture (PNG, JPEG or WebP, at most 256 KB)
 * Errors are returned as { error: '<code>' }; the browser turns codes into text.
 */
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const storage = require('./storage');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

const DIR = process.env.BREACHLINE_DATA || path.join(__dirname, 'data');
const DB_FILE = path.join(DIR, 'accounts.json');
const store = storage.open(DIR);
const SESSION_TTL = 30 * 86400000, MAX_SESSIONS = 20, COOKIE = 'bl_sid';
const MAX_BODY = 1024 * 1024;
// Render and similar hosts put every request behind a proxy; without this all players share one IP limit.
const TRUST_PROXY = process.env.BREACHLINE_TRUST_PROXY === '1' || !!process.env.RENDER;

class ApiError extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }

// ---------------------------------------------------------------- storage
let db = { version: 2, users: {}, sessions: {} };
const byName = new Map(); // name key → user id
let writing = Promise.resolve(), dirty = false;

function persist() {
  dirty = true;
  writing = writing.then(async () => {
    if (!dirty) return;
    dirty = false;
    await store.put('accounts', JSON.stringify(db));
  }).catch(e => { dirty = true; console.error('[accounts] не удалось записать базу: ' + e.message); throw e; });
  return writing;
}
async function migrateLegacy() {
  // v1 stored <sha256(lowercase name)>.json and .save.json side by side in the data folder.
  const files = await fs.readdir(DIR).catch(() => []);
  const legacy = files.filter(f => /^[a-f0-9]{64}\.json$/.test(f));
  if (!legacy.length) return;
  const backup = path.join(DIR, 'legacy-v1');
  await fs.mkdir(backup, { recursive: true, mode: 0o700 });
  for (const file of legacy) {
    try {
      const old = JSON.parse(await fs.readFile(path.join(DIR, file), 'utf8'));
      const key = nameKey(old.name);
      if (!byName.has(key) && typeof old.salt === 'string' && typeof old.hash === 'string') {
        const user = { id: crypto.randomUUID(), name: old.name, key, salt: old.salt, hash: old.hash, created: Date.now(), changed: Date.now(), avatar: randomAvatar(), stats: emptyStats() };
        db.users[user.id] = user; byName.set(key, user.id);
        // v1 wrote the whole request body, { save }, to disk.
        const save = await fs.readFile(path.join(DIR, file.replace(/\.json$/, '.save.json')), 'utf8').catch(e => { if (e.code !== 'ENOENT') throw e; });
        if (save) await store.put('save/' + user.id, JSON.stringify(JSON.parse(save).save ?? null));
      }
    } catch (e) { console.error('[accounts] пропущен старый аккаунт ' + file + ': ' + e.message); }
  }
  await persist();
  for (const file of files.filter(f => /^[a-f0-9]{64}(\.save)?\.json$/.test(f))) await fs.rename(path.join(DIR, file), path.join(backup, file));
  console.log('[accounts] перенесено старых аккаунтов: ' + legacy.length);
}
const ready = (async () => {
  await store.init();
  const raw = await store.get('accounts');
  if (raw) {
    try { db = JSON.parse(raw.toString('utf8')); }
    catch (e) { throw Error('База аккаунтов повреждена (' + store.kind + '): ' + e.message); }
  }
  db.users ||= {}; db.sessions ||= {};
  for (const user of Object.values(db.users)) byName.set(user.key, user.id);
  if (store.kind === 'files') await migrateLegacy();
})();
// Do not lose the last write on Ctrl+C or a hosting restart.
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  if (!dirty) process.exit(0);
  if (store.kind === 'files') {
    try { fsSync.writeFileSync(DB_FILE, JSON.stringify(db), { mode: 0o600 }); } catch {}
    process.exit(0);
  }
  setTimeout(() => process.exit(0), 4000).unref();
  persist().catch(() => {}).finally(() => process.exit(0));
});
/** True when an account already uses this name: guests may not take it in multiplayer. */
function nameRegistered(name) { return byName.has(nameKey(name)); }

// ---------------------------------------------------------------- names, passwords, sessions
function nameKey(name) { return String(name).normalize('NFKC').toLowerCase(); }
function checkName(raw) {
  const name = typeof raw === 'string' ? raw.normalize('NFKC').trim() : '';
  if (!/^[\p{L}\p{N}_-]{3,24}$/u.test(name)) throw new ApiError(400, 'name_invalid');
  // "Аdmin" with a Cyrillic А would look identical to "Admin" in the LAN scoreboard.
  if (/\p{Script=Latin}/u.test(name) && /\p{Script=Cyrillic}/u.test(name)) throw new ApiError(400, 'name_mixed');
  return name;
}
function checkPassword(password, name) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new ApiError(400, 'password_invalid');
  if (name && nameKey(password).includes(nameKey(name))) throw new ApiError(400, 'password_has_name');
}
async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: (await scrypt(password, salt, 64)).toString('hex') };
}
async function verifyPassword(user, password) {
  const { hash } = await hashPassword(String(password), user?.salt || 'no-such-user');
  return !!user && crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}
const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');
function readToken(req) { return new RegExp(`(?:^|;\\s*)${COOKIE}=([A-Za-z0-9_-]{43})`).exec(req.headers.cookie || '')?.[1] || null; }
function cookie(req, value, maxAge) {
  const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}
function startSession(req, res, user) {
  const token = crypto.randomBytes(32).toString('base64url'), now = Date.now();
  db.sessions[tokenHash(token)] = { user: user.id, created: now, seen: now, until: now + SESSION_TTL };
  const own = Object.entries(db.sessions).filter(([, s]) => s.user === user.id).sort((a, b) => a[1].seen - b[1].seen);
  for (const [key] of own.slice(0, Math.max(0, own.length - MAX_SESSIONS))) delete db.sessions[key];
  res.setHeader('Set-Cookie', cookie(req, token, SESSION_TTL / 1000));
}
/** The signed-in user for a request, or null. Synchronous so the WebSocket relay can use it. */
function userFromRequest(req) {
  const token = readToken(req);
  if (!token) return null;
  const key = tokenHash(token), s = db.sessions[key], now = Date.now();
  if (!s || s.until < now || !db.users[s.user]) { if (s) { delete db.sessions[key]; persist().catch(() => {}); } return null; }
  if (now - s.seen > 3600000) { s.seen = now; s.until = now + SESSION_TTL; persist().catch(() => {}); }
  return { ...db.users[s.user], session: key };
}
const AVATAR_ICONS = 8, AVATAR_COLORS = 8, MAX_AVATAR = 256 * 1024;
const IMAGE_TYPES = { png: [0x89, 0x50, 0x4e, 0x47], jpeg: [0xff, 0xd8, 0xff], webp: [0x52, 0x49, 0x46, 0x46] };
const emptyStats = () => ({ matches: 0, wins: 0, kills: 0, deaths: 0 });
// A new account gets a picked-at-random emblem so two fresh players do not look identical.
const randomAvatar = () => ({ icon: crypto.randomInt(AVATAR_ICONS), color: crypto.randomInt(AVATAR_COLORS) });
const publicUser = u => u ? { id: u.id, name: u.name, created: u.created, avatar: u.avatar || { icon: 0, color: 0 }, stats: u.stats || emptyStats() } : null;

// ---------------------------------------------------------------- abuse limits
const buckets = new Map();
function clientIP(req) {
  const forwarded = TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}
function hit(key, limit, windowMs) {
  const now = Date.now(), b = buckets.get(key);
  if (!b || b.until < now) { buckets.set(key, { count: 1, until: now + windowMs }); return; }
  if (b.count >= limit) throw new ApiError(429, 'rate_limited');
  b.count++;
}
function blocked(key, limit) { const b = buckets.get(key); return !!b && b.until > Date.now() && b.count >= limit; }
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.until < now) buckets.delete(k); }, 60000).unref();

// ---------------------------------------------------------------- HTTP
function reply(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) throw new ApiError(415, 'bad_request');
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) throw new ApiError(413, 'too_large'); chunks.push(chunk); }
  try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); if (value && typeof value === 'object') return value; } catch {}
  throw new ApiError(400, 'bad_json');
}
function requireUser(user) { if (!user) throw new ApiError(401, 'unauthorized'); return user; }
function validSave(save) { return !!save && save.version === 1 && Number.isFinite(save.date) && Array.isArray(save.entities) && save.entities.length === 10; }

const routes = {
  'GET /api/me': (req, res, user) => reply(res, 200, { user: publicUser(user) }),

  async 'POST /api/register'(req, res, user, ip) {
    if (blocked('register:' + ip, 10)) throw new ApiError(429, 'rate_limited');
    const data = await readBody(req), name = checkName(data.name);
    checkPassword(data.password, name);
    if (byName.has(nameKey(name))) throw new ApiError(409, 'name_taken');
    const now = Date.now(), account = { id: crypto.randomUUID(), name, key: nameKey(name), ...await hashPassword(data.password), created: now, changed: now, avatar: randomAvatar(), stats: emptyStats() };
    if (byName.has(account.key)) throw new ApiError(409, 'name_taken'); // registered while hashing
    hit('register:' + ip, 10, 3600000); // only successful sign-ups count, typos do not
    db.users[account.id] = account; byName.set(account.key, account.id);
    if (user) delete db.sessions[user.session];
    startSession(req, res, account); await persist();
    reply(res, 201, { user: publicUser(account) });
  },

  async 'POST /api/login'(req, res, user, ip) {
    hit('login:' + ip, 30, 600000);
    const data = await readBody(req), key = typeof data.name === 'string' ? nameKey(data.name.trim()) : '';
    if (blocked('fail:' + key, 10)) throw new ApiError(429, 'rate_limited');
    const account = db.users[byName.get(key)];
    if (!await verifyPassword(account, data.password)) { hit('fail:' + key, 10, 900000); throw new ApiError(401, 'bad_credentials'); }
    buckets.delete('fail:' + key);
    if (user) delete db.sessions[user.session];
    startSession(req, res, account); await persist();
    reply(res, 200, { user: publicUser(account) });
  },

  async 'POST /api/logout'(req, res, user) {
    if (user) { delete db.sessions[user.session]; await persist(); }
    res.setHeader('Set-Cookie', cookie(req, '', 0));
    reply(res, 200, { ok: true });
  },

  async 'POST /api/logout-others'(req, res, user) {
    requireUser(user);
    let revoked = 0;
    for (const [key, s] of Object.entries(db.sessions)) if (s.user === user.id && key !== user.session) { delete db.sessions[key]; revoked++; }
    await persist();
    reply(res, 200, { revoked });
  },

  async 'POST /api/password'(req, res, user, ip) {
    requireUser(user); hit('password:' + ip, 10, 600000);
    const data = await readBody(req);
    if (!await verifyPassword(db.users[user.id], data.current)) throw new ApiError(403, 'wrong_password');
    checkPassword(data.next, user.name);
    if (data.next === data.current) throw new ApiError(400, 'password_same');
    Object.assign(db.users[user.id], await hashPassword(data.next), { changed: Date.now() });
    // A changed password must end every other session, e.g. on a stolen laptop.
    for (const [key, s] of Object.entries(db.sessions)) if (s.user === user.id) delete db.sessions[key];
    startSession(req, res, db.users[user.id]); await persist();
    reply(res, 200, { ok: true });
  },

  async 'DELETE /api/account'(req, res, user, ip) {
    requireUser(user); hit('password:' + ip, 10, 600000);
    const data = await readBody(req);
    if (!await verifyPassword(db.users[user.id], data.password)) throw new ApiError(403, 'wrong_password');
    delete db.users[user.id]; byName.delete(user.key);
    for (const [key, s] of Object.entries(db.sessions)) if (s.user === user.id) delete db.sessions[key];
    await persist();
    await store.del('save/' + user.id);
    await store.del('avatar/' + user.id);
    res.setHeader('Set-Cookie', cookie(req, '', 0));
    reply(res, 200, { ok: true });
  },

  // Pick a built-in emblem: { avatar: { icon, color } }. Drops an uploaded picture.
  async 'PUT /api/profile'(req, res, user) {
    requireUser(user);
    const { avatar } = await readBody(req);
    if (!avatar || !Number.isInteger(avatar.icon) || !Number.isInteger(avatar.color) || avatar.icon < 0 || avatar.icon >= AVATAR_ICONS || avatar.color < 0 || avatar.color >= AVATAR_COLORS)
      throw new ApiError(400, 'bad_avatar');
    db.users[user.id].avatar = { icon: avatar.icon, color: avatar.color };
    await persist(); await store.del('avatar/' + user.id);
    reply(res, 200, { user: publicUser(db.users[user.id]) });
  },

  // Upload a picture: { image: 'data:image/png;base64,…' }. The browser already scaled it down.
  async 'PUT /api/avatar'(req, res, user) {
    requireUser(user);
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/.exec((await readBody(req)).image || '');
    const bytes = match && Buffer.from(match[2], 'base64');
    if (!bytes || bytes.length > MAX_AVATAR) throw new ApiError(400, 'bad_image');
    // Check the file signature, not just the label, before serving it back as an image.
    if (!IMAGE_TYPES[match[1]].every((b, i) => bytes[i] === b) || match[1] === 'webp' && bytes.toString('latin1', 8, 12) !== 'WEBP') throw new ApiError(400, 'bad_image');
    await store.put('avatar/' + user.id, bytes);
    const avatar = { ...(db.users[user.id].avatar || randomAvatar()), image: match[1], v: Date.now() };
    db.users[user.id].avatar = avatar; await persist();
    reply(res, 200, { user: publicUser(db.users[user.id]) });
  },

  // Called once when a match ends; a match takes minutes, so one report per 30 s is plenty.
  async 'POST /api/stats'(req, res, user) {
    requireUser(user);
    const data = await readBody(req), count = n => Number.isInteger(n) && n >= 0 && n <= 500;
    if (typeof data.won !== 'boolean' || !count(data.kills) || !count(data.deaths)) throw new ApiError(400, 'bad_request');
    hit('stats:' + user.id, 1, 30000);
    const stats = db.users[user.id].stats ||= emptyStats();
    stats.matches++; stats.wins += data.won ? 1 : 0; stats.kills += data.kills; stats.deaths += data.deaths;
    await persist();
    reply(res, 200, { user: publicUser(db.users[user.id]) });
  },

  async 'GET /api/save'(req, res, user) {
    requireUser(user);
    const raw = await store.get('save/' + user.id);
    reply(res, 200, { save: raw ? JSON.parse(raw.toString('utf8')) : null });
  },

  async 'PUT /api/save'(req, res, user) {
    requireUser(user);
    const { save } = await readBody(req);
    if (!validSave(save)) throw new ApiError(400, 'bad_save');
    await store.put('save/' + user.id, JSON.stringify(save));
    reply(res, 200, { ok: true });
  },

  async 'DELETE /api/save'(req, res, user) {
    requireUser(user);
    await store.del('save/' + user.id);
    reply(res, 200, { ok: true });
  },
};

async function sendAvatar(res, id) {
  const type = db.users[id]?.avatar?.image;
  const bytes = type && await store.get('avatar/' + id).catch(() => null);
  if (!bytes) throw new ApiError(404, 'not_found');
  // Pictures are only ever shown as <img>; the CSP keeps a crafted file from doing anything else.
  res.writeHead(200, { 'content-type': 'image/' + type, 'cache-control': 'private, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox" });
  res.end(bytes);
}

async function handleAPI(req, res, url) {
  try {
    await ready;
    if (req.method !== 'GET' && req.headers.origin) {
      let host = null; try { host = new URL(req.headers.origin).host; } catch {}
      if (host !== req.headers.host) throw new ApiError(403, 'bad_origin');
    }
    const picture = /^\/api\/avatar\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (picture && req.method === 'GET') return await sendAvatar(res, picture[1]);
    const route = routes[req.method + ' ' + url.pathname];
    if (!route) throw new ApiError(404, 'not_found');
    await route(req, res, userFromRequest(req), clientIP(req));
  } catch (e) {
    if (!(e instanceof ApiError)) console.error('[accounts]', e);
    if (!res.headersSent) reply(res, e.status || 500, { error: e.code || 'server_error' });
  }
}

// Server administrators (ops), shared with the multiplayer relay.
async function loadOps() { await ready; const raw = await store.get('ops'); try { return raw ? JSON.parse(raw.toString('utf8')) : []; } catch { return []; } }
async function saveOps(list) { await store.put('ops', JSON.stringify(list)); }

module.exports = { loadOps, saveOps, handleAPI, userFromRequest, nameRegistered, ready, storageKind: () => store.kind, storageInfo: () => (store.kind === 'files' ? 'файлы в ' + DIR : 'PostgreSQL') + ', аккаунтов: ' + Object.keys(db.users).length };
