import type { Screensaver } from '../types';

export function createTestPattern(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let time = 0;
  let patternIndex = 0;
  let patternTimer = 0;
  const PATTERN_DURATION = 8; // seconds per pattern
  const FADE_DURATION = 1.0; // seconds for crossfade
  let offscreen1: OffscreenCanvas | null = null;
  let offscreen2: OffscreenCanvas | null = null;
  let offCtx1: OffscreenCanvasRenderingContext2D | null = null;
  let offCtx2: OffscreenCanvasRenderingContext2D | null = null;

  const patterns = [
    drawSMPTEBars,
    drawPhilipsPattern,
    drawColorBars75,
    drawGridPattern,
    drawCirclePattern,
    drawGradientBars,
    drawCheckerboard,
    drawConvergencePattern,
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    offscreen1 = new OffscreenCanvas(width, height);
    offscreen2 = new OffscreenCanvas(width, height);
    offCtx1 = offscreen1.getContext('2d')!;
    offCtx2 = offscreen2.getContext('2d')!;
  }

  // SMPTE color bars (the classic US test pattern)
  function drawSMPTEBars(c: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
    // Top 67% - main color bars
    const topH = Math.floor(h * 0.67);
    const midH = Math.floor(h * 0.08);
    const botH = h - topH - midH;

    const mainColors = [
      '#c0c0c0', '#c0c000', '#00c0c0', '#00c000',
      '#c000c0', '#c00000', '#0000c0',
    ];
    const barW = w / 7;
    for (let i = 0; i < 7; i++) {
      c.fillStyle = mainColors[i];
      c.fillRect(Math.floor(i * barW), 0, Math.ceil(barW) + 1, topH);
    }

    // Middle strip - reverse order at reduced intensity
    const midColors = [
      '#0000c0', '#131313', '#c000c0', '#131313',
      '#00c0c0', '#131313', '#c0c0c0',
    ];
    for (let i = 0; i < 7; i++) {
      c.fillStyle = midColors[i];
      c.fillRect(Math.floor(i * barW), topH, Math.ceil(barW) + 1, midH);
    }

    // Bottom strip - pluge pattern and gradient
    const bottomColors = [
      '#00214c', '#ffffff', '#32006a', '#131313',
    ];
    const bottomWidths = [w / 6, w / 6, w / 6, w / 2];
    let bx = 0;
    for (let i = 0; i < 4; i++) {
      c.fillStyle = bottomColors[i];
      c.fillRect(Math.floor(bx), topH + midH, Math.ceil(bottomWidths[i]) + 1, botH);
      bx += bottomWidths[i];
    }

    // PLUGE bars within the black section
    const plugeX = w / 2;
    const plugeW = w / 2;
    // sub-black, black, super-black reference
    c.fillStyle = '#090909';
    c.fillRect(plugeX, topH + midH, plugeW * 0.15, botH);
    c.fillStyle = '#131313';
    c.fillRect(plugeX + plugeW * 0.15, topH + midH, plugeW * 0.15, botH);
    c.fillStyle = '#1d1d1d';
    c.fillRect(plugeX + plugeW * 0.3, topH + midH, plugeW * 0.15, botH);
    c.fillStyle = '#131313';
    c.fillRect(plugeX + plugeW * 0.45, topH + midH, plugeW * 0.55, botH);
  }

  // Philips PM5544-style circle pattern (European classic)
  function drawPhilipsPattern(c: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
    c.fillStyle = '#1a1a1a';
    c.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.45;

    // Outer circle
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fillStyle = '#2a2a2a';
    c.fill();

    // Color blocks in corners of the circle
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();

    // Top color strip
    const stripH = r * 0.25;
    const stripY = cy - r * 0.55;
    const colors = ['#ffffff', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff', '#000000'];
    const stripW = (r * 2) / colors.length;
    for (let i = 0; i < colors.length; i++) {
      c.fillStyle = colors[i];
      c.fillRect(cx - r + i * stripW, stripY, stripW + 1, stripH);
    }

    // Bottom color strip (reversed)
    const botStripY = cy + r * 0.30;
    for (let i = 0; i < colors.length; i++) {
      c.fillStyle = colors[colors.length - 1 - i];
      c.fillRect(cx - r + i * stripW, botStripY, stripW + 1, stripH);
    }

    // Side color blocks
    const sideW = r * 0.2;
    // Left
    c.fillStyle = '#ffff00';
    c.fillRect(cx - r, stripY + stripH, sideW, botStripY - stripY - stripH);
    // Right
    c.fillStyle = '#0000ff';
    c.fillRect(cx + r - sideW, stripY + stripH, sideW, botStripY - stripY - stripH);

    c.restore();

    // Center circle with crosshair
    c.beginPath();
    c.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
    c.fillStyle = '#1a1a1a';
    c.fill();
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.stroke();

    // Crosshair
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - r * 0.18, cy);
    c.lineTo(cx + r * 0.18, cy);
    c.moveTo(cx, cy - r * 0.18);
    c.lineTo(cx, cy + r * 0.18);
    c.stroke();

    // Outer circle border
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.stroke();

    // Grid lines inside circle
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();

    c.strokeStyle = '#555555';
    c.lineWidth = 1;
    const gridStep = r * 0.2;
    for (let x = cx - r; x <= cx + r; x += gridStep) {
      c.beginPath();
      c.moveTo(x, cy - r);
      c.lineTo(x, cy + r);
      c.stroke();
    }
    for (let y = cy - r; y <= cy + r; y += gridStep) {
      c.beginPath();
      c.moveTo(cx - r, y);
      c.lineTo(cx + r, y);
      c.stroke();
    }
    c.restore();

    // Corner identification markers
    const cornerSize = Math.min(w, h) * 0.06;
    c.fillStyle = '#ffffff';
    c.font = `bold ${cornerSize}px monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    // Frequency gratings on sides
    const gratingH = r * 0.15;
    const gratingY = cy - gratingH / 2;
    // Left grating
    for (let i = 0; i < 20; i++) {
      c.fillStyle = i % 2 === 0 ? '#ffffff' : '#000000';
      c.fillRect(cx - r * 0.95 + i * (r * 0.08), gratingY, r * 0.04, gratingH);
    }
  }

  // 75% color bars (standard broadcast)
  function drawColorBars75(c: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
    const colors = [
      '#bfbfbf', '#bfbf00', '#00bfbf', '#00bf00',
      '#bf00bf', '#bf0000', '#0000bf',
    ];
    const barW = w / colors.length;
    for (let i = 0; i < colors.length; i++) {
      c.fillStyle = colors[i];
      c.fillRect(Math.floor(i * barW), 0, Math.ceil(barW) + 1, h);
    }

    // Center identification text
    c.fillStyle = 'rgba(0, 0, 0, 0.5)';
    const boxW = w * 0.3;
    const boxH = h * 0.08;
    c.fillRect(w / 2 - boxW / 2, h / 2 - boxH / 2, boxW, boxH);
    c.fillStyle = '#ffffff';
    c.font = `bold ${Math.floor(boxH * 0.6)}px monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('75% COLOUR BARS', w / 2, h / 2);
  }

  // Grid/resolution pattern
  function drawGridPattern(c: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, w, h);

    c.strokeStyle = '#333333';
    c.lineWidth = 1;

    // Fine grid
    const step = Math.min(w, h) / 40;
    for (let x = 0; x < w; x += step) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 0; y < h; y += step) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }

    // Major grid (every 5)
    c.strokeStyle = '#666666';
    c.lineWidth = 2;
    const majorStep = step * 5;
    for (let x = 0; x < w; x += majorStep) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 0; y < h; y += majorStep) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }

    // Center crosshair
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(w / 2, 0);
    c.lineTo(w / 2, h);
    c.moveTo(0, h / 2);
    c.lineTo(w, h / 2);
    c.stroke();

    // Center circle
    c.beginPath();
    c.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.stroke();

    // Corner resolution wedges
    const fontSize = Math.floor(Math.min(w, h) * 0.02);
    c.fillStyle = '#ffffff';
    c.font = `${fontSize}px monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(`${w}×${h}`, w / 2, h / 2 + fontSize * 1.5);

    // Diagonal lines
    c.strokeStyle = '#444444';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w, h);
    c.moveTo(w, 0);
    c.lineTo(0, h);
    c.stroke();

    // Safe area markers (90% and 80%)
    c.strokeStyle = '#555555';
    c.lineWidth = 1;
    c.setLineDash([5, 5]);
    c.strokeRect(w * 0.05, h * 0.05, w * 0.9, h * 0.9);
    c.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
    c.setLineDash([]);
  }

  // Circle/radial test pattern (like Indian TV pattern)
  function drawCirclePattern(c: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
    c.fillStyle = '#1a1a1a';
    c.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.45;

    // Concentric circles with alternating colors
    const numCircles = 12;
    for (let i = numCircles; i >= 0; i--) {
      const r = maxR * (i / numCircles);
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      if (i % 2 === 0) {
        c.fillStyle = '#ffffff';
      } else {
        c.fillStyle = '#000000';
      }
      c.fill();
    }

    // Radial lines
    c.strokeStyle = '#888888';
    c.lineWidth = 1;
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
      c.stroke();
    }

    // Color wedges at 4 quadrants
    const wedgeR = maxR * 0.3;
    const wedgeColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
    const wedgeAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, wedgeR, wedgeAngles[i] - 0.2, wedgeAngles[i] + 0.2);
      c.closePath();
      c.fillStyle = wedgeColors[i];
      c.globalAlpha = 0.6;
      c.fill();
      c.globalAlpha = 1.0;
    }

    // Center dot
    c.beginPath();
    c.arc(cx, cy, 4, 0, Math.PI * 2);
    c.fillStyle = '#ff0000';
    c.fill();

    // Outer border
    c.beginPath();
    c.arc(cx, cy, maxR, 0, Math.PI * 2);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.stroke();

    // Text labels
    const fontSize = Math.floor(Math.min(w, h) * 0.025);
    c.fillStyle = '#ffffff';
    c.font = `bold ${fontSize}px monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('TEST PATTERN', cx, cy + maxR + fontSize * 1.5);
  }

  // Gradient bars for linearity testing
  function drawGradientBars(c: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, w, h);

    const barH = h / 6;

    // White gradient
    for (let x = 0; x < w; x++) {
      const v = Math.floor((x / w) * 255);
      c.fillStyle = `rgb(${v},${v},${v})`;
      c.fillRect(x, 0, 1, barH);
    }

    // Red gradient
    for (let x = 0; x < w; x++) {
      const v = Math.floor((x / w) * 255);
      c.fillStyle = `rgb(${v},0,0)`;
      c.fillRect(x, barH, 1, barH);
    }

    // Green gradient
    for (let x = 0; x < w; x++) {
      const v = Math.floor((x / w) * 255);
      c.fillStyle = `rgb(0,${v},0)`;
      c.fillRect(x, barH * 2, 1, barH);
    }

    // Blue gradient
    for (let x = 0; x < w; x++) {
      const v = Math.floor((x / w) * 255);
      c.fillStyle = `rgb(0,0,${v})`;
      c.fillRect(x, barH * 3, 1, barH);
    }

    // Staircase pattern (discrete steps)
    const steps = 16;
    const stepW = w / steps;
    for (let i = 0; i < steps; i++) {
      const v = Math.floor((i / (steps - 1)) * 255);
      c.fillStyle = `rgb(${v},${v},${v})`;
      c.fillRect(Math.floor(i * stepW), barH * 4, Math.ceil(stepW) + 1, barH);
    }

    // Reverse gradient
    for (let x = 0; x < w; x++) {
      const v = 255 - Math.floor((x / w) * 255);
      c.fillStyle = `rgb(${v},${v},${v})`;
      c.fillRect(x, barH * 5, 1, barH);
    }

    // Labels
    const fontSize = Math.floor(barH * 0.25);
    c.font = `${fontSize}px monospace`;
    c.textAlign = 'left';
    c.textBaseline = 'top';
    const labels = ['WHITE', 'RED', 'GREEN', 'BLUE', 'STAIRCASE', 'REVERSE'];
    for (let i = 0; i < labels.length; i++) {
      c.fillStyle = i === 0 || i >= 4 ? '#000000' : '#ffffff';
      c.fillText(labels[i], 10, barH * i + 5);
    }
  }

  // Checkerboard pattern
  function drawCheckerboard(c: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, w, h);

    const squareSize = Math.min(w, h) / 32;

    for (let y = 0; y < h; y += squareSize) {
      for (let x = 0; x < w; x += squareSize) {
        const col = Math.floor(x / squareSize);
        const row = Math.floor(y / squareSize);
        if ((col + row) % 2 === 0) {
          c.fillStyle = '#ffffff';
          c.fillRect(x, y, squareSize, squareSize);
        }
      }
    }

    // Center region with color checkerboard
    const centerSize = Math.min(w, h) * 0.3;
    const csx = w / 2 - centerSize / 2;
    const csy = h / 2 - centerSize / 2;
    const cSquare = centerSize / 8;
    const checkerColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const colorIdx = (col + row) % checkerColors.length;
        c.fillStyle = (col + row) % 2 === 0 ? checkerColors[colorIdx] : '#000000';
        c.fillRect(csx + col * cSquare, csy + row * cSquare, cSquare, cSquare);
      }
    }

    // Border around center
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    c.strokeRect(csx, csy, centerSize, centerSize);
  }

  // Convergence/alignment pattern
  function drawConvergencePattern(c: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D, w: number, h: number) {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Dot grid
    const dotSpacing = Math.min(w, h) / 20;
    c.fillStyle = '#ffffff';
    for (let x = dotSpacing; x < w; x += dotSpacing) {
      for (let y = dotSpacing; y < h; y += dotSpacing) {
        c.beginPath();
        c.arc(x, y, 2, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Center crosshair with color separation
    const crossLen = Math.min(w, h) * 0.3;
    c.lineWidth = 2;

    // Red horizontal
    c.strokeStyle = '#ff0000';
    c.beginPath();
    c.moveTo(cx - crossLen, cy - 1);
    c.lineTo(cx + crossLen, cy - 1);
    c.stroke();

    // Green center
    c.strokeStyle = '#00ff00';
    c.beginPath();
    c.moveTo(cx - crossLen, cy);
    c.lineTo(cx + crossLen, cy);
    c.moveTo(cx, cy - crossLen);
    c.lineTo(cx, cy + crossLen);
    c.stroke();

    // Blue horizontal
    c.strokeStyle = '#0000ff';
    c.beginPath();
    c.moveTo(cx - crossLen, cy + 1);
    c.lineTo(cx + crossLen, cy + 1);
    c.stroke();

    // Concentric circles for convergence
    const maxR = Math.min(w, h) * 0.4;
    for (let i = 1; i <= 5; i++) {
      const r = maxR * (i / 5);
      c.beginPath();
      c.arc(cx, cy, r, 0, Math.PI * 2);
      c.strokeStyle = i % 2 === 0 ? '#888888' : '#444444';
      c.lineWidth = 1;
      c.stroke();
    }

    // Corner crosses for geometry check
    const cornerInset = Math.min(w, h) * 0.1;
    const crossSize = Math.min(w, h) * 0.04;
    const corners = [
      [cornerInset, cornerInset],
      [w - cornerInset, cornerInset],
      [cornerInset, h - cornerInset],
      [w - cornerInset, h - cornerInset],
    ];
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    for (const [px, py] of corners) {
      c.beginPath();
      c.moveTo(px - crossSize, py);
      c.lineTo(px + crossSize, py);
      c.moveTo(px, py - crossSize);
      c.lineTo(px, py + crossSize);
      c.stroke();
    }

    // Edge midpoint markers
    const midCross = Math.min(w, h) * 0.03;
    const mids = [
      [cx, cornerInset],
      [cx, h - cornerInset],
      [cornerInset, cy],
      [w - cornerInset, cy],
    ];
    c.strokeStyle = '#aaaaaa';
    for (const [px, py] of mids) {
      c.beginPath();
      c.moveTo(px - midCross, py);
      c.lineTo(px + midCross, py);
      c.moveTo(px, py - midCross);
      c.lineTo(px, py + midCross);
      c.stroke();
    }
  }

  function loop() {
    if (!ctx || !offCtx1 || !offCtx2 || !offscreen1 || !offscreen2) return;

    const dt = 1 / 60;
    time += dt;
    patternTimer += dt;

    const currentPattern = patternIndex % patterns.length;
    const nextPattern = (patternIndex + 1) % patterns.length;

    if (patternTimer >= PATTERN_DURATION) {
      patternTimer = 0;
      patternIndex++;
    }

    // Draw current pattern
    offCtx1.clearRect(0, 0, width, height);
    patterns[currentPattern](offCtx1, width, height);

    // Check if we're in the fade zone
    const fadeStart = PATTERN_DURATION - FADE_DURATION;
    if (patternTimer >= fadeStart) {
      const fadeProgress = (patternTimer - fadeStart) / FADE_DURATION;

      // Draw next pattern
      offCtx2.clearRect(0, 0, width, height);
      patterns[nextPattern](offCtx2, width, height);

      // Composite with crossfade
      ctx.globalAlpha = 1;
      ctx.drawImage(offscreen1, 0, 0);
      ctx.globalAlpha = fadeProgress;
      ctx.drawImage(offscreen2, 0, 0);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(offscreen1, 0, 0);
    }

    // Subtle scanline overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Test',
    description: 'Classic TV test patterns',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = 0;
      patternIndex = 0;
      patternTimer = 0;
      resize();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      offCtx1 = null;
      offCtx2 = null;
      offscreen1 = null;
      offscreen2 = null;
      window.removeEventListener('resize', resize);
    },
  };
}
