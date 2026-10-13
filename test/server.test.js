'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, readFile, readdir, rm, writeFile } = require('node:fs/promises');
const net = require('node:net');
const crypto = require('node:crypto');
const os = require('node:os');
const path = require('node:path');
let server, dir, base, port;
// With DATABASE_URL the server keeps everything in PostgreSQL; read it back the same way.
const PG = !!process.env.DATABASE_URL;
async function stored(key) {
  if (!PG) {
    const file = key === 'accounts' || key === 'ops' ? key + '.json' : key.replace(/^save\//, 'saves/').replace(/^inventory\//, 'inventories/').replace(/$/, /^(save|inventory)\//.test(key) ? '.json' : '');
    return readFile(path.join(dir, file)).catch(() => null);
  }
  const { Client } = require('pg'); const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
  try { const r = await c.query('SELECT value FROM breachline_kv WHERE key = $1', [key]); return r.rows[0]?.value || null; } finally { await c.end(); }
}
async function startServer() {
  server = spawn(process.execPath, ['server.js', String(port)], { cwd: path.join(__dirname, '..'), env: { ...process.env, BREACHLINE_DATA: dir, BREACHLINE_CONSOLE: '1', BREACHLINE_AUTH: 'self' }, stdio: ['pipe','pipe','pipe'] });
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('exit', code => reject(Error('Server exited: '+code))); });
}
async function stopServer() { const s = server; server = null; if (s && s.exitCode === null) await new Promise(resolve => { s.once('exit', resolve); s.kill(); }); }
before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'breachline-test-'));
  if (PG) { const { Client } = require('pg'); const c = new Client({ connectionString: process.env.DATABASE_URL }); await c.connect(); await c.query('DROP TABLE IF EXISTS breachline_kv'); await c.end(); }
  // A v1 account (name "Ветеран", password "veteran-pass") must survive the migration.
  const salt = 'ab'.repeat(16), hash = crypto.scryptSync('veteran-pass', salt, 64).toString('hex');
  const legacyId = crypto.createHash('sha256').update('ветеран').digest('hex');
  await writeFile(path.join(dir, legacyId + '.json'), JSON.stringify({ name: 'Ветеран', salt, hash }));
  await writeFile(path.join(dir, legacyId + '.save.json'), JSON.stringify({ save: { version: 1, date: 1, entities: [] } }));
  port = await new Promise(resolve => { const s = net.createServer(); s.listen(0,'127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  base = 'http://127.0.0.1:' + port;
  await startServer();
});
after(async () => { await stopServer(); if (dir) await rm(dir, { recursive: true, force: true }); });
async function api(route, method = 'GET', body, cookie) {
  const response = await fetch(base + '/api/' + route, { method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0], data: await response.json() };
}
const save = { version:1, date: 1000, entities: Array.from({length:10},(_,id)=>({id})), marker:'preserved' };
test('registration validates names and passwords', async () => {
  for (const [body, error] of [
    [{ name:'ab', password:'strong-pass-123' }, 'name_invalid'],
    [{ name:'Аdmin', password:'strong-pass-123' }, 'name_mixed'],
    [{ name:'Validname', password:'short' }, 'password_invalid'],
    [{ name:'Validname', password:'my-validname-1' }, 'password_has_name'],
  ]) { const r = await api('register','POST',body); assert.equal(r.status,400); assert.equal(r.data.error,error); }
  const r = await fetch(base + '/api/register', { method:'POST', headers:{ 'content-type':'text/plain' }, body:'{}' });
  assert.equal(r.status,415);
});
test('accounts: register, log in, isolate saves, persist sessions across restarts', async () => {
  const a = await api('register','POST',{ name:'Тестер', password:'strong-pass-123' });
  assert.equal(a.status,201); assert.equal(a.data.user.name,'Тестер'); assert.match(a.cookie,/^bl_sid=[\w-]{43}$/);
  assert.equal((await api('register','POST',{ name:'ТЕСТЕР',password:'strong-pass-123' })).data.error,'name_taken');
  assert.equal((await api('login','POST',{name:'Тестер', password:'incorrect'})).data.error,'bad_credentials');
  const login = await api('login','POST',{name:'тестер',password:'strong-pass-123'}); assert.equal(login.status,200);
  assert.equal((await api('me','GET',null,login.cookie)).data.user.id,a.data.user.id);
  assert.equal((await api('save')).status,401);
  assert.equal((await api('save','PUT',{ save:{ ...save, entities:[] } },login.cookie)).data.error,'bad_save');
  assert.equal((await api('save','PUT',{ save },login.cookie)).status,200);
  assert.deepEqual((await api('save','GET',null,a.cookie)).data.save,save);
  const b = await api('register','POST',{name:'Another',password:'different-pass'});
  assert.equal((await api('save','GET',null,b.cookie)).data.save,null);

  const db = JSON.parse((await stored('accounts')).toString('utf8'));
  const user = db.users[a.data.user.id];
  assert.equal(user.password,undefined); assert.equal(user.hash.length,128);
  assert.ok(!JSON.stringify(db).includes(a.cookie.split('=')[1]), 'raw session tokens must not be stored');

  await stopServer(); await startServer();
  assert.equal((await api('me','GET',null,a.cookie)).data.user.name,'Тестер');
  assert.deepEqual((await api('save','GET',null,a.cookie)).data.save,save);

  await api('logout','POST',null,login.cookie);
  assert.equal((await api('save','GET',null,login.cookie)).status,401);
  assert.equal((await api('me','GET',null,a.cookie)).data.user.name,'Тестер');
});
test('password change and sign-out ends other sessions', async () => {
  await api('register','POST',{ name:'Changer', password:'first-pass-1' });
  const laptop = await api('login','POST',{ name:'changer', password:'first-pass-1' }), phone = await api('login','POST',{ name:'changer', password:'first-pass-1' });
  assert.equal((await api('password','POST',{ current:'wrong-pass-1', next:'second-pass-2' },laptop.cookie)).data.error,'wrong_password');
  const changed = await api('password','POST',{ current:'first-pass-1', next:'second-pass-2' },laptop.cookie);
  assert.equal(changed.status,200);
  assert.equal((await api('me','GET',null,phone.cookie)).data.user,null);
  assert.equal((await api('me','GET',null,laptop.cookie)).data.user,null);
  assert.equal((await api('me','GET',null,changed.cookie)).data.user.name,'Changer');
  assert.equal((await api('login','POST',{ name:'Changer', password:'first-pass-1' })).status,401);
  const tablet = await api('login','POST',{ name:'Changer', password:'second-pass-2' });
  assert.equal((await api('logout-others','POST',{},changed.cookie)).data.revoked,1);
  assert.equal((await api('me','GET',null,tablet.cookie)).data.user,null);
});
test('inventory: skins, cases and credits are kept per account and checked', async () => {
  const r = await api('register','POST',{ name:'Collector', password:'collect-pass-1' });
  assert.equal((await api('inventory')).status,401);
  assert.equal((await api('inventory','GET',null,r.cookie)).data.inventory,null);
  const inventory = { v:1, date:5, credits:120, cases:{ sandline:2 }, items:[{ id:'abc123', s:'lb338:wyrmscale', f:.031, seed:661, kc:12 }], eq:{ lb338:'abc123' } };
  assert.equal((await api('inventory','PUT',{ inventory },r.cookie)).status,200);
  assert.deepEqual((await api('inventory','GET',null,r.cookie)).data.inventory,inventory);
  for (const bad of [{ ...inventory, credits:-1 }, { ...inventory, items:[{ id:'x', s:'p9:nope', f:.1, seed:1, kc:null }] }, { ...inventory, cases:{ fake:1 } }, { ...inventory, items:[{ id:'x', s:'p9:gunmetal', f:2, seed:1, kc:null }] }])
    assert.equal((await api('inventory','PUT',{ inventory:bad },r.cookie)).data.error,'bad_inventory');
  assert.equal((await api('account','DELETE',{ password:'collect-pass-1' },r.cookie)).status,200);
  assert.equal(await stored('inventory/' + r.data.user.id), null);
});
test('account deletion removes the account, sessions and save', async () => {
  const r = await api('register','POST',{ name:'Leaver', password:'leaving-pass-1' });
  await api('save','PUT',{ save },r.cookie);
  assert.equal((await api('account','DELETE',{ password:'nope-nope-1' },r.cookie)).status,403);
  assert.equal((await api('account','DELETE',{ password:'leaving-pass-1' },r.cookie)).status,200);
  assert.equal((await api('me','GET',null,r.cookie)).data.user,null);
  assert.equal((await api('login','POST',{ name:'Leaver', password:'leaving-pass-1' })).status,401);
  assert.equal(await stored('save/' + r.data.user.id), null);
  assert.equal((await api('register','POST',{ name:'Leaver', password:'leaving-pass-2' })).status,201);
});
test('profile: emblem avatar, uploaded picture and match stats', async () => {
  const r = await api('register','POST',{ name:'Painter', password:'brush-strokes-1' }); assert.equal(r.status,201,JSON.stringify(r.data)); const id = r.data.user.id;
  assert.deepEqual(r.data.user.stats,{ matches:0, wins:0, kills:0, deaths:0, xp:0 }); assert.equal(r.data.user.level, 1);
  assert.ok(Number.isInteger(r.data.user.avatar.icon) && Number.isInteger(r.data.user.avatar.color));
  assert.equal((await api('profile','PUT',{ avatar:{ icon:99, color:0 } },r.cookie)).data.error,'bad_avatar');
  assert.deepEqual((await api('profile','PUT',{ avatar:{ icon:3, color:5 } },r.cookie)).data.user.avatar,{ icon:3, color:5 });
  const html = 'data:image/png;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');
  assert.equal((await api('avatar','PUT',{ image:html },r.cookie)).data.error,'bad_image');
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4f10000000049454e44ae426082','hex');
  const up = await api('avatar','PUT',{ image:'data:image/png;base64,' + png.toString('base64') },r.cookie);
  assert.equal(up.data.user.avatar.image,'png');
  const picture = await fetch(base + '/api/avatar/' + id);
  assert.equal(picture.headers.get('content-type'),'image/png'); assert.deepEqual(Buffer.from(await picture.arrayBuffer()),png);
  assert.equal((await api('profile','PUT',{ avatar:{ icon:1, color:1 } },r.cookie)).data.user.avatar.image,undefined);
  assert.equal((await fetch(base + '/api/avatar/' + id)).status,404);
  const stats = await api('stats','POST',{ won:true, kills:7, deaths:2 },r.cookie);
  assert.deepEqual(stats.data.user.stats,{ matches:1, wins:1, kills:7, deaths:2, xp:270 }); // 50 + 150 win + 7·10
  assert.equal(stats.data.gained, 270); assert.equal(stats.data.user.level, 1); assert.equal(stats.data.user.into, 270); assert.equal(stats.data.user.need, 500);
  const board = (await api('leaderboard?by=xp','GET',null,r.cookie)).data;
  assert.ok(board.top.some(u => u.id === id && u.stats.xp === 270)); assert.deepEqual(board.top.map(u => u.place), board.top.map((_, i) => i + 1));
  assert.equal(board.me.id, id); assert.equal(board.top.find(u => u.id === id).created, undefined);
  assert.equal((await api('stats','POST',{ won:false, kills:1, deaths:1 },r.cookie)).status,429);
  assert.equal((await api('stats','POST',{ won:true, kills:-1, deaths:0 })).status,401);
  assert.deepEqual((await api('me','GET',null,r.cookie)).data.user.stats,stats.data.user.stats);
});
test('v1 accounts and saves are migrated', { skip: PG && 'file storage only' }, async () => {
  const r = await api('login','POST',{ name:'ветеран', password:'veteran-pass' });
  assert.equal(r.status,200); assert.equal(r.data.user.name,'Ветеран');
  assert.equal((await api('save','GET',null,r.cookie)).data.save.date,1);
  assert.ok((await readdir(path.join(dir,'legacy-v1'))).length === 2);
});
test('repeated wrong passwords lock that name for a while', async () => {
  await api('register','POST',{ name:'Target', password:'target-pass-1' });
  for (let i = 0; i < 10; i++) assert.equal((await api('login','POST',{ name:'Target', password:'guess-' + i + '-xx' })).status,401);
  assert.equal((await api('login','POST',{ name:'Target', password:'target-pass-1' })).data.error,'rate_limited');
});
test('server exposes only game files and refuses cross-origin account changes',async()=>{
  for (const file of ['server.js','accounts.js','package.json','data/test.json','accounts.json','.git/config','%ZZ']) assert.equal((await fetch(base+'/'+file)).status,404);
  for (const file of ['game.js','maps.js','i18n.js']) assert.equal((await fetch(base+'/'+file)).status,200);
  const r = await fetch(base+'/api/register',{method:'POST',headers:{Origin:'http://unrelated.example','content-type':'application/json'},body:'{}'}); assert.equal(r.status,403);
});
async function socket(cookie, target = base) {
  const url = new URL(target), raw = net.connect(Number(url.port),'127.0.0.1');
  let buffer = Buffer.alloc(0), upgraded = false;
  const messages = [], waiters = [];
  const deliver = m => { if (waiters.length) waiters.shift()(m); else messages.push(m); };
  raw.on('data', chunk => {
    buffer = Buffer.concat([buffer,chunk]);
    if (!upgraded) { const end = buffer.indexOf('\r\n\r\n'); if(end<0)return; assert.match(buffer.subarray(0,end).toString(),/101 Switching/);buffer=buffer.subarray(end+4);upgraded=true; }
    while(buffer.length>=2) {
      let n=buffer[1]&127, off=2; if(n===126){if(buffer.length<4)return;n=buffer.readUInt16BE(2);off=4;} if(n===127){if(buffer.length<10)return;n=Number(buffer.readBigUInt64BE(2));off=10;}
      if(buffer.length<off+n)return; const op=buffer[0]&15,payload=buffer.subarray(off,off+n);buffer=buffer.subarray(off+n);if(op===1)deliver(JSON.parse(payload));
    }
  });
  await new Promise(resolve=>raw.once('connect',resolve));
  raw.write(`GET /ws HTTP/1.1\r\nHost: ${url.host}\r\nOrigin: ${target}\r\n${cookie ? 'Cookie: ' + cookie + '\r\n' : ''}Connection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\n\r\n`);
  return { close:()=>raw.destroy(), send(m) { const p=Buffer.from(JSON.stringify(m)), mask=crypto.randomBytes(4);let h;if(p.length<126)h=Buffer.from([129,128|p.length]);else {h=Buffer.alloc(4);h[0]=129;h[1]=254;h.writeUInt16BE(p.length,2);} for(let i=0;i<p.length;i++)p[i]^=mask[i%4];raw.write(Buffer.concat([h,mask,p])); }, next(){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('WebSocket timeout')),3000);const done=m=>{clearTimeout(timer);resolve(m);};if(messages.length)done(messages.shift());else waiters.push(done);});} };
}
// Type a command into the server console and wait for its answer line.
async function consoleCmd(line, expect) {
  let out = '';
  const got = new Promise(resolve => { const on = d => { out += d; if (expect.test(out)) { server.stdout.off('data', on); resolve(out); } }; server.stdout.on('data', on); });
  server.stdin.write(line + '\n');
  return got;
}
test('multiplayer: server lobby, admins from the console, start, relay and late arrivals', async () => {
  const player = await api('register','POST',{ name:'Netplayer', password:'net-pass-123' });
  const alice = await socket(), net = await socket(player.cookie), impostor = await socket(), twin = await socket(), late = [];
  const next = async (s, type) => { for (;;) { const m = await s.next(); if (!type || m.type === type) return m; } };
  const hello = (s, name) => s.send({ type:'relay-hello', proto:'breachline-web/3', name });
  try {
    hello(alice, 'Alice');
    const a = await next(alice, 'joined');
    let lob = (await next(alice, 'lobby')).lobby;
    assert.equal(lob.state, 'lobby'); assert.equal(lob.players[0].leader, true); // no admins yet: the first player leads
    hello(impostor, 'Netplayer'); assert.equal((await next(impostor, 'relay-error')).reason, 'name_reserved');
    hello(twin, 'alice'); assert.equal((await next(twin, 'relay-error')).reason, 'name_in_use');
    hello(net, 'whatever');
    const n = await next(net, 'joined'); assert.equal(n.name, 'Netplayer');
    const ping = await (await fetch(base + '/api/ping')).json(); assert.equal(ping.players, 2); assert.equal(ping.state, 'lobby');
    // admins come from the console; afterwards only they may change settings and start
    await consoleCmd('op Netplayer', /Netplayer теперь администратор/);
    do lob = (await next(alice, 'lobby')).lobby; while (!lob.opsSet);
    assert.equal(lob.players.find(p => p.name === 'Netplayer').op, true);
    alice.send({ type:'start' }); assert.equal((await next(alice, 'notice')).reason, 'not_admin');
    net.send({ type:'settings', settings:{ mode:'tdm', map:'harbor', target:5, diff:'hard' } });
    do lob = (await next(alice, 'lobby')).lobby; while (lob.settings.map !== 'harbor');
    assert.deepEqual(lob.settings, { mode:'tdm', map:'harbor', target:5, diff:'hard' });
    net.send({ type:'start' });
    const role = await next(net, 'role'); assert.equal(role.role, 'host'); assert.deepEqual(role.peers.map(p => p.name), ['Alice']);
    assert.equal((await next(alice, 'role')).role, 'guest');
    alice.send({ type:'input', keys:{ KeyW:true } });
    let relayed; do relayed = await net.next(); while (!relayed.from);
    assert.deepEqual(relayed, { from:a.id, msg:{ type:'input', keys:{ KeyW:true } } });
    net.send({ to:'all', msg:{ type:'state', payload:'x'.repeat(1000) } });
    assert.equal((await next(alice, 'state')).payload.length, 1000);
    // somebody arriving mid-match goes straight in as a guest
    const c = await socket(); late.push(c); hello(c, 'Latecomer');
    assert.equal((await next(c, 'role')).role, 'guest');
    assert.equal((await next(net, 'peer-join')).name, 'Latecomer');
    // the host goes back to the lobby: everyone returns there, still connected
    net.send({ type:'end' });
    await next(alice, 'match-end'); await next(c, 'match-end');
    do lob = (await next(alice, 'lobby')).lobby; while (lob.state !== 'lobby');
    // the admin list is saved in storage; a host who disconnects mid-match ends it for all
    assert.match(await consoleCmd('ops', /Администраторы|Администраторов/), /netplayer/);
    assert.match((await stored('ops')).toString(), /netplayer/);
    net.send({ type:'start' }); await next(alice, 'role');
    net.close(); assert.equal((await next(alice, 'match-end')).reason, 'host_left');
  } finally { for (const s of [alice, net, impostor, twin, ...late]) s.close(); }
});

test('shared accounts: a home server trusts tickets from the account site', async () => {
  const hdir = await mkdtemp(path.join(os.tmpdir(), 'breachline-home-'));
  const hport = await new Promise(resolve => { const s = net.createServer(); s.listen(0,'127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  const home = spawn(process.execPath, ['server.js', String(hport)], { cwd: path.join(__dirname, '..'), env: { ...process.env, BREACHLINE_DATA: hdir, BREACHLINE_AUTH: base, BREACHLINE_NAME: 'Home' }, stdio: ['ignore','pipe','pipe'] });
  const hbase = 'http://127.0.0.1:' + hport, sockets = [];
  try {
    let hout = ''; home.stderr.on('data', d => { hout += d; });
    await new Promise((resolve, reject) => { home.stdout.on('data', d => { hout += d; if (hout.includes('аккаунты: ' + base) && hout.includes('Breachline «Home»')) resolve(); }); home.once('exit', c => reject(Error('home exited ' + c + ': ' + hout))); setTimeout(() => reject(Error('home did not start: ' + hout)), 8000); });
    const ping = await (await fetch(hbase + '/api/ping')).json();
    assert.equal(ping.auth, base); assert.match(ping.id, /^[0-9a-f-]{36}$/);
    // a game page served by the home server signs in on the account site in token mode: no cookie, CORS allowed
    const pre = await fetch(base + '/api/login', { method:'OPTIONS', headers:{ Origin:hbase, 'Access-Control-Request-Method':'POST', 'Access-Control-Request-Headers':'content-type,x-breachline-client' } });
    assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), hbase);
    const hdr = { 'content-type':'application/json', Origin:hbase, 'x-breachline-client':'token' };
    const reg = await fetch(base + '/api/register', { method:'POST', headers:hdr, body:JSON.stringify({ name:'Wanderer', password:'roaming-pass-1' }) });
    assert.equal(reg.status, 201); assert.equal(reg.headers.get('set-cookie'), null);
    const { token } = await reg.json(); assert.match(token, /^[\w-]{43}$/);
    const auth = { ...hdr, Authorization:'Bearer ' + token };
    assert.equal((await (await fetch(base + '/api/me', { headers:auth })).json()).user.name, 'Wanderer');
    const ticket = (await (await fetch(base + '/api/ticket', { method:'POST', headers:auth, body:JSON.stringify({ aud:ping.id }) })).json()).ticket;
    const next = async (s, type) => { for (;;) { const m = await s.next(); if (!type || m.type === type) return m; } };
    const a = await socket(null, hbase), b = await socket(null, hbase), c = await socket(null, hbase); sockets.push(a, b, c);
    a.send({ type:'relay-hello', proto:'breachline-web/3', name:'anything', ticket });
    assert.equal((await next(a, 'joined')).name, 'Wanderer');
    b.send({ type:'relay-hello', proto:'breachline-web/3', name:'wanderer' });
    assert.equal((await next(b, 'relay-error')).reason, 'name_reserved');
    const other = (await (await fetch(base + '/api/ticket', { method:'POST', headers:auth, body:JSON.stringify({ aud:crypto.randomUUID() }) })).json()).ticket;
    c.send({ type:'relay-hello', proto:'breachline-web/3', name:'Plain', ticket:other });
    assert.equal((await next(c, 'joined')).name, 'Plain'); // a ticket for another server is ignored
  } finally { for (const s of sockets) s.close(); home.kill(); await rm(hdir, { recursive:true, force:true }); }
});
