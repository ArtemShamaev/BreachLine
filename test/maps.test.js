'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const MAPS = require('../maps.js');

// Same grid rules as buildGrid in game.js: everything is wall until carved, the border always stays wall.
function grid(def) {
  const W = def.w, H = def.h, type = new Uint8Array(W * H).fill(1), idx = (i, j) => j * W + i;
  for (const [k, x, z, w, h, t] of def.ops) for (let j = z; j < z + h; j++) for (let i = x; i < x + w; i++) {
    if (i <= 0 || j <= 0 || i >= W - 1 || j >= H - 1) continue;
    type[idx(i, j)] = k === 'c' ? 0 : t;
  }
  for (const [x, z, t] of def.objs) { assert.equal(type[idx(x, z)], 0, `${def.name}: object at ${x},${z} is not on floor`); type[idx(x, z)] = t; }
  const walk = (i, j) => i >= 0 && j >= 0 && i < W && j < H && type[idx(i, j)] === 0;
  const cells = r => { const o = []; for (let j = r[1]; j < r[1] + r[3]; j++) for (let i = r[0]; i < r[0] + r[2]; i++) if (walk(i, j)) o.push([i, j]); return o; };
  const dist = ([sx, sz]) => {
    const d = new Int32Array(W * H).fill(-1), q = [[sx, sz]]; d[idx(sx, sz)] = 0;
    for (let n = 0; n < q.length; n++) { const [x, z] = q[n]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (walk(x + dx, z + dz) && d[idx(x + dx, z + dz)] < 0) { d[idx(x + dx, z + dz)] = d[idx(x, z)] + 1; q.push([x + dx, z + dz]); } }
    return d;
  };
  return { W, H, type, idx, cells, dist };
}

for (const [key, def] of Object.entries(MAPS)) {
  test(`map ${key} is playable`, () => {
    assert.ok(def.name && def.blurb && ['desert', 'dusk', 'snow', 'night', 'jungle', 'industrial'].includes(def.theme), 'name, blurb and a known theme');
    const g = grid(def);
    const t = g.cells(def.spawns.T), ct = g.cells(def.spawns.CT), a = g.cells(def.sites.A), b = g.cells(def.sites.B);
    assert.ok(t.length >= 5 && ct.length >= 5, 'room for five players at each spawn');
    assert.ok(a.length >= 12 && b.length >= 12, 'both bomb sites have floor');
    const fromT = g.dist(t[0]), fromCT = g.dist(ct[0]);
    for (let i = 0; i < g.type.length; i++) if (g.type[i] === 0) assert.ok(fromT[i] >= 0, `${key}: floor cell ${i % g.W},${Math.floor(i / g.W)} cannot be reached`);
    // defenders must be able to reach each site before the attackers
    for (const site of [a, b]) {
      const near = d => Math.min(...site.map(c => d[g.idx(...c)]));
      assert.ok(near(fromCT) < near(fromT), `${key}: CT should reach every site first`);
    }
    for (const [x, z] of def.lamps || []) assert.ok(x >= 0 && z >= 0 && x < g.W && z < g.H, 'lamp inside the map');
  });
}
