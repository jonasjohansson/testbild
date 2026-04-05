// ── State ──
const surfaces = [];
let activeSurfaceIdx = 0;

// ── DOM ──
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const surfaceList = document.getElementById("surfaceList");

const fields = {
  name: document.getElementById("surfaceName"),
  w: document.getElementById("surfaceW"),
  h: document.getElementById("surfaceH"),
  cols: document.getElementById("gridCols"),
  rows: document.getElementById("gridRows"),
  pattern: document.getElementById("pattern"),
  lineColor: document.getElementById("lineColor"),
  info: document.getElementById("surfaceInfo"),
};

// ── Default surfaces (elverket) ──
const defaults = [
  { name: "WALL FRONT", w: 1920, h: 1080, cols: 11, rows: 8, pattern: "grid", lineColor: "#cc0000", info: "11m x 8m" },
  { name: "WALL REAR", w: 1920, h: 1080, cols: 11, rows: 8, pattern: "grid", lineColor: "#cc0000", info: "11m x 8m" },
  { name: "WALL LEFT", w: 1920, h: 1080, cols: 34, rows: 8, pattern: "grid", lineColor: "#cc0000", info: "34m x 8m" },
  { name: "WALL RIGHT", w: 1920, h: 1080, cols: 34, rows: 8, pattern: "grid", lineColor: "#cc0000", info: "34m x 8m" },
  { name: "FLOOR", w: 1920, h: 1080, cols: 34, rows: 11, pattern: "grid", lineColor: "#cc0000", info: "34m x 11m" },
];

defaults.forEach((s) => surfaces.push({ ...s }));

// ── Surface list UI ──
function renderSurfaceList() {
  surfaceList.innerHTML = "";
  surfaces.forEach((s, i) => {
    const li = document.createElement("li");
    li.className = "surface-item" + (i === activeSurfaceIdx ? " active" : "");
    li.innerHTML = `<span class="name">${s.name}</span> <span class="dims">${s.w}x${s.h} ${s.cols}x${s.rows}</span>`;
    li.onclick = () => {
      activeSurfaceIdx = i;
      loadSurface(i);
      renderSurfaceList();
    };
    // Delete on right click
    li.oncontextmenu = (e) => {
      e.preventDefault();
      if (surfaces.length > 1) {
        surfaces.splice(i, 1);
        if (activeSurfaceIdx >= surfaces.length) activeSurfaceIdx = surfaces.length - 1;
        loadSurface(activeSurfaceIdx);
        renderSurfaceList();
      }
    };
    surfaceList.appendChild(li);
  });
}

function loadSurface(idx) {
  const s = surfaces[idx];
  fields.name.value = s.name;
  fields.w.value = s.w;
  fields.h.value = s.h;
  fields.cols.value = s.cols;
  fields.rows.value = s.rows;
  fields.pattern.value = s.pattern;
  fields.lineColor.value = s.lineColor;
  fields.info.value = s.info;
  generate();
}

function saveSurface() {
  const s = surfaces[activeSurfaceIdx];
  s.name = fields.name.value;
  s.w = parseInt(fields.w.value) || 1920;
  s.h = parseInt(fields.h.value) || 1080;
  s.cols = parseInt(fields.cols.value) || 11;
  s.rows = parseInt(fields.rows.value) || 8;
  s.pattern = fields.pattern.value;
  s.lineColor = fields.lineColor.value;
  s.info = fields.info.value;
  renderSurfaceList();
}

// ── Pattern generators ──
function generate() {
  saveSurface();
  const s = surfaces[activeSurfaceIdx];
  canvas.width = s.w;
  canvas.height = s.h;

  switch (s.pattern) {
    case "grid": drawGrid(s); break;
    case "smpte": drawSMPTE(s); break;
    case "gradient": drawGradient(s); break;
    case "white": drawSolid(s, "#ffffff"); break;
    case "red": drawSolid(s, "#ff0000"); break;
    case "green": drawSolid(s, "#00ff00"); break;
    case "blue": drawSolid(s, "#0000ff"); break;
    case "checker": drawChecker(s); break;
    case "crosshatch": drawCrosshatch(s); break;
  }
}

function drawGrid(s) {
  const { w, h, cols, rows, name, lineColor, info } = s;
  const cellW = w / cols;
  const cellH = h / rows;

  // Black background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  // Parse line color for cell number tinting
  const lc = lineColor;

  // Grid lines
  ctx.strokeStyle = lc;
  ctx.lineWidth = Math.max(1, w / 960);

  for (let col = 0; col <= cols; col++) {
    const x = col * cellW;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let row = 0; row <= rows; row++) {
    const y = row * cellH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Cell numbers
  const fontSize = Math.max(8, Math.min(cellW, cellH) / 5);
  ctx.font = `${fontSize}px 'SF Mono', 'Fira Code', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Subtle hue shift per cell
      const t = (row * cols + col) / (rows * cols);
      ctx.fillStyle = adjustAlpha(lc, 0.4);
      ctx.fillText(`${col},${row}`, col * cellW + cellW / 2, row * cellH + cellH / 2);
    }
  }

  // Center info
  const centerX = w / 2;
  const centerY = h / 2;
  const titleSize = Math.max(16, w / 30);
  const subSize = Math.max(10, w / 60);

  // Background box
  const boxW = Math.max(titleSize * name.length * 0.7, 300);
  const boxH = titleSize * 4;
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH);

  // Title
  ctx.fillStyle = lc;
  ctx.font = `bold ${titleSize}px 'SF Mono', 'Fira Code', monospace`;
  ctx.fillText(name, centerX, centerY - titleSize * 0.8);

  // Resolution
  ctx.font = `${subSize}px 'SF Mono', 'Fira Code', monospace`;
  ctx.fillText(`${w} x ${h}`, centerX, centerY + subSize * 0.2);

  // Physical dimensions
  if (info) {
    ctx.fillStyle = adjustAlpha(lc, 0.6);
    ctx.fillText(info, centerX, centerY + subSize * 1.5);
  }
}

function drawSMPTE(s) {
  const { w, h } = s;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  // Top 67%: color bars
  const barH = Math.floor(h * 2 / 3);
  const colors = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
  const barW = w / colors.length;
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(i * barW, 0, barW, barH);
  });

  // Bottom 33%: grayscale ramp
  const steps = 10;
  const stepW = w / steps;
  for (let i = 0; i < steps; i++) {
    const v = Math.round(i * 255 / (steps - 1));
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(i * stepW, barH, stepW, h - barH);
  }

  // Label
  drawCenterLabel(s);
}

function drawGradient(s) {
  const { w, h } = s;
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
  drawCenterLabel(s);
}

function drawSolid(s, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, s.w, s.h);
  drawCenterLabel(s);
}

function drawChecker(s) {
  const { w, h, cols, rows } = s;
  const cellW = w / cols;
  const cellH = h / rows;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if ((col + row) % 2 === 0) {
        ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
      }
    }
  }
  drawCenterLabel(s);
}

function drawCrosshatch(s) {
  const { w, h, lineColor } = s;
  const spacing = Math.max(w, h) / 20;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;

  for (let x = 0; x < w; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += spacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // Diagonals
  ctx.strokeStyle = adjustAlpha(lineColor, 0.4);
  for (let d = -h; d < w + h; d += spacing) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + h, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d, h); ctx.lineTo(d + h, 0); ctx.stroke();
  }
  // Center cross
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

  drawCenterLabel(s);
}

function drawCenterLabel(s) {
  const { w, h, name } = s;
  const size = Math.max(14, w / 40);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${size}px 'SF Mono', 'Fira Code', monospace`;

  // Background
  const metrics = ctx.measureText(name);
  const boxW = metrics.width + size * 2;
  const boxH = size * 4;
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(w / 2 - boxW / 2, h / 2 - boxH / 2, boxW, boxH);

  ctx.fillStyle = "#fff";
  ctx.fillText(name, w / 2, h / 2 - size * 0.5);
  ctx.font = `${size * 0.6}px 'SF Mono', 'Fira Code', monospace`;
  ctx.fillStyle = "#888";
  ctx.fillText(`${w} x ${h}`, w / 2, h / 2 + size * 0.6);
}

// ── Helpers ──
function adjustAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// ── Export ──
function exportPng() {
  const s = surfaces[activeSurfaceIdx];
  const a = document.createElement("a");
  a.download = `${s.name.replace(/\s+/g, "_")}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

function exportAll() {
  const saved = activeSurfaceIdx;
  surfaces.forEach((_, i) => {
    activeSurfaceIdx = i;
    loadSurface(i);
    const s = surfaces[i];
    const a = document.createElement("a");
    a.download = `${s.name.replace(/\s+/g, "_")}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  });
  activeSurfaceIdx = saved;
  loadSurface(saved);
  renderSurfaceList();
}

// ── Events ──
document.getElementById("generate").onclick = generate;
document.getElementById("exportPng").onclick = exportPng;
document.getElementById("exportAll").onclick = exportAll;
document.getElementById("addSurface").onclick = () => {
  surfaces.push({
    name: "SURFACE " + surfaces.length,
    w: 1920, h: 1080, cols: 16, rows: 9,
    pattern: "grid", lineColor: "#cc0000", info: "",
  });
  activeSurfaceIdx = surfaces.length - 1;
  loadSurface(activeSurfaceIdx);
  renderSurfaceList();
};

// Auto-generate on field change
Object.values(fields).forEach((el) => {
  el.addEventListener("input", generate);
});

// Init
renderSurfaceList();
loadSurface(0);
