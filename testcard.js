const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ── Presets ──
const PRESETS = {
  elverket: [
    { name: "WALL FRONT", w: 1320, h: 960, cols: 11, rows: 8, info: "11m x 8m" },
    { name: "WALL REAR", w: 1320, h: 960, cols: 11, rows: 8, info: "11m x 8m" },
    { name: "WALL LEFT", w: 4089, h: 957, cols: 34, rows: 8, info: "34m x 8m" },
    { name: "WALL RIGHT", w: 4089, h: 957, cols: 34, rows: 8, info: "34m x 8m" },
    { name: "FLOOR", w: 4089, h: 1286, cols: 34, rows: 11, info: "34m x 11m" },
  ],
  "hd-16:9": [{ name: "SCREEN", w: 1920, h: 1080, cols: 16, rows: 9, info: "" }],
  "4k-16:9": [{ name: "SCREEN", w: 3840, h: 2160, cols: 16, rows: 9, info: "" }],
};

const PATTERNS = { grid: "Grid", smpte: "SMPTE", gradient: "Gradient", white: "White", red: "Red", green: "Green", blue: "Blue", checker: "Checker", crosshatch: "Crosshatch" };
const FONTS = { mono: "'SF Mono', 'Fira Code', monospace", courier: "'Courier New', monospace", helvetica: "Helvetica, Arial, sans-serif", futura: "'Futura', 'Century Gothic', sans-serif", system: "system-ui, sans-serif" };

// ── State ──
const surfaces = [];
let activeIdx = 0;
let logoImg = null;

const params = {
  preset: "elverket",
  surface: 0,
  name: "WALL FRONT",
  width: 1320,
  height: 960,
  cols: 11,
  rows: 8,
  pattern: "grid",
  lineColor: "#cc0000",
  font: "mono",
  info: "11m x 8m",
  logo: "",
};

// ── Init surfaces from preset ──
function loadPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;
  surfaces.length = 0;
  preset.forEach((s) => surfaces.push({ ...s }));
  activeIdx = 0;
  loadSurface(0);
  rebuildSurfaceList();
}

function loadSurface(idx) {
  if (idx < 0 || idx >= surfaces.length) return;
  activeIdx = idx;
  const s = surfaces[idx];
  params.surface = idx;
  params.name = s.name;
  params.width = s.w;
  params.height = s.h;
  params.cols = s.cols;
  params.rows = s.rows;
  params.info = s.info || "";
  pane.refresh();
  generate();
}

function saveSurface() {
  if (activeIdx >= surfaces.length) return;
  const s = surfaces[activeIdx];
  s.name = params.name;
  s.w = params.width;
  s.h = params.height;
  s.cols = params.cols;
  s.rows = params.rows;
  s.info = params.info;
}

// ── Tweakpane ──
const pane = new Tweakpane.Pane({ title: "Testcard" });

// Preset
const presetBlade = pane.addBlade({
  view: "list", label: "preset", options: Object.keys(PRESETS).map((k) => ({ text: k, value: k })), value: "elverket",
});
presetBlade.on("change", (ev) => { params.preset = ev.value; loadPreset(ev.value); });

// Surface selector
const surfaceFolder = pane.addFolder({ title: "surfaces", expanded: true });
let surfaceBlade = null;

function rebuildSurfaceList() {
  if (surfaceBlade) surfaceBlade.dispose();
  surfaceBlade = surfaceFolder.addBlade({
    view: "list", label: "surface",
    options: surfaces.map((s, i) => ({ text: s.name, value: i })),
    value: activeIdx,
  });
  surfaceBlade.on("change", (ev) => loadSurface(ev.value));
}

surfaceFolder.addButton({ title: "+ add surface" }).on("click", () => {
  surfaces.push({ name: "SURFACE " + surfaces.length, w: 1920, h: 1080, cols: 16, rows: 9, info: "" });
  activeIdx = surfaces.length - 1;
  loadSurface(activeIdx);
  rebuildSurfaceList();
});

surfaceFolder.addButton({ title: "- remove surface" }).on("click", () => {
  if (surfaces.length <= 1) return;
  surfaces.splice(activeIdx, 1);
  if (activeIdx >= surfaces.length) activeIdx = surfaces.length - 1;
  loadSurface(activeIdx);
  rebuildSurfaceList();
});

// Settings
const settingsFolder = pane.addFolder({ title: "settings", expanded: true });
settingsFolder.addBinding(params, "name").on("change", () => { saveSurface(); generate(); rebuildSurfaceList(); });
settingsFolder.addBinding(params, "width", { min: 64, max: 8192, step: 1 }).on("change", () => { saveSurface(); generate(); });
settingsFolder.addBinding(params, "height", { min: 64, max: 8192, step: 1 }).on("change", () => { saveSurface(); generate(); });
settingsFolder.addBinding(params, "cols", { min: 1, max: 100, step: 1 }).on("change", () => { saveSurface(); generate(); });
settingsFolder.addBinding(params, "rows", { min: 1, max: 100, step: 1 }).on("change", () => { saveSurface(); generate(); });
settingsFolder.addBlade({ view: "list", label: "pattern", options: Object.entries(PATTERNS).map(([k, v]) => ({ text: v, value: k })), value: "grid" }).on("change", (ev) => { params.pattern = ev.value; generate(); });
settingsFolder.addBinding(params, "lineColor").on("change", generate);
settingsFolder.addBlade({ view: "list", label: "font", options: Object.entries(FONTS).map(([k, v]) => ({ text: k, value: k })), value: "mono" }).on("change", (ev) => { params.font = ev.value; generate(); });
settingsFolder.addBinding(params, "info").on("change", () => { saveSurface(); generate(); });

// Logo
const logoFolder = pane.addFolder({ title: "logo", expanded: false });
logoFolder.addButton({ title: "upload logo" }).on("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => { logoImg = img; generate(); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
});
logoFolder.addButton({ title: "clear logo" }).on("click", () => { logoImg = null; generate(); });

// Export
const exportFolder = pane.addFolder({ title: "export", expanded: false });
exportFolder.addButton({ title: "export PNG" }).on("click", exportPng);
exportFolder.addButton({ title: "export all PNGs" }).on("click", exportAll);

// ── Generate ──
function generate() {
  canvas.width = params.width;
  canvas.height = params.height;

  switch (params.pattern) {
    case "grid": drawGrid(); break;
    case "smpte": drawSMPTE(); break;
    case "gradient": drawGradient(); break;
    case "white": drawSolid("#ffffff"); break;
    case "red": drawSolid("#ff0000"); break;
    case "green": drawSolid("#00ff00"); break;
    case "blue": drawSolid("#0000ff"); break;
    case "checker": drawChecker(); break;
    case "crosshatch": drawCrosshatch(); break;
  }
}

function getFont() { return FONTS[params.font] || FONTS.mono; }

function drawGrid() {
  const { width: w, height: h, cols, rows, name, lineColor, info } = params;
  const font = getFont();
  const cellW = w / cols;
  const cellH = h / rows;
  const fontSize = Math.max(8, Math.min(cellW, cellH) / 5);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = Math.max(1, w / 960);
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, h); ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(w, r * cellH); ctx.stroke();
  }

  // Cell numbers
  ctx.font = `${fontSize}px ${font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = alpha(lineColor, 0.4);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillText(`${c},${r}`, c * cellW + cellW / 2, r * cellH + cellH / 2);
    }
  }

  drawCenter(w, h, fontSize, font);
}

function drawCenter(w, h, fontSize, font) {
  const { name, lineColor, info } = params;
  const cx = w / 2, cy = h / 2;
  const lineH = fontSize * 1.4;

  // Count lines
  let lines = [name, `${w} x ${h}`];
  if (info) lines.push(info);
  if (logoImg) lines.push(""); // space for logo

  const boxH = lineH * (lines.length + 1) + (logoImg ? Math.min(fontSize * 4, h / 6) : 0);
  ctx.font = `bold ${fontSize}px ${font}`;
  const maxTextW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const logoH = logoImg ? Math.min(fontSize * 4, h / 6) : 0;
  const logoW = logoImg ? (logoH * logoImg.width / logoImg.height) : 0;
  const boxW = Math.max(maxTextW + fontSize * 4, logoW + fontSize * 4);

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let y = cy - boxH / 2 + lineH;

  // Logo
  if (logoImg) {
    ctx.drawImage(logoImg, cx - logoW / 2, y - logoH / 3, logoW, logoH);
    y += logoH + lineH * 0.3;
  }

  // Name
  ctx.fillStyle = lineColor;
  ctx.font = `bold ${fontSize}px ${font}`;
  ctx.fillText(name, cx, y);
  y += lineH;

  // Resolution
  ctx.font = `${fontSize}px ${font}`;
  ctx.fillText(`${w} x ${h}`, cx, y);
  y += lineH;

  // Info
  if (info) {
    ctx.fillStyle = alpha(lineColor, 0.6);
    ctx.fillText(info, cx, y);
  }
}

function drawSMPTE() {
  const { width: w, height: h } = params;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  const barH = Math.floor(h * 2 / 3);
  const colors = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
  const barW = w / colors.length;
  colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * barW, 0, barW, barH); });
  const steps = 10, stepW = w / steps;
  for (let i = 0; i < steps; i++) {
    const v = Math.round(i * 255 / (steps - 1));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(i * stepW, barH, stepW, h - barH);
  }
  const fontSize = Math.max(14, w / 40);
  drawCenter(w, h, fontSize, getFont());
}

function drawGradient() {
  const { width: w, height: h } = params;
  const imgData = ctx.createImageData(w, h);
  const d = imgData.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hue = (x / w) * 360;
      const val = 1 - y / h;
      const [r, g, b] = hsvToRgb(hue, 1, val);
      const i = (y * w + x) * 4;
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  drawCenter(w, h, Math.max(14, w / 40), getFont());
}

function drawSolid(color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, params.width, params.height);
  drawCenter(params.width, params.height, Math.max(14, params.width / 40), getFont());
}

function drawChecker() {
  const { width: w, height: h, cols, rows } = params;
  const cellW = w / cols, cellH = h / rows;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if ((c + r) % 2 === 0) ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
  drawCenter(w, h, Math.max(14, w / 40), getFont());
}

function drawCrosshatch() {
  const { width: w, height: h, lineColor } = params;
  const spacing = Math.max(w, h) / 20;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += spacing) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += spacing) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = alpha(lineColor, 0.3);
  for (let d = -h; d < w + h; d += spacing) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d, h); ctx.lineTo(d + h, 0); ctx.stroke();
  }
  ctx.strokeStyle = lineColor; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  drawCenter(w, h, Math.max(14, w / 40), getFont());
}

// ── Helpers ──
function alpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// ── Export ──
function exportPng() {
  const a = document.createElement("a");
  a.download = `${params.name.replace(/\s+/g, "_")}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

function exportAll() {
  const saved = activeIdx;
  surfaces.forEach((_, i) => {
    loadSurface(i);
    const a = document.createElement("a");
    a.download = `${params.name.replace(/\s+/g, "_")}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  });
  loadSurface(saved);
}

// ── Init ──
loadPreset("elverket");
rebuildSurfaceList();
