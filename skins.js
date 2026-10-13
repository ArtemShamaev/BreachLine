/* Breachline cosmetics: weapon finishes, the cases they drop from, and the regulars who play as bots.
 * Loaded before game.js (and by the Node tests). Finishes only change how a gun looks.
 *
 * A finish:  'weapon:slug': { w, name, r: rarity, c: case, p: { k: pattern kind, c: colours, glow?, spec? } }
 * An item (one copy someone owns): { id, s: finish key, f: wear 0–1, seed: pattern offset 0–999, kc: kill counter or null }
 * Two copies of one finish never look the same: the seed shifts the pattern and the wear scratches it.
 */
const BREACHLINE_SKINS = (() => {
  // Odds per case opening, out of 10000 (the familiar 80 / 16 / 3.2 / 0.64 / 0.26 split).
  const RARITY = {
    mil: { name: 'Mil-Spec', color: '#4b69ff', weight: 7992, value: 30 },
    res: { name: 'Restricted', color: '#8847ff', weight: 1598, value: 110 },
    cla: { name: 'Classified', color: '#d32ce6', weight: 320, value: 420 },
    cov: { name: 'Covert', color: '#eb4b4b', weight: 64, value: 1500 },
    gold: { name: 'Exceedingly Rare', color: '#e4ae39', weight: 26, value: 4000 },
  };
  const ORDER = ['mil', 'res', 'cla', 'cov', 'gold'];
  const WEAR = [[.07, 'Factory New', 'FN'], [.15, 'Minimal Wear', 'MW'], [.38, 'Field-Tested', 'FT'], [.45, 'Well-Worn', 'WW'], [1, 'Battle-Scarred', 'BS']];

  const S = (w, name, r, k, c, extra = {}) => ({ w, name, r, p: { k, c, ...extra } });
  const section = (c, list) => Object.fromEntries(Object.entries(list).map(([k, v]) => [k, { ...v, c }]));
  const SKINS = {
    ...section('sandline', {
    'p9:sandstorm': S('p9', 'Sandstorm', 'mil', 'camo', ['#c8a46a', '#9c7a48', '#6e5434']),
    'mpx:dune': S('mpx', 'Dune Runner', 'mil', 'digital', ['#b89868', '#8a7048', '#d8c08c']),
    'sg12:rust': S('sg12', 'Rust Bucket', 'mil', 'splatter', ['#6a5a4a', '#9a4a22', '#c0682c']),
    'viper:scorched': S('viper', 'Scorched', 'mil', 'carbon', ['#2a2420', '#5a3418']),
    'wasp:desertrat': S('wasp', 'Desert Rat', 'mil', 'camo', ['#a89068', '#76603e', '#c8b08a']),
    'hc50:sunbaked': S('hc50', 'Sun Baked', 'res', 'fade', ['#ffcc40', '#ff7a1a', '#c0301a'], { spec: 1.2 }),
    'dmr:mirage': S('dmr', 'Mirage', 'res', 'waves', ['#e8d4a8', '#c89a5c', '#7a5a3a']),
    'kr47:copperhead': S('kr47', 'Copperhead', 'res', 'tiger', ['#c87a3a', '#3a2214'], { spec: 1 }),
    'm5:pharaoh': S('m5', 'Pharaoh', 'cla', 'hex', ['#1c3a6a', '#e4b440', '#0c1830'], { spec: 1.2 }),
    'lb338:sidewinder': S('lb338', 'Sidewinder', 'cla', 'scales', ['#5aa83a', '#1e3a14', '#d8e050']),
    'kr47:inferno': S('kr47', 'Inferno', 'cov', 'fire', ['#ffde5a', '#ff6a14', '#5a0a04'], { glow: 1.6 }),
    'lb338:wyrmscale': S('lb338', 'Wyrmscale', 'cov', 'scales', ['#e8c060', '#8a3a1a', '#3a6a3a'], { spec: 1.4, glow: .4 }),
    'knife:fade': S('knife', 'Fade', 'gold', 'fade', ['#ffd23a', '#ff3aa8', '#5a3aff'], { spec: 1.8 }),
    'knife:damascus': S('knife', 'Damascus Steel', 'gold', 'damascus', ['#c8ccd2', '#5a5e66'], { spec: 2 }),
    }),
    ...section('nightops', {
    'p9:gunmetal': S('p9', 'Gunmetal', 'mil', 'solid', ['#4a5058'], { spec: 1.4 }),
    'mpx:midnight': S('mpx', 'Midnight', 'mil', 'digital', ['#1a2236', '#2c3a5a', '#0c1220']),
    'hmg:urbangrid': S('hmg', 'Urban Grid', 'mil', 'digital', ['#6a6e72', '#3e4246', '#9a9ea2']),
    'sg12:nightcamo': S('sg12', 'Night Camo', 'mil', 'camo', ['#22262c', '#3a4048', '#14161a']),
    'wasp:static': S('wasp', 'Static', 'mil', 'carbon', ['#18191c', '#3a3d44']),
    'viper:neon': S('viper', 'Neon Viper', 'res', 'circuit', ['#0a1a10', '#38ff7a'], { glow: 2 }),
    'm5:cobalt': S('m5', 'Cobalt Strike', 'res', 'hex', ['#1a4ab8', '#0a1a48', '#6aa0ff'], { spec: 1 }),
    'lb338:pitviper': S('lb338', 'Pit Viper', 'res', 'scales', ['#3a3a30', '#8a8a5a', '#141410']),
    'dmr:blackice': S('dmr', 'Black Ice', 'res', 'marble', ['#0e1218', '#8ab8e8', '#2a3a50'], { spec: 1.4 }),
    'kr47:redline': S('kr47', 'Redline', 'cla', 'stripes', ['#16171a', '#d8202a'], { spec: .8 }),
    'hc50:blaze': S('hc50', 'Blaze', 'cla', 'fire', ['#fff08a', '#ff8a1a', '#2a0a04'], { glow: 1.2 }),
    'm5:neonrider': S('m5', 'Neon Rider', 'cov', 'circuit', ['#140a24', '#ff3ad8'], { glow: 2.4 }),
    'lb338:polar': S('lb338', 'Polar Signal', 'cov', 'stripes', ['#eeeef0', '#ff6a1a', '#18181c'], { spec: 1 }),
    'knife:tigertooth': S('knife', 'Tiger Tooth', 'gold', 'tiger', ['#ffc23a', '#7a3a08'], { spec: 2 }),
    'knife:ultraviolet': S('knife', 'Ultraviolet', 'gold', 'solid', ['#4a2a7a'], { spec: 1.2 }),
    }),
    ...section('arsenal', {
    'rocket:olive': S('rocket', 'Olive Drab', 'mil', 'solid', ['#4a5a30'], { spec: .4 }),
    'hmg:jungle': S('hmg', 'Jungle', 'mil', 'camo', ['#3a5a2a', '#5a7a3a', '#1e2e14']),
    'viper:plum': S('viper', 'Plum', 'mil', 'fade', ['#5a2a5a', '#2a142a', '#8a4a7a']),
    'p9:oceandrift': S('p9', 'Ocean Drift', 'mil', 'waves', ['#2a6a8a', '#1a3a5a', '#7ac0d8']),
    'lb338:safari': S('lb338', 'Safari Mesh', 'mil', 'web', ['#8a8a6a', '#4a4a36']),
    'wasp:hazard': S('wasp', 'Hazard', 'res', 'stripes', ['#ffcc1a', '#141414'], { diag: true }),
    'mpx:toxic': S('mpx', 'Toxic', 'res', 'splatter', ['#1a1e14', '#7aff2a', '#3a8a14'], { glow: 1.4 }),
    'kr47:jade': S('kr47', 'Jade', 'res', 'marble', ['#1e6a4a', '#a8e8c8', '#0a2a1a'], { spec: 1.2 }),
    'dmr:carbonelite': S('dmr', 'Carbon Elite', 'cla', 'carbon', ['#121214', '#c8202a'], { spec: 1.4 }),
    'rocket:sharkbite': S('rocket', 'Shark Bite', 'cla', 'shark', ['#5a6a7a', '#e8e8e8', '#c8202a']),
    'hmg:molten': S('hmg', 'Molten Core', 'cov', 'fire', ['#ffe07a', '#ff3a0a', '#1a0604'], { glow: 2 }),
    'kr47:royal': S('kr47', 'Royal Gold', 'cov', 'damascus', ['#ffd86a', '#8a5a14'], { spec: 2 }),
    'knife:marblefade': S('knife', 'Marble Fade', 'gold', 'marble', ['#ff2a2a', '#ffe23a', '#2a6aff'], { spec: 1.8 }),
    'knife:crimsonweb': S('knife', 'Crimson Web', 'gold', 'web', ['#8a0a0a', '#120404'], { spec: 1 }),
    }),
  };
  const CASES = {
    sandline: { name: 'Sandline Case', color: '#d9a75a', price: 300 },
    nightops: { name: 'Night Ops Case', color: '#5a7aff', price: 300 },
    arsenal: { name: 'Arsenal Case', color: '#7ac04a', price: 300 },
  };
  for (const c of Object.keys(CASES)) CASES[c].skins = Object.keys(SKINS).filter(k => SKINS[k].c === c);

  function wearOf(f) { return WEAR.find(w => f < w[0]) || WEAR[WEAR.length - 1]; }
  function pickRarity(keys, rnd) {
    const tiers = ORDER.filter(r => keys.some(k => SKINS[k].r === r));
    const total = tiers.reduce((a, r) => a + RARITY[r].weight, 0);
    let x = rnd() * total;
    for (const r of tiers) { x -= RARITY[r].weight; if (x < 0) return r; }
    return tiers[0];
  }
  function newId(rnd) { return Math.floor(rnd() * 36 ** 8).toString(36).padStart(8, '0') + Date.now().toString(36).slice(-4); }
  function makeItem(s, rnd = Math.random) {
    return { id: newId(rnd), s, f: Math.round(rnd() * 1e4) / 1e4, seed: Math.floor(rnd() * 1000), kc: SKINS[s].w !== 'knife' && rnd() < .1 ? 0 : null };
  }
  // Open a case: rarity by the odds above, then any finish of that rarity in the case.
  function openCase(c, rnd = Math.random) {
    const keys = CASES[c].skins, r = pickRarity(keys, rnd), pool = keys.filter(k => SKINS[k].r === r);
    return makeItem(pool[Math.floor(rnd() * pool.length)], rnd);
  }
  // A finish for one weapon from any case, with the usual odds (bots buy a skin for their favourite gun).
  function rollFor(w, rnd = Math.random) {
    const keys = Object.keys(SKINS).filter(k => SKINS[k].w === w);
    if (!keys.length) return null;
    const r = pickRarity(keys, rnd), pool = keys.filter(k => SKINS[k].r === r);
    return makeItem(pool[Math.floor(rnd() * pool.length)], rnd);
  }
  function value(item) {
    const s = SKINS[item.s]; if (!s) return 0;
    return Math.round(RARITY[s.r].value * (1.5 - item.f) * (item.kc != null ? 1.4 : 1));
  }
  function validItem(i) {
    return !!i && typeof i.id === 'string' && i.id.length <= 24 && !!SKINS[i.s] && Number.isFinite(i.f) && i.f >= 0 && i.f <= 1 &&
      Number.isInteger(i.seed) && i.seed >= 0 && i.seed < 1000 && (i.kc === null || (Number.isInteger(i.kc) && i.kc >= 0));
  }

  /* The regulars: the bots are people with habits. Each has a favourite gun, a way of playing and a way of talking,
   * and keeps an inventory between matches (opened cases, equipped finishes) in the browser.
   *   style  entry (goes in first) · lurker (plays alone) · awper (wants the Longbow) · support (throws utility) · anchor (holds a site) · rifler
   *   skill  -1 … 1: aim and reaction compared with the chosen difficulty
   *   talk   cocky · friendly · quiet · meme · tryhard
   */
  const REGULARS = [
    { name: 'Vortex', fav: 'lb338', style: 'awper', skill: .55, talk: 'cocky' },
    { name: 'Kilo', fav: 'kr47', style: 'entry', skill: .3, talk: 'tryhard' },
    { name: 'Saber', fav: 'm5', style: 'rifler', skill: .2, talk: 'friendly' },
    { name: 'Jinx', fav: 'mpx', style: 'entry', skill: -.1, talk: 'meme' },
    { name: 'Moth', fav: 'dmr', style: 'lurker', skill: .15, talk: 'quiet' },
    { name: 'Rook', fav: 'hmg', style: 'anchor', skill: -.3, talk: 'meme' },
    { name: 'Halberd', fav: 'm5', style: 'anchor', skill: .35, talk: 'quiet' },
    { name: 'Nova', fav: 'lb338', style: 'awper', skill: .4, talk: 'friendly' },
    { name: 'Ridge', fav: 'sg12', style: 'entry', skill: -.2, talk: 'cocky' },
    { name: 'Specter', fav: 'kr47', style: 'lurker', skill: .45, talk: 'quiet' },
    { name: 'Wren', fav: 'wasp', style: 'support', skill: 0, talk: 'friendly' },
    { name: 'Cobalt', fav: 'm5', style: 'support', skill: .1, talk: 'tryhard' },
    { name: 'Шмель', fav: 'mpx', style: 'entry', skill: .05, talk: 'meme' },
    { name: 'Dimon2007', fav: 'lb338', style: 'awper', skill: -.35, talk: 'cocky' },
    { name: 'Sable', fav: 'hc50', style: 'lurker', skill: .25, talk: 'quiet' },
    { name: 'Tundra', fav: 'rocket', style: 'support', skill: -.15, talk: 'meme' },
    { name: 'Lynx', fav: 'kr47', style: 'rifler', skill: .6, talk: 'tryhard' },
    { name: 'Борщ', fav: 'sg12', style: 'anchor', skill: -.4, talk: 'friendly' },
    { name: 'Echo', fav: 'dmr', style: 'rifler', skill: .3, talk: 'friendly' },
    { name: 'Grim', fav: 'viper', style: 'entry', skill: .1, talk: 'cocky' },
  ];

  // Chat lines, by temper and moment. Real lobbies talk in a mix of both languages.
  const CHAT = {
    hello: { cocky: ['ez game incoming', 'кто тут на лонгбоу? я.', 'не мешайте мне'], friendly: ['всем привет', 'glhf!', 'hi all, gl'], quiet: ['hi'], meme: ['ку', 'опять эта карта', 'ля какой лобби'], tryhard: ['comms пожалуйста', 'играем от экономики', 'gl'] },
    kill: { cocky: ['ez', 'изи', 'sit', 'nt?', 'слишком просто'], friendly: ['nice', 'got one', 'минус один'], quiet: ['1'], meme: ['бум', 'хе-хе', 'поймал'], tryhard: ['one down', 'один лоу', 'минус, он был лоу'] },
    death: { cocky: ['лаг', 'читер?', 'ну и рандом', 'dumb'], friendly: ['nt me', 'ух, близко', 'he is low'], quiet: [], meme: ['ой', 'я в шоке', 'мой мышь'], tryhard: ['он лоу, 20 хп', 'сорри', 'двое на А'] },
    win: { cocky: ['изи раунд', 'too easy'], friendly: ['nice one!', 'гуд', 'wp'], quiet: [], meme: ['мы гении', 'как мы это сделали'], tryhard: ['так держим', 'gj, экономим след'] },
    lose: { cocky: ['ну вы чё', 'team?', 'кто-то вообще стреляет?'], friendly: ['nt', 'всё ок, next', 'ничего'], quiet: [], meme: ['F', 'это фиаско'], tryhard: ['фулл эко', 'сейвим', 'надо было ротейтнуться'] },
    gg: { cocky: ['gg ez', 'gg'], friendly: ['gg wp', 'gg all!', 'gg, спасибо за игру'], quiet: ['gg'], meme: ['gg', 'гг вп'], tryhard: ['gg', 'gg, хороший матч'] },
    drop: { cocky: ['наконец-то', 'ну хоть что-то'], friendly: ['ого, смотрите!', 'yay'], quiet: [], meme: ['ДРОП', 'мама, я богат'], tryhard: ['норм'] },
  };

  const api = { RARITY, ORDER, WEAR, SKINS, CASES, REGULARS, CHAT, wearOf, openCase, rollFor, makeItem, value, validItem };
  return api;
})();
if (typeof module !== 'undefined') module.exports = BREACHLINE_SKINS;
