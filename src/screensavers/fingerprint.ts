// Created by diviaki in 2016-11-18
// https://www.shadertoy.com/view/4t3SWN

import type { Screensaver } from '../types';

const SHADER_SOURCE = `
// Created by diviaki in 2016-11-18
vec2 hash2( vec2 p )
{
	p = vec2( dot(p,vec2(63.31,127.63)), dot(p,vec2(395.467,213.799)) );
	return -1.0 + 2.0*fract(sin(p)*43141.59265);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float invzoom = 40.;
    vec2 uv = invzoom*((fragCoord-0.5*iResolution.xy)/iResolution.x);
    float bounds = smoothstep(9.,10.,length(uv*vec2(0.7,0.5)));
    float mask = 1.0 - bounds;

    //cumulate information
    float a=0.;
    vec2 h = vec2(floor(7.*iTime), 0.);
    for(int i=0; i<50; i++){
        float s=sign(h.x);
        h = hash2(h)*vec2(15.,20.);
    	a += s*atan(uv.x-h.x, uv.y-h.y);
    }

    //comment this out for static center
    uv += 20.*abs(hash2(h));

    a+=atan(uv.y, uv.x); //spirallic center more likely

    float w = 0.8; //row width
    float p=(1.-bounds)*w; //pressure
    float s = min(0.3,p); //smooth
    float l = length(uv)+0.319*a; //base rings plus information

    //dist -> alternate pattern
    float m = mod(l,2.);
    float v = (1.-smoothstep(2.-s,2.,m))*smoothstep(p,p+s,m);

	fragColor = vec4(v*mask,v*mask,v*mask,1.);
}
`;

const COLORS = [
  '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff',
  '#ffffff', '#ff8000', '#8000ff', '#00ff80',
];

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

export function createFingerprint(): Screensaver {
  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let animationFrame: number | null = null;
  let startTime = 0;

  // Uniform locations
  let uResolution: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uMouse: WebGLUniformLocation | null = null;
  let uTint: WebGLUniformLocation | null = null;
  let uOffset: WebGLUniformLocation | null = null;

  // Bounce state
  const boxSize = 500;
  let x = 100;
  let y = 100;
  let vx = 3;
  let vy = 3;
  let colorIndex = 0;
  let tint = hexToRgb(COLORS[0]);

  function nextColor() {
    colorIndex = (colorIndex + 1) % COLORS.length;
    tint = hexToRgb(COLORS[colorIndex]);
  }

  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const fullFragmentSource = `
    precision highp float;
    uniform vec3 iResolution;
    uniform float iTime;
    uniform vec4 iMouse;
    uniform vec3 uTint;
    uniform vec2 uOffset;

    ${SHADER_SOURCE}

    void main() {
      // gl_FragCoord is in window coords; subtract viewport offset
      // to get local coordinates within the bouncing box
      vec2 localCoord = gl_FragCoord.xy - uOffset;
      mainImage(gl_FragColor, localCoord);
      gl_FragColor.rgb *= uTint;
    }
  `;

  function compileShader(type: number, source: string): WebGLShader | null {
    if (!gl) return null;
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function initGL(): boolean {
    if (!gl) return false;

    const vs = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fullFragmentSource);
    if (!vs || !fs) return false;

    program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    uResolution = gl.getUniformLocation(program, 'iResolution');
    uTime = gl.getUniformLocation(program, 'iTime');
    uMouse = gl.getUniformLocation(program, 'iMouse');
    uTint = gl.getUniformLocation(program, 'uTint');
    uOffset = gl.getUniformLocation(program, 'uOffset');

    return true;
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function loop() {
    if (!gl || !program) return;

    const w = canvas.width;
    const h = canvas.height;
    const elapsed = (performance.now() - startTime) / 1000;

    // Update bounce position
    x += vx;
    y += vy;

    let bounced = false;
    if (x <= 0 || x + boxSize >= w) {
      vx *= -1;
      x = Math.max(0, Math.min(x, w - boxSize));
      bounced = true;
    }
    if (y <= 0 || y + boxSize >= h) {
      vy *= -1;
      y = Math.max(0, Math.min(y, h - boxSize));
      bounced = true;
    }
    if (bounced) {
      nextColor();
    }

    // Clear entire screen to black
    gl.viewport(0, 0, w, h);
    gl.scissor(0, 0, w, h);
    gl.enable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Render shader into bouncing box
    // WebGL y=0 is bottom, DOM y=0 is top, so flip y
    const glY = h - y - boxSize;
    gl.viewport(x, glY, boxSize, boxSize);
    gl.scissor(x, glY, boxSize, boxSize);

    gl.uniform3f(uResolution, boxSize, boxSize, 1.0);
    gl.uniform1f(uTime, elapsed);
    gl.uniform4f(uMouse, 0, 0, 0, 0);
    gl.uniform3f(uTint, tint[0], tint[1], tint[2]);
    gl.uniform2f(uOffset, x, glY);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.disable(gl.SCISSOR_TEST);

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name: 'Fingerprint',
    description: 'Bouncing procedural fingerprint',

    init(c: HTMLCanvasElement) {
      canvas = c;
      gl = canvas.getContext('webgl', { antialias: false });
      if (!gl) {
        console.error('WebGL not supported');
        return;
      }

      startTime = performance.now();
      resize();

      // Start at a random position
      x = Math.random() * (canvas.width - boxSize);
      y = Math.random() * (canvas.height - boxSize);

      if (!initGL()) {
        console.error('Failed to initialize shader: Fingerprint');
        return;
      }

      loop();
      window.addEventListener('resize', resize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      if (gl && program) {
        gl.deleteProgram(program);
        program = null;
      }
      gl = null;
      window.removeEventListener('resize', resize);
    },
  };
}
