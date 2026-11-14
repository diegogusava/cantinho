let audio;
let W, H;

function resumeAudio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch {}
  if (!audio || audio.state === "closed") {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audio.state !== "running") audio.resume().catch(() => {});
}

function unlockAudio(event) {
  if (event.target.closest?.('input, textarea, [contenteditable="true"]')) return;
  resumeAudio();
  // Start the output inside the gesture, including games that beep in a frame.
  const source = audio.createBufferSource();
  source.buffer = audio.createBuffer(1, 1, audio.sampleRate);
  source.connect(audio.destination);
  source.start();
}

document.addEventListener("pointerdown", unlockAudio, true);
document.addEventListener("keydown", unlockAudio, true);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && audio) resumeAudio();
});
window.addEventListener("pageshow", () => {
  if (audio) resumeAudio();
});
for (const type of ["contextmenu", "selectstart"]) {
  document.addEventListener(type, (event) => {
    if (event.target.closest?.("canvas, button, .card")) event.preventDefault();
  });
}

function beep(frequency, duration = 0.25) {
  resumeAudio();
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "pt-BR";
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function setupCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener("resize", resize);
  resize();
  return ctx;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function savedLevel(game, fallback) {
  try { return Number(localStorage.getItem(`level:${game}`)) || fallback; } catch { return fallback; }
}

function saveLevel(game, value) {
  try { localStorage.setItem(`level:${game}`, value); } catch {}
}
