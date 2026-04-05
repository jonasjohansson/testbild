import { Pane } from "https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js";

const overviewEl = document.getElementById("overview");
const singleEl = document.getElementById("single");
const singleCanvas = document.getElementById("canvas");

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
const FONT = "'SF Mono', 'Fira Code', monospace";

// ── State ──
const surfaces = [];
let activeIdx = 0;
let logoImg = null;
let viewMode = "overview"; // "overview" or "single"

const params = {
  preset: "elverket",
  name: "WALL FRONT",
  width: 1320,
  height: 960,
  cols: 11,
  rows: 8,
  pattern: "grid",
  lineColor: "#cc0000",
  cellOpacity: 0.6,
  cellSize: 0.7,
  info: "11m x 8m",
  lineWidth: 1,
};

// ── Surfaces ──
function loadPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;
  surfaces.length = 0;
  preset.forEach((s) => surfaces.push({ ...s }));
  activeIdx = 0;
  loadSurface(0);
  rebuildSurfaceList();
  renderAll();
}

function loadSurface(idx) {
  if (idx < 0 || idx >= surfaces.length) return;
  activeIdx = idx;
  const s = surfaces[idx];
  params.name = s.name;
  params.width = s.w;
  params.height = s.h;
  params.cols = s.cols;
  params.rows = s.rows;
  params.info = s.info || "";
  pane.refresh();
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

// ── Rendering ──
function renderSurface(c, s) {
  c.width = s.w;
  c.height = s.h;
  const ctx = c.getContext("2d");

  // Build a local params-like object for this surface
  const p = { ...params, name: s.name, width: s.w, height: s.h, cols: s.cols, rows: s.rows, info: s.info || "" };

  switch (params.pattern) {
    case "grid": drawGrid(ctx, p); break;
    case "smpte": drawSMPTE(ctx, p); break;
    case "gradient": drawGradient(ctx, p); break;
    case "white": drawSolid(ctx, p, "#ffffff"); break;
    case "red": drawSolid(ctx, p, "#ff0000"); break;
    case "green": drawSolid(ctx, p, "#00ff00"); break;
    case "blue": drawSolid(ctx, p, "#0000ff"); break;
    case "checker": drawChecker(ctx, p); break;
    case "crosshatch": drawCrosshatch(ctx, p); break;
  }
}

function renderAll() {
  // Overview thumbnails
  overviewEl.innerHTML = "";
  surfaces.forEach((s, i) => {
    const c = document.createElement("canvas");
    // Thumbnail size: scale down large canvases for display
    const maxThumbW = Math.min(600, window.innerWidth - 350);
    const scale = Math.min(1, maxThumbW / s.w);
    c.style.width = Math.round(s.w * scale) + "px";
    c.style.height = Math.round(s.h * scale) + "px";
    if (i === activeIdx) c.classList.add("active");
    c.onclick = () => {
      activeIdx = i;
      loadSurface(i);
      renderAll();
    };
    c.ondblclick = () => {
      activeIdx = i;
      loadSurface(i);
      setView("single");
    };
    renderSurface(c, s);
    overviewEl.appendChild(c);
  });

  // Single view
  if (viewMode === "single" && surfaces[activeIdx]) {
    renderSurface(singleCanvas, surfaces[activeIdx]);
  }
}

function setView(mode) {
  viewMode = mode;
  if (mode === "overview") {
    overviewEl.style.display = "flex";
    singleEl.style.display = "none";
    renderAll();
  } else {
    overviewEl.style.display = "none";
    singleEl.style.display = "block";
    renderAll();
  }
}

// ── Tweakpane ──
const pane = new Pane({ title: "Testcard" });

// View toggle
pane.addButton({ title: "toggle overview / single" }).on("click", () => {
  setView(viewMode === "overview" ? "single" : "overview");
});

// Preset
pane.addBlade({
  view: "list", label: "preset", options: Object.keys(PRESETS).map((k) => ({ text: k, value: k })), value: "elverket",
}).on("change", (ev) => { params.preset = ev.value; loadPreset(ev.value); });

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
  surfaceBlade.on("change", (ev) => { loadSurface(ev.value); renderAll(); });
}

surfaceFolder.addButton({ title: "+ add surface" }).on("click", () => {
  surfaces.push({ name: "SURFACE " + surfaces.length, w: 1920, h: 1080, cols: 16, rows: 9, info: "" });
  activeIdx = surfaces.length - 1;
  loadSurface(activeIdx);
  rebuildSurfaceList();
  renderAll();
});

surfaceFolder.addButton({ title: "- remove surface" }).on("click", () => {
  if (surfaces.length <= 1) return;
  surfaces.splice(activeIdx, 1);
  if (activeIdx >= surfaces.length) activeIdx = surfaces.length - 1;
  loadSurface(activeIdx);
  rebuildSurfaceList();
  renderAll();
});

// Settings
const sf = pane.addFolder({ title: "settings", expanded: true });
const onChange = () => { saveSurface(); rebuildSurfaceList(); renderAll(); };
sf.addBinding(params, "name").on("change", onChange);
sf.addBinding(params, "width", { min: 64, max: 8192, step: 1 }).on("change", onChange);
sf.addBinding(params, "height", { min: 64, max: 8192, step: 1 }).on("change", onChange);
sf.addBinding(params, "cols", { min: 1, max: 100, step: 1 }).on("change", onChange);
sf.addBinding(params, "rows", { min: 1, max: 100, step: 1 }).on("change", onChange);
sf.addBlade({ view: "list", label: "pattern", options: Object.entries(PATTERNS).map(([k, v]) => ({ text: v, value: k })), value: "grid" }).on("change", (ev) => { params.pattern = ev.value; renderAll(); });
sf.addBinding(params, "lineColor").on("change", () => renderAll());
sf.addBinding(params, "lineWidth", { min: 0.5, max: 10, step: 0.5, label: "line width" }).on("change", () => renderAll());
sf.addBinding(params, "cellOpacity", { min: 0.1, max: 1, step: 0.05, label: "cell opacity" }).on("change", () => renderAll());
sf.addBinding(params, "cellSize", { min: 0.3, max: 1.5, step: 0.1, label: "cell size" }).on("change", () => renderAll());
sf.addBinding(params, "info").on("change", onChange);

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
      img.onload = () => { logoImg = img; renderAll(); };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
});
logoFolder.addButton({ title: "clear logo" }).on("click", () => { logoImg = null; renderAll(); });

// Export
const exportFolder = pane.addFolder({ title: "export", expanded: false });
exportFolder.addButton({ title: "export current PNG" }).on("click", () => {
  const c = document.createElement("canvas");
  renderSurface(c, surfaces[activeIdx]);
  const a = document.createElement("a");
  a.download = `${surfaces[activeIdx].name.replace(/\s+/g, "_")}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
});
exportFolder.addButton({ title: "export all PNGs" }).on("click", () => {
  surfaces.forEach((s) => {
    const c = document.createElement("canvas");
    renderSurface(c, s);
    const a = document.createElement("a");
    a.download = `${s.name.replace(/\s+/g, "_")}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  });
});

// ── Drawing functions (take ctx and params) ──
function drawGrid(ctx, p) {
  const { width: w, height: h, cols, rows, lineColor } = p;
  const cellW = w / cols, cellH = h / rows;
  const fontSize = Math.max(8, Math.min(cellW, cellH) / 5);

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = params.lineWidth;
  for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, h); ctx.stroke(); }
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(w, r * cellH); ctx.stroke(); }

  const cellFontSize = Math.max(6, fontSize * params.cellSize);
  const pad = cellFontSize * 0.5;
  ctx.font = `${cellFontSize}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = alphaColor(lineColor, params.cellOpacity);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      ctx.fillText(`${c},${r}`, c * cellW + pad + params.lineWidth, r * cellH + pad + params.lineWidth);

  drawCenter(ctx, p, fontSize);
}

function drawCenter(ctx, p, fontSize) {
  const { name, width: w, height: h, lineColor, info } = p;
  const cx = w / 2, cy = h / 2;
  const lineH = fontSize * 1.4;

  let lines = [name, `${w} x ${h}`];
  if (info) lines.push(info);

  ctx.font = `${fontSize}px ${FONT}`;
  const logoH = logoImg ? Math.min(fontSize * 4, h / 6) : 0;
  const logoW = logoImg ? (logoH * logoImg.width / logoImg.height) : 0;
  const maxTextW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = Math.max(maxTextW + fontSize * 4, logoW + fontSize * 4);
  const boxH = lineH * (lines.length + 1) + (logoImg ? logoH + lineH * 0.5 : 0);

  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let y = cy - boxH / 2 + lineH;

  if (logoImg) {
    ctx.drawImage(logoImg, cx - logoW / 2, y - logoH / 3, logoW, logoH);
    y += logoH + lineH * 0.3;
  }

  ctx.fillStyle = lineColor;
  ctx.font = `${fontSize}px ${FONT}`;
  ctx.fillText(name, cx, y); y += lineH;
  ctx.fillText(`${w} x ${h}`, cx, y); y += lineH;
  if (info) { ctx.fillStyle = alphaColor(lineColor, 0.6); ctx.fillText(info, cx, y); }
}

function drawSMPTE(ctx, p) {
  const { width: w, height: h } = p;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  const barH = Math.floor(h * 2 / 3);
  ["#c0c0c0","#c0c000","#00c0c0","#00c000","#c000c0","#c00000","#0000c0"].forEach((c, i, a) => {
    ctx.fillStyle = c; ctx.fillRect(i * w / a.length, 0, w / a.length, barH);
  });
  for (let i = 0; i < 10; i++) { const v = Math.round(i * 255 / 9); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(i * w / 10, barH, w / 10, h - barH); }
  drawCenter(ctx, p, Math.max(14, w / 40));
}

function drawGradient(ctx, p) {
  const { width: w, height: h } = p;
  const imgData = ctx.createImageData(w, h); const d = imgData.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = hsvToRgb((x / w) * 360, 1, 1 - y / h);
    const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  drawCenter(ctx, p, Math.max(14, w / 40));
}

function drawSolid(ctx, p, color) {
  ctx.fillStyle = color; ctx.fillRect(0, 0, p.width, p.height);
  drawCenter(ctx, p, Math.max(14, p.width / 40));
}

function drawChecker(ctx, p) {
  const { width: w, height: h, cols, rows } = p;
  const cw = w / cols, ch = h / rows;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if ((c + r) % 2 === 0) ctx.fillRect(c * cw, r * ch, cw, ch);
  drawCenter(ctx, p, Math.max(14, w / 40));
}

function drawCrosshatch(ctx, p) {
  const { width: w, height: h, lineColor } = p;
  const sp = Math.max(w, h) / 20;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = lineColor; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  ctx.strokeStyle = alphaColor(lineColor, 0.3);
  for (let d = -h; d < w + h; d += sp) { ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + h, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(d, h); ctx.lineTo(d + h, 0); ctx.stroke(); }
  ctx.strokeStyle = lineColor; ctx.lineWidth = params.lineWidth;
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
  drawCenter(ctx, p, Math.max(14, w / 40));
}

// ── Helpers ──
function alphaColor(hex, a) {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
}

function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// Keyboard: Escape to go back to overview
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && viewMode === "single") setView("overview");
});

// ── Init ──
loadPreset("elverket");
rebuildSurfaceList();
setView("overview");
