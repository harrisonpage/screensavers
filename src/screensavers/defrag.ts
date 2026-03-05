// Author: Harrison Page
// License: MIT
// Created: 25-Feb-2026

import type { Screensaver } from '../types';

export function createDefrag(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // ── Block types ──
  const EMPTY = 0;
  const FRAG = 1;
  const OPT = 2;
  const UNMOV = 3;
  const BAD = 4;

  // ── DOS CGA-style colors (IBM blue theme) ──
  const BG_BLUE = '#0000AA';
  const TITLE_BG = '#0000AA';
  const PANEL_BG = '#0000AA';
  const TEXT_YELLOW = '#FFFF54';
  const TEXT_WHITE = '#AAAAAA';
  const TEXT_BRIGHT = '#FFFFFF';
  const TEXT_RED = '#FF5555';
  const BORDER_CYAN = '#55FFFF';

  // Block colors — authentic DOS defrag palette
  const COLOR_EMPTY = '#0000AA';      // Same as background (empty = bg colored with dot pattern)
  const COLOR_USED = '#FFFFFF';       // White = used/unfragmented blocks
  const COLOR_OPTIMIZED = '#FFFF54';  // Yellow = optimized (defragged)
  const COLOR_FRAG = '#FFFFFF';       // White = used (fragmented, same visual as used)
  const COLOR_UNMOV = '#FF5555';      // Red = unmovable
  const COLOR_BAD = '#FF5555';        // Red = bad sector
  const COLOR_READING = '#55FFFF';    // Cyan = reading
  const COLOR_WRITING = '#55FF55';    // Green = writing

  // ── Grid state ──
  const BLOCK_SIZE = 8;
  const BLOCK_GAP = 2;
  const CELL_SIZE = BLOCK_SIZE + BLOCK_GAP;

  let gridCols = 0;
  let gridRows = 0;
  let totalCells = 0;
  let grid: number[] = [];

  // Grid area bounds (pixel coords within canvas)
  let gridX = 0;
  let gridY = 0;
  let gridW = 0;
  let gridH = 0;

  // ── Defrag state ──
  let phase: 'DEFRAG' | 'DONE' = 'DEFRAG';
  let stepState = 'FIND_FRAG';
  let readCursor = 0;
  let writeCursor = 0;
  let currentReadIdx = -1;
  let readHighlight = -1;
  let writeHighlight = -1;
  let pctComplete = 0;
  let doneTimer = 0;
  let elapsedMs = 0;
  let clusterNum = 0;
  let statusText = 'Reading...';

  // ── Timing ──
  let lastTime = 0;
  let accumulator = 0;
  const BASE_INTERVAL = 50; // ms per defrag step

  // ── DOS font sizing ──
  let fontSize = 12;
  let lineH = 16;
  let charW = 8;

  function computeLayout() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    // Scale font to screen
    fontSize = Math.max(10, Math.min(16, Math.floor(height / 50)));
    lineH = Math.floor(fontSize * 1.4);
    charW = Math.floor(fontSize * 0.6);

    // Layout regions:
    // Top bar: 2 lines (title + separator)
    // Grid area: bulk of screen
    // Bottom area: status box + legend + progress (~8 lines)
    const topH = lineH * 3;
    const bottomH = lineH * 10;

    gridX = charW * 2;
    gridY = topH;
    gridW = width - charW * 4;
    gridH = height - topH - bottomH;

    // Compute grid dimensions
    gridCols = Math.floor(gridW / CELL_SIZE);
    gridRows = Math.floor(gridH / CELL_SIZE);
    totalCells = gridCols * gridRows;
  }

  function initDrive() {
    grid = new Array(totalCells);

    const sysEnd = Math.floor(totalCells * 0.04);
    const dataEnd = Math.floor(totalCells * 0.78);

    for (let i = 0; i < totalCells; i++) {
      const r = Math.random();
      if (i < sysEnd) {
        // System area: unmovable + some optimized
        if (r < 0.60) grid[i] = UNMOV;
        else if (r < 0.85) grid[i] = OPT;
        else grid[i] = FRAG;
      } else if (i < dataEnd) {
        // Data area: heavily fragmented with gaps
        if (r < 0.40) grid[i] = FRAG;
        else if (r < 0.52) grid[i] = OPT;
        else if (r < 0.58) grid[i] = UNMOV;
        else grid[i] = EMPTY;
      } else {
        // Tail: mostly free
        if (r < 0.10) grid[i] = FRAG;
        else if (r < 0.14) grid[i] = OPT;
        else grid[i] = EMPTY;
      }
    }

    // Sprinkle bad sectors
    const numBad = Math.max(2, Math.floor(totalCells * 0.002));
    for (let i = 0; i < numBad; i++) {
      const idx = sysEnd + Math.floor(Math.random() * (totalCells - sysEnd));
      if (grid[idx] !== UNMOV) grid[idx] = BAD;
    }

    // Reset state
    phase = 'DEFRAG';
    stepState = 'FIND_FRAG';
    readCursor = sysEnd;
    writeCursor = 0;
    for (let i = 0; i < totalCells; i++) {
      if (grid[i] === EMPTY) { writeCursor = i; break; }
    }
    currentReadIdx = -1;
    readHighlight = -1;
    writeHighlight = -1;
    pctComplete = 0;
    doneTimer = 0;
    elapsedMs = 0;
    clusterNum = 0;
    statusText = 'Reading...';
    accumulator = 0;
  }

  // ── Drawing helpers ──

  function drawDOSChar(x: number, y: number, char: string, color: string) {
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.fillText(char, x, y);
  }

  function drawDOSText(x: number, y: number, text: string, color: string) {
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawSingleBorder(x: number, y: number, w: number, h: number, title?: string) {
    if (!ctx) return;
    // Draw single-line DOS box using Unicode box-drawing chars
    ctx.fillStyle = BORDER_CYAN;

    // Top
    drawDOSChar(x, y, '\u250C', BORDER_CYAN); // ┌
    for (let i = 1; i < Math.floor(w / charW) - 1; i++) {
      drawDOSChar(x + i * charW, y, '\u2500', BORDER_CYAN); // ─
    }
    drawDOSChar(x + w - charW, y, '\u2510', BORDER_CYAN); // ┐

    // Sides
    const rows = Math.floor(h / lineH);
    for (let r = 1; r < rows; r++) {
      drawDOSChar(x, y + r * lineH, '\u2502', BORDER_CYAN); // │
      drawDOSChar(x + w - charW, y + r * lineH, '\u2502', BORDER_CYAN); // │
    }

    // Bottom
    drawDOSChar(x, y + h, '\u2514', BORDER_CYAN); // └
    for (let i = 1; i < Math.floor(w / charW) - 1; i++) {
      drawDOSChar(x + i * charW, y + h, '\u2500', BORDER_CYAN); // ─
    }
    drawDOSChar(x + w - charW, y + h, '\u2518', BORDER_CYAN); // ┘

    // Title centered on top border
    if (title) {
      const titleX = x + Math.floor((w - title.length * charW) / 2);
      drawDOSText(titleX - charW, y, ' ', BG_BLUE);
      drawDOSText(titleX, y, ` ${title} `, TEXT_YELLOW);
    }
  }

  function drawDoubleBorder(x: number, y: number, w: number, h: number, title?: string) {
    if (!ctx) return;
    ctx.fillStyle = BORDER_CYAN;

    // Top
    drawDOSChar(x, y, '\u2554', BORDER_CYAN); // ╔
    for (let i = 1; i < Math.floor(w / charW) - 1; i++) {
      drawDOSChar(x + i * charW, y, '\u2550', BORDER_CYAN); // ═
    }
    drawDOSChar(x + w - charW, y, '\u2557', BORDER_CYAN); // ╗

    // Sides
    const rows = Math.floor(h / lineH);
    for (let r = 1; r < rows; r++) {
      drawDOSChar(x, y + r * lineH, '\u2551', BORDER_CYAN); // ║
      drawDOSChar(x + w - charW, y + r * lineH, '\u2551', BORDER_CYAN); // ║
    }

    // Bottom
    drawDOSChar(x, y + h, '\u255A', BORDER_CYAN); // ╚
    for (let i = 1; i < Math.floor(w / charW) - 1; i++) {
      drawDOSChar(x + i * charW, y + h, '\u2550', BORDER_CYAN); // ═
    }
    drawDOSChar(x + w - charW, y + h, '\u255D', BORDER_CYAN); // ╝

    if (title) {
      const titleX = x + Math.floor((w - (title.length + 2) * charW) / 2);
      drawDOSText(titleX, y, ` ${title} `, TEXT_YELLOW);
    }
  }

  function drawBlock(index: number) {
    if (!ctx || index < 0 || index >= totalCells) return;
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    const x = gridX + col * CELL_SIZE;
    const y = gridY + row * CELL_SIZE;
    const type = grid[index];
    const isReading = index === readHighlight;
    const isWriting = index === writeHighlight;

    // Clear cell area
    ctx.fillStyle = BG_BLUE;
    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

    if (type === EMPTY && !isReading && !isWriting) {
      // Empty block: just a small dot in the center
      ctx.fillStyle = '#000088';
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
      ctx.fillStyle = '#0000CC';
      const dotX = x + Math.floor(BLOCK_SIZE / 2);
      const dotY = y + Math.floor(BLOCK_SIZE / 2);
      ctx.fillRect(dotX, dotY, 1, 1);
    } else {
      let fillColor: string;
      if (isReading) fillColor = COLOR_READING;
      else if (isWriting) fillColor = COLOR_WRITING;
      else if (type === FRAG) fillColor = COLOR_FRAG;
      else if (type === OPT) fillColor = COLOR_OPTIMIZED;
      else if (type === UNMOV) fillColor = COLOR_UNMOV;
      else if (type === BAD) fillColor = COLOR_BAD;
      else fillColor = COLOR_USED;

      ctx.fillStyle = fillColor;
      ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);

      // Inner dot for used/frag blocks (like the reference images)
      if (!isReading && !isWriting && (type === FRAG || type === OPT)) {
        ctx.fillStyle = BG_BLUE;
        const dotX = x + Math.floor(BLOCK_SIZE / 2) - 1;
        const dotY = y + Math.floor(BLOCK_SIZE / 2) - 1;
        ctx.fillRect(dotX, dotY, 2, 2);
      }

      // Bad sector marker
      if (type === BAD && !isReading && !isWriting) {
        ctx.fillStyle = TEXT_BRIGHT;
        ctx.fillRect(x + 2, y + 2, 1, 1);
        ctx.fillRect(x + BLOCK_SIZE - 3, y + 2, 1, 1);
        ctx.fillRect(x + 2, y + BLOCK_SIZE - 3, 1, 1);
        ctx.fillRect(x + BLOCK_SIZE - 3, y + BLOCK_SIZE - 3, 1, 1);
        ctx.fillRect(x + Math.floor(BLOCK_SIZE / 2) - 1, y + Math.floor(BLOCK_SIZE / 2) - 1, 1, 1);
      }

      // Reading indicator: "r" letter
      if (isReading) {
        ctx.fillStyle = '#003333';
        const cx = x + Math.floor(BLOCK_SIZE / 2) - 1;
        const cy = y + Math.floor(BLOCK_SIZE / 2) - 1;
        ctx.fillRect(cx, cy, 2, 2);
      }

      // Writing indicator: "W" letter
      if (isWriting) {
        ctx.fillStyle = '#003300';
        const cx = x + Math.floor(BLOCK_SIZE / 2) - 1;
        const cy = y + Math.floor(BLOCK_SIZE / 2) - 1;
        ctx.fillRect(cx, cy, 2, 2);
      }
    }
  }

  function drawAllBlocks() {
    if (!ctx) return;
    for (let i = 0; i < totalCells; i++) {
      drawBlock(i);
    }
  }

  function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function drawUI() {
    if (!ctx) return;

    // Clear entire canvas with DOS blue
    ctx.fillStyle = BG_BLUE;
    ctx.fillRect(0, 0, width, height);

    // Set font
    ctx.font = `${fontSize}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';

    // ── Title bar ──
    const titleY = Math.floor(lineH * 0.3);
    const title = 'Optimize';
    drawDOSText(charW * 2, titleY, title, TEXT_WHITE);

    const escText = 'Esc = Stop Defrag';
    drawDOSText(width - charW * 2 - escText.length * charW, titleY, escText, TEXT_WHITE);

    // ── Separator line under title ──
    const sepY = titleY + lineH;
    ctx.fillStyle = BORDER_CYAN;
    for (let x = 0; x < width; x += charW) {
      drawDOSChar(x, sepY, '\u2500', BORDER_CYAN);
    }

    // ── Draw all blocks ──
    drawAllBlocks();

    // ── Dotted separator between grid and bottom panels ──
    const sepY2 = gridY + gridRows * CELL_SIZE + Math.floor(lineH * 0.3);
    for (let x = charW; x < width - charW; x += charW * 2) {
      ctx.fillStyle = TEXT_WHITE;
      ctx.fillRect(x, sepY2 + Math.floor(lineH * 0.4), 2, 2);
    }

    // ── Bottom panels ──
    const bottomY = sepY2 + lineH;
    const panelW = Math.floor((width - charW * 6) / 2);

    // ── Status panel (left) ──
    const statusX = charW * 2;
    const statusH = lineH * 6;
    drawDoubleBorder(statusX, bottomY, panelW, statusH, 'Status');

    // Cluster info
    const innerX = statusX + charW * 2;
    const innerY = bottomY + lineH;
    drawDOSText(innerX, innerY, `Cluster ${clusterNum.toLocaleString()}`, TEXT_WHITE);

    // Completion percentage on same line, right-aligned
    const pctStr = `${pctComplete}%`;
    drawDOSText(statusX + panelW - charW * 2 - pctStr.length * charW, innerY, pctStr, TEXT_WHITE);

    // Mini progress bar
    const barY = innerY + lineH;
    const barW = panelW - charW * 6;
    const barH = lineH;
    // Draw bar background
    ctx.fillStyle = '#000088';
    ctx.fillRect(innerX, barY, barW, barH);
    // Draw filled portion
    const fillW = Math.floor((barW * pctComplete) / 100);
    if (fillW > 0) {
      ctx.fillStyle = TEXT_BRIGHT;
      // Hatched pattern for progress bar
      for (let bx = 0; bx < fillW; bx += 3) {
        ctx.fillRect(innerX + bx, barY, 2, barH);
      }
    }

    // Elapsed time
    const timeY = barY + lineH + Math.floor(lineH * 0.4);
    const timeStr = `Elapsed Time: ${formatTime(elapsedMs)}`;
    const timeX = statusX + Math.floor((panelW - timeStr.length * charW) / 2);
    drawDOSText(timeX, timeY, timeStr, TEXT_WHITE);

    // Optimization mode
    const modeY = timeY + lineH;
    const modeStr = 'Full Optimization';
    const modeX = statusX + Math.floor((panelW - modeStr.length * charW) / 2);
    drawDOSText(modeX, modeY, modeStr, TEXT_WHITE);

    // ── Legend panel (right) ──
    const legendX = statusX + panelW + charW * 2;
    drawDoubleBorder(legendX, bottomY, panelW, statusH, 'Legend');

    const legInnerX = legendX + charW * 3;
    const legColW = Math.floor(panelW / 2) - charW * 2;
    let legY = bottomY + lineH;

    // Legend items - left column
    drawLegendItem(legInnerX, legY, COLOR_USED, 'Used', TEXT_WHITE);
    legY += lineH;
    drawLegendItem(legInnerX, legY, COLOR_READING, 'Reading', TEXT_WHITE);
    legY += lineH;
    drawLegendItem(legInnerX, legY, COLOR_BAD, 'Bad', TEXT_WHITE);

    // Legend items - right column
    legY = bottomY + lineH;
    const rightColX = legendX + Math.floor(panelW / 2) + charW;
    drawLegendSwatch(rightColX, legY, '#000088');
    drawDOSText(rightColX + charW * 2, legY, '- Unused', TEXT_WHITE);
    legY += lineH;
    drawLegendItem(rightColX, legY, COLOR_WRITING, 'Writing', TEXT_WHITE);
    legY += lineH;
    drawLegendItem(rightColX, legY, COLOR_UNMOV, 'Unmovable', TEXT_WHITE);

    // Drive info
    legY += Math.floor(lineH * 1.2);
    const driveInfo = `Drive C: 1 block = ${Math.floor(totalCells / 41)} clusters`;
    drawDOSText(legendX + charW * 3, legY, driveInfo, TEXT_WHITE);

    // ── Bottom status bar ──
    const barBottomY = height - lineH - Math.floor(lineH * 0.3);
    drawDOSText(charW * 2, barBottomY, statusText, TEXT_RED);

    const versionStr = 'zFRAG - v1.0';
    drawDOSText(width - charW * 2 - versionStr.length * charW, barBottomY, versionStr, TEXT_WHITE);
  }

  function drawLegendSwatch(x: number, y: number, color: string) {
    if (!ctx) return;
    const swatchSize = Math.floor(fontSize * 0.7);
    const sy = y + Math.floor((lineH - swatchSize) / 2);
    ctx.fillStyle = color;
    ctx.fillRect(x, sy, swatchSize, swatchSize);
    // Border
    ctx.strokeStyle = TEXT_WHITE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, sy + 0.5, swatchSize - 1, swatchSize - 1);
  }

  function drawLegendItem(x: number, y: number, color: string, label: string, textColor: string) {
    if (!ctx) return;
    drawLegendSwatch(x, y, color);
    drawDOSText(x + charW * 2, y, `- ${label}`, textColor);
  }

  // ── Defrag logic ──

  function findNextFrag(from: number): number {
    for (let i = from; i < totalCells; i++) {
      if (grid[i] === FRAG) return i;
    }
    return -1;
  }

  function findNextEmpty(from: number): number {
    for (let i = from; i < totalCells; i++) {
      if (grid[i] === EMPTY) return i;
    }
    return -1;
  }

  function stepDefrag() {
    if (phase === 'DONE') {
      doneTimer++;
      if (doneTimer > 300) {
        refragmentDrive();
      }
      return;
    }

    clusterNum += Math.floor(Math.random() * 12) + 1;

    // Clear previous highlights
    const oldRead = readHighlight;
    const oldWrite = writeHighlight;
    readHighlight = -1;
    writeHighlight = -1;
    if (oldRead >= 0) drawBlock(oldRead);
    if (oldWrite >= 0) drawBlock(oldWrite);

    if (stepState === 'FIND_FRAG') {
      const idx = findNextFrag(readCursor);
      if (idx === -1) {
        phase = 'DONE';
        pctComplete = 100;
        statusText = 'Defragmentation complete.';
        return;
      }
      currentReadIdx = idx;
      readCursor = idx + 1;
      stepState = 'READING';

      readHighlight = idx;
      drawBlock(idx);
      statusText = 'Reading...';

    } else if (stepState === 'READING') {
      readHighlight = currentReadIdx;
      drawBlock(currentReadIdx);
      stepState = 'CONVERT_READ';

    } else if (stepState === 'CONVERT_READ') {
      grid[currentReadIdx] = EMPTY;
      drawBlock(currentReadIdx);
      stepState = 'FIND_EMPTY';

    } else if (stepState === 'FIND_EMPTY') {
      let emptyIdx = findNextEmpty(writeCursor);
      if (emptyIdx === -1) emptyIdx = findNextEmpty(0);
      if (emptyIdx === -1) {
        stepState = 'FIND_FRAG';
        return;
      }

      writeHighlight = emptyIdx;
      grid[emptyIdx] = OPT;
      drawBlock(emptyIdx);
      writeCursor = emptyIdx + 1;
      statusText = 'Writing...';
      stepState = 'SETTLE_WRITE';

    } else if (stepState === 'SETTLE_WRITE') {
      writeHighlight = -1;
      if (writeCursor > 0) drawBlock(writeCursor - 1);
      stepState = 'FIND_FRAG';

      // Update progress
      const remaining = grid.filter(t => t === FRAG).length;
      const totalData = grid.filter(t => t === FRAG || t === OPT).length;
      if (totalData > 0) {
        pctComplete = Math.min(99, Math.floor((1 - remaining / totalData) * 100));
      }
      statusText = 'Reading...';
    }
  }

  function refragmentDrive() {
    const sysEnd = Math.floor(totalCells * 0.04);
    for (let i = sysEnd; i < totalCells; i++) {
      if (grid[i] === OPT && Math.random() < 0.35) {
        grid[i] = Math.random() < 0.6 ? FRAG : EMPTY;
      }
    }
    for (let i = Math.floor(totalCells * 0.78); i < totalCells; i++) {
      if (grid[i] === EMPTY && Math.random() < 0.07) {
        grid[i] = FRAG;
      }
    }

    phase = 'DEFRAG';
    stepState = 'FIND_FRAG';
    readCursor = sysEnd;
    writeCursor = 0;
    for (let i = 0; i < totalCells; i++) {
      if (grid[i] === EMPTY) { writeCursor = i; break; }
    }
    pctComplete = 0;
    doneTimer = 0;
    readHighlight = -1;
    writeHighlight = -1;
    clusterNum = 0;
    elapsedMs = 0;
    statusText = 'Reading...';
  }

  // ── Main loop ──
  function loop(now: number) {
    if (!ctx) return;

    const dt = now - lastTime;
    lastTime = now;

    if (phase !== 'DONE') {
      elapsedMs += dt;
    }

    accumulator += dt;
    const interval = BASE_INTERVAL;

    let stepped = false;
    if (accumulator >= interval) {
      accumulator -= interval;
      if (accumulator > interval) accumulator = 0;
      stepDefrag();
      stepped = true;
    }

    // Redraw UI every frame (for elapsed timer updates)
    // But only do full redraws periodically to save CPU
    if (stepped || Math.floor(now / 500) !== Math.floor((now - dt) / 500)) {
      drawUI();
    }

    animationFrame = requestAnimationFrame(loop);
  }

  function handleResize() {
    computeLayout();
    initDrive();
    if (ctx) drawUI();
  }

  return {
    name: 'Defrag',
    description: 'DOS-style disk defragmenter (circa 1995)',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      computeLayout();
      initDrive();
      lastTime = performance.now();
      drawUI();
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
