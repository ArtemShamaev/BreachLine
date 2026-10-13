'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SK = require('../skins.js');

// The weapon keys game.js knows (its W table); every finish must belong to one of them.
const WEAPONS = ['knife', 'p9', 'hc50', 'mpx', 'kr47', 'm5', 'lb338', 'viper', 'wasp', 'sg12', 'hmg', 'rocket', 'dmr'];
const KINDS = ['solid', 'camo', 'digital', 'tiger', 'fade', 'waves', 'hex', 'carbon', 'marble', 'circuit', 'scales', 'splatter', 'stripes', 'fire', 'damascus', 'web', 'shark'];

test('every finish is complete and belongs to a case', () => {
  for (const [k, s] of Object.entries(SK.SKINS)) {
    assert.ok(k.startsWith(s.w + ':'), `${k}: key names its weapon`);
    assert.ok(WEAPONS.includes(s.w) && SK.RARITY[s.r] && SK.CASES[s.c] && s.name, `${k}: weapon, rarity, case, name`);
    assert.ok(KINDS.includes(s.p.k) && s.p.c.length && s.p.c.every(c => /^#[0-9a-f]{6}$/.test(c)), `${k}: pattern`);
    assert.equal(s.w === 'knife', s.r === 'gold', `${k}: knives and only knives are the rare special items`);
  }
  for (const [c, cs] of Object.entries(SK.CASES)) for (const r of SK.ORDER) assert.ok(cs.skins.some(k => SK.SKINS[k].r === r), `${c} has a ${r} item`);
});

test('case odds follow the rarity weights', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const n = {}, N = 200000;
  for (let i = 0; i < N; i++) { const it = SK.openCase('nightops', rnd); assert.ok(SK.validItem(it)); n[SK.SKINS[it.s].r] = (n[SK.SKINS[it.s].r] || 0) + 1; }
  for (const r of SK.ORDER) assert.ok(Math.abs(n[r] / N - SK.RARITY[r].weight / 10000) < .004, `${r}: ${n[r] / N}`);
});

test('items: wear names, values and validation', () => {
  assert.equal(SK.wearOf(.01)[1], 'Factory New'); assert.equal(SK.wearOf(.2)[2], 'FT'); assert.equal(SK.wearOf(.99)[1], 'Battle-Scarred');
  const fresh = { id: 'a', s: 'knife:fade', f: .01, seed: 3, kc: null }, scarred = { ...fresh, f: .9 };
  assert.ok(SK.value(fresh) > SK.value(scarred) && SK.value(scarred) > SK.value({ ...fresh, s: 'p9:gunmetal' }));
  assert.ok(!SK.validItem({ ...fresh, seed: 1000 }) && !SK.validItem({ ...fresh, kc: -1 }) && !SK.validItem({ ...fresh, s: 'nope' }));
  assert.equal(SK.rollFor('lb338').s.split(':')[0], 'lb338');
});

test('the regulars are distinct people with known favourites', () => {
  const names = SK.REGULARS.map(r => r.name);
  assert.equal(new Set(names).size, names.length);
  assert.ok(SK.REGULARS.length >= 10, 'enough for two full bot teams');
  for (const r of SK.REGULARS) {
    assert.ok(WEAPONS.includes(r.fav) && r.fav !== 'knife' && r.skill >= -1 && r.skill <= 1, r.name);
    assert.ok(['entry', 'lurker', 'awper', 'support', 'anchor', 'rifler'].includes(r.style), r.name);
    for (const kind of Object.keys(SK.CHAT)) assert.ok(Array.isArray(SK.CHAT[kind][r.talk]), `${r.name}: ${kind} lines`);
  }
});
