function savedLevel(game, fallback) {
  try {
    const raw = localStorage.getItem(`level:${game}`);
    const value = Number(raw);
    return raw !== null && Number.isSafeInteger(value) && value >= fallback ? value : fallback;
  } catch { return fallback; }
}

function saveLevel(game, value) {
  try { localStorage.setItem(`level:${game}`, value); } catch {}
}

function savedChoice(key, choices, fallback) {
  try {
    const value = localStorage.getItem(key);
    return choices.includes(value) ? value : fallback;
  } catch { return fallback; }
}

function saveChoice(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function setupProgress(game, extraKeys = [], host = document.body) {
  const menu = document.createElement("details");
  menu.className = "progress-menu";
  const summary = document.createElement("summary");
  summary.textContent = "Opções";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Começar do zero";
  reset.onclick = () => {
    if (!confirm("Começar este jogo do zero? O progresso salvo deste jogo será apagado.")) return;
    try {
      const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
      for (const key of keys) {
        if (key === `level:${game}` || key.startsWith(`level:${game}:`) || extraKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
    location.reload();
  };
  menu.append(summary, reset);
  host.append(menu);
}
