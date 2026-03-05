// Author: Harrison Page
// License: MIT
// Created: 25-Feb-2026

import type { Screensaver } from '../types';

export function createPewPew(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;
  let lastTime = 0;

  // Apple ][ green
  const GREEN = '#33ff33';
  const GREEN_DIM = 'rgba(51, 255, 51, 0.5)';
  const GREEN_BRIGHT = '#aaffaa';

  // Simple 3D projection — scale factor maps world units to screen pixels
  const CAM_Z = -20;

  function project(x: number, y: number, z: number): [number, number] {
    // Scale world coords so that BOUNDS fills ~80% of the smaller screen dimension
    const worldScale = Math.min(width, height) / (BOUNDS * 2) * 0.8;
    const fov = 12; // in world units — controls perspective strength
    const dz = z - CAM_Z;
    const perspScale = fov / (fov + dz) * worldScale;
    return [width / 2 + x * perspScale, height / 2 - y * perspScale];
  }

  // ---- Ship geometry (wireframe wedge) ----
  const SHIP_SCALE = 1.4;
  const H = 0.2;
  // Top deck
  const shipVerts = {
    noseTop:       [0,  H, -1.0],
    leftWingTop:   [-0.6, H * 0.5, 0.7],
    rightWingTop:  [0.6, H * 0.5, 0.7],
    leftNotchTop:  [-0.25, H * 0.5, 0.35],
    rightNotchTop: [0.25, H * 0.5, 0.35],
    // Bottom deck
    noseBot:       [0, -H, -1.0],
    leftWingBot:   [-0.6, -H * 0.5, 0.7],
    rightWingBot:  [0.6, -H * 0.5, 0.7],
    leftNotchBot:  [-0.25, -H * 0.5, 0.35],
    rightNotchBot: [0.25, -H * 0.5, 0.35],
  };

  const shipEdges: [string, string][] = [
    // Top outline
    ['noseTop', 'leftWingTop'],
    ['leftWingTop', 'leftNotchTop'],
    ['leftNotchTop', 'rightNotchTop'],
    ['rightNotchTop', 'rightWingTop'],
    ['rightWingTop', 'noseTop'],
    // Bottom outline
    ['noseBot', 'leftWingBot'],
    ['leftWingBot', 'leftNotchBot'],
    ['leftNotchBot', 'rightNotchBot'],
    ['rightNotchBot', 'rightWingBot'],
    ['rightWingBot', 'noseBot'],
    // Vertical struts
    ['noseTop', 'noseBot'],
    ['leftWingTop', 'leftWingBot'],
    ['rightWingTop', 'rightWingBot'],
    ['leftNotchTop', 'leftNotchBot'],
    ['rightNotchTop', 'rightNotchBot'],
  ];

  // ---- 3x3 matrix rotation helpers ----
  type Vec3 = [number, number, number];
  type Mat3 = [Vec3, Vec3, Vec3]; // rows

  function matMul(a: Mat3, b: Mat3): Mat3 {
    const r: Mat3 = [[0,0,0],[0,0,0],[0,0,0]];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        r[i][j] = a[i][0]*b[0][j] + a[i][1]*b[1][j] + a[i][2]*b[2][j];
    return r;
  }

  function matVec(m: Mat3, v: Vec3): Vec3 {
    return [
      m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
      m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
      m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2],
    ];
  }

  function rotY(a: number): Mat3 {
    const c = Math.cos(a), s = Math.sin(a);
    return [[c,0,s],[0,1,0],[-s,0,c]];
  }

  function rotX(a: number): Mat3 {
    const c = Math.cos(a), s = Math.sin(a);
    return [[1,0,0],[0,c,-s],[0,s,c]];
  }

  function rotZ(a: number): Mat3 {
    const c = Math.cos(a), s = Math.sin(a);
    return [[c,-s,0],[s,c,0],[0,0,1]];
  }

  function normalize(v: Vec3): Vec3 {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    if (len < 0.0001) return [0, 0, 1];
    return [v[0]/len, v[1]/len, v[2]/len];
  }

  function sub(a: Vec3, b: Vec3): Vec3 {
    return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  }

  function add(a: Vec3, b: Vec3): Vec3 {
    return [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
  }

  function scale(v: Vec3, s: number): Vec3 {
    return [v[0]*s, v[1]*s, v[2]*s];
  }

  function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
  }

  function dist(a: Vec3, b: Vec3): number {
    const d = sub(a, b);
    return Math.sqrt(d[0]*d[0] + d[1]*d[1] + d[2]*d[2]);
  }

  // Build rotation matrix to face a direction (around Y primarily)
  function facingMatrix(dir: Vec3): Mat3 {
    const fwd = normalize(dir);
    // yaw = atan2(x, -z), pitch = asin(y)
    const yaw = Math.atan2(fwd[0], -fwd[2]);
    const pitch = Math.asin(Math.max(-1, Math.min(1, fwd[1])));
    return matMul(rotY(yaw), rotX(-pitch));
  }

  // ---- Ship state ----
  interface Ship {
    pos: Vec3;
    lastPos: Vec3;
    velocity: Vec3;
    time: number;
    speed: number;
    orbitRadius: number;
    verticalAmp: number;
    phaseOffset: number;
    flashTime: number;
    isFlashing: boolean;
    fireTimer: number;
    fireInterval: number;
  }

  function makeShip(id: number): Ship {
    const pos: Vec3 = id === 0 ? [-5, 0, 0] : [5, 0, 0];
    return {
      pos,
      lastPos: [...pos] as Vec3,
      velocity: [0, 0, 0],
      time: 0,
      speed: 0.8,
      orbitRadius: 8,
      verticalAmp: 4,
      phaseOffset: id * Math.PI,
      flashTime: 0,
      isFlashing: false,
      fireTimer: 2 + Math.random() * 2,
      fireInterval: 0,
    };
  }

  // ---- Missile state ----
  interface Missile {
    pos: Vec3;
    dir: Vec3;
    speed: number;
    lifetime: number;
    targetIdx: number;
  }

  // ---- Debris state ----
  interface Debris {
    pos: Vec3;
    dir: Vec3;
    speed: number;
    lifetime: number;
    maxLifetime: number;
    angle: number;
    length: number;
    rotSpeed: number;
  }

  let ships: Ship[] = [];
  let missiles: Missile[] = [];
  let debris: Debris[] = [];

  const BOUNDS = 12;
  const MISSILE_SPEED = 20;
  const MISSILE_MAX_LIFE = 3;
  const HIT_RADIUS = 1.2;

  function updateShip(ship: Ship, dt: number) {
    ship.time += dt * ship.speed;
    const t = ship.time + ship.phaseOffset;

    const newPos: Vec3 = [
      Math.sin(t * 0.7) * ship.orbitRadius,
      Math.sin(t * 1.3) * ship.verticalAmp,
      Math.cos(t * 0.5) * ship.orbitRadius * 0.5,
    ];

    ship.lastPos = [...ship.pos] as Vec3;
    ship.pos = lerp3(ship.pos, newPos, dt * 1.5);

    // Clamp
    ship.pos[0] = Math.max(-BOUNDS, Math.min(BOUNDS, ship.pos[0]));
    ship.pos[1] = Math.max(-BOUNDS * 0.6, Math.min(BOUNDS * 0.6, ship.pos[1]));
    ship.pos[2] = Math.max(-BOUNDS * 0.5, Math.min(BOUNDS * 0.5, ship.pos[2]));

    // Velocity
    if (dt > 0) {
      const actual: Vec3 = scale(sub(ship.pos, ship.lastPos), 1 / dt);
      ship.velocity = lerp3(ship.velocity, actual, dt * 2);
    }

    // Flash update
    if (ship.isFlashing) {
      ship.flashTime += dt;
      if (ship.flashTime > 0.3) {
        ship.isFlashing = false;
      }
    }

    // Fire timer
    ship.fireTimer -= dt;
  }

  function fireFromShip(shipIdx: number) {
    const ship = ships[shipIdx];
    const targetIdx = shipIdx === 0 ? 1 : 0;
    const target = ships[targetIdx];

    const dir = normalize(sub(target.pos, ship.pos));
    missiles.push({
      pos: [...ship.pos] as Vec3,
      dir,
      speed: MISSILE_SPEED,
      lifetime: 0,
      targetIdx,
    });

    ship.fireTimer = 2.5 + Math.random() * 2.5;
  }

  function updateMissiles(dt: number) {
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      m.pos = add(m.pos, scale(m.dir, m.speed * dt));
      m.lifetime += dt;

      // Check hit
      const target = ships[m.targetIdx];
      if (dist(m.pos, target.pos) < HIT_RADIUS) {
        // Hit!
        target.isFlashing = true;
        target.flashTime = 0;
        spawnDebris(target.pos);
        missiles.splice(i, 1);
        continue;
      }

      // Remove if too old or out of bounds
      const d = Math.sqrt(m.pos[0]*m.pos[0] + m.pos[1]*m.pos[1] + m.pos[2]*m.pos[2]);
      if (m.lifetime > MISSILE_MAX_LIFE || d > 50) {
        missiles.splice(i, 1);
      }
    }
  }

  function spawnDebris(pos: Vec3) {
    for (let i = 0; i < 8; i++) {
      debris.push({
        pos: [...pos] as Vec3,
        dir: normalize([
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
        ]),
        speed: 5 + Math.random() * 7,
        lifetime: 0,
        maxLifetime: 0.6 + Math.random() * 0.4,
        angle: Math.random() * Math.PI * 2,
        length: 0.15 + Math.random() * 0.25,
        rotSpeed: (Math.random() - 0.5) * 20,
      });
    }
  }

  function updateDebris(dt: number) {
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.pos = add(d.pos, scale(d.dir, d.speed * dt));
      d.speed = d.speed + (0 - d.speed) * dt * 3; // decelerate
      d.angle += d.rotSpeed * dt;
      d.lifetime += dt;
      if (d.lifetime > d.maxLifetime) {
        debris.splice(i, 1);
      }
    }
  }

  // ---- Drawing ----
  function drawLine3D(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
    if (!ctx) return;
    const [sx1, sy1] = project(x1, y1, z1);
    const [sx2, sy2] = project(x2, y2, z2);
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();
  }

  function drawShip(ship: Ship) {
    if (!ctx) return;

    // Flash: blink rapidly
    if (ship.isFlashing) {
      const blink = Math.floor(ship.flashTime / 0.05) % 2 === 0;
      if (!blink) return;
    }

    // Build rotation matrix from velocity
    const vel = ship.velocity;
    const vLen = Math.sqrt(vel[0]*vel[0] + vel[1]*vel[1] + vel[2]*vel[2]);
    const rot = vLen > 0.1 ? facingMatrix(vel) : rotY(0);

    ctx.strokeStyle = GREEN;
    ctx.lineWidth = Math.max(1.5, Math.min(width, height) / 500);

    for (const [aName, bName] of shipEdges) {
      const aRaw = shipVerts[aName as keyof typeof shipVerts];
      const bRaw = shipVerts[bName as keyof typeof shipVerts];
      const a = matVec(rot, scale(aRaw as Vec3, SHIP_SCALE));
      const b = matVec(rot, scale(bRaw as Vec3, SHIP_SCALE));
      drawLine3D(
        ship.pos[0] + a[0], ship.pos[1] + a[1], ship.pos[2] + a[2],
        ship.pos[0] + b[0], ship.pos[1] + b[1], ship.pos[2] + b[2],
      );
    }
  }

  function drawMissiles() {
    if (!ctx) return;
    ctx.fillStyle = GREEN_BRIGHT;
    for (const m of missiles) {
      const [sx, sy] = project(m.pos[0], m.pos[1], m.pos[2]);
      // Small dot for missile
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, Math.min(width, height) / 400), 0, Math.PI * 2);
      ctx.fill();

      // Short trailing line
      const tail = sub(m.pos, scale(m.dir, 0.5));
      const [tx, ty] = project(tail[0], tail[1], tail[2]);
      ctx.strokeStyle = GREEN_DIM;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
  }

  function drawDebris() {
    if (!ctx) return;
    for (const d of debris) {
      const alpha = 1 - d.lifetime / d.maxLifetime;
      ctx.strokeStyle = `rgba(51, 255, 51, ${alpha})`;
      ctx.lineWidth = 1;

      const cos = Math.cos(d.angle) * d.length;
      const sin = Math.sin(d.angle) * d.length;

      drawLine3D(
        d.pos[0] + cos, d.pos[1] + sin, d.pos[2],
        d.pos[0] - cos, d.pos[1] - sin, d.pos[2],
      );
    }
  }

  function drawScanlines() {
    if (!ctx) return;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function loop(timestamp: number) {
    if (!ctx) return;

    const dt = lastTime === 0 ? 1 / 60 : Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // Update
    for (let i = 0; i < ships.length; i++) {
      updateShip(ships[i], dt);
      if (ships[i].fireTimer <= 0) {
        fireFromShip(i);
      }
    }
    updateMissiles(dt);
    updateDebris(dt);

    // Draw
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    drawShip(ships[0]);
    drawShip(ships[1]);
    drawMissiles();
    drawDebris();
    drawScanlines();

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Pew-Pew',
    description: 'Wireframe spaceships in a dogfight',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      lastTime = 0;
      ships = [makeShip(0), makeShip(1)];
      missiles = [];
      debris = [];
      resize();
      animationFrame = requestAnimationFrame(loop);
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      window.removeEventListener('resize', resize);
    },
  };
}
