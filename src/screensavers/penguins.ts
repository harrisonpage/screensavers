import type { Screensaver } from '../types';
import { PENGUIN_DATA_URI } from '../assets/penguin';

// --- Penguin behavior states ---
type PenguinState = 'walking' | 'idle' | 'flapping';

interface Penguin {
  x: number;
  groundY: number; // base Y on the ground plane
  depth: number; // 0 = far, 1 = near (controls scale and Y)
  dir: number;
  flipped: boolean;
  phase: number;
  speed: number;
  state: PenguinState;
  stateTimer: number;
  flapFrame: number;
}

interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
}

interface Mountain {
  points: { x: number; y: number }[];
  color: string;
  snowColor: string;
  depth: number; // for parallax
}

interface Fish {
  x: number;
  y: number;
  startY: number;
  vx: number;
  vy: number;
  size: number;
  active: boolean;
  timer: number;
  phase: number;
  rotation: number;
}

interface AuroraWave {
  offset: number;
  speed: number;
  amplitude: number;
  wavelength: number;
  hue: number;
  opacity: number;
}

export function createPenguins(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let animationFrame: number | null = null;
  const img = new Image();
  let penguins: Penguin[] = [];
  let snowflakes: Snowflake[] = [];
  let clouds: Cloud[] = [];
  let mountains: Mountain[] = [];
  let fish: Fish[] = [];
  let auroraWaves: AuroraWave[] = [];
  let frame = 0;
  const count = Math.floor(Math.random() * 15) + 8;
  const GROUND_RATIO = 0.45; // bottom 45% is snowy ground
  const WATER_WIDTH_RATIO = 0.18; // water hole width
  let waterX = 0;
  let waterW = 0;

  function groundYForDepth(depth: number): number {
    // depth 0 = horizon line, depth 1 = bottom of screen
    const horizonY = height * (1 - GROUND_RATIO);
    return horizonY + depth * (height - horizonY) * 0.85;
  }

  function scaleForDepth(depth: number): number {
    return 0.4 + depth * 0.8;
  }

  function spawnPenguins() {
    penguins = [];
    for (let i = 0; i < count; i++) {
      const depth = 0.15 + Math.random() * 0.8;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const speed = (0.3 + Math.random() * 0.5) * scaleForDepth(depth);
      penguins.push({
        x: Math.random() * width,
        groundY: groundYForDepth(depth),
        depth,
        dir,
        flipped: dir === 1,
        phase: Math.random() * Math.PI * 2,
        speed,
        state: 'walking',
        stateTimer: 60 + Math.floor(Math.random() * 200),
        flapFrame: 0,
      });
    }
    // Sort by depth so far penguins draw first
    penguins.sort((a, b) => a.depth - b.depth);
  }

  function spawnSnowflakes() {
    snowflakes = [];
    const numFlakes = Math.floor((width * height) / 4000);
    for (let i = 0; i < numFlakes; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 3,
        speed: 0.3 + Math.random() * 1.2,
        drift: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.4 + Math.random() * 0.6,
      });
    }
  }

  function spawnClouds() {
    clouds = [];
    const numClouds = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numClouds; i++) {
      clouds.push({
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 0.3,
        width: 100 + Math.random() * 200,
        height: 30 + Math.random() * 50,
        speed: 0.1 + Math.random() * 0.3,
        opacity: 0.15 + Math.random() * 0.3,
      });
    }
  }

  function generateMountains() {
    mountains = [];
    const horizonY = height * (1 - GROUND_RATIO);

    // Far mountains (darker, smaller)
    const farPoints: { x: number; y: number }[] = [];
    for (let x = -50; x <= width + 50; x += 40 + Math.random() * 60) {
      const peakHeight = 40 + Math.random() * 80;
      farPoints.push({ x, y: horizonY - peakHeight });
      farPoints.push({
        x: x + 20 + Math.random() * 30,
        y: horizonY - 5 - Math.random() * 15,
      });
    }
    mountains.push({
      points: farPoints,
      color: '#8ba4b8',
      snowColor: '#d0dde8',
      depth: 0.3,
    });

    // Near mountains (lighter, bigger)
    const nearPoints: { x: number; y: number }[] = [];
    for (let x = -50; x <= width + 50; x += 60 + Math.random() * 80) {
      const peakHeight = 60 + Math.random() * 120;
      nearPoints.push({ x, y: horizonY - peakHeight });
      nearPoints.push({
        x: x + 30 + Math.random() * 40,
        y: horizonY - 5 - Math.random() * 20,
      });
    }
    mountains.push({
      points: nearPoints,
      color: '#9bb5c8',
      snowColor: '#e0eaf2',
      depth: 0.5,
    });
  }

  function spawnAurora() {
    auroraWaves = [];
    const numWaves = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numWaves; i++) {
      auroraWaves.push({
        offset: Math.random() * Math.PI * 2,
        speed: 0.002 + Math.random() * 0.005,
        amplitude: 15 + Math.random() * 30,
        wavelength: 200 + Math.random() * 300,
        hue: 100 + Math.random() * 80, // greens to cyans
        opacity: 0.06 + Math.random() * 0.08,
      });
    }
  }

  function spawnFish() {
    fish = [];
    for (let i = 0; i < 3; i++) {
      fish.push({
        x: 0,
        y: 0,
        startY: 0,
        vx: 0,
        vy: 0,
        size: 6 + Math.random() * 6,
        active: false,
        timer: 120 + Math.floor(Math.random() * 300),
        phase: Math.random() * Math.PI * 2,
        rotation: 0,
      });
    }
  }

  function launchFish(f: Fish) {
    const horizonY = height * (1 - GROUND_RATIO);
    f.x = waterX + Math.random() * waterW;
    f.startY = horizonY + 20;
    f.y = f.startY;
    f.vx = (Math.random() - 0.5) * 2;
    f.vy = -(3 + Math.random() * 3);
    f.active = true;
    f.rotation = 0;
  }

  // --- Drawing helpers ---

  function drawSky() {
    if (!ctx) return;
    const horizonY = height * (1 - GROUND_RATIO);
    const grad = ctx.createLinearGradient(0, 0, 0, horizonY);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(0.3, '#1a3050');
    grad.addColorStop(0.6, '#3a6080');
    grad.addColorStop(1, '#7bacc8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, horizonY);
  }

  function drawAurora() {
    if (!ctx) return;
    const horizonY = height * (1 - GROUND_RATIO);
    const auroraTop = horizonY * 0.05;
    const auroraBottom = horizonY * 0.45;

    for (const wave of auroraWaves) {
      const t = frame * wave.speed + wave.offset;
      ctx.beginPath();
      ctx.moveTo(0, auroraBottom);

      for (let x = 0; x <= width; x += 4) {
        const baseY =
          auroraTop +
          (auroraBottom - auroraTop) * 0.5 +
          Math.sin(x / wave.wavelength + t) * wave.amplitude +
          Math.sin(x / (wave.wavelength * 0.5) + t * 1.3) *
            wave.amplitude *
            0.5;
        ctx.lineTo(x, baseY);
      }

      ctx.lineTo(width, auroraBottom);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, auroraTop, 0, auroraBottom);
      const hue = wave.hue + Math.sin(t * 0.3) * 15;
      grad.addColorStop(0, `hsla(${hue}, 80%, 60%, 0)`);
      grad.addColorStop(0.3, `hsla(${hue}, 80%, 60%, ${wave.opacity})`);
      grad.addColorStop(0.7, `hsla(${hue + 30}, 70%, 50%, ${wave.opacity * 0.7})`);
      grad.addColorStop(1, `hsla(${hue + 60}, 60%, 40%, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  function drawClouds() {
    if (!ctx) return;
    for (const cloud of clouds) {
      ctx.save();
      ctx.globalAlpha = cloud.opacity;
      ctx.fillStyle = '#c8d8e8';
      // Draw cloud as overlapping ellipses
      const cx = cloud.x;
      const cy = cloud.y;
      const w = cloud.width;
      const h = cloud.height;
      ctx.beginPath();
      ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - w * 0.25, cy + h * 0.1, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + w * 0.3, cy + h * 0.05, w * 0.3, h * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMountains() {
    if (!ctx) return;
    const horizonY = height * (1 - GROUND_RATIO);

    for (const mt of mountains) {
      // Mountain body
      ctx.beginPath();
      ctx.moveTo(-50, horizonY);
      for (const p of mt.points) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.lineTo(width + 50, horizonY);
      ctx.closePath();
      ctx.fillStyle = mt.color;
      ctx.fill();

      // Snow caps (top third of each peak)
      ctx.beginPath();
      for (let i = 0; i < mt.points.length; i += 2) {
        const peak = mt.points[i];
        if (!peak) continue;
        const peakHeight = horizonY - peak.y;
        const snowLine = peak.y + peakHeight * 0.35;
        const halfWidth = peakHeight * 0.4;
        ctx.moveTo(peak.x - halfWidth, snowLine);
        ctx.lineTo(peak.x, peak.y);
        ctx.lineTo(peak.x + halfWidth, snowLine);
      }
      ctx.fillStyle = mt.snowColor;
      ctx.fill();
    }
  }

  function drawGround() {
    if (!ctx) return;
    const horizonY = height * (1 - GROUND_RATIO);

    // Main ground gradient (snow/ice)
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    groundGrad.addColorStop(0, '#d8e8f0');
    groundGrad.addColorStop(0.3, '#e8f0f5');
    groundGrad.addColorStop(1, '#f0f5f8');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Subtle ice texture lines
    ctx.strokeStyle = 'rgba(180, 210, 230, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      const y = horizonY + 20 + Math.random() * (height - horizonY - 40);
      const x1 = Math.random() * width * 0.3;
      const x2 = x1 + 50 + Math.random() * 150;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.bezierCurveTo(
        x1 + (x2 - x1) * 0.3,
        y - 2 + Math.random() * 4,
        x1 + (x2 - x1) * 0.7,
        y - 2 + Math.random() * 4,
        x2,
        y
      );
      ctx.stroke();
    }

    // Water hole
    waterX = width * 0.7;
    waterW = width * WATER_WIDTH_RATIO;
    const waterY = horizonY + (height - horizonY) * 0.2;
    const waterH = (height - horizonY) * 0.25;

    // Water surface
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      waterX + waterW / 2,
      waterY + waterH / 2,
      waterW / 2,
      waterH / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.clip();

    const waterGrad = ctx.createRadialGradient(
      waterX + waterW / 2,
      waterY + waterH / 2,
      0,
      waterX + waterW / 2,
      waterY + waterH / 2,
      waterW / 2
    );
    waterGrad.addColorStop(0, '#2a5a80');
    waterGrad.addColorStop(0.7, '#3a7aa0');
    waterGrad.addColorStop(1, '#80b0c8');
    ctx.fillStyle = waterGrad;
    ctx.fill();

    // Animated water ripples
    ctx.strokeStyle = 'rgba(150, 200, 230, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const rippleY =
        waterY + waterH * 0.3 + i * (waterH * 0.15);
      ctx.beginPath();
      for (let x = waterX; x <= waterX + waterW; x += 3) {
        const wavey =
          rippleY + Math.sin(x * 0.05 + frame * 0.03 + i * 1.5) * 2;
        if (x === waterX) ctx.moveTo(x, wavey);
        else ctx.lineTo(x, wavey);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Ice edge around water
    ctx.strokeStyle = 'rgba(200, 225, 240, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      waterX + waterW / 2,
      waterY + waterH / 2,
      waterW / 2,
      waterH / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  function drawSnowflakes() {
    if (!ctx) return;
    for (const sf of snowflakes) {
      ctx.save();
      ctx.globalAlpha = sf.opacity;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sf.x, sf.y, sf.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPenguin(p: Penguin) {
    if (!ctx) return;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const scale = scaleForDepth(p.depth);
    const sw = imgW * scale;
    const sh = imgH * scale;

    const t = frame * 0.1 + p.phase;

    ctx.save();

    if (p.state === 'flapping') {
      // Standing and flapping wings
      const bobY = Math.sin(t * 3) * 1.5;
      ctx.translate(p.x, p.groundY - sh + bobY);
      ctx.scale(scale, scale);
      if (p.flipped) ctx.scale(-1, 1);

      // Draw main body
      ctx.drawImage(img, -imgW / 2, 0);

      // Draw animated "wing" flaps as small arcs on sides
      const flapAngle = Math.sin(frame * 0.4 + p.phase) * 0.5;
      ctx.strokeStyle = 'rgba(30, 30, 30, 0.6)';
      ctx.lineWidth = 2;
      // Left wing
      ctx.save();
      ctx.translate(-imgW * 0.4, imgH * 0.3);
      ctx.rotate(-0.5 + flapAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-8, 5);
      ctx.stroke();
      ctx.restore();
      // Right wing
      ctx.save();
      ctx.translate(imgW * 0.4, imgH * 0.3);
      ctx.rotate(0.5 - flapAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(8, 5);
      ctx.stroke();
      ctx.restore();
    } else if (p.state === 'idle') {
      // Standing still, slight look-around
      const lookAngle = Math.sin(t * 0.5) * 0.08;
      ctx.translate(p.x, p.groundY - sh);
      ctx.scale(scale, scale);
      ctx.rotate(lookAngle);
      if (p.flipped) ctx.scale(-1, 1);
      ctx.drawImage(img, -imgW / 2, 0);
    } else {
      // Walking — waddle animation
      const bobY = Math.sin(t) * 2 * scale;
      const tilt = Math.sin(t) * 0.15;
      ctx.translate(p.x, p.groundY - sh + bobY);
      ctx.scale(scale, scale);
      ctx.rotate(tilt);
      if (p.flipped) ctx.scale(-1, 1);
      ctx.drawImage(img, -imgW / 2, 0);
    }

    ctx.restore();

    // Shadow under penguin
    if (ctx) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#3a5a70';
      ctx.beginPath();
      ctx.ellipse(p.x, p.groundY + 2, sw * 0.35, sh * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawFish() {
    if (!ctx) return;
    for (const f of fish) {
      if (!f.active) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      // Simple fish shape
      ctx.fillStyle = '#c0c0c8';
      ctx.beginPath();
      ctx.ellipse(0, 0, f.size, f.size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(-f.size, 0);
      ctx.lineTo(-f.size - 4, -3);
      ctx.lineTo(-f.size - 4, 3);
      ctx.closePath();
      ctx.fill();
      // Eye
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(f.size * 0.5, -f.size * 0.1, 1, 0, Math.PI * 2);
      ctx.fill();
      // Water splash when near surface
      const horizonY = height * (1 - GROUND_RATIO);
      if (Math.abs(f.y - (horizonY + 20)) < 10) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#80c0e0';
        for (let i = 0; i < 5; i++) {
          const dx = (Math.random() - 0.5) * 20;
          const dy = (Math.random() - 0.5) * 10;
          ctx.beginPath();
          ctx.arc(dx, dy, 1 + Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  // --- Update logic ---

  function updatePenguins() {
    const imgW = img.naturalWidth;

    for (const p of penguins) {
      const scale = scaleForDepth(p.depth);
      const sw = imgW * scale;

      p.stateTimer--;

      if (p.stateTimer <= 0) {
        // Transition to a new state
        const rand = Math.random();
        if (p.state === 'walking') {
          if (rand < 0.3) {
            p.state = 'idle';
            p.stateTimer = 80 + Math.floor(Math.random() * 120);
          } else if (rand < 0.45) {
            p.state = 'flapping';
            p.stateTimer = 40 + Math.floor(Math.random() * 60);
          } else {
            // Keep walking but maybe change direction
            if (Math.random() < 0.3) p.dir *= -1;
            p.stateTimer = 100 + Math.floor(Math.random() * 200);
          }
        } else {
          // Return to walking from any other state
          p.state = 'walking';
          if (Math.random() < 0.3) p.dir *= -1;
          p.stateTimer = 100 + Math.floor(Math.random() * 200);
        }
      }

      // Movement
      if (p.state === 'walking') {
        p.x += p.dir * p.speed;
      }
      // idle and flapping: no movement

      // Boundary bounce
      if (p.x <= sw / 2) {
        p.x = sw / 2;
        p.dir = 1;
      } else if (p.x >= width - sw / 2) {
        p.x = width - sw / 2;
        p.dir = -1;
      }

      p.flipped = p.dir === 1;
    }
  }

  function updateSnowflakes() {
    for (const sf of snowflakes) {
      sf.y += sf.speed;
      sf.x += sf.drift + Math.sin(frame * 0.01 + sf.phase) * 0.3;

      if (sf.y > height + 5) {
        sf.y = -5;
        sf.x = Math.random() * width;
      }
      if (sf.x > width + 5) sf.x = -5;
      if (sf.x < -5) sf.x = width + 5;
    }
  }

  function updateClouds() {
    for (const cloud of clouds) {
      cloud.x += cloud.speed;
      if (cloud.x - cloud.width > width) {
        cloud.x = -cloud.width;
        cloud.y = Math.random() * height * 0.3;
      }
    }
  }

  function updateFish() {
    for (const f of fish) {
      if (!f.active) {
        f.timer--;
        if (f.timer <= 0) {
          launchFish(f);
        }
        continue;
      }

      f.vy += 0.08; // gravity
      f.x += f.vx;
      f.y += f.vy;
      f.rotation = Math.atan2(f.vy, f.vx);

      // Fish has gone back below water
      if (f.y > f.startY + 5) {
        f.active = false;
        f.timer = 200 + Math.floor(Math.random() * 400);
      }
    }
  }

  function loop() {
    if (!ctx) return;

    frame++;

    // Draw scene back to front
    drawSky();
    drawAurora();
    drawClouds();
    drawMountains();
    drawGround();

    // Draw penguins (already sorted by depth)
    for (const p of penguins) {
      drawPenguin(p);
    }

    drawFish();
    drawSnowflakes();

    // Update
    updatePenguins();
    updateSnowflakes();
    updateClouds();
    updateFish();

    animationFrame = requestAnimationFrame(loop);
  }

  function initScene() {
    generateMountains();
    spawnClouds();
    spawnSnowflakes();
    spawnAurora();
    spawnFish();
    spawnPenguins();
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initScene();
  }

  return {
    name: 'Penguins',
    description: 'Antarctic expedition',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', resize);

      img.onload = () => {
        initScene();
        loop();
      };
      img.src = PENGUIN_DATA_URI;
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      penguins = [];
      snowflakes = [];
      clouds = [];
      mountains = [];
      fish = [];
      auroraWaves = [];
      window.removeEventListener('resize', resize);
    },
  };
}
