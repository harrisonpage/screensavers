import type { Screensaver } from '../types';

// --- World constants ---
const WORLD_WIDTH_MULTIPLIER = 6; // world is 6x viewport width
const DAY_DURATION = 30; // seconds per day/night cycle
const CAMERA_BASE_SPEED = 0.3; // pixels per frame base pan speed
const VILLAGER_SPEED = 0.8;
const VILLAGER_SIZE = 28;
const BUILDING_SIZE = 48;
const TREE_SIZE = 36;
const ROCK_SIZE = 28;
const BUILD_TIME = 5; // seconds to construct a building
const CROP_GROW_TIME = 8; // seconds per crop growth stage
const WORK_TIME = 3; // seconds to complete a work action

// --- Sky color keyframes (dawn → day → dusk → night) ---
const SKY_COLORS = [
  { r: 255, g: 180, b: 100 }, // dawn (t=0)
  { r: 135, g: 190, b: 230 }, // day (t=0.25)
  { r: 255, g: 140, b: 70 },  // dusk (t=0.5)
  { r: 15, g: 15, b: 50 },    // night (t=0.75)
];

// --- Terrain colors ---
const GROUND_TOP = { r: 80, g: 140, b: 50 };   // grass green
const GROUND_BOT = { r: 90, g: 70, b: 40 };     // earthy brown

interface Scenery {
  worldX: number;
  emoji: string;
  size: number;
}

type BuildingType = 'house' | 'farm' | 'castle';

interface Building {
  worldX: number;
  type: BuildingType;
  emoji: string;
  faction: 0 | 1;
  buildProgress: number; // 0 to 1
  built: boolean;
}

interface FarmPlot {
  worldX: number;
  faction: 0 | 1;
  stage: 0 | 1 | 2 | 3; // 0=empty, 1=🌱, 2=🌿, 3=🌾
  growTimer: number;
}

type VillagerRole = 'farmer' | 'builder';

interface Villager {
  worldX: number;
  role: VillagerRole;
  emoji: string;
  state: 'idle' | 'moving' | 'working';
  targetX: number;
  facingRight: boolean;
  bobPhase: number;
  faction: 0 | 1;
  idleTimer: number;
  speed: number;
  carrying: string | null; // emoji of carried resource, or null
  workTimer: number;
  workTarget: Building | FarmPlot | Scenery | null; // what they're working on
  toolEmoji: string | null; // tool shown during work animation
}

interface Star {
  x: number; // 0-1 normalized screen position
  y: number; // 0-1 normalized
  brightness: number;
  size: number;
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

export function createHamlet(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let worldWidth = 0;

  // Time
  let time = 0; // total elapsed seconds
  let dayCount = 1;

  // Camera
  let cameraX = 0;

  // Entities
  const trees: Scenery[] = [];
  const rocks: Scenery[] = [];
  const villagers: Villager[] = [];
  const buildings: Building[] = [];
  const farmPlots: FarmPlot[] = [];
  const stars: Star[] = [];

  // Phase tracking
  let phase: 'founding' | 'growth' = 'founding';
  let phaseTimer = 0;

  // Build queue — what buildings the settlement still needs
  let housesBuilt = 0;
  let farmsBuilt = 0;
  let castleBuilt = false;

  // --- Terrain ---
  function terrainHeight(worldX: number): number {
    const baseY = height * 0.7;
    return (
      baseY -
      30 * Math.sin(worldX * 0.003) -
      15 * Math.sin(worldX * 0.007 + 2.1) -
      8 * Math.sin(worldX * 0.015 + 4.3) -
      5 * Math.sin(worldX * 0.025 + 1.2)
    );
  }

  // --- Coordinate helpers ---
  function worldToScreenX(wx: number): number {
    let dx = wx - cameraX;
    // Handle wrapping
    if (dx > worldWidth / 2) dx -= worldWidth;
    if (dx < -worldWidth / 2) dx += worldWidth;
    return dx;
  }

  function wrapWorldX(x: number): number {
    return ((x % worldWidth) + worldWidth) % worldWidth;
  }

  // --- Find a flat spot for building near a given x ---
  function findBuildSite(nearX: number): number {
    let bestX = nearX;
    let bestSlope = Infinity;
    for (let i = 0; i < 20; i++) {
      const candidateX = wrapWorldX(nearX + (Math.random() - 0.5) * 400);
      // Check slope: height difference over a short span
      const slope = Math.abs(terrainHeight(candidateX + 20) - terrainHeight(candidateX - 20));
      // Also check we're not too close to existing buildings
      const tooClose = buildings.some(b => {
        let dx = b.worldX - candidateX;
        if (dx > worldWidth / 2) dx -= worldWidth;
        if (dx < -worldWidth / 2) dx += worldWidth;
        return Math.abs(dx) < 80;
      });
      if (slope < bestSlope && !tooClose) {
        bestSlope = slope;
        bestX = candidateX;
      }
    }
    return bestX;
  }

  function makeVillager(role: VillagerRole, worldX: number, faction: 0 | 1): Villager {
    const emojiMap: Record<VillagerRole, string> = {
      farmer: '🧑‍🌾',
      builder: '👷',
    };
    return {
      worldX: wrapWorldX(worldX),
      role,
      emoji: emojiMap[role],
      state: 'idle',
      targetX: worldX,
      facingRight: Math.random() < 0.5,
      bobPhase: Math.random() * Math.PI * 2,
      faction,
      idleTimer: Math.random() * 2,
      speed: VILLAGER_SPEED + (Math.random() - 0.5) * 0.3,
      carrying: null,
      workTimer: 0,
      workTarget: null,
      toolEmoji: null,
    };
  }

  // --- Time of day (0-1 cycle) ---
  function timeOfDay(): number {
    return (time % DAY_DURATION) / DAY_DURATION;
  }

  function isNight(): boolean {
    const t = timeOfDay();
    return t > 0.65 || t < 0.05;
  }

  // --- Sky color at current time ---
  function skyColor(t: number): string {
    // t is 0-1 through the day cycle
    // Map to 4 keyframes
    const idx = t * 4;
    const i = Math.floor(idx) % 4;
    const next = (i + 1) % 4;
    const frac = idx - Math.floor(idx);
    return lerpColor(SKY_COLORS[i], SKY_COLORS[next], frac);
  }

  // --- Populate world ---
  function populate() {
    trees.length = 0;
    rocks.length = 0;
    villagers.length = 0;
    stars.length = 0;

    // Trees — evenly spaced with jitter so they don't bunch
    const treeCount = Math.floor(worldWidth / 120);
    const treeSpacing = worldWidth / treeCount;
    const treeEmoji = ['🌳', '🌲', '🌳', '🌲', '🌳'];
    for (let i = 0; i < treeCount; i++) {
      trees.push({
        worldX: wrapWorldX(i * treeSpacing + (Math.random() - 0.5) * treeSpacing * 0.7),
        emoji: treeEmoji[Math.floor(Math.random() * treeEmoji.length)],
        size: TREE_SIZE + Math.random() * 12,
      });
    }

    // Rocks — evenly spaced with jitter
    const rockCount = Math.floor(worldWidth / 300);
    const rockSpacing = worldWidth / rockCount;
    for (let i = 0; i < rockCount; i++) {
      rocks.push({
        worldX: wrapWorldX(i * rockSpacing + (Math.random() - 0.5) * rockSpacing * 0.7),
        emoji: '🪨',
        size: ROCK_SIZE + Math.random() * 8,
      });
    }

    // Reset building state
    buildings.length = 0;
    farmPlots.length = 0;
    housesBuilt = 0;
    farmsBuilt = 0;
    castleBuilt = false;
    phase = 'founding';
    phaseTimer = 0;

    // Initial villagers — mix of farmers and builders
    const startX = worldWidth * 0.2;
    const roles: VillagerRole[] = ['builder', 'farmer', 'farmer', 'builder', 'farmer'];
    const numVillagers = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numVillagers; i++) {
      const wx = startX + (Math.random() - 0.5) * 200;
      villagers.push(makeVillager(roles[i % roles.length], wx, 0));
    }

    // Stars (fixed screen-space positions, revealed at night)
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.5, // upper half of sky only
        brightness: 0.3 + Math.random() * 0.7,
        size: 0.5 + Math.random() * 1.5,
      });
    }
  }

  // --- Wrapping distance helper ---
  function wrappedDist(a: number, b: number): number {
    let dx = a - b;
    if (dx > worldWidth / 2) dx -= worldWidth;
    if (dx < -worldWidth / 2) dx += worldWidth;
    return dx;
  }

  // --- Move villager toward a world X coordinate ---
  function moveToward(v: Villager, targetX: number): boolean {
    const dx = wrappedDist(targetX, v.worldX);
    if (Math.abs(dx) < 3) return true; // arrived
    v.facingRight = dx > 0;
    v.worldX = wrapWorldX(v.worldX + (dx > 0 ? 1 : -1) * v.speed);
    v.bobPhase += 0.15;
    return false;
  }

  // --- Pick a task for an idle villager ---
  function pickTask(v: Villager) {
    if (v.role === 'builder') {
      pickBuilderTask(v);
    } else if (v.role === 'farmer') {
      pickFarmerTask(v);
    }
  }

  function pickBuilderTask(v: Villager) {
    // Priority: finish unbuilt buildings, then build new ones
    const unbuilt = buildings.find(b => !b.built && b.faction === v.faction);
    if (unbuilt) {
      v.targetX = unbuilt.worldX;
      v.workTarget = unbuilt;
      v.state = 'moving';
      return;
    }

    // Decide what to build next
    if (housesBuilt < 2) {
      // First: chop a tree for wood, then build a house
      const nearbyTree = findNearestTree(v.worldX);
      if (nearbyTree && !v.carrying) {
        v.targetX = nearbyTree.worldX;
        v.workTarget = nearbyTree;
        v.state = 'moving';
        return;
      }
      // If carrying wood, place a house
      if (v.carrying === '🪵') {
        const site = findBuildSite(v.worldX);
        buildings.push({
          worldX: site,
          type: 'house',
          emoji: '🏠',
          faction: v.faction,
          buildProgress: 0,
          built: false,
        });
        housesBuilt++;
        v.carrying = null;
        v.targetX = site;
        v.workTarget = buildings[buildings.length - 1];
        v.state = 'moving';
        return;
      }
    } else if (farmsBuilt < 1) {
      // Build a farm
      if (!v.carrying) {
        const nearbyTree = findNearestTree(v.worldX);
        if (nearbyTree) {
          v.targetX = nearbyTree.worldX;
          v.workTarget = nearbyTree;
          v.state = 'moving';
          return;
        }
      }
      if (v.carrying === '🪵') {
        const site = findBuildSite(v.worldX);
        buildings.push({
          worldX: site,
          type: 'farm',
          emoji: '🏠', // farm building is small — we show plots instead
          faction: v.faction,
          buildProgress: 1,
          built: true,
        });
        farmsBuilt++;
        v.carrying = null;
        // Create farm plots near the farm
        for (let i = 0; i < 4; i++) {
          farmPlots.push({
            worldX: wrapWorldX(site + (i - 1.5) * 30),
            faction: v.faction,
            stage: 0,
            growTimer: 0,
          });
        }
        v.state = 'idle';
        v.idleTimer = 1;
        return;
      }
    } else if (!castleBuilt && housesBuilt >= 2 && farmsBuilt >= 1) {
      // Build a castle
      if (!v.carrying) {
        const nearbyRock = findNearestRock(v.worldX);
        if (nearbyRock) {
          v.targetX = nearbyRock.worldX;
          v.workTarget = nearbyRock;
          v.state = 'moving';
          return;
        }
      }
      if (v.carrying === '🪨') {
        const site = findBuildSite(v.worldX);
        buildings.push({
          worldX: site,
          type: 'castle',
          emoji: '🏰',
          faction: v.faction,
          buildProgress: 0,
          built: false,
        });
        castleBuilt = true;
        v.carrying = null;
        v.targetX = site;
        v.workTarget = buildings[buildings.length - 1];
        v.state = 'moving';
        return;
      }
    }

    // Default: wander
    v.targetX = wrapWorldX(v.worldX + (Math.random() - 0.5) * 400);
    v.state = 'moving';
    v.workTarget = null;
  }

  function pickFarmerTask(v: Villager) {
    // Find a farm plot to work
    const plot = farmPlots.find(
      p => p.faction === v.faction && (p.stage === 0 || p.stage === 3),
    );
    if (plot) {
      v.targetX = plot.worldX;
      v.workTarget = plot;
      v.state = 'moving';
      return;
    }

    // Default: wander near home area
    v.targetX = wrapWorldX(v.worldX + (Math.random() - 0.5) * 300);
    v.state = 'moving';
    v.workTarget = null;
  }

  function findNearestTree(wx: number): Scenery | null {
    let best: Scenery | null = null;
    let bestDist = Infinity;
    for (const t of trees) {
      const d = Math.abs(wrappedDist(t.worldX, wx));
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  function findNearestRock(wx: number): Scenery | null {
    let best: Scenery | null = null;
    let bestDist = Infinity;
    for (const r of rocks) {
      const d = Math.abs(wrappedDist(r.worldX, wx));
      if (d < bestDist) {
        bestDist = d;
        best = r;
      }
    }
    return best;
  }

  // --- Update villagers ---
  function updateVillagers(dt: number) {
    for (const v of villagers) {
      if (v.state === 'idle') {
        v.idleTimer -= dt;
        if (v.idleTimer <= 0) {
          pickTask(v);
        }
      } else if (v.state === 'moving') {
        const arrived = moveToward(v, v.targetX);
        if (arrived) {
          // Start working if we have a work target
          if (v.workTarget) {
            v.state = 'working';
            v.workTimer = 0;
            // Set tool emoji based on what we're doing
            if (v.workTarget === null) {
              v.toolEmoji = null;
            } else if ('emoji' in v.workTarget && v.workTarget.emoji === '🪨') {
              v.toolEmoji = '⛏️';
            } else if ('emoji' in v.workTarget && (v.workTarget.emoji === '🌳' || v.workTarget.emoji === '🌲')) {
              v.toolEmoji = '🪓';
            } else if ('buildProgress' in v.workTarget && !(v.workTarget as Building).built) {
              v.toolEmoji = '🔨';
            } else if ('stage' in v.workTarget) {
              v.toolEmoji = null; // farming — no tool, just kneel
            } else {
              v.toolEmoji = null;
            }
          } else {
            v.state = 'idle';
            v.idleTimer = 1 + Math.random() * 3;
          }
        }
      } else if (v.state === 'working') {
        v.workTimer += dt;
        if (v.workTarget && 'buildProgress' in v.workTarget && !(v.workTarget as Building).built) {
          // Building construction
          const bld = v.workTarget as Building;
          bld.buildProgress = Math.min(1, bld.buildProgress + dt / BUILD_TIME);
          if (bld.buildProgress >= 1) {
            bld.built = true;
            v.state = 'idle';
            v.idleTimer = 1;
            v.workTarget = null;
            v.toolEmoji = null;
          }
        } else if (v.workTarget && 'stage' in v.workTarget) {
          // Farming
          const plot = v.workTarget as FarmPlot;
          if (v.workTimer >= WORK_TIME) {
            if (plot.stage === 0) {
              plot.stage = 1; // plant
              plot.growTimer = 0;
            } else if (plot.stage === 3) {
              // Harvest
              v.carrying = '🌾';
              plot.stage = 0;
            }
            v.state = 'idle';
            v.idleTimer = 1 + Math.random() * 2;
            v.workTarget = null;
            v.toolEmoji = null;
          }
        } else if (v.workTarget && 'emoji' in v.workTarget) {
          // Chopping tree or mining rock
          if (v.workTimer >= WORK_TIME) {
            const target = v.workTarget as Scenery;
            if (target.emoji === '🌳' || target.emoji === '🌲') {
              v.carrying = '🪵';
              // Remove tree
              const idx = trees.indexOf(target);
              if (idx >= 0) trees.splice(idx, 1);
            } else if (target.emoji === '🪨') {
              v.carrying = '🪨';
              const idx = rocks.indexOf(target);
              if (idx >= 0) rocks.splice(idx, 1);
            }
            v.state = 'idle';
            v.idleTimer = 0.5;
            v.workTarget = null;
            v.toolEmoji = null;
          }
        } else {
          // Unknown work target, go idle
          v.state = 'idle';
          v.idleTimer = 1;
          v.workTarget = null;
          v.toolEmoji = null;
        }
      }
    }

    // Drop carried resources after a while (visual theater — they just disappear)
    for (const v of villagers) {
      if (v.carrying && v.state === 'idle') {
        // Builders keep their resources until they use them (handled in pickTask)
        // Farmers drop wheat after being idle
        if (v.role === 'farmer' && v.carrying === '🌾') {
          v.carrying = null;
        }
      }
    }
  }

  // --- Update farm plots (grow crops over time) ---
  function updateFarmPlots(dt: number) {
    for (const plot of farmPlots) {
      if (plot.stage === 1 || plot.stage === 2) {
        plot.growTimer += dt;
        if (plot.growTimer >= CROP_GROW_TIME) {
          plot.stage = (plot.stage + 1) as 1 | 2 | 3;
          plot.growTimer = 0;
        }
      }
    }
  }

  // --- Drawing ---
  function drawSky() {
    if (!ctx) return;
    const t = timeOfDay();
    const topColor = skyColor(t);

    // Gradient from sky color to a slightly lighter horizon
    const grad = ctx.createLinearGradient(0, 0, 0, height * 0.7);
    grad.addColorStop(0, topColor);
    // Horizon is slightly lighter/warmer
    const horizonT = ((t * 4 + 0.5) % 4) / 4;
    grad.addColorStop(1, skyColor(horizonT));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  function drawStars() {
    if (!ctx) return;
    const t = timeOfDay();
    // Stars visible during night (0.6-1.0 and 0.0-0.1)
    let alpha = 0;
    if (t > 0.6) {
      alpha = Math.min(1, (t - 0.6) / 0.1);
    } else if (t < 0.1) {
      alpha = Math.max(0, 1 - t / 0.1);
    }
    if (alpha <= 0) return;

    for (const s of stars) {
      const twinkle = 0.7 + 0.3 * Math.sin(time * 3 + s.x * 100 + s.y * 77);
      ctx.beginPath();
      ctx.arc(s.x * width, s.y * height, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 240, ${alpha * s.brightness * twinkle})`;
      ctx.fill();
    }
  }

  function drawSunMoon() {
    if (!ctx) return;
    const t = timeOfDay();

    // Sun: visible from t=0.1 to t=0.55
    // Moon: visible from t=0.55 to t=1.1 (wrapping)
    const sunArc = (t - 0.1) / 0.45; // 0 to 1 during daytime
    if (sunArc > 0 && sunArc < 1) {
      const sx = width * 0.1 + sunArc * width * 0.8;
      const sy = height * 0.15 - Math.sin(sunArc * Math.PI) * height * 0.1;
      ctx.font = '40px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText('☀️', sx, sy);
    }

    // Moon
    let moonT = t - 0.6;
    if (moonT < 0) moonT += 1;
    const moonArc = moonT / 0.45;
    if (moonArc > 0 && moonArc < 1) {
      const mx = width * 0.1 + moonArc * width * 0.8;
      const my = height * 0.15 - Math.sin(moonArc * Math.PI) * height * 0.1;
      ctx.font = '36px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText('🌙', mx, my);
    }
  }

  function drawTerrain() {
    if (!ctx) return;

    // Draw the ground as a filled shape following the terrain curve
    ctx.beginPath();
    const startScreenX = -20;
    const endScreenX = width + 20;

    // Start at bottom-left
    ctx.moveTo(startScreenX, height);

    // Draw terrain line
    for (let sx = startScreenX; sx <= endScreenX; sx += 4) {
      const wx = wrapWorldX(cameraX + sx);
      const ty = terrainHeight(wx);
      ctx.lineTo(sx, ty);
    }

    // Close at bottom-right
    ctx.lineTo(endScreenX, height);
    ctx.closePath();

    // Fill with gradient
    const groundGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    groundGrad.addColorStop(0, `rgb(${GROUND_TOP.r},${GROUND_TOP.g},${GROUND_TOP.b})`);
    groundGrad.addColorStop(1, `rgb(${GROUND_BOT.r},${GROUND_BOT.g},${GROUND_BOT.b})`);
    ctx.fillStyle = groundGrad;
    ctx.fill();

    // Terrain edge line (slightly darker green)
    ctx.beginPath();
    for (let sx = startScreenX; sx <= endScreenX; sx += 4) {
      const wx = wrapWorldX(cameraX + sx);
      const ty = terrainHeight(wx);
      if (sx === startScreenX) ctx.moveTo(sx, ty);
      else ctx.lineTo(sx, ty);
    }
    ctx.strokeStyle = 'rgba(40, 80, 20, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawScenery(items: Scenery[]) {
    if (!ctx) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const item of items) {
      const sx = worldToScreenX(item.worldX);
      if (sx < -item.size || sx > width + item.size) continue; // cull

      const groundY = terrainHeight(item.worldX);
      ctx.font = `${item.size}px serif`;
      ctx.fillStyle = '#000';
      ctx.fillText(item.emoji, sx, groundY);
    }
  }

  function drawBuildings() {
    if (!ctx) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const b of buildings) {
      if (b.type === 'farm') continue; // farms are shown as plots, not buildings
      const sx = worldToScreenX(b.worldX);
      if (sx < -BUILDING_SIZE * 2 || sx > width + BUILDING_SIZE * 2) continue;

      const groundY = terrainHeight(b.worldX);
      ctx.save();
      ctx.globalAlpha = b.built ? 1 : 0.3 + b.buildProgress * 0.7;
      ctx.font = `${BUILDING_SIZE}px serif`;
      ctx.fillStyle = '#000';
      ctx.fillText(b.emoji, sx, groundY);
      ctx.restore();
    }
  }

  function drawFarmPlots() {
    if (!ctx) return;
    const PLOT_W = 20;
    const PLOT_H = 8;
    const cropEmoji = ['', '🌱', '🌿', '🌾'];

    for (const plot of farmPlots) {
      const sx = worldToScreenX(plot.worldX);
      if (sx < -40 || sx > width + 40) continue;

      const groundY = terrainHeight(plot.worldX);

      // Tilled soil rectangle
      ctx.fillStyle = '#6b4c2a';
      ctx.fillRect(sx - PLOT_W / 2, groundY - PLOT_H, PLOT_W, PLOT_H);
      ctx.strokeStyle = '#503a1e';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - PLOT_W / 2, groundY - PLOT_H, PLOT_W, PLOT_H);

      // Crop emoji if growing
      if (plot.stage > 0) {
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#000';
        ctx.fillText(cropEmoji[plot.stage], sx, groundY - PLOT_H);
      }
    }
  }

  function drawVillagers() {
    if (!ctx) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (const v of villagers) {
      const sx = worldToScreenX(v.worldX);
      if (sx < -VILLAGER_SIZE * 2 || sx > width + VILLAGER_SIZE * 2) continue;

      const groundY = terrainHeight(v.worldX);
      const bob = v.state === 'moving' ? Math.sin(v.bobPhase) * 4 : 0;

      ctx.save();
      ctx.translate(sx, groundY - bob);
      if (!v.facingRight) {
        ctx.scale(-1, 1);
      }
      ctx.font = `${VILLAGER_SIZE}px serif`;
      ctx.fillStyle = '#000';
      ctx.fillText(v.emoji, 0, 0);
      ctx.restore();

      // Carried resource floating above head
      if (v.carrying) {
        const carryBob = Math.sin(time * 3) * 2;
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#000';
        ctx.fillText(v.carrying, sx, groundY - bob - VILLAGER_SIZE - 6 + carryBob);
      }

      // Tool animation during work
      if (v.state === 'working' && v.toolEmoji) {
        const toolBob = Math.sin(time * 6) * 3; // faster bob for "working" feel
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#000';
        const toolOffX = v.facingRight ? 14 : -14;
        ctx.fillText(v.toolEmoji, sx + toolOffX, groundY - bob - 10 + toolBob);
      }

      // Faction color dot above head
      const dotY = groundY - bob - VILLAGER_SIZE - (v.carrying ? 22 : 4);
      ctx.beginPath();
      ctx.arc(sx, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = v.faction === 0 ? '#e55' : '#55e';
      ctx.fill();
    }
  }

  function drawHUD() {
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.font = '14px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`Day ${dayCount}`, 12, height - 12);
    ctx.restore();
  }

  // --- Camera ---
  function updateCamera() {
    cameraX = wrapWorldX(cameraX + CAMERA_BASE_SPEED);
  }

  // --- Main loop ---
  let lastFrameTime = 0;

  function loop(timestamp: number) {
    if (!ctx) return;

    const dt = lastFrameTime ? Math.min((timestamp - lastFrameTime) / 1000, 0.1) : 0.016;
    lastFrameTime = timestamp;

    time += dt;

    // Track day counter
    const prevDay = Math.floor(((time - dt) % (DAY_DURATION * 1000)) / DAY_DURATION);
    const curDay = Math.floor(time / DAY_DURATION);
    if (curDay > prevDay || (time > 0 && time - dt <= 0)) {
      dayCount = curDay + 1;
    }

    phaseTimer += dt;
    updateCamera();
    updateVillagers(dt);
    updateFarmPlots(dt);

    // Draw
    drawSky();
    drawStars();
    drawSunMoon();
    drawTerrain();
    drawFarmPlots();
    drawScenery(rocks);
    drawScenery(trees);
    drawBuildings();
    drawVillagers();
    drawHUD();

    animationFrame = requestAnimationFrame(loop);
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    worldWidth = width * WORLD_WIDTH_MULTIPLIER;
    populate();
  }

  return {
    name: 'Hamlet',
    description: 'A tiny emoji civilization rises, wars, and rebuilds',
    disabled: true,

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      time = 0;
      dayCount = 1;
      cameraX = 0;
      lastFrameTime = 0;
      resize();
      animationFrame = requestAnimationFrame(loop);
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      trees.length = 0;
      rocks.length = 0;
      villagers.length = 0;
      buildings.length = 0;
      farmPlots.length = 0;
      stars.length = 0;
      window.removeEventListener('resize', resize);
    },
  };
}
