import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMaze, createRound, stepRound, findPath, isOpen } from '../labirinto-maze.js';

function random(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
function directionTo(a, b) {
  if (!b) return undefined;
  return b.x > a.x ? 'right' : b.x < a.x ? 'left' : b.z > a.z ? 'down' : 'up';
}
function tick(round, seconds, direction) {
  for (let i = 0; i < Math.round(seconds * 120); i++) stepRound(round, 1 / 120, direction);
}

test('every generated corridor connects to the princess, monster, and castle', () => {
  for (let seed = 1; seed <= 120; seed++) {
    const maze = generateMaze(seed % 12 + 1, random(seed));
    const reached = new Set();
    const queue = [maze.start];
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i], id = `${p.x},${p.z}`;
      if (reached.has(id)) continue;
      reached.add(id);
      for (const d of [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}]) {
        const next = {x:p.x+d.x,z:p.z+d.z};
        if (isOpen(maze,next) && !reached.has(`${next.x},${next.z}`)) queue.push(next);
      }
    }
    const open = maze.grid.flat().filter((cell) => cell === 0).length;
    assert.equal(reached.size, open, `disconnected maze: ${seed}`);
    assert.ok(reached.has(`${maze.spawn.x},${maze.spawn.z}`));
    assert.ok(reached.has(`${maze.exit.x},${maze.exit.z}`));
    assert.ok(maze.size <= 15);
  }
});

test('walls block movement and releasing input stops at the next cell center', () => {
  const maze = { grid: [[1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1]], start:{x:1,z:1}, spawn:{x:3,z:1}, exit:{x:3,z:1} };
  const round = createRound(maze,1);
  round.headStart = 100;
  tick(round,0.25,'up');
  assert.equal(round.princess.z,1);
  assert.equal(round.princess.x,1);
  tick(round,0.1,'right');
  assert.ok(round.princess.x > 1 && round.princess.x < 2);
  tick(round,0.3);
  assert.equal(round.princess.x,2);
  assert.equal(round.status,'playing');
});

test('monster waits for the head start, then catches an idle princess through corridors', () => {
  const round = createRound(generateMaze(1,random(42)),1);
  const spawn = {x:round.monster.x,z:round.monster.z};
  tick(round,2.9);
  assert.equal(round.monster.x,spawn.x);
  assert.equal(round.monster.z,spawn.z);
  for(let i=0;i<12000 && round.status==='playing';i++) stepRound(round,1/120);
  assert.equal(round.status,'caught');
  const position = {...round.princess};
  tick(round,1,'right');
  assert.deepEqual(round.princess,position);
});

test('the escape route is playable at every difficulty and winning freezes the chase', () => {
  for(let seed=1;seed<=240;seed++) {
    const level=seed%15+1, maze=generateMaze(level,random(seed)),round=createRound(maze,level);
    for(let i=0;i<20000 && round.status==='playing';i++) {
      const from=round.princess.target || round.princess.cell;
      stepRound(round,1/120,directionTo(from,findPath(maze,from,maze.exit)[1]));
    }
    assert.equal(round.status,'won',`unfair spawn or broken escape: ${seed}`);
    const elapsed=round.elapsed;
    tick(round,1,'down');
    assert.equal(round.elapsed,elapsed);
    assert.ok(round.monsterSpeed < round.princessSpeed);
  }
});

test('retry resets actors and the head start on the same maze', () => {
  const maze=generateMaze(4,random(99));
  const round=createRound(maze,4);
  for(let i=0;i<12000 && round.status==='playing';i++) stepRound(round,1/120);
  assert.equal(round.status,'caught');
  const retry=createRound(maze,4);
  assert.equal(retry.maze,maze);
  assert.equal(retry.status,'playing');
  assert.equal(retry.elapsed,0);
  assert.deepEqual(retry.princess.cell,maze.start);
  assert.deepEqual(retry.monster.cell,maze.spawn);
});
