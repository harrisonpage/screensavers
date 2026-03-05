import type { Screensaver } from '../types';

interface Branch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  children: Branch[];
}

interface Lightning {
  branches: Branch[];
  life: number;     // frames remaining
  maxLife: number;
  flashIntensity: number;
}

interface Raindrop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

interface TreeShape {
  x: number;
  segments: { x1: number; y1: number; x2: number; y2: number; width: number }[];
}

export function createThunderstorm(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  let lightning: Lightning | null = null;
  let lightningCooldown = 0;
  let ambientFlash = 0; // distant flash without visible bolt
  let rain: Raindrop[] = [];
  let trees: TreeShape[] = [];

  // sky gradient colors (very dark)
  const SKY_TOP = [8, 8, 20];
  const SKY_BOTTOM = [15, 15, 35];

  function generateTree(baseX: number, groundY: number): TreeShape {
    const segments: TreeShape['segments'] = [];
    const treeHeight = 80 + Math.random() * 160;

    function branch(x: number, y: number, angle: number, len: number, w: number, depth: number) {
      if (depth > 8 || len < 4) return;

      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;
      segments.push({ x1: x, y1: y, x2, y2, width: w });

      const branches = depth < 3 ? 2 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < branches; i++) {
        const spread = 0.3 + Math.random() * 0.5;
        const newAngle = angle + (Math.random() - 0.5) * spread * 2;
        const newLen = len * (0.6 + Math.random() * 0.2);
        const newW = Math.max(1, w * 0.65);
        branch(x2, y2, newAngle, newLen, newW, depth + 1);
      }
    }

    // trunk goes up
    const trunkTop = groundY - treeHeight;
    segments.push({ x1: baseX, y1: groundY, x2: baseX, y2: trunkTop, width: 4 + Math.random() * 3 });

    // branches from the top of the trunk
    const branchCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < branchCount; i++) {
      const startY = trunkTop + Math.random() * treeHeight * 0.3;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      branch(baseX, startY, angle, 30 + Math.random() * 40, 2.5, 1);
    }

    return { x: baseX, segments };
  }

  function generateLightningBolt(): Lightning {
    const startX = width * 0.15 + Math.random() * width * 0.7;
    const branches: Branch[] = [];

    function bolt(x: number, y: number, angle: number, len: number, w: number, depth: number) {
      if (depth > 6 || len < 10) return;

      // jagged segments
      const segs = 3 + Math.floor(Math.random() * 4);
      let cx = x;
      let cy = y;
      const segLen = len / segs;
      const children: Branch[] = [];

      for (let i = 0; i < segs; i++) {
        const jitter = (Math.random() - 0.5) * segLen * 0.8;
        const nx = cx + Math.cos(angle) * segLen + jitter;
        const ny = cy + Math.sin(angle) * segLen;

        const b: Branch = { x1: cx, y1: cy, x2: nx, y2: ny, width: w, children: [] };
        branches.push(b);

        // chance of fork
        if (depth < 4 && Math.random() < 0.35) {
          const forkAngle = angle + (Math.random() - 0.5) * 1.0;
          bolt(cx, cy, forkAngle, len * (0.4 + Math.random() * 0.3), w * 0.5, depth + 1);
        }

        cx = nx;
        cy = ny;
      }
    }

    bolt(startX, 0, Math.PI / 2 + (Math.random() - 0.5) * 0.3, height * 0.7 + Math.random() * height * 0.25, 3, 0);

    const maxLife = 15 + Math.floor(Math.random() * 10);
    return {
      branches,
      life: maxLife,
      maxLife,
      flashIntensity: 0.7 + Math.random() * 0.3,
    };
  }

  function spawnRain() {
    rain = [];
    const count = Math.floor(width * 0.15);
    for (let i = 0; i < count; i++) {
      rain.push({
        x: Math.random() * (width + 100) - 50,
        y: Math.random() * height,
        speed: 8 + Math.random() * 12,
        length: 10 + Math.random() * 20,
      });
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    // regenerate trees along the ground
    trees = [];
    const groundY = height * 0.88;
    const treeCount = Math.max(4, Math.floor(width / 150));
    for (let i = 0; i < treeCount; i++) {
      const x = (width / (treeCount + 1)) * (i + 1) + (Math.random() - 0.5) * 60;
      trees.push(generateTree(x, groundY));
    }

    spawnRain();
  }

  function drawSky(flash: number) {
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const r0 = SKY_TOP[0] + flash * 180;
    const g0 = SKY_TOP[1] + flash * 180;
    const b0 = SKY_TOP[2] + flash * 200;
    const r1 = SKY_BOTTOM[0] + flash * 120;
    const g1 = SKY_BOTTOM[1] + flash * 120;
    const b1 = SKY_BOTTOM[2] + flash * 140;
    gradient.addColorStop(0, `rgb(${Math.min(255, r0)}, ${Math.min(255, g0)}, ${Math.min(255, b0)})`);
    gradient.addColorStop(1, `rgb(${Math.min(255, r1)}, ${Math.min(255, g1)}, ${Math.min(255, b1)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawGround(flash: number) {
    if (!ctx) return;
    const groundY = height * 0.88;
    // ground is a dark silhouette, slightly lit by flash
    const brightness = Math.floor(5 + flash * 30);
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${Math.floor(brightness * 0.8)})`;
    ctx.fillRect(0, groundY, width, height - groundY);
  }

  function drawTrees(flash: number) {
    if (!ctx) return;

    // trees are silhouettes: black when dark, very dark gray when lit
    const brightness = Math.floor(2 + flash * 15);
    ctx.strokeStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.lineCap = 'round';

    for (const tree of trees) {
      for (const seg of tree.segments) {
        ctx.lineWidth = seg.width;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      }
    }
  }

  function drawLightning() {
    if (!ctx || !lightning || lightning.life <= 0) return;

    const alpha = (lightning.life / lightning.maxLife);

    for (const b of lightning.branches) {
      // bright core
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = b.width;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();

      // glow
      ctx.strokeStyle = `rgba(180, 180, 255, ${alpha * 0.4})`;
      ctx.lineWidth = b.width * 4;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
  }

  function drawRain(flash: number) {
    if (!ctx) return;

    const brightness = 60 + Math.floor(flash * 150);
    ctx.strokeStyle = `rgba(${brightness}, ${brightness}, ${Math.min(255, brightness + 40)}, 0.3)`;
    ctx.lineWidth = 1;

    // rain falls at a slight angle (wind)
    for (const drop of rain) {
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 2, drop.y + drop.length);
      ctx.stroke();
    }
  }

  function updateRain() {
    for (const drop of rain) {
      drop.y += drop.speed;
      drop.x -= 1.5; // slight wind
      if (drop.y > height) {
        drop.y = -drop.length;
        drop.x = Math.random() * (width + 100) - 50;
      }
    }
  }

  function loop() {
    if (!ctx) return;

    // determine flash level
    let flash = 0;

    if (lightning && lightning.life > 0) {
      lightning.life--;
      // flash is brightest at the start, with a quick re-flash
      const t = 1 - lightning.life / lightning.maxLife;
      if (t < 0.1) {
        flash = lightning.flashIntensity;
      } else if (t < 0.2) {
        flash = lightning.flashIntensity * 0.3;
      } else if (t > 0.3 && t < 0.4) {
        // secondary flash
        flash = lightning.flashIntensity * 0.5;
      } else {
        flash = 0;
      }
    }

    // ambient distant flash (no bolt)
    if (ambientFlash > 0) {
      flash = Math.max(flash, ambientFlash * 0.15);
      ambientFlash -= 0.08;
    }

    // trigger new lightning
    lightningCooldown--;
    if (lightningCooldown <= 0) {
      if (Math.random() < 0.3) {
        // distant ambient flash
        ambientFlash = 1;
        lightningCooldown = 30 + Math.floor(Math.random() * 60);
      } else {
        lightning = generateLightningBolt();
        lightningCooldown = 90 + Math.floor(Math.random() * 250);
      }
    }

    // draw scene
    drawSky(flash);
    drawGround(flash);
    drawRain(flash);
    drawTrees(flash);
    drawLightning();
    updateRain();

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Thunderstorm',
    description: 'Lightning illuminates silhouetted trees',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      lightning = null;
      lightningCooldown = 60;
      ambientFlash = 0;

      resize();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      rain = [];
      trees = [];
      lightning = null;
      window.removeEventListener('resize', resize);
    },
  };
}
