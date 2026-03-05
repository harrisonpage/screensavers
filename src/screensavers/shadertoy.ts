import type { Screensaver } from '../types';

/**
 * Creates a screensaver from a Shadertoy-style fragment shader.
 *
 * The shader code should define a `mainImage(out vec4 fragColor, in vec2 fragCoord)` function,
 * just like on shadertoy.com. The following uniforms are provided automatically:
 *
 *   vec3  iResolution   - viewport resolution (width, height, 1.0)
 *   float iTime         - elapsed time in seconds
 *   vec4  iMouse        - mouse position (xy = current, zw = click)
 *
 * Usage:
 *   export function createMyShader(): Screensaver {
 *     return createShaderToyScreensaver('Name', 'Description', `
 *       void mainImage(out vec4 fragColor, in vec2 fragCoord) {
 *         vec2 uv = fragCoord / iResolution.xy;
 *         fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
 *       }
 *     `);
 *   }
 */
export function createShaderToyScreensaver(
  name: string,
  description: string,
  fragmentSource: string,
): Screensaver {
  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let animationFrame: number | null = null;
  let startTime = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseClickX = 0;
  let mouseClickY = 0;

  // uniform locations
  let uResolution: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uMouse: WebGLUniformLocation | null = null;

  const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Wrap the user's Shadertoy code in a proper fragment shader
  const fullFragmentSource = `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;
    uniform vec3 iResolution;
    uniform float iTime;
    uniform vec4 iMouse;

    ${fragmentSource}

    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
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

  function initGL() {
    if (!gl) return false;

    // Enable OES_standard_derivatives so shaders can use dFdx/dFdy/fwidth
    gl.getExtension('OES_standard_derivatives');

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

    // Clean up individual shaders after linking
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    gl.useProgram(program);

    // Fullscreen quad: two triangles covering [-1, 1]
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Cache uniform locations
    uResolution = gl.getUniformLocation(program, 'iResolution');
    uTime = gl.getUniformLocation(program, 'iTime');
    uMouse = gl.getUniformLocation(program, 'iMouse');

    return true;
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gl) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }

  function onMouseMove(e: MouseEvent) {
    mouseX = e.clientX;
    mouseY = canvas.height - e.clientY; // flip Y for GL coords
  }

  function onMouseDown(e: MouseEvent) {
    mouseClickX = e.clientX;
    mouseClickY = canvas.height - e.clientY;
  }

  function loop() {
    if (!gl || !program) return;

    const elapsed = (performance.now() - startTime) / 1000;

    gl.uniform3f(uResolution, canvas.width, canvas.height, 1.0);
    gl.uniform1f(uTime, elapsed);
    gl.uniform4f(uMouse, mouseX, mouseY, mouseClickX, mouseClickY);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    animationFrame = requestAnimationFrame(loop);
  }

  return {
    name,
    description,

    init(c: HTMLCanvasElement) {
      canvas = c;
      gl = canvas.getContext('webgl', { antialias: false });
      if (!gl) {
        console.error('WebGL not supported');
        return;
      }

      startTime = performance.now();
      resize();

      if (!initGL()) {
        console.error(`Failed to initialize shader: ${name}`);
        return;
      }

      loop();
      window.addEventListener('resize', resize);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mousedown', onMouseDown);
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
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
    },
  };
}
