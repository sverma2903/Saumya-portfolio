/**
 * "Contour field" — a domain-warped noise terrain rendered as a warm ember gradient
 * with topographic contour lines (a nod to architectural site plans). The cursor lifts
 * the terrain, bending the contours around it like a hand pressed into sand.
 */

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uHeat;
uniform float uFade;
uniform float uDpr;
uniform float uShade;
uniform float uSeed;
out vec4 outColor;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                 dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
             mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                 dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float f = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    f += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return f;
}
float grain(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;
  vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.035 + uSeed;

  // domain-warped terrain
  vec2 q = vec2(fbm(p * 1.05 + vec2(0.0, t)), fbm(p * 1.05 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(
    fbm(p * 1.25 + 2.2 * q + vec2(1.7, 9.2) + t * 0.6),
    fbm(p * 1.25 + 2.2 * q + vec2(8.3, 2.8) - t * 0.5)
  );
  float f = fbm(p * 1.1 + 2.0 * r);

  // the cursor presses a hill into the terrain
  float d = length(p - m);
  float press = exp(-d * d * 7.0);
  f += uHeat * 0.32 * press;
  f += 0.06 * press;

  // ember palette
  float v = clamp(f * 0.95 + 0.44, 0.0, 1.0);
  vec3 c0 = vec3(0.070, 0.043, 0.031);
  vec3 c1 = vec3(0.235, 0.070, 0.028);
  vec3 c2 = vec3(0.520, 0.170, 0.045);
  vec3 c3 = vec3(0.840, 0.400, 0.150);
  vec3 c4 = vec3(0.985, 0.800, 0.620);
  vec3 col = mix(c0, c1, smoothstep(0.18, 0.46, v));
  col = mix(col, c2, smoothstep(0.42, 0.64, v));
  col = mix(col, c3, smoothstep(0.60, 0.80, v));
  col = mix(col, c4, smoothstep(0.80, 1.00, v));

  // topographic contours
  float k = 13.0;
  float cl = f * k;
  float w = fwidth(cl);
  float dl = abs(fract(cl + 0.5) - 0.5);
  float line = 1.0 - smoothstep(0.0, w * 1.25, dl);
  float major = 1.0 - smoothstep(0.0, w * 1.6, abs(fract(cl / 5.0 + 0.5) - 0.5) * 5.0);
  vec3 ink = vec3(1.0, 0.86, 0.72);
  float lineGain = 0.07 + 0.30 * press + 0.05 * smoothstep(0.5, 0.9, v);
  col += ink * line * lineGain;
  col += ink * major * (0.05 + 0.2 * press);

  // drafting grid
  float gs = 64.0 * uDpr;
  vec2 g = abs(fract(frag / gs + 0.5) - 0.5) * gs;
  float grid = 1.0 - smoothstep(0.0, 1.0 * uDpr, min(g.x, g.y));
  col += vec3(1.0, 0.9, 0.8) * grid * 0.022;

  // legibility shade on the text side, vignette, grain
  col *= mix(1.0, mix(0.45, 1.0, smoothstep(0.05, 0.75, uv.x)), uShade);
  col *= 1.0 - 0.38 * pow(length(uv - vec2(0.55, 0.5)) * 1.1, 2.0);
  col += (grain(frag + fract(uTime) * 100.0) - 0.5) * 0.035;

  col = mix(col, c0, uFade);
  outColor = vec4(col, 1.0);
}
`;

interface FieldOptions {
  shade?: number;
  seed?: number;
}

export class Field {
  private gl: WebGL2RenderingContext;
  private prog: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  private visible = false;
  private start = performance.now();
  private mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  private heat = 0;
  private targetHeat = 0.35;
  private fade = 0;
  private dpr = 1;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  static create(canvas: HTMLCanvasElement, opts: FieldOptions = {}) {
    try {
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
      if (!gl) return null;
      return new Field(canvas, gl, opts);
    } catch {
      return null;
    }
  }

  private constructor(
    private canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    private opts: FieldOptions,
  ) {
    this.gl = gl;
    this.prog = this.program(VERT, FRAG);
    gl.useProgram(this.prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['uRes', 'uTime', 'uMouse', 'uHeat', 'uFade', 'uDpr', 'uShade', 'uSeed']) {
      this.u[n] = gl.getUniformLocation(this.prog, n);
    }

    this.resize();
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = this.mouse.tx = rect.width * 0.68;
    this.mouse.y = this.mouse.ty = rect.height * 0.45;

    new ResizeObserver(() => this.resize()).observe(canvas);
    new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      if (this.visible) this.loop();
      else cancelAnimationFrame(this.raf);
    }).observe(canvas);

    const onMove = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect();
      const nx = x - r.left;
      const ny = y - r.top;
      const dx = nx - this.mouse.tx;
      const dy = ny - this.mouse.ty;
      this.mouse.tx = nx;
      this.mouse.ty = ny;
      this.targetHeat = Math.min(1.6, this.targetHeat + Math.hypot(dx, dy) * 0.004);
    };
    addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY), { passive: true });

    if (this.reduced) this.draw(18);
  }

  setFade(v: number) {
    this.fade = v;
    if (this.reduced) this.draw(18);
  }

  private program(vs: string, fs: string) {
    const gl = this.gl;
    const make = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    return p;
  }

  private resize() {
    const small = innerWidth < 760;
    this.dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.6);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * this.dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.gl.viewport(0, 0, w, h);
    }
    if (this.reduced) this.draw(18);
  }

  private draw(time: number) {
    const gl = this.gl;
    const { u } = this;
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform2f(u.uMouse, this.mouse.x * this.dpr, this.canvas.height - this.mouse.y * this.dpr);
    gl.uniform1f(u.uHeat, this.heat);
    gl.uniform1f(u.uFade, this.fade);
    gl.uniform1f(u.uDpr, this.dpr);
    gl.uniform1f(u.uShade, this.opts.shade ?? 1);
    gl.uniform1f(u.uSeed, this.opts.seed ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private loop = () => {
    if (!this.visible || this.reduced) return;
    this.raf = requestAnimationFrame(this.loop);
    const m = this.mouse;
    m.x += (m.tx - m.x) * 0.06;
    m.y += (m.ty - m.y) * 0.06;
    this.targetHeat += (0.35 - this.targetHeat) * 0.02;
    this.heat += (this.targetHeat - this.heat) * 0.05;
    this.draw((performance.now() - this.start) / 1000);
  };
}

export function mountFields() {
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-field]').forEach((c) => {
    const field = Field.create(c, { shade: Number(c.dataset.shade ?? 1), seed: Number(c.dataset.seed ?? 0) });
    if (!field) {
      c.closest('[data-field-host]')?.classList.add('no-gl');
      c.remove();
      return;
    }
    (c as HTMLCanvasElement & { field?: Field }).field = field;
  });
}
