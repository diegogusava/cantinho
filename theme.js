(() => {
  const storageKey = "cantinho:theme";
  const colorKey = "cantinho:background";
  const palettes = {
    light: { background: "#f4a8c8", foreground: "#3d2c4e", sky: "#bfe8ff", gardenSky: "#f7d0e4", tile: "#2a2438", grid: "#de8eb0" },
    dark: { background: "#241b2d", foreground: "#fff1f7", sky: "#241b2d", gardenSky: "#241b2d", tile: "#a9dce8", grid: "#73546d" },
  };
  const validColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  let current = "light";
  let custom = null;
  let colors;
  try {
    if (localStorage.getItem(storageKey) === "dark") current = "dark";
    const saved = localStorage.getItem(colorKey);
    if (validColor(saved)) custom = saved;
  } catch {}

  function apply() {
    let foreground;
    if (custom) {
      const rgb = custom.slice(1).match(/../g).map((hex) => parseInt(hex, 16) / 255);
      const linear = rgb.map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
      const luminance = linear.reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
      current = luminance < 0.179 ? "dark" : "light";
      foreground = current === "dark" ? "#ffffff" : "#000000";
    }
    colors = { ...palettes[current] };
    if (custom) Object.assign(colors, { background: custom, sky: custom, gardenSky: custom, foreground });
    const root = document.documentElement;
    root.dataset.theme = current;
    for (const [property, value] of Object.entries({
      "--page-bg": custom, "--overlay": custom && `${custom}dd`,
      "--text": foreground, "--focus": foreground, "--link": foreground,
    })) {
      if (value) root.style.setProperty(property, value);
      else root.style.removeProperty(property);
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors.background);
    document.querySelectorAll('input[name="background-theme"]').forEach((input) => {
      input.checked = !custom && input.value === current;
    });
    const picker = document.getElementById("background-color");
    if (picker) picker.value = colors.background;
    window.dispatchEvent(new Event("themechange"));
  }

  window.CantinhoTheme = {
    get dark() { return current === "dark"; },
    get custom() { return custom !== null; },
    get colors() { return colors; },
    select(value) {
      current = value === "dark" ? "dark" : "light";
      custom = null;
      apply();
      try {
        localStorage.removeItem(colorKey);
        localStorage.setItem(storageKey, current);
      } catch {}
    },
    selectColor(value) {
      if (!validColor(value)) return;
      custom = value.toLowerCase();
      apply();
      try { localStorage.setItem(colorKey, custom); } catch {}
    },
  };
  apply();
  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("background-color")) {
      const picker = document.createElement("fieldset");
      picker.className = "theme-picker";
      picker.innerHTML = `<legend>Cor do fundo</legend>
        <label class="color-picker"><input type="color" id="background-color" value="#f4a8c8"> Escolher cor</label>
        <div><label><input type="radio" name="background-theme" value="light"> Claro</label>
        <label><input type="radio" name="background-theme" value="dark"> Escuro</label></div>`;
      const progressMenu = document.querySelector(".progress-menu");
      if (progressMenu) {
        progressMenu.querySelector(".options-panel").prepend(picker);
        const actions = document.querySelector(".top-actions");
        if (actions && !document.querySelector("#overlay:not([hidden])")) actions.prepend(progressMenu);
      } else {
        const menu = document.createElement("details");
        menu.className = "theme-menu";
        const summary = document.createElement("summary");
        summary.textContent = "Opções";
        menu.append(summary, picker);
        const header = document.querySelector(".paint-header");
        if (header) {
          menu.classList.add("theme-menu-inline");
          header.insertBefore(menu, header.querySelector(".home-link"));
        } else {
          document.body.classList.add("theme-menu-host");
          document.body.append(menu);
        }
      }
    }
    for (const menu of document.querySelectorAll(".theme-menu, .progress-menu")) {
      menu.addEventListener("keydown", (event) => {
        if (event.key !== "Tab") event.stopPropagation();
        if (event.key === "Escape" && menu.open) {
          menu.open = false;
          menu.querySelector("summary").focus();
        }
      });
    }
    apply();
    document.querySelectorAll('input[name="background-theme"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) window.CantinhoTheme.select(input.value);
      });
    });
    document.getElementById("background-color")?.addEventListener("input", (event) => {
      window.CantinhoTheme.selectColor(event.target.value);
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === colorKey) custom = validColor(event.newValue) ? event.newValue : null;
    else if (event.key === storageKey) current = event.newValue === "dark" ? "dark" : "light";
    else if (event.key === null) { current = "light"; custom = null; }
    else return;
    apply();
  });
})();
