import type { Screensaver } from '../types';

interface Planet {
  name: string;
  color: string;
  radius: number;
  orbitRadius: number;
  orbitalPeriod: number;
  angle: number;
}

interface Comet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  active: boolean;
  age: number;
}

const COMET_INTERVAL = 20000;

export function createSolarSystem(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 0;
  let height = 0;
  let animationFrame: number | null = null;
  let frame = 0;
  let baseCenterX = 0;
  let baseCenterY = 0;
  let planets: Planet[] = [];
  let lastComet = 0;
  let comet: Comet = { x: 0, y: 0, dx: 0, dy: 0, active: false, age: 0 };

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    baseCenterX = width / 2;
    baseCenterY = height / 2;
  }

  function setupPlanets() {
    const distanceScale = 100;
    const timeScale = 300;

    planets = [
      { name: 'Mercury', color: 'gray', radius: 6, orbitRadius: 45, orbitalPeriod: Math.log(0.24 + 1) * timeScale, angle: 0 },
      { name: 'Venus', color: 'goldenrod', radius: 9, orbitRadius: Math.log(0.72 + 1) * distanceScale, orbitalPeriod: Math.log(0.62 + 1) * timeScale, angle: 0 },
      { name: 'Earth', color: '#5cc8ff', radius: 9, orbitRadius: Math.log(1.0 + 1) * distanceScale, orbitalPeriod: Math.log(1.0 + 1) * timeScale, angle: 0 },
      { name: 'Mars', color: 'red', radius: 8, orbitRadius: Math.log(1.52 + 1) * distanceScale, orbitalPeriod: Math.log(1.88 + 1) * timeScale, angle: 0 },
      { name: 'Jupiter', color: 'orange', radius: 14, orbitRadius: Math.log(5.2 + 1) * distanceScale, orbitalPeriod: Math.log(11.86 + 1) * timeScale, angle: 0 },
      { name: 'Saturn', color: 'khaki', radius: 13, orbitRadius: Math.log(9.58 + 1) * distanceScale, orbitalPeriod: Math.log(29.45 + 1) * timeScale, angle: 0 },
      { name: 'Uranus', color: 'lightblue', radius: 10, orbitRadius: Math.log(19.18 + 1) * distanceScale, orbitalPeriod: Math.log(84.01 + 1) * timeScale, angle: 0 },
      { name: 'Neptune', color: 'blue', radius: 10, orbitRadius: Math.log(30.07 + 1) * distanceScale, orbitalPeriod: Math.log(164.8 + 1) * timeScale, angle: 0 },
    ];
  }

  function getSunPosition(time: number) {
    const driftX = Math.cos(time * 0.005) * 40;
    const driftY = Math.sin(time * 0.004) * 30;
    return { x: baseCenterX + driftX, y: baseCenterY + driftY };
  }

  function updateComet(time: number) {
    if (!comet.active && time - lastComet > COMET_INTERVAL) {
      const side = Math.floor(Math.random() * 4);
      const speed = 10;
      let x = 0, y = 0, dx = 0, dy = 0;

      if (side === 0) { x = 0; y = Math.random() * height; dx = speed; dy = speed * (Math.random() - 0.5); }
      else if (side === 1) { x = width; y = Math.random() * height; dx = -speed; dy = speed * (Math.random() - 0.5); }
      else if (side === 2) { x = Math.random() * width; y = 0; dx = speed * (Math.random() - 0.5); dy = speed; }
      else { x = Math.random() * width; y = height; dx = speed * (Math.random() - 0.5); dy = -speed; }

      comet = { x, y, dx, dy, active: true, age: 0 };
      lastComet = time;
    }

    if (comet.active) {
      comet.x += comet.dx;
      comet.y += comet.dy;
      comet.age++;
      if (comet.x < -50 || comet.x > width + 50 || comet.y < -50 || comet.y > height + 50) {
        comet.active = false;
      }
    }
  }

  function drawComet() {
    if (!comet.active || !ctx) return;
    ctx.beginPath();
    ctx.arc(comet.x, comet.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawSun(x: number, y: number) {
    if (!ctx) return;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 70);
    gradient.addColorStop(0, '#ffffcc');
    gradient.addColorStop(1, '#ff9900');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSaturnRings(x: number, y: number, r: number) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 6);
    ctx.strokeStyle = 'rgba(200, 200, 160, 0.5)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 2.2, r * 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlanet(center: { x: number; y: number }, planet: Planet, time: number) {
    if (!ctx) return;
    const angle = ((time % planet.orbitalPeriod) / planet.orbitalPeriod) * Math.PI * 2;
    planet.angle = angle;
    const x = center.x + Math.cos(angle) * planet.orbitRadius;
    const y = center.y + Math.sin(angle) * planet.orbitRadius;

    if (planet.name === 'Saturn') {
      drawSaturnRings(x, y, planet.radius);
    }

    ctx.beginPath();
    ctx.arc(x, y, planet.radius, 0, Math.PI * 2);
    ctx.fillStyle = planet.color;
    ctx.fill();
  }

  function drawOrbit(center: { x: number; y: number }, planet: Planet) {
    if (!ctx) return;
    ctx.beginPath();
    ctx.arc(center.x, center.y, planet.orbitRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function loop() {
    if (!ctx) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    const time = frame;
    const sun = getSunPosition(time);

    updateComet(time * 16);
    drawComet();
    drawSun(sun.x, sun.y);

    for (const planet of planets) {
      drawOrbit(sun, planet);
      drawPlanet(sun, planet, time);
    }

    frame++;
    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Solar',
    description: 'Orbiting planets and comets',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      resize();
      setupPlanets();
      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      planets = [];
      window.removeEventListener('resize', resize);
    },
  };
}
