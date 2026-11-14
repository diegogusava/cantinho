export const DIRECTIONS = {
  up: { x: 0, z: -1 }, down: { x: 0, z: 1 },
  left: { x: -1, z: 0 }, right: { x: 1, z: 0 },
};
const steps = Object.values(DIRECTIONS);
const key = (p) => `${p.x},${p.z}`;
export const sameCell = (a, b) => a.x === b.x && a.z === b.z;
export const isOpen = (maze, p) => maze.grid[p.z]?.[p.x] === 0;

export function findPath(maze, start, end) {
  const queue = [start];
  const previous = new Map([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (sameCell(cell, end)) {
      const path = [];
      for (let p = cell; p; p = previous.get(key(p))) path.push(p);
      return path.reverse();
    }
    for (const step of steps) {
      const next = { x: cell.x + step.x, z: cell.z + step.z };
      if (!isOpen(maze, next) || previous.has(key(next))) continue;
      previous.set(key(next), cell);
      queue.push(next);
    }
  }
  return [];
}

export function generateMaze(level, random = Math.random) {
  const size = 11 + 2 * Math.min(2, Math.floor((level - 1) / 3));
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const start = { x: 1, z: size - 2 };
  const exit = { x: size - 2, z: 1 };
  const stack = [start];
  grid[start.z][start.x] = 0;
  while (stack.length) {
    const cell = stack.at(-1);
    const options = steps.map((d) => ({ x: cell.x + d.x * 2, z: cell.z + d.z * 2 }))
      .filter((p) => p.x > 0 && p.z > 0 && p.x < size - 1 && p.z < size - 1 && grid[p.z][p.x]);
    if (!options.length) { stack.pop(); continue; }
    const next = options[Math.floor(random() * options.length)];
    grid[(cell.z + next.z) / 2][(cell.x + next.x) / 2] = 0;
    grid[next.z][next.x] = 0;
    stack.push(next);
  }
  // Extra passages let the princess circle back instead of only meeting dead ends.
  for (let z = 1; z < size - 1; z++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[z][x] && (x % 2 !== z % 2) && random() < 0.18) grid[z][x] = 0;
    }
  }
  const maze = { size, grid, start, exit, spawn: null };
  const escapeRoute = new Set(findPath(maze, start, exit).map(key));
  let best = -Infinity;
  for (let z = 1; z < size - 1; z++) {
    for (let x = 1; x < size - 1; x++) {
      const p = { x, z };
      if (!isOpen(maze, p) || escapeRoute.has(key(p))) continue;
      const fromStart = findPath(maze, start, p).length - 1;
      if (fromStart < 7 || fromStart > 12) continue;
      const fromExit = findPath(maze, exit, p).length - 1;
      const score = fromExit - Math.abs(fromStart - 9);
      if (score > best) { best = score; maze.spawn = p; }
    }
  }
  if (!maze.spawn) {
    // A sleeping alcove keeps even a maze with one long corridor escapable.
    maze.spawn = { x: 0, z: start.z };
    grid[start.z][0] = 0;
  }
  return maze;
}

function actor(cell) {
  return { x: cell.x, z: cell.z, cell: { ...cell }, target: null, heading: null };
}

export function createRound(maze, level) {
  return {
    maze, level, status: 'playing', elapsed: 0,
    princess: actor(maze.start), monster: actor(maze.spawn),
    princessSpeed: 4, monsterSpeed: Math.min(2.5, 1.65 + (level - 1) * 0.1),
    headStart: 3,
  };
}

function moveActor(item, maze, distance, choose) {
  while (distance > 0) {
    if (!item.target) {
      const next = choose(item);
      if (!next || !isOpen(maze, next)) return;
      item.heading = { x: next.x - item.cell.x, z: next.z - item.cell.z };
      item.target = next;
    }
    const gap = Math.hypot(item.target.x - item.x, item.target.z - item.z);
    if (distance < gap) {
      item.x += (item.target.x - item.x) / gap * distance;
      item.z += (item.target.z - item.z) / gap * distance;
      return;
    }
    item.x = item.target.x;
    item.z = item.target.z;
    item.cell = item.target;
    item.target = null;
    distance -= gap;
  }
}

export function stepRound(round, seconds, direction) {
  if (round.status !== 'playing') return;
  // Small simulation steps also detect actors passing each other in a corridor.
  for (let remaining = Math.min(seconds, 0.1); remaining > 0; ) {
    const dt = Math.min(remaining, 1 / 120);
    remaining -= dt;
    round.elapsed += dt;
    moveActor(round.princess, round.maze, round.princessSpeed * dt, (item) => {
      const d = DIRECTIONS[direction];
      if (!d) return null;
      const next = { x: item.cell.x + d.x, z: item.cell.z + d.z };
      if (isOpen(round.maze, next)) return next;
      if (!item.heading) return null;
      return { x: item.cell.x + item.heading.x, z: item.cell.z + item.heading.z };
    });
    if (round.elapsed > round.headStart) {
      moveActor(round.monster, round.maze, round.monsterSpeed * dt, (item) =>
        findPath(round.maze, item.cell, round.princess.target || round.princess.cell)[1]);
    }
    if (Math.hypot(round.princess.x - round.monster.x, round.princess.z - round.monster.z) < 0.55) {
      round.status = 'caught';
      return;
    }
    if (sameCell(round.princess.cell, round.maze.exit)) {
      round.status = 'won';
      return;
    }
  }
}
