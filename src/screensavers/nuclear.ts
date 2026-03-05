import type { Screensaver } from '../types';

export function createNuclearPlant(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // ── Phosphor green palette ──
  const BG_COLOR = '#0a0a0a';
  const BG_PANEL = '#0a1a0a';
  const GREEN_BRIGHT = '#33ff33';
  const GREEN_MID = '#22cc22';
  const GREEN_DIM = '#117711';
  const GREEN_DARKEST = '#0a3a0a';
  const GREEN_GLOW = '#33ff33';
  const RED_BRIGHT = '#ff3333';
  const RED_DIM = '#882222';
  const AMBER_BRIGHT = '#ffaa33';

  // ── Font sizing ──
  let fontSize = 12;
  let lineH = 16;
  let charW = 8;

  // ── Panel layout ──
  interface Panel {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    draw: (now: number) => void;
    update: (dt: number) => void;
  }

  let panels: Panel[] = [];

  // ── Core temperature state ──
  let coreTemp = 375;
  let coreTempTarget = 375;
  let coreTempRate = 0.02;

  // ── Control rod state ──
  const ROD_COLS = 6;
  const ROD_ROWS = 4;
  let rodPositions: number[] = [];
  let rodTargets: number[] = [];

  // ── Coolant flow state ──
  const GRAPH_HISTORY = 200;
  let coolantHistory: number[] = [];
  let coolantBase = 4500;

  // ── Radiation state ──
  let radiationCount = 0.0;
  let radiationRate = 0.003;
  let radiationSpiking = false;

  // ── Power output state ──
  let powerOutput = 1247;
  let powerTarget = 1247;

  // ── LED state ──
  interface LED {
    label: string;
    state: 'on' | 'off' | 'blink';
    blinkRate: number;
    isRed: boolean;
  }

  let leds: LED[] = [];

  // ── Alert state ──
  interface Warning {
    text: string;
    priority: 'CAUTION' | 'WARNING' | 'NOTICE';
  }

  const WARNINGS: Warning[] = [
    { text: 'COOLANT PRESSURE LOW', priority: 'CAUTION' },
    { text: 'ROD CLUSTER B4 MISALIGNED', priority: 'WARNING' },
    { text: 'TURBINE VIBRATION DETECTED', priority: 'CAUTION' },
    { text: 'CONTAINMENT HUMIDITY ELEVATED', priority: 'NOTICE' },
    { text: 'PRIMARY LOOP TEMP DEVIATION', priority: 'CAUTION' },
    { text: 'STEAM GENERATOR LEVEL LOW', priority: 'WARNING' },
    { text: 'BACKUP DIESEL GEN TEST DUE', priority: 'NOTICE' },
    { text: 'FEEDWATER FLOW ANOMALY', priority: 'CAUTION' },
    { text: 'NEUTRON FLUX OSCILLATION', priority: 'WARNING' },
    { text: 'SPENT FUEL POOL TEMP RISING', priority: 'CAUTION' },
  ];

  let activeWarning: Warning | null = null;
  let warningAlpha = 0;
  let warningTimer = 15000;
  let warningDisplayTimer = 0;
  let logEntries = 0;

  // ── Dread machine ──
  type DreadPhase = 'NORMAL' | 'CREEPING' | 'ESCALATING' | 'RECOVERY';
  let dreadPhase: DreadPhase = 'NORMAL';
  let dreadTimer = 0;
  let dreadCycleLength = 45000;

  // ── Timing ──
  let lastTime = 0;
  let accumulator = 0;
  const UPDATE_INTERVAL = 100;

  // ── Layout computation ──
  function computeLayout() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    fontSize = Math.max(10, Math.min(16, Math.floor(height / 50)));
    lineH = Math.floor(fontSize * 1.4);
    charW = Math.floor(fontSize * 0.6);

    const titleBarH = lineH * 2;
    const contentY = titleBarH;
    const contentH = height - titleBarH;

    const row1H = Math.floor(contentH * 0.60);
    const row2H = contentH - row1H;

    const col1W = Math.floor(width / 4);

    const powerW = Math.floor(width * 0.25);
    const ledsW = Math.floor(width * 0.50);
    const alertW = width - powerW - ledsW;

    panels = [
      { x: 0, y: contentY, w: col1W, h: row1H, title: 'CORE TEMP', draw: drawCoreTemp, update: updateCoreTemp },
      { x: col1W, y: contentY, w: col1W, h: row1H, title: 'CONTROL RODS', draw: drawControlRods, update: updateControlRods },
      { x: col1W * 2, y: contentY, w: col1W, h: row1H, title: 'COOLANT FLOW', draw: drawCoolantFlow, update: updateCoolantFlow },
      { x: col1W * 3, y: contentY, w: width - col1W * 3, h: row1H, title: 'RADIATION MON', draw: drawRadiation, update: updateRadiation },
      { x: 0, y: contentY + row1H, w: powerW, h: row2H, title: 'POWER OUTPUT', draw: drawPowerOutput, update: updatePowerOutput },
      { x: powerW, y: contentY + row1H, w: ledsW, h: row2H, title: 'SYSTEM STATUS', draw: drawStatusLEDs, update: updateStatusLEDs },
      { x: powerW + ledsW, y: contentY + row1H, w: alertW, h: row2H, title: 'ALERTS', draw: drawAlerts, update: updateAlerts },
    ];
  }

  function initState() {
    coreTemp = 375;
    coreTempTarget = 375;
    coreTempRate = 0.02;

    rodPositions = [];
    rodTargets = [];
    for (let i = 0; i < ROD_COLS * ROD_ROWS; i++) {
      const pos = 0.3 + Math.random() * 0.4;
      rodPositions.push(pos);
      rodTargets.push(pos);
    }

    coolantHistory = [];
    coolantBase = 4500;

    radiationCount = 0.0;
    radiationRate = 0.003;
    radiationSpiking = false;

    powerOutput = 1247;
    powerTarget = 1247;

    leds = [
      { label: 'PUMP A', state: 'on', blinkRate: 0, isRed: false },
      { label: 'PUMP B', state: 'on', blinkRate: 0, isRed: false },
      { label: 'PUMP C', state: 'on', blinkRate: 0, isRed: false },
      { label: 'PRI COOL', state: 'on', blinkRate: 0, isRed: false },
      { label: 'VALVE 1', state: 'blink', blinkRate: 1000, isRed: false },
      { label: 'VALVE 2', state: 'on', blinkRate: 0, isRed: false },
      { label: 'VALVE 3', state: 'blink', blinkRate: 1500, isRed: false },
      { label: 'SEC COOL', state: 'on', blinkRate: 0, isRed: false },
      { label: 'AUX PWR', state: 'on', blinkRate: 0, isRed: false },
      { label: 'EMRG GEN', state: 'off', blinkRate: 0, isRed: false },
      { label: 'CONT SYS', state: 'on', blinkRate: 0, isRed: false },
      { label: 'SCRM RDY', state: 'blink', blinkRate: 800, isRed: false },
    ];

    activeWarning = null;
    warningAlpha = 0;
    warningTimer = 15000;
    warningDisplayTimer = 0;
    logEntries = 0;

    dreadPhase = 'NORMAL';
    dreadTimer = 0;
    dreadCycleLength = 45000;
    accumulator = 0;
  }

  // ── Drawing helpers ──

  function drawPanelBorder(panel: Panel) {
    if (!ctx) return;
    ctx.strokeStyle = GREEN_MID;
    ctx.lineWidth = 2;
    ctx.strokeRect(panel.x + 1, panel.y + 1, panel.w - 2, panel.h - 2);

    // Title bar background
    ctx.fillStyle = GREEN_DARKEST;
    ctx.fillRect(panel.x + 2, panel.y + 2, panel.w - 4, lineH + 2);

    // Title text
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.shadowColor = GREEN_GLOW;
    ctx.shadowBlur = 6;
    ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    const titleX = panel.x + Math.floor((panel.w - panel.title.length * charW) / 2);
    ctx.fillText(panel.title, titleX, panel.y + 4);
    ctx.shadowBlur = 0;
  }

  function drawTitleBar(now: number) {
    if (!ctx) return;

    // Background
    ctx.fillStyle = GREEN_DARKEST;
    ctx.fillRect(0, 0, width, lineH * 2);

    // Station name
    ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.shadowColor = GREEN_GLOW;
    ctx.shadowBlur = 8;
    const stationName = 'SPRINGFIELD NUCLEAR GENERATING STATION - UNIT 7';
    ctx.fillText(stationName, charW * 2, Math.floor(lineH * 0.3));
    ctx.shadowBlur = 0;

    // Clock
    const date = new Date();
    const timeStr = date.toTimeString().slice(0, 8);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

    ctx.fillStyle = GREEN_BRIGHT;
    ctx.shadowColor = GREEN_GLOW;
    ctx.shadowBlur = 6;
    ctx.fillText(timeStr, width - charW * 12, Math.floor(lineH * 0.1));
    ctx.fillText(dateStr, width - charW * 14, Math.floor(lineH * 1.1));
    ctx.shadowBlur = 0;

    // Separator line
    ctx.strokeStyle = GREEN_MID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, lineH * 2 - 1);
    ctx.lineTo(width, lineH * 2 - 1);
    ctx.stroke();
  }

  // ── CRT effects ──

  function drawScanlines() {
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  function drawFlicker(now: number) {
    if (!ctx) return;
    const flicker = Math.sin(now * 0.01) * 0.008 + Math.random() * 0.012;
    if (flicker > 0) {
      ctx.fillStyle = `rgba(51, 255, 51, ${flicker})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawVignette() {
    if (!ctx) return;
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.max(width, height) * 0.7,
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // ── Panel: Core Temperature ──

  function updateCoreTemp(_dt: number) {
    // Drift toward target
    if (coreTemp < coreTempTarget) {
      coreTemp += coreTempRate + Math.random() * 0.01;
      if (coreTemp > coreTempTarget) coreTemp = coreTempTarget;
    } else if (coreTemp > coreTempTarget) {
      coreTemp -= coreTempRate + Math.random() * 0.01;
      if (coreTemp < coreTempTarget) coreTemp = coreTempTarget;
    }
    // Add small noise
    coreTemp += (Math.random() - 0.5) * 0.3;
  }

  function drawCoreTemp(_now: number) {
    if (!ctx) return;
    const p = panels[0];
    const innerX = p.x + charW * 2;
    const innerY = p.y + lineH * 2;
    const innerH = p.h - lineH * 4;

    // Bar gauge
    const barX = innerX + charW;
    const barY = innerY;
    const barW = charW * 4;
    const barH = innerH;

    // Background
    ctx.fillStyle = GREEN_DARKEST;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeStyle = GREEN_MID;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Fill level
    const fillPct = Math.max(0, Math.min(1, (coreTemp - 300) / 200));
    const fillH = Math.floor(barH * fillPct);

    let barColor = GREEN_BRIGHT;
    if (coreTemp > 430) barColor = RED_BRIGHT;
    else if (coreTemp > 410) barColor = AMBER_BRIGHT;

    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 6;
    ctx.fillRect(barX + 1, barY + barH - fillH, barW - 2, fillH);
    ctx.shadowBlur = 0;

    // Scale markings
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'middle';
    const temps = [300, 350, 400, 450, 500];
    for (const t of temps) {
      const yPos = barY + barH - Math.floor(((t - 300) / 200) * barH);
      ctx.fillStyle = GREEN_DIM;
      ctx.fillRect(barX + barW, yPos, charW * 0.5, 1);
      ctx.fillText(String(t), barX + barW + charW, yPos);
    }

    // Warning threshold dashed line
    const warnY = barY + barH - Math.floor(((410 - 300) / 200) * barH);
    ctx.strokeStyle = AMBER_BRIGHT;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(barX, warnY);
    ctx.lineTo(barX + barW, warnY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Critical threshold dashed line
    const critY = barY + barH - Math.floor(((430 - 300) / 200) * barH);
    ctx.strokeStyle = RED_BRIGHT;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(barX, critY);
    ctx.lineTo(barX + barW, critY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Large numeric readout
    const readoutX = barX + barW + charW * 6;
    const readoutY = innerY + Math.floor(innerH * 0.25);
    ctx.font = `bold ${fontSize * 2}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 12;
    ctx.fillText(coreTemp.toFixed(1), readoutX, readoutY);
    ctx.shadowBlur = 0;

    // Unit label
    ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('DEG C', readoutX, readoutY + fontSize * 2.5);

    // Threshold labels
    ctx.fillStyle = GREEN_DIM;
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.fillText('NOM: 375', readoutX, readoutY + fontSize * 4.5);
    ctx.fillStyle = AMBER_BRIGHT;
    ctx.fillText('WARN: 410', readoutX, readoutY + fontSize * 5.5);
    ctx.fillStyle = RED_BRIGHT;
    ctx.fillText('CRIT: 430', readoutX, readoutY + fontSize * 6.5);
  }

  // ── Panel: Control Rods ──

  function updateControlRods(_dt: number) {
    for (let i = 0; i < ROD_COLS * ROD_ROWS; i++) {
      // Slowly drift toward target
      if (rodPositions[i] < rodTargets[i]) {
        rodPositions[i] += 0.002 + Math.random() * 0.001;
        if (rodPositions[i] > rodTargets[i]) rodPositions[i] = rodTargets[i];
      } else if (rodPositions[i] > rodTargets[i]) {
        rodPositions[i] -= 0.002 + Math.random() * 0.001;
        if (rodPositions[i] < rodTargets[i]) rodPositions[i] = rodTargets[i];
      }
      // Occasionally pick a new target
      if (Math.random() < 0.005) {
        rodTargets[i] = 0.2 + Math.random() * 0.6;
      }
    }
  }

  function drawControlRods(_now: number) {
    if (!ctx) return;
    const p = panels[1];
    const innerX = p.x + charW * 3;
    const innerY = p.y + lineH * 2.5;
    const innerW = p.w - charW * 6;
    const innerH = p.h - lineH * 5;

    const cellW = Math.floor(innerW / ROD_COLS);
    const cellH = Math.floor(innerH / ROD_ROWS);

    // Column headers
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = GREEN_DIM;
    for (let c = 0; c < ROD_COLS; c++) {
      const label = String.fromCharCode(65 + c); // A-F
      ctx.fillText(label, innerX + c * cellW + cellW / 2 - charW / 2, innerY - lineH);
    }

    // Row headers
    for (let r = 0; r < ROD_ROWS; r++) {
      ctx.fillText(String(r + 1), innerX - charW * 2, innerY + r * cellH + cellH / 2 - fontSize / 2);
    }

    // Draw rods
    for (let r = 0; r < ROD_ROWS; r++) {
      for (let c = 0; c < ROD_COLS; c++) {
        const idx = r * ROD_COLS + c;
        const rx = innerX + c * cellW + Math.floor(cellW * 0.2);
        const ry = innerY + r * cellH + 2;
        const rw = Math.floor(cellW * 0.6);
        const rh = cellH - 4;

        // Rod background
        ctx.fillStyle = GREEN_DARKEST;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = GREEN_DIM;
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rw, rh);

        // Rod fill (from bottom)
        const pos = rodPositions[idx];
        const fillH = Math.floor(rh * pos);
        ctx.fillStyle = GREEN_BRIGHT;
        ctx.shadowColor = GREEN_GLOW;
        ctx.shadowBlur = 3;
        ctx.fillRect(rx + 1, ry + rh - fillH, rw - 2, fillH);
        ctx.shadowBlur = 0;
      }
    }

    // Bank position average
    const avgPos = rodPositions.reduce((a, b) => a + b, 0) / rodPositions.length;
    ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
    ctx.fillStyle = GREEN_MID;
    ctx.fillText(`BANK POS: ${(avgPos * 100).toFixed(1)}%`, innerX, p.y + p.h - lineH * 1.5);
  }

  // ── Panel: Coolant Flow ──

  function updateCoolantFlow(_dt: number) {
    // Generate new data point with noise
    const noise = (Math.random() - 0.5) * 300;
    const spike = radiationSpiking ? (Math.random() - 0.5) * 600 : 0;
    const value = coolantBase + noise + spike + Math.sin(Date.now() * 0.001) * 100;
    coolantHistory.push(value);
    if (coolantHistory.length > GRAPH_HISTORY) {
      coolantHistory.shift();
    }
  }

  function drawCoolantFlow(_now: number) {
    if (!ctx) return;
    const p = panels[2];
    const margin = charW * 2;
    const graphX = p.x + margin + charW * 5;
    const graphY = p.y + lineH * 2.5;
    const graphW = p.w - margin * 2 - charW * 6;
    const graphH = p.h - lineH * 5;

    // Graph background
    ctx.fillStyle = BG_PANEL;
    ctx.fillRect(graphX, graphY, graphW, graphH);

    // Grid lines
    ctx.strokeStyle = GREEN_DARKEST;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = graphY + (graphH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(graphX, y);
      ctx.lineTo(graphX + graphW, y);
      ctx.stroke();
    }
    // Vertical grid
    for (let i = 0; i <= 4; i++) {
      const x = graphX + (graphW * i) / 4;
      ctx.beginPath();
      ctx.moveTo(x, graphY);
      ctx.lineTo(x, graphY + graphH);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = GREEN_DIM;
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'middle';
    const yLabels = [6000, 5000, 4000, 3000];
    for (let i = 0; i < yLabels.length; i++) {
      const y = graphY + (graphH * i) / 3;
      ctx.fillText(String(yLabels[i]), p.x + margin, y);
    }

    // Draw the line graph
    if (coolantHistory.length > 1) {
      ctx.strokeStyle = GREEN_BRIGHT;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = GREEN_GLOW;
      ctx.shadowBlur = 4;
      ctx.beginPath();

      for (let i = 0; i < coolantHistory.length; i++) {
        const x = graphX + (graphW * i) / GRAPH_HISTORY;
        const normalized = Math.max(0, Math.min(1, (coolantHistory[i] - 3000) / 3000));
        const y = graphY + graphH - graphH * normalized;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Border
    ctx.strokeStyle = GREEN_MID;
    ctx.lineWidth = 1;
    ctx.strokeRect(graphX, graphY, graphW, graphH);

    // Current value
    const currentFlow = coolantHistory.length > 0 ? coolantHistory[coolantHistory.length - 1] : coolantBase;
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.shadowColor = GREEN_GLOW;
    ctx.shadowBlur = 6;
    ctx.fillText(`${Math.round(currentFlow)} GPM`, graphX, p.y + p.h - lineH * 1.5);
    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('PRI LOOP', graphX + graphW - charW * 10, p.y + lineH * 2.5);
  }

  // ── Panel: Radiation Monitor ──

  function updateRadiation(_dt: number) {
    radiationCount += radiationRate + Math.random() * radiationRate * 0.5;
    if (radiationSpiking && Math.random() < 0.1) {
      radiationCount += 0.05 + Math.random() * 0.1;
    }
  }

  function drawRadiation(_now: number) {
    if (!ctx) return;
    const p = panels[3];
    const innerX = p.x + charW * 2;
    const innerY = p.y + lineH * 2.5;

    // Area monitor label
    ctx.font = `${fontSize - 1}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('AREA MONITOR', innerX, innerY);

    // Large readout
    const readoutY = innerY + lineH * 2;
    ctx.font = `bold ${fontSize * 2.2}px "Courier New", Courier, monospace`;
    const radColor = radiationCount > 2.5 ? RED_BRIGHT : radiationCount > 1.0 ? AMBER_BRIGHT : GREEN_BRIGHT;
    ctx.fillStyle = radColor;
    ctx.shadowColor = radColor;
    ctx.shadowBlur = 12;
    ctx.fillText(radiationCount.toFixed(3), innerX, readoutY);
    ctx.shadowBlur = 0;

    // Unit
    ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('mR/hr', innerX, readoutY + fontSize * 2.8);

    // Reference values
    const refY = readoutY + fontSize * 5;
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('BKG:  0.050', innerX, refY);
    ctx.fillStyle = AMBER_BRIGHT;
    ctx.fillText('ALM:  2.500', innerX, refY + lineH);

    // Status
    const statusY = refY + lineH * 3;
    ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
    let status = 'NORMAL';
    let statusColor = GREEN_BRIGHT;
    if (radiationCount > 3.0 && radiationCount < 4.2) {
      status = 'NOT GREAT, NOT TERRIBLE';
      statusColor = AMBER_BRIGHT;
    } else if (radiationCount > 2.5) {
      status = 'ALARM';
      statusColor = RED_BRIGHT;
    } else if (radiationCount > 1.0) {
      status = 'ELEVATED';
      statusColor = AMBER_BRIGHT;
    }
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('STATUS:', innerX, statusY);
    ctx.fillStyle = statusColor;
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 6;
    ctx.fillText(status, innerX + charW * 9, statusY);
    ctx.shadowBlur = 0;
  }

  // ── Panel: Power Output ──

  function updatePowerOutput(_dt: number) {
    if (powerOutput < powerTarget) {
      powerOutput += 0.1 + Math.random() * 0.05;
      if (powerOutput > powerTarget) powerOutput = powerTarget;
    } else if (powerOutput > powerTarget) {
      powerOutput -= 0.1 + Math.random() * 0.05;
      if (powerOutput < powerTarget) powerOutput = powerTarget;
    }
    powerOutput += (Math.random() - 0.5) * 0.5;
  }

  function drawPowerOutput(_now: number) {
    if (!ctx) return;
    const p = panels[4];
    const innerX = p.x + charW * 2;
    const innerY = p.y + lineH * 2.5;

    // Label
    ctx.font = `${fontSize - 1}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('ELECTRICAL OUTPUT', innerX, innerY);
    ctx.fillText('TURBINE GEN 1', innerX, innerY + lineH);

    // Large readout
    const readoutY = innerY + lineH * 3;
    ctx.font = `bold ${fontSize * 2.5}px "Courier New", Courier, monospace`;
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.shadowColor = GREEN_GLOW;
    ctx.shadowBlur = 12;
    ctx.fillText(`${Math.round(powerOutput)}`, innerX, readoutY);
    ctx.shadowBlur = 0;

    ctx.font = `${fontSize * 1.5}px "Courier New", Courier, monospace`;
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('MW', innerX + charW * 12, readoutY + fontSize * 0.5);

    // Horizontal bar
    const barY = readoutY + fontSize * 3.5;
    const barW = p.w - charW * 6;
    const barH = lineH;

    ctx.fillStyle = GREEN_DARKEST;
    ctx.fillRect(innerX, barY, barW, barH);
    ctx.strokeStyle = GREEN_MID;
    ctx.lineWidth = 1;
    ctx.strokeRect(innerX, barY, barW, barH);

    const fillPct = Math.max(0, Math.min(1, powerOutput / 1350));
    const fillW = Math.floor(barW * fillPct);
    ctx.fillStyle = GREEN_BRIGHT;
    ctx.shadowColor = GREEN_GLOW;
    ctx.shadowBlur = 4;
    ctx.fillRect(innerX + 1, barY + 1, fillW - 2, barH - 2);
    ctx.shadowBlur = 0;

    // Bar labels
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('0%', innerX, barY + barH + 4);
    ctx.fillText('100%', innerX + barW - charW * 5, barY + barH + 4);

    // Capacity
    ctx.fillStyle = GREEN_DIM;
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.fillText('RATED: 1350 MW', innerX, barY + barH + lineH + 4);
    ctx.fillText(`EFF: ${(33.0 + Math.random() * 0.5).toFixed(1)}%`, innerX + charW * 18, barY + barH + lineH + 4);
  }

  // ── Panel: Status LEDs ──

  function updateStatusLEDs(_dt: number) {
    // LED blinking is handled in draw based on time
  }

  function drawStatusLEDs(now: number) {
    if (!ctx) return;
    const p = panels[5];
    const cols = 4;
    const rows = 3;
    const innerX = p.x + charW * 2;
    const innerY = p.y + lineH * 2;
    const cellW = Math.floor((p.w - charW * 4) / cols);
    const cellH = Math.floor((p.h - lineH * 3) / rows);
    const ledRadius = Math.min(Math.floor(charW * 1.2), Math.floor(cellH * 0.2));

    for (let i = 0; i < leds.length && i < cols * rows; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = innerX + col * cellW + cellW / 2;
      const cy = innerY + row * cellH + cellH * 0.35;
      const led = leds[i];

      // Determine if on
      let isOn = led.state === 'on';
      if (led.state === 'blink' && led.blinkRate > 0) {
        isOn = (Math.floor(now / led.blinkRate) % 2) === 0;
      }

      const onColor = led.isRed ? RED_BRIGHT : GREEN_BRIGHT;
      const offColor = led.isRed ? RED_DIM : GREEN_DIM;

      // Draw LED circle
      ctx.beginPath();
      ctx.arc(cx, cy, ledRadius, 0, Math.PI * 2);
      if (isOn && led.state !== 'off') {
        ctx.fillStyle = onColor;
        ctx.shadowColor = onColor;
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = offColor;
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // LED border
      ctx.strokeStyle = GREEN_DIM;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = isOn && led.state !== 'off' ? GREEN_MID : GREEN_DIM;
      ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(led.label, cx, cy + ledRadius + 4);
      ctx.textAlign = 'left';
    }
  }

  // ── Panel: Alerts ──

  function updateAlerts(dt: number) {
    // Warning timer
    warningTimer -= dt;
    if (warningTimer <= 0 && !activeWarning) {
      // Trigger a warning
      activeWarning = WARNINGS[Math.floor(Math.random() * WARNINGS.length)];
      warningAlpha = 0;
      warningDisplayTimer = 4000;
      logEntries++;
      // Next warning in 10-30 seconds normally, faster during escalation
      warningTimer = dreadPhase === 'ESCALATING' ? 3000 + Math.random() * 5000 : 10000 + Math.random() * 20000;
    }

    if (activeWarning) {
      warningDisplayTimer -= dt;
      if (warningDisplayTimer > 3000) {
        // Fade in
        warningAlpha = Math.min(1, warningAlpha + 0.05);
      } else if (warningDisplayTimer > 1000) {
        warningAlpha = 1;
      } else if (warningDisplayTimer > 0) {
        // Fade out
        warningAlpha = Math.max(0, warningAlpha - 0.03);
      } else {
        activeWarning = null;
        warningAlpha = 0;
      }
    }
  }

  function drawAlerts(_now: number) {
    if (!ctx) return;
    const p = panels[6];
    const innerX = p.x + charW * 2;
    const innerY = p.y + lineH * 2.5;

    // Header
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText('ANNUNCIATOR PANEL', innerX, innerY);

    // Active warning
    if (activeWarning && warningAlpha > 0) {
      const warnY = innerY + lineH * 2;

      let color: string;
      if (activeWarning.priority === 'WARNING') {
        color = RED_BRIGHT;
      } else if (activeWarning.priority === 'CAUTION') {
        color = AMBER_BRIGHT;
      } else {
        color = GREEN_BRIGHT;
      }

      ctx.globalAlpha = warningAlpha;
      ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      const prefix = activeWarning.priority + ':';
      ctx.fillText(prefix, innerX, warnY);
      ctx.fillText(activeWarning.text, innerX, warnY + lineH);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Log count
    ctx.font = `${fontSize - 2}px "Courier New", Courier, monospace`;
    ctx.fillStyle = GREEN_DIM;
    ctx.fillText(`LOG ENTRIES: ${logEntries}`, innerX, p.y + p.h - lineH * 1.5);
  }

  // ── Dread machine ──

  function startCreepingDread() {
    coreTempTarget = 405 + Math.random() * 15;
    coolantBase = 4200 + Math.random() * 200;
    radiationRate = 0.006;
    powerTarget = 1280 + Math.random() * 40;

    // One LED goes red
    const ledIdx = Math.floor(Math.random() * leds.length);
    leds[ledIdx].isRed = true;
    leds[ledIdx].state = 'blink';
    leds[ledIdx].blinkRate = 500;
  }

  function startEscalation() {
    coreTempTarget = 425 + Math.random() * 10;
    coreTempRate = 0.08;
    coolantBase = 3800;
    radiationRate = 0.02;
    radiationSpiking = true;
    warningTimer = 0; // trigger immediate warning

    for (let i = 0; i < 2; i++) {
      const idx = Math.floor(Math.random() * leds.length);
      leds[idx].isRed = true;
      leds[idx].state = 'blink';
      leds[idx].blinkRate = 300;
    }
  }

  function startRecovery() {
    coreTempTarget = 370 + Math.random() * 15;
    coreTempRate = 0.02;
    coolantBase = 4400 + Math.random() * 200;
    radiationRate = 0.003;
    radiationSpiking = false;
    powerTarget = 1230 + Math.random() * 30;

    for (const led of leds) {
      led.isRed = false;
    }

    // Reset radiation if it got too high
    if (radiationCount > 3) {
      radiationCount = 0.2 + Math.random() * 0.3;
    }
  }

  function updateDreadMachine(dt: number) {
    dreadTimer += dt;

    switch (dreadPhase) {
      case 'NORMAL':
        if (dreadTimer > dreadCycleLength) {
          dreadPhase = 'CREEPING';
          dreadTimer = 0;
          dreadCycleLength = 20000 + Math.random() * 40000;
          startCreepingDread();
        }
        break;

      case 'CREEPING':
        if (dreadTimer > dreadCycleLength) {
          if (Math.random() < 0.3) {
            dreadPhase = 'ESCALATING';
            dreadTimer = 0;
            dreadCycleLength = 8000 + Math.random() * 12000;
            startEscalation();
          } else {
            dreadPhase = 'RECOVERY';
            dreadTimer = 0;
            dreadCycleLength = 10000 + Math.random() * 20000;
            startRecovery();
          }
        }
        break;

      case 'ESCALATING':
        if (dreadTimer > dreadCycleLength) {
          dreadPhase = 'RECOVERY';
          dreadTimer = 0;
          dreadCycleLength = 15000 + Math.random() * 25000;
          startRecovery();
        }
        break;

      case 'RECOVERY':
        if (dreadTimer > dreadCycleLength) {
          dreadPhase = 'NORMAL';
          dreadTimer = 0;
          dreadCycleLength = 30000 + Math.random() * 60000;
        }
        break;
    }
  }

  // ── Main render ──

  function drawFrame(now: number) {
    if (!ctx) return;

    // Clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Title bar
    drawTitleBar(now);

    // Panels
    for (const panel of panels) {
      drawPanelBorder(panel);
      panel.draw(now);
    }

    // CRT effects
    drawScanlines();
    drawFlicker(now);
    drawVignette();
  }

  // ── Main loop ──

  function loop(now: number) {
    if (!ctx) return;

    const dt = now - lastTime;
    lastTime = now;

    // Fixed timestep simulation
    accumulator += dt;
    while (accumulator >= UPDATE_INTERVAL) {
      accumulator -= UPDATE_INTERVAL;
      for (const panel of panels) {
        panel.update(UPDATE_INTERVAL);
      }
      updateDreadMachine(UPDATE_INTERVAL);
    }

    drawFrame(now);
    animationFrame = requestAnimationFrame(loop);
  }

  function handleResize() {
    computeLayout();
    if (ctx) drawFrame(performance.now());
  }

  return {
    name: 'Nuclear',
    description: 'Green phosphor control room with a faint sense of dread',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      computeLayout();
      initState();
      lastTime = performance.now();
      drawFrame(lastTime);
      animationFrame = requestAnimationFrame(loop);
      window.addEventListener('resize', handleResize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      window.removeEventListener('resize', handleResize);
    },
  };
}
