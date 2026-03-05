// Author: Harrison Page
// License: MIT
// Created: 25-Feb-2026

import type { Screensaver } from '../types';
import { EMOJIS } from './emoji-data';

// --- Interfaces ---

interface Reel {
  strip: string[];
  position: number;
  speed: number;
  targetIndex: number;
  state: 'idle' | 'spinning' | 'decelerating' | 'stopped';
  bounceOffset: number;
  bounceVelocity: number;
}

interface CoinParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

interface Bulb {
  x: number;
  y: number;
  phase: number;
}

type GameState =
  | 'idle'
  | 'spin_up'
  | 'spinning'
  | 'stopping'
  | 'evaluating'
  | 'celebrating'
  | 'losing';

type WinType = 'jackpot' | 'big' | 'small' | 'none';

// --- Constants ---

const REEL_COUNT = 3;
const VISIBLE_ROWS = 3;
const STRIP_LENGTH = 50;
const COIN_EMOJIS = ['🪙', '💰', '💎', '✨', '🎉'];
const LUCKY_EMOJIS = ['🍒', '💎', '7️⃣', '🎰', '💰', '🍀', '⭐', '🔔'];

const IDLE_DURATION = 1500;
const SPIN_UP_DURATION = 500;
const FULL_SPIN_DURATION = 2000;
const REEL_STOP_STAGGER = 600;
const EVAL_PAUSE = 400;
const CELEBRATE_DURATIONS: Record<string, number> = {
  jackpot: 5000,
  big: 3000,
  small: 1500,
};
const LOSE_DURATION = 1000;

const BULB_COUNT = 36;
const MAX_SPIN_SPEED = 0.8;

// --- Helpers ---

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wrapIndex(i: number, len: number): number {
  return ((i % len) + len) % len;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// --- Factory ---

export function createEmojiSlotMachine(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // Game state
  let state: GameState = 'idle';
  let stateStartTime = 0;
  let spinCount = 0;
  let reels: Reel[] = [];
  let particles: CoinParticle[] = [];
  let bulbs: Bulb[] = [];
  let winType: WinType = 'none';
  let leverAngle = 0;

  // Layout
  let machineX = 0;
  let machineY = 0;
  let machineW = 0;
  let machineH = 0;
  let reelXPositions: number[] = [];
  let reelY = 0;
  let reelW = 0;
  let reelH = 0;
  let rowH = 0;
  let emojiSize = 0;
  let headerH = 0;
  let footerH = 0;

  function computeLayout() {
    const scale = Math.min(width, height);
    machineW = Math.min(width * 0.8, scale * 0.9);
    machineH = machineW * 0.72;

    // Clamp height
    if (machineH > height * 0.85) {
      machineH = height * 0.85;
      machineW = machineH / 0.72;
    }

    machineX = (width - machineW) / 2;
    machineY = (height - machineH) / 2;

    headerH = machineH * 0.14;
    footerH = machineH * 0.12;

    reelW = machineW * 0.24;
    reelH = machineH - headerH - footerH - machineH * 0.08;
    const reelGap = machineW * 0.04;
    const totalReelsW = REEL_COUNT * reelW + (REEL_COUNT - 1) * reelGap;
    const reelStartX = machineX + (machineW - totalReelsW) / 2;
    reelY = machineY + headerH + machineH * 0.03;

    reelXPositions = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      reelXPositions.push(reelStartX + i * (reelW + reelGap));
    }

    rowH = reelH / VISIBLE_ROWS;
    emojiSize = Math.min(reelW * 0.65, rowH * 0.75);
  }

  function createBulbs() {
    bulbs = [];
    const pad = 8;
    const mx = machineX + pad;
    const my = machineY + pad;
    const mw = machineW - pad * 2;
    const mh = machineH - pad * 2;
    const perimeter = 2 * (mw + mh);

    for (let i = 0; i < BULB_COUNT; i++) {
      const t = (i / BULB_COUNT) * perimeter;
      let bx: number, by: number;

      if (t < mw) {
        bx = mx + t;
        by = my;
      } else if (t < mw + mh) {
        bx = mx + mw;
        by = my + (t - mw);
      } else if (t < 2 * mw + mh) {
        bx = mx + mw - (t - mw - mh);
        by = my + mh;
      } else {
        bx = mx;
        by = my + mh - (t - 2 * mw - mh);
      }

      bulbs.push({ x: bx, y: by, phase: (i / BULB_COUNT) * Math.PI * 2 });
    }
  }

  function createStrip(): string[] {
    const start = Math.floor(Math.random() * EMOJIS.length);
    const strip: string[] = [];
    for (let i = 0; i < STRIP_LENGTH; i++) {
      strip.push(EMOJIS[(start + i) % EMOJIS.length]);
    }
    return shuffle(strip);
  }

  function initReels() {
    reels = [];
    for (let i = 0; i < REEL_COUNT; i++) {
      reels.push({
        strip: createStrip(),
        position: Math.floor(Math.random() * STRIP_LENGTH),
        speed: 0,
        targetIndex: 0,
        state: 'idle',
        bounceOffset: 0,
        bounceVelocity: 0,
      });
    }
  }

  function setState(newState: GameState) {
    state = newState;
    stateStartTime = performance.now();
  }

  function elapsed(): number {
    return performance.now() - stateStartTime;
  }

  // --- Win rigging ---

  function determineTargets() {
    const shouldJackpot = spinCount % 10 === 0 && spinCount > 0;
    const shouldWin = spinCount % 3 === 0;

    if (shouldJackpot || shouldWin) {
      // Pick a fun emoji for the win
      const pool = shouldJackpot ? LUCKY_EMOJIS : EMOJIS;
      const winEmoji = pool[Math.floor(Math.random() * pool.length)];
      const winRow = shouldJackpot ? 1 : Math.floor(Math.random() * VISIBLE_ROWS);

      for (const reel of reels) {
        // We need winEmoji at position targetIndex + winRow
        // So set targetIndex such that the middle visible row lines up
        const target = Math.floor(Math.random() * (STRIP_LENGTH - VISIBLE_ROWS)) + 1;
        reel.strip[wrapIndex(target + winRow, STRIP_LENGTH)] = winEmoji;
        reel.targetIndex = target;
      }
    } else {
      // Random targets
      for (const reel of reels) {
        reel.targetIndex =
          Math.floor(Math.random() * (STRIP_LENGTH - VISIBLE_ROWS)) + 1;
      }
    }
  }

  // --- Win evaluation ---

  function getVisibleEmoji(reel: Reel, row: number): string {
    return reel.strip[wrapIndex(Math.round(reel.position) + row, STRIP_LENGTH)];
  }

  function evaluateWin(): WinType {
    // Check each row for three-of-a-kind
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const e0 = getVisibleEmoji(reels[0], row);
      const e1 = getVisibleEmoji(reels[1], row);
      const e2 = getVisibleEmoji(reels[2], row);

      if (e0 === e1 && e1 === e2) {
        return row === 1 ? 'jackpot' : 'big';
      }
    }

    // Check middle row for 2 matching
    const m0 = getVisibleEmoji(reels[0], 1);
    const m1 = getVisibleEmoji(reels[1], 1);
    const m2 = getVisibleEmoji(reels[2], 1);
    if (m0 === m1 || m1 === m2 || m0 === m2) {
      return 'small';
    }

    // Check for lucky emoji on middle row
    if (
      LUCKY_EMOJIS.includes(m0) ||
      LUCKY_EMOJIS.includes(m1) ||
      LUCKY_EMOJIS.includes(m2)
    ) {
      return 'small';
    }

    return 'none';
  }

  // --- Particles ---

  function burstCoins(count: number) {
    const originX = width / 2;
    const originY = machineY + machineH * 0.45;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 5,
        emoji: COIN_EMOJIS[Math.floor(Math.random() * COIN_EMOJIS.length)],
        size: 16 + Math.random() * 24,
        opacity: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
      });
    }
  }

  function updateAndDrawParticles() {
    if (!ctx) return;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.vy += 0.12;
      p.vx *= 0.98;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity -= 0.006;

      if (p.opacity <= 0 || p.y > height + 30) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.opacity;
      ctx.font = `${p.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // --- Drawing ---

  function drawBackground() {
    if (!ctx) return;
    // Dark radial gradient
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7,
    );
    grad.addColorStop(0, '#0a0a20');
    grad.addColorStop(1, '#020208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawMachineFrame() {
    if (!ctx) return;

    // Machine body
    const bodyGrad = ctx.createLinearGradient(
      machineX,
      machineY,
      machineX,
      machineY + machineH,
    );
    bodyGrad.addColorStop(0, '#3a3a3a');
    bodyGrad.addColorStop(0.5, '#2a2a2a');
    bodyGrad.addColorStop(1, '#1a1a1a');

    roundRect(ctx, machineX, machineY, machineW, machineH, 16);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Gold border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner border
    roundRect(
      ctx,
      machineX + 6,
      machineY + 6,
      machineW - 12,
      machineH - 12,
      12,
    );
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Header text
    const titleSize = headerH * 0.5;
    ctx.font = `bold ${titleSize}px "Arial", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(
      'EMOJI  SLOTS',
      machineX + machineW / 2,
      machineY + headerH * 0.55,
    );
    ctx.shadowBlur = 0;
  }

  function drawReelWindow(reel: Reel, rx: number) {
    if (!ctx) return;

    // Reel background
    roundRect(ctx, rx, reelY, reelW, reelH, 6);
    ctx.fillStyle = '#0a0a0a';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Clip to reel area
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, reelY, reelW, reelH);
    ctx.clip();

    // Draw emojis
    const pos = reel.position;
    const frac = pos - Math.floor(pos);
    const startIdx = Math.floor(pos) - 1;

    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = rx + reelW / 2;

    for (let i = 0; i < VISIBLE_ROWS + 2; i++) {
      const stripIdx = wrapIndex(startIdx + i, STRIP_LENGTH);
      const emoji = reel.strip[stripIdx];
      const y = reelY + (i - 1 + (1 - frac)) * rowH + rowH / 2 + reel.bounceOffset;

      // Fade emojis at edges
      const distFromCenter = Math.abs(y - (reelY + reelH / 2)) / (reelH / 2);
      const alpha = Math.max(0, 1 - distFromCenter * 0.5);

      ctx.globalAlpha = alpha;
      ctx.fillText(emoji, centerX, y);
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // Payline indicator (middle row highlight)
    const paylineY = reelY + rowH;
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, paylineY);
    ctx.lineTo(rx + reelW, paylineY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rx, paylineY + rowH);
    ctx.lineTo(rx + reelW, paylineY + rowH);
    ctx.stroke();

    // Top/bottom shadow overlay for depth
    const shadowH = rowH * 0.6;
    const topShadow = ctx.createLinearGradient(0, reelY, 0, reelY + shadowH);
    topShadow.addColorStop(0, 'rgba(0,0,0,0.7)');
    topShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShadow;
    ctx.fillRect(rx, reelY, reelW, shadowH);

    const botShadow = ctx.createLinearGradient(
      0,
      reelY + reelH - shadowH,
      0,
      reelY + reelH,
    );
    botShadow.addColorStop(0, 'rgba(0,0,0,0)');
    botShadow.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = botShadow;
    ctx.fillRect(rx, reelY + reelH - shadowH, reelW, shadowH);
  }

  function drawBulbs(now: number) {
    if (!ctx) return;

    const celebrating = state === 'celebrating';
    for (const bulb of bulbs) {
      if (celebrating) {
        const hue = ((now * 0.3 + bulb.phase * 60) % 360);
        const brightness = 0.6 + 0.4 * Math.sin(now * 0.01 + bulb.phase);
        ctx.fillStyle = `hsl(${hue}, 100%, ${brightness * 80}%)`;
        ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
        ctx.shadowBlur = 12;
      } else {
        const brightness = 0.3 + 0.15 * Math.sin(now * 0.002 + bulb.phase);
        ctx.fillStyle = `rgba(255, 200, 50, ${brightness})`;
        ctx.shadowColor = 'rgba(255, 200, 50, 0.3)';
        ctx.shadowBlur = 4;
      }

      ctx.beginPath();
      ctx.arc(bulb.x, bulb.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  function drawLever() {
    if (!ctx) return;

    const lx = machineX + machineW + 10;
    const ly = machineY + machineH * 0.3;
    const leverLen = machineH * 0.3;

    // Lever arm
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(leverAngle);

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -leverLen);
    ctx.stroke();

    // Ball on top
    ctx.fillStyle = '#ff3333';
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, -leverLen, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pivot
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawWinText() {
    if (!ctx || state !== 'celebrating') return;

    const flash = Math.sin(performance.now() * 0.01) > 0;
    if (!flash) return;

    const text = winType === 'jackpot' ? 'JACKPOT!' : 'WINNER!';
    const textSize = machineW * 0.12;

    ctx.font = `bold ${textSize}px "Arial", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const ty = machineY + machineH + textSize * 0.8;

    // Glow
    ctx.shadowColor = winType === 'jackpot' ? '#FFD700' : '#33ff33';
    ctx.shadowBlur = 30;
    ctx.fillStyle = winType === 'jackpot' ? '#FFD700' : '#33ff33';
    ctx.fillText(text, width / 2, ty);
    ctx.fillText(text, width / 2, ty); // double draw for stronger glow
    ctx.shadowBlur = 0;
  }

  function drawFooter() {
    if (!ctx) return;

    const fy = machineY + machineH - footerH;
    const fontSize = footerH * 0.35;
    ctx.font = `${fontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctx.fillText(
      `SPIN #${spinCount}`,
      machineX + machineW / 2,
      fy + footerH * 0.5,
    );
  }

  // --- Main loop ---

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    computeLayout();
    createBulbs();
  }

  function loop() {
    if (!ctx) return;
    const now = performance.now();

    // --- State machine ---
    switch (state) {
      case 'idle':
        if (elapsed() > IDLE_DURATION) {
          initReels();
          spinCount++;
          setState('spin_up');
        }
        break;

      case 'spin_up':
        for (const reel of reels) {
          reel.speed = Math.min(MAX_SPIN_SPEED, reel.speed + 0.04);
          reel.position += reel.speed;
          reel.state = 'spinning';
        }
        leverAngle = Math.min(Math.PI / 4, leverAngle + 0.06);
        if (elapsed() > SPIN_UP_DURATION) {
          determineTargets();
          setState('spinning');
        }
        break;

      case 'spinning':
        for (const reel of reels) {
          reel.position += reel.speed;
        }
        if (elapsed() > FULL_SPIN_DURATION) {
          setState('stopping');
        }
        break;

      case 'stopping': {
        const stopElapsed = elapsed();

        for (let i = 0; i < REEL_COUNT; i++) {
          const reel = reels[i];
          if (reel.state === 'spinning' && stopElapsed > i * REEL_STOP_STAGGER) {
            reel.state = 'decelerating';
            // Compute an absolute target position ahead of current position.
            // The reel.targetIndex is an index within 0..STRIP_LENGTH.
            // We need an absolute position ≡ targetIndex (mod STRIP_LENGTH)
            // that is at least one full revolution ahead of where we are now.
            const localTarget = reel.targetIndex % STRIP_LENGTH;
            const currentCycle = Math.floor(reel.position / STRIP_LENGTH);
            let absTarget = (currentCycle + 1) * STRIP_LENGTH + localTarget;
            // Ensure it's at least STRIP_LENGTH ahead
            if (absTarget - reel.position < STRIP_LENGTH) {
              absTarget += STRIP_LENGTH;
            }
            reel.targetIndex = absTarget;
          }
        }

        let allStopped = true;
        for (const reel of reels) {
          if (reel.state === 'decelerating') {
            const remaining = reel.targetIndex - reel.position;
            if (remaining <= 0.05) {
              // Snap to target
              reel.position = reel.targetIndex;
              reel.speed = 0;
              reel.state = 'stopped';
              reel.bounceOffset = -6;
              reel.bounceVelocity = 0;
            } else {
              // Ease into target: speed proportional to remaining distance
              reel.speed = Math.max(0.03, remaining * 0.06);
              // But don't exceed max spin speed
              reel.speed = Math.min(reel.speed, MAX_SPIN_SPEED);
              reel.position += reel.speed;
            }
            allStopped = false;
          } else if (reel.state === 'spinning') {
            reel.position += reel.speed;
            allStopped = false;
          } else if (reel.state === 'stopped') {
            // Spring bounce
            reel.bounceVelocity += 0.8;
            reel.bounceOffset += reel.bounceVelocity;
            if (reel.bounceOffset >= 0) {
              reel.bounceOffset = 0;
              reel.bounceVelocity = -reel.bounceVelocity * 0.3;
              if (Math.abs(reel.bounceVelocity) < 0.5) {
                reel.bounceVelocity = 0;
                reel.bounceOffset = 0;
              }
            }
          }
        }

        // Lever returning
        leverAngle = Math.max(0, leverAngle - 0.015);

        if (allStopped && reels.every((r) => r.bounceVelocity === 0)) {
          setState('evaluating');
        }
        break;
      }

      case 'evaluating':
        if (elapsed() > EVAL_PAUSE) {
          winType = evaluateWin();
          if (winType !== 'none') {
            const counts: Record<string, number> = {
              jackpot: 120,
              big: 60,
              small: 20,
            };
            burstCoins(counts[winType] || 20);
            setState('celebrating');
          } else {
            setState('losing');
          }
        }
        break;

      case 'celebrating': {
        const dur = CELEBRATE_DURATIONS[winType] || 3000;
        if (elapsed() > dur && particles.length === 0) {
          winType = 'none';
          setState('idle');
        }
        break;
      }

      case 'losing':
        if (elapsed() > LOSE_DURATION) {
          setState('idle');
        }
        break;
    }

    // Lever return during non-spinning states
    if (state !== 'spin_up' && state !== 'spinning') {
      leverAngle = Math.max(0, leverAngle - 0.015);
    }

    // --- Draw ---
    drawBackground();
    drawMachineFrame();
    drawBulbs(now);

    for (let i = 0; i < REEL_COUNT; i++) {
      drawReelWindow(reels[i], reelXPositions[i]);
    }

    drawFooter();
    drawLever();
    drawWinText();
    updateAndDrawParticles();

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Slots',
    description: 'Three-reel emoji slots with celebrations',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      spinCount = 0;
      particles = [];
      winType = 'none';
      leverAngle = 0;
      initReels();
      setState('idle');
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      particles = [];
      reels = [];
      bulbs = [];
      window.removeEventListener('resize', resize);
    },
  };
}
