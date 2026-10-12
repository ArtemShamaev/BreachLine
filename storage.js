'use strict';
/* Where the server keeps its data, behind one small key/value interface:
 *
 *   DATABASE_URL set   → PostgreSQL (Render Postgres, Neon, Supabase…), table breachline_kv.
 *                        Survives redeploys of a hosting container. Needs the "pg" package.
 *   otherwise          → files in BREACHLINE_DATA (default ./data): accounts.json, saves/, avatars/.
 *
 * Keys: "accounts" (users and sessions), "ops" (server admins), "identity" (signing key), "server" (this server's id and its account site's key), "save/<user id>", "avatar/<user id>".
 */
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class FileStore {
  constructor(dir) { this.dir = dir; this.kind = 'files'; }
  file(key) {
    if (key === 'accounts') return path.join(this.dir, 'accounts.json');
    if (['ops', 'identity', 'server'].includes(key)) return path.join(this.dir, key + '.json');
    const [kind, id] = key.split('/');
    if (!/^[0-9a-f-]{36}$/.test(id || '')) throw Error('bad storage key ' + key);
    return kind === 'save' ? path.join(this.dir, 'saves', id + '.json') : path.join(this.dir, 'avatars', id);
  }
  async init() {
    await fs.mkdir(path.join(this.dir, 'saves'), { recursive: true, mode: 0o700 });
    await fs.mkdir(path.join(this.dir, 'avatars'), { recursive: true, mode: 0o700 });
    this.lock();
  }
  // Each server keeps the accounts in memory and rewrites the file, so two servers on one folder
  // would silently undo each other's changes. Only one may use a folder at a time.
  lock() {
    const file = path.join(this.dir, 'server.lock');
    try {
      const pid = Number(fsSync.readFileSync(file, 'utf8'));
      if (pid && pid !== process.pid) {
        try { process.kill(pid, 0); throw Error('Папку данных ' + this.dir + ' уже использует другой запущенный сервер (PID ' + pid + '). Остановите его или укажите другую папку в BREACHLINE_DATA.'); }
        catch (e) { if (e.code !== 'ESRCH' && e.code !== 'EPERM') throw e; if (e.code === 'EPERM') throw Error('Папку данных ' + this.dir + ' уже использует другой сервер (PID ' + pid + ').'); }
      }
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    fsSync.writeFileSync(file, String(process.pid), { mode: 0o600 });
    process.on('exit', () => { try { if (fsSync.readFileSync(file, 'utf8') === String(process.pid)) fsSync.unlinkSync(file); } catch {} });
  }
  async get(key) {
    try { return await fs.readFile(this.file(key)); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }
  async put(key, bytes) {
    // write a temporary file and rename it, so a crash never leaves half a file
    const file = this.file(key), temp = file + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
    await fs.writeFile(temp, bytes, { mode: 0o600 });
    await fs.rename(temp, file);
  }
  async del(key) { await fs.rm(this.file(key), { force: true }); }
  async close() {}
}

class PgStore {
  constructor(url) { this.url = url; this.kind = 'postgres'; }
  async init() {
    let pg;
    try { pg = require('pg'); }
    catch { throw Error('DATABASE_URL задан, но пакет "pg" не установлен. Выполните npm install.'); }
    // Public hosted databases (Neon, Supabase, Render's external URL) require TLS. Local databases and
    // Render's internal address (a host name without dots, e.g. dpg-xxxx-a) are plain. DATABASE_SSL=0/1 overrides.
    let host = '';
    try { host = new URL(this.url).hostname; } catch {}
    const plain = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host) || (host && !host.includes('.')) || /sslmode=disable/.test(this.url);
    const ssl = process.env.DATABASE_SSL ? process.env.DATABASE_SSL === '1' : !plain;
    this.pool = new pg.Pool({ connectionString: this.url, ssl: ssl ? { rejectUnauthorized: false } : false, max: 4 });
    await this.pool.query('CREATE TABLE IF NOT EXISTS breachline_kv (key text PRIMARY KEY, value bytea NOT NULL, updated timestamptz NOT NULL DEFAULT now())');
  }
  async get(key) {
    const r = await this.pool.query('SELECT value FROM breachline_kv WHERE key = $1', [key]);
    return r.rows.length ? r.rows[0].value : null;
  }
  async put(key, bytes) {
    await this.pool.query('INSERT INTO breachline_kv (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated = now()', [key, Buffer.from(bytes)]);
  }
  async del(key) { await this.pool.query('DELETE FROM breachline_kv WHERE key = $1', [key]); }
  async close() { await this.pool.end(); }
}

function open(dir) {
  return process.env.DATABASE_URL ? new PgStore(process.env.DATABASE_URL) : new FileStore(dir);
}

module.exports = { open, FileStore, PgStore };
