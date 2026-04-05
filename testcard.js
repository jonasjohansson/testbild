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
  cross: true,
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
    case "pm5544": drawPM5544(ctx, p); break;
    case "smpte": drawSMPTE(ctx, p); break;
  }
}

function render() {
  const s = surfaces[activeIdx];
  if (!s) return;
  renderToCanvas(canvas, s);
}

// ── Tweakpane ──
const pane = new Pane({ title: "Testbild" });

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
gf.addBlade({ view: "list", label: "Pattern", options: [{ text: "Grid", value: "grid" }, { text: "PM5544", value: "pm5544" }, { text: "SMPTE", value: "smpte" }], value: "grid" }).on("change", (ev) => { global.pattern = ev.value; render(); });
gf.addBinding(global, "lineWidth", { min: 0.5, max: 10, step: 0.5, label: "Line Width" }).on("change", render);
gf.addBinding(global, "cellSize", { min: 0.3, max: 1.5, step: 0.05, label: "Cell Size" }).on("change", render);
gf.addBinding(global, "centerSize", { min: 0.5, max: 3.0, step: 0.1, label: "Center Size" }).on("change", render);
gf.addBinding(global, "checkerOpacity", { min: 0, max: 0.5, step: 0.01, label: "Checker" }).on("change", render);
gf.addBinding(global, "circles", { label: "Circles" }).on("change", render);
gf.addBinding(global, "cross", { label: "Cross" }).on("change", render);
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

pane.addButton({ title: "Export All as ZIP" }).on("click", () => {
  exportZip().catch((e) => { console.error("ZIP failed:", e); alert("ZIP failed: " + e.message); });
});

async function exportZip() {
  const zip = new window.JSZip();
  for (const s of surfaces) {
    const c = document.createElement("canvas");
    renderToCanvas(c, s);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    zip.file(`${s.name.replace(/\s+/g, "_")}.png`, blob);
  }
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = "testcards.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

  // Cross (corner-to-corner diagonals)
  if (p.cross) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
  }

  // Circles (concentric only, no straight lines)
  if (circles) {
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(w, h) / 2;
    ctx.strokeStyle = fg;
    ctx.lineWidth = lw;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, maxR * i / 4, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(cx, cy, lw * 2, 0, Math.PI * 2); ctx.fill();
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

function drawPM5544(ctx, p) {
  const { width: w, height: h, name, credits, centerSize } = p;
  const cx = w / 2, cy = h / 2;
  const R = Math.min(w, h) * 0.45;
  const tile = Math.round(Math.min(w, h) / 13);
  const lw = Math.max(1, Math.round(w / 600));

  // ── 1. Checkerboard background ──
  // Top and bottom rows: black/white, middle rows: gray/gray
  for (let ty = 0; ty < Math.ceil(h / tile); ty++) {
    const isEdgeRow = ty === 0 || ty >= Math.ceil(h / tile) - 1;
    for (let tx = 0; tx < Math.ceil(w / tile); tx++) {
      const isEdgeCol = tx === 0 || tx >= Math.ceil(w / tile) - 1;
      if (isEdgeRow || isEdgeCol) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? "#ffffff" : "#000000";
      } else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? "#999999" : "#666666";
      }
      ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }

  // ── 2. Side strips ──
  const sw = tile;
  const midY = cy;
  // Left column 1 (inside edge)
  ctx.fillStyle = "#00c8a0"; ctx.fillRect(tile, tile, sw, midY - tile * 2);           // teal (top half)
  ctx.fillStyle = "#5060c0"; ctx.fillRect(tile, midY - tile, sw, tile);               // blue
  ctx.fillStyle = "#e04888"; ctx.fillRect(tile, midY + tile, sw, h - midY - tile * 3); // pink (bottom)
  ctx.fillStyle = "#b08820"; ctx.fillRect(tile, h - tile * 2, sw, tile);               // brown

  // Right column 1 (inside edge)
  ctx.fillStyle = "#5060c0"; ctx.fillRect(w - tile * 2, tile, sw, midY - tile * 2);    // blue (top)
  ctx.fillStyle = "#c0b830"; ctx.fillRect(w - tile * 2, midY - tile, sw, tile);        // olive
  ctx.fillStyle = "#7848c8"; ctx.fillRect(w - tile * 2, midY + tile, sw, h - midY - tile * 3); // purple
  ctx.fillStyle = "#b08820"; ctx.fillRect(w - tile * 2, h - tile * 2, sw, tile);       // brown

  // Far-left: horizontal red/gray hatching
  const hatchSize = Math.max(2, Math.round(tile / 12));
  for (let y = 0; y < h; y += hatchSize * 2) {
    ctx.fillStyle = "#d06868";
    ctx.fillRect(0, y, tile, hatchSize);
  }
  // Far-right: vertical yellow/blue hatching
  for (let x = w - tile; x < w; x += hatchSize * 2) {
    ctx.fillStyle = "#d0d050";
    ctx.fillRect(x, 0, hatchSize, h);
  }

  // ── 3. Circle interior ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  // ── 4. White top cap ──
  const capBottom = cy - R * 0.50;
  for (let y = Math.floor(cy - R); y < capBottom; y++) {
    const dy = y - cy;
    const hw = Math.sqrt(Math.max(0, R * R - dy * dy));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - hw, y, hw * 2, 1);
  }
  // Black notch at top center of white cap
  const notchW = R * 0.08;
  const notchH = R * 0.18;
  ctx.fillStyle = "#000";
  ctx.fillRect(cx - notchW / 2, cy - R, notchW, notchH);
  // Vertical center line from notch
  ctx.fillRect(cx - lw / 2, cy - R + notchH, lw, capBottom - (cy - R + notchH));

  // ── 5. White bottom crescent (between grayscale and yellow) ──
  const whiteBottom = cy + R * 0.42;
  const yellowTop = cy + R * 0.50;
  for (let y = Math.floor(whiteBottom); y < yellowTop; y++) {
    const dy = y - cy;
    const hw = Math.sqrt(Math.max(0, R * R - dy * dy));
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - hw, y, hw * 2, 1);
  }

  // ── 6. Yellow bottom crescent ──
  for (let y = Math.floor(yellowTop); y <= cy + R; y++) {
    const dy = y - cy;
    const hw = Math.sqrt(Math.max(0, R * R - dy * dy));
    ctx.fillStyle = "#d8d800";
    ctx.fillRect(cx - hw, y, hw * 2, 1);
  }
  // Red block in yellow crescent
  const redW = R * 0.14, redH = R * 0.14;
  const redY = yellowTop + (cy + R - yellowTop) * 0.2;
  ctx.fillStyle = "#d00000";
  ctx.fillRect(cx - redW / 2, redY, redW, redH);

  // ── 7. Castellation bars ──
  const castY0 = capBottom;
  const castH = R * 0.08;
  const innerW = R * 1.4;
  // Alternating black/white with varying widths (wider at edges, narrower at center)
  const castBars = 16;
  const castBarW = innerW / castBars;
  for (let i = 0; i < castBars; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#c0c0c0" : "#000000";
    ctx.fillRect(cx - innerW / 2 + i * castBarW, castY0, castBarW, castH);
  }
  // White side patches next to castellation
  ctx.fillStyle = "#808080";
  ctx.fillRect(cx - innerW / 2 - R * 0.12, castY0, R * 0.12, castH);
  ctx.fillStyle = "#808080";
  ctx.fillRect(cx + innerW / 2, castY0, R * 0.12, castH);

  // ── 8. Color bars ──
  const cbY0 = castY0 + castH;
  const cbH = R * 0.24;
  const barColors = ["#c8c800", "#00c8c8", "#00c800", "#c800c8", "#c80000", "#0000c8"];
  const cbTotalW = innerW;
  const segW = cbTotalW / barColors.length;
  // Black separator between each bar
  const sepW = Math.max(1, lw);
  barColors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(cx - cbTotalW / 2 + i * segW + sepW / 2, cbY0, segW - sepW, cbH);
  });
  // Black center column (between green and magenta, slightly wider)
  ctx.fillStyle = "#000";
  ctx.fillRect(cx - lw * 2, cbY0, lw * 4, cbH);

  // ── 9. Horizontal white line ──
  const lineY = cbY0 + cbH;
  ctx.fillStyle = "#fff";
  ctx.fillRect(cx - innerW / 2, lineY, innerW, lw);

  // ── 10. Frequency/resolution bars ──
  const freqY0 = lineY + lw;
  const freqH = R * 0.20;
  const freqs = [1, 2, 3, 5, 8, 14];
  const fSecW = innerW / freqs.length;
  for (let fi = 0; fi < freqs.length; fi++) {
    const freq = freqs[fi];
    const fx0 = cx - innerW / 2 + fi * fSecW;
    for (let x = Math.floor(fx0); x < fx0 + fSecW; x++) {
      ctx.fillStyle = Math.floor((x - fx0) / freq) % 2 === 0 ? "#ffffff" : "#000000";
      ctx.fillRect(x, freqY0, 1, freqH);
    }
  }

  // ── 11. Grayscale ramp ──
  const grayY0 = freqY0 + freqH;
  const grayH = whiteBottom - grayY0;
  const graySteps = 6;
  const gsW = innerW / graySteps;
  for (let i = 0; i < graySteps; i++) {
    const v = Math.round(i * 255 / (graySteps - 1));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(cx - innerW / 2 + i * gsW, grayY0, gsW, grayH);
  }

  ctx.restore();

  // ── 12. Circle outline ──
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, lw * 1.5);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();

  // ── 13. Center text overlay ──
  const fontSize = Math.max(12, w / 50) * centerSize;
  const lineH = fontSize * 1.3;
  const info = `${p.cols} x ${p.rows}`;
  const lines = [name, `${w} x ${h}`, info];
  if (credits) lines.push(credits);

  ctx.font = `${fontSize}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxTW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const boxW = maxTW + fontSize * 3;
  const boxH = lineH * (lines.length + 0.8);
  const boxY = cy - R * 0.32;
  ctx.fillStyle = "#000";
  ctx.fillRect(cx - boxW / 2, boxY, boxW, boxH);

  let ty = boxY + lineH * 0.8;
  ctx.fillStyle = "#fff";
  ctx.fillText(name, cx, ty); ty += lineH;
  ctx.fillText(`${w} x ${h}`, cx, ty); ty += lineH;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(info, cx, ty); ty += lineH;
  if (credits) { ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillText(credits, cx, ty); }
}

// ── Helpers ──
function alphaColor(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Init ──
loadPreset("elverket");
rebuildSurfaceList();
