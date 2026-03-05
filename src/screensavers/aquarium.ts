import type { Screensaver } from '../types';

// --- Critter config ---
// Each critter type defines its emoji, size range, speed range, spawn weight, and behavior.
interface CritterConfig {
  emoji: string;
  sizeMin: number;
  sizeMax: number;
  speedMin: number;
  speedMax: number;
  weight: number; // relative spawn probability
  behavior: 'swim' | 'school' | 'jellyfish' | 'pufferfish' | 'bottom';
}

const CRITTER_CONFIGS: CritterConfig[] = [
  // Schooling fish — fast, small, spawn in groups
  { emoji: '🐠', sizeMin: 22, sizeMax: 32, speedMin: 1.5, speedMax: 2.8, weight: 5, behavior: 'school' },
  { emoji: '🐟', sizeMin: 22, sizeMax: 32, speedMin: 1.5, speedMax: 2.8, weight: 5, behavior: 'school' },
  // Normal swimmers
  { emoji: '🦈', sizeMin: 50, sizeMax: 70, speedMin: 0.8, speedMax: 1.6, weight: 2, behavior: 'swim' },
  { emoji: '🐙', sizeMin: 40, sizeMax: 55, speedMin: 0.3, speedMax: 0.8, weight: 2, behavior: 'swim' },
  { emoji: '🦑', sizeMin: 40, sizeMax: 55, speedMin: 0.5, speedMax: 1.0, weight: 2, behavior: 'swim' },
  { emoji: '🦐', sizeMin: 18, sizeMax: 26, speedMin: 0.6, speedMax: 1.2, weight: 3, behavior: 'swim' },
  // Whales — very large, very rare
  { emoji: '🐳', sizeMin: 140, sizeMax: 200, speedMin: 0.2, speedMax: 0.5, weight: 0.3, behavior: 'swim' },
  { emoji: '🐋', sizeMin: 150, sizeMax: 210, speedMin: 0.15, speedMax: 0.4, weight: 0.3, behavior: 'swim' },
  // Jellyfish — slow, pulsing
  { emoji: '🪼', sizeMin: 30, sizeMax: 50, speedMin: 0.1, speedMax: 0.3, weight: 2, behavior: 'jellyfish' },
  // Pufferfish — slow, size pulses
  { emoji: '🐡', sizeMin: 28, sizeMax: 40, speedMin: 0.2, speedMax: 0.6, weight: 2, behavior: 'pufferfish' },
];

// Bottom-dwelling critters
interface BottomCritter {
  emoji: string;
  x: number;
  y: number;
  size: number;
  vx: number;
  facingRight: boolean;
}

// Floor decorations (static)
interface FloorDecor {
  emoji: string;
  x: number;
  y: number;
  size: number;
}

const SEAWEED_EMOJI = ['🌿', '🌱', '🍀'];
const BUBBLE_COUNT = 30;
const SEAWEED_COUNT = 14;
const SCHOOL_COUNT = 4; // number of schools
const SCHOOL_SIZE = 4; // fish per school
const PARTICLE_COUNT = 60;

interface Fish {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  depth: number;
  behavior: string;
  // For schooling: offset from school leader
  schoolIndex?: number;
  schoolLeader?: Fish;
  schoolYOffset?: number;
  // For jellyfish: pulse phase
  pulsePhase?: number;
  pulseSpeed?: number;
  // For pufferfish: inflate phase
  inflateCycle?: number;
}

interface Seaweed {
  emoji: string;
  x: number;
  baseY: number;
  size: number;
  swayOffset: number;
  swaySpeed: number;
  swayAmount: number;
}

interface Bubble {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  opacity: number;
  wobbleOffset: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
}

export function createAquarium(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let time = 0;

  const fish: Fish[] = [];
  const seaweed: Seaweed[] = [];
  const bubbles: Bubble[] = [];
  const particles: Particle[] = [];
  const bottomCritters: BottomCritter[] = [];
  const floorDecor: FloorDecor[] = [];

  // Weighted random pick from CRITTER_CONFIGS
  function pickCritterConfig(): CritterConfig {
    const totalWeight = CRITTER_CONFIGS.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * totalWeight;
    for (const c of CRITTER_CONFIGS) {
      r -= c.weight;
      if (r <= 0) return c;
    }
    return CRITTER_CONFIGS[0];
  }

  function makeFish(config?: CritterConfig): Fish {
    const cfg = config || pickCritterConfig();
    const depth = 0.3 + Math.random() * 0.7;
    const baseSize = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
    const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin);
    const direction = Math.random() < 0.5 ? 1 : -1;

    const f: Fish = {
      emoji: cfg.emoji,
      x: Math.random() * width,
      y: 60 + Math.random() * (height - 240),
      vx: speed * direction * depth,
      vy: (Math.random() - 0.5) * 0.3,
      size: baseSize * depth,
      baseSize: baseSize * depth,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 1.5 + Math.random() * 2,
      depth,
      behavior: cfg.behavior,
    };

    if (cfg.behavior === 'jellyfish') {
      f.pulsePhase = Math.random() * Math.PI * 2;
      f.pulseSpeed = 0.8 + Math.random() * 0.6;
      // jellyfish drift mostly downward gently, with upward pulses
      f.vy = 0.15 + Math.random() * 0.2;
    }

    if (cfg.behavior === 'pufferfish') {
      f.inflateCycle = Math.random() * Math.PI * 2;
    }

    return f;
  }

  function makeSchool(leaderConfig: CritterConfig): Fish[] {
    const leader = makeFish(leaderConfig);
    leader.schoolIndex = 0;
    const school: Fish[] = [leader];
    const count = SCHOOL_SIZE + Math.floor(Math.random() * 3); // 4-6 per school
    for (let i = 1; i < count; i++) {
      const follower = makeFish(leaderConfig);
      follower.x = leader.x - (leader.vx > 0 ? 1 : -1) * (20 + Math.random() * 30) * i;
      follower.schoolYOffset = (Math.random() - 0.5) * 30;
      follower.y = leader.y + follower.schoolYOffset;
      follower.vx = leader.vx * (0.95 + Math.random() * 0.1);
      follower.depth = leader.depth;
      follower.size = leader.size * (0.85 + Math.random() * 0.3);
      follower.baseSize = follower.size;
      follower.schoolLeader = leader;
      follower.schoolIndex = i;
      school.push(follower);
    }
    return school;
  }

  function makeBubble(): Bubble {
    return {
      x: Math.random() * width,
      y: height + Math.random() * 50,
      vy: -(0.5 + Math.random() * 1.5),
      vx: 0,
      size: 2 + Math.random() * 6,
      opacity: 0.2 + Math.random() * 0.4,
      wobbleOffset: Math.random() * Math.PI * 2,
    };
  }

  function populate() {
    fish.length = 0;
    seaweed.length = 0;
    bubbles.length = 0;
    particles.length = 0;
    bottomCritters.length = 0;
    floorDecor.length = 0;

    // Guarantee one of each non-school swimmer type
    const nonSchoolConfigs = CRITTER_CONFIGS.filter(c => c.behavior !== 'school');
    for (const cfg of nonSchoolConfigs) {
      fish.push(makeFish(cfg));
    }

    // Add a couple of schools
    const schoolConfigs = CRITTER_CONFIGS.filter(c => c.behavior === 'school');
    for (let i = 0; i < SCHOOL_COUNT; i++) {
      const cfg = schoolConfigs[i % schoolConfigs.length];
      fish.push(...makeSchool(cfg));
    }

    // Fill remaining slots with weighted random (non-school only, to avoid runaway school spawns)
    const targetTotal = 18;
    while (fish.length < targetTotal) {
      const cfg = pickCritterConfig();
      if (cfg.behavior === 'school') continue; // schools already placed
      fish.push(makeFish(cfg));
    }

    // Sort by depth so far fish are drawn first
    fish.sort((a, b) => a.depth - b.depth);

    // Seaweed
    for (let i = 0; i < SEAWEED_COUNT; i++) {
      seaweed.push({
        emoji: SEAWEED_EMOJI[Math.floor(Math.random() * SEAWEED_EMOJI.length)],
        x: (width / (SEAWEED_COUNT + 1)) * (i + 1) + (Math.random() - 0.5) * 60,
        baseY: height - 20,
        size: 28 + Math.random() * 24,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.5 + Math.random() * 1,
        swayAmount: 5 + Math.random() * 10,
      });
    }

    // Bubbles
    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const b = makeBubble();
      b.y = Math.random() * height;
      bubbles.push(b);
    }

    // Ambient particles (plankton / sediment)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -0.05 + Math.random() * 0.1,
        size: 1 + Math.random() * 2.5,
        opacity: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Bottom-dwelling critters: lobsters and crabs
    const bottomTypes = [
      { emoji: '🦞', sizeMin: 42, sizeMax: 56, speedMin: 0.15, speedMax: 0.35, count: 2 },
      { emoji: '🦀', sizeMin: 28, sizeMax: 38, speedMin: 0.2, speedMax: 0.5, count: 3 },
    ];
    for (const bt of bottomTypes) {
      for (let i = 0; i < bt.count; i++) {
        const facingRight = Math.random() < 0.5;
        const sz = bt.sizeMin + Math.random() * (bt.sizeMax - bt.sizeMin);
        bottomCritters.push({
          emoji: bt.emoji,
          x: Math.random() * width,
          y: height - 18 - Math.random() * 8,
          size: sz,
          vx: (bt.speedMin + Math.random() * (bt.speedMax - bt.speedMin)) * (facingRight ? 1 : -1),
          facingRight,
        });
      }
    }

    // Floor decorations: shells, coral, starfish-like glyph
    const decorEmojis = ['🐚', '🐚', '🪸', '🪸', '🪸', '𓇼', '𓇼'];
    const usedX = new Set<number>();
    for (const em of decorEmojis) {
      let x: number;
      do {
        x = 40 + Math.random() * (width - 80);
      } while ([...usedX].some(ux => Math.abs(ux - x) < 50));
      usedX.add(x);
      floorDecor.push({
        emoji: em,
        x,
        y: height - 10 - Math.random() * 10,
        size: em === '𓇼' ? 22 + Math.random() * 12 : 26 + Math.random() * 18,
      });
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    populate();
  }

  function drawBackground() {
    if (!ctx) return;
    // deep ocean gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(0.3, '#0d2847');
    grad.addColorStop(0.7, '#0a3055');
    grad.addColorStop(1, '#061a30');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // sandy bottom
    const sandGrad = ctx.createLinearGradient(0, height - 60, 0, height);
    sandGrad.addColorStop(0, 'rgba(194, 164, 108, 0)');
    sandGrad.addColorStop(0.3, 'rgba(194, 164, 108, 0.25)');
    sandGrad.addColorStop(0.7, 'rgba(194, 164, 108, 0.5)');
    sandGrad.addColorStop(1, 'rgba(154, 124, 78, 0.7)');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, height - 60, width, 60);

    // subtle light rays from top
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const rx = width * (0.15 + i * 0.18);
      const rayWidth = 40 + Math.sin(time * 0.3 + i) * 15;
      const grad2 = ctx.createLinearGradient(rx, 0, rx, height * 0.7);
      grad2.addColorStop(0, 'rgba(100, 180, 255, 0.06)');
      grad2.addColorStop(1, 'rgba(100, 180, 255, 0)');
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.moveTo(rx - rayWidth / 2, 0);
      ctx.lineTo(rx + rayWidth / 2, 0);
      ctx.lineTo(rx + rayWidth * 1.5 + Math.sin(time * 0.2 + i) * 20, height * 0.7);
      ctx.lineTo(rx - rayWidth * 0.5 + Math.sin(time * 0.2 + i) * 20, height * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Caustic light patterns on the sandy bottom
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const causticY = height - 45;
    for (let i = 0; i < 12; i++) {
      const cx = (width * 0.05) + (i * width * 0.08) + Math.sin(time * 0.3 + i * 2.1) * 50;
      const cy = causticY + Math.cos(time * 0.4 + i * 1.7) * 10;
      const r = 35 + Math.sin(time * 0.5 + i * 3.2) * 15;
      const alpha = 0.12 + Math.sin(time * 0.6 + i * 1.3) * 0.06;
      const grad3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad3.addColorStop(0, `rgba(160, 220, 255, ${alpha})`);
      grad3.addColorStop(0.6, `rgba(120, 190, 240, ${alpha * 0.4})`);
      grad3.addColorStop(1, 'rgba(100, 180, 255, 0)');
      ctx.fillStyle = grad3;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  function loop() {
    if (!ctx) return;

    time += 0.016;

    drawBackground();

    // Draw floor decorations (behind seaweed)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const d of floorDecor) {
      ctx.font = `${d.size}px serif`;
      ctx.globalAlpha = 1;
      ctx.fillText(d.emoji, d.x, d.y);
    }
    ctx.globalAlpha = 1;

    // Draw seaweed
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const sw of seaweed) {
      const sway = Math.sin(time * sw.swaySpeed + sw.swayOffset) * sw.swayAmount;
      ctx.font = `${sw.size}px serif`;
      ctx.fillText(sw.emoji, sw.x + sway, sw.baseY);
      ctx.font = `${sw.size * 0.85}px serif`;
      ctx.fillText(sw.emoji, sw.x + sway * 1.3, sw.baseY - sw.size * 0.7);
      ctx.font = `${sw.size * 0.7}px serif`;
      ctx.fillText(sw.emoji, sw.x + sway * 1.6, sw.baseY - sw.size * 1.3);
    }

    // Draw bottom critters (lobsters, crabs)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const bc of bottomCritters) {
      bc.x += bc.vx;

      // Occasionally reverse direction
      if (Math.random() < 0.001) {
        bc.vx = -bc.vx;
        bc.facingRight = bc.vx > 0;
      }

      // Wrap horizontally
      if (bc.x > width + bc.size) bc.x = -bc.size;
      if (bc.x < -bc.size) bc.x = width + bc.size;

      ctx.save();
      ctx.translate(bc.x, bc.y);
      if (bc.facingRight) {
        ctx.scale(-1, 1);
      }
      ctx.font = `${bc.size}px serif`;
      ctx.fillText(bc.emoji, 0, 0);
      ctx.restore();
    }

    // Draw bubbles
    for (const b of bubbles) {
      b.y += b.vy;
      b.vx = Math.sin(time * 2 + b.wobbleOffset) * 0.3;
      b.x += b.vx;

      if (b.y < -10) {
        Object.assign(b, makeBubble());
      }

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(150, 210, 255, ${b.opacity})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 230, 255, ${b.opacity * 0.6})`;
      ctx.fill();
    }

    // Draw ambient particles (plankton / sediment)
    for (const p of particles) {
      p.x += p.vx + Math.sin(time * 0.7 + p.phase) * 0.08;
      p.y += p.vy + Math.cos(time * 0.5 + p.phase) * 0.06;

      // Wrap
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 210, 230, ${p.opacity})`;
      ctx.fill();
    }

    // Draw fish
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of fish) {
      // -- Behavior-specific updates --

      if (f.behavior === 'jellyfish') {
        // Jellyfish: slow drift with pulsing upward thrusts
        const pulse = Math.sin(time * f.pulseSpeed! + f.pulsePhase!);
        // Pulse upward on the "squeeze" part of the cycle
        if (pulse > 0.7) {
          f.vy = -0.6 - pulse * 0.4;
        } else {
          // gentle sinking
          f.vy = 0.15;
        }
        f.x += f.vx * 0.3;
        f.y += f.vy;
        // gentle horizontal drift
        f.x += Math.sin(time * 0.5 + f.wobbleOffset) * 0.2;

        // Wrap
        if (f.y < -f.size) f.y = height - 80;
        if (f.y > height - 80) f.vy = -0.3;
        if (f.x > width + f.size) f.x = -f.size;
        if (f.x < -f.size) f.x = width + f.size;
      } else if (f.behavior === 'pufferfish') {
        // Pufferfish: slow swim, size oscillates (inflating/deflating)
        const inflate = Math.sin(time * 0.4 + f.inflateCycle!);
        f.size = f.baseSize * (1 + inflate * 0.25); // ±25% size pulse
        f.x += f.vx;
        f.y += f.vy + Math.sin(time * f.wobbleSpeed + f.wobbleOffset) * 0.2;

        if (f.y < 50) f.vy += 0.02;
        if (f.y > height - 100) f.vy -= 0.02;
        f.vy *= 0.99;

        if (f.vx > 0 && f.x > width + f.size) { f.x = -f.size; f.y = 60 + Math.random() * (height - 240); }
        if (f.vx < 0 && f.x < -f.size) { f.x = width + f.size; f.y = 60 + Math.random() * (height - 240); }
      } else if (f.behavior === 'school' && f.schoolLeader) {
        // Schooling followers: swim at same speed as leader, gentle wobble for life
        const idx = f.schoolIndex || 1;
        f.x += f.vx;
        f.y += Math.sin(time * 2 + idx * 1.5 + f.wobbleOffset) * 0.15;

        // Wrap independently, follow leader's y
        if (f.vx > 0 && f.x > width + f.size) { f.x = -f.size; f.y = f.schoolLeader.y + (f.schoolYOffset || 0); }
        if (f.vx < 0 && f.x < -f.size) { f.x = width + f.size; f.y = f.schoolLeader.y + (f.schoolYOffset || 0); }
      } else {
        // Normal swimming (including school leaders)
        f.x += f.vx;
        f.y += f.vy + Math.sin(time * f.wobbleSpeed + f.wobbleOffset) * 0.3;

        if (f.y < 50) f.vy += 0.02;
        if (f.y > height - 100) f.vy -= 0.02;
        f.vy *= 0.99;

        // Wrap horizontally, randomize y
        if (f.vx > 0 && f.x > width + f.size) { f.x = -f.size; f.y = 60 + Math.random() * (height - 240); }
        if (f.vx < 0 && f.x < -f.size) { f.x = width + f.size; f.y = 60 + Math.random() * (height - 240); }
      }

      ctx.save();
      ctx.globalAlpha = 0.5 + f.depth * 0.5;

      ctx.translate(f.x, f.y);
      if (f.vx > 0) {
        ctx.scale(-1, 1);
      }

      ctx.font = `${f.size}px serif`;
      ctx.fillText(f.emoji, 0, 0);
      ctx.restore();
    }

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Aquarium',
    description: 'Emoji fish swimming in a deep blue ocean',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = 0;
      resize();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      fish.length = 0;
      seaweed.length = 0;
      bubbles.length = 0;
      particles.length = 0;
      bottomCritters.length = 0;
      floorDecor.length = 0;
      window.removeEventListener('resize', resize);
    },
  };
}
