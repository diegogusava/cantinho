import * as THREE from 'three';
import { generateMaze, createRound, stepRound, isOpen } from './labirinto-maze.js';

const canvas = document.getElementById('game');
const view = document.getElementById('view');
const overlay = document.getElementById('overlay');
const title = document.getElementById('message-title');
const message = document.getElementById('message-text');
const action = document.getElementById('action');
const pauseButton = document.getElementById('pause');
const hint = document.getElementById('hint');
const levelLabel = document.getElementById('level');
const buttons = [...document.querySelectorAll('[data-direction]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(CantinhoTheme.colors.background);
window.addEventListener('themechange', () => renderer.setClearColor(CantinhoTheme.colors.background));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
camera.position.set(0, 24, 13);
camera.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight(0xfff7e8, 0x769264, 2.5));
const sun = new THREE.DirectionalLight(0xfff6e8, 3);
sun.position.set(-6, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 });
sun.shadow.normalBias = 0.04;
sun.shadow.bias = -0.0004;
scene.add(sun);
const mat = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
const materials = {
  grass: mat(0x75ae70), hedge: mat(0x42885c), leaves: mat(0x67a963),
  path: mat(0xffe5ba), edge: mat(0xd18c9c), skin: mat(0xf5bd91),
  hair: mat(0x623d36), dress: mat(0xea709d), sleeve: mat(0xffb8d3),
  gold: mat(0xffd357), ink: mat(0x302840), white: mat(0xfffcf3),
  purple: mat(0x9272c5), belly: mat(0xd2b7ee), castle: mat(0xffefd8),
  roof: mat(0xb55d91), door: mat(0x624273), blush: mat(0xf2a1b5),
};

function part(parent, geometry, material, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}
const sphere = (r) => new THREE.SphereGeometry(r, 16, 12);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h) => new THREE.ConeGeometry(r, h, 12);

function makePrincess() {
  const group = new THREE.Group();
  part(group, new THREE.CylinderGeometry(0.13, 0.3, 0.43, 20), materials.dress, 0, 0.3);
  part(group, sphere(0.23), materials.hair, 0, 0.81, -0.02);
  part(group, sphere(0.205), materials.skin, 0, 0.82, 0.06);
  part(group, sphere(0.13), materials.hair, 0.12, 0.97, -0.02);
  for (const side of [-1, 1]) {
    part(group, sphere(0.1), materials.sleeve, side * 0.2, 0.51);
    part(group, sphere(0.07), materials.skin, side * 0.25, 0.39, 0.05);
    part(group, sphere(0.028), materials.ink, side * 0.07, 0.85, 0.25);
    part(group, sphere(0.037), materials.blush, side * 0.13, 0.77, 0.22);
    part(group, sphere(0.08), materials.gold, side * 0.11, 0.065, 0.09);
  }
  part(group, new THREE.CylinderGeometry(0.15, 0.13, 0.1, 12), materials.gold, 0, 1.06);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    part(group, cone(0.055, 0.16), materials.gold, Math.sin(a) * 0.13, 1.16, Math.cos(a) * 0.13);
  }
  part(group, sphere(0.035), materials.roof, 0, 1.07, 0.14);
  return group;
}

function makeMonster() {
  const group = new THREE.Group();
  const body = part(group, sphere(0.33), materials.purple, 0, 0.4);
  body.scale.y = 1.14;
  const tummy = part(group, sphere(0.23), materials.belly, 0, 0.34, 0.17);
  tummy.scale.set(1, 1, 0.65);
  for (const side of [-1, 1]) {
    part(group, cone(0.08, 0.22), materials.gold, side * 0.2, 0.78);
    part(group, sphere(0.115), materials.white, side * 0.13, 0.59, 0.27);
    part(group, sphere(0.05), materials.ink, side * 0.13, 0.59, 0.365);
    part(group, sphere(0.12), materials.purple, side * 0.3, 0.31, 0.01);
    part(group, sphere(0.12), materials.purple, side * 0.18, 0.08, 0.1);
  }
  part(group, new THREE.TorusGeometry(0.1, 0.023, 8, 16, Math.PI), materials.ink, 0, 0.41, 0.315).rotation.z = Math.PI;
  return group;
}

function makeCastle() {
  const group = new THREE.Group();
  part(group, box(0.65, 0.65, 0.5), materials.castle, 0, 0.35);
  part(group, box(0.23, 0.36, 0.02), materials.door, 0, 0.22, 0.26);
  part(group, sphere(0.115), materials.door, 0, 0.4, 0.255).scale.z = 0.15;
  for (const side of [-1, 1]) {
    part(group, new THREE.CylinderGeometry(0.18, 0.18, 0.9, 16), materials.castle, side * 0.35, 0.45);
    part(group, cone(0.26, 0.4), materials.roof, side * 0.35, 1.1);
    part(group, box(0.09, 0.17, 0.035), materials.door, side * 0.35, 0.64, 0.18);
  }
  part(group, new THREE.CylinderGeometry(0.015, 0.015, 0.6, 6), materials.gold, 0, 1);
  part(group, box(0.28, 0.18, 0.025), materials.dress, 0.13, 1.21);
  return group;
}

const princess = makePrincess();
const monster = makeMonster();
scene.add(princess, monster);
let board;
let castle;
let level = savedLevel("labirinto", 1);
levelLabel.textContent = `Fase ${level} · Encontre o castelo`;
let maze = generateMaze(level);
let round = createRound(maze, level);
let state = 'ready';
let lastTime = 0;
let displayedHint = '';
const inputs = new Map();
let audioEnabled = false;
let drag = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08);
const touchPoint = new THREE.Vector3();

function clearDrag() {
  if (!drag) return;
  const id = drag.id;
  drag = null;
  canvas.classList.remove('dragging');
  if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
}

function pointOnBoard(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
    1 - (event.clientY - rect.top) / rect.height * 2);
  raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(ground, touchPoint)) return null;
  const offset = (maze.size - 1) / 2;
  return { x: touchPoint.x + offset, z: touchPoint.z + offset };
}

function dragDirection() {
  const cell = round.princess.target || round.princess.cell;
  const dx = drag.point.x - cell.x;
  const dz = drag.point.z - cell.z;
  const options = [
    { name: dx > 0 ? 'right' : 'left', distance: Math.abs(dx), x: Math.sign(dx), z: 0 },
    { name: dz > 0 ? 'down' : 'up', distance: Math.abs(dz), x: 0, z: Math.sign(dz) },
  ].sort((a, b) => b.distance - a.distance);
  // Only neighboring corridors count. The player must trace the turns.
  return options.find((d) => d.distance > 0.4 &&
    isOpen(maze, { x: cell.x + d.x, z: cell.z + d.z }))?.name;
}

function clearInput() {
  clearDrag();
  inputs.clear();
  for (const button of buttons) button.classList.remove('held');
}

function setControls(enabled) {
  buttons.forEach((button) => { button.disabled = !enabled; });
  pauseButton.disabled = !enabled;
}

function showPanel(heading, text, label) {
  clearInput();
  setControls(false);
  title.textContent = heading;
  message.textContent = text;
  action.textContent = label;
  overlay.querySelector(".panel").append(document.querySelector(".progress-menu"));
  overlay.hidden = false;
  view.inert = true;
  document.querySelector('.controls').inert = true;
  document.querySelector('.top').inert = true;
  action.focus();
}

function start() {
  if (state !== 'paused') {
    if (state === 'won') {
      level++;
      maze = generateMaze(level);
      buildBoard();
    }
    round = createRound(maze, level);
  }
  clearInput();
  state = 'playing';
  lastTime = performance.now();
  document.querySelector(".top-actions").prepend(document.querySelector(".progress-menu"));
  overlay.hidden = true;
  view.inert = false;
  document.querySelector('.controls').inert = false;
  document.querySelector('.top').inert = false;
  setControls(true);
  pauseButton.focus({ preventScroll: true });
  levelLabel.textContent = `Fase ${level} · Encontre o castelo`;
  audioEnabled = true;
}

function pause() {
  if (state !== 'playing') return;
  state = 'paused';
  showPanel('Uma pausinha', 'A princesa e o monstrinho esperam por você.', 'Continuar');
}

function resize() {
  clearDrag();
  const width = view.clientWidth;
  const height = Math.max(1, view.clientHeight);
  renderer.setSize(width, height, false);
  const aspect = width / height;
  const span = Math.max((maze.size + 1.6) / aspect, (maze.size + 2) * 0.88 + 1.5);
  camera.left = -span * aspect / 2;
  camera.right = span * aspect / 2;
  camera.top = span / 2;
  camera.bottom = -span / 2;
  camera.updateProjectionMatrix();
}

function buildBoard() {
  if (board) {
    scene.remove(board);
    const geometries = new Set();
    board.traverse((item) => {
      if (item.geometry) geometries.add(item.geometry);
      if (item.isInstancedMesh) item.dispose();
    });
    geometries.forEach((geometry) => geometry.dispose());
  }
  board = new THREE.Group();
  scene.add(board);
  const size = maze.size;
  part(board, box(size + 0.6, 0.34, size + 0.6), materials.edge, 0, -0.22);
  part(board, box(size + 0.35, 0.12, size + 0.35), materials.grass, 0, -0.02);
  const wallCells = [];
  const pathCells = [];
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) (maze.grid[z][x] ? wallCells : pathCells).push({ x, z });
  }
  const offset = (size - 1) / 2;
  const transform = new THREE.Object3D();
  for (const [cells, geometry, material, y] of [
    [pathCells, box(0.99, 0.045, 0.99), materials.path, 0.065],
    [wallCells, box(0.98, 0.32, 0.98), materials.hedge, 0.2],
    [wallCells, new THREE.SphereGeometry(0.55, 10, 6), materials.leaves, 0.35],
  ]) {
    const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
    mesh.castShadow = material !== materials.path;
    mesh.receiveShadow = true;
    cells.forEach((cell, i) => {
      transform.position.set(cell.x - offset, y, cell.z - offset);
      transform.scale.set(1, material === materials.leaves ? 0.4 : 1, 1);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      if (material === materials.leaves) mesh.setColorAt(i, new THREE.Color(i % 3 ? 0xffffff : 0xb8d9a6));
    });
    board.add(mesh);
  }
  // Small flowers sit on the outside hedge, away from the playable corridors.
  const petalGeometry = sphere(0.09);
  for (let x = 0; x < size; x += 2) {
    for (const z of [0, size - 1]) {
      const flower = new THREE.Group();
      flower.position.set(x - offset, 0.59, z - offset);
      for (let i = 0; i < 5; i++) {
        const angle = i / 5 * Math.PI * 2;
        part(flower, petalGeometry, materials.sleeve, Math.cos(angle) * 0.11, 0, Math.sin(angle) * 0.11);
      }
      part(flower, petalGeometry, materials.gold, 0, 0.04);
      board.add(flower);
    }
  }
  castle = makeCastle();
  castle.position.set(maze.exit.x - offset, 0.08, maze.exit.z - offset);
  board.add(castle);
  const welcome = part(board, new THREE.RingGeometry(0.28, 0.4, 32), materials.gold, maze.start.x - offset, 0.095, maze.start.z - offset);
  welcome.rotation.x = -Math.PI / 2;
  resize();
}

function placeCharacter(model, item, time) {
  const offset = (maze.size - 1) / 2;
  const bounce = !reducedMotion && item.target && state === 'playing' ? Math.abs(Math.sin(time * 16)) * 0.07 : 0;
  model.position.set(item.x - offset, 0.09 + bounce, item.z - offset);
  if (item.heading) model.rotation.y = Math.atan2(item.heading.x, item.heading.z);
}

function playResult(won) {
  if (!audioEnabled) return;
  const tones = won ? [523, 659, 784, 1047] : [392, 330];
  tones.forEach((tone, i) => setTimeout(() => {
    if (!document.hidden) beep(tone, 0.16);
  }, i * 130));
}

function frame(time) {
  requestAnimationFrame(frame);
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  if (state === 'playing') {
    stepRound(round, dt, drag ? dragDirection() : [...inputs.values()].at(-1));
    const text = round.elapsed < round.headStart
      ? 'Vamos! O monstrinho ainda está dormindo…'
      : 'Fuja do monstrinho e chegue ao castelo!';
    if (displayedHint !== text) { hint.textContent = text; displayedHint = text; }
    if (round.status !== 'playing') {
      state = round.status;
      if (state === 'won') saveLevel('labirinto', level + 1);
      playResult(state === 'won');
      if (state === 'won') showPanel('Você conseguiu!', 'A princesa chegou ao castelo. Vamos passear em outro jardim?', 'Próxima fase');
      else showPanel('Quase lá!', 'O monstrinho pegou você. Vamos tentar outro caminho?', 'Tentar de novo');
    }
  }
  placeCharacter(princess, round.princess, time / 1000);
  placeCharacter(monster, round.monster, time / 1000);
  if (state === 'won' && !reducedMotion) {
    princess.position.y += Math.abs(Math.sin(time / 170)) * 0.25;
    princess.rotation.y = time / 300;
  }
  renderer.render(scene, camera);
}

canvas.addEventListener('pointerdown', (event) => {
  if (state !== 'playing' || drag || event.button !== 0) return;
  const point = pointOnBoard(event);
  if (!point || point.x < -0.5 || point.z < -0.5 ||
      point.x > maze.size - 0.5 || point.z > maze.size - 0.5) return;
  event.preventDefault();
  clearInput();
  drag = { id: event.pointerId, point };
  canvas.setPointerCapture(event.pointerId);
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag || drag.id !== event.pointerId) return;
  event.preventDefault();
  const point = pointOnBoard(event);
  if (point) drag.point = point;
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(type, (event) => {
    if (drag?.id === event.pointerId) clearDrag();
  });
}

const keyDirections = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
};
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') { pause(); return; }
  const direction = keyDirections[event.code];
  if (!direction || state !== 'playing') return;
  event.preventDefault();
  inputs.set(event.code, direction);
});
window.addEventListener('keyup', (event) => inputs.delete(event.code));
for (const button of buttons) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    if (state !== 'playing' || drag) return;
    button.setPointerCapture(event.pointerId);
    inputs.set(`pointer:${event.pointerId}`, button.dataset.direction);
    button.classList.add('held');
  });
  const release = (event) => {
    inputs.delete(`pointer:${event.pointerId}`);
    button.classList.remove('held');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
}
action.addEventListener('click', start);
pauseButton.addEventListener('click', pause);
window.addEventListener('blur', pause);
window.addEventListener('pagehide', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
// Keep keyboard focus inside the round screen while it is open.
overlay.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const last = overlay.querySelector('.progress-menu[open] button')
    || overlay.querySelector('.progress-menu summary');
  if (event.shiftKey && document.activeElement === action) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); action.focus(); }
});
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  pause();
  state = 'error';
  showPanel('Uma pausinha no jardim', 'O jogo 3D parou. Reabra o jardim para continuar.', 'Reabrir o jardim');
  action.onclick = () => location.reload();
});
new ResizeObserver(resize).observe(view);
buildBoard();
action.disabled = false;
showPanel('Um passeio real', 'Arraste o dedo pelos caminhos para levar a princesa ao castelo. Levante o dedo para parar. Você também pode usar as setas ou WASD.', 'Jogar');
hint.textContent = 'Arraste o dedo pelos caminhos até o castelo';
requestAnimationFrame(frame);
