import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function load() {
  const storage = new Map();
  const elements = new Map();
  const element = () => ({ getContext: () => ({ setTransform() {} }), addEventListener() {}, setPointerCapture() {}, replaceChildren() {} });
  const sandbox = vm.createContext({
    document: { getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); }, createElement: element, addEventListener() {} },
    window: { addEventListener() {} }, innerWidth: 400, innerHeight: 800,
    performance: { now: () => 0 }, requestAnimationFrame() {}, setTimeout() {},
    savedLevel: (_, fallback) => fallback, setupProgress() {}, saveLevel() {}, cheer() {},
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, String(value)) },
  });
  vm.runInContext(readFileSync(new URL('../songs.js', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('../game.js', import.meta.url), 'utf8') + '\nresumeAudio = () => {};', sandbox);
  return code => vm.runInContext(code, sandbox);
}

test('all songs have valid notes and hazards never overlap notes, with increasing difficulty', () => {
  const run = load();
  assert.equal(run('SONGS.length'), 14);
  assert.equal(run('new Set(SONGS.map(s => s.name)).size'), 14);
  assert.ok(run('SONGS.every(s => s.notes.split(" ").every(n => /^[A-G]#?[4-6](:[1-3])?$/.test(n)))'));
  assert.ok(run(`SONGS.every(song => {
    const tiles = buildTiles(song);
    const counts = LEVELS.map(l => {
      level = l;
      const hazards = buildHazards(tiles);
      if (!hazards.length || hazards.some(h => tiles.some(t => t.col === h.col && h.start < t.start + t.rows && t.start < h.start + h.rows))) throw Error('overlapping hazard');
      return hazards.length;
    });
    return counts[0] < counts[1] && counts[1] < counts[2];
  })`));
});

test('tapping a hazard ends immediately without points or unlocks, including during a hold', () => {
  const run = load();
  run(`game = { tiles: [{col: 0, start: 0, rows: 2, holding: true, stop() { game.stopped = true; }}], hazards: [{col: 1, start: 0, rows: 1}], scroll: 2, hits: 0, errors: 0, over: false };
    onTap({ preventDefault() {}, pointerId: 1, clientX: 150, clientY: 300 });`);
  assert.ok(run('game.over && !game.won && game.hitHazard && game.stopped'));
  assert.equal(run('game.hits'), 0);
  assert.equal(run('readStars(SONGS[0])'), 0);
  assert.ok(run('result.textContent.includes("vermelha")'));
});

test('ignoring hazards costs no lives and completing notes unlocks the next song', () => {
  const run = load();
  run(`game = { tiles: [{col: 0, start: 20, rows: 1, hit: false}], hazards: [{col: 1, start: 0, rows: 1}], scroll: 6, speed: 2, hits: 0, errors: 0, over: false };
    update(0.05);`);
  assert.equal(run('game.errors'), 0);
  assert.equal(run('game.over'), false);
  run('game.tiles[0].hit = true; game.hits = 1; checkEnd();');
  assert.ok(run('game.won && game.stars === 3'));
  assert.equal(run('song.name'), 'Parabéns pra Você');
  assert.equal(run('readStars(SONGS[0])'), 3);
});
