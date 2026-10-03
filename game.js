const COLS = 4;
const VISIBLE_ROWS = 4;
const START_SCROLL = 2;
const MAX_ERRORS = 3;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const result = document.getElementById("result");

let W, H, rowH;
let audio;
let level = LEVELS[0];
let game = null;
let song = SONGS[0];

const NOTE_SEMITONES = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
function frequency(note) {
  const semitones = NOTE_SEMITONES[note[0]] + (Number(note[1]) - 4) * 12;
  return 440 * 2 ** (semitones / 12);
}

function playNote(note, hold) {
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.value = frequency(note);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  if (!hold) {
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc.stop(now + 0.65);
    return;
  }
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.1);
  return () => {
    const end = audio.currentTime;
    gain.gain.cancelScheduledValues(end);
    gain.gain.setValueAtTime(0.35, end);
    gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.2);
    osc.stop(end + 0.25);
  };
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function buildTiles(song) {
  let previous = -1;
  let start = 0;
  return song.notes.split(" ").map((token) => {
    const [note, rows = 1] = token.split(":");
    let col;
    do { col = Math.floor(Math.random() * COLS); } while (col === previous);
    previous = col;
    const tile = { col, note, rows: Number(rows), start, hit: false };
    start += tile.rows;
    return tile;
  });
}

function readStars(song) {
  try { return Number(localStorage.getItem(`stars:${song.name}`)) || 0; } catch { return 0; }
}
function writeStars(song, value) {
  try { localStorage.setItem(`stars:${song.name}`, value); } catch {}
}

function start() {
  if (navigator.audioSession) navigator.audioSession.type = "playback";
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  game = {
    tiles: buildTiles(song),
    scroll: START_SCROLL,
    speed: level.speed,
    hits: 0,
    errors: 0,
    over: false,
    flash: null,
  };
  menu.hidden = true;
}

function starsFor(errors) {
  return errors === 0 ? 3 : errors <= 2 ? 2 : 1;
}

function mistake(col, row) {
  game.errors++;
  game.flash = { col, row, until: performance.now() + 300 };
  if (game.errors > MAX_ERRORS) finish(false);
  else checkEnd();
}

function checkEnd() {
  if (game.tiles.every((tile) => (tile.hit && !tile.holding) || tile.missed)) finish(true);
}

function finish(won) {
  game.over = true;
  game.won = won;
  game.tiles.forEach((tile) => tile.holding && endHold(tile));
  if (won) game.hearts = spawnHearts();
  const { hits, tiles } = game;
  if (won) {
    game.stars = starsFor(game.errors);
    if (game.stars > readStars(song)) writeStars(song, game.stars);
    const next = SONGS[SONGS.indexOf(song) + 1];
    game.advanced = Boolean(next);
    if (next) song = next;
  }
  result.textContent = won
    ? `Parabéns, você ganhou! 💖`
    : `Continue tentando! Você consegue! (${hits}/${tiles.length})`;
  speak(won ? "Parabéns, você ganhou!" : "Continue tentando, você consegue!");
  setTimeout(() => { renderMenu(); menu.hidden = false; }, won ? 4000 : 800);
}

const HEARTS = ["💖", "💗", "🩷"];
function spawnHearts() {
  return Array.from({ length: 60 }, () => ({
    emoji: HEARTS[Math.floor(Math.random() * HEARTS.length)],
    x: Math.random() * W,
    y: H + Math.random() * H * 0.6,
    speed: 90 + Math.random() * 160,
    size: 24 + Math.random() * 36,
  }));
}

function tileBounds(tile) {
  return { top: game.scroll - tile.start - tile.rows, bottom: game.scroll - tile.start };
}

function endHold(tile) {
  tile.holding = false;
  tile.stop();
}

function onTap(event) {
  if (!game || game.over) return;
  const col = Math.floor(event.clientX / (W / COLS));
  const row = event.clientY / rowH;
  const tile = game.tiles.find((candidate) => {
    const { top, bottom } = tileBounds(candidate);
    return candidate.col === col && !candidate.hit && row >= top && row <= bottom;
  });
  if (!tile) {
    mistake(col, row);
    return;
  }
  tile.hit = true;
  game.hits++;
  if (tile.rows > 1) {
    Object.assign(tile, { holding: true, pressRow: row, pointerId: event.pointerId });
    tile.stop = playNote(tile.note, true);
  } else {
    playNote(tile.note, false);
  }
  checkEnd();
}

function onRelease(event) {
  if (!game || game.over) return;
  const tile = game.tiles.find((t) => t.holding && t.pointerId === event.pointerId);
  if (!tile) return;
  endHold(tile);
  tile.missed = true;
  mistake(tile.col, tile.pressRow);
}

function update(dt) {
  game.scroll += game.speed * dt;
  game.tiles.filter((tile) => tile.holding && tileBounds(tile).top >= tile.pressRow - 0.25)
    .forEach((tile) => { endHold(tile); checkEnd(); });
  const missed = game.tiles.find(
    (tile) => !tile.hit && !tile.missed && tileBounds(tile).top > VISIBLE_ROWS,
  );
  if (missed) {
    missed.missed = true;
    mistake(missed.col, VISIBLE_ROWS - 0.5);
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const colW = W / COLS;
  ctx.strokeStyle = "#ddd";
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * colW, 0);
    ctx.lineTo(c * colW, H);
    ctx.stroke();
  }
  if (!game) return;

  game.tiles.forEach((tile) => {
    const { top, bottom } = tileBounds(tile);
    if (bottom < 0 || top > VISIBLE_ROWS) return;
    ctx.fillStyle = tile.missed ? "#ff9a9a" : tile.holding ? "#ff4fa3" : tile.hit ? "#ffd1e8" : "#1a1a1a";
    ctx.fillRect(tile.col * colW + 2, top * rowH + 2, colW - 4, tile.rows * rowH - 4);
  });

  if (game.flash && performance.now() < game.flash.until) {
    ctx.fillStyle = "rgba(255, 0, 0, .55)";
    ctx.fillRect(game.flash.col * colW, game.flash.row * rowH - rowH / 2, colW, rowH);
  }

  if (game.won) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    game.hearts.forEach((heart) => {
      ctx.font = `${heart.size}px system-ui`;
      ctx.fillText(heart.emoji, heart.x, heart.y);
    });
    ctx.font = "800 44px system-ui";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#ff4fa3";
    ["Parabéns,", "você ganhou!"].forEach((line, i) => {
      const y = H / 2 + (i - 0.5) * 56;
      ctx.strokeText(line, W / 2, y);
      ctx.fillText(line, W / 2, y);
    });
    ctx.font = "44px system-ui";
    ctx.fillText("⭐".repeat(game.stars), W / 2, H / 2 + 90);
    ctx.textBaseline = "alphabetic";
  }

  ctx.fillStyle = "#ff4fa3";
  ctx.font = "700 32px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(game.hits, W / 2, 48);
  const lives = Math.max(MAX_ERRORS - game.errors, 0);
  ctx.font = "28px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("💖".repeat(lives) + "🤍".repeat(MAX_ERRORS - lives), 16, 46);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (game && !game.over) update(dt);
  game?.hearts?.forEach((heart) => { heart.y -= heart.speed * dt; });
  draw();
  requestAnimationFrame(loop);
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  rowH = H / VISIBLE_ROWS;
}

function renderMenu() {
  const levels = document.getElementById("levels");
  levels.replaceChildren(...LEVELS.map((l) => {
    const button = document.createElement("button");
    button.textContent = l.name;
    button.className = l === level ? "on" : "";
    button.onclick = () => { level = l; renderMenu(); };
    return button;
  }));

  const play = document.getElementById("play");
  play.textContent = !game ? "Jogar" : !game.won ? "Recomeçar" : game.advanced ? "Próxima fase" : "Jogar de novo";
  play.onclick = start;

  const songs = document.getElementById("songs");
  songs.replaceChildren(...SONGS.map((s, i) => {
    const button = document.createElement("button");
    const locked = i > 0 && !readStars(SONGS[i - 1]);
    button.textContent = locked ? `🔒 ${i + 1}. ${s.name}` : `${i + 1}. ${s.name} ${"⭐".repeat(readStars(s))}`;
    button.disabled = locked;
    button.className = s === song ? "on" : "";
    button.onclick = () => { song = s; start(); };
    return button;
  }));
}

window.addEventListener("resize", resize);
canvas.addEventListener("pointerdown", onTap);
window.addEventListener("pointerup", onRelease);
window.addEventListener("pointercancel", onRelease);
resize();
renderMenu();
requestAnimationFrame(loop);
