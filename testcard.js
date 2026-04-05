import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm";

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

const CROSS_LAYOUTS = {
  elverket: {
    width: 6004, height: 3201,
    surfaces: {
      WALL_FRONT: { uv: { minU: 0.8405, maxU: 1.0, minV: 0.299, maxV: 0.7009 }, rotation: 270 },
      WALL_REAR:  { uv: { minU: 0.0, maxU: 0.1595, minV: 0.2991, maxV: 0.7009 }, rotation: 270 },
      WALL_LEFT:  { uv: { minU: 0.1594, maxU: 0.841, minV: 0.7008, maxV: 1.0 }, rotation: 0 },
      WALL_RIGHT: { uv: { minU: 0.1595, maxU: 0.8405, minV: 0.0, maxV: 0.2992 }, rotation: 0 },
      FLOOR:      { uv: { minU: 0.1594, maxU: 0.8405, minV: 0.299, maxV: 0.7009 }, rotation: 0 },
    },
  },
};

let crossLayout = null;

// ── State ──
const surfaces = [];
let activeIdx = 0;
let viewCrossMode = false;

const global = {
  preset: "elverket",
  surface: "WALL FRONT",
  pattern: "Grid",
  lineWidth: 2,
  cellSize: 0.75,
  centerSize: 1.0,
  checkerOpacity: 0.08,
  circles: false,
  cross: false,
  invert: false,
  credits: "\u00A9 Jonas Johansson",
};

const surface = {
  name: "WALL FRONT",
  width: 1320,
  height: 960,
  cols: 11,
  rows: 8,
  lineColor: "#ff0000",
};

// ── Surfaces ──
let surfaceController = null;

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
  global.surface = s.name;
  gui.controllersRecursive().forEach((c) => c.updateDisplay());
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

function rebuildSurfaceList() {
  if (surfaceController) surfaceController.destroy();
  const names = surfaces.map((s) => s.name);
  global.surface = surfaces[activeIdx]?.name || "";
  surfaceController = surfacesFolder.add(global, "surface", names).name("Surface").onChange((v) => {
    const idx = surfaces.findIndex((s) => s.name === v);
    if (idx >= 0) { viewCrossMode = false; loadSurface(idx); render(); }
  });
}

// ── Rendering ──
function buildParams(s) {
  return { name: s.name, width: s.w, height: s.h, cols: s.cols, rows: s.rows, lineColor: s.color || "#ff0000", ...global };
}

function renderToCanvas(c, s) {
  const p = buildParams(s);
  c.width = s.w;
  c.height = s.h;
  const ctx = c.getContext("2d");
  const patternKey = p.pattern.toLowerCase();
  if (patternKey === "grid") drawGrid(ctx, p);
  else if (patternKey === "smpte") drawSMPTE(ctx, p);
}

function render() {
  if (viewCrossMode) {
    const layout = getCrossLayout();
    if (layout) { renderCrossTemplate(canvas, layout); return; }
  }
  const s = surfaces[activeIdx];
  if (!s) return;
  renderToCanvas(canvas, s);
}

// ── lil-gui ──
const gui = new GUI({ title: "Testbild" });

gui.add(global, "preset", Object.keys(PRESETS)).name("Preset").onChange((v) => loadPreset(v));

const surfacesFolder = gui.addFolder("Surfaces");
surfacesFolder.add({ add() {
  const palette = ["#ff0000", "#00ff00", "#00ffff", "#ffff00", "#ff00ff"];
  surfaces.push({ name: "SURFACE " + surfaces.length, w: 1920, h: 1080, cols: 16, rows: 9, color: palette[surfaces.length % palette.length] });
  activeIdx = surfaces.length - 1;
  loadSurface(activeIdx);
  rebuildSurfaceList();
  render();
}}, "add").name("+ Add Surface");
surfacesFolder.add({ remove() {
  if (surfaces.length <= 1) return;
  surfaces.splice(activeIdx, 1);
  if (activeIdx >= surfaces.length) activeIdx = surfaces.length - 1;
  loadSurface(activeIdx);
  rebuildSurfaceList();
  render();
}}, "remove").name("- Remove Surface");

const surfaceFolder = gui.addFolder("Surface");
const onSurfaceChange = () => { saveSurface(); rebuildSurfaceList(); render(); };
surfaceFolder.add(surface, "name").name("Name").onFinishChange(onSurfaceChange);
surfaceFolder.add(surface, "width", 64, 8192, 1).name("Width").onChange(onSurfaceChange);
surfaceFolder.add(surface, "height", 64, 8192, 1).name("Height").onChange(onSurfaceChange);
surfaceFolder.add(surface, "cols", 1, 100, 1).name("Cols").onChange(onSurfaceChange);
surfaceFolder.add(surface, "rows", 1, 100, 1).name("Rows").onChange(onSurfaceChange);
surfaceFolder.addColor(surface, "lineColor").name("Color").onChange(() => { saveSurface(); render(); });

const globalFolder = gui.addFolder("Global");
globalFolder.add(global, "pattern", ["Grid", "SMPTE"]).name("Pattern").onChange(render);
globalFolder.add(global, "lineWidth", 0.5, 10, 0.5).name("Line Width").onChange(render);
globalFolder.add(global, "cellSize", 0.3, 1.5, 0.05).name("Cell Size").onChange(render);
globalFolder.add(global, "centerSize", 0.5, 3.0, 0.1).name("Center Size").onChange(render);
globalFolder.add(global, "checkerOpacity", 0, 0.5, 0.01).name("Checker").onChange(render);
globalFolder.add(global, "circles").name("Circles").onChange(render);
globalFolder.add(global, "cross").name("Cross").onChange(render);
globalFolder.add(global, "invert").name("Invert").onChange(render);
globalFolder.add(global, "credits").name("Credits").onFinishChange(render);

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

gui.add({ exportPNG() {
  const c = document.createElement("canvas");
  renderToCanvas(c, surfaces[activeIdx]);
  downloadCanvas(c, `${surfaces[activeIdx].name.replace(/\s+/g, "_")}.png`);
}}, "exportPNG").name("Export PNG");

gui.add({ exportZip() {
  try {
    const zip = new window.JSZip();
    let pending = surfaces.length;
    surfaces.forEach((s) => {
      const c = document.createElement("canvas");
      renderToCanvas(c, s);
      const filename = `${s.name.replace(/\s+/g, "_")}.png`;
      c.toBlob((blob) => {
        if (blob) { zip.file(filename, blob); }
        else {
          const dataUrl = c.toDataURL("image/png");
          const binary = atob(dataUrl.split(",")[1]);
          const arr = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
          zip.file(filename, arr);
        }
        pending--;
        if (pending === 0) {
          zip.generateAsync({ type: "blob" }).then((content) => {
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = "testbild.zip";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          });
        }
      }, "image/png");
    });
  } catch (e) {
    console.error("ZIP export error:", e);
    alert("ZIP export failed: " + e.message);
  }
}}, "exportZip").name("Export All as ZIP");

gui.add({ viewCross() {
  const layout = getCrossLayout();
  if (!layout) { alert("No cross layout available. Upload a UV JSON first."); return; }
  viewCrossMode = true;
  render();
}}, "viewCross").name("View Cross Template");

gui.add({ exportCross() {
  const layout = getCrossLayout();
  if (!layout) { alert("No cross layout available. Upload a UV JSON first."); return; }
  const c = document.createElement("canvas");
  renderCrossTemplate(c, layout);
  downloadCanvas(c, "cross_template.png");
}}, "exportCross").name("Export Cross Template");

gui.add({ uploadUV() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        crossLayout = { width: data.textureWidth || 4096, height: data.textureHeight || 4096, surfaces: {} };
        for (const [name, info] of Object.entries(data.surfaces || {})) {
          const key = name.replace(/_/g, " ").toUpperCase().replace(/ /g, "_");
          crossLayout.surfaces[key] = {
            uv: info.uv || info,
            rotation: info.rotation || 0,
          };
        }
        alert(`UV layout loaded: ${Object.keys(crossLayout.surfaces).length} surfaces, ${crossLayout.width}x${crossLayout.height}`);
      } catch (err) { alert("Failed to parse UV JSON: " + err.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}}, "uploadUV").name("Upload UV JSON");

function getCrossLayout() {
  const presetKey = Object.keys(PRESETS).find((k) => {
    const p = PRESETS[k];
    return p.length === surfaces.length && p.every((s, i) => s.name === surfaces[i].name);
  });
  return crossLayout || (presetKey && CROSS_LAYOUTS[presetKey]) || null;
}

function renderCrossTemplate(c, layout) {
  const { width: tw, height: th, surfaces: uvSurfaces } = layout;
  c.width = tw;
  c.height = th;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, tw, th);

  for (const s of surfaces) {
    const key = s.name.replace(/\s+/g, "_").toUpperCase();
    const entry = uvSurfaces[key];
    if (!entry) continue;

    // Support both flat format { minU, ... } and nested { uv: { minU, ... }, rotation }
    const uv = entry.uv || entry;
    const rotation = entry.rotation || 0;

    const px = Math.round(uv.minU * tw);
    const py = Math.round((1 - uv.maxV) * th);
    const pw = Math.round((uv.maxU - uv.minU) * tw);
    const ph = Math.round((uv.maxV - uv.minV) * th);

    const tmp = document.createElement("canvas");
    const rad = rotation * Math.PI / 180;

    if (rotation === 90) {
      renderToCanvas(tmp, { ...s, w: ph, h: pw });
      ctx.save();
      ctx.translate(px + pw, py);
      ctx.rotate(rad);
      ctx.drawImage(tmp, 0, 0);
      ctx.restore();
    } else if (rotation === 270 || rotation === -90) {
      renderToCanvas(tmp, { ...s, w: ph, h: pw });
      ctx.save();
      ctx.translate(px, py + ph);
      ctx.rotate(rad);
      ctx.drawImage(tmp, 0, 0);
      ctx.restore();
    } else if (rotation === 180) {
      renderToCanvas(tmp, { ...s, w: pw, h: ph });
      ctx.save();
      ctx.translate(px + pw, py + ph);
      ctx.rotate(rad);
      ctx.drawImage(tmp, 0, 0);
      ctx.restore();
    } else {
      renderToCanvas(tmp, { ...s, w: pw, h: ph });
      ctx.drawImage(tmp, px, py);
    }
  }
}

// ── Drawing ──
function drawGrid(ctx, p) {
  const { width: w, height: h, cols, rows, lineColor, lineWidth, cellSize, centerSize, checkerOpacity, circles, invert } = p;
  const cellW = w / cols, cellH = h / rows;
  const fontSize = Math.max(8, Math.min(cellW, cellH) / 5);
  const bg = invert ? "#ffffff" : "#000000";
  const fg = invert ? "#000000" : lineColor;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  if (checkerOpacity > 0) {
    ctx.fillStyle = alphaColor(fg, checkerOpacity);
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if ((c + r) % 2 === 0)
          ctx.fillRect(Math.round(c * cellW), Math.round(r * cellH), Math.round(cellW), Math.round(cellH));
  }

  const lw = Math.round(lineWidth);
  const half = Math.floor(lw / 2);
  ctx.fillStyle = fg;
  for (let c = 1; c < cols; c++) ctx.fillRect(Math.round(c * cellW) - half, 0, lw, h);
  for (let r = 1; r < rows; r++) ctx.fillRect(0, Math.round(r * cellH) - half, w, lw);
  ctx.fillRect(0, 0, w, lw);
  ctx.fillRect(0, h - lw, w, lw);
  ctx.fillRect(0, 0, lw, h);
  ctx.fillRect(w - lw, 0, lw, h);

  const cellFontSize = Math.max(6, fontSize * cellSize);
  const pad = cellFontSize * 0.5;
  ctx.font = `${cellFontSize}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = fg;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      ctx.fillText(`${c},${r}`, c * cellW + pad + lw, r * cellH + pad + lw);

  if (p.cross) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(0, h); ctx.stroke();
  }

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


  drawCenterText(ctx, w, h, fontSize * centerSize, fg, bg, p);
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
  drawCenterText(ctx, w, h, Math.max(14, w / 40) * p.centerSize, "#ffffff", "#000000", p);
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
