import { Pane } from "https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js";

const canvas = document.getElementById("canvas");
const FONT = "'SF Mono', 'Fira Code', monospace";

// ── Presets ──
const PRESETS = {
  elverket: [
    { name: "WALL FRONT", w: 1320, h: 960, cols: 11, rows: 8, color: "#ff0000" },
    { name: "WALL REAR", w: 1320, h: 960, cols: 11, rows: 8, color: "#00ff00" },
    { name: "WALL LEFT", w: 4089, h: 957, cols: 34, rows: 8, color: "#00ffff" },
    { name: "WALL RIGHT", w: 4089, h: 957, cols: 34, rows: 8, color: "#ffff00" },
    { name: "FLOOR", w: 4089, h: 1286, cols: 34, rows: 11, color: "#ff00ff" },
  ],
  "hd-16:9": [{ name: "SCREEN", w: 1920, h: 1080, cols: 16, rows: 9, color: "#ff0000" }],
  "4k-16:9": [{ name: "SCREEN", w: 3840, h: 2160, cols: 16, rows: 9, color: "#ff0000" }],
};

// ── State ──
const surfaces = [];
let activeIdx = 0;

// Global settings (shared across all surfaces)
const global = {
  pattern: "grid",
  lineWidth: 2,
  cellSize: 0.75,
  centerSize: 1.0,
  checkerOpacity: 0.08,
  circles: true,
  colorbar: false,
  invert: false,
  credits: "\u00A9 Jonas Johansson",
};

// Per-surface settings (loaded/saved from surfaces array)
const surface = {
  name: "WALL FRONT",
  width: 1320,
  height: 960,
  cols: 11,
  rows: 8,
  lineColor: "#ff0000",
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
  render();
}

function loadSurface(idx) {
  if (idx < 0 || idx >= surfaces.length) return;
  activeIdx = idx;
  const s = surfaces[idx];
  surface.name = s.name;
  surface.width = s.w;
  surface.height = s.h;
  surface.cols = s.cols;
  surface.rows = s.rows;
  surface.lineColor = s.color || "#ff0000";
  pane.refresh();
}

function saveSurface() {
  if (activeIdx >= surfaces.length) return;
  const s = surfaces[activeIdx];
  s.name = surface.name;
  s.w = surface.width;
  s.h = surface.height;
  s.cols = surface.cols;
  s.rows = surface.rows;
  s.color = surface.lineColor;
}

// ── Rendering ──
function buildParams(s) {
  return {
    name: s.name,
    width: s.w,
    height: s.h,
    cols: s.cols,
    rows: s.rows,
    lineColor: s.color || "#ff0000",
    ...global,
  };
}

function renderToCanvas(c, s) {
  const p = buildParams(s);
  c.width = s.w;
  c.height = s.h;
  const ctx = c.getContext("2d");

  switch (p.pattern) {
    case "grid": drawGrid(ctx, p); break;
    case "smpte": drawSMPTE(ctx, p); break;
  }
}

function render() {
  const s = surfaces[activeIdx];
  if (!s) return;
  renderToCanvas(canvas, s);
}

// ── Tweakpane ──
const pane = new Pane({ title: "Testcard" });

// Preset
pane.addBlade({
  view: "list", label: "Preset",
  options: Object.keys(PRESETS).map((k) => ({ text: k, value: k })),
  value: "elverket",
}).on("change", (ev) => loadPreset(ev.value));

// Surfaces
const surfaceFolder = pane.addFolder({ title: "Surfaces", expanded: true });
let surfaceBlade = null;

function rebuildSurfaceList() {
  if (surfaceBlade) surfaceBlade.dispose();
  surfaceBlade = surfaceFolder.addBlade({
    view: "list", label: "Surface",
    options: surfaces.map((s, i) => ({ text: s.name, value: i })),
    value: activeIdx,
  });
  surfaceBlade.on("change", (ev) => { loadSurface(ev.value); render(); });
}

surfaceFolder.addButton({ title: "+ Add Surface" }).on("click", () => {
  const palette = ["#ff0000", "#00ff00", "#00ffff", "#ffff00", "#ff00ff"];
  surfaces.push({ name: "SURFACE " + surfaces.length, w: 1920, h: 1080, cols: 16, rows: 9, color: palette[surfaces.length % palette.length] });
  activeIdx = surfaces.length - 1;
  loadSurface(activeIdx);
  rebuildSurfaceList();
  render();
});

surfaceFolder.addButton({ title: "- Remove Surface" }).on("click", () => {
  if (surfaces.length <= 1) return;
  surfaces.splice(activeIdx, 1);
  if (activeIdx >= surfaces.length) activeIdx = surfaces.length - 1;
  loadSurface(activeIdx);
  rebuildSurfaceList();
  render();
});

// Per-surface settings
const sf = pane.addFolder({ title: "Surface", expanded: true });
const onSurfaceChange = () => { saveSurface(); rebuildSurfaceList(); render(); };
sf.addBinding(surface, "name", { label: "Name" }).on("change", onSurfaceChange);
sf.addBinding(surface, "width", { min: 64, max: 8192, step: 1, label: "Width" }).on("change", onSurfaceChange);
sf.addBinding(surface, "height", { min: 64, max: 8192, step: 1, label: "Height" }).on("change", onSurfaceChange);
sf.addBinding(surface, "cols", { min: 1, max: 100, step: 1, label: "Cols" }).on("change", onSurfaceChange);
sf.addBinding(surface, "rows", { min: 1, max: 100, step: 1, label: "Rows" }).on("change", onSurfaceChange);
sf.addBinding(surface, "lineColor", { label: "Color" }).on("change", () => { saveSurface(); render(); });

// Global settings
const gf = pane.addFolder({ title: "Global", expanded: true });
gf.addBlade({ view: "list", label: "Pattern", options: [{ text: "Grid", value: "grid" }, { text: "SMPTE", value: "smpte" }], value: "grid" }).on("change", (ev) => { global.pattern = ev.value; render(); });
gf.addBinding(global, "lineWidth", { min: 0.5, max: 10, step: 0.5, label: "Line Width" }).on("change", render);
gf.addBinding(global, "cellSize", { min: 0.3, max: 1.5, step: 0.05, label: "Cell Size" }).on("change", render);
gf.addBinding(global, "centerSize", { min: 0.5, max: 3.0, step: 0.1, label: "Center Size" }).on("change", render);
gf.addBinding(global, "checkerOpacity", { min: 0, max: 0.5, step: 0.01, label: "Checker" }).on("change", render);
gf.addBinding(global, "circles", { label: "Circles" }).on("change", render);
gf.addBinding(global, "colorbar", { label: "Color Bar" }).on("change", render);
gf.addBinding(global, "invert", { label: "Invert" }).on("change", render);
gf.addBinding(global, "credits", { label: "Credits" }).on("change", render);

// Export
function downloadCanvas(c, filename) {
  c.toBlob((blob) => {
    if (!blob) { console.error("toBlob failed for", filename); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

pane.addButton({ title: "Export PNG" }).on("click", () => {
  const c = document.createElement("canvas");
  renderToCanvas(c, surfaces[activeIdx]);
  downloadCanvas(c, `${surfaces[activeIdx].name.replace(/\s+/g, "_")}.png`);
});

pane.addButton({ title: "Export All PNGs" }).on("click", () => {
  surfaces.forEach((s, i) => {
    setTimeout(() => {
      const c = document.createElement("canvas");
      renderToCanvas(c, s);
      downloadCanvas(c, `${s.name.replace(/\s+/g, "_")}.png`);
    }, i * 300);
  });
});

// ── Drawing ──
function drawGrid(ctx, p) {
  const { width: w, height: h, cols, rows, lineColor, lineWidth, cellSize, centerSize, checkerOpacity, circles, colorbar, invert, credits } = p;
  const cellW = w / cols, cellH = h / rows;
  const fontSize = Math.max(8, Math.min(cellW, cellH) / 5);
  const bg = invert ? "#ffffff" : "#000000";
  const fg = invert ? "#000000" : lineColor;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Checkerboard
  if (checkerOpacity > 0) {
    ctx.fillStyle = alphaColor(fg, checkerOpacity);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if ((c + r) % 2 === 0)
          ctx.fillRect(Math.round(c * cellW), Math.round(r * cellH), Math.round(cellW), Math.round(cellH));
  }

  // Grid lines
  const lw = Math.round(lineWidth);
  const half = Math.floor(lw / 2);
  ctx.fillStyle = fg;
  for (let c = 1; c < cols; c++) ctx.fillRect(Math.round(c * cellW) - half, 0, lw, h);
  for (let r = 1; r < rows; r++) ctx.fillRect(0, Math.round(r * cellH) - half, w, lw);
  ctx.fillRect(0, 0, w, lw);
  ctx.fillRect(0, h - lw, w, lw);
  ctx.fillRect(0, 0, lw, h);
  ctx.fillRect(w - lw, 0, lw, h);

  // Cell numbers
  const cellFontSize = Math.max(6, fontSize * cellSize);
  const pad = cellFontSize * 0.5;
  ctx.font = `${cellFontSize}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = alphaColor(fg, 1);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      ctx.fillText(`${c},${r}`, c * cellW + pad + lw, r * cellH + pad + lw);

  // Circles
  if (circles) {
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) * 0.4;
    ctx.strokeStyle = alphaColor(fg, 0.3);
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.stroke();
    // Crosshair
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r); ctx.stroke();
  }

  // Color bar
  if (colorbar) {
    const barColors = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff", "#000000"];
    const barW = Math.min(w * 0.4, cellW * Math.min(cols, 8));
    const barH = cellH * 0.6;
    const bx = (w - barW) / 2;
    const by = h / 2 + Math.min(w, h) * 0.12;
    const segW = barW / barColors.length;
    barColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(bx + i * segW, by, segW, barH);
    });
  }

  // Center text
  const centerFontSize = fontSize * centerSize;
  drawCenterText(ctx, w, h, centerFontSize, fg, bg, p);
}

function drawSMPTE(ctx, p) {
  const { width: w, height: h, invert } = p;
  ctx.fillStyle = invert ? "#fff" : "#000";
  ctx.fillRect(0, 0, w, h);
  const barH = Math.floor(h * 2 / 3);
  const colors = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
  colors.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * w / colors.length, 0, w / colors.length, barH); });
  for (let i = 0; i < 10; i++) {
    const v = Math.round(i * 255 / 9);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(i * w / 10, barH, w / 10, h - barH);
  }
  const fontSize = Math.max(14, w / 40) * p.centerSize;
  drawCenterText(ctx, w, h, fontSize, "#ffffff", "#000000", p);
}

function drawCenterText(ctx, w, h, fontSize, textColor, bgColor, p) {
  const { name, cols, rows, credits } = p;
  const cx = w / 2, cy = h / 2;
  const lineH = fontSize * 1.4;
  const info = `${cols} x ${rows}`;

  const lines = [name, `${w} x ${h}`, info];
  if (credits) lines.push(credits);

  ctx.font = `${fontSize}px ${FONT}`;
  const maxTextW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = maxTextW + fontSize * 4;
  const boxH = lineH * (lines.length + 1);

  ctx.fillStyle = bgColor;
  ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let y = cy - boxH / 2 + lineH;

  ctx.fillStyle = textColor;
  ctx.font = `${fontSize}px ${FONT}`;
  ctx.fillText(name, cx, y); y += lineH;
  ctx.fillText(`${w} x ${h}`, cx, y); y += lineH;
  ctx.fillStyle = alphaColor(textColor, 0.6);
  ctx.fillText(info, cx, y); y += lineH;
  if (credits) { ctx.fillStyle = alphaColor(textColor, 0.4); ctx.fillText(credits, cx, y); }
}

// ── Helpers ──
function alphaColor(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Init ──
loadPreset("elverket");
rebuildSurfaceList();
