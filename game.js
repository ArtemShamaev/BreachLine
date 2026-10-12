
(()=>{'use strict';
// ===================== ENGINE: math, GL, shaders =====================
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function hexLin(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map(c => Math.pow(c, 2.2)); }

const M4 = {
  n() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  _t: new Float32Array(16),
  mul(o, a, b) {
    const t = M4._t;
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      t[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      t[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      t[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      t[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    o.set(t); return o;
  },
  persp(o, fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); o.fill(0); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  ortho(o, l, r, b, t, n, f) { o.fill(0); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; },
  lookAt(o, e, c, up) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); o[15] = 1; return o;
  },
  // T * Ry * Rx * Rz * S
  trs(o, tx, ty, tz, rx, ry, rz, kx, ky, kz) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    o[0] = (cy * cz + sy * sx * sz) * kx; o[1] = (cx * sz) * kx; o[2] = (-sy * cz + cy * sx * sz) * kx; o[3] = 0;
    o[4] = (-cy * sz + sy * sx * cz) * ky; o[5] = (cx * cz) * ky; o[6] = (sy * sz + cy * sx * cz) * ky; o[7] = 0;
    o[8] = (sy * cx) * kz; o[9] = (-sx) * kz; o[10] = (cy * cx) * kz; o[11] = 0;
    o[12] = tx; o[13] = ty; o[14] = tz; o[15] = 1; return o;
  },
  invert(o, a) {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3], a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7], a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11], a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return o; det = 1 / det;
    o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det; o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det; o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det; o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det; o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det; o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det; o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det; o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det; o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det; o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det; o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det; o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det; o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return o;
  },
  xform(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; },
};

// ---------- GL ----------
let gl = null, glAniso = null;
function glInit(cv) {
  gl = cv.getContext('webgl2', { antialias: true, powerPreference: 'high-performance', alpha: false });
  if (!gl) return false;
  glAniso = gl.getExtension('EXT_texture_filter_anisotropic');
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
  return true;
}
function compile(vs, fs, attribs) {
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + s); return sh; };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  (attribs || []).forEach((a, i) => gl.bindAttribLocation(p, i, a));
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const nm = info.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}
function glTex(src, opt = {}) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  const wrap = opt.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (glAniso) gl.texParameterf(gl.TEXTURE_2D, glAniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(glAniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
  return t;
}
function makeMesh(P, N, U, I) {
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const buf = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; };
  const bufs = [buf(P, 0, 3), buf(N, 1, 3), buf(U, 2, 2)];
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: I.length, bufs, ib };
}
function freeMesh(m) { if (!m) return; gl.deleteVertexArray(m.vao); m.bufs.forEach(b => gl.deleteBuffer(b)); gl.deleteBuffer(m.ib); }

// ---------- geometry builder ----------
class Builder {
  constructor() { this.P = []; this.N = []; this.U = []; this.I = []; }
  quad(a, b, c, d, n, ua, ub, uc, ud) {
    const base = this.P.length / 3;
    this.P.push(...a, ...b, ...c, ...d); for (let i = 0; i < 4; i++) this.N.push(...n);
    this.U.push(...ua, ...ub, ...uc, ...ud);
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0) this.I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else this.I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  // world-space UV quad
  wquad(a, b, c, d, n, s, uo = 0, vo = 0) {
    const uv = p => Math.abs(n[1]) > 0.5 ? [p[0] / s + uo, p[2] / s + vo] : Math.abs(n[0]) > 0.5 ? [p[2] / s + uo, -p[1] / s + vo] : [p[0] / s + uo, -p[1] / s + vo];
    this.quad(a, b, c, d, n, uv(a), uv(b), uv(c), uv(d));
  }
  // box faces bitmask: 1 +x,2 -x,4 +y,8 -y,16 +z,32 -z
  box(x0, y0, z0, x1, y1, z1, s, faces = 63, unit = false) {
    const F = (a, b, c, d, n) => {
      if (unit) this.quad(a, b, c, d, n, [0, 1], [1, 1], [1, 0], [0, 0]);
      else this.wquad(a, b, c, d, n, s);
    };
    if (faces & 1) F([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0]);
    if (faces & 2) F([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0]);
    if (faces & 4) F([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0]);
    if (faces & 8) F([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]);
    if (faces & 16) F([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]);
    if (faces & 32) F([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1]);
  }
  // append raw geometry transformed by matrix m
  add(g, m, uvs = [1, 1]) {
    const base = this.P.length / 3;
    for (let i = 0; i < g.P.length; i += 3) {
      this.P.push(...M4.xform(m, g.P[i], g.P[i + 1], g.P[i + 2]));
      const nx = g.N[i], ny = g.N[i + 1], nz = g.N[i + 2];
      let tx = m[0] * nx + m[4] * ny + m[8] * nz, ty = m[1] * nx + m[5] * ny + m[9] * nz, tz = m[2] * nx + m[6] * ny + m[10] * nz; const l = Math.hypot(tx, ty, tz) || 1;
      this.N.push(tx / l, ty / l, tz / l);
    }
    for (let i = 0; i < g.U.length; i += 2) this.U.push(g.U[i] * uvs[0], g.U[i + 1] * uvs[1]);
    for (const i of g.I) this.I.push(base + i);
  }
  build() { return this.I.length ? makeMesh(this.P, this.N, this.U, this.I) : null; }
}
function geoCyl(seg = 14, cap = true) {
  const b = new Builder();
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
    const p0 = [Math.cos(a0) * .5, Math.sin(a0) * .5], p1 = [Math.cos(a1) * .5, Math.sin(a1) * .5];
    const am = (a0 + a1) / 2;
    b.quad([p0[0], -.5, p0[1]], [p1[0], -.5, p1[1]], [p1[0], .5, p1[1]], [p0[0], .5, p0[1]], [Math.cos(am), 0, Math.sin(am)], [i / seg, 1], [(i + 1) / seg, 1], [(i + 1) / seg, 0], [i / seg, 0]);
    if (cap) {
      const c = [0, .5, 0];
      b.P.push(...c, p1[0], .5, p1[1], p0[0], .5, p0[1]); for (let k = 0; k < 3; k++) b.N.push(0, 1, 0); b.U.push(.5, .5, p1[0] + .5, p1[1] + .5, p0[0] + .5, p0[1] + .5);
      let n0 = b.P.length / 3 - 3; b.I.push(n0, n0 + 1, n0 + 2);
      b.P.push(0, -.5, 0, p0[0], -.5, p0[1], p1[0], -.5, p1[1]); for (let k = 0; k < 3; k++) b.N.push(0, -1, 0); b.U.push(.5, .5, p0[0] + .5, p0[1] + .5, p1[0] + .5, p1[1] + .5);
      n0 = b.P.length / 3 - 3; b.I.push(n0, n0 + 1, n0 + 2);
    }
  }
  return b;
}
function geoSphere(seg = 14, rings = 9, half = false) {
  const b = new Builder(); const R = half ? rings : rings;
  const pt = (i, j) => { const th = (half ? (j / R) * Math.PI / 2 : (j / R) * Math.PI) ; const ph = i / seg * TAU; const y = Math.cos(th) * .5, r = Math.sin(th) * .5; return [Math.cos(ph) * r, y, Math.sin(ph) * r]; };
  for (let j = 0; j < R; j++) for (let i = 0; i < seg; i++) {
    const a = pt(i, j), c = pt(i + 1, j + 1), d = pt(i, j + 1), bb = pt(i + 1, j);
    const n = (p) => { const l = Math.hypot(...p); return [p[0] / l, p[1] / l, p[2] / l]; };
    const mid = n([(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2]);
    const base = b.P.length / 3;
    [a, bb, c, d].forEach(p => { b.P.push(...p); b.N.push(...n(p)); });
    b.U.push(i / seg, j / R, (i + 1) / seg, j / R, (i + 1) / seg, (j + 1) / R, i / seg, (j + 1) / R);
    // orientation check
    const e1 = [bb[0] - a[0], bb[1] - a[1], bb[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * mid[0] + cr[1] * mid[1] + cr[2] * mid[2] >= 0) b.I.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else b.I.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  return b;
}

// ---------- shaders ----------
const LIT_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aU;
uniform mat4 uVP, uM, uLVP; uniform vec2 uUVs;
out vec3 vW; out vec3 vN; out vec2 vU; out vec4 vL;
void main(){ vec4 w=uM*vec4(aP,1.); vW=w.xyz; vN=mat3(uM)*aN; vU=aU*uUVs; vL=uLVP*w; gl_Position=uVP*w; }`;
const TONE = `
vec3 tone(vec3 c){ c*=uExpo; c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14); return pow(clamp(c,0.,1.),vec3(1./2.2)); }`;
const LIT_FS = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 vW; in vec3 vN; in vec2 vU; in vec4 vL;
uniform sampler2D uTex; uniform sampler2DShadow uShadow;
uniform vec3 uColor, uEmis; uniform float uBump, uSpec, uGlow, uShadowOn, uExpo, uFogD, uAlpha;
uniform vec3 uSunDir, uSunCol, uSky, uGround, uFog, uCam;
uniform int uNPL; uniform vec3 uPLp[8]; uniform vec3 uPLc[8]; uniform float uPLr[8];
out vec4 o;
${TONE}
float shadowF(){
  vec3 p=vL.xyz/vL.w*.5+.5;
  if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.) return 1.;
  vec2 ts=1./vec2(textureSize(uShadow,0)); float s=0.;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) s+=texture(uShadow,vec3(p.xy+vec2(x,y)*ts*1.2,p.z-.0006));
  return s/9.;
}
void main(){
  vec4 tx=texture(uTex,vU);
  vec3 alb=pow(tx.rgb,vec3(2.2))*uColor;
  vec3 n=normalize(vN);
  if(!gl_FrontFacing) n=-n;
  if(uBump>0.){
    float h=dot(tx.rgb,vec3(.3,.59,.11));
    vec3 dpx=dFdx(vW), dpy=dFdy(vW); float dhx=dFdx(h), dhy=dFdy(h);
    vec3 r1=cross(dpy,n), r2=cross(n,dpx); float det=dot(dpx,r1);
    vec3 g=sign(det)*(dhx*r1+dhy*r2);
    n=normalize(abs(det)*n-uBump*g);
  }
  float sh = uShadowOn>.5 ? shadowF() : 1.;
  float nd=max(dot(n,uSunDir),0.);
  vec3 hemi=mix(uGround,uSky,n.y*.5+.5);
  vec3 V=normalize(uCam-vW), H=normalize(V+uSunDir);
  float sp=pow(max(dot(n,H),0.),48.)*uSpec;
  vec3 lit=alb*(hemi+uSunCol*nd*sh)+uSunCol*sp*sh*nd;
  for(int i=0;i<8;i++){ if(i>=uNPL) break;
    vec3 d=uPLp[i]-vW; float dist=length(d); float a=max(1.-dist/uPLr[i],0.); a*=a;
    lit+=alb*uPLc[i]*a*(max(dot(n,d/max(dist,.001)),0.)*.85+.15);
  }
  lit+=uEmis + alb*smoothstep(.55,.85,dot(tx.rgb,vec3(.3,.59,.11)))*uGlow;
  float dist=length(uCam-vW);
  float f=1.-exp(-pow(dist*uFogD,1.6));
  lit=mix(lit,uFog,clamp(f,0.,1.));
  o=vec4(tone(lit),uAlpha*tx.a);
}`;
const DEPTH_VS = `#version 300 es
layout(location=0) in vec3 aP; uniform mat4 uLVP, uM; void main(){ gl_Position=uLVP*uM*vec4(aP,1.); }`;
const DEPTH_FS = `#version 300 es
precision mediump float; void main(){}`;
const SKY_VS = `#version 300 es
const vec2 v[3]=vec2[3](vec2(-1,-1),vec2(3,-1),vec2(-1,3)); out vec2 vC;
void main(){ vC=v[gl_VertexID]; gl_Position=vec4(vC,.9999,1.); }`;
const SKY_FS = `#version 300 es
precision highp float; in vec2 vC; uniform mat4 uInvVP; uniform vec3 uCam, uTop, uHor, uBot, uSunDir, uSunCol, uFog; uniform float uExpo, uStars;
out vec4 o;
${TONE}
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec4 p=uInvVP*vec4(vC,1.,1.); vec3 d=normalize(p.xyz/p.w-uCam);
  float h=d.y;
  vec3 c = h>0. ? mix(uHor,uTop,pow(clamp(h,0.,1.),.5)) : mix(uHor,uBot,pow(clamp(-h,0.,1.),.35));
  float s=max(dot(d,uSunDir),0.);
  c+=uSunCol*(pow(s,900.)*14.+pow(s,24.)*.35+pow(s,4.)*.08);
  // soft clouds band
  if(h>0.){ vec2 q=d.xz/(h+.12)*1.4; float n=0.; float a=.5; vec2 qq=q; for(int i=0;i<4;i++){ vec2 fi=floor(qq),fr=fract(qq); fr=fr*fr*(3.-2.*fr); float v=mix(mix(h2(fi),h2(fi+vec2(1,0)),fr.x),mix(h2(fi+vec2(0,1)),h2(fi+vec2(1,1)),fr.x),fr.y); n+=v*a; a*=.5; qq*=2.1; }
    float cl=smoothstep(.52,.85,n)*smoothstep(0.,.25,h)*.55; c=mix(c,uHor*1.15+uSunCol*.08,cl);
    if(uStars>0.){ vec2 g=floor(d.xz/(h+.3)*220.); float st=step(.997,h2(g))*smoothstep(.1,.5,h); c+=vec3(st)*uStars; }
  }
  c=mix(c,uFog,smoothstep(.12,-.02,h)*.85);
  o=vec4(tone(c),1.);
}`;
// billboards / decals / tracers: aP world, aUV, aC corner, aS size(<0 => already placed), aCol
const BB_VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec2 aUV; layout(location=2) in vec2 aC; layout(location=3) in float aS; layout(location=4) in vec4 aCol;
uniform mat4 uVP; uniform vec3 uR, uUp; out vec2 vUV; out vec4 vCol;
void main(){ vec3 p=aP; if(aS>0.){ p+=(aC.x*uR+aC.y*uUp)*aS; } vUV=aUV; vCol=aCol; gl_Position=uVP*vec4(p,1.); }`;
const BB_FS = `#version 300 es
precision mediump float; in vec2 vUV; in vec4 vCol; uniform sampler2D uTex; out vec4 o;
void main(){ vec4 t=texture(uTex,vUV); o=vec4(t.rgb*vCol.rgb, t.a*vCol.a); if(o.a<.004) discard; }`;

let PROG = {};
function buildPrograms() {
  PROG.lit = compile(LIT_VS, LIT_FS, ['aP', 'aN', 'aU']);
  PROG.depth = compile(DEPTH_VS, DEPTH_FS, ['aP']);
  PROG.sky = compile(SKY_VS, SKY_FS, []);
  PROG.bb = compile(BB_VS, BB_FS, ['aP', 'aUV', 'aC', 'aS', 'aCol']);
}

// ---------- shadow map ----------
const SHADOW = { size: 2048, fbo: null, tex: null, lvp: M4.n() };
function makeShadow() {
  SHADOW.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, SHADOW.tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW.size, SHADOW.size);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  SHADOW.fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, SHADOW.fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, SHADOW.tex, 0);
  gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// ---------- dynamic billboard batch ----------
class BBBatch {
  constructor(maxQuads) {
    this.max = maxQuads; this.data = new Float32Array(maxQuads * 4 * 12); this.n = 0;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vb); gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    const st = 48; const at = (l, s, off) => { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, s, gl.FLOAT, false, st, off * 4); };
    at(0, 3, 0); at(1, 2, 3); at(2, 2, 5); at(3, 1, 7); at(4, 4, 8);
    const idx = new Uint32Array(maxQuads * 6); for (let i = 0; i < maxQuads; i++) { idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6); }
    this.ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }
  reset() { this.n = 0; }
  _v(o, x, y, z, u, v, cx, cy, s, r, g, b, a) { const d = this.data; d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = u; d[o + 4] = v; d[o + 5] = cx; d[o + 6] = cy; d[o + 7] = s; d[o + 8] = r; d[o + 9] = g; d[o + 10] = b; d[o + 11] = a; }
  // camera-facing sprite; cell = atlas index (4x4), rot radians
  sprite(x, y, z, size, cell, r, g, b, a, rot = 0) {
    if (this.n >= this.max) return; const o = this.n++ * 48;
    const u0 = (cell % 4) / 4, v0 = Math.floor(cell / 4) / 4, du = .25;
    const c = Math.cos(rot), s = Math.sin(rot);
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]], uvs = [[u0, v0 + du], [u0 + du, v0 + du], [u0 + du, v0], [u0, v0]];
    for (let i = 0; i < 4; i++) { const [px, py] = cs[i]; this._v(o + i * 12, x, y, z, uvs[i][0], uvs[i][1], px * c - py * s, px * s + py * c, size, r, g, b, a); }
  }
  // explicit quad (world positions)
  quad(p0, p1, p2, p3, cell, r, g, b, a, uvRect) {
    if (this.n >= this.max) return; const o = this.n++ * 48;
    let u0 = (cell % 4) / 4, v0 = Math.floor(cell / 4) / 4, du = .25, dv = .25;
    if (uvRect) { u0 = uvRect[0]; v0 = uvRect[1]; du = uvRect[2]; dv = uvRect[3]; }
    const P = [p0, p1, p2, p3], uvs = [[u0, v0 + dv], [u0 + du, v0 + dv], [u0 + du, v0], [u0, v0]];
    for (let i = 0; i < 4; i++) this._v(o + i * 12, P[i][0], P[i][1], P[i][2], uvs[i][0], uvs[i][1], 0, 0, -1, r, g, b, a);
  }
  draw(vp, camR, camU, tex) {
    if (!this.n) return;
    const P = PROG.bb; gl.useProgram(P.p);
    gl.uniformMatrix4fv(P.u.uVP, false, vp); gl.uniform3fv(P.u.uR, camR); gl.uniform3fv(P.u.uUp, camU);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(P.u.uTex, 0);
    gl.bindVertexArray(this.vao); gl.bindBuffer(gl.ARRAY_BUFFER, this.vb);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.n * 48);
    gl.drawElements(gl.TRIANGLES, this.n * 6, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }
}

// ---------- tiny scene graph ----------
function node(mesh, mat, t = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], kids = []) {
  return { mesh, mat, t, r, s, kids, w: M4.n(), l: M4.n(), vis: true };
}
function updNode(nd, parent) {
  M4.trs(nd.l, nd.t[0], nd.t[1], nd.t[2], nd.r[0], nd.r[1], nd.r[2], nd.s[0], nd.s[1], nd.s[2]);
  if (parent) M4.mul(nd.w, parent, nd.l); else nd.w.set(nd.l);
  for (const k of nd.kids) updNode(k, nd.w);
}
function find(nd, name) { if (nd.name === name) return nd; for (const k of nd.kids) { const r = find(k, name); if (r) return r; } return null; }

// ===================== PROCEDURAL TEXTURES =====================
function hash2(x, y, s) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16; return (n >>> 0) / 4294967296; }
function vnoise(x, y, p, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % p) + p) % p, x1 = ((xi + 1) % p + p) % p, y0 = ((yi % p) + p) % p, y1 = ((yi + 1) % p + p) % p;
  const a = hash2(x0, y0, s), b = hash2(x1, y0, s), c = hash2(x0, y1, s), d = hash2(x1, y1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, p, s, oct = 4) { let a = .5, t = 0, n = 0; for (let o = 0; o < oct; o++) { t += a * vnoise(x, y, p, s + o * 17); n += a; x *= 2; y *= 2; p *= 2; a *= .5; } return t / n; }
function cnv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function pix(c, fn) {
  const ctx = c.getContext('2d'); const w = c.width, h = c.height; const id = ctx.createImageData(w, h); const d = id.data; const o = [0, 0, 0, 255];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { o[3] = 255; fn(x, y, o); const k = (y * w + x) * 4; d[k] = o[0]; d[k + 1] = o[1]; d[k + 2] = o[2]; d[k + 3] = o[3]; }
  ctx.putImageData(id, 0, 0); return ctx;
}
const sat = v => v < 0 ? 0 : v > 255 ? 255 : v;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const TEXGEN = {
  // sandstone blocks, 512 = 4m
  sandWall(seed = 1, base = [214, 180, 126]) {
    const c = cnv(512);
    pix(c, (x, y, o) => {
      const row = y >> 6, off = (row & 1) * 64, xx = (x + off) & 511, bx = xx >> 7, lx = xx & 127, ly = y & 63;
      const n = fbm(x / 512 * 6, y / 512 * 6, 6, seed, 5), f = vnoise(x / 512 * 96, y / 512 * 96, 96, seed + 5);
      const tint = (hash2(bx, row, seed) - .5) * .16;
      const edge = Math.min(lx, 127 - lx, ly, 63 - ly) + (n - .5) * 7;
      let k = .78 + .34 * n + tint - .1 * f;
      if (edge < 2.2) k *= .52; else if (edge < 6) k *= .82 + .03 * edge;
      const pit = vnoise(x / 512 * 40, y / 512 * 40, 40, seed + 9); if (pit > .78) k *= .8;
      // bottom-of-block streak
      k *= 1 - smooth(40, 63, ly) * .06;
      o[0] = sat(base[0] * k); o[1] = sat(base[1] * k); o[2] = sat(base[2] * k);
    });
    return c;
  },
  // dusty flagstones
  sandFloor(seed = 3) {
    const c = cnv(512);
    pix(c, (x, y, o) => {
      const tx = x >> 7, ty = y >> 7, lx = x & 127, ly = y & 127;
      const n = fbm(x / 512 * 8, y / 512 * 8, 8, seed, 5), dust = fbm(x / 512 * 3, y / 512 * 3, 3, seed + 4, 4);
      const tint = (hash2(tx, ty, seed) - .5) * .14;
      const edge = Math.min(lx, 127 - lx, ly, 127 - ly) + (n - .5) * 5;
      let r = 196, g = 168, b = 124; let k = .8 + .3 * n + tint;
      if (edge < 2) k *= .55; else if (edge < 5) k *= .88;
      const sand = smooth(.45, .7, dust);
      r = lerp(r * k, 228, sand * .75); g = lerp(g * k, 200, sand * .75); b = lerp(b * k, 150, sand * .75);
      const sp = vnoise(x / 512 * 200, y / 512 * 200, 200, seed + 2);
      const s = .92 + sp * .14; o[0] = sat(r * s); o[1] = sat(g * s); o[2] = sat(b * s);
    });
    // cracks
    const ctx = c.getContext('2d'); ctx.strokeStyle = 'rgba(70,52,30,.45)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) { let px = hash2(i, 1, seed) * 512, py = hash2(i, 2, seed) * 512; ctx.beginPath(); ctx.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (hash2(i, k + 3, seed) - .5) * 30; py += (hash2(i, k + 30, seed) - .5) * 30; ctx.lineTo(px, py); } ctx.stroke(); }
    return c;
  },
  plaster(seed = 7, base = [226, 214, 190]) {
    const c = cnv(512);
    pix(c, (x, y, o) => {
      const n = fbm(x / 512 * 5, y / 512 * 5, 5, seed, 5), f = vnoise(x / 512 * 120, y / 512 * 120, 120, seed + 1);
      let k = .86 + .18 * n - .06 * f;
      const peel = fbm(x / 512 * 8, y / 512 * 8, 8, seed + 3, 5);
      let r = base[0], g = base[1], b = base[2];
      if (peel > .73) { const t = smooth(.73, .76, peel); r = lerp(r, 168, t); g = lerp(g, 128, t); b = lerp(b, 90, t); }
      k *= 1 - smooth(.3, 1, y / 512) * .1;
      const streak = vnoise(x / 512 * 60, y / 512 * 2, 60, seed + 8); k *= 1 - smooth(.6, .9, streak) * .12 * (y / 512);
      o[0] = sat(r * k); o[1] = sat(g * k); o[2] = sat(b * k);
    });
    return c;
  },
  crate(seed = 11, dark = false) {
    const c = cnv(256);
    const base = dark ? [86, 96, 68] : [146, 104, 62];
    pix(c, (x, y, o) => {
      const frame = x < 22 || x > 233 || y < 22 || y > 233;
      const dd = Math.min(Math.abs(x - y), Math.abs(x - (255 - y))) / 1.414;
      const brace = !frame && dd < 13;
      let k;
      const grain = vnoise(x / 256 * (frame && (y < 22 || y > 233) || brace ? 24 : 4), y / 256 * (frame && (y < 22 || y > 233) || brace ? 4 : 24), 24, seed);
      const plank = (y >> 5); const pt = (hash2(plank, 0, seed) - .5) * .18;
      k = .82 + grain * .3 + pt;
      if (!frame && !brace) { if ((y & 31) < 2) k *= .45; k *= .88; }
      if (frame || brace) k *= 1.08;
      if (frame) { const e = Math.min(x, 255 - x, y, 255 - y); if (e < 2 || (e > 19 && e < 23)) k *= .5; }
      if (brace && dd > 11) k *= .55;
      const n = fbm(x / 256 * 4, y / 256 * 4, 4, seed + 3, 3); k *= .85 + n * .3;
      o[0] = sat(base[0] * k); o[1] = sat(base[1] * k); o[2] = sat(base[2] * k);
    });
    const ctx = c.getContext('2d'); ctx.fillStyle = 'rgba(30,24,16,.8)';
    for (const [x, y] of [[11, 11], [245, 11], [11, 245], [245, 245], [128, 11], [128, 245], [11, 128], [245, 128]]) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill(); }
    if (dark) { ctx.font = '700 26px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(230,226,200,.55)'; ctx.textAlign = 'center'; ctx.fillText('BL-07', 128, 80); ctx.font = '700 16px monospace'; ctx.fillText('▲ ▲', 128, 190); }
    return c;
  },
  container(seed, base) {
    const c = cnv(512);
    pix(c, (x, y, o) => {
      const s = Math.sin(x / 512 * 16 * TAU); const k0 = .84 + .16 * (s > .3 ? 1 : s < -.3 ? -.6 : s);
      const n = fbm(x / 512 * 6, y / 512 * 6, 6, seed, 5);
      const rust = fbm(x / 512 * 10, y / 512 * 10, 10, seed + 3, 5);
      let r = base[0], g = base[1], b = base[2];
      let k = k0 * (.82 + .3 * n);
      if (rust > .64) { const t = smooth(.64, .74, rust) * .8; r = lerp(r, 120, t); g = lerp(g, 64, t); b = lerp(b, 34, t); }
      const drip = vnoise(x / 512 * 80, y / 512 * 3, 80, seed + 6); k *= 1 - smooth(.7, .95, drip) * .25;
      o[0] = sat(r * k); o[1] = sat(g * k); o[2] = sat(b * k);
    });
    const ctx = c.getContext('2d'); ctx.font = '700 34px "JetBrains Mono", monospace'; ctx.fillStyle = 'rgba(245,245,235,.7)';
    ctx.fillText('BRLN ' + (4000 + Math.floor(hash2(seed, 2, 3) * 5999)), 40, 120);
    ctx.font = '700 18px monospace'; ctx.fillText('MAX GR 30480 KG', 40, 150);
    return c;
  },
  concrete(seed = 21, base = [150, 150, 146]) {
    const c = cnv(512);
    pix(c, (x, y, o) => {
      const n = fbm(x / 512 * 6, y / 512 * 6, 6, seed, 6), f = vnoise(x / 512 * 150, y / 512 * 150, 150, seed + 1);
      let k = .74 + .36 * n + (f - .5) * .1;
      if ((x & 255) < 2 || (y & 255) < 2) k *= .6;
      const st = vnoise(x / 512 * 40, y / 512 * 2.5, 40, seed + 4); k *= 1 - smooth(.55, .9, st) * .22;
      const hole = vnoise(x / 512 * 64, y / 512 * 64, 64, seed + 7); if (hole > .86) k *= .7;
      o[0] = sat(base[0] * k); o[1] = sat(base[1] * k); o[2] = sat(base[2] * k);
    });
    return c;
  },
  asphalt(seed = 31) {
    const c = cnv(512);
    pix(c, (x, y, o) => {
      const n = fbm(x / 512 * 8, y / 512 * 8, 8, seed, 5), sp = hash2(x, y, seed);
      let k = 52 + 30 * n + (sp > .93 ? 30 : sp < .05 ? -14 : 0);
      const patch = fbm(x / 512 * 3, y / 512 * 3, 3, seed + 5, 3); k *= 1 - smooth(.5, .7, patch) * .12;
      const oil = fbm(x / 512 * 5, y / 512 * 5, 5, seed + 9, 4); k *= 1 - smooth(.66, .74, oil) * .22;
      o[0] = sat(k); o[1] = sat(k * 1.0); o[2] = sat(k * 1.04);
    });
    return c;
  },
  metal(seed = 41, base = [96, 98, 102]) {
    const c = cnv(256);
    pix(c, (x, y, o) => { const n = fbm(x / 256 * 8, y / 256 * 8, 8, seed, 4); const br = vnoise(x / 256 * 128, y / 256 * 2, 128, seed + 2); const k = .8 + .25 * n + br * .08; o[0] = sat(base[0] * k); o[1] = sat(base[1] * k); o[2] = sat(base[2] * k); });
    return c;
  },
  wood(seed = 51, base = [120, 74, 40]) {
    const c = cnv(256);
    pix(c, (x, y, o) => { const g = vnoise(x / 256 * 3, y / 256 * 40, 3, seed); const r = Math.sin((x / 256 * 10 + g * 4) * TAU) * .5 + .5; const k = .7 + .3 * r + .1 * g; o[0] = sat(base[0] * k); o[1] = sat(base[1] * k); o[2] = sat(base[2] * k); });
    return c;
  },
  camo(seed, cols) {
    const c = cnv(256);
    pix(c, (x, y, o) => {
      const n1 = fbm(x / 256 * 5, y / 256 * 5, 5, seed, 4), n2 = fbm(x / 256 * 7, y / 256 * 7, 7, seed + 9, 4);
      let col = cols[0]; if (n1 > .56) col = cols[1]; if (n2 > .6) col = cols[2];
      const weave = ((x + y) & 3) < 2 ? 1 : .94; const f = vnoise(x / 256 * 64, y / 256 * 64, 64, seed + 3) * .12 + .9;
      o[0] = sat(col[0] * weave * f); o[1] = sat(col[1] * weave * f); o[2] = sat(col[2] * weave * f);
    });
    return c;
  },
  plain(col, noise = .12, seed = 61) {
    const c = cnv(64);
    pix(c, (x, y, o) => { const k = 1 - noise / 2 + vnoise(x / 64 * 16, y / 64 * 16, 16, seed) * noise; o[0] = sat(col[0] * k); o[1] = sat(col[1] * k); o[2] = sat(col[2] * k); });
    return c;
  },
  face(skin, mask) {
    const c = cnv(64); const ctx = c.getContext('2d');
    ctx.fillStyle = `rgb(${skin})`; ctx.fillRect(0, 0, 64, 64);
    if (mask) { ctx.fillStyle = mask; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = `rgb(${skin})`; ctx.fillRect(8, 20, 48, 14); }
    ctx.fillStyle = '#16120e'; ctx.fillRect(16, 24, 9, 6); ctx.fillRect(39, 24, 9, 6);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(18, 25, 3, 2); ctx.fillRect(41, 25, 3, 2);
    if (!mask) { ctx.fillStyle = 'rgba(90,50,40,.6)'; ctx.fillRect(22, 46, 20, 3); }
    return c;
  },
  windows(seed = 71) {
    const c = cnv(256);
    pix(c, (x, y, o) => {
      const wx = x & 31, wy = y & 31, cx = x >> 5, cy = y >> 5;
      const n = vnoise(x / 256 * 8, y / 256 * 8, 8, seed);
      let r = 40 + n * 18, g = 40 + n * 16, b = 48 + n * 18;
      if (wx > 6 && wx < 26 && wy > 8 && wy < 26) {
        const on = hash2(cx, cy, seed) > .55;
        if (on) { const t = .75 + hash2(cx, cy, seed + 1) * .25; r = 255 * t; g = 196 * t; b = 120 * t; } else { r = 22; g = 26; b = 34; }
      }
      o[0] = sat(r); o[1] = sat(g); o[2] = sat(b);
    });
    return c;
  },
  // 4x4 atlas of 128px cells for sprites and decals
  atlas() {
    const c = cnv(512); const ctx = c.getContext('2d');
    const cell = (i, f) => { ctx.save(); ctx.translate((i % 4) * 128, Math.floor(i / 4) * 128); ctx.beginPath(); ctx.rect(0, 0, 128, 128); ctx.clip(); f(ctx); ctx.restore(); };
    // 0 soft dot
    cell(0, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
    // 1,2 smoke puffs
    for (const [i, sd] of [[1, 5], [2, 9]]) {
      const tmp = cnv(128); pix(tmp, (px, py, o) => { const dx = (px - 64) / 62, dy = (py - 64) / 62; const r = Math.hypot(dx, dy); const n = fbm(px / 128 * 4, py / 128 * 4, 4, sd, 5); const a = clamp((1 - r) * 1.6 - (1 - n) * .9, 0, 1); o[0] = o[1] = o[2] = 200 + n * 55; o[3] = a * 255; });
      cell(i, x => x.drawImage(tmp, 0, 0));
    }
    // 3 spark star
    cell(3, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(0, 62, 128, 4); x.fillRect(62, 0, 4, 128); });
    // 4 bullet hole
    cell(4, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 50); g.addColorStop(0, 'rgba(10,8,6,1)'); g.addColorStop(.25, 'rgba(20,16,12,.95)'); g.addColorStop(.32, 'rgba(60,50,40,.7)'); g.addColorStop(.7, 'rgba(40,34,28,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
    // 5 blood splat
    cell(5, x => { x.fillStyle = 'rgba(120,8,8,.9)'; for (let k = 0; k < 18; k++) { const a = hash2(k, 1, 3) * TAU, d = hash2(k, 2, 3) * 40, r = 6 + hash2(k, 3, 3) * 16; x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, r, 0, TAU); x.fill(); } });
    // 6 muzzle flash
    cell(6, x => { x.translate(64, 64); for (let k = 0; k < 7; k++) { x.rotate(TAU / 7 + .3); const g = x.createLinearGradient(0, 0, 0, -60); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(1, 'rgba(255,140,40,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(-9, 0); x.lineTo(0, -60 + hash2(k, 5, 1) * 18); x.lineTo(9, 0); x.fill(); } const g2 = x.createRadialGradient(0, 0, 0, 0, 0, 26); g2.addColorStop(0, 'rgba(255,255,240,1)'); g2.addColorStop(1, 'rgba(255,200,90,0)'); x.fillStyle = g2; x.fillRect(-64, -64, 128, 128); });
    // 7 scorch
    cell(7, x => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 62); g.addColorStop(0, 'rgba(10,8,6,.9)'); g.addColorStop(.6, 'rgba(20,16,12,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
    // 8,9 site letters (spray paint)
    for (const [i, L] of [[8, 'A'], [9, 'B']]) cell(i, x => { x.font = '900 110px "Saira Condensed", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = 'rgba(255,255,255,.6)'; x.shadowBlur = 6; x.fillStyle = 'rgba(255,255,255,.95)'; x.fillText(L, 64, 70); });
    // 10 ring (smoke wisp / shockwave)
    cell(10, x => { const g = x.createRadialGradient(64, 64, 30, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.6, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
    // 11 arrow decal
    cell(11, x => { x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.moveTo(64, 10); x.lineTo(110, 60); x.lineTo(80, 60); x.lineTo(80, 118); x.lineTo(48, 118); x.lineTo(48, 60); x.lineTo(18, 60); x.closePath(); x.fill(); });
    // 12 square debris
    cell(12, x => { x.fillStyle = 'rgba(255,255,255,1)'; x.fillRect(40, 40, 48, 48); });
    return c;
  },
};

let TEX = {}, MAT = {};
function mat(tex, o = {}) { return Object.assign({ tex, color: [1, 1, 1], emis: [0, 0, 0], bump: 0, spec: 0, glow: 0, uvs: [1, 1] }, o); }
function buildCommonTextures() {
  const t = (k, c, opt) => TEX[k] = glTex(c, opt);
  t('white', TEXGEN.plain([255, 255, 255], 0));
  t('atlas', TEXGEN.atlas(), { clamp: true });
  t('crate', TEXGEN.crate(11)); t('crate2', TEXGEN.crate(13, true));
  t('gun', TEXGEN.metal(41, [58, 60, 64])); t('gunLight', TEXGEN.metal(43, [120, 112, 92])); t('wood', TEXGEN.wood());
  t('camoT', TEXGEN.camo(81, [[170, 146, 104], [128, 104, 70], [92, 78, 58]]));
  t('camoCT', TEXGEN.camo(83, [[52, 66, 90], [38, 48, 66], [74, 84, 98]]));
  t('pantsT', TEXGEN.camo(85, [[110, 98, 76], [92, 80, 60], [128, 116, 92]]));
  t('pantsCT', TEXGEN.camo(87, [[44, 50, 62], [34, 38, 48], [58, 64, 74]]));
  t('vest', TEXGEN.plain([64, 70, 56], .25)); t('vestCT', TEXGEN.plain([40, 44, 52], .25));
  t('faceT', TEXGEN.face('196,150,112', '#2a2622')); t('faceCT', TEXGEN.face('214,168,132', null));
  t('skin', TEXGEN.plain([200, 156, 120], .1)); t('boot', TEXGEN.plain([40, 34, 28], .2)); t('glove', TEXGEN.plain([36, 36, 34], .2));
  t('helmet', TEXGEN.plain([58, 70, 60], .2));
  t('barrelR', TEXGEN.container(91, [150, 42, 32])); t('barrelB', TEXGEN.container(93, [40, 70, 120]));
  MAT.crate = mat(TEX.crate, { bump: .02 }); MAT.crate2 = mat(TEX.crate2, { bump: .02 });
  MAT.gun = mat(TEX.gun, { spec: .8 }); MAT.gunLight = mat(TEX.gunLight, { spec: .4 }); MAT.wood = mat(TEX.wood, { spec: .2 });
  MAT.barrelR = mat(TEX.barrelR, { spec: .3, uvs: [2, 1] }); MAT.barrelB = mat(TEX.barrelB, { spec: .3, uvs: [2, 1] });
  const CH = (k) => mat(TEX[k], {});
  MAT.T = { body: CH('camoT'), pants: CH('pantsT'), vest: CH('vest'), face: CH('faceT'), skin: CH('skin'), boot: CH('boot'), glove: CH('glove'), hat: mat(TEX.boot, { color: [.9, .85, .8] }) };
  MAT.CT = { body: CH('camoCT'), pants: CH('pantsCT'), vest: CH('vestCT'), face: CH('faceCT'), skin: CH('skin'), boot: CH('boot'), glove: CH('glove'), hat: CH('helmet') };
  MAT.white = mat(TEX.white); MAT.bomb = mat(TEX.white, { color: [.25, .27, .22], spec: .5 }); MAT.led = mat(TEX.white, { color: [1, .1, .1], emis: [3, .2, .1] });
  MAT.nadeHE = mat(TEX.white, { color: [.2, .28, .16], spec: .5 }); MAT.nadeSm = mat(TEX.white, { color: [.5, .52, .55], spec: .5 });
  MAT.blade = mat(TEX.white, { color: [.7, .72, .75], spec: 1.5 });
  MAT.rocket = mat(TEX.white, { color: [.33, .38, .24], spec: .3 }); MAT.flame = mat(TEX.white, { color: [1, .6, .2], emis: [6, 3, .8] });
  MAT.nadeFl = mat(TEX.white, { color: [.72, .75, .8], spec: .6 }); MAT.nadeMo = mat(TEX.white, { color: [.32, .2, .08], spec: 1.4 }); MAT.cloth = mat(TEX.white, { color: [.8, .7, .55] });
}

// ===================== WORLD: maps, grid, collision, rays, nav =====================
const CELL = 2, STEP = 0.55, PR = 0.36;
const TYPE_H = [0, 5.2, 1.1, 2.2, 1.25, 2.6, 5.2, 1.1];
// 0 floor, 1 wall, 2 crate, 3 crate stack, 4 barrels, 5 container, 6 double container, 7 low wall
const MAPS = BREACHLINE_MAPS; // maps.js

const THEMES = {
  desert: {
    sunDir: [-0.42, 0.74, 0.52], sun: [0xffeccc, 1.75], sky: [0x9dbbe6, .42], ground: [0xb88f5c, .3],
    fog: [0xd9c7a6, .8], fogD: 0.0058, top: [0x3c7bd0, 1.0], hor: [0xf0dcbc, .9], bot: [0xc8b08a, .7], expo: .92, stars: 0,
    style: 'desert', surf: null, smoke: [1, .97, .92],
  },
  dusk: {
    sunDir: [0.62, 0.3, -0.72], sun: [0xffa266, 2.4], sky: [0x8090d0, .55], ground: [0x504040, .4],
    fog: [0x9a7484, .85], fogD: 0.0072, top: [0x1c2458, 1.2], hor: [0xf39a62, 1.05], bot: [0x403040, .8], expo: 1.08, stars: .7,
    style: 'port', surf: [.55, .55, .56], smoke: [.62, .58, .62],
  },
  snow: {
    sunDir: [-0.35, 0.55, -0.76], sun: [0xe8f0ff, 1.25], sky: [0xb4c8e8, .62], ground: [0xdfe8f2, .45],
    fog: [0xd4dde8, .95], fogD: 0.0105, top: [0x8aa4c8, .9], hor: [0xe2e8f0, .95], bot: [0xd8e0ea, .85], expo: .84, stars: 0,
    style: 'snow', surf: [.86, .9, .95], smoke: [.95, .97, 1],
  },
  night: {
    sunDir: [0.3, 0.62, 0.72], sun: [0x8fa8ff, .42], sky: [0x3a4a78, .5], ground: [0x302c38, .35],
    fog: [0x1c2236, .9], fogD: 0.0095, top: [0x05070f, 1.0], hor: [0x2a2f4c, 1.0], bot: [0x101420, .9], expo: 1.35, stars: 1,
    style: 'city', surf: [.45, .46, .5], smoke: [.42, .44, .52],
  },
  jungle: {
    sunDir: [0.4, 0.8, 0.45], sun: [0xfff2d0, 1.5], sky: [0x9cc4a8, .55], ground: [0x5a6e3a, .4],
    fog: [0xa8bfa0, .85], fogD: 0.0088, top: [0x5c94b8, .95], hor: [0xd4e2c4, .9], bot: [0x8aa078, .7], expo: .95, stars: 0,
    style: 'jungle', surf: [.5, .55, .42], smoke: [.9, .95, .88],
  },
  industrial: {
    sunDir: [-0.55, 0.62, -0.56], sun: [0xfff0dc, 1.35], sky: [0xa8b0bc, .6], ground: [0x6c6a66, .35],
    fog: [0xb4b4b0, .9], fogD: 0.0078, top: [0x7c8696, .95], hor: [0xd0ccc4, .9], bot: [0x9a968e, .75], expo: .95, stars: 0,
    style: 'factory', surf: [.6, .6, .58], smoke: [.9, .9, .88],
  },
};
const sc = (a) => hexLin(a[0]).map(v => v * a[1]);
function normalize3(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }

const G = { W: 0, H: 0, type: null, height: null, col: null, site: null, def: null, key: '', theme: null, static: [], lamps: [], siteCells: { A: [], B: [] } };
function idx(i, j) { return j * G.W + i; }
function cellH(i, j) { if (i < 0 || j < 0 || i >= G.W || j >= G.H) return 99; return G.height[j * G.W + i]; }
function walkable(i, j) { return i >= 0 && j >= 0 && i < G.W && j < G.H && G.type[j * G.W + i] === 0; }
function cellOf(v) { return Math.floor(v / CELL); }
function cellCenter(i) { return i * CELL + CELL / 2; }
function siteAt(x, z) { const i = cellOf(x), j = cellOf(z); if (i < 0 || j < 0 || i >= G.W || j >= G.H) return 0; return G.site[idx(i, j)]; }

function buildGrid(def) {
  const W = def.w, H = def.h;
  G.W = W; G.H = H; G.def = def;
  G.type = new Uint8Array(W * H).fill(1); G.col = new Uint8Array(W * H); G.site = new Uint8Array(W * H); G.height = new Float32Array(W * H);
  for (const op of def.ops) {
    const [k, x, z, w, h, t, c] = op;
    for (let j = z; j < z + h; j++) for (let i = x; i < x + w; i++) {
      if (i <= 0 || j <= 0 || i >= W - 1 || j >= H - 1) continue;
      if (k === 'c') G.type[idx(i, j)] = 0; else { G.type[idx(i, j)] = t; G.col[idx(i, j)] = c || 0; }
    }
  }
  for (const [x, z, t] of def.objs) G.type[idx(x, z)] = t;
  for (let i = 0; i < W * H; i++) G.height[i] = TYPE_H[G.type[i]];
  G.open = [];
  for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
    let ok = G.type[idx(i, j)] === 0;
    for (let dj = -1; dj <= 1 && ok; dj++) for (let di = -1; di <= 1 && ok; di++) if (G.type[idx(i + di, j + dj)] !== 0) ok = false;
    if (ok) G.open.push([i, j]);
  }
  G.siteCells = { A: [], B: [] };
  for (const [s, r] of Object.entries(def.sites)) {
    const v = s === 'A' ? 1 : 2;
    for (let j = r[1]; j < r[1] + r[3]; j++) for (let i = r[0]; i < r[0] + r[2]; i++) if (walkable(i, j)) { G.site[idx(i, j)] = v; G.siteCells[s].push([i, j]); }
  }
}
function rectCells(r) { const out = []; for (let j = r[1]; j < r[1] + r[3]; j++) for (let i = r[0]; i < r[0] + r[2]; i++) if (walkable(i, j)) out.push([i, j]); return out; }

// ---------- collision ----------
function blockedAt(x, z, feetY, r = PR) {
  const i0 = cellOf(x - r), i1 = cellOf(x + r), j0 = cellOf(z - r), j1 = cellOf(z + r);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (cellH(i, j) > feetY + STEP) return true;
  return false;
}
function groundAt(x, z, feetY, r = PR) {
  const i0 = cellOf(x - r), i1 = cellOf(x + r), j0 = cellOf(z - r), j1 = cellOf(z + r); let g = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const h = cellH(i, j); if (h <= feetY + STEP && h > g) g = h; }
  return g;
}

// ---------- ray vs heightfield (DDA) ----------
const RAY = { t: 0, nx: 0, ny: 0, nz: 0, x: 0, y: 0, z: 0, type: 0 };
function rayGrid(ox, oy, oz, dx, dy, dz, maxT) {
  let i = cellOf(ox), j = cellOf(oz);
  const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = Math.abs(dx) < 1e-9 ? 1e9 : CELL / Math.abs(dx), tdz = Math.abs(dz) < 1e-9 ? 1e9 : CELL / Math.abs(dz);
  let tmx = Math.abs(dx) < 1e-9 ? 1e9 : ((i + (sx > 0 ? 1 : 0)) * CELL - ox) / dx;
  let tmz = Math.abs(dz) < 1e-9 ? 1e9 : ((j + (sz > 0 ? 1 : 0)) * CELL - oz) / dz;
  let t = 0, axis = -1;
  for (let it = 0; it < 400; it++) {
    const tn = Math.min(tmx, tmz, maxT);
    const h = cellH(i, j);
    if (h > 0) {
      const y0 = oy + dy * t, y1 = oy + dy * tn;
      if (y0 <= h && it > 0) { RAY.t = t; RAY.nx = axis === 0 ? -sx : 0; RAY.nz = axis === 1 ? -sz : 0; RAY.ny = 0; RAY.type = h >= 99 ? 1 : G.type[idx(i, j)]; break; }
      if (y1 < h && dy < 0) { const tt = (h - oy) / dy; if (tt >= t - 1e-6) { RAY.t = Math.max(tt, 0); RAY.nx = 0; RAY.ny = 1; RAY.nz = 0; RAY.type = G.type[idx(i, j)]; break; } }
    } else if (dy < 0) {
      const tf = -oy / dy; if (tf >= t && tf <= tn) { RAY.t = tf; RAY.nx = 0; RAY.ny = 1; RAY.nz = 0; RAY.type = 0; break; }
    }
    if (tn >= maxT) { RAY.t = maxT; RAY.nx = RAY.ny = RAY.nz = 0; RAY.type = -1; break; }
    if (tmx < tmz) { t = tmx; tmx += tdx; i += sx; axis = 0; } else { t = tmz; tmz += tdz; j += sz; axis = 1; }
  }
  RAY.x = ox + dx * RAY.t; RAY.y = oy + dy * RAY.t; RAY.z = oz + dz * RAY.t;
  return RAY;
}
let SMOKES = [];
function segSphere(ax, ay, az, bx, by, bz, cx, cy, cz, r) {
  const dx = bx - ax, dy = by - ay, dz = bz - az; const L2 = dx * dx + dy * dy + dz * dz; if (L2 < 1e-6) return false;
  let t = ((cx - ax) * dx + (cy - ay) * dy + (cz - az) * dz) / L2; t = clamp(t, 0, 1);
  const px = ax + dx * t - cx, py = ay + dy * t - cy, pz = az + dz * t - cz; return px * px + py * py + pz * pz < r * r;
}
function los(ax, ay, az, bx, by, bz, smoke = true) {
  const dx = bx - ax, dy = by - ay, dz = bz - az; const L = Math.hypot(dx, dy, dz); if (L < .01) return true;
  rayGrid(ax, ay, az, dx / L, dy / L, dz / L, L);
  if (RAY.t < L - .05) return false;
  if (smoke) for (const s of SMOKES) if (s.dense > .5 && segSphere(ax, ay, az, bx, by, bz, s.x, 1.5, s.z, s.r * s.dense)) return false;
  return true;
}

// ---------- A* ----------
function astar(si, sj, gi, gj) {
  if (!walkable(si, sj)) { const n = nearestWalkable(si, sj); if (!n) return []; [si, sj] = n; }
  if (!walkable(gi, gj)) { const n = nearestWalkable(gi, gj); if (!n) return []; [gi, gj] = n; }
  const W = G.W, N = W * G.H, start = sj * W + si, goal = gj * W + gi;
  const g = new Float32Array(N).fill(1e9), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = []; const push = (n, f) => { heap.push([f, n]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top[1]; };
  const hf = (n) => { const x = n % W, y = (n / W) | 0; const dx = Math.abs(x - gi), dy = Math.abs(y - gj); return Math.max(dx, dy) + .414 * Math.min(dx, dy); };
  g[start] = 0; push(start, hf(start));
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.length) {
    const cur = pop(); if (cur === goal) break; if (closed[cur]) continue; closed[cur] = 1;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [ox, oy, c] of D) {
      const nx = cx + ox, ny = cy + oy; if (!walkable(nx, ny)) continue;
      if (ox && oy && (!walkable(cx + ox, cy) || !walkable(cx, cy + oy))) continue;
      const n = ny * W + nx; const ng = g[cur] + c + (G.site[n] ? 0 : 0);
      if (ng < g[n]) { g[n] = ng; came[n] = cur; push(n, ng + hf(n)); }
    }
  }
  if (came[goal] < 0 && goal !== start) return [];
  const path = []; let c = goal; while (c !== start && c >= 0) { path.push([c % W, (c / W) | 0]); c = came[c]; }
  path.reverse(); return path;
}
function nearestWalkable(i, j) { for (let r = 1; r < 6; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (walkable(i + di, j + dj)) return [i + di, j + dj]; return null; }
// straight walk test with clearance
function canWalk(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz); const n = Math.ceil(L / .4);
  const px = -dz / (L || 1) * .42, pz = dx / (L || 1) * .42;
  for (let k = 1; k <= n; k++) { const t = k / n; const x = ax + dx * t, z = az + dz * t; if (!walkable(cellOf(x), cellOf(z)) || !walkable(cellOf(x + px), cellOf(z + pz)) || !walkable(cellOf(x - px), cellOf(z - pz))) return false; }
  return true;
}

// ---------- rendering build ----------
let THEMETEX = {};
function tint(c, m) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { p[i] = Math.min(255, p[i] * m[0]); p[i + 1] = Math.min(255, p[i + 1] * m[1]); p[i + 2] = Math.min(255, p[i + 2] * m[2]); }
  x.putImageData(d, 0, 0); return c;
}
function themeMaterials(theme) {
  if (THEMETEX[theme]) return THEMETEX[theme];
  const M = {}, T = (c, o = {}) => mat(glTex(c), o);
  const cont = spec => [[150, 48, 38], [38, 74, 128], [52, 104, 70], [196, 110, 36]].map((b, i) => T(TEXGEN.container(100 + i, b), { spec, bump: .03 }));
  M.lamp = mat(TEX.white, { color: [1, .9, .7], emis: [6, 4.4, 2.4] });
  M.pole = T(TEXGEN.metal(47, [62, 64, 68]), { spec: .4 });
  if (theme === 'desert') {
    M.wall = T(TEXGEN.sandWall(1), { bump: .028 });
    M.wall2 = T(TEXGEN.plaster(7, [206, 188, 160]), { bump: .02 });
    M.trim = T(TEXGEN.sandWall(2, [150, 118, 80]), { bump: .03 });
    M.floor = T(TEXGEN.sandFloor(3), { bump: .022 });
    M.ground = T(TEXGEN.plaster(5, [222, 196, 150]));
    M.cont = cont(.25);
    M.palm = T(TEXGEN.camo(97, [[70, 110, 50], [50, 86, 38], [96, 130, 60]]));
    M.trunk = T(TEXGEN.wood(99, [110, 86, 60]));
    M.cloth = [T(TEXGEN.plain([170, 50, 40], .2)), T(TEXGEN.plain([40, 110, 120], .2))];
  } else if (theme === 'dusk') {
    M.wall = T(TEXGEN.concrete(21), { bump: .025 });
    M.wall2 = T(TEXGEN.concrete(23, [120, 124, 128]), { bump: .025 });
    M.trim = T(TEXGEN.plain([200, 160, 40], .2));
    M.floor = T(TEXGEN.asphalt(31), { bump: .015 });
    M.ground = M.floor;
    M.cont = cont(.35);
    M.win = T(TEXGEN.windows(71), { glow: 2.2, uvs: [1, 1] });
    M.crane = T(TEXGEN.metal(45, [214, 140, 40]), { spec: .4 });
  } else if (theme === 'snow') {
    M.wall = T(TEXGEN.concrete(25, [176, 182, 192]), { bump: .025 });
    M.wall2 = T(TEXGEN.plaster(9, [172, 70, 58]), { bump: .02 }); // red-painted station huts
    M.trim = T(TEXGEN.plaster(11, [236, 240, 248]), { bump: .02 });
    M.floor = T(TEXGEN.plaster(15, [226, 232, 242]), { bump: .022 });
    M.ground = T(TEXGEN.plaster(17, [238, 242, 250]));
    M.cont = cont(.3);
    M.pine = T(TEXGEN.camo(91, [[44, 72, 52], [32, 56, 40], [58, 88, 62]]));
    M.trunk = T(TEXGEN.wood(99, [90, 66, 48]));
    M.snow = T(TEXGEN.plain([242, 246, 252], .05));
  } else if (theme === 'night') {
    M.wall = T(TEXGEN.concrete(27, [96, 98, 108]), { bump: .025 });
    M.wall2 = T(tint(TEXGEN.sandWall(5, [150, 92, 76]), [.72, .68, .7]), { bump: .03 });
    M.trim = T(TEXGEN.plain([58, 60, 68], .2));
    M.floor = T(TEXGEN.asphalt(33), { bump: .015 });
    M.ground = M.floor;
    M.cont = cont(.35);
    M.win = T(TEXGEN.windows(73), { glow: 2.8 });
    M.neon = [mat(TEX.white, { color: [1, .25, .6], emis: [5, .7, 2.6] }), mat(TEX.white, { color: [.25, .85, 1], emis: [.6, 3.6, 5] }), mat(TEX.white, { color: [1, .8, .3], emis: [5, 3.4, .8] })];
  } else if (theme === 'jungle') {
    M.wall = T(tint(TEXGEN.sandWall(17, [150, 150, 128]), [.8, .88, .74]), { bump: .03 });
    M.wall2 = T(tint(TEXGEN.sandWall(23, [136, 134, 120]), [.86, .9, .82]), { bump: .03 });
    M.trim = T(TEXGEN.camo(95, [[64, 94, 42], [48, 74, 34], [84, 112, 52]]));
    M.floor = T(tint(TEXGEN.sandFloor(21), [.66, .74, .62]), { bump: .022 });
    M.ground = T(TEXGEN.camo(93, [[72, 98, 48], [58, 82, 38], [88, 112, 56]]));
    M.cont = cont(.25);
    M.leaf = T(TEXGEN.camo(97, [[62, 112, 48], [44, 88, 36], [86, 132, 58]]));
    M.trunk = T(TEXGEN.wood(99, [96, 72, 50]));
  } else {
    M.wall = T(TEXGEN.concrete(29, [146, 144, 138]), { bump: .025 });
    M.wall2 = T(TEXGEN.metal(49, [104, 110, 116]), { spec: .3, bump: .02 });
    M.trim = T(TEXGEN.plain([204, 162, 44], .2));
    M.floor = T(TEXGEN.concrete(35, [126, 126, 122]), { bump: .015 });
    M.ground = T(TEXGEN.asphalt(37));
    M.cont = cont(.35);
    M.rust = T(TEXGEN.metal(51, [150, 92, 56]), { spec: .4 });
    M.crane = T(TEXGEN.metal(45, [214, 140, 40]), { spec: .4 });
  }
  THEMETEX[theme] = M; return M;
}

function buildWorld(key) {
  for (const s of G.static) freeMesh(s.mesh);
  G.static = []; G.lamps = []; G.decor = [];
  const def = MAPS[key]; G.key = key; buildGrid(def);
  const thm = THEMES[def.theme];
  G.theme = {
    sunDir: normalize3(thm.sunDir), sun: sc(thm.sun), sky: sc(thm.sky), ground: sc(thm.ground), fog: sc(thm.fog), fogD: thm.fogD,
    top: sc(thm.top), hor: sc(thm.hor), bot: sc(thm.bot), expo: thm.expo, stars: thm.stars, name: def.theme, surf: thm.surf, smoke: thm.smoke,
  };
  const M = themeMaterials(def.theme);
  const B = { wall: new Builder(), wall2: new Builder(), trim: new Builder(), floor: new Builder(), ground: new Builder(), crate: new Builder(), crate2: new Builder(), barrelR: new Builder(), barrelB: new Builder() };
  const BC = M.cont.map(() => new Builder());
  const W = G.W, H = G.H, WS = 4;
  const isWall = (i, j) => { if (i < 0 || j < 0 || i >= W || j >= H) return true; const t = G.type[idx(i, j)]; return t === 1 || t === 7; };
  const wallH = (i, j) => { if (i < 0 || j < 0 || i >= W || j >= H) return 99; const t = G.type[idx(i, j)]; return (t === 1 || t === 7) ? TYPE_H[t] : 0; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const t = G.type[idx(i, j)];
    const x0 = i * CELL, x1 = x0 + CELL, z0 = j * CELL, z1 = z0 + CELL;
    if (t === 1 || t === 7) {
      const h = TYPE_H[t];
      const variant = hash2(Math.floor(i / 5), Math.floor(j / 4), 77) > .55 && t === 1 ? B.wall2 : B.wall;
      variant.wquad([x0, h, z1], [x1, h, z1], [x1, h, z0], [x0, h, z0], [0, 1, 0], WS);
      const sides = [[1, 0, [x1, z1], [x1, z0], [1, 0, 0]], [-1, 0, [x0, z0], [x0, z1], [-1, 0, 0]], [0, 1, [x0, z1], [x1, z1], [0, 0, 1]], [0, -1, [x1, z0], [x0, z0], [0, 0, -1]]];
      for (const [di, dj, a, b, n] of sides) {
        const nh = wallH(i + di, j + dj); if (nh >= h) continue;
        variant.wquad([a[0], nh, a[1]], [b[0], nh, b[1]], [b[0], h, b[1]], [a[0], h, a[1]], n, WS);
        if (nh === 0 && t === 1) { // baseboard trim
          const o = .05, th = .32; const ox = n[0] * o, oz = n[2] * o;
          B.trim.wquad([a[0] + ox, 0, a[1] + oz], [b[0] + ox, 0, b[1] + oz], [b[0] + ox, th, b[1] + oz], [a[0] + ox, th, a[1] + oz], n, WS);
          B.trim.wquad([a[0] + ox, th, a[1] + oz], [b[0] + ox, th, b[1] + oz], [b[0], th, b[1]], [a[0], th, a[1]], [0, 1, 0], WS);
        }
      }
    } else {
      B.floor.wquad([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], [0, 1, 0], 4);
    }
  }
  // crates & barrels
  const cyl = geoCyl(16, true); const tmp = M4.n();
  for (const [x, z, t] of def.objs) {
    const cx = cellCenter(x), cz = cellCenter(z);
    if (t === 2) B.crate.box(cx - .95, 0, cz - .95, cx + .95, 1.1, cz + .95, 1, 63, true);
    if (t === 3) { B.crate2.box(cx - .97, 0, cz - .97, cx + .97, 1.1, cz + .97, 1, 63, true); B.crate.box(cx - .9, 1.1, cz - .9, cx + .9, 2.2, cz + .9, 1, 63, true); }
    if (t === 4) { for (const [ox, oz] of [[-.48, -.48], [.48, -.48], [-.48, .48], [.48, .48]]) { const bb = hash2(x * 3 + ox * 7, z, 5) > .5 ? B.barrelR : B.barrelB; M4.trs(tmp, cx + ox, .625, cz + oz, 0, hash2(x, z + ox, 2) * 6, 0, .9, 1.25, .9); bb.add(cyl, tmp); } }
  }
  // containers
  for (const op of def.ops) {
    if (op[0] !== 'f' || (op[5] !== 5 && op[5] !== 6)) continue;
    const [, x, z, w, h, t, c] = op;
    const x0 = x * CELL + .04, z0 = z * CELL + .04, x1 = (x + w) * CELL - .04, z1 = (z + h) * CELL - .04;
    BC[c].box(x0, 0, z0, x1, 2.58, z1, 4);
    if (t === 6) BC[(c + 1) % 4].box(x0 + .06, 2.6, z0 + .06, x1 - .06, 5.18, z1 - .06, 4);
  }
  // outer ground
  const ex = 260; const mx = W * CELL / 2, mz = H * CELL / 2;
  B.ground.wquad([mx - ex, -.03, mz + ex], [mx + ex, -.03, mz + ex], [mx + ex, -.03, mz - ex], [mx - ex, -.03, mz - ex], [0, 1, 0], 6);
  // skyline
  const XB = { wall: B.wall, wall2: B.wall2, cont: BC, extra: [] };
  buildSkyline(thm.style, M, XB);
  const add = (b, m, shadow = true) => { const mesh = b.build(); if (mesh) G.static.push({ mesh, mat: m, shadow }); };
  add(B.wall, M.wall); add(B.wall2, M.wall2); add(B.trim, M.trim); add(B.floor, M.floor); add(B.ground, M.ground, false);
  add(B.crate, MAT.crate); add(B.crate2, MAT.crate2); add(B.barrelR, MAT.barrelR); add(B.barrelB, MAT.barrelB);
  BC.forEach((b, i) => add(b, M.cont[i]));
  for (const [b, m, sh] of XB.extra) add(b, m, sh);
  // site floor letters
  G.siteDecals = [];
  for (const [s, r] of Object.entries(def.sites)) {
    const cells = G.siteCells[s]; let best = null, bd = 1e9; const cx = r[0] + r[2] / 2, cz = r[1] + r[3] / 2;
    for (const [i, j] of cells) { let open = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (walkable(i + di, j + dj)) open++; const d = Math.hypot(i + .5 - cx, j + .5 - cz) - open * .6; if (d < bd) { bd = d; best = [i, j]; } }
    if (best) G.siteDecals.push({ x: cellCenter(best[0]), z: cellCenter(best[1]), cell: s === 'A' ? 8 : 9, size: 2.6 });
  }
}

function buildSkyline(style, M, XB) {
  const W = G.W * CELL, H = G.H * CELL; const rnd = (() => { let s = 1234; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const sides = [];
  for (let x = -12; x < W + 12; x += 9) { sides.push([x, -rnd() * 10 - 6, 0]); sides.push([x, H + rnd() * 10 + 6, 1]); }
  for (let z = -6; z < H + 6; z += 9) { sides.push([-rnd() * 10 - 6, z, 2]); sides.push([W + rnd() * 10 + 6, z, 3]); }
  const tmp = M4.n();
  const cube = new Builder(); cube.box(-.5, -.5, -.5, .5, .5, .5, 1, 63, true);
  const sph = geoSphere(16, 8, true), ball = geoSphere(12, 8), cyl = geoCyl(10, true);
  // a point just outside the play area on the same side as s, for trees and props
  const near = (s, spread) => { const px = s[0] + (rnd() - .5) * spread, pz = s[1] + (rnd() - .5) * spread; return s[2] < 2 ? [px, s[2] === 0 ? -3 - rnd() * 3 : H + 3 + rnd() * 3] : [s[2] === 2 ? -3 - rnd() * 3 : W + 3 + rnd() * 3, pz]; };
  if (style === 'desert') {
    const domeB = new Builder(), palmB = new Builder(), trunkB = new Builder(), clothB = [new Builder(), new Builder()];
    const cyl8 = geoCyl(8, false);
    for (const [x, z] of sides) {
      const w = 6 + rnd() * 6, d = 6 + rnd() * 6, h = 6.5 + rnd() * 10; const b = rnd() > .5 ? XB.wall : XB.wall2;
      b.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 4, 63 - 8);
      if (rnd() > .7) { M4.trs(tmp, x, h, z, 0, 0, 0, Math.min(w, d) * .8, Math.min(w, d) * .9, Math.min(w, d) * .8); domeB.add(sph, tmp); }
      if (rnd() > .75) { const cb = clothB[rnd() > .5 ? 1 : 0]; M4.trs(tmp, x, h + 1.2, z, 0, rnd() * 3, 0, .08, 2.4, .08); trunkB.add(cyl8, tmp); M4.trs(tmp, x + .6, h + 2, z, 0, rnd() * 3, 0, 1.2, .7, .02); cb.add(cube, tmp); }
    }
    for (let k = 0; k < 16; k++) {
      const s = sides[Math.floor(rnd() * sides.length)]; const [bx, bz] = near(s, 6);
      const h = 9 + rnd() * 5, lean = (rnd() - .5) * .25, dir = rnd() * TAU; let y = 0, ox = 0, oz = 0;
      for (let sgm = 0; sgm < 6; sgm++) { const sh = h / 6; M4.trs(tmp, bx + ox, y + sh / 2, bz + oz, lean * Math.cos(dir), 0, lean * Math.sin(dir), .42 - sgm * .03, sh * 1.02, .42 - sgm * .03); trunkB.add(cyl8, tmp); y += sh; ox += Math.sin(lean) * sh * Math.sin(dir); oz += Math.sin(lean) * sh * Math.cos(dir); }
      for (let f = 0; f < 9; f++) { const a = f / 9 * TAU + rnd(); M4.trs(tmp, bx + ox + Math.cos(a) * 1.5, y - .3, bz + oz + Math.sin(a) * 1.5, .45, -a + Math.PI / 2, 0, .7, .06, 3.4); palmB.add(cube, tmp); }
    }
    XB.extra.push([domeB, M.wall2, true], [palmB, M.palm, true], [trunkB, M.trunk, true], [clothB[0], M.cloth[0], false], [clothB[1], M.cloth[1], false]);
  } else if (style === 'port' || style === 'factory') {
    const winB = new Builder(), craneB = new Builder(), extraB = new Builder();
    for (const [x, z, s] of sides) {
      const off = s === 0 ? -14 : s === 1 ? 14 : 0, offx = s === 2 ? -14 : s === 3 ? 14 : 0;
      if (rnd() > .55) { const w = 10 + rnd() * 10, d = 8 + rnd() * 8, h = 9 + rnd() * 18; (style === 'port' ? winB : XB.wall2).box(x + offx - w / 2, 0, z + off - d / 2, x + offx + w / 2, h, z + off + d / 2, 8); }
      else if (style === 'port') { const stack = 1 + Math.floor(rnd() * 3); const rot = rnd() > .5; for (let k = 0; k < stack; k++) { const c = Math.floor(rnd() * 4); const lw = rot ? 2.4 : 6, ld = rot ? 6 : 2.4; XB.cont[c].box(x - lw / 2, k * 2.6, z - ld / 2, x + lw / 2, k * 2.6 + 2.58, z + ld / 2, 4); } }
      else if (rnd() > .5) { // storage tank
        const r = 3 + rnd() * 2.5, h = 6 + rnd() * 6; M4.trs(tmp, x + offx * .5, h / 2, z + off * .5, 0, 0, 0, r * 2, h, r * 2); extraB.add(cyl, tmp);
        M4.trs(tmp, x + offx * .5, h, z + off * .5, 0, 0, 0, r * 2, r * .8, r * 2); extraB.add(sph, tmp);
      } else { // chimney
        const h = 22 + rnd() * 16; M4.trs(tmp, x + offx * .7, h / 2, z + off * .7, 0, 0, 0, 2.6, h, 2.6); XB.wall.add(cyl, tmp);
        for (const y of [h * .55, h * .8]) { M4.trs(tmp, x + offx * .7, y, z + off * .7, 0, 0, 0, 2.9, .5, 2.9); craneB.add(cyl, tmp); }
      }
    }
    for (const [cx, cz] of [[-22, H * .35], [W + 22, H * .6]]) {
      for (const [lx, lz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) craneB.box(cx + lx - .4, 0, cz + lz - .4, cx + lx + .4, 24, cz + lz + .4, 3);
      craneB.box(cx - 5, 22, cz - 5, cx + 5, 24.5, cz + 5, 3);
      const dirx = cx < 0 ? 1 : -1; craneB.box(Math.min(cx, cx + dirx * 34), 25, cz - 1, Math.max(cx, cx + dirx * 34), 27, cz + 1, 3);
      craneB.box(Math.min(cx, cx - dirx * 12), 25, cz - 1.4, Math.max(cx, cx - dirx * 12), 28, cz + 1.4, 3);
    }
    if (style === 'port') XB.extra.push([winB, M.win, true]); else XB.extra.push([extraB, M.rust, true]);
    XB.extra.push([craneB, M.crane, true]);
  } else if (style === 'city') {
    const winB = new Builder(), neonB = M.neon.map(() => new Builder());
    for (const [x, z, s] of sides) {
      const off = s === 0 ? -10 : s === 1 ? 10 : 0, offx = s === 2 ? -10 : s === 3 ? 10 : 0;
      const w = 9 + rnd() * 9, d = 9 + rnd() * 9, h = 14 + rnd() * 30, bx = x + offx, bz = z + off;
      winB.box(bx - w / 2, 0, bz - d / 2, bx + w / 2, h, bz + d / 2, 8);
      if (rnd() > .45) { // neon sign facing the map
        const nb = neonB[Math.floor(rnd() * neonB.length)], y = 4 + rnd() * 8, l = 3 + rnd() * 4;
        if (s < 2) { const fz = s === 0 ? bz + d / 2 + .1 : bz - d / 2 - .1; nb.box(bx - l / 2, y, fz - .08, bx + l / 2, y + .7, fz + .08, 1); }
        else { const fx = s === 2 ? bx + w / 2 + .1 : bx - w / 2 - .1; nb.box(fx - .08, y, bz - l / 2, fx + .08, y + .7, bz + l / 2, 1); }
      }
    }
    XB.extra.push([winB, M.win, true], ...neonB.map((b, i) => [b, M.neon[i], false]));
  } else if (style === 'snow') {
    const roofB = new Builder(), pineB = new Builder(), trunkB = new Builder(), capB = new Builder();
    for (const [x, z] of sides) {
      if (rnd() > .5) { // chalet with a snowy roof
        const w = 6 + rnd() * 5, d = 6 + rnd() * 5, h = 4 + rnd() * 4;
        XB.wall2.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 4, 63 - 8);
        roofB.box(x - w / 2 - .5, h, z - d / 2 - .5, x + w / 2 + .5, h + .8, z + d / 2 + .5, 4);
        M4.trs(tmp, x, h + .8, z, 0, 0, 0, w * .9, 2.6, d * 1.05); roofB.add(sph, tmp);
      } else XB.wall.box(x - 4, 0, z - 4, x + 4, 3 + rnd() * 8, z + 4, 4, 63 - 8);
    }
    for (let k = 0; k < 38; k++) {
      const [bx, bz] = near(sides[Math.floor(rnd() * sides.length)], 8), h = 7 + rnd() * 7;
      M4.trs(tmp, bx, 1, bz, 0, 0, 0, .5, 2, .5); trunkB.add(cyl, tmp);
      for (let t = 0; t < 3; t++) { const r = (2.6 - t * .7) * (h / 10), y = 2 + t * h * .26; M4.trs(tmp, bx, y + h * .16, bz, 0, rnd() * 3, 0, r * 2, h * .36, r * 2); pineB.add(ball, tmp); M4.trs(tmp, bx, y + h * .27, bz, 0, 0, 0, r * 1.5, h * .14, r * 1.5); capB.add(ball, tmp); }
    }
    XB.extra.push([roofB, M.snow, true], [pineB, M.pine, true], [trunkB, M.trunk, true], [capB, M.snow, false]);
  } else if (style === 'jungle') {
    const leafB = new Builder(), trunkB = new Builder();
    for (const [x, z] of sides) {
      if (rnd() > .4) { // ruined stone block, stepped like a pyramid
        const w = 5 + rnd() * 6, h = 3 + rnd() * 6, b = rnd() > .5 ? XB.wall : XB.wall2;
        b.box(x - w / 2, 0, z - w / 2, x + w / 2, h, z + w / 2, 4, 63 - 8);
        if (rnd() > .5) b.box(x - w / 3, h, z - w / 3, x + w / 3, h + h * .6, z + w / 3, 4, 63 - 8);
      }
    }
    for (let k = 0; k < 44; k++) {
      const [bx, bz] = near(sides[Math.floor(rnd() * sides.length)], 9), h = 10 + rnd() * 9;
      M4.trs(tmp, bx, h / 2, bz, (rnd() - .5) * .12, 0, (rnd() - .5) * .12, .7, h, .7); trunkB.add(cyl, tmp);
      for (let f = 0; f < 5; f++) { const a = rnd() * TAU, r = rnd() * 2.6; M4.trs(tmp, bx + Math.cos(a) * r, h + rnd() * 2 - 1, bz + Math.sin(a) * r, 0, rnd() * 3, 0, 4 + rnd() * 3, 2.4 + rnd() * 1.5, 4 + rnd() * 3); leafB.add(ball, tmp); }
    }
    XB.extra.push([leafB, M.leaf, true], [trunkB, M.trunk, true]);
  }
  // lamps listed by the map: a fixture on top of a wall, or a post standing on the floor
  const poleB = new Builder(), lampB = new Builder();
  for (const [i, j] of G.def.lamps || []) {
    const x = cellCenter(i), z = cellCenter(j); const top = TYPE_H[G.type[idx(i, j)]] || 0; const y = top + (top ? .4 : 6);
    if (!top) poleB.box(x - .12, 0, z - .12, x + .12, y, z + .12, 2);
    lampB.box(x - .35, y, z - .35, x + .35, y + .25, z + .35, 1, 63, true);
    G.lamps.push({ x, y: y - .5, z, c: hexLin(0xffc58a).map(v => v * 3.2), r: 17 });
  }
  XB.extra.push([poleB, M.pole, true], [lampB, M.lamp, false]);
}

// ===================== ENTITIES: weapons, models, physics, shooting =====================
const MESH = {};
function buildBaseMeshes() {
  const cube = new Builder(); cube.box(-.5, -.5, -.5, .5, .5, .5, 1, 63, true); MESH.cube = cube.build();
  MESH.cyl = geoCyl(14, true).build(); MESH.sph = geoSphere(14, 10).build();
}
const W = {
  knife: { name: 'Knife', slot: 3, melee: true, dmg: 55, rate: .5, speed: 1.0, kill: 1500, model: 'knife' },
  p9: { name: 'P9 Sidearm', slot: 2, dmg: 27, rate: .15, mag: 15, res: 90, reload: 2.0, spread: .010, moveSpread: .035, recoil: .016, speed: .96, price: 200, kill: 300, auto: false, snd: 'pistol', armor: .5, fall: .9, model: 'p9' },
  hc50: { name: 'HC-50 Magnum', slot: 2, dmg: 58, rate: .34, mag: 7, res: 35, reload: 2.2, spread: .006, moveSpread: .07, recoil: .055, speed: .92, price: 700, kill: 300, auto: false, snd: 'heavy', armor: .8, fall: .88, model: 'hc50' },
  mpx: { name: 'MPX-5', slot: 1, dmg: 24, rate: .075, mag: 30, res: 120, reload: 2.4, spread: .016, moveSpread: .014, recoil: .010, speed: .97, price: 1250, kill: 600, auto: true, snd: 'smg', armor: .6, fall: .82, model: 'mpx' },
  kr47: { name: 'KR-47', slot: 1, team: 'T', dmg: 36, rate: .1, mag: 30, res: 90, reload: 2.5, spread: .0035, moveSpread: .09, recoil: .021, speed: .86, price: 2700, kill: 300, auto: true, snd: 'rifle', armor: .78, fall: .98, model: 'kr47' },
  m5: { name: 'M5 Carbine', slot: 1, team: 'CT', dmg: 32, rate: .09, mag: 30, res: 90, reload: 3.0, spread: .003, moveSpread: .085, recoil: .016, speed: .88, price: 3100, kill: 300, auto: true, snd: 'rifle2', armor: .7, fall: .97, model: 'm5' },
  lb338: { name: 'Longbow .338', slot: 1, dmg: 115, rate: 1.45, mag: 5, res: 30, reload: 3.6, spread: .0004, moveSpread: .12, unscoped: .09, recoil: .08, speed: .78, price: 4750, kill: 100, auto: false, scope: true, snd: 'sniper', armor: .97, fall: .99, model: 'lb338' },
  viper: { name: 'Viper Auto', slot: 2, dmg: 21, rate: .075, mag: 18, res: 72, reload: 2.1, spread: .014, moveSpread: .03, recoil: .013, speed: .95, price: 500, kill: 300, auto: true, snd: 'smg', armor: .55, fall: .85, model: 'viper' },
  wasp: { name: 'Wasp PDW', slot: 1, dmg: 22, rate: .066, mag: 50, res: 100, reload: 3.1, spread: .015, moveSpread: .016, recoil: .009, speed: .96, price: 2350, kill: 300, auto: true, snd: 'pdw', armor: .62, fall: .84, model: 'wasp' },
  sg12: { name: 'Breaker 12', slot: 1, dmg: 19, pellets: 9, rate: .88, mag: 7, res: 28, reload: 3.0, spread: .055, moveSpread: .02, recoil: .07, speed: .9, price: 1100, kill: 900, auto: false, snd: 'shotgun', armor: .5, fall: .78, model: 'sg12' },
  hmg: { name: 'HMG-90', slot: 1, dmg: 32, rate: .085, mag: 100, res: 200, reload: 5.4, spread: .012, moveSpread: .12, recoil: .015, speed: .78, price: 5200, kill: 300, auto: true, snd: 'lmg', armor: .75, fall: .97, model: 'hmg' },
  // fires a visible rocket that explodes where it hits; the blast hurts everyone near it, the shooter too
  rocket: { name: 'RL-7 Rocket Launcher', slot: 1, rocket: true, dmg: 140, radius: 6.5, rate: 1.2, mag: 1, res: 4, reload: 3.2, spread: .004, moveSpread: .05, recoil: .09, speed: .8, price: 4200, kill: 300, auto: false, snd: 'rocket', armor: .6, fall: 1, model: 'rocket' },
  dmr: { name: 'Marksman DMR', slot: 1, dmg: 64, rate: .26, mag: 20, res: 60, reload: 3.0, spread: .0012, moveSpread: .1, unscoped: .025, recoil: .04, speed: .82, price: 3900, kill: 300, auto: false, scope: true, zooms: 1, snd: 'dmr', armor: .85, fall: .99, model: 'dmr' },
  he: { name: 'HE Grenade', slot: 4, nade: 'he', price: 300, speed: 1, model: 'he' },
  smoke: { name: 'Smoke Grenade', slot: 4, nade: 'smoke', price: 300, speed: 1, model: 'smoke' },
  flash: { name: 'Flashbang', slot: 4, nade: 'flash', price: 200, speed: 1, model: 'flash' },
  molly: { name: 'Incendiary', slot: 4, nade: 'molly', price: 500, speed: 1, model: 'molly', kill: 300 },
};
const MAX_NADES = 3;
const GEAR = { kevlar: { name: 'Kevlar Vest', price: 650 }, helmet: { name: 'Kevlar + Helmet', price: 1000 }, kit: { name: 'Defuse Kit', price: 400, team: 'CT' } };

function gbox(m, t, s, r = [0, 0, 0]) { return node(MESH.cube, m, t, r, s); }
function buildGun(k) {
  const root = node(null, null); const A = (...a) => { const n = gbox(...a); root.kids.push(n); return n; };
  const G1 = MAT.gun, G2 = MAT.gunLight, WD = MAT.wood; let tip = [0, .03, -.3];
  switch (k) {
    case 'knife': A(G1, [0, 0, .06], [.032, .04, .12]); A(G2, [0, .0, -.005], [.04, .05, .015]); A(MAT.blade, [0, .008, -.12], [.006, .036, .2]); A(MAT.blade, [0, .02, -.225], [.006, .014, .03], [0.8, 0, 0]); tip = [0, 0, -.24]; break;
    case 'p9': A(G1, [0, .035, -.06], [.034, .036, .2]); A(G2, [0, .008, -.05], [.03, .02, .17]); A(G1, [0, -.05, .015], [.03, .11, .045], [.25, 0, 0]); A(G1, [0, -.012, -.04], [.006, .02, .04]); tip = [0, .035, -.17]; break;
    case 'hc50': A(G2, [0, .04, -.07], [.04, .045, .26]); A(G1, [0, .01, -.06], [.036, .025, .2]); A(WD, [0, -.055, .02], [.034, .12, .05], [.28, 0, 0]); A(G1, [0, .068, -.18], [.008, .012, .012]); tip = [0, .04, -.21]; break;
    case 'mpx': A(G1, [0, .02, -.08], [.05, .07, .3]); A(G1, [0, -.075, -.11], [.034, .13, .045]); A(G1, [0, -.06, .03], [.035, .1, .045], [.3, 0, 0]); A(G1, [0, .03, -.27], [.022, .022, .12]); A(G2, [0, .02, .15], [.03, .05, .18]); A(G2, [0, .07, -.06], [.02, .03, .1]); tip = [0, .03, -.34]; break;
    case 'kr47': A(G1, [0, .02, -.05], [.055, .075, .36]); A(WD, [0, .015, -.3], [.062, .062, .2]); A(G1, [0, .035, -.5], [.02, .02, .3]); A(G1, [0, .065, -.32], [.022, .022, .24]); A(G1, [0, .085, -.6], [.01, .04, .015]);
      A(G1, [0, -.08, -.12], [.04, .13, .07], [-.2, 0, 0]); A(G1, [0, -.18, -.08], [.04, .1, .07], [-.55, 0, 0]); A(WD, [0, -.06, .07], [.04, .1, .05], [.3, 0, 0]); A(WD, [0, -.005, .26], [.045, .085, .28], [-.06, 0, 0]); tip = [0, .035, -.66]; break;
    case 'm5': A(G2, [0, .02, -.05], [.055, .08, .34]); A(G1, [0, .025, -.3], [.066, .066, .22]); A(G1, [0, .03, -.5], [.02, .02, .26]); A(G1, [0, .1, -.06], [.034, .05, .12]); A(G1, [0, .105, -.12], [.04, .04, .02]);
      A(G1, [0, -.09, -.1], [.034, .14, .06], [-.12, 0, 0]); A(G1, [0, -.06, .07], [.038, .1, .045], [.3, 0, 0]); A(G2, [0, .005, .22], [.045, .07, .22]); A(G1, [0, .07, -.38], [.012, .03, .012]); tip = [0, .03, -.64]; break;
    case 'lb338': A(MAT.gunLight, [0, .02, -.05], [.06, .08, .5]); A(G1, [0, .035, -.6], [.026, .026, .56]); root.kids.push(node(MESH.cyl, G1, [0, .125, -.06], [Math.PI / 2, 0, 0], [.05, .34, .05])); root.kids.push(node(MESH.cyl, G1, [0, .125, -.22], [Math.PI / 2, 0, 0], [.065, .06, .065])); root.kids.push(node(MESH.cyl, G1, [0, .125, .1], [Math.PI / 2, 0, 0], [.06, .05, .06]));
      A(G2, [0, -.01, .32], [.05, .13, .3]); A(G1, [0, -.07, -.08], [.04, .09, .08]); A(G1, [0, -.06, .1], [.035, .1, .045], [.3, 0, 0]); A(G1, [.04, .05, .02], [.05, .012, .012]); tip = [0, .035, -.9]; break;
    case 'viper': A(G1, [0, .035, -.07], [.032, .04, .2]); A(G2, [0, .01, -.06], [.028, .02, .16]); A(G1, [0, -.09, -.035], [.026, .17, .04]); A(G1, [0, -.05, .02], [.03, .1, .045], [.25, 0, 0]); A(G1, [0, .035, -.19], [.014, .014, .05]); tip = [0, .035, -.21]; break;
    case 'wasp': A(G2, [0, .01, -.06], [.06, .1, .42]); A(G1, [0, .075, -.08], [.03, .03, .3]); A(G1, [0, .065, .06], [.05, .022, .24]); A(G1, [0, .02, -.3], [.02, .02, .08]); A(G1, [0, -.08, -.14], [.034, .1, .045], [.25, 0, 0]); A(G1, [0, -.03, .16], [.05, .06, .06]); tip = [0, .02, -.34]; break;
    case 'sg12': A(G1, [0, .02, -.02], [.055, .07, .28]); A(G1, [0, .048, -.38], [.03, .03, .5]); A(G1, [0, .008, -.35], [.026, .026, .44]); A(WD, [0, .008, -.3], [.052, .048, .16]);
      A(WD, [0, -.025, .24], [.046, .095, .28], [-.08, 0, 0]); A(G1, [0, -.06, .06], [.035, .1, .045], [.3, 0, 0]); A(G1, [0, .068, -.62], [.008, .014, .01]); tip = [0, .048, -.64]; break;
    case 'rocket': {
      const tube = (t, sc) => root.kids.push(node(MESH.cyl, MAT.rocket, t, [Math.PI / 2, 0, 0], sc));
      tube([0, .06, -.1], [.11, .95, .11]); root.kids.push(node(MESH.cyl, G1, [0, .06, -.58], [Math.PI / 2, 0, 0], [.13, .06, .13])); root.kids.push(node(MESH.cyl, G1, [0, .06, .38], [Math.PI / 2, 0, 0], [.14, .06, .14]));
      A(G1, [0, -.06, -.05], [.035, .11, .045], [.25, 0, 0]); A(G1, [0, -.05, -.28], [.035, .09, .045]); A(G2, [-.07, .1, -.15], [.03, .06, .1]); tip = [0, .06, -.62]; break;
    }
    case 'rocket_round':
      root.kids.push(node(MESH.cyl, MAT.rocket, [0, 0, .1], [Math.PI / 2, 0, 0], [.08, .36, .08])); root.kids.push(node(MESH.sph, G2, [0, 0, -.12], [0, 0, 0], [.11, .11, .2]));
      root.kids.push(node(MESH.sph, MAT.flame, [0, 0, .32], [0, 0, 0], [.07, .07, .16])); tip = [0, 0, 0]; break;
    case 'hmg': A(G1, [0, .02, -.05], [.075, .1, .42]); A(G1, [0, .03, -.42], [.052, .052, .42]); A(G1, [0, .03, -.68], [.022, .022, .14]); A(G2, [0, -.09, -.08], [.085, .1, .13]);
      A(G1, [0, -.025, -.52], [.04, .015, .2]); A(G1, [0, 0, .25], [.05, .1, .28]); A(G1, [0, -.07, .07], [.035, .1, .045], [.3, 0, 0]); A(G1, [0, .1, -.12], [.02, .045, .14]); tip = [0, .03, -.76]; break;
    case 'dmr': A(G2, [0, .02, -.05], [.055, .08, .4]); A(G1, [0, .03, -.48], [.022, .022, .4]); root.kids.push(node(MESH.cyl, G1, [0, .11, -.06], [Math.PI / 2, 0, 0], [.045, .26, .045]));
      A(G1, [0, -.085, -.1], [.04, .12, .06]); A(G2, [0, -.005, .25], [.046, .1, .26]); A(G1, [0, -.065, .07], [.035, .1, .045], [.3, 0, 0]); tip = [0, .03, -.7]; break;
    case 'flash': root.kids.push(node(MESH.cyl, MAT.nadeFl, [0, 0, 0], [0, 0, 0], [.065, .12, .065])); A(MAT.nadeHE, [0, .02, 0], [.07, .02, .07]); A(G2, [.02, .07, 0], [.012, .04, .02]); tip = [0, 0, 0]; break;
    case 'molly': root.kids.push(node(MESH.cyl, MAT.nadeMo, [0, 0, 0], [0, 0, 0], [.075, .14, .075])); root.kids.push(node(MESH.cyl, MAT.nadeMo, [0, .1, 0], [0, 0, 0], [.03, .07, .03])); A(MAT.cloth, [0, .15, 0], [.035, .04, .035]); tip = [0, 0, 0]; break;
    case 'he': root.kids.push(node(MESH.sph, MAT.nadeHE, [0, 0, 0], [0, 0, 0], [.075, .095, .075])); A(G2, [.02, .055, 0], [.012, .04, .02]); tip = [0, 0, 0]; break;
    case 'smoke': root.kids.push(node(MESH.cyl, MAT.nadeSm, [0, 0, 0], [0, 0, 0], [.07, .13, .07])); A(G2, [.02, .07, 0], [.012, .04, .02]); tip = [0, 0, 0]; break;
    case 'bomb': A(MAT.bomb, [0, .06, 0], [.32, .12, .2]); A(MAT.wood, [0, .13, 0], [.16, .02, .12]); A(MAT.gun, [.1, .13, 0], [.06, .03, .1]); const led = A(MAT.led, [-.12, .13, .06], [.025, .02, .025]); led.name = 'led'; tip = [0, .2, 0]; break;
  }
  const t = node(null, null, tip); t.name = 'tip'; root.kids.push(t);
  return root;
}

function buildChar(team) {
  const m = MAT[team]; const root = node(null, null); root.name = 'root';
  const hips = node(null, null, [0, .9, 0]); hips.name = 'hips'; root.kids.push(hips);
  for (const s of [-1, 1]) {
    const leg = node(null, null, [s * .12, 0, 0]); leg.name = s < 0 ? 'legL' : 'legR';
    leg.kids.push(gbox(m.pants, [0, -.42, 0], [.19, .84, .22])); leg.kids.push(gbox(m.boot, [0, -.84, -.04], [.21, .13, .31]));
    leg.kids.push(gbox(m.vest, [s * .02, -.45, -.11], [.17, .14, .04]));
    hips.kids.push(leg);
  }
  const torso = node(null, null); torso.name = 'torso'; hips.kids.push(torso);
  torso.kids.push(gbox(m.body, [0, .32, 0], [.5, .62, .28]));
  torso.kids.push(gbox(m.boot, [0, .03, 0], [.52, .08, .3]));
  torso.kids.push(gbox(m.vest, [0, .37, 0], [.55, .42, .34]));
  torso.kids.push(gbox(m.vest, [.13, .26, -.18], [.12, .12, .05])); torso.kids.push(gbox(m.vest, [-.13, .26, -.18], [.12, .12, .05]));
  if (team === 'T') torso.kids.push(gbox(MAT.T.pants, [0, .3, .2], [.3, .32, .12]));
  const upper = node(null, null, [0, .56, 0]); upper.name = 'upper'; torso.kids.push(upper);
  const head = node(null, null, [0, .18, 0]); head.name = 'head'; upper.kids.push(head);
  if (team === 'T') {
    head.kids.push(gbox(mat(TEX.boot, { color: [1.1, 1.05, 1] }), [0, 0, 0], [.24, .27, .25]));
    head.kids.push(gbox(m.face, [0, 0, -.127], [.22, .25, .006]));
  } else {
    head.kids.push(gbox(m.skin, [0, 0, 0], [.24, .27, .25]));
    head.kids.push(gbox(m.face, [0, 0, -.127], [.22, .25, .006]));
    head.kids.push(gbox(m.hat, [0, .12, .01], [.28, .12, .29])); head.kids.push(gbox(m.hat, [0, .06, .01], [.29, .06, .3]));
    head.kids.push(gbox(MAT.gun, [0, .045, -.14], [.2, .03, .03]));
  }
  upper.kids.push(gbox(m.body, [.24, -.12, -.15], [.11, .11, .4], [.35, .3, 0]));
  upper.kids.push(gbox(m.body, [-.14, -.1, -.24], [.11, .11, .48], [.25, -.55, 0]));
  upper.kids.push(gbox(m.glove, [.13, -.2, -.33], [.09, .09, .1]));
  upper.kids.push(gbox(m.glove, [.03, -.14, -.48], [.09, .09, .1]));
  upper.kids.push(gbox(m.vest, [0, -.02, 0], [.56, .14, .3]));
  const gun = node(null, null, [.1, -.16, -.36]); gun.name = 'gun'; upper.kids.push(gun);
  return root;
}

// viewmodel: arms + gun in camera space
function buildVM(team, k) {
  const m = MAT[team]; const root = node(null, null); root.name = 'vm';
  const gun = buildGun(W[k].model); gun.name = 'vmgun'; root.kids.push(gun);
  const isRifle = W[k].slot === 1;
  const isNade = !!W[k].nade;
  // right arm (from grip back-right-down)
  root.kids.push(gbox(m.glove, [.0, -.06, .05], [.06, .07, .09]));
  root.kids.push(gbox(m.body, [.05, -.12, .22], [.085, .085, .34], [.42, .22, 0]));
  if (isRifle) { // left hand under handguard
    root.kids.push(gbox(m.glove, [-.01, -.03, -.3], [.07, .06, .1]));
    root.kids.push(gbox(m.body, [-.11, -.12, -.17], [.085, .085, .36], [.38, -.62, 0]));
  } else if (!isNade && k !== 'knife') {
    root.kids.push(gbox(m.glove, [-.025, -.07, .02], [.06, .07, .09]));
    root.kids.push(gbox(m.body, [-.12, -.15, .18], [.085, .085, .34], [.42, -.32, 0]));
  }
  return root;
}

// ---------- entity ----------
const NAMES = { T: ['Vortex', 'Kilo', 'Saber', 'Jinx', 'Moth', 'Rook'], CT: ['Halberd', 'Nova', 'Ridge', 'Specter', 'Wren', 'Cobalt'] };
let ENTS = [], PLAYER = null;
function newWeapon(k) { const d = W[k]; return { k, d, mag: d.mag || 0, res: d.res || 0 }; }
function makeEnt(name, team, isPlayer) {
  const e = {
    id: ENTS.length, name, team, isPlayer, bot: !isPlayer, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0,
    hp: 100, armor: 0, helmet: false, alive: true, money: 800, slots: { 1: null, 2: newWeapon('p9'), 3: newWeapon('knife'), 4: [] }, cur: 2, last: 3,
    cool: 0, reloadT: 0, switchT: 0, crouch: 0, onGround: true, kills: 0, deaths: 0, assists: 0, dmgTaken: {}, hasBomb: false, kit: false,
    recoil: 0, punchP: 0, punchY: 0, rseed: Math.random() * 10, stepAcc: 0, phase: 0, deadT: 0, spotT: -9, scope: 0, eyeOff: 0, plantT: 0, defT: 0,
    flash: 0, mvp: 0, lastHurt: -9, roundDmg: 0,
  };
  e.model = buildChar(team); e.gunKey = null;
  return e;
}
function curW(e) { return e.cur === 4 ? (e.slots[4][0] ? { k: e.slots[4][0], d: W[e.slots[4][0]], mag: 1, res: 0 } : null) : e.slots[e.cur]; }
function eyeH(e) { return 1.62 - .5 * e.crouch; }
function dirFrom(yaw, pitch) { const cp = Math.cos(pitch); return [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp]; }
function setSlot(e, s) {
  if (e === PLAYER && remoteAction('slot', s)) return;
  if (s === e.cur || !(s >= 1 && s <= 4)) return;
  if (s === 1 && !e.slots[1]) return; if (s === 4 && !e.slots[4].length) return;
  if (e.cur >= 1 && e.cur <= 4) e.last = e.cur; e.cur = s; e.switchT = s === 3 ? .3 : .55; e.reloadT = 0; e.scope = 0; e.recoil = 0;
  if (e === CAMSRC) { vmRebuild(); sfx.deploy(); }
}
function bestSlot(e) { if (e.slots[1] && (e.slots[1].mag + e.slots[1].res) > 0) return 1; if (e.slots[2] && (e.slots[2].mag + e.slots[2].res) > 0) return 2; return 3; }
function startReload(e) {
  if (e === PLAYER && remoteAction('reload')) return;
  const w = curW(e); if (!w || !w.d.mag || w.mag >= w.d.mag || w.res <= 0 || e.reloadT > 0) return;
  e.reloadT = w.d.reload; e.scope = 0; e.recoil = 0;
  if (e.isPlayer) sfx.reload(); else sfx.reload(e);
}
function finishReload(e) { const w = curW(e); if (!w) return; const take = Math.min(w.d.mag - w.mag, w.res); w.mag += take; w.res -= take; }

// ---------- physics ----------
function physics(e, dt, wx, wz, spd) {
  const acc = e.onGround ? 46 : 9;
  const tx = wx * spd, tz = wz * spd;
  if (e.onGround || wx || wz) {
    let dvx = tx - e.vx, dvz = tz - e.vz; const dl = Math.hypot(dvx, dvz), st = acc * dt;
    if (!e.onGround) { // air: only steer
      if (dl > 0) { e.vx += dvx / dl * Math.min(st, dl); e.vz += dvz / dl * Math.min(st, dl); }
    } else if (dl <= st) { e.vx = tx; e.vz = tz; } else { e.vx += dvx / dl * st; e.vz += dvz / dl * st; }
  }
  const mx = e.vx * dt, mz = e.vz * dt;
  if (!blockedAt(e.x + mx, e.z, e.y)) e.x += mx; else e.vx = 0;
  if (!blockedAt(e.x, e.z + mz, e.y)) e.z += mz; else e.vz = 0;
  const g = groundAt(e.x, e.z, e.y);
  if (e.y > g + .001 || e.vy > 0) {
    e.vy -= 20 * dt; e.y += e.vy * dt;
    if (e.y <= g) { if (g - e.y > .05 && e.isPlayer) e.eyeOff -= (g - e.y); if (e.vy < -7 && e.isPlayer) sfx.land(); e.y = g; e.vy = 0; e.onGround = true; }
    else e.onGround = false;
  } else {
    if (g > e.y + .01 && e.isPlayer) e.eyeOff -= (g - e.y);
    e.y = g; e.vy = 0; e.onGround = true;
  }
  // footsteps
  const hs = Math.hypot(e.vx, e.vz);
  if (e.onGround && hs > 3.3 && e.crouch < .5) { e.stepAcc += hs * dt; if (e.stepAcc > 2.4) { e.stepAcc = 0; sfx.step(e); } }
}
function separate() {
  for (let a = 0; a < ENTS.length; a++) {
    const A = ENTS[a]; if (!A.alive) continue;
    for (let b = a + 1; b < ENTS.length; b++) {
      const B = ENTS[b]; if (!B.alive) continue;
      const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz);
      if (d < .72 && d > 1e-4 && Math.abs(A.y - B.y) < 1.7) {
        const push = (.72 - d) / 2, nx = dx / d, nz = dz / d;
        if (!blockedAt(A.x - nx * push, A.z - nz * push, A.y)) { A.x -= nx * push; A.z -= nz * push; }
        if (!blockedAt(B.x + nx * push, B.z + nz * push, B.y)) { B.x += nx * push; B.z += nz * push; }
      }
    }
  }
}

// ---------- hit detection ----------
const HB = [{ p: 'head' }, { p: 'body' }, { p: 'legs' }];
function hitboxes(e) {
  const c = e.crouch, eh = eyeH(e);
  Object.assign(HB[0], { cx: e.x, cy: e.y + eh + .05, cz: e.z, hx: .15, hy: .16, hz: .15 });
  Object.assign(HB[1], { cx: e.x, cy: e.y + 1.2 - .42 * c, cz: e.z, hx: .28, hy: .36 - .02 * c, hz: .28 });
  Object.assign(HB[2], { cx: e.x, cy: e.y + (.42 - .12 * c), cz: e.z, hx: .24, hy: .42 - .14 * c, hz: .24 });
  return HB;
}
function rayBox(ox, oy, oz, dx, dy, dz, b) {
  let t0 = -1e9, t1 = 1e9;
  const ax = [[ox, dx, b.cx, b.hx], [oy, dy, b.cy, b.hy], [oz, dz, b.cz, b.hz]];
  for (const [o, d, c, h] of ax) {
    if (Math.abs(d) < 1e-9) { if (o < c - h || o > c + h) return -1; continue; }
    let a = (c - h - o) / d, bb = (c + h - o) / d; if (a > bb) [a, bb] = [bb, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, bb); if (t0 > t1) return -1;
  }
  return t0 >= 0 ? t0 : (t1 >= 0 ? 0 : -1);
}
function traceChars(shooter, ox, oy, oz, dx, dy, dz, maxT) {
  let best = null, bt = maxT;
  for (const e of ENTS) {
    if (e === shooter || !e.alive) continue;
    const ddx = e.x - ox, ddz = e.z - oz; const along = ddx * dx + ddz * dz; if (along < -1) continue;
    const perp2 = ddx * ddx + ddz * ddz - along * along / Math.max(dx * dx + dz * dz, 1e-6); if (perp2 > 1.2) continue;
    for (const b of hitboxes(e)) { const t = rayBox(ox, oy, oz, dx, dy, dz, b); if (t >= 0 && t < bt) { bt = t; best = { e, part: b.p, t }; } }
  }
  return best;
}

// ---------- firing ----------
function fire(e, alt = false) {
  const w = curW(e); if (!w) return false; const d = w.d;
  if (e.cool > 0 || e.reloadT > 0 || e.switchT > 0) return false;
  if (d.melee) return melee(e, alt);
  if (d.nade) return throwNade(e, alt);
  if (w.mag <= 0) { sfx.click(e); e.cool = .3; if (w.res > 0) startReload(e); return false; }
  w.mag--; e.cool = d.rate; e.lastShot = GAME.now; e.prot = 0;
  const ox = e.x, oy = e.y + eyeH(e), oz = e.z;
  const yaw = e.yaw + e.punchY, pitch = e.pitch + e.punchP;
  const hs = Math.hypot(e.vx, e.vz);
  let spread = d.spread + d.moveSpread * clamp((hs - 1.2) / 4, 0, 1) + (e.onGround ? 0 : .14) + Math.min(e.recoil, 12) * d.recoil * .22;
  if (d.scope && !e.scope) spread += d.unscoped;
  spread *= 1 - .3 * e.crouch;
  if (e.bot) spread += e.ai.xs || 0;
  const [fx, fy, fz] = dirFrom(yaw, pitch);
  const rx = Math.cos(yaw), rz = -Math.sin(yaw); // right vector
  const ux = Math.sin(yaw) * Math.sin(pitch), uy = Math.cos(pitch), uz = Math.cos(yaw) * Math.sin(pitch);
  // a shotgun fires a cone of pellets; its spread is the cone, not inaccuracy
  for (let p = 0; p < (d.pellets || 1); p++) {
    const a = Math.random() * TAU, r = d.pellets ? Math.sqrt(Math.random()) * (d.spread + spread * .3) : (Math.random() + Math.random()) * .5 * spread;
    let dx = fx + (rx * Math.cos(a) + ux * Math.sin(a)) * r, dy = fy + uy * Math.sin(a) * r, dz = fz + (rz * Math.cos(a) + uz * Math.sin(a)) * r;
    const L = Math.hypot(dx, dy, dz); dx /= L; dy /= L; dz /= L;
    if (d.rocket) launchRocket(e, ox + dx * .5, oy + dy * .5, oz + dz * .5, dx, dy, dz);
    else traceShot(e, ox, oy, oz, dx, dy, dz, d, w.k, p > 2);
  }
  e.recoil += 1;
  const rk = d.recoil * (e.isPlayer ? 1 : .6);
  e.punchP = Math.min(e.punchP + rk * (1 + Math.min(e.recoil, 9) * .09), .32);
  e.punchY += rk * .8 * Math.sin(e.recoil * .55 + e.rseed) * (e.recoil > 3 ? 1 : .25);
  fxMuzzle(e); sfx.shot(d.snd, e); noiseEvent(e, d.snd === 'sniper' || d.snd === 'lmg' ? 70 : 45);
  if (e.isPlayer) { VM.kick += d.recoil * 6 + .02; if (d.scope && e.scope) { e.rescope = e.scope; e.scope = 0; } }
  if (w.mag === 0 && w.res > 0 && e.bot) startReload(e);
  return true;
}
function traceShot(e, ox, oy, oz, dx, dy, dz, d, wk, quiet = false) {
  const hw = rayGrid(ox, oy, oz, dx, dy, dz, 220); const wallT = hw.t, wx = hw.x, wy = hw.y, wz = hw.z, n = [hw.nx, hw.ny, hw.nz], wtype = hw.type;
  const hc = traceChars(e, ox, oy, oz, dx, dy, dz, wallT);
  let endX = wx, endY = wy, endZ = wz;
  if (hc) {
    endX = ox + dx * hc.t; endY = oy + dy * hc.t; endZ = oz + dz * hc.t;
    const mult = hc.part === 'head' ? 4 : hc.part === 'legs' ? .75 : 1;
    const dmg = d.dmg * mult * Math.pow(d.fall || .95, hc.t / 10);
    fxBlood(endX, endY, endZ, dx, dy, dz, hc.part === 'head');
    damage(hc.e, dmg, e, wk, hc.part === 'head', d.armor);
  } else if (wtype >= 0) {
    fxImpact(wx, wy, wz, n, wtype);
  }
  if (!quiet && (!e.isPlayer || Math.random() < .5)) fxTracer(e, endX, endY, endZ);
}
function melee(e, alt) {
  const ox = e.x, oy = e.y + eyeH(e), oz = e.z; const [dx, dy, dz] = dirFrom(e.yaw, e.pitch);
  e.cool = alt ? 1.0 : .5; if (e.isPlayer) VM.swing = 1; sfx.knife(e);
  const hw = rayGrid(ox, oy, oz, dx, dy, dz, 2.0);
  const hc = traceChars(e, ox, oy, oz, dx, dy, dz, Math.min(hw.t, 2.0));
  if (hc) {
    let dmg = alt ? 70 : 40;
    const fwd = dirFrom(hc.e.yaw, 0); if (fwd[0] * dx + fwd[2] * dz > .5) dmg = alt ? 180 : 90; // backstab
    fxBlood(ox + dx * hc.t, oy + dy * hc.t, oz + dz * hc.t, dx, dy, dz, false);
    damage(hc.e, dmg, e, 'knife', false, 1);
    return true;
  }
  if (hw.t < 2.0) { fxImpact(hw.x, hw.y, hw.z, [hw.nx, hw.ny, hw.nz], hw.type, true); sfx.knifeHit(e); }
  return true;
}

function damage(v, amount, att, wk, head, armorRatio = .5) {
  if (!v.alive) return;
  if (att && att !== v && att.team === v.team && wk !== 'bomb') return; // no friendly fire
  if (v.prot > GAME.now && wk !== 'bomb') return; // fresh respawn
  let dmg = amount;
  if (v.armor > 0 && (!head || v.helmet) && wk !== 'knife' && wk !== 'fall') {
    const kept = dmg * armorRatio; v.armor = Math.max(0, v.armor - (dmg - kept) * .5); dmg = kept;
    if (v.armor <= 0) v.helmet = false;
  }
  dmg = Math.round(dmg);
  v.hp -= dmg; v.lastHurt = GAME.now;
  if (att && att !== v) { v.dmgTaken[att.id] = (v.dmgTaken[att.id] || 0) + Math.min(dmg, v.hp + dmg); att.roundDmg += Math.min(dmg, v.hp + dmg); }
  if (v.isPlayer) uiHurt(dmg, att);
  if (att && att.isPlayer && att !== v) { uiHitmarker(v.hp <= 0, head); sfx.hit(head); }
  else if (head && v.isPlayer) sfx.hit(true);
  if (v.bot && att && att !== v) aiOnDamaged(v, att);
  if (v.hp <= 0) kill(v, att, wk, head);
}
function kill(v, att, wk, head) {
  v.hp = 0; v.alive = false; v.deaths++; v.deadT = 0; v.fallDir = Math.random() < .5 ? 1 : -1; v.fallAxis = Math.random() < .6 ? 0 : 2;
  v.plantT = 0; v.defT = 0; v.scope = 0;
  if (att && att !== v && att.team !== v.team) {
    att.kills++; att.money = Math.min(16000, att.money + (W[wk] ? W[wk].kill || 300 : 300));
    for (const [id, dm] of Object.entries(v.dmgTaken)) { const a = ENTS[id]; if (a && a !== att && a.team !== v.team && dm >= 40) a.assists++; }
  }
  if (v.hasBomb) dropBomb(v);
  if (GAME.bomb.defuser === v) GAME.bomb.defuser = null;
  uiFeed(att, v, wk, head);
  sfx.death(v);
  const R = rules();
  if (v.isPlayer) { PLAYER.specT = R.rounds ? 2.2 : 99; uiDeath(att); }
  if (R.rounds) { checkRoundEnd(); return; }
  if (!att || att === v || att.team === v.team || GAME.phase !== 'live') return;
  GAME.score[att.team]++;
  if (R.ladder) {
    if (wk === 'knife' && v.gg > 0 && att.gg < GAME.ladder.length - 1) v.gg--; // a knife kill steals a level
    att.gg = (att.gg || 0) + 1;
    if (att.gg >= GAME.ladder.length) return finishMatch(att.team, 'ladder', att);
    if (att.alive) { giveLevel(att); if (att.isPlayer) uiMsg('Level ' + (att.gg + 1) + ' · ' + W[GAME.ladder[att.gg]].name, 1.6); }
  } else if (GAME.score[att.team] >= GAME.goal || GAME.sudden) finishMatch(att.team, GAME.sudden ? 'timeup' : 'kills');
}

// ===================== BOT AI =====================
const DIFF = {
  easy: { react: .7, err: .085, turn: 4.5, head: .08, track: .9, fov: 1.75, comp: .2, spray: 4 },
  normal: { react: .4, err: .05, turn: 7.5, head: .22, track: 1.6, fov: 2.1, comp: .5, spray: 6 },
  hard: { react: .22, err: .028, turn: 12, head: .42, track: 2.6, fov: 2.4, comp: .8, spray: 9 },
};
let NOISES = [];
function noiseEvent(e, radius) { NOISES.push({ x: e.x, z: e.z, team: e.team, t: GAME.now, r: radius, src: e }); if (NOISES.length > 40) NOISES.shift(); }
function aiInit(b) {
  b.ai = { path: [], pi: 0, goal: null, goalKey: '', target: null, visible: false, seen: -9, react: 0, track: 0, errX: 0, errY: 0, errT: 0, burst: 0, pause: 0,
    strafe: 0, strafeT: 0, think: rand(0, .2), mode: 'move', holdLook: null, lookAt: null, lookT: 0, stuckT: 0, lx: b.x, lz: b.z, repath: 0, aimHead: false, xs: 0,
    role: '', spot: null, scan: 0, crouchHold: false, waitT: 0, sideT: 0, nade: null, nadeCd: rand(4, 10), smoked: false };
}
// ---------- bot grenades ----------
// Pitch that lands a normal throw (dirFrom(pitch + .1) * 16, +1.6 up, gravity 18) closest to distance d.
function throwPitch(d, dy = 0) {
  let best = 0, err = 1e9;
  for (let p = -.5; p <= 1.1; p += .02) {
    const a = p + .1, vx = Math.cos(a) * 16, vy = Math.sin(a) * 16 + 1.6, y0 = 1.47 - dy;
    const t = (vy + Math.sqrt(vy * vy + 36 * y0)) / 18, range = vx * t;
    if (Math.abs(range - d) < err) { err = Math.abs(range - d); best = p; }
  }
  return best;
}
// Decide whether a bot throws something now: frags at enemies in sight, flashes before peeking,
// smoke onto the defenders' side when attackers execute, fire on a planted bomb or a held corner.
function aiPlanNade(b) {
  const ai = b.ai, nades = b.slots[4];
  if (ai.nade || ai.nadeCd > 0 || !nades.length || GAME.phase !== 'live' || b.reloadT > 0 || b.flash > .3) return;
  const has = k => nades.includes(k), plan = (k, x, z, look) => { ai.nade = { k, x, z, t: GAME.now, look }; };
  const t = ai.target, now = GAME.now, bomb = GAME.bomb;
  if (t && ai.visible) {
    const d = Math.hypot(t.x - b.x, t.z - b.z);
    if (has('he') && d > 8 && d < 24 && Math.random() < .06) return plan('he', t.x, t.z);
    if (has('molly') && d > 7 && d < 20 && Math.random() < .025) return plan('molly', t.x, t.z);
    return;
  }
  if (ai.lastKnown && now - ai.seen < 4) {
    const d = Math.hypot(ai.lastKnown.x - b.x, ai.lastKnown.z - b.z);
    if (has('flash') && d > 6 && d < 18 && Math.random() < .08) return plan('flash', ai.lastKnown.x, ai.lastKnown.z, true);
    if (has('he') && d > 8 && d < 22 && Math.random() < .03) return plan('he', ai.lastKnown.x, ai.lastKnown.z);
  }
  if (rules().bomb && b.team === 'T' && has('smoke') && !ai.smoked && ai.spot && ai.role === 'push') {
    const d = Math.hypot(ai.spot[0] - b.x, ai.spot[1] - b.z);
    if (d < 18 && d > 7) { // smoke between the site and where the defenders come from
      const ct = G.def.spawns.CT, cx = cellCenter(ct[0] + ct[2] / 2), cz = cellCenter(ct[1] + ct[3] / 2), k = 6 / Math.max(1, Math.hypot(cx - ai.spot[0], cz - ai.spot[1]));
      ai.smoked = true; return plan('smoke', ai.spot[0] + (cx - ai.spot[0]) * k, ai.spot[1] + (cz - ai.spot[1]) * k);
    }
  }
  if (bomb.state === 'planted' && b.team === 'CT' && has('molly')) {
    const d = Math.hypot(bomb.x - b.x, bomb.z - b.z);
    if (d > 7 && d < 20 && Math.random() < .05) return plan('molly', bomb.x, bomb.z);
  }
  if (bomb.state === 'planted' && b.team === 'CT' && has('smoke') && !ai.smoked) {
    const d = Math.hypot(bomb.x - b.x, bomb.z - b.z);
    if (d > 9 && d < 22) { ai.smoked = true; return plan('smoke', (bomb.x + b.x) / 2, (bomb.z + b.z) / 2); }
  }
}
// Carry out a planned throw: pull the grenade, face the spot, throw, then (for a flash) look away.
// Returns the yaw/pitch to use, or null when there is nothing to do.
function aiDoNade(b) {
  const ai = b.ai, n = ai.nade;
  if (!n) return null;
  if (GAME.now - n.t > 3 || !b.slots[4].includes(n.k) || GAME.phase !== 'live') { ai.nade = null; ai.nadeCd = rand(3, 6); if (b.cur === 4) setSlot(b, bestSlot(b)); return null; }
  if (b.slots[4][0] !== n.k) { b.slots[4].splice(b.slots[4].indexOf(n.k), 1); b.slots[4].unshift(n.k); }
  if (b.cur !== 4) setSlot(b, 4);
  const d = Math.hypot(n.x - b.x, n.z - b.z), yaw = yawTo(b.x, b.z, n.x, n.z), pitch = throwPitch(d);
  if (b.switchT <= 0 && b.cool <= 0 && Math.abs(angDiff(b.yaw, yaw)) < .08 && Math.abs(b.pitch - pitch) < .08) {
    fire(b);
    ai.nade = null; ai.nadeCd = rand(8, 16);
    if (n.look) { ai.lookAt = { x: b.x * 2 - n.x, z: b.z * 2 - n.z }; ai.lookT = 1.6; } // don't watch your own flash
  }
  return { yaw, pitch };
}
function aiOnDamaged(b, att) {
  const ai = b.ai; if (!ai) return;
  if (!ai.visible) { ai.lookAt = { x: att.x, z: att.z }; ai.lookT = 1.8; ai.react = Math.min(ai.react, DIFF[GAME.diff].react * .5); }
}
function aiPlanRound() {
  if (!rules().rounds) { for (const b of ENTS) if (b.bot) aiInit(b); return; }
  const site = Math.random() < .5 ? 'A' : 'B'; GAME.tSite = site;
  const ts = ENTS.filter(e => e.team === 'T' && e.bot), cts = ENTS.filter(e => e.team === 'CT' && e.bot);
  const def = G.def; const tsp = def.spawns.T, csp = def.spawns.CT;
  const tC = [cellCenter(tsp[0] + tsp[2] / 2), cellCenter(tsp[1] + tsp[3] / 2)], cC = [cellCenter(csp[0] + csp[2] / 2), cellCenter(csp[1] + csp[3] / 2)];
  ts.forEach((b, i) => {
    aiInit(b); const lurk = i === ts.length - 1 && ts.length > 2 && Math.random() < .5;
    const s = lurk ? (site === 'A' ? 'B' : 'A') : site; b.ai.site = s;
    const cell = pick(G.siteCells[s]); b.ai.spot = [cellCenter(cell[0]), cellCenter(cell[1])]; b.ai.role = lurk ? 'lurk' : 'push';
    b.ai.waitT = lurk ? rand(8, 20) : rand(0, 4);
    b.ai.holdLook = lookToward(cell, cC);
  });
  const order = ['A', 'B', 'A', 'B', 'mid'];
  cts.forEach((b, i) => {
    aiInit(b); const s = order[i % order.length]; let cell;
    if (s === 'mid') { const mids = []; for (let j = Math.floor(G.H * .3); j < G.H * .55; j++) for (let k = Math.floor(G.W * .35); k < G.W * .65; k++) if (walkable(k, j)) mids.push([k, j]); cell = mids.length ? pick(mids) : pick(G.siteCells.A); }
    else cell = pick(G.siteCells[s]);
    b.ai.site = s; b.ai.spot = [cellCenter(cell[0]), cellCenter(cell[1])]; b.ai.role = 'hold';
    b.ai.holdLook = lookToward(cell, tC); b.ai.crouchHold = Math.random() < .3;
  });
}
function lookToward(cell, to) {
  const p = astar(cell[0], cell[1], cellOf(to[0]), cellOf(to[1]));
  const k = p[Math.min(5, p.length - 1)] || [cellOf(to[0]), cellOf(to[1])];
  return Math.atan2(-(cellCenter(k[0]) - cellCenter(cell[0])), -(cellCenter(k[1]) - cellCenter(cell[1])));
}
function yawTo(fx, fz, tx, tz) { return Math.atan2(-(tx - fx), -(tz - fz)); }
function setGoal(b, x, z, key) {
  const ai = b.ai; if (ai.goalKey === key && ai.path.length && ai.repath > 0) return;
  ai.goalKey = key; ai.goal = { x, z }; ai.path = astar(cellOf(b.x), cellOf(b.z), cellOf(x), cellOf(z)); ai.pi = 0; ai.repath = 3;
  if (ai.path.length) { const last = ai.path[ai.path.length - 1]; ai.path[ai.path.length - 1] = [last[0], last[1], x, z]; }
}

function aiThink(b) {
  const ai = b.ai, D = DIFF[GAME.diff];
  // ---- vision ----
  let best = null, bd = 1e9; const ex = b.x, ey = b.y + eyeH(b), ez = b.z;
  for (const e of b.flash > .5 ? [] : ENTS) {
    if (e.team === b.team || !e.alive) continue;
    const dx = e.x - ex, dz = e.z - ez, dist = Math.hypot(dx, dz); if (dist > 90) continue;
    const ang = Math.abs(angDiff(b.yaw, yawTo(ex, ez, e.x, e.z)));
    const tracking = ai.target === e && GAME.now - ai.seen < 1;
    if (ang > D.fov / 2 && !tracking && dist > 2.5) continue;
    const hy = e.y + eyeH(e), cy = e.y + 1.1 - .4 * e.crouch;
    if (los(ex, ey, ez, e.x, hy, e.z) || los(ex, ey, ez, e.x, cy, e.z)) {
      let score = dist; if (ai.target === e) score *= .6;
      if (score < bd) { bd = score; best = e; }
      if (PLAYER && b.team === PLAYER.team) e.spotT = GAME.now;
    }
  }
  if (best) {
    if (ai.target !== best || !ai.visible) {
      const fresh = ai.target !== best || GAME.now - ai.seen > 1.5;
      ai.target = best; if (fresh) { ai.react = D.react * rand(.75, 1.35) * (ai.holding ? .65 : 1) + (Math.abs(angDiff(b.yaw, yawTo(b.x, b.z, best.x, best.z))) > 1 ? .15 : 0); ai.track = 0; aiErr(b, true); }
      ai.aimHead = Math.random() < D.head;
    }
    ai.visible = true; ai.seen = GAME.now; ai.lastKnown = { x: best.x, z: best.z };
    if (b.team === 'CT') { const ns = nearSite(best); if (ns && (!GAME.ctCall || GAME.now - GAME.ctCall.t > 6)) GAME.ctCall = { site: ns, t: GAME.now }; }
  } else {
    ai.visible = false;
    if (ai.target && (GAME.now - ai.seen > 3 || !ai.target.alive)) ai.target = null;
  }
  // ---- hearing ----
  if (!ai.visible) {
    for (let k = NOISES.length - 1; k >= 0; k--) {
      const n = NOISES[k]; if (GAME.now - n.t > .6) break; if (n.team === b.team) continue;
      const d = Math.hypot(n.x - b.x, n.z - b.z); if (d < n.r && d > 2) { ai.lookAt = { x: n.x, z: n.z }; ai.lookT = 1.5; break; }
    }
  }
  // ---- weapon management ----
  const w = curW(b);
  if (!ai.nade && b.cur !== bestSlot(b) && b.reloadT <= 0 && (!ai.visible || !w || (w.mag === 0 && w.res === 0))) setSlot(b, bestSlot(b));
  if (!ai.visible && w && w.d.mag && w.mag < w.d.mag * .45 && w.res > 0 && GAME.now - ai.seen > 1.2) startReload(b);
  // ---- grenades ----
  aiPlanNade(b);
  // ---- objective ----
  aiObjective(b);
}
function nearSite(e) { for (const [s, r] of Object.entries(G.def.sites)) { const cx = (r[0] + r[2] / 2) * CELL, cz = (r[1] + r[3] / 2) * CELL; if (Math.hypot(e.x - cx, e.z - cz) < 16) return s; } return null; }
function aiErr(b, big) { const D = DIFF[GAME.diff]; const ai = b.ai; const k = big ? 1.4 : 1; ai.errX = (Math.random() * 2 - 1) * D.err * k; ai.errY = (Math.random() * 2 - 1) * D.err * .7 * k; ai.errT = rand(.25, .5); }

function aiHunt(b) {
  const ai = b.ai;
  if (!ai.hunt || GAME.now > ai.huntT || Math.hypot(b.x - ai.hunt[0], b.z - ai.hunt[1]) < 2.5) {
    const foes = ENTS.filter(e => e.alive && e.team !== b.team);
    let t = ai.lastKnown && GAME.now - ai.seen < 6 ? ai.lastKnown : null;
    // bots roughly know where the fight is, like players hearing it; they do not get exact positions
    if (!t && foes.length && Math.random() < .8) { const f = pick(foes); t = { x: f.x + rand(-6, 6), z: f.z + rand(-6, 6) }; }
    if (!t) { const c = pick(G.open); t = { x: cellCenter(c[0]), z: cellCenter(c[1]) }; }
    ai.hunt = [t.x, t.z]; ai.huntT = GAME.now + rand(3, 6);
  }
  setGoal(b, ai.hunt[0], ai.hunt[1], 'hunt' + ai.huntT);
}
function aiObjective(b) {
  const ai = b.ai, bomb = GAME.bomb; ai.action = null;
  if (GAME.phase !== 'live') return;
  if (!rules().bomb) {
    // elimination opens like a normal round, then everyone goes looking
    if (rules().rounds && GAME.roundT > GAME.roundLen - 35 && ai.spot) { setGoal(b, ai.spot[0], ai.spot[1], 'spot'); return; }
    return aiHunt(b);
  }
  if (b.team === 'T') {
    if (bomb.state === 'dropped') {
      const ts = ENTS.filter(e => e.team === 'T' && e.alive && e.bot); let nb = null, nd = 1e9;
      for (const t of ts) { const d = Math.hypot(t.x - bomb.x, t.z - bomb.z); if (d < nd) { nd = d; nb = t; } }
      if (nb === b) { setGoal(b, bomb.x, bomb.z, 'bomb'); return; }
    }
    if (bomb.state === 'planted') {
      if (!ai.guard) { const near = G.siteCells[bomb.site].filter(c => Math.hypot(cellCenter(c[0]) - bomb.x, cellCenter(c[1]) - bomb.z) < 9); const c = pick(near.length ? near : G.siteCells[bomb.site]); ai.guard = [cellCenter(c[0]), cellCenter(c[1])]; }
      setGoal(b, ai.guard[0], ai.guard[1], 'guard'); return;
    }
    if (b.hasBomb) {
      if (siteAt(b.x, b.z) && !ai.visible && ai.path.length && ai.pi >= ai.path.length) { ai.action = 'plant'; return; }
      if (siteAt(b.x, b.z) && !ai.visible && Math.hypot(b.x - ai.spot[0], b.z - ai.spot[1]) < 2) { ai.action = 'plant'; return; }
      setGoal(b, ai.spot[0], ai.spot[1], 'spot'); return;
    }
    if (ai.waitT > 0 && GAME.roundT > 30) return;
    // follow the carrier's site when near time-out
    if (GAME.roundT < 35) { const c = ENTS.find(e => e.hasBomb); if (c && c.bot && c.ai && c.ai.site !== ai.site) { ai.site = c.ai.site; const cell = pick(G.siteCells[ai.site]); ai.spot = [cellCenter(cell[0]), cellCenter(cell[1])]; } }
    setGoal(b, ai.spot[0], ai.spot[1], 'spot');
  } else {
    if (bomb.state === 'planted') {
      const d = Math.hypot(b.x - bomb.x, b.z - bomb.z);
      if (d < 1.4 && !ai.visible && (!bomb.defuser || bomb.defuser === b)) { ai.action = 'defuse'; return; }
      setGoal(b, bomb.x, bomb.z, 'bomb'); return;
    }
    // rotate toward a site where teammates spotted Ts
    const call = GAME.ctCall;
    if (call && GAME.now - call.t < 25 && ai.callT !== call.t) {
      ai.callT = call.t;
      if (ai.site !== call.site && Math.random() < .65) { ai.site = call.site; const cell = pick(G.siteCells[call.site]); ai.spot = [cellCenter(cell[0]), cellCenter(cell[1])]; const ts = G.def.spawns.T; ai.holdLook = lookToward(cell, [cellCenter(ts[0] + ts[2] / 2), cellCenter(ts[1] + ts[3] / 2)]); }
    }
    setGoal(b, ai.spot[0], ai.spot[1], 'spot');
  }
}

function aiUpdate(b, dt) {
  const ai = b.ai, D = DIFF[GAME.diff];
  ai.think -= dt; ai.repath -= dt; ai.lookT -= dt; ai.errT -= dt; ai.strafeT -= dt; ai.waitT -= dt; ai.nadeCd -= dt;
  if (ai.think <= 0) { ai.think = .1 + Math.random() * .08; aiThink(b); }
  let wx = 0, wz = 0, spd = 6.1 * ((curW(b) && curW(b).d.speed) || 1), wantYaw = null, wantPitch = 0, crouch = false;
  const frozen = GAME.phase === 'freeze';
  const t = ai.target;
  // planting / defusing
  b.planting = ai.action === 'plant' && b.hasBomb; b.defusing = ai.action === 'defuse';
  if (b.planting || b.defusing) { spd = 0; crouch = true; }
  if (t && t.alive && ai.visible && !frozen) {
    ai.track += dt; ai.react -= dt; if (ai.errT <= 0) aiErr(b, false);
    const decay = Math.exp(-ai.track * D.track);
    const w0 = curW(b);
    const aimY = w0?.d.rocket ? t.y + .3 : ai.aimHead ? t.y + eyeH(t) + .03 : t.y + 1.15 - .4 * t.crouch; // rockets at the feet: the blast does the rest
    const ex = b.x, ey = b.y + eyeH(b), ez = b.z; const dist = Math.hypot(t.x - ex, t.z - ez);
    // lead slightly for moving targets
    const lead = .05; const tx = t.x + t.vx * lead, tz = t.z + t.vz * lead;
    wantYaw = yawTo(ex, ez, tx, tz) + ai.errX * decay - b.punchY * D.comp;
    wantPitch = Math.atan2(aimY - ey, dist) + ai.errY * decay - b.punchP * D.comp;
    ai.xs = (1 - D.track / 3) * .01 * decay;
    const w = curW(b);
    // movement in combat
    if (w && w.d.rocket && dist < 6 && b.slots[2]) setSlot(b, 2); // too close for a rocket
    if (w && (w.d.melee || (w.d.pellets && dist > 9))) { wx = (t.x - b.x) / dist; wz = (t.z - b.z) / dist; }
    else {
      if (ai.strafeT <= 0) { ai.strafe = Math.random() < (dist < 12 ? .7 : .35) * (ai.holding ? .35 : 1) ? (Math.random() < .5 ? -1 : 1) : 0; ai.strafeT = rand(.25, .7); }
      const fw = dirFrom(b.yaw, 0); const rx = -fw[2], rz = fw[0];
      if (ai.strafe && !(w && w.d.auto && ai.burst > 0 && dist > 10)) { wx = rx * ai.strafe; wz = rz * ai.strafe; spd *= .8; }
      if (dist > 22 && D.head > .2 && w && w.d.auto) crouch = ai.burst > 0;
    }
    // fire control
    const aerr = Math.abs(angDiff(b.yaw, wantYaw)) + Math.abs(b.pitch - wantPitch);
    const tol = Math.max(.035, Math.atan2(.55, dist));
    if (ai.react <= 0 && w && !w.d.nade && b.reloadT <= 0 && b.switchT <= 0 && aerr < tol * 2.2) {
      if (w.d.melee) { if (dist < 1.9) fire(b, Math.random() < .3); }
      else if (w.d.auto) {
        if (ai.pause > 0) ai.pause -= dt;
        else { if (ai.burst <= 0) ai.burst = dist < 10 ? D.spray + 4 : rint(2, D.spray); if (fire(b)) { ai.burst--; if (ai.burst <= 0) ai.pause = dist < 10 ? rand(.05, .15) : rand(.18, .4); } }
      } else if (Math.random() < (w.d.scope ? .5 : .35)) fire(b);
    }
    if (w && w.mag === 0 && w.res === 0) setSlot(b, bestSlot(b));
  } else if (!frozen && !b.planting && !b.defusing) {
    // path following
    ai.holding = !(ai.path.length && ai.pi < ai.path.length);
    if (ai.path.length && ai.pi < ai.path.length && !(ai.waitT > 0 && b.team === 'T' && GAME.roundT > 30 && !b.hasBomb)) {
      while (ai.pi < ai.path.length - 1) { const n = ai.path[ai.pi + 1]; const nx = n[2] ?? cellCenter(n[0]), nz = n[3] ?? cellCenter(n[1]); if (canWalk(b.x, b.z, nx, nz)) ai.pi++; else break; }
      const n = ai.path[ai.pi]; const px = n[2] ?? cellCenter(n[0]), pz = n[3] ?? cellCenter(n[1]);
      const dx = px - b.x, dz = pz - b.z, d = Math.hypot(dx, dz);
      if (d < .5) ai.pi++; else { wx = dx / d; wz = dz / d; }
      wantYaw = yawTo(0, 0, dx, dz);
      // slow down & check corners near the goal
      if (ai.pi >= ai.path.length - 2 && b.team === 'CT' && GAME.bomb.state !== 'planted') spd *= .55;
      // stuck detection
      ai.stuckT += dt; if (ai.stuckT > 1) { if (Math.hypot(b.x - ai.lx, b.z - ai.lz) < .35 && (wx || wz)) { ai.repath = 0; ai.goalKey = ''; ai.sideT = .5; } ai.stuckT = 0; ai.lx = b.x; ai.lz = b.z; }
      if (ai.sideT > 0) { ai.sideT -= dt; const s = (b.id % 2 ? 1 : -1); const tx = -wz * s, tz = wx * s; wx = tx; wz = tz; }
    } else {
      // holding position
      ai.scan += dt;
      const base = ai.holdLook != null ? ai.holdLook : b.yaw;
      wantYaw = base + Math.sin(ai.scan * .7 + b.id) * .45;
      crouch = ai.crouchHold && b.team === 'CT';
    }
    if (ai.lookAt && ai.lookT > 0) wantYaw = yawTo(b.x, b.z, ai.lookAt.x, ai.lookAt.z);
    else if (ai.target && ai.lastKnown && GAME.now - ai.seen < 2.5) wantYaw = yawTo(b.x, b.z, ai.lastKnown.x, ai.lastKnown.z);
    if (wx || wz) { // walk silently when close to enemies on hard
      if (ai.lookAt && ai.lookT > 0) spd *= .7;
    }
    ai.burst = 0;
  }
  const burning = fireAt(b.x, b.z, b.y);
  if (burning && !frozen) { const dx = b.x - burning.x, dz = b.z - burning.z, l = Math.hypot(dx, dz) || 1; wx = dx / l; wz = dz / l; spd = 6.1; }
  if (frozen) { wx = wz = 0; }
  const throwAim = aiDoNade(b);
  if (throwAim) { wantYaw = throwAim.yaw; wantPitch = throwAim.pitch; }
  // turning
  if (wantYaw != null) { const dy = angDiff(b.yaw, wantYaw); const tr = D.turn * dt * (ai.visible ? 1 : .6); b.yaw += clamp(dy, -tr, tr) * (Math.abs(dy) < .3 && ai.visible ? .5 + .5 * Math.min(1, Math.abs(dy) / .3) : 1); }
  b.pitch += clamp(wantPitch - b.pitch, -D.turn * dt * .7, D.turn * dt * .7);
  b.crouch = lerp(b.crouch, crouch ? 1 : 0, Math.min(1, dt * 8));
  if (b.crouch > .5) spd *= .45;
  physics(b, dt, wx, wz, spd);
}

// ===================== GAME: rounds, bomb, grenades, effects, audio =====================
const GAME = { mode: 'menu', phase: 'freeze', phaseT: 0, roundT: 115, round: 0, score: { T: 0, CT: 0 }, loss: { T: 0, CT: 0 }, bomb: { state: 'none' }, now: 0, diff: 'normal', target: 8, attract: true, over: false, cfg: {} };
const ROUND_TIME = 115, BOMB_TIME = 40, FREEZE = 6, BUY_TIME = 20;
// rounds: buy phase and elimination rounds; otherwise one continuous fight with respawns.
const MODES = {
  bomb: { rounds: true, bomb: true, roundTime: ROUND_TIME },
  elim: { rounds: true, bomb: false, roundTime: 90 },
  tdm: { rounds: false, respawn: 3, time: 600 },
  gungame: { rounds: false, respawn: 2, time: 900, ladder: true },
};
const LADDERS = {
  short: ['kr47', 'wasp', 'sg12', 'dmr', 'hc50', 'knife'],
  full: ['m5', 'kr47', 'rocket', 'hmg', 'wasp', 'sg12', 'dmr', 'lb338', 'hc50', 'viper', 'p9', 'knife'],
};
const SPAWN_SHIELD = 2, TDM_BUY_TIME = 10;
function rules() { return MODES[GAME.rules] || MODES.bomb; }
function matchGoal(mode, target) { return mode === 'tdm' ? (target <= 5 ? 40 : 75) : mode === 'gungame' ? LADDERS[target <= 5 ? 'short' : 'full'].length : target; }
let NADES = [], PARTS = [], DECALS = [], TRACERS = [], DLIGHTS = [], decalDirty = true;
let BOMBNODE = null;

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function newMatch(cfg) {
  GAME.cfg = cfg; GAME.diff = cfg.diff || 'normal'; GAME.attract = !!cfg.attract; GAME.target = cfg.target || 8; GAME.over = false; GAME.statsSent = false;
  GAME.rules = MODES[cfg.mode] ? cfg.mode : 'bomb'; GAME.goal = matchGoal(GAME.rules, GAME.target); GAME.sudden = false;
  GAME.ladder = GAME.rules === 'gungame' ? LADDERS[GAME.target <= 5 ? 'short' : 'full'].slice() : null;
  if (G.key !== cfg.map) { buildWorld(cfg.map); setupLightMatrix(); }
  ENTS = []; PLAYER = null;
  const names = { T: shuffle(NAMES.T.slice()), CT: shuffle(NAMES.CT.slice()) };
  if (cfg.team) { PLAYER = makeEnt(cleanName(account?.name || nickStored() || 'You'), cfg.team, true); ENTS.push(PLAYER); }
  for (const tm of ['T', 'CT']) { while (ENTS.filter(e => e.team === tm).length < 5) { const e = makeEnt(names[tm].pop(), tm, false); e.id = ENTS.length; ENTS.push(e); aiInit(e); } }
  ENTS.forEach((e, i) => e.id = i);
  GAME.score = { T: 0, CT: 0 }; GAME.loss = { T: 0, CT: 0 }; GAME.round = 0; GAME.history = [];
  if (!BOMBNODE) BOMBNODE = buildGun('bomb');
  for (const peer of NET.peers.values()) { const e = ENTS[peer.id]; e.bot = false; e.remote = true; e.name = peer.name || ('Player ' + e.id); }
  startRound(true);
}
function startRound(first) {
  const R = rules();
  GAME.round++; GAME.phase = 'freeze'; GAME.phaseT = GAME.attract ? 2.5 : R.rounds ? FREEZE : 4;
  GAME.roundLen = R.rounds ? R.roundTime : R.time; GAME.roundT = GAME.roundLen;
  GAME.bomb = { state: R.bomb ? 'carried' : 'none', carrier: null, x: 0, y: 0, z: 0, timer: BOMB_TIME, beepT: 0, defuser: null, site: '' };
  GAME.ctCall = null; NADES = []; SMOKES = []; FIRES = []; PARTS = []; DECALS = []; TRACERS = []; DLIGHTS = []; NOISES = []; decalDirty = true;
  const def = G.def;
  for (const tm of ['T', 'CT']) {
    const cells = shuffle(rectCells(def.spawns[tm]));
    const other = def.spawns[tm === 'T' ? 'CT' : 'T']; const ox = cellCenter(other[0] + other[2] / 2), oz = cellCenter(other[1] + other[3] / 2);
    ENTS.filter(e => e.team === tm).forEach((e, i) => {
      const keep = e.alive && !first;
      if (!keep) { e.slots = { 1: null, 2: newWeapon('p9'), 3: newWeapon('knife'), 4: [] }; e.armor = 0; e.helmet = false; e.kit = false; }
      else { for (const s of [1, 2]) if (e.slots[s]) { const w = e.slots[s]; w.res = Math.max(w.res, w.d.res); w.mag = w.d.mag; } }
      if (first) e.money = 800;
      const c = cells[i % cells.length]; e.x = cellCenter(c[0]) + rand(-.4, .4); e.z = cellCenter(c[1]) + rand(-.4, .4); e.y = 0;
      e.vx = e.vy = e.vz = 0; e.hp = 100; e.alive = true; e.deadT = 0; e.crouch = 0; e.hasBomb = false; e.plantT = 0; e.defT = 0; e.scope = 0; e.dmgTaken = {}; e.roundDmg = 0;
      e.yaw = yawTo(e.x, e.z, ox, oz) + rand(-.3, .3); e.pitch = 0; e.punchP = e.punchY = 0; e.recoil = 0; e.cool = 0; e.reloadT = 0; e.switchT = 0; e.planting = e.defusing = false;
      e.cur = bestSlot(e); e.last = 3; e.model.r = [0, 0, 0]; e.flash = 0; e.prot = 0; e.spawnAt = GAME.now;
      if (!R.rounds) { e.gg = 0; e.pref = {}; giveLoadout(e); }
    });
  }
  if (R.bomb) { const ts = ENTS.filter(e => e.team === 'T'); const carrier = pick(ts); carrier.hasBomb = true; GAME.bomb.carrier = carrier; }
  if (R.rounds) for (const b of ENTS) if (b.bot) botBuy(b, first);
  aiPlanRound();
  if (PLAYER) { PLAYER.specT = 0; vmRebuild(); }
  uiRoundStart();
}
function botBuy(b, first) {
  const can = k => { const d = W[k] || GEAR[k]; return b.money >= d.price && (!d.team || d.team === b.team); };
  const buy = k => { if (can(k)) doBuy(b, k, true); };
  const rifle = b.team === 'T' ? 'kr47' : 'm5';
  if (first) { const r = Math.random(); if (r < .45) buy('kevlar'); else if (r < .7) buy('hc50'); return; }
  if (!b.slots[1]) {
    const hasSniper = ENTS.some(e => e.team === b.team && e.slots[1] && e.slots[1].k === 'lb338');
    const r = Math.random();
    if (!hasSniper && b.money >= 4750 + 1000 && r < .25) buy('lb338');
    else if (b.money >= 5200 + 1000 && r < .32) buy('hmg');
    else if (b.money >= 4200 + 1000 && r < .36) buy('rocket');
    else if (b.money >= 3900 + 1000 && r < .42) buy('dmr');
    else if (b.money >= W[rifle].price + 650) buy(rifle);
    else if (b.money >= 2350 + 650 && r < .5) buy('wasp');
    else if (b.money >= 1250 + 650 && r < .8) buy(Math.random() < .5 ? 'mpx' : 'sg12');
  }
  if (b.armor < 100 || !b.helmet) { if (b.money >= 1000) buy('helmet'); else if (b.money >= 650 && b.armor < 50) buy('kevlar'); }
  if (!b.slots[1] && b.money >= 700 && Math.random() < .5) buy('hc50');
  if (b.team === 'CT' && !b.kit && rules().bomb && b.money >= 400 && Math.random() < .6) buy('kit');
  // grenades with what is left: attackers like smokes and flashes, defenders fire
  const wish = b.team === 'T' ? ['smoke', 'flash', 'he', 'molly'] : ['flash', 'he', 'molly', 'smoke'];
  for (const k of wish) if (b.money >= W[k].price + 200 && Math.random() < .55) buy(k);
}
// Continuous modes: what a fighter carries after (re)spawning.
function giveLoadout(e) {
  e.slots = { 1: null, 2: newWeapon('p9'), 3: newWeapon('knife'), 4: [] }; e.armor = 100; e.helmet = true; e.kit = false; e.money = 16000;
  if (rules().ladder) { giveLevel(e); return; }
  if (e.bot && !e.pref[1]) {
    const rifle = e.team === 'T' ? 'kr47' : 'm5', r = Math.random();
    e.pref[1] = r < .4 ? rifle : r < .52 ? 'wasp' : r < .64 ? 'sg12' : r < .74 ? 'mpx' : r < .83 ? 'dmr' : r < .92 ? 'lb338' : 'hmg';
    e.pref[2] = pick(['p9', 'p9', 'viper', 'hc50']);
  }
  for (const s of [1, 2]) if (e.pref[s] && W[e.pref[s]]) e.slots[s] = newWeapon(e.pref[s]);
  if (e.bot && Math.random() < .6) e.slots[4].push(pick(['he', 'flash', 'molly', 'smoke']));
  e.cur = 0; setSlot(e, bestSlot(e));
}
function giveLevel(e) {
  const k = GAME.ladder[Math.min(e.gg || 0, GAME.ladder.length - 1)], d = W[k];
  e.slots = { 1: null, 2: null, 3: newWeapon('knife'), 4: [] };
  if (d.slot === 1 || d.slot === 2) e.slots[d.slot] = newWeapon(k);
  e.reloadT = 0; e.cur = 0; setSlot(e, d.slot === 1 || d.slot === 2 ? d.slot : 3);
}
// Pick a respawn cell: away from living enemies, out of their sight, loosely on the team's side.
function spawnPoint(team) {
  const own = G.def.spawns[team], ox = cellCenter(own[0] + own[2] / 2), oz = cellCenter(own[1] + own[3] / 2);
  const foes = ENTS.filter(e => e.alive && e.team !== team);
  let best = null, bs = -1e9;
  for (let k = 0; k < 36; k++) {
    const c = k < 6 ? pick(rectCells(own)) : pick(G.open), x = cellCenter(c[0]), z = cellCenter(c[1]);
    let near = 40, seen = false;
    for (const f of foes) { near = Math.min(near, Math.hypot(f.x - x, f.z - z)); if (!seen && near < 60 && los(x, 1.6, z, f.x, f.y + 1.5, f.z)) seen = true; }
    const score = near - (seen ? 25 : 0) - Math.hypot(x - ox, z - oz) * .12 + Math.random() * 3;
    if (score > bs) { bs = score; best = [x, z]; }
  }
  return best;
}
function respawn(e) {
  const [x, z] = spawnPoint(e.team), foes = ENTS.filter(f => f.alive && f.team !== e.team);
  e.x = x + rand(-.3, .3); e.z = z + rand(-.3, .3); e.y = 0; e.vx = e.vy = e.vz = 0;
  e.hp = 100; e.alive = true; e.deadT = 0; e.crouch = 0; e.scope = 0; e.dmgTaken = {}; e.flash = 0; e.recoil = 0; e.punchP = e.punchY = 0; e.cool = 0; e.reloadT = 0; e.switchT = 0;
  const f = foes.length ? foes.reduce((a, b) => Math.hypot(a.x - x, a.z - z) < Math.hypot(b.x - x, b.z - z) ? a : b) : null;
  e.yaw = f ? yawTo(x, z, f.x, f.z) : yawTo(x, z, G.W, G.H); e.pitch = 0;
  e.prot = GAME.now + SPAWN_SHIELD; e.spawnAt = GAME.now;
  giveLoadout(e);
  if (e.bot) aiInit(e);
  if (e === PLAYER) uiRespawn();
}
function finishMatch(winner, reason, hero) {
  if (GAME.over) return;
  GAME.over = winner; GAME.result = { winner, reason };
  GAME.phase = 'post'; GAME.phaseT = GAME.attract ? 3 : 4;
  const team = ENTS.filter(e => e.team === winner); const mvp = hero || team.reduce((a, b) => b.kills > a.kills ? b : a, team[0]); if (mvp) mvp.mvp++;
  uiRoundEnd(winner, reason, mvp);
}
function canBuyNow(e = PLAYER) {
  const R = rules();
  if (R.ladder) return false;
  if (!R.rounds) return !!e && e.alive && GAME.phase !== 'over' && !GAME.over && GAME.now - (e.spawnAt || 0) < TDM_BUY_TIME;
  return GAME.phase === 'freeze' || (GAME.phase === 'live' && GAME.roundT > GAME.roundLen - BUY_TIME);
}
function doBuy(e, k, silent) {
  const d = W[k] || GEAR[k]; if (!d || e.money < d.price || (d.team && d.team !== e.team)) return false;
  if (k === 'kevlar') { if (e.armor >= 100) return false; e.armor = 100; }
  else if (k === 'helmet') { if (e.armor >= 100 && e.helmet) return false; if (e.armor >= 100) { e.money -= 350; e.helmet = true; if (!silent) sfx.buy(); return true; } e.armor = 100; e.helmet = true; }
  else if (k === 'kit') { if (e.kit) return false; e.kit = true; }
  else if (d.nade) { if (e.slots[4].includes(k) || e.slots[4].length >= MAX_NADES) return false; e.slots[4].push(k); }
  else { if (e.slots[d.slot] && e.slots[d.slot].k === k) return false; e.slots[d.slot] = newWeapon(k); if (e.cur === d.slot) { e.cur = 0; } setSlot(e, d.slot); if (e.pref) e.pref[d.slot] = k; }
  e.money -= d.price; if (!silent) sfx.buy();
  if (e.isPlayer && (e.cur === 4 || d.slot === e.cur)) vmRebuild();
  return true;
}
function endRound(winner, reason) {
  if (GAME.phase !== 'live') return;
  GAME.result = { winner, reason };
  GAME.phase = 'post'; GAME.phaseT = GAME.attract ? 3 : 5.5;
  const loser = winner === 'T' ? 'CT' : 'T';
  GAME.score[winner]++;
  const bonus = (reason === 'bomb' || reason === 'defuse') ? 3500 : 3250;
  const lossPay = 1400 + 500 * Math.min(GAME.loss[loser], 4);
  GAME.loss[winner] = 0; GAME.loss[loser]++;
  for (const e of ENTS) {
    if (e.team === winner) e.money += bonus; else e.money += lossPay + (loser === 'T' && GAME.bomb.state === 'planted' ? 800 : 0);
    e.money = Math.min(16000, e.money);
  }
  const team = ENTS.filter(e => e.team === winner); let mvp = team[0]; for (const e of team) if (e.roundDmg > mvp.roundDmg) mvp = e; if (mvp) mvp.mvp++;
  GAME.history.push(winner);
  if (GAME.score[winner] >= GAME.target) GAME.over = winner;
  uiRoundEnd(winner, reason, mvp);
}
// Elimination time-out: more players standing wins, then more health; a dead heat goes to the CTs.
function elimWinner() {
  const alive = tm => ENTS.filter(e => e.team === tm && e.alive), hp = tm => alive(tm).reduce((n, e) => n + e.hp, 0);
  const d = alive('T').length - alive('CT').length || hp('T') - hp('CT');
  return d > 0 ? 'T' : 'CT';
}
function timeUp() {
  const R = rules();
  if (R.ladder) { // furthest along the ladder wins
    const lead = ENTS.reduce((a, b) => (b.gg || 0) > (a.gg || 0) || (b.gg === a.gg && b.kills > a.kills) ? b : a, ENTS[0]);
    return finishMatch(lead.team, 'timeup', lead);
  }
  if (GAME.score.T === GAME.score.CT) { GAME.sudden = true; uiMsg('Sudden death · next kill wins', 3, 'bomb'); return; }
  finishMatch(GAME.score.T > GAME.score.CT ? 'T' : 'CT', 'timeup');
}
function checkRoundEnd() {
  if (GAME.phase !== 'live' || !rules().rounds) return;
  const aT = ENTS.some(e => e.team === 'T' && e.alive), aC = ENTS.some(e => e.team === 'CT' && e.alive);
  if (!aC) return endRound('T', 'elim');
  if (!aT && GAME.bomb.state !== 'planted') return endRound('CT', 'elim');
}
function updateRound(dt) {
  GAME.phaseT -= dt;
  if (GAME.phase === 'freeze' && GAME.phaseT <= 0) { GAME.phase = 'live'; uiMsg(GAME.attract ? '' : 'GO', 1.2, 'go'); sfx.roundStart(); }
  else if (GAME.phase === 'live' && !rules().rounds) {
    const R = rules();
    for (const e of ENTS) if (!e.alive && e.deadT >= R.respawn) respawn(e);
    if (!GAME.sudden) { GAME.roundT -= dt; if (GAME.roundT <= 0) { GAME.roundT = 0; timeUp(); } }
  }
  else if (GAME.phase === 'live') {
    if (GAME.bomb.state !== 'planted') { GAME.roundT -= dt; if (GAME.roundT <= 0) { GAME.roundT = 0; endRound(rules().bomb ? 'CT' : elimWinner(), 'time'); } }
  } else if (GAME.phase === 'post' && GAME.phaseT <= 0) {
    if (GAME.over) { if (GAME.attract) newMatch(Object.assign({}, GAME.cfg)); else { GAME.phase = 'over'; uiMatchOver(GAME.over); } }
    else startRound(false);
  }
  updateBomb(dt);
}

// ---------- bomb ----------
function dropBomb(e) { const b = GAME.bomb; e.hasBomb = false; b.state = 'dropped'; b.carrier = null; b.x = e.x; b.z = e.z; b.y = groundAt(e.x, e.z, e.y + .3); }
function plantBomb(e) {
  const b = GAME.bomb; e.hasBomb = false; e.plantT = 0; b.state = 'planted'; b.carrier = null; b.x = e.x + rand(-.1, .1); b.z = e.z + rand(-.1, .1); b.y = e.y; b.yaw = e.yaw;
  b.site = siteAt(e.x, e.z) === 1 ? 'A' : 'B'; b.timer = BOMB_TIME; b.beepT = 0; e.money = Math.min(16000, e.money + 300);
  for (const x of ENTS) if (x.ai) x.ai.guard = null;
  uiMsg('Bomb planted at ' + b.site, 2.5, 'bomb'); sfx.planted();
  checkRoundEnd();
}
function updateBomb(dt) {
  const b = GAME.bomb;
  if (b.state === 'carried') { const c = ENTS.find(e => e.hasBomb); if (c) { b.carrier = c; b.x = c.x; b.y = c.y; b.z = c.z; } }
  if (b.state === 'dropped') for (const e of ENTS) if (e.team === 'T' && e.alive && Math.hypot(e.x - b.x, e.z - b.z) < 1.1 && Math.abs(e.y - b.y) < 1.5) { e.hasBomb = true; b.state = 'carried'; b.carrier = e; if (e.isPlayer) uiMsg('You picked up the bomb', 1.5); break; }
  // planting
  for (const e of ENTS) {
    if (!e.alive || !e.hasBomb) { e.plantT = 0; continue; }
    const want = e.isPlayer ? (KEYS.KeyE && GAME.phase === 'live' && !uiBlocking()) : e.planting;
    if (want && GAME.phase === 'live' && siteAt(e.x, e.z) && e.onGround) {
      const before = e.plantT; e.plantT += dt; if (Math.floor(before * 2.5) !== Math.floor(e.plantT * 2.5)) sfx.beep(e.x, e.z, .5);
      if (e.plantT >= 3.2) plantBomb(e);
    } else e.plantT = 0;
  }
  if (b.state === 'planted') {
    if (GAME.phase === 'live' || GAME.phase === 'post') {
      if (GAME.phase === 'live') b.timer -= dt;
      b.beepT -= dt; const iv = Math.max(.12, .95 * (b.timer / BOMB_TIME) + .05);
      if (b.beepT <= 0 && b.timer > 0 && GAME.phase === 'live') { b.beepT = iv; sfx.beep(b.x, b.z, 1); b.ledT = .08; }
      b.ledT = (b.ledT || 0) - dt;
      if (b.timer <= 0 && GAME.phase === 'live') { b.state = 'exploded'; bombExplode(); endRound('T', 'bomb'); return; }
    }
    // defuse
    if (GAME.phase === 'live') {
      let any = false;
      for (const e of ENTS) {
        if (e.team !== 'CT' || !e.alive) continue;
        const near = Math.hypot(e.x - b.x, e.z - b.z) < 1.6 && Math.abs(e.y - b.y) < 1.4;
        const want = near && (e.isPlayer ? KEYS.KeyE && !uiBlocking() : e.defusing);
        if (want && (!b.defuser || b.defuser === e)) {
          if (!b.defuser) { b.defuser = e; e.defT = 0; sfx.defuseStart(b.x, b.z); }
          e.defT += dt; any = true;
          if (e.defT >= (e.kit ? 5 : 10)) { b.state = 'defused'; b.defuser = null; e.money += 300; uiMsg('Bomb defused', 2, 'ct'); sfx.defused(); endRound('CT', 'defuse'); return; }
        } else if (b.defuser === e) { b.defuser = null; e.defT = 0; }
      }
      if (!any && b.defuser && !b.defuser.alive) b.defuser = null;
    }
  }
}
function bombExplode() {
  const b = GAME.bomb;
  fxEvent('bomb', b.x, b.y + .3, b.z);
  for (const e of ENTS) { if (!e.alive) continue; const d = Math.hypot(e.x - b.x, e.y - b.y, e.z - b.z); if (d < 22) damage(e, 500 * Math.pow(1 - d / 22, 1.6), null, 'bomb', false, .9); }
}

// ---------- grenades ----------
const THROWN = {}; // grenades thrown by type, for checks
function throwNade(e, alt) {
  const k = e.slots[4].shift(); if (!k) return false;
  THROWN[k] = (THROWN[k] || 0) + 1;
  const [dx, dy, dz] = dirFrom(e.yaw, e.pitch + (alt ? 0 : .1)); const sp = alt ? 7 : 16;
  NADES.push({ k, x: e.x + dx * .4, y: e.y + eyeH(e) - .15, z: e.z + dz * .4, vx: dx * sp + e.vx * .6, vy: dy * sp + 1.6, vz: dz * sp + e.vz * .6, t: 0, owner: e, node: buildGun(k), spin: 0, rest: false });
  e.cool = .7; sfx.throw(e);
  if (e.slots[4].length) { if (e.isPlayer) vmRebuild(); e.switchT = .4; } else { e.cur = 0; setSlot(e, e.slots[1] ? 1 : 2); }
  return true;
}
function launchRocket(e, x, y, z, dx, dy, dz) {
  NADES.push({ k: 'rocket_round', x, y, z, vx: dx * 38, vy: dy * 38, vz: dz * 38, t: 0, owner: e, node: buildGun('rocket_round'), spin: 0, rest: false });
}
// A rocket flies straight and explodes on the first wall, floor or fighter in its way.
function flyRocket(n, dt) {
  const sx = n.vx * dt, sy = n.vy * dt, sz = n.vz * dt, l = Math.hypot(sx, sy, sz), dx = sx / l, dy = sy / l, dz = sz / l;
  const hw = rayGrid(n.x, n.y, n.z, dx, dy, dz, l), wallT = hw.t, wall = hw.type >= 0;
  const hc = traceChars(n.t < .15 ? n.owner : null, n.x, n.y, n.z, dx, dy, dz, Math.min(wallT, l));
  n.t += dt;
  if (hc || wall || n.t > 4) {
    const t = hc ? hc.t : wallT;
    let x = n.x + dx * t, y = n.y + dy * t, z = n.z + dz * t;
    if (!hc && wall) { x += RAY.nx * .2; y += RAY.ny * .2; z += RAY.nz * .2; }
    rocketExplode(x, y, z, n.owner, hc && hc.e);
    return true;
  }
  n.x += sx; n.y += sy; n.z += sz;
  return false;
}
function rocketExplode(x, y, z, owner, direct) {
  const d = W.rocket;
  fxEvent('he', x, y, z);
  for (const e of ENTS) {
    if (!e.alive) continue;
    const dist = e === direct ? 0 : Math.hypot(e.x - x, e.y + 1 - y, e.z - z);
    if (dist < d.radius && los(x, y + .2, z, e.x, e.y + 1, e.z, false)) damage(e, d.dmg * Math.pow(1 - dist / d.radius, 1.1), owner, 'rocket', false, d.armor);
  }
  noiseEvent({ x, z, team: owner?.team }, 60);
}
function updateNades(dt) {
  for (let i = NADES.length - 1; i >= 0; i--) {
    if (NADES[i].k === 'rocket_round') { if (flyRocket(NADES[i], dt)) NADES.splice(i, 1); continue; }
    const n = NADES[i];
    for (let s = 0; s < 2; s++) {
      const h = dt / 2; n.vy -= 18 * h;
      const nx = n.x + n.vx * h; if (cellH(cellOf(nx), cellOf(n.z)) > n.y) { n.vx *= -.45; n.vz *= .8; if (Math.abs(n.vx) > 1.5) sfx.bounce(n.x, n.z); } else n.x = nx;
      const nz = n.z + n.vz * h; if (cellH(cellOf(n.x), cellOf(nz)) > n.y) { n.vz *= -.45; n.vx *= .8; if (Math.abs(n.vz) > 1.5) sfx.bounce(n.x, n.z); } else n.z = nz;
      n.y += n.vy * h; const g = cellH(cellOf(n.x), cellOf(n.z)); const gg = g <= n.y + .3 ? g : 0;
      if (n.y < gg + .06) { n.y = gg + .06; n.landed = true; if (n.vy < -2) sfx.bounce(n.x, n.z); n.vy = -n.vy * .32; n.vx *= .65; n.vz *= .65; if (Math.abs(n.vy) < .8) n.vy = 0; }
    }
    n.t += dt; n.spin += Math.hypot(n.vx, n.vz) * dt * 3;
    const speed = Math.hypot(n.vx, n.vy, n.vz);
    if (n.k === 'he' && n.t > 1.7) { heExplode(n); NADES.splice(i, 1); }
    else if (n.k === 'smoke' && ((n.t > 1.2 && speed < .6) || n.t > 3.2)) { popSmoke(n); NADES.splice(i, 1); }
    else if (n.k === 'flash' && n.t > 1.5) { flashExplode(n); NADES.splice(i, 1); }
    else if (n.k === 'molly' && ((n.landed && n.t > .15) || n.t > 2.4)) { igniteFire(n); NADES.splice(i, 1); }
  }
}
// Visual and sound side of a blast; the host also tells LAN guests, who do not simulate grenades.
function fxEvent(kind, x, y, z) {
  playFx(kind, x, y, z);
  if (NET.role === 'host') netSend({ to: 'all', msg: { type: 'fx', kind, x, y, z } });
}
function playFx(kind, x, y, z) {
  const near = k => { if (PLAYER) shake(Math.max(0, k - Math.hypot(CAM.x - x, CAM.z - z) / (k > 1 ? 40 : 25))); };
  if (kind === 'he') { fxExplosion(x, y, z, 1); sfx.boom(x, z, 1); near(.8); }
  else if (kind === 'bomb') { fxExplosion(x, y, z, 2.6); sfx.boom(x, z, 2); near(1.4); }
  else if (kind === 'flash') {
    P({ x, y, z, life: .25, size: 3, grow: 20, cell: 10, r: 1, g: 1, b: 1, a: 1, add: true });
    for (let i = 0; i < 18; i++) P({ x, y, z, vx: rand(-6, 6), vy: rand(0, 6), vz: rand(-6, 6), life: rand(.2, .5), size: .05, cell: 0, r: 1, g: 1, b: .9, add: true, grav: 10 });
    DLIGHTS.push({ x, y: y + .5, z, c: [14, 14, 14], r: 22, life: .15 }); sfx.flashbang(x, z);
  }
  else if (kind === 'fire') sfx.ignite(x, z);
  else if (kind === 'fizzle') { for (let i = 0; i < 12; i++) P({ x: x + rand(-1, 1), y, z: z + rand(-1, 1), vy: rand(.5, 1.5), life: rand(1, 2), size: .6, grow: .8, cell: 1, r: .7, g: .7, b: .7, a: .4, drag: 1 }); sfx.fizzle(x, z); }
}
// ---------- flashbang ----------
const FLASH_RANGE = 28;
function flashExplode(n) {
  fxEvent('flash', n.x, n.y + .2, n.z);
  for (const e of ENTS) {
    if (!e.alive) continue;
    const ex = e.x, ey = e.y + eyeH(e), ez = e.z, dx = n.x - ex, dy = n.y + .2 - ey, dz = n.z - ez, d = Math.hypot(dx, dy, dz);
    if (d > FLASH_RANGE || !los(ex, ey, ez, n.x, n.y + .2, n.z)) continue;
    // looking at it blinds fully, side-on partly, turned away barely
    const [fx, fy, fz] = dirFrom(e.yaw, e.pitch), face = (fx * dx + fy * dy + fz * dz) / Math.max(d, .01);
    const k = face > .5 ? 1 : face > -.2 ? .55 : .18, dur = 4.6 * k * Math.pow(1 - d / FLASH_RANGE, .7);
    if (dur < .2) continue;
    e.flash = Math.max(e.flash || 0, dur);
    if (e.ai) { e.ai.target = null; e.ai.visible = false; }
    if (e === PLAYER && dur > 1) sfx.ring(Math.min(1, dur / 4));
  }
  noiseEvent(n, 40);
}
// ---------- incendiary ----------
let FIRES = [];
const FIRE_LIFE = 7, FIRE_R = 3.2;
function igniteFire(n) {
  const y = Math.max(0, n.y - .06);
  // landing in smoke puts it out straight away
  if (SMOKES.some(sm => sm.dense > .4 && Math.hypot(sm.x - n.x, sm.z - n.z) < sm.r)) { fxEvent('fizzle', n.x, y, n.z); return; }
  FIRES.push({ x: n.x, y, z: n.z, t: 0, life: FIRE_LIFE, owner: n.owner?.id ?? -1, acc: {} });
  fxEvent('fire', n.x, y, n.z); noiseEvent(n, 30);
}
function fireRadius(f) { return FIRE_R * Math.min(1, .45 + f.t / .6) * (f.t > f.life - 1 ? Math.max(.2, f.life - f.t) : 1); }
function fireAt(x, z, y) { return FIRES.find(f => Math.abs(y - f.y) < 1.4 && Math.hypot(x - f.x, z - f.z) < fireRadius(f)); }
function updateFires(dt) {
  for (let i = FIRES.length - 1; i >= 0; i--) {
    const f = FIRES[i]; f.t += dt;
    if (SMOKES.some(sm => sm.dense > .5 && Math.hypot(sm.x - f.x, sm.z - f.z) < sm.r + 1)) { fxEvent('fizzle', f.x, f.y, f.z); FIRES.splice(i, 1); continue; }
    if (f.t > f.life) { FIRES.splice(i, 1); continue; }
    const r = fireRadius(f);
    for (const e of ENTS) {
      if (!e.alive || Math.abs(e.y - f.y) > 1.4 || Math.hypot(e.x - f.x, e.z - f.z) > r) continue;
      // burn in ticks of 8 so the damage never rounds down to nothing
      f.acc[e.id] = (f.acc[e.id] || 0) + dt;
      if (f.acc[e.id] >= .25) { f.acc[e.id] -= .25; damage(e, 8, ENTS[f.owner] || null, 'molly', false, 1); }
    }
  }
}
function fireFx(dt) {
  for (const n of NADES) if (n.k === 'rocket_round') {
    const l = Math.hypot(n.vx, n.vy, n.vz) || 1, bx = -n.vx / l, by = -n.vy / l, bz = -n.vz / l;
    P({ x: n.x + bx * .3, y: n.y + by * .3, z: n.z + bz * .3, vx: bx * 2, vy: by * 2, vz: bz * 2, life: .12, size: .25, cell: 0, r: 1, g: .7, b: .3, add: true });
    P({ x: n.x + bx * .4, y: n.y + by * .4, z: n.z + bz * .4, vx: rand(-.2, .2), vy: rand(.1, .4), vz: rand(-.2, .2), life: rand(1, 1.8), size: .25, grow: .9, cell: 1, r: .75, g: .74, b: .72, a: .5, drag: 1.5 });
    DLIGHTS.push({ x: n.x, y: n.y, z: n.z, c: [4, 2.4, 1], r: 6, life: .03 });
  }
  for (const f of FIRES) {
    const r = fireRadius(f), n = Math.min(12, 70 * dt * r);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r;
      P({ x: f.x + Math.cos(a) * d, y: f.y + .05, z: f.z + Math.sin(a) * d, vx: rand(-.3, .3), vy: rand(1.4, 3.2), vz: rand(-.3, .3), life: rand(.35, .75), size: rand(.25, .55), grow: .5, cell: 0, r: 1, g: rand(.4, .7), b: .12, add: true, drag: 1.5 });
    }
    if (Math.random() < dt * 6) P({ x: f.x + rand(-r, r) * .6, y: f.y + 1.2, z: f.z + rand(-r, r) * .6, vy: rand(.8, 1.6), life: rand(1.5, 2.5), size: .7, grow: 1, cell: 1, r: .15, g: .14, b: .13, a: .45, drag: .8 });
    DLIGHTS.push({ x: f.x, y: f.y + 1, z: f.z, c: [5 + Math.random(), 2.2, .5], r: 10, life: .03 });
    f.snd = (f.snd || 0) - dt; if (f.snd <= 0) { f.snd = rand(.25, .6); sfx.crackle(f.x, f.z); }
  }
}
function heExplode(n) {
  fxEvent('he', n.x, n.y + .2, n.z);
  for (const e of ENTS) { if (!e.alive) continue; const d = Math.hypot(e.x - n.x, e.y + 1 - n.y, e.z - n.z); if (d < 8 && los(n.x, n.y + .4, n.z, e.x, e.y + 1.1, e.z, false)) damage(e, 98 * Math.pow(1 - d / 8, 1.25), n.owner, 'he', false, .55); }
  noiseEvent(n, 40);
}
function popSmoke(n) {
  const s = { x: n.x, z: n.z, y: n.y, t: 0, life: 18, r: 3.4, dense: 0, puffs: [] };
  for (let k = 0; k < 34; k++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 3.1; s.puffs.push({ ox: Math.cos(a) * r, oy: .5 + Math.random() * 2.6, oz: Math.sin(a) * r, size: rand(1.5, 2.4), cell: Math.random() < .5 ? 1 : 2, rot: Math.random() * TAU, vr: rand(-.15, .15), shade: rand(.72, .9), delay: r * .12 }); }
  SMOKES.push(s); sfx.smoke(n.x, n.z);
}
function updateSmokes(dt) {
  for (let i = SMOKES.length - 1; i >= 0; i--) { const s = SMOKES[i]; s.t += dt; s.dense = Math.min(1, s.t / 1.6) * (s.t > s.life - 3 ? Math.max(0, (s.life - s.t) / 3) : 1); if (s.t > s.life) SMOKES.splice(i, 1); }
}

// ---------- effects ----------
let SHAKE = 0;
function shake(a) { SHAKE = Math.max(SHAKE, a); }
function P(o) { if (PARTS.length > QUALITY.parts) PARTS.splice(0, 200); PARTS.push(Object.assign({ vx: 0, vy: 0, vz: 0, grow: 0, grav: 0, drag: 0, rot: Math.random() * TAU, vr: 0, add: false, t: 0, cell: 0, a: 1, size: .1 }, o)); }
const SURF = { 0: [.82, .72, .56], 1: [.8, .7, .55], 2: [.6, .45, .3], 3: [.6, .45, .3], 4: [.5, .3, .25], 5: [.55, .52, .5], 6: [.55, .52, .5], 7: [.8, .7, .55] };
function surfCol(t) { const c = SURF[t] || [.7, .7, .7]; return G.theme && G.theme.surf && (t === 0 || t === 1 || t === 7) ? G.theme.surf : c; }
function fxImpact(x, y, z, n, t, knife) {
  const c = surfCol(t);
  if (!knife) for (let k = 0; k < 5; k++) P({ x, y, z, vx: n[0] * 3 + rand(-3, 3), vy: n[1] * 3 + rand(0, 4), vz: n[2] * 3 + rand(-3, 3), life: rand(.15, .35), size: .025, cell: 0, r: 1, g: .8, b: .45, add: true, grav: 12 });
  for (let k = 0; k < 3; k++) P({ x: x + n[0] * .05, y: y + n[1] * .05, z: z + n[2] * .05, vx: n[0] * rand(.4, 1.4) + rand(-.3, .3), vy: n[1] * rand(.4, 1.2) + rand(0, .5), vz: n[2] * rand(.4, 1.4) + rand(-.3, .3), life: rand(.5, 1.1), size: .1, grow: .9, cell: 1 + (k & 1), r: c[0], g: c[1], b: c[2], a: .55, drag: 2.5 });
  for (let k = 0; k < 3; k++) P({ x, y, z, vx: n[0] * 2 + rand(-2, 2), vy: n[1] * 2 + rand(1, 3), vz: n[2] * 2 + rand(-2, 2), life: .7, size: .02, cell: 12, r: c[0] * .6, g: c[1] * .6, b: c[2] * .6, grav: 14 });
  addDecal(x, y, z, n, .055, 4, [1, 1, 1], .95);
}
function fxBlood(x, y, z, dx, dy, dz, head) {
  for (let k = 0; k < (head ? 12 : 7); k++) P({ x, y, z, vx: dx * rand(1, 3) + rand(-1.2, 1.2), vy: dy * 2 + rand(-.5, 1.8), vz: dz * rand(1, 3) + rand(-1.2, 1.2), life: rand(.3, .7), size: rand(.04, .09), grow: .25, cell: 0, r: .55, g: .03, b: .03, a: .9, grav: 9 });
  P({ x, y, z, life: .35, size: .15, grow: 1.2, cell: 1, r: .5, g: .05, b: .05, a: .6 });
  const hw = rayGrid(x, y, z, dx, dy - .3, dz, 3.5); if (hw.type >= 0) addDecal(hw.x, hw.y, hw.z, [hw.nx, hw.ny, hw.nz], rand(.25, .45), 5, [1, 1, 1], .85);
}
function tipPos(e) { if (e.tipNode) { const w = e.tipNode.w; return [w[12], w[13], w[14]]; } return [e.x, e.y + eyeH(e) - .2, e.z]; }
function fxMuzzle(e) {
  if (NET.role === 'host') netSend({ to: 'all', msg: { type: 'shot', id: e.id } });
  let p;
  if (e.isPlayer && CAMSRC === e) { VM.flash = .05; p = [CAM.x, CAM.y, CAM.z]; }
  else { p = tipPos(e); P({ x: p[0], y: p[1], z: p[2], life: .05, size: .28, cell: 6, r: 1, g: .9, b: .7, add: true }); P({ x: p[0], y: p[1], z: p[2], vy: .4, life: .6, size: .08, grow: .5, cell: 1, r: .8, g: .8, b: .8, a: .25 }); }
  DLIGHTS.push({ x: p[0], y: p[1], z: p[2], c: [3.5, 2.4, 1.2], r: 7, life: .05 });
}
function fxTracer(e, ex, ey, ez) {
  let s;
  if (e.isPlayer && CAMSRC === e) { const [fx, fy, fz] = dirFrom(CAM.yaw, CAM.pitch); s = [CAM.x + fx * .8 + Math.cos(CAM.yaw) * .12, CAM.y - .1 + fy * .8, CAM.z + fz * .8 - Math.sin(CAM.yaw) * .12]; }
  else s = tipPos(e);
  const dx = ex - s[0], dy = ey - s[1], dz = ez - s[2], L = Math.hypot(dx, dy, dz); if (L < 2) return;
  TRACERS.push({ s, d: [dx / L, dy / L, dz / L], L, t: 0 });
}
function fxExplosion(x, y, z, k) {
  for (let i = 0; i < 26 * k; i++) { const a = Math.random() * TAU, u = rand(-.2, 1), sp = rand(2, 8) * k; P({ x, y, z, vx: Math.cos(a) * sp * Math.sqrt(1 - u * u), vy: u * sp + 1, vz: Math.sin(a) * sp * Math.sqrt(1 - u * u), life: rand(.35, .8), size: rand(.4, 1) * k, grow: 1.5, cell: Math.random() < .5 ? 0 : 1, r: 1, g: rand(.45, .75), b: .2, add: true, drag: 3 }); }
  for (let i = 0; i < 22 * k; i++) { const a = Math.random() * TAU, sp = rand(.5, 3) * k; P({ x: x + rand(-.5, .5), y: y + rand(0, 1), z: z + rand(-.5, .5), vx: Math.cos(a) * sp, vy: rand(.5, 2.5), vz: Math.sin(a) * sp, life: rand(1.8, 3.5), size: rand(.8, 1.6) * k, grow: 1.2, cell: 1 + (i & 1), r: .2, g: .19, b: .18, a: .75, drag: 1.2 }); }
  for (let i = 0; i < 30 * k; i++) P({ x, y, z, vx: rand(-12, 12), vy: rand(2, 12), vz: rand(-12, 12), life: rand(.4, 1.2), size: .04, cell: 0, r: 1, g: .75, b: .35, add: true, grav: 14 });
  P({ x, y: y + .2, z, life: .3, size: 2 * k, grow: 30, cell: 10, r: 1, g: .9, b: .7, a: .7, add: true });
  DLIGHTS.push({ x, y: y + 1, z, c: [9, 5.5, 2.5], r: 16 * k, life: .4 });
  addDecal(x, groundAt(x, z, y) + .02, z, [0, 1, 0], 1.6 * k, 7, [1, 1, 1], .9);
}
function addDecal(x, y, z, n, s, cell, col, a) {
  let ux, uy, uz; if (Math.abs(n[1]) > .9) { ux = 1; uy = 0; uz = 0; } else { ux = -n[2]; uy = 0; uz = n[0]; const l = Math.hypot(ux, uz); ux /= l; uz /= l; }
  const vx = n[1] * uz - n[2] * uy, vy = n[2] * ux - n[0] * uz, vz = n[0] * uy - n[1] * ux;
  const r = Math.random() * TAU, c = Math.cos(r), sn = Math.sin(r);
  const ax = (ux * c + vx * sn) * s, ay = (uy * c + vy * sn) * s, az = (uz * c + vz * sn) * s, bx = (vx * c - ux * sn) * s, by = (vy * c - uy * sn) * s, bz = (vz * c - uz * sn) * s;
  const ox = x + n[0] * .012, oy = y + n[1] * .012, oz = z + n[2] * .012;
  DECALS.push({ q: [[ox - ax - bx, oy - ay - by, oz - az - bz], [ox + ax - bx, oy + ay - by, oz + az - bz], [ox + ax + bx, oy + ay + by, oz + az + bz], [ox - ax + bx, oy - ay + by, oz - az + bz]], cell, col, a });
  if (DECALS.length > 260) DECALS.shift(); decalDirty = true;
}
function updateFx(dt) {
  for (let i = PARTS.length - 1; i >= 0; i--) {
    const p = PARTS[i]; p.t += dt; if (p.t >= p.life) { PARTS.splice(i, 1); continue; }
    p.vy -= p.grav * dt; const dr = Math.exp(-p.drag * dt); p.vx *= dr; p.vy *= dr; p.vz *= dr;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.size += p.grow * dt; p.rot += p.vr * dt;
    if (p.grav && p.y < 0) { p.y = 0; p.vy *= -.3; p.vx *= .5; p.vz *= .5; }
  }
  for (let i = TRACERS.length - 1; i >= 0; i--) { const t = TRACERS[i]; t.t += dt; if (t.t * 380 - 7 > t.L) TRACERS.splice(i, 1); }
  for (let i = DLIGHTS.length - 1; i >= 0; i--) { DLIGHTS[i].life -= dt; if (DLIGHTS[i].life <= 0) DLIGHTS.splice(i, 1); }
  SHAKE *= Math.exp(-dt * 4);
  if (G.theme && G.theme.name === 'snow' && GAME.mode === 'play') {
    for (let k = 0; k < 60 * dt; k++) P({ x: CAM.x + rand(-16, 16), y: CAM.y + rand(3, 9), z: CAM.z + rand(-16, 16), vx: rand(-.4, .4), vy: rand(-1.6, -1), vz: rand(-.4, .4), life: 6, size: rand(.03, .06), cell: 0, r: 1, g: 1, b: 1, a: .85 });
  }
}

// ---------- audio ----------
const AU = { ctx: null, out: null, noise: null, vol: .7 };
function audioInit() {
  try {
    if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AU.ctx = new C(); const comp = AU.ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 5;
    AU.out = AU.ctx.createGain(); AU.out.gain.value = AU.vol; AU.out.connect(comp); comp.connect(AU.ctx.destination);
    const len = AU.ctx.sampleRate * 2, buf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; AU.noise = buf;
  } catch (e) { AU.ctx = null; }
}
function sp3(x, z) { const dx = x - CAM.x, dz = z - CAM.z, d = Math.hypot(dx, dz); const ang = angDiff(CAM.yaw, yawTo(CAM.x, CAM.z, x, z)); return { g: 1 / (1 + d * .045 + d * d * .0012), p: clamp(-Math.sin(ang), -1, 1) * Math.min(1, d / 4), d }; }
function voice(o) {
  if (!AU.ctx || GAME.attract || GAME.paused) return;
  const c = AU.ctx; let g = o.gain ?? .5, pan = 0, dist = 0;
  if (o.x !== undefined) { const s = sp3(o.x, o.z); g *= s.g; pan = s.p; dist = s.d; if (g < .01) return; }
  const t = c.currentTime + (o.delay || 0), dur = o.dur || .2;
  let src;
  if (o.osc) { src = c.createOscillator(); src.type = o.osc; src.frequency.setValueAtTime(o.f || 440, t); if (o.f2) src.frequency.exponentialRampToValueAtTime(o.f2, t + dur); }
  else { src = c.createBufferSource(); src.buffer = AU.noise; }
  const fl = c.createBiquadFilter(); fl.type = o.ft || 'lowpass'; let fq = o.fq || 2000; if (dist > 20 && fl.type === 'lowpass') fq *= Math.max(.25, 20 / dist);
  fl.frequency.setValueAtTime(fq, t); if (o.fq2) fl.frequency.exponentialRampToValueAtTime(o.fq2, t + dur); fl.Q.value = o.q || .8;
  const ga = c.createGain(); ga.gain.setValueAtTime(0.0001, t); ga.gain.exponentialRampToValueAtTime(Math.max(g, .0002), t + (o.att || .002)); ga.gain.exponentialRampToValueAtTime(.0001, t + dur);
  let last = ga; src.connect(fl); fl.connect(ga);
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; ga.connect(p); last = p; }
  last.connect(AU.out);
  if (o.osc) { src.start(t); src.stop(t + dur + .05); } else { src.start(t, Math.random() * 1.5); src.stop(t + dur + .05); }
}
const SHOT = {
  pistol: [{ fq: 3600, fq2: 900, dur: .16, gain: .7 }, { osc: 'sine', f: 180, f2: 50, dur: .09, gain: .5 }],
  heavy: [{ fq: 2400, fq2: 500, dur: .32, gain: 1 }, { osc: 'sine', f: 120, f2: 35, dur: .16, gain: .9 }],
  smg: [{ fq: 3200, fq2: 900, dur: .11, gain: .6 }, { osc: 'sine', f: 160, f2: 60, dur: .06, gain: .45 }],
  rifle: [{ fq: 2600, fq2: 600, dur: .22, gain: .9 }, { osc: 'sine', f: 140, f2: 40, dur: .12, gain: .75 }, { ft: 'highpass', fq: 4200, dur: .04, gain: .3 }],
  rifle2: [{ fq: 3000, fq2: 700, dur: .18, gain: .8 }, { osc: 'sine', f: 150, f2: 45, dur: .1, gain: .65 }, { ft: 'highpass', fq: 5000, dur: .035, gain: .28 }],
  pdw: [{ fq: 3800, fq2: 1100, dur: .09, gain: .55 }, { osc: 'sine', f: 190, f2: 70, dur: .05, gain: .4 }],
  shotgun: [{ fq: 1700, fq2: 280, dur: .5, gain: 1.3 }, { osc: 'sine', f: 85, f2: 28, dur: .26, gain: 1.2 }, { ft: 'highpass', fq: 3000, dur: .07, gain: .35 }, { ft: 'bandpass', fq: 900, q: 3, dur: .06, gain: .25, delay: .45 }, { ft: 'bandpass', fq: 1400, q: 3, dur: .05, gain: .25, delay: .58 }],
  rocket: [{ ft: 'bandpass', fq: 600, fq2: 3000, q: .7, dur: .9, gain: 1, att: .03 }, { osc: 'sine', f: 70, f2: 30, dur: .3, gain: 1 }, { ft: 'highpass', fq: 2500, dur: .12, gain: .4 }],
  lmg: [{ fq: 2300, fq2: 500, dur: .24, gain: 1 }, { osc: 'sine', f: 120, f2: 36, dur: .14, gain: .85 }, { ft: 'highpass', fq: 3800, dur: .04, gain: .3 }],
  dmr: [{ fq: 2400, fq2: 380, dur: .45, gain: 1.1 }, { osc: 'sine', f: 110, f2: 32, dur: .2, gain: .95 }, { ft: 'highpass', fq: 4400, dur: .04, gain: .3 }],
  sniper: [{ fq: 2000, fq2: 260, dur: .75, gain: 1.25 }, { osc: 'sine', f: 95, f2: 28, dur: .32, gain: 1.1 }, { fq: 900, fq2: 200, dur: .8, gain: .25, delay: .22 }],
};
const sfx = {
  shot(kind, e) { const self = e === CAMSRC; for (const v of SHOT[kind] || SHOT.pistol) voice(Object.assign({}, v, self ? { gain: v.gain * .8 } : { x: e.x, z: e.z, gain: v.gain * 1.3 })); },
  step(e) { const self = e === CAMSRC; voice(Object.assign({ ft: 'bandpass', fq: rand(280, 520), q: 1.4, dur: .08, gain: self ? .12 : .55 }, self ? {} : { x: e.x, z: e.z })); },
  land() { voice({ fq: 300, dur: .12, gain: .25 }); },
  click(e) { if (e === CAMSRC) voice({ osc: 'square', f: 2200, dur: .025, gain: .08, ft: 'highpass', fq: 1000 }); },
  reload(e) { if (e && e !== CAMSRC) { voice({ ft: 'bandpass', fq: 1600, dur: .05, gain: .25, x: e.x, z: e.z, delay: .3 }); return; } voice({ ft: 'bandpass', fq: 1800, q: 3, dur: .05, gain: .3, delay: .25 }); voice({ ft: 'bandpass', fq: 1200, q: 3, dur: .06, gain: .35, delay: 1.0 }); voice({ ft: 'bandpass', fq: 2600, q: 4, dur: .04, gain: .3, delay: 1.5 }); },
  deploy() { voice({ ft: 'bandpass', fq: 2400, q: 2, dur: .06, gain: .15 }); },
  hit(head) { if (head) { voice({ osc: 'sine', f: 2600, f2: 1700, dur: .14, gain: .22 }); voice({ ft: 'highpass', fq: 3000, dur: .03, gain: .25 }); } else voice({ fq: 700, dur: .07, gain: .35 }); },
  knife(e) { voice(Object.assign({ ft: 'bandpass', fq: 1400, fq2: 4200, q: 1.5, dur: .17, gain: .25 }, e === CAMSRC ? {} : { x: e.x, z: e.z })); },
  knifeHit(e) { voice({ fq: 3000, dur: .05, gain: .3, x: e.x, z: e.z }); },
  beep(x, z, g) { voice({ osc: 'sine', f: 1950, dur: .09, gain: .32 * g, x, z, ft: 'highpass', fq: 600 }); },
  planted() { voice({ osc: 'triangle', f: 660, dur: .15, gain: .25 }); voice({ osc: 'triangle', f: 440, dur: .25, gain: .25, delay: .15 }); },
  defuseStart(x, z) { voice({ ft: 'bandpass', fq: 2000, q: 2, dur: .2, gain: .3, x, z }); },
  defused() { voice({ osc: 'triangle', f: 520, dur: .15, gain: .25 }); voice({ osc: 'triangle', f: 780, dur: .3, gain: .25, delay: .15 }); },
  boom(x, z, k) { voice({ fq: 1100, fq2: 120, dur: 1.6 * k, gain: 1.6 * k, x, z }); voice({ osc: 'sine', f: 75, f2: 24, dur: .9 * k, gain: 1.3 * k, x, z }); voice({ fq: 500, fq2: 120, dur: 1.2, gain: .35, x, z, delay: .3 }); },
  throw(e) { voice(Object.assign({ ft: 'bandpass', fq: 900, dur: .14, gain: .2 }, e === CAMSRC ? {} : { x: e.x, z: e.z })); },
  bounce(x, z) { voice({ osc: 'triangle', f: rand(600, 800), dur: .05, gain: .3, x, z }); },
  smoke(x, z) { voice({ ft: 'highpass', fq: 2500, fq2: 5000, dur: 2.6, gain: .3, att: .1, x, z }); },
  flashbang(x, z) { voice({ ft: 'highpass', fq: 1800, fq2: 600, dur: .5, gain: 1.4, x, z }); voice({ osc: 'sine', f: 140, f2: 40, dur: .3, gain: .8, x, z }); },
  ring(k) { voice({ osc: 'sine', f: 3200, dur: 1 + 2.5 * k, gain: .12 * k, att: .05 }); },
  ignite(x, z) { voice({ fq: 700, fq2: 2400, dur: .7, gain: .7, att: .05, x, z }); voice({ ft: 'bandpass', fq: 3200, q: 2, dur: .12, gain: .3, x, z }); },
  crackle(x, z) { voice({ ft: 'bandpass', fq: rand(900, 2200), q: 1.2, dur: rand(.15, .4), gain: .3, x, z }); },
  fizzle(x, z) { voice({ ft: 'highpass', fq: 3000, fq2: 6000, dur: .9, gain: .35, x, z }); },
  death(e) { voice(Object.assign({ fq: 380, dur: .3, gain: .35 }, e === CAMSRC ? {} : { x: e.x, z: e.z })); },
  buy() { voice({ osc: 'triangle', f: 880, f2: 1320, dur: .07, gain: .14 }); },
  roundStart() { voice({ osc: 'triangle', f: 440, dur: .14, gain: .14 }); voice({ osc: 'triangle', f: 660, dur: .22, gain: .14, delay: .12 }); },
  win() { [523, 659, 784, 1046].forEach((f, i) => voice({ osc: 'triangle', f, dur: .4, gain: .13, delay: i * .09 })); },
  lose() { [440, 370, 311].forEach((f, i) => voice({ osc: 'triangle', f, dur: .45, gain: .13, delay: i * .14 })); },
};

// ===================== UI, INPUT, CAMERA, RENDER, MAIN =====================
const $ = s => document.querySelector(s);
const KEYS = {}; const MOUSE = { l: false, lPress: false };
let LOCKED = false, FALLBACK = false;
const CAM = { x: 40, y: 20, z: 40, yaw: 0, pitch: -.3, fov: 72, roll: 0 };
let CAMSRC = null;
const VM = { node: null, key: '', owner: null, kick: 0, swing: 0, bob: 0, swayX: 0, swayY: 0, flash: 0, tip: null, mdx: 0, mdy: 0 };
const store = { get(k, d) { try { const v = localStorage.getItem('bl_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('bl_' + k, JSON.stringify(v)); } catch (e) { } } };
let SENS = store.get('sens', 1.0); AU.vol = store.get('vol', .7);
const UI = { buy: false, board: false, pauseOpen: false, msgT: 0, bannerT: 0, hitT: 0, vignT: 0, deathMsg: '', last: {}, radarT: 0, feed: [], attractT: 0, attractIdx: 0 };
const cv = $('#cv');
const PROJ = M4.n(), VIEW = M4.n(), VP = M4.n(), CAMW = M4.n(), PROJVM = M4.n(), VPVM = M4.n(), INVVP = M4.n(), TMPM = M4.n();
let BB_ALPHA, BB_ADD, BB_DECAL, BB_VM;

function vmRebuild() {
  const o = CAMSRC || PLAYER; if (!o) return; const w = curW(o); if (!w) return;
  VM.node = buildVM(o.team, w.k); VM.key = w.k; VM.owner = o; VM.tip = find(VM.node, 'tip');
}
function uiBlocking() { return UI.buy || UI.pauseOpen; }

// ---------- input ----------
function playing() { return GAME.mode === 'play' && !GAME.attract; }
addEventListener('keydown', ev => {
  if (!playing()) return;
  if (ev.code === 'Tab') { ev.preventDefault(); UI.board = true; renderBoard(); $('#board').hidden = false; return; }
  if (GAME.phase === 'over') return;
  KEYS[ev.code] = true;
  if (ev.repeat) return;
  const p = PLAYER;
  if (UI.buy) {
    if (ev.code === 'KeyB' || ev.code === 'Escape') { closeBuy(); return; }
    const m = ev.code.match(/^(?:Digit|Key)([0-9A-Z])$/); if (m) { const it = BUY_ITEMS[BUY_KEYS.indexOf(m[1])]; if (it) tryBuy(it.k); }
    return;
  }
  if (ev.code === 'Escape' && FALLBACK) { if (UI.pauseOpen) hidePause(); else showPause(); return; }
  if (!p || !p.alive) return;
  if (ev.code === 'KeyB') { if (canBuyNow()) openBuy(); else uiMsg(rules().ladder ? 'No shop in arms race' : 'Buy time is over', 1.2); }
  if (ev.code === 'Digit1') setSlot(p, 1); if (ev.code === 'Digit2') setSlot(p, 2); if (ev.code === 'Digit3') setSlot(p, 3); if (ev.code === 'Digit4') setSlot(p, 4);
  if (ev.code === 'KeyQ') setSlot(p, p.last);
  if (ev.code === 'KeyR') startReload(p);
  if (ev.code === 'KeyG' && p.cur !== 3 && p.slots[p.cur] && p.cur !== 4) { /* drop not supported: inspect */ VM.swing = .6; }
});
addEventListener('keyup', ev => { KEYS[ev.code] = false; if (ev.code === 'Tab') { UI.board = false; $('#board').hidden = true; } });
// Leaving the window (Alt+Tab, another tab) always frees the mouse and pauses.
function releaseFocus() {
  for (const k in KEYS) KEYS[k] = false; MOUSE.l = false;
  if (document.pointerLockElement) document.exitPointerLock();
  if (playing() && !UI.buy && GAME.phase !== 'over') showPause();
}
addEventListener('blur', releaseFocus);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseFocus(); });
cv.addEventListener('mousedown', ev => {
  if (!playing()) return;
  audioInit();
  if (!LOCKED && !FALLBACK) { lockPointer(); return; }
  if (UI.buy || GAME.phase === 'over') return;
  const p = PLAYER; if (!p) return;
  if (!p.alive) { if (ev.button === 0) cycleSpec(1); return; }
  if (ev.button === 0) { MOUSE.l = true; MOUSE.lPress = true; }
  if (ev.button === 2) altFire(p);
});
addEventListener('mouseup', ev => { if (ev.button === 0) MOUSE.l = false; });
addEventListener('contextmenu', ev => { if (playing()) ev.preventDefault(); });
addEventListener('mousemove', ev => {
  if (!playing() || !(LOCKED || FALLBACK) || uiBlocking() || !PLAYER || !PLAYER.alive) return;
  const z = PLAYER.scope === 2 ? .2 : PLAYER.scope === 1 ? .45 : 1;
  const k = .0022 * SENS * z;
  PLAYER.yaw -= ev.movementX * k; PLAYER.pitch = clamp(PLAYER.pitch - ev.movementY * k, -1.5, 1.5);
  VM.mdx += ev.movementX; VM.mdy += ev.movementY;
});
addEventListener('wheel', ev => {
  if (!playing() || !PLAYER || !PLAYER.alive || uiBlocking()) return;
  const order = [1, 2, 3, 4].filter(s => s === 3 || (s === 4 ? PLAYER.slots[4].length : PLAYER.slots[s]));
  let i = order.indexOf(PLAYER.cur); i = (i + (ev.deltaY > 0 ? 1 : -1) + order.length) % order.length; setSlot(PLAYER, order[i]);
}, { passive: true });
function lockPointer(fromClick = true) {
  if (TOUCH.on) { FALLBACK = true; hidePause(); return; } // touch play needs no mouse capture
  const fail = () => { if (fromClick) { FALLBACK = true; hidePause(); } else if (playing() && GAME.phase !== 'over') showPause(); };
  if (!cv.requestPointerLock) { FALLBACK = true; return; }
  try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(fail); } catch (e) { fail(); }
}
document.addEventListener('pointerlockchange', () => {
  LOCKED = document.pointerLockElement === cv;
  if (LOCKED) { hidePause(); }
  else if (playing() && !UI.buy && GAME.phase !== 'over') showPause();
});
document.addEventListener('pointerlockerror', () => { if (!UI.buy) { FALLBACK = true; hidePause(); } });
function altFire(p) {
  if (p === PLAYER && remoteAction('alt')) return;
  const w = curW(p); if (!w) return;
  if (w.d.scope) { p.scope = (p.scope + 1) % ((w.d.zooms || 2) + 1); p.rescope = 0; sfx.deploy(); }
  else if (w.d.melee) fire(p, true);
  else if (w.d.nade) fire(p, true);
}
function showPause() { UI.pauseOpen = true; GAME.paused = !NET.role; $('#pause').hidden = false; MOUSE.l = false; for (const k in KEYS) KEYS[k] = false; }
function hidePause() { UI.pauseOpen = false; GAME.paused = false; $('#pause').hidden = true; }

// ---------- buy menu ----------
const BUY_ITEMS = [
  { k: 'p9', cat: 'Pistols' }, { k: 'viper', cat: 'Pistols' }, { k: 'hc50', cat: 'Pistols' },
  { k: 'mpx', cat: 'SMG' }, { k: 'wasp', cat: 'SMG' }, { k: 'sg12', cat: 'Heavy' }, { k: 'hmg', cat: 'Heavy' }, { k: 'rocket', cat: 'Heavy' },
  { k: 'rifle', cat: 'Rifles' }, { k: 'dmr', cat: 'Rifles' }, { k: 'lb338', cat: 'Rifles' },
  { k: 'kevlar', cat: 'Gear' }, { k: 'helmet', cat: 'Gear' }, { k: 'kit', cat: 'Gear' },
  { k: 'he', cat: 'Grenades' }, { k: 'smoke', cat: 'Grenades' }, { k: 'flash', cat: 'Grenades' }, { k: 'molly', cat: 'Grenades' },
];
// number row first, then letters that are not movement or menu keys
const BUY_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Z', 'X', 'C', 'V', 'N', 'M', 'J'];
function itemKey(k) { return k === 'rifle' ? (PLAYER && PLAYER.team === 'CT' ? 'm5' : 'kr47') : k; }
function openBuy() { UI.buy = true; renderBuy(); $('#buy').hidden = false; if (LOCKED) document.exitPointerLock(); MOUSE.l = false; }
function closeBuy() { UI.buy = false; $('#buy').hidden = true; if (playing() && !FALLBACK && document.hasFocus()) lockPointer(false); }
function tryBuy(k) { if (remoteAction('buy', itemKey(k))) return; if (!canBuyNow()) { closeBuy(); return; } if (doBuy(PLAYER, itemKey(k))) renderBuy(); else { sfx.click(PLAYER); } }
function renderBuy() {
  const p = PLAYER; const el = $('#buyGrid'); el.innerHTML = '';
  $('#buyMoney').textContent = '$' + p.money;
  const cats = {};
  BUY_ITEMS.forEach((it, i) => {
    const k = itemKey(it.k); const d = W[k] || GEAR[k];
    if (k === 'kit' && (p.team !== 'CT' || !rules().bomb)) return;
    (cats[it.cat] = cats[it.cat] || []).push({ i, k, d });
  });
  for (const [cat, list] of Object.entries(cats)) {
    const col = document.createElement('div'); col.className = 'bcol'; col.innerHTML = `<h4>${cat}</h4>`;
    for (const { i, k, d } of list) {
      const owned = (W[k] && ((d.slot <= 2 && p.slots[d.slot] && p.slots[d.slot].k === k) || (d.nade && p.slots[4].includes(k)))) || (k === 'kevlar' && p.armor >= 100) || (k === 'helmet' && p.helmet && p.armor >= 100) || (k === 'kit' && p.kit);
      const b = document.createElement('button'); b.className = 'bitem' + (owned ? ' owned' : '') + (p.money < d.price ? ' poor' : '');
      b.innerHTML = `<span class="bk">${BUY_KEYS[i] || ''}</span><span class="bn">${d.name}</span><span class="bp">${owned ? 'OWNED' : '$' + d.price}</span>${W[k] && W[k].dmg ? `<span class="bs">DMG ${W[k].pellets ? W[k].pellets + '×' : ''}${W[k].dmg} · ${W[k].auto ? 'AUTO' : 'SEMI'} · ${W[k].mag} RDS</span>` : `<span class="bs">${GEAR_DESC[k] || ''}</span>`}`;
      b.onclick = () => tryBuy(BUY_ITEMS[i].k); col.appendChild(b);
    }
    el.appendChild(col);
  }
}
const GEAR_DESC = { kevlar: 'Absorbs body damage', helmet: 'Vest + head protection', kit: 'Defuse in 5s instead of 10s', he: 'Frag, ~100 dmg at center', smoke: '18s vision block',
  flash: 'Blinds anyone looking at it', molly: '7s fire, ~32 dmg/s, smoke puts it out' };

// ---------- HUD helpers ----------
function setText(id, v) { if (UI.last[id] === v) return; UI.last[id] = v; $(id).textContent = v; }
function uiMsg(text, dur = 2, cls = '') { const el = $('#cmsg'); el.textContent = text; el.className = cls; UI.msgT = dur; el.style.opacity = text ? 1 : 0; }
function uiRoundStart() {
  $('#banner').hidden = true;
  if (GAME.attract) return;
  const R = rules();
  uiMsg(R.rounds ? `Round ${GAME.round} · Buy phase` : R.ladder ? 'Arms race · every kill gives the next gun' : `Team deathmatch · first to ${GAME.goal} kills`, 2.5);
  if (PLAYER) { PLAYER.specT = 0; $('#spec').hidden = true; $('#death').hidden = true; }
  if (PLAYER && PLAYER.hasBomb) setTimeout(() => uiMsg('You carry the bomb — plant it at A or B', 3, 'bomb'), 2600);
}
const REASON = { elim: 'Enemy team eliminated', time: 'Time ran out', bomb: 'Target bombed', defuse: 'Bomb defused', kills: 'Kill limit reached', timeup: 'Time limit reached', ladder: 'Arms race completed' };
function uiRoundEnd(w, reason, mvp) {
  if (GAME.attract) return;
  uiMsg('', 0);
  const el = $('#banner'); el.hidden = false; el.className = w === 'T' ? 't' : 'ct';
  const best = !mvp ? '' : rules().rounds ? ` · MVP ${mvp.name} (${mvp.roundDmg} dmg)` : ` · MVP ${mvp.name} (${mvp.kills} kills)`;
  el.innerHTML = `<b>${w === 'T' ? 'Terrorists win' : 'Counter-Terrorists win'}</b><span>${REASON[reason]}${best}</span>`;
  if (PLAYER) (w === PLAYER.team ? sfx.win : sfx.lose)();
}
function uiMatchOver(w) {
  $('#overXP').hidden = true;
  if (LOCKED) document.exitPointerLock();
  $('#over').hidden = false; $('#banner').hidden = true;
  const won = PLAYER && w === PLAYER.team;
  $('#overTitle').textContent = won ? 'Match won' : 'Match lost';
  $('#overTitle').className = w === 'T' ? 't' : 'ct';
  $('#overSub').textContent = `${w === 'T' ? 'Terrorists' : 'Counter-Terrorists'} take it ${GAME.score[w]}–${GAME.score[w === 'T' ? 'CT' : 'T']} on ${G.def.name}`;
  $('#overBoard').innerHTML = boardHTML();
  reportMatch(won);
}
const SHORT = { knife: 'KNIFE', p9: 'P9', hc50: 'HC-50', mpx: 'MPX', kr47: 'KR-47', m5: 'M5', lb338: 'LONGBOW', he: 'HE', bomb: 'BOMB', smoke: 'SMOKE',
  viper: 'VIPER', wasp: 'WASP', sg12: 'BREAKER', hmg: 'HMG-90', rocket: 'RL-7', dmr: 'DMR', flash: 'FLASH', molly: 'FIRE' };
const HS_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" aria-label="headshot"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="1.6" fill="currentColor"/></svg>';
function uiFeed(att, v, wk, head) {
  if (NET.role === 'host') netSend({ to: 'all', msg: { type: 'kill', attacker: att?.id, victim: v.id, wk, head } });
  if (GAME.attract) return;
  const el = document.createElement('div'); el.className = 'kf' + ((att && att.isPlayer) || v.isPlayer ? ' me' : '');
  const nm = e => `<span class="${e.team.toLowerCase()}">${e.name}</span>`;
  el.innerHTML = (att && att !== v ? nm(att) : '') + `<em>${SHORT[wk] || wk || ''}</em>` + (head ? `<i class="hs">${HS_SVG}</i>` : '') + nm(v);
  $('#feed').prepend(el); setTimeout(() => el.classList.add('fade'), 5500); setTimeout(() => el.remove(), 6200);
  while ($('#feed').children.length > 6) $('#feed').lastChild.remove();
}
function uiHurt(dmg, att) {
  UI.vignT = Math.min(1, UI.vignT + dmg / 60);
  if (att && att !== PLAYER) {
    const ang = angDiff(PLAYER.yaw, yawTo(PLAYER.x, PLAYER.z, att.x, att.z));
    const d = document.createElement('div'); d.className = 'ddir'; d.style.transform = `rotate(${-ang}rad)`; $('#dmgDirs').appendChild(d); setTimeout(() => d.remove(), 900);
  }
  PLAYER.punchP += .02; shake(.15);
}
function uiHitmarker(killed, head) { const h = $('#hitm'); h.className = killed ? 'kill' : head ? 'head' : ''; UI.hitT = .18; h.style.opacity = 1; }
function uiDeath(att) {
  const d = $('#death'); d.hidden = false;
  d.innerHTML = att && att !== PLAYER ? `Killed by <b class="${att.team.toLowerCase()}">${att.name}</b> · ${att.hp > 0 ? att.hp + ' HP left' : 'traded'}` : 'You died';
}
function uiRespawn() {
  PLAYER.specT = 0; UI.specTarget = null; $('#death').hidden = true; $('#spec').hidden = true; vmRebuild();
}
function cycleSpec(dir) {
  const team = ENTS.filter(e => e.alive && e.team === PLAYER.team); const pool = team.length ? team : ENTS.filter(e => e.alive);
  if (!pool.length) return; let i = pool.indexOf(UI.specTarget); i = (i + dir + pool.length) % pool.length; UI.specTarget = pool[i];
}

// ---------- scoreboard ----------
function boardHTML() {
  const R = rules(); let h = '';
  const cols = R.ladder ? ['K', 'D', 'LVL'] : R.rounds ? ['K', 'A', 'D', 'MVP', '$'] : ['K', 'A', 'D'];
  const cell = (e, c, tm) => c === 'K' ? e.kills : c === 'A' ? e.assists : c === 'D' ? e.deaths : c === 'MVP' ? e.mvp || '' : c === 'LVL' ? `${(e.gg || 0) + 1} · ${SHORT[GAME.ladder[Math.min(e.gg || 0, GAME.ladder.length - 1)]]}` : !PLAYER || PLAYER.team === tm ? e.money : '';
  for (const tm of ['CT', 'T']) {
    const list = ENTS.filter(e => e.team === tm).sort((a, b) => (R.ladder ? (b.gg || 0) - (a.gg || 0) : 0) || b.kills - a.kills || a.deaths - b.deaths);
    h += `<div class="bt ${tm.toLowerCase()}"><div class="bth"><b>${tm === 'T' ? 'Terrorists' : 'Counter-Terrorists'}</b><span>${GAME.score[tm]}</span></div><table><thead><tr><th>Player</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>`;
    for (const e of list) h += `<tr class="${e.alive ? '' : 'dead'}${e.isPlayer ? ' me' : ''}"><td>${e.name}${e.hasBomb && PLAYER && PLAYER.team === 'T' ? ' <small>C4</small>' : ''}</td>${cols.map(c => `<td>${cell(e, c, tm)}</td>`).join('')}</tr>`;
    h += '</tbody></table></div>';
  }
  return h;
}
function renderBoard() {
  const R = rules();
  $('#boardTitle').textContent = `${G.def.name} · ` + (R.rounds ? `Round ${GAME.round} · first to ${GAME.target}` : R.ladder ? `Arms race · ${GAME.ladder.length} levels` : `Team deathmatch · first to ${GAME.goal} kills`);
  $('#boardBody').innerHTML = boardHTML();
}

// ---------- player update ----------
function updatePlayer(dt, p = PLAYER, keys = KEYS, mouse = MOUSE) {
  if (!p || !p.alive) return;
  const frozen = GAME.phase === 'freeze' || GAME.phase === 'over';
  const blocked = p === PLAYER && uiBlocking();
  let fx = 0, fz = 0;
  if (!blocked) {
    const f = [-Math.sin(p.yaw), -Math.cos(p.yaw)], r = [Math.cos(p.yaw), -Math.sin(p.yaw)];
    if (keys.KeyW) { fx += f[0]; fz += f[1]; } if (keys.KeyS) { fx -= f[0]; fz -= f[1]; }
    if (keys.KeyD) { fx += r[0]; fz += r[1]; } if (keys.KeyA) { fx -= r[0]; fz -= r[1]; }
    const l = Math.hypot(fx, fz); if (l) { fx /= l; fz /= l; }
  }
  const crouching = !blocked && (keys.KeyC || keys.ControlLeft);
  p.crouch = clamp(p.crouch + (crouching ? 1 : -1) * dt * 7, 0, 1);
  const w = curW(p);
  let spd = 6.2 * ((w && w.d.speed) || 1);
  if (keys.ShiftLeft && !blocked) spd *= .52; if (p.crouch > .5) spd *= .4; if (p.scope) spd *= .55;
  if (p.plantT > 0 || p.defT > 0) spd = 0;
  if (frozen) { fx = fz = 0; }
  if (keys.Space && p.onGround && !frozen && !blocked && p.crouch < .5) { p.vy = 6.6; p.onGround = false; }
  physics(p, dt, fx, fz, spd);
  // fire
  if (!blocked && !frozen && w && (p !== PLAYER || LOCKED || FALLBACK)) {
    if (mouse.l && (w.d.auto || mouse.lPress)) { if (fire(p)) mouse.lPress = false; else if (!w.d.auto && p.cool <= 0 && p.reloadT <= 0 && p.switchT <= 0) mouse.lPress = false; }
  }
  if (!mouse.l) mouse.lPress = false;
  if (w && w.d.mag && w.mag === 0 && w.res > 0 && p.reloadT <= 0 && p.cool <= 0 && !mouse.l) startReload(p);
}
function timers(e, dt) {
  if (e.cool > 0) e.cool -= dt;
  if (e.switchT > 0) e.switchT -= dt;
  if (e.reloadT > 0) { e.reloadT -= dt; if (e.reloadT <= 0) { e.reloadT = 0; finishReload(e); } }
  const firing = GAME.now - (e.lastShot || -9) < .15;
  const k = Math.exp(-dt * (firing ? 1.6 : 7)); e.punchP *= k; e.punchY *= k;
  if (!firing) e.recoil = Math.max(0, e.recoil - dt * 16);
  if (e.rescope && e.cool <= 0) { e.scope = e.rescope; e.rescope = 0; }
  if (e.flash > 0) e.flash = Math.max(0, e.flash - dt);
  e.eyeOff *= Math.exp(-dt * 14);
}

// ---------- character models ----------
function updateCharModel(e, dt) {
  const m = e.model; m.t[0] = e.x; m.t[1] = e.y; m.t[2] = e.z; m.r[1] = e.yaw; m.r[0] = 0; m.r[2] = 0;
  if (!m.hips) { m.hips = find(m, 'hips'); m.legL = find(m, 'legL'); m.legR = find(m, 'legR'); m.torso = find(m, 'torso'); m.upper = find(m, 'upper'); m.gun = find(m, 'gun'); }
  if (!e.alive) { const f = Math.min(1, e.deadT / .5); const ff = f * f; if (e.fallAxis === 0) m.r[0] = e.fallDir * 1.45 * ff; else m.r[2] = e.fallDir * 1.45 * ff; m.t[1] = e.y + .05 * ff; }
  const c = e.crouch, hs = Math.hypot(e.vx, e.vz);
  e.phase += hs * dt * 1.7; const sw = e.alive ? Math.sin(e.phase) * Math.min(1, hs / 4.5) * .6 : 0;
  m.hips.t[1] = .9 - .4 * c;
  m.legL.r[0] = .95 * c + sw; m.legR.r[0] = .95 * c - sw;
  m.torso.r[0] = -.22 * c; m.upper.r[0] = clamp(e.pitch, -1.1, 1.1) + .22 * c;
  const w = curW(e); const gk = w ? w.d.model : 'knife';
  if (e.gunKey !== gk) { e.gunKey = gk; m.gun.kids = [buildGun(gk)]; e.tipNode = find(m.gun, 'tip'); }
  updNode(m, null);
}

// ---------- camera ----------
function updateCamera(dt) {
  let src = null;
  if (GAME.attract || !PLAYER) {
    UI.attractT -= dt;
    let tgt = UI.attractTarget;
    if (!tgt || !tgt.alive || UI.attractT <= 0) { const al = ENTS.filter(e => e.alive); if (al.length) { tgt = al.sort((a, b) => (b.ai && b.ai.visible ? 1 : 0) - (a.ai && a.ai.visible ? 1 : 0))[Math.floor(Math.random() * Math.min(3, al.length))]; UI.attractTarget = tgt; UI.attractT = 7; } }
    if (tgt) {
      const yaw = tgt.yaw, [fx, , fz] = dirFrom(yaw, 0); const hx = tgt.x, hy = tgt.y + 1.75, hz = tgt.z;
      const back = 3.4; rayGrid(hx, hy, hz, -fx * .94, .34, -fz * .94, back); const dd = Math.max(.6, RAY.t - .3);
      const tx = hx - fx * dd * .94, ty = hy + dd * .34, tz = hz - fz * dd * .94; const k = 1 - Math.exp(-dt * 4);
      if (UI.camSnap) { CAM.x = tx; CAM.y = ty; CAM.z = tz; CAM.yaw = yaw; UI.camSnap = false; }
      CAM.x = lerp(CAM.x, tx, k); CAM.y = lerp(CAM.y, ty, k); CAM.z = lerp(CAM.z, tz, k);
      CAM.yaw += angDiff(CAM.yaw, yaw) * k; CAM.pitch = lerp(CAM.pitch, -.2 + tgt.pitch * .3, k);
    }
    CAM.fov = 70; CAMSRC = null; return;
  }
  const p = PLAYER;
  if (p.alive) src = p;
  else {
    p.specT -= dt;
    if (p.specT > 0) { CAM.y = lerp(CAM.y, p.y + 3.2, dt * 1.2); CAM.pitch = lerp(CAM.pitch, -1.0, dt * 1.2); CAMSRC = null; $('#spec').hidden = true; return; }
    if (!UI.specTarget || !UI.specTarget.alive) cycleSpec(1);
    src = UI.specTarget && UI.specTarget.alive ? UI.specTarget : null;
    const s = $('#spec'); if (src) { s.hidden = false; s.innerHTML = `Spectating <b class="${src.team.toLowerCase()}">${src.name}</b> · ${src.hp} HP · click to switch`; }
  }
  if (!src) { CAMSRC = null; return; }
  if (CAMSRC !== src) { CAMSRC = src; vmRebuild(); }
  const w = curW(src); if (w && VM.key !== w.k) vmRebuild();
  const pv = src.isPlayer ? .55 : .3;
  CAM.x = src.x; CAM.y = src.y + eyeH(src) + (src.eyeOff || 0); CAM.z = src.z;
  if (src.isPlayer) { CAM.yaw = src.yaw + src.punchY * pv; CAM.pitch = src.pitch + src.punchP * pv; }
  else { const k = 1 - Math.exp(-dt * 14); CAM.yaw += angDiff(CAM.yaw, src.yaw) * k; CAM.pitch = lerp(CAM.pitch, src.pitch, k); }
  if (SHAKE > .01) { CAM.x += (Math.random() - .5) * SHAKE * .2; CAM.y += (Math.random() - .5) * SHAKE * .2; CAM.pitch += (Math.random() - .5) * SHAKE * .05; }
  const tf = src.scope === 2 ? 12 : src.scope === 1 ? 36 : SET.fov; CAM.fov = lerp(CAM.fov, tf, 1 - Math.exp(-dt * 22));
}

// ---------- rendering ----------
let LIGHTVIEW = M4.n();
function setupLightMatrix() {
  const c = [G.W * CELL / 2, 0, G.H * CELL / 2], s = G.theme.sunDir; const e = [c[0] + s[0] * 140, c[1] + s[1] * 140, c[2] + s[2] * 140];
  M4.lookAt(LIGHTVIEW, e, c, Math.abs(s[1]) > .95 ? [0, 0, 1] : [0, 1, 0]);
  const h = Math.max(G.W, G.H) * CELL * .6; M4.ortho(TMPM, -h, h, -h, h, 30, 280); M4.mul(SHADOW.lvp, TMPM, LIGHTVIEW);
}
function setMat(P, m) {
  gl.uniform1i(P.u.uTex, 0); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, m.tex);
  gl.uniform3fv(P.u.uColor, m.color); gl.uniform3fv(P.u.uEmis, m.emis); gl.uniform1f(P.u.uBump, m.bump); gl.uniform1f(P.u.uSpec, m.spec); gl.uniform1f(P.u.uGlow, m.glow); gl.uniform2fv(P.u.uUVs, m.uvs);
}
const IDENT = M4.n();
function drawTree(P, nd, depth) {
  if (!nd.vis) return;
  if (nd.mesh) { gl.uniformMatrix4fv(P.u.uM, false, nd.w); if (!depth) setMat(P, nd.mat); gl.bindVertexArray(nd.mesh.vao); gl.drawElements(gl.TRIANGLES, nd.mesh.count, gl.UNSIGNED_INT, 0); }
  for (const k of nd.kids) drawTree(P, k, depth);
}
function dynamicNodes() {
  const list = [];
  for (const e of ENTS) { if (e === CAMSRC && e.alive) continue; if (!e.alive && e.deadT > 30) continue; list.push(e.model); }
  const b = GAME.bomb;
  if (BOMBNODE && (b.state === 'dropped' || b.state === 'planted')) { BOMBNODE.t = [b.x, b.y, b.z]; BOMBNODE.r = [0, b.yaw || 0, 0]; updNode(BOMBNODE, null); list.push(BOMBNODE); }
  for (const n of NADES) { n.node.t = [n.x, n.y, n.z]; n.node.r = [n.spin, n.spin * .3, 0]; updNode(n.node, null); list.push(n.node); }
  return list;
}
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, QUALITY.dpr) * (QUALITY.scale || 1);
  const w = Math.floor(cv.clientWidth * dpr), h = Math.floor(cv.clientHeight * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
}
const QUALITY = { scale: 1, shadows: true, max: 1, dpr: 1.5, parts: 2400 };
function render() {
  resize(); const th = G.theme; if (!th) return;
  M4.persp(PROJ, CAM.fov * Math.PI / 180, cv.width / cv.height, .05, 800);
  M4.trs(CAMW, CAM.x, CAM.y, CAM.z, CAM.pitch, CAM.yaw, 0, 1, 1, 1);
  M4.invert(VIEW, CAMW); M4.mul(VP, PROJ, VIEW); M4.invert(INVVP, VP);
  const dyn = dynamicNodes();
  // shadow pass
  if (QUALITY.shadows) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, SHADOW.fbo); gl.viewport(0, 0, SHADOW.size, SHADOW.size); gl.clear(gl.DEPTH_BUFFER_BIT);
    const D = PROG.depth; gl.useProgram(D.p); gl.uniformMatrix4fv(D.u.uLVP, false, SHADOW.lvp); gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
    for (const s of G.static) if (s.shadow) { gl.uniformMatrix4fv(D.u.uM, false, IDENT); gl.bindVertexArray(s.mesh.vao); gl.drawElements(gl.TRIANGLES, s.mesh.count, gl.UNSIGNED_INT, 0); }
    gl.disable(gl.CULL_FACE); for (const n of dyn) drawTree(D, n, true);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // sky
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  const S = PROG.sky; gl.useProgram(S.p);
  gl.uniformMatrix4fv(S.u.uInvVP, false, INVVP); gl.uniform3f(S.u.uCam, CAM.x, CAM.y, CAM.z);
  gl.uniform3fv(S.u.uTop, th.top); gl.uniform3fv(S.u.uHor, th.hor); gl.uniform3fv(S.u.uBot, th.bot); gl.uniform3fv(S.u.uSunDir, th.sunDir); gl.uniform3fv(S.u.uSunCol, th.sun); gl.uniform3fv(S.u.uFog, th.fog);
  gl.uniform1f(S.u.uExpo, th.expo); gl.uniform1f(S.u.uStars, th.stars);
  gl.bindVertexArray(null); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
  // lit
  const L = PROG.lit; gl.useProgram(L.p); litCommon(L, VP);
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  for (const s of G.static) { gl.uniformMatrix4fv(L.u.uM, false, IDENT); setMat(L, s.mat); gl.bindVertexArray(s.mesh.vao); gl.drawElements(gl.TRIANGLES, s.mesh.count, gl.UNSIGNED_INT, 0); }
  gl.disable(gl.CULL_FACE);
  if (GAME.bomb.state === 'planted') { const on = (GAME.bomb.ledT || 0) > 0; MAT.led.emis = on ? [6, .4, .2] : [.4, 0, 0]; }
  for (const n of dyn) drawTree(L, n, false);
  // transparent passes
  const camR = [CAMW[0], CAMW[1], CAMW[2]], camU = [CAMW[4], CAMW[5], CAMW[6]];
  gl.enable(gl.BLEND); gl.depthMask(false);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  if (decalDirty) { BB_DECAL.reset(); for (const s of G.siteDecals) { const h = s.size; BB_DECAL.quad([s.x - h, .015, s.z + h], [s.x + h, .015, s.z + h], [s.x + h, .015, s.z - h], [s.x - h, .015, s.z - h], s.cell, .85, .16, .1, .8); } for (const d of DECALS) BB_DECAL.quad(d.q[0], d.q[1], d.q[2], d.q[3], d.cell, d.col[0], d.col[1], d.col[2], d.a); decalDirty = false; BB_DECAL.dirty = true; }
  gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(-1, -4);
  BB_DECAL.draw(VP, camR, camU, TEX.atlas);
  gl.disable(gl.POLYGON_OFFSET_FILL);
  BB_ALPHA.reset(); BB_ADD.reset();
  for (const p of PARTS) { const f = 1 - p.t / p.life; const a = p.a * (p.add ? f : Math.min(1, f * 1.6)); (p.add ? BB_ADD : BB_ALPHA).sprite(p.x, p.y, p.z, p.size, p.cell, p.r, p.g, p.b, a, p.rot); }
  // smoke puffs, back to front
  const puffs = []; const sl = th.smoke;
  for (const s of SMOKES) for (const q of s.puffs) { const grow = clamp((s.t - q.delay) / 1.2, 0, 1); if (grow <= 0) continue; const x = s.x + q.ox * (.4 + .6 * grow), y = s.y + q.oy * grow, z = s.z + q.oz * (.4 + .6 * grow); const d = Math.hypot(x - CAM.x, y - CAM.y, z - CAM.z); puffs.push([d, x, y, z, q.size * (.5 + .5 * grow), q.cell, q.shade, s.dense * Math.min(1, (d - .3) / 2.5), q.rot + s.t * q.vr]); }
  puffs.sort((a, b) => b[0] - a[0]);
  for (const q of puffs) BB_ALPHA.sprite(q[1], q[2], q[3], q[4], q[5], q[6] * sl[0], q[6] * sl[1], q[6] * sl[2], .9 * Math.max(.15, q[7]), q[8]);
  BB_ALPHA.draw(VP, camR, camU, TEX.atlas);
  // additive
  for (const t of TRACERS) {
    const h = t.t * 380, a0 = Math.max(0, h - 7), a1 = Math.min(t.L, h); if (a1 <= a0) continue;
    const A = [t.s[0] + t.d[0] * a0, t.s[1] + t.d[1] * a0, t.s[2] + t.d[2] * a0], B = [t.s[0] + t.d[0] * a1, t.s[1] + t.d[1] * a1, t.s[2] + t.d[2] * a1];
    const mx = (A[0] + B[0]) / 2 - CAM.x, my = (A[1] + B[1]) / 2 - CAM.y, mz = (A[2] + B[2]) / 2 - CAM.z;
    let sx = t.d[1] * mz - t.d[2] * my, sy = t.d[2] * mx - t.d[0] * mz, sz = t.d[0] * my - t.d[1] * mx; const sl2 = Math.hypot(sx, sy, sz) || 1; const wdt = .012; sx = sx / sl2 * wdt; sy = sy / sl2 * wdt; sz = sz / sl2 * wdt;
    BB_ADD.quad([A[0] - sx, A[1] - sy, A[2] - sz], [B[0] - sx, B[1] - sy, B[2] - sz], [B[0] + sx, B[1] + sy, B[2] + sz], [A[0] + sx, A[1] + sy, A[2] + sz], 0, 1, .85, .55, .85, [0, .125, .25, 0]);
  }
  if (GAME.bomb.state === 'planted' && (GAME.bomb.ledT || 0) > 0) BB_ADD.sprite(GAME.bomb.x, GAME.bomb.y + .2, GAME.bomb.z, .35, 0, 1, .15, .1, .9);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); BB_ADD.draw(VP, camR, camU, TEX.atlas);
  gl.disable(gl.BLEND); gl.depthMask(true);
  // viewmodel
  if (CAMSRC && CAMSRC.alive && VM.node && !(CAMSRC.scope > 0)) {
    gl.clear(gl.DEPTH_BUFFER_BIT);
    M4.persp(PROJVM, 58 * Math.PI / 180, cv.width / cv.height, .01, 20); M4.mul(VPVM, PROJVM, VIEW);
    gl.useProgram(L.p); litCommon(L, VPVM);
    vmPose(); updNode(VM.node, CAMW); drawTree(L, VM.node, false);
    if (VM.flash > 0 && VM.tip) { BB_VM.reset(); const w = VM.tip.w; BB_VM.sprite(w[12], w[13], w[14], .16, 6, 1, .92, .75, 1, Math.random() * 6); gl.enable(gl.BLEND); gl.depthMask(false); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); BB_VM.draw(VPVM, camR, camU, TEX.atlas); gl.disable(gl.BLEND); gl.depthMask(true); }
  }
}
function litCommon(L, vp) {
  const th = G.theme;
  gl.uniformMatrix4fv(L.u.uVP, false, vp); gl.uniformMatrix4fv(L.u.uLVP, false, SHADOW.lvp);
  gl.uniform3fv(L.u.uSunDir, th.sunDir); gl.uniform3fv(L.u.uSunCol, th.sun); gl.uniform3fv(L.u.uSky, th.sky); gl.uniform3fv(L.u.uGround, th.ground); gl.uniform3fv(L.u.uFog, th.fog);
  gl.uniform1f(L.u.uFogD, th.fogD); gl.uniform3f(L.u.uCam, CAM.x, CAM.y, CAM.z); gl.uniform1f(L.u.uExpo, th.expo); gl.uniform1f(L.u.uShadowOn, QUALITY.shadows ? 1 : 0); gl.uniform1f(L.u.uAlpha, 1);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, SHADOW.tex); gl.uniform1i(L.u.uShadow, 1);
  const lights = G.lamps.slice().sort((a, b) => Math.hypot(a.x - CAM.x, a.z - CAM.z) - Math.hypot(b.x - CAM.x, b.z - CAM.z)).slice(0, 4).concat(DLIGHTS.slice(-4).map(d => ({ x: d.x, y: d.y, z: d.z, c: d.c.map(v => v * Math.min(1, d.life / .05 + .3)), r: d.r }))).slice(0, 8);
  const pp = new Float32Array(24), pc = new Float32Array(24), pr = new Float32Array(8);
  lights.forEach((l, i) => { pp.set([l.x, l.y, l.z], i * 3); pc.set(l.c, i * 3); pr[i] = l.r; });
  gl.uniform1i(L.u.uNPL, lights.length); gl.uniform3fv(L.u.uPLp, pp); gl.uniform3fv(L.u.uPLc, pc); gl.uniform1fv(L.u.uPLr, pr);
}
function vmPose() {
  const o = CAMSRC, w = curW(o); if (!w) return; const dt = UI.dt || .016;
  const k = w.k; const rifle = w.d.slot === 1;
  let px = rifle ? .19 : .17, py = rifle ? -.215 : -.16, pz = rifle ? -.4 : -.42, rx = rifle ? .02 : .04, ry = rifle ? .06 : .18, rz = rifle ? 0 : -.05;
  if (k === 'knife') { px = .2; py = -.2; pz = -.34; ry = .2; rx = .15; }
  if (w.d.nade) { px = .18; py = -.18; pz = -.32; }
  const hs = Math.hypot(o.vx, o.vz); VM.bob += hs * dt * 1.6;
  const bm = o.onGround ? Math.min(1, hs / 6) : .2;
  px += Math.sin(VM.bob) * .011 * bm; py += -Math.abs(Math.cos(VM.bob)) * .009 * bm;
  VM.swayX = lerp(VM.swayX, clamp(-VM.mdx * .0006, -.05, .05), 1 - Math.exp(-dt * 10)); VM.swayY = lerp(VM.swayY, clamp(VM.mdy * .0006, -.05, .05), 1 - Math.exp(-dt * 10)); VM.mdx = VM.mdy = 0;
  px += VM.swayX; py += VM.swayY; ry += VM.swayX * 2;
  VM.kick *= Math.exp(-dt * 14); pz += VM.kick * .5; rx += VM.kick * 1.6;
  if (o.reloadT > 0) { const T = w.d.reload || 2, pg = 1 - o.reloadT / T, dip = Math.sin(clamp(pg, 0, 1) * Math.PI); rx -= .5 * dip; rz += .6 * dip; py -= .08 * dip; }
  if (o.switchT > 0) { const s = clamp(o.switchT / .55, 0, 1); py -= .22 * s; rx -= .7 * s; }
  if (VM.swing > 0) { VM.swing = Math.max(0, VM.swing - dt * 3.2); const s = Math.sin(VM.swing * Math.PI); ry += s * 1.0; px -= s * .12; rx -= s * .3; }
  if (o.crouch > .5) py += .01;
  VM.flash -= dt;
  if (VM.ov) { const o2 = VM.ov[rifle ? 'r' : 'p']; if (o2) { px += o2[0]; py += o2[1]; pz += o2[2]; rx += o2[3]; ry += o2[4]; rz += o2[5]; } }
  VM.node.t = [px, py, pz]; VM.node.r = [rx, ry, rz];
}

// ---------- HUD update ----------
function fmtTime(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function uiUpdate(dt) {
  UI.dt = dt;
  if (UI.msgT > 0) { UI.msgT -= dt; if (UI.msgT <= 0) $('#cmsg').style.opacity = 0; }
  if (UI.hitT > 0) { UI.hitT -= dt; if (UI.hitT <= 0) $('#hitm').style.opacity = 0; }
  UI.vignT = Math.max(0, UI.vignT - dt * .9); $('#vign').style.opacity = UI.vignT.toFixed(2);
  if (GAME.mode !== 'play' || GAME.attract) return;
  const p = PLAYER, b = GAME.bomb;
  setText('#scT', String(GAME.score.T)); setText('#scCT', String(GAME.score.CT));
  const R = rules(), view = (CAMSRC && CAMSRC !== p) ? CAMSRC : p;
  setText('#rnd', R.rounds ? `ROUND ${GAME.round} · TO ${GAME.target}` : R.ladder ? `ARMS RACE · LEVEL ${Math.min((view?.gg || 0) + 1, GAME.ladder.length)}/${GAME.ladder.length}` : `TEAM DEATHMATCH · TO ${GAME.goal}`);
  const planted = b.state === 'planted';
  const tim = GAME.phase === 'freeze' ? GAME.phaseT : planted ? b.timer : GAME.roundT;
  setText('#timer', planted ? 'C4 ' + fmtTime(b.timer) : GAME.sudden ? 'OT' : fmtTime(tim));
  $('#clock').className = planted ? 'bomb' : GAME.phase === 'freeze' ? 'freeze' : '';
  const pips = tm => ENTS.filter(e => e.team === tm).map(e => `<i class="${e.alive ? '' : 'd'}${e.isPlayer ? ' me' : ''}"></i>`).join('');
  setText2('#pipT', pips('T')); setText2('#pipCT', pips('CT'));
  if (!p) return;
  const src = (CAMSRC && CAMSRC !== p) ? CAMSRC : p;
  setText('#hp', String(Math.max(0, Math.ceil(src.hp)))); setText('#ap', String(Math.ceil(src.armor)));
  $('#hp').parentElement.classList.toggle('low', src.hp <= 25);
  setText('#money', R.ladder ? '' : '$' + p.money); $('#money').hidden = !!R.ladder;
  $('#buyhint').style.opacity = canBuyNow() && p.alive ? 1 : 0;
  $('#flashFx').style.opacity = Math.min(1, (src.flash || 0) / 1.4).toFixed(2);
  $('#shield').hidden = !(src.alive && src.prot > GAME.now);
  const w = curW(src);
  setText('#wname', w ? w.d.name : '');
  setText('#mag', w && w.d.mag ? String(w.mag) : w && w.d.nade ? String(src.slots[4].length) : '—');
  setText('#res', w && w.d.mag ? '/ ' + w.res : '');
  $('#mag').classList.toggle('low', !!(w && w.d.mag && w.mag <= w.d.mag * .2));
  setText2('#inv', (src.helmet ? '<span class="chip">HELMET</span>' : '') + (src.kit ? '<span class="chip ct">KIT</span>' : '') + (src.hasBomb ? '<span class="chip bomb">C4</span>' : ''));
  setText2('#slots', [1, 2, 3, 4].map(s => { const x = s === 4 ? (src.slots[4][0] ? W[src.slots[4][0]] : null) : src.slots[s] ? src.slots[s].d : null; return x ? `<span class="${src.cur === s ? 'on' : ''}"><b>${s}</b>${SHORT[s === 4 ? src.slots[4][0] : src.slots[s].k]}</span>` : ''; }).join(''));
  // progress bar
  let prog = 0, lbl = '';
  if (p.alive && p.plantT > 0) { prog = p.plantT / 3.2; lbl = 'Planting'; }
  if (p.alive && p.defT > 0) { prog = p.defT / (p.kit ? 5 : 10); lbl = p.kit ? 'Defusing (kit)' : 'Defusing'; }
  $('#prog').hidden = !prog; if (prog) { $('#progFill').style.transform = `scaleX(${clamp(prog, 0, 1)})`; setText('#progLbl', lbl); }
  // hints
  let hint = '';
  if (!p.alive && !R.rounds && GAME.phase === 'live') hint = `Respawn in ${Math.max(1, Math.ceil(R.respawn - p.deadT))}`;
  if (p.alive && GAME.phase === 'live') {
    if (p.hasBomb && siteAt(p.x, p.z) && !p.plantT) hint = 'Hold E to plant';
    else if (p.hasBomb && !siteAt(p.x, p.z)) hint = 'Carry the bomb to site A or B';
    else if (p.team === 'CT' && planted && Math.hypot(p.x - b.x, p.z - b.z) < 1.6 && !p.defT) hint = 'Hold E to defuse';
  }
  setText('#hint', hint);
  // crosshair spread
  const sw = curW(p); let gap = 5;
  if (sw && !sw.d.melee && !sw.d.nade) { const hs = Math.hypot(p.vx, p.vz); gap = 4 + (sw.d.moveSpread * clamp((hs - 1.2) / 4, 0, 1) + (p.onGround ? 0 : .14) + p.recoil * sw.d.recoil * .22 + sw.d.spread) * 260 * (1 - .3 * p.crouch); }
  $('#xhair').style.setProperty('--gap', Math.min(40, gap).toFixed(1) + 'px');
  $('#xhair').style.opacity = (CAMSRC && CAMSRC.scope) || !p.alive && !CAMSRC ? 0 : 1;
  $('#scope').hidden = !(CAMSRC && CAMSRC.scope);
  if (!p.alive && CAMSRC) $('#death').hidden = true;
  // labels
  labelsUpdate();
  // radar
  UI.radarT -= dt; if (UI.radarT <= 0) { UI.radarT = 1 / 30; drawRadar(); }
  if (UI.board && Math.random() < .1) renderBoard();
}
function setText2(id, v) { if (UI.last[id] === v) return; UI.last[id] = v; $(id).innerHTML = v; }
function labelsUpdate() {
  const box = $('#labels'); const team = PLAYER.team; const mates = ENTS.filter(e => e.team === team && e !== PLAYER && e.alive && e !== CAMSRC);
  while (box.children.length < mates.length) box.appendChild(document.createElement('div'));
  [...box.children].forEach((el, i) => {
    const e = mates[i]; if (!e) { el.style.display = 'none'; return; }
    const x = e.x, y = e.y + 2.05, z = e.z; const cx = VP[0] * x + VP[4] * y + VP[8] * z + VP[12], cy = VP[1] * x + VP[5] * y + VP[9] * z + VP[13], cw = VP[3] * x + VP[7] * y + VP[11] * z + VP[15];
    if (cw < .1) { el.style.display = 'none'; return; }
    const sx = (cx / cw * .5 + .5) * cv.clientWidth, sy = (1 - (cy / cw * .5 + .5)) * cv.clientHeight; const d = Math.hypot(x - CAM.x, z - CAM.z);
    el.style.display = 'block'; el.style.transform = `translate(${sx.toFixed(0)}px,${sy.toFixed(0)}px) translate(-50%,-100%)`; el.style.opacity = d > 60 ? 0 : 1;
    const t = e.name + (e.hasBomb ? ' · C4' : ''); if (el.textContent !== t) el.textContent = t; el.className = 'lab ' + team.toLowerCase();
  });
}

// ---------- radar ----------
let RADARBG = null;
function makeRadarBG(map, px = 6) {
  const c = document.createElement('canvas'); c.width = G.W * px; c.height = G.H * px; const x = c.getContext('2d');
  x.fillStyle = '#14181a'; x.fillRect(0, 0, c.width, c.height);
  for (let j = 0; j < G.H; j++) for (let i = 0; i < G.W; i++) {
    const t = G.type[idx(i, j)]; if (t === 1) continue;
    x.fillStyle = t === 0 ? (G.site[idx(i, j)] ? '#5a4a3a' : '#3f4648') : t === 7 ? '#2c3133' : '#596064'; x.fillRect(i * px, j * px, px, px);
  }
  x.font = `800 ${px * 3}px "Saira Condensed", sans-serif`; x.fillStyle = 'rgba(255,190,90,.85)'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const [s, r] of Object.entries(G.def.sites)) x.fillText(s, (r[0] + r[2] / 2) * px, (r[1] + r[3] / 2) * px);
  return c;
}
function drawRadar() {
  const c = $('#radar'), x = c.getContext('2d'); const S = c.width, k = 6 / CELL * 1.1; // px per meter
  if (!RADARBG || RADARBG.key !== G.key) { RADARBG = makeRadarBG(); RADARBG.key = G.key; }
  x.clearRect(0, 0, S, S); x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.clip();
  x.fillStyle = '#0d1012'; x.fillRect(0, 0, S, S);
  x.translate(S / 2, S / 2); x.rotate(CAM.yaw); x.translate(-CAM.x * k, -CAM.z * k);
  x.drawImage(RADARBG, 0, 0, G.W * CELL * k, G.H * CELL * k);
  const team = PLAYER.team; const dot = (e, col, r = 4) => { x.fillStyle = col; x.beginPath(); x.arc(e.x * k, e.z * k, r, 0, TAU); x.fill(); };
  for (const s of SMOKES) { x.fillStyle = 'rgba(200,200,200,.35)'; x.beginPath(); x.arc(s.x * k, s.z * k, s.r * k * s.dense, 0, TAU); x.fill(); }
  for (const e of ENTS) {
    if (e === CAMSRC && e.alive) continue;
    const mate = e.team === team; const col = e.team === 'T' ? '#f0a43a' : '#5aa9ff';
    if (!e.alive) { if (mate) { x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(e.x * k - 3, e.z * k - 3); x.lineTo(e.x * k + 3, e.z * k + 3); x.moveTo(e.x * k + 3, e.z * k - 3); x.lineTo(e.x * k - 3, e.z * k + 3); x.stroke(); } continue; }
    if (mate || GAME.now - e.spotT < 1.5) { dot(e, mate ? col : '#ff4b3a', 4.2); if (mate) { const [fx, , fz] = dirFrom(e.yaw, 0); x.strokeStyle = col; x.lineWidth = 1.5; x.beginPath(); x.moveTo(e.x * k, e.z * k); x.lineTo((e.x + fx * 2.2) * k, (e.z + fz * 2.2) * k); x.stroke(); } }
  }
  const b = GAME.bomb; if ((b.state === 'dropped' || b.state === 'planted' || (b.state === 'carried' && team === 'T')) && b.x) { x.fillStyle = b.state === 'planted' ? '#ff3b2f' : '#ffd25a'; x.fillRect(b.x * k - 3.5, b.z * k - 3.5, 7, 7); }
  x.restore();
  // self arrow
  x.fillStyle = '#fff'; x.beginPath(); x.moveTo(S / 2, S / 2 - 7); x.lineTo(S / 2 + 5, S / 2 + 5); x.lineTo(S / 2, S / 2 + 2); x.lineTo(S / 2 - 5, S / 2 + 5); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 2; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.stroke();
}

// ---------- menu ----------
const CFG = { map: store.get('map', 'sandline'), team: store.get('team', 'CT'), diff: store.get('diff', 'normal'), target: store.get('target', 8), mode: store.get('mode', 'bomb') };
if (!MAPS[CFG.map]) CFG.map = 'sandline';
if (!MODES[CFG.mode]) CFG.mode = 'bomb';
const MODE_INFO = {
  bomb: 'Plant or defuse the bomb. Buy between rounds.',
  elim: 'Rounds without a bomb: the last team standing wins.',
  tdm: 'Respawn after 3 s, pick any gun, first team to the kill limit wins.',
  gungame: 'Every kill swaps your gun for the next one. Finish with a knife kill.',
};
const TARGET_LABEL = { bomb: ['First to 5', 'First to 8'], elim: ['First to 5', 'First to 8'], tdm: ['40 kills', '75 kills'], gungame: ['Short · 6 guns', 'Full · 12 guns'] };
let menuBuilt = '';
function menuInit() {
  const maps = $('#mapPick');
  // thumbnails are drawn once; later calls only move the highlight
  if (menuBuilt !== Object.keys(MAPS).join()) {
    maps.innerHTML = '';
    for (const [k, m] of Object.entries(MAPS)) {
      const b = document.createElement('button'); b.className = 'mapcard'; b.dataset.k = k; b.title = m.blurb;
      b.innerHTML = `<canvas width="88" height="80"></canvas><b>${m.name}</b>`;
      b.onclick = () => { if (CFG.map === k) return; CFG.map = k; store.set('map', k); menuInit(); startAttract(); };
      maps.appendChild(b); drawMini(b.querySelector('canvas'), m);
    }
    menuBuilt = Object.keys(MAPS).join();
  }
  maps.querySelectorAll('.mapcard').forEach(b => b.classList.toggle('on', b.dataset.k === CFG.map));
  $('#mapBlurb').textContent = MAPS[CFG.map].blurb;
  $('#modeInfo').textContent = MODE_INFO[CFG.mode];
  document.querySelectorAll('[data-target]').forEach((el, i) => { el.textContent = TARGET_LABEL[CFG.mode][i]; });
  $('#sideGrp').hidden = false;
  for (const grp of ['team', 'diff', 'target', 'mode']) document.querySelectorAll(`[data-${grp}]`).forEach(el => {
    el.classList.toggle('on', String(CFG[grp]) === el.dataset[grp]);
    el.onclick = () => { const was = CFG.mode; CFG[grp] = grp === 'target' ? +el.dataset[grp] : el.dataset[grp]; store.set(grp, CFG[grp]); menuInit(); if (grp === 'mode' && was !== CFG.mode) startAttract(); };
  });
}
function drawMini(c, m) {
  const x = c.getContext('2d'); const sv = { W: G.W, H: G.H, type: G.type, site: G.site, def: G.def };
  buildGrid(m); const px = Math.min(c.width / G.W, c.height / G.H); x.clearRect(0, 0, c.width, c.height);
  for (let j = 0; j < G.H; j++) for (let i = 0; i < G.W; i++) { const t = G.type[idx(i, j)]; if (t === 1) continue; x.fillStyle = G.site[idx(i, j)] ? '#c98a3e' : t === 0 ? '#8d8a80' : '#5f5d57'; x.fillRect(i * px, j * px, px + .2, px + .2); }
  if (sv.def) { buildGrid(sv.def); }
}
function startAttract() {
  GAME.mode = 'play'; GAME.paused = false;
  newMatch({ map: CFG.map, diff: 'normal', attract: true, target: 99, mode: CFG.mode });
  UI.camSnap = true; UI.attractTarget = null;
}
function startGame(fromClick = true) {
  if (NET.role === 'guest') return;
  audioInit();
  $('#menu').hidden = true; $('#hud').hidden = false; $('#over').hidden = true;
  GAME.mode = 'play'; GAME.paused = false;
  newMatch({ map: CFG.map, team: CFG.team === 'auto' ? pick(['T', 'CT']) : CFG.team, diff: CFG.diff, target: CFG.target, mode: CFG.mode });
  $('#feed').innerHTML = ''; UI.last = {};
  FALLBACK = false; if (fromClick !== false) lockPointer();
}
// Leaving a network match: the host sends everybody back to the server lobby, a guest leaves the server.
function toMenu(save = true) {
  if (save && playing()) saveMatch(true);
  if (NET.socket && NET.role === 'host') { netSend({ type: 'end' }); backToLobby(); return; }
  disconnectLAN();
  leaveMatchView();
}
function leaveMatchView() {
  if (LOCKED) document.exitPointerLock(); hidePause(); UI.buy = false; $('#buy').hidden = true; $('#over').hidden = true; $('#hud').hidden = true; $('#menu').hidden = false;
  startAttract();
}
$('#deploy').onclick = startGame;
$('#resume').onclick = () => { audioInit(); lockPointer(); if (FALLBACK) hidePause(); };
$('#leave').onclick = toMenu;
$('#again').onclick = startGame; $('#overMenu').onclick = toMenu;
$('#buyClose').onclick = closeBuy;
// ---------- touch controls ----------
// Phones and tablets: a stick where the left thumb lands, drag anywhere else to look, buttons for the rest.
// The controls feed the same KEYS / MOUSE state the keyboard and mouse use.
const TOUCH = { on: false, stick: null, look: null, fire: null, origin: [0, 0] };
function touchMode() {
  if (TOUCH.on) return;
  TOUCH.on = true; document.body.classList.add('touch');
  if (document.pointerLockElement) document.exitPointerLock();
  FALLBACK = true; touchShow();
}
function touchShow() { $('#touch').hidden = !(TOUCH.on && playing() && !UI.pauseOpen && !UI.buy && GAME.phase !== 'over'); }
function stickKeys(dx, dy) {
  const l = Math.hypot(dx, dy), dead = 18;
  KEYS.KeyW = dy < -dead && Math.abs(dy) > l * .38; KEYS.KeyS = dy > dead && Math.abs(dy) > l * .38;
  KEYS.KeyA = dx < -dead && Math.abs(dx) > l * .38; KEYS.KeyD = dx > dead && Math.abs(dx) > l * .38;
  // a short push walks quietly
  KEYS.ShiftLeft = l > dead && l < 45;
}
function touchLook(dx, dy) {
  if (!PLAYER || !PLAYER.alive || uiBlocking()) return;
  const z = PLAYER.scope === 2 ? .2 : PLAYER.scope === 1 ? .45 : 1, k = .0042 * SENS * z;
  PLAYER.yaw -= dx * k; PLAYER.pitch = clamp(PLAYER.pitch - dy * k, -1.5, 1.5);
  VM.mdx += dx; VM.mdy += dy;
}
function touchAction(t, down) {
  const p = PLAYER;
  if (t === 'fire') { MOUSE.l = down; if (down) { MOUSE.lPress = true; audioInit(); if (p && !p.alive) cycleSpec(1); } return; }
  if (t === 'jump') { KEYS.Space = down; return; }
  if (t === 'crouch') { KEYS.KeyC = down; return; }
  if (t === 'use') { KEYS.KeyE = down; return; }
  if (t === 'board') { UI.board = down; if (down) renderBoard(); $('#board').hidden = !down; return; }
  if (!down) return;
  if (t === 'pause') { showPause(); touchShow(); return; }
  if (!p || !p.alive) return;
  if (t === 'reload') startReload(p);
  if (t === 'alt') altFire(p);
  if (t === 'swap') { const order = [1, 2, 3, 4].filter(s => s === 3 || (s === 4 ? p.slots[4].length : p.slots[s])); setSlot(p, order[(order.indexOf(p.cur) + 1) % order.length]); }
  if (t === 'buy') { if (UI.buy) closeBuy(); else if (canBuyNow()) openBuy(); else uiMsg(rules().ladder ? 'No shop in arms race' : 'Buy time is over', 1.2); }
}
addEventListener('touchstart', touchMode, { passive: true, capture: true });
$('#touch').addEventListener('pointerdown', ev => {
  ev.preventDefault();
  const btn = ev.target.closest('.tb');
  try { $('#touch').setPointerCapture(ev.pointerId); } catch {}
  if (btn) {
    btn.classList.add('on');
    const t = btn.dataset.t; btn.dataset.pid = ev.pointerId;
    if (t === 'fire') TOUCH.fire = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
    touchAction(t, true); return;
  }
  if (ev.clientX < innerWidth * .42 && !TOUCH.stick) {
    TOUCH.stick = ev.pointerId; TOUCH.origin = [ev.clientX, ev.clientY];
    const st = $('#tStick'); st.hidden = false; st.style.left = ev.clientX + 'px'; st.style.top = ev.clientY + 'px'; st.firstChild.style.transform = '';
  } else if (!TOUCH.look) TOUCH.look = { id: ev.pointerId, x: ev.clientX, y: ev.clientY };
});
$('#touch').addEventListener('pointermove', ev => {
  if (ev.pointerId === TOUCH.stick) {
    let dx = ev.clientX - TOUCH.origin[0], dy = ev.clientY - TOUCH.origin[1]; const l = Math.hypot(dx, dy), max = 60;
    if (l > max) { dx *= max / l; dy *= max / l; }
    $('#tStick').firstChild.style.transform = `translate(${dx}px,${dy}px)`; stickKeys(dx, dy);
  }
  for (const k of ['look', 'fire']) {
    const t = TOUCH[k];
    if (t && t.id === ev.pointerId) { touchLook(ev.clientX - t.x, ev.clientY - t.y); t.x = ev.clientX; t.y = ev.clientY; }
  }
});
function touchEnd(ev) {
  if (ev.pointerId === TOUCH.stick) { TOUCH.stick = null; $('#tStick').hidden = true; stickKeys(0, 0); }
  if (TOUCH.look?.id === ev.pointerId) TOUCH.look = null;
  if (TOUCH.fire?.id === ev.pointerId) TOUCH.fire = null;
  for (const b of document.querySelectorAll('#touch .tb')) if (b.dataset.pid === String(ev.pointerId)) { b.classList.remove('on'); delete b.dataset.pid; touchAction(b.dataset.t, false); }
}
$('#touch').addEventListener('pointerup', touchEnd);
$('#touch').addEventListener('pointercancel', touchEnd);
setInterval(touchShow, 250);

// ---------- settings ----------
const SET = Object.assign({ fov: 74, xc: '#7dffb0', xl: 8, xdot: false, quality: 'high', fps: false }, store.get('settings', {}));
const XCOLORS = ['#7dffb0', '#ffffff', '#ffe14d', '#4de8ff', '#ff5a5a', '#ff7ae0'];
const QPRESETS = { low: { max: .6, dpr: 1, shadows: false, parts: 900 }, medium: { max: .85, dpr: 1.25, shadows: true, parts: 1600 }, high: { max: 1, dpr: 1.5, shadows: true, parts: 2400 } };
function applySettings(save = true) {
  if (save) store.set('settings', SET);
  for (const el of [$('#xhair'), $('#xhPreview')]) { el.style.setProperty('--xc', SET.xc); el.style.setProperty('--xl', SET.xl + 'px'); el.classList.toggle('dot', SET.xdot); }
  const q = QPRESETS[SET.quality] || QPRESETS.high;
  Object.assign(QUALITY, { max: q.max, dpr: q.dpr, parts: q.parts, shadows: q.shadows }); QUALITY.scale = Math.min(QUALITY.scale, q.max);
  $('#fpsBox').hidden = !SET.fps;
  $('#setFov').value = SET.fov; $('#setFovV').textContent = SET.fov + '°';
  $('#setXc').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === SET.xc));
  $('#setXs').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === SET.xl));
  $('#setQ').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === SET.quality));
  $('#setXdot').checked = SET.xdot; $('#setFps').checked = SET.fps;
  $('#setSens').value = SENS; $('#setSensV').textContent = (+SENS).toFixed(2);
  $('#setVol').value = AU.vol; $('#setVolV').textContent = Math.round(AU.vol * 100) + '%';
}
$('#setXc').innerHTML = XCOLORS.map(c => `<button type="button" data-v="${c}" aria-label="${c}"><i style="background:${c}"></i></button>`).join('');
$('#setXc').onclick = ev => { const b = ev.target.closest('button'); if (b) { SET.xc = b.dataset.v; applySettings(); } };
$('#setXs').onclick = ev => { const b = ev.target.closest('button'); if (b) { SET.xl = +b.dataset.v; applySettings(); } };
$('#setQ').onclick = ev => { const b = ev.target.closest('button'); if (b) { SET.quality = b.dataset.v; applySettings(); } };
$('#setXdot').onchange = () => { SET.xdot = $('#setXdot').checked; applySettings(); };
$('#setFps').onchange = () => { SET.fps = $('#setFps').checked; applySettings(); };
$('#setFov').oninput = () => { SET.fov = +$('#setFov').value; applySettings(); };
$('#setSens').oninput = () => { SENS = +$('#setSens').value; store.set('sens', SENS); sensEl.value = SENS; $('#sensV').textContent = SENS.toFixed(2); applySettings(false); };
$('#setVol').oninput = () => { AU.vol = +$('#setVol').value; store.set('vol', AU.vol); volEl.value = AU.vol; if (AU.out) AU.out.gain.value = AU.vol; applySettings(false); };
$('#setOpen').onclick = $('#pauseSettings').onclick = () => { applySettings(false); $('#settings').hidden = false; };
$('#setClose').onclick = () => { $('#settings').hidden = true; };
const sensEl = $('#sens'), volEl = $('#vol');
sensEl.value = SENS; volEl.value = AU.vol; $('#sensV').textContent = (+SENS).toFixed(2);
sensEl.oninput = () => { SENS = +sensEl.value; store.set('sens', SENS); $('#sensV').textContent = SENS.toFixed(2); };
volEl.oninput = () => { AU.vol = +volEl.value; store.set('vol', AU.vol); if (AU.out) AU.out.gain.value = AU.vol; };

// ---------- main loop ----------
let lastT = performance.now(), fpsAcc = 0, fpsN = 0;
function step(dt) {
  if (NET.role === 'guest') { fireFx(dt); updateFx(dt); for (const e of ENTS) updateCharModel(e, dt); return; }
  updateRemotes(dt);
  GAME.now += dt;
  if (GAME.phase !== 'over') updateRound(dt);
  updatePlayer(dt);
  for (const e of ENTS) { timers(e, dt); if (e.bot && e.alive) aiUpdate(e, dt); else if (!e.alive) e.deadT += dt; }
  separate();
  updateNades(dt); updateSmokes(dt); updateFires(dt); fireFx(dt); updateFx(dt);
  for (const e of ENTS) updateCharModel(e, dt);
}
// The bot match behind the menu, a background window or a slow GPU must not hog the whole machine:
// an overloaded integrated GPU stalls the desktop and makes the mouse look stuck.
let frameGate = 0, fpsShowAcc = 0, fpsShowN = 0;
function frameBudget() {
  if (document.hidden || !document.hasFocus()) return 1 / 10;
  if (!playing()) return 1 / 30;
  return 0;
}
function frame(t) {
  requestAnimationFrame(frame);
  const budget = frameBudget();
  if (budget && (t - frameGate) / 1000 < budget - .004) return;
  frameGate = t;
  const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
  try {
    if (!GAME.paused && GAME.mode === 'play' && NET.role !== 'host') step(dt);
    if (GAME.mode === 'play') updateCamera(dt);
    render(); uiUpdate(dt);
  } catch (err) { console.error(err); window.__err = String(err && err.stack || err); }
  // adaptive resolution
  fpsShowAcc += dt; fpsShowN++;
  if (fpsShowAcc > .5) { if (SET.fps) $('#fpsBox').textContent = Math.round(fpsShowN / fpsShowAcc) + ' FPS'; fpsShowAcc = 0; fpsShowN = 0; }
  if (!budget) {
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 2) {
      const fps = fpsN / fpsAcc;
      if (fps < 40 && QUALITY.scale > .5) QUALITY.scale -= .1;
      else if (fps < 25 && QUALITY.shadows) QUALITY.shadows = false; // last resort on very weak GPUs
      else if (fps > 58 && QUALITY.scale < QUALITY.max) QUALITY.scale = Math.min(QUALITY.max, QUALITY.scale + .05);
      fpsAcc = 0; fpsN = 0;
    }
  }
}
function boot() {
  if (!glInit(cv)) { $('#nogl').hidden = false; $('#menu').hidden = true; return; }
  buildPrograms(); makeShadow(); buildBaseMeshes(); buildCommonTextures();
  BB_ALPHA = new BBBatch(3500); BB_ADD = new BBBatch(2500); BB_DECAL = new BBBatch(600); BB_VM = new BBBatch(4);
  menuInit(); applySettings(false); startAttract();
  if (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) $('#touchNote').hidden = false;
  requestAnimationFrame(frame);
}
// ---------- accounts, checkpoints and host-authoritative LAN ----------
const NET = { role: null, socket: null, peers: new Map(), verified: new Map(), id: null, tick: 0 };
let account = null, saved = null, saving = false, authMode = 'login', serverUp = true;
const status = text => { $('#serviceStatus').textContent = text; };
const cleanName = name => String(name || 'Player').replace(/[^\p{L}\p{N}_ -]/gu, '').slice(0, 24) || 'Player';
const API_ERRORS = {
  name_invalid: 'Имя: 3–24 буквы, цифры, _ или -',
  name_mixed: 'Имя не может смешивать латиницу и кириллицу',
  name_taken: 'Это имя уже занято',
  password_invalid: 'Пароль: от 8 до 128 символов',
  password_has_name: 'Пароль не должен содержать имя',
  password_same: 'Новый пароль совпадает со старым',
  bad_credentials: 'Неверное имя или пароль',
  wrong_password: 'Неверный пароль',
  rate_limited: 'Слишком много попыток. Подождите и попробуйте снова',
  unauthorized: 'Сессия истекла. Войдите снова',
  bad_save: 'Сервер отклонил сохранение',
  too_large: 'Файл слишком большой',
  bad_image: 'Не удалось загрузить изображение',
};
const NO_SERVER = 'Нет связи с сервером игры';
// Accounts are shared: one site keeps them for every server. When this page comes from that site the
// session is a cookie; a page from a home server talks to the site with a token kept in this browser.
const DEFAULT_AUTH = 'https://breachline-kumw.onrender.com';
const ACC = { base: '', remote: false, ready: null };
const tokenKey = () => 'bl_token_' + ACC.base;
function accToken() { try { return localStorage.getItem(tokenKey()) || ''; } catch { return ''; } }
function setAccToken(t) { try { t ? localStorage.setItem(tokenKey(), t) : localStorage.removeItem(tokenKey()); } catch {} }
ACC.ready = (async () => {
  try {
    const ping = await (await fetch('/api/ping', { cache: 'no-store' })).json();
    if (ping.auth) { ACC.base = ping.auth; ACC.remote = true; }
  } catch { ACC.base = DEFAULT_AUTH; ACC.remote = true; } // opened as a file or from a static host
})();
async function api(route, method = 'GET', data) {
  await ACC.ready;
  let response;
  const headers = method === 'GET' ? {} : { 'Content-Type': 'application/json' };
  if (ACC.remote) { headers['X-Breachline-Client'] = 'token'; const t = accToken(); if (t) headers.Authorization = 'Bearer ' + t; }
  try {
    response = await fetch(ACC.base + '/api/' + route, { method, credentials: ACC.remote ? 'omit' : 'same-origin', headers, body: method === 'GET' ? undefined : JSON.stringify(data || {}) });
  } catch { throw Error(NO_SERVER); }
  // A static host answers /api/* with an HTML page or 404 instead of JSON.
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw Error(NO_SERVER);
  const result = await response.json();
  if (ACC.remote && result.token) setAccToken(result.token);
  if (!response.ok) {
    if (result.error === 'unauthorized' && account) { account = null; setAccToken(''); loadAccountSave(); }
    throw Object.assign(Error(API_ERRORS[result.error] || 'Ошибка сервера'), { code: result.error });
  }
  return result;
}

// ---- avatars: a built-in emblem (icon × colour) or an uploaded picture
const AVATAR_COLORS = ['#b8432f', '#d9822b', '#c9a227', '#4d9a3f', '#1f8f86', '#3478c6', '#7b4bb3', '#5d6872'];
const AVATAR_ICONS = [
  '<circle cx="20" cy="20" r="9" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M20 6v8M20 26v8M6 20h8M26 20h8" stroke="#fff" stroke-width="2.6"/>',
  '<polygon points="20,7 23.8,16 33,16.6 26,22.6 28.2,32 20,27 11.8,32 14,22.6 7,16.6 16.2,16" fill="#fff"/>',
  '<polygon points="22,5 10,22 19,22 16,35 30,16 21,16" fill="#fff"/>',
  '<path d="M20 6l12 4v10c0 7-6 12-12 15-6-3-12-8-12-15V10z" fill="#fff"/>',
  '<polygon points="20,6 33,20 20,34 7,20" fill="#fff"/>',
  '<circle cx="18" cy="23" r="10" fill="#fff"/><path d="M24 15l4-4m0 0c2-2 5-1 5 1" stroke="#fff" stroke-width="2.4" fill="none"/>',
  '<path d="M9 24l11-8 11 8M9 31l11-8 11 8" stroke="#fff" stroke-width="3.2" fill="none"/>',
  '<polygon points="8,29 10,13 16,21 20,10 24,21 30,13 32,29" fill="#fff"/>',
];
const GUEST_ICON = '<circle cx="20" cy="15" r="6" fill="#9da39f"/><path d="M8 34c1-7 6-10 12-10s11 3 12 10z" fill="#9da39f"/>';
const emblem = (icon, color) => `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="${AVATAR_COLORS[color] || '#333'}"/>${AVATAR_ICONS[icon] || ''}</svg>`;
function avatarHTML(user) {
  if (!user) return `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" fill="#2a3032"/>${GUEST_ICON}</svg>`;
  const a = user.avatar || {};
  return a.image ? `<img alt="" src="${ACC.base}/api/avatar/${user.id}?v=${a.v}">` : emblem(a.icon, a.color);
}
function renderPickers() {
  const a = account?.avatar || {};
  $('#iconPick').innerHTML = AVATAR_ICONS.map((_, i) => `<button type="button" data-icon="${i}" class="${!a.image && a.icon === i ? 'on' : ''}" aria-label="${i + 1}">${emblem(i, a.color ?? 0)}</button>`).join('');
  $('#colorPick').innerHTML = AVATAR_COLORS.map((c, i) => `<button type="button" data-color="${i}" class="${!a.image && a.color === i ? 'on' : ''}" aria-label="${i + 1}"><span class="sw" style="background:${c}"></span></button>`).join('');
  $('#avatarReset').hidden = !a.image;
}
// ---- ranks: a name for every level band
const RANKS = [[1, 'Recruit'], [3, 'Private'], [6, 'Corporal'], [10, 'Sergeant'], [15, 'Staff Sergeant'], [20, 'Lieutenant'], [26, 'Captain'], [33, 'Major'], [41, 'Colonel'], [50, 'General']];
const rankOf = level => RANKS.filter(r => level >= r[0]).pop()[1];
function renderRank() {
  if (!account) return;
  const lvl = account.level || 1;
  $('#rankName').textContent = '★ ' + tr(rankOf(lvl));
  $('#rankLvl').textContent = tr('Level %d').replace('%d', lvl);
  $('#xpFill').style.width = Math.min(100, 100 * (account.into || 0) / (account.need || 500)).toFixed(1) + '%';
  $('#xpText').textContent = tr('%a of %b experience to the next level').replace('%a', account.into || 0).replace('%b', account.need || 500);
}
function renderStats() {
  renderRank();
  const s = account?.stats || { matches: 0, wins: 0, kills: 0, deaths: 0 };
  const cell = (value, label) => `<div><b>${value}</b><span>${label}</span></div>`;
  $('#statsBox').innerHTML = cell(s.matches, 'Матчи') + cell(s.wins, 'Победы') + cell(s.matches ? Math.round(s.wins / s.matches * 100) + '%' : '—', 'Доля побед') +
    cell(s.kills, 'Убийства') + cell(s.deaths, 'Смерти') + cell(s.deaths ? (s.kills / s.deaths).toFixed(2) : s.kills ? s.kills.toFixed(2) : '—', 'У/С');
}
async function setAvatar(route, data) {
  try { account = (await api(route, 'PUT', data)).user; refreshAccount(); acMsg(''); } catch (e) { acMsg(e.message, true); }
}
$('#iconPick').onclick = ev => { const b = ev.target.closest('[data-icon]'); if (b) setAvatar('profile', { avatar: { icon: +b.dataset.icon, color: account.avatar.color ?? 0 } }); };
$('#colorPick').onclick = ev => { const b = ev.target.closest('[data-color]'); if (b) setAvatar('profile', { avatar: { icon: account.avatar.icon ?? 0, color: +b.dataset.color } }); };
$('#avatarReset').onclick = () => setAvatar('profile', { avatar: { icon: account.avatar.icon ?? 0, color: account.avatar.color ?? 0 } });
$('#avatarFile').onchange = async ev => {
  const file = ev.target.files[0]; ev.target.value = '';
  if (!file) return;
  try {
    // Crop to a centred square and shrink to 128 px so the upload stays a few kilobytes.
    const img = await createImageBitmap(file), side = Math.min(img.width, img.height), c = document.createElement('canvas');
    c.width = c.height = 128;
    c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);
    let image = c.toDataURL('image/webp', .85);
    if (!image.startsWith('data:image/webp')) image = c.toDataURL('image/png');
    await setAvatar('avatar', { image });
  } catch { acMsg(API_ERRORS.bad_image, true); }
};

// ---- account window
function acMsg(text, error = false) { const m = $('#accountMsg'); m.textContent = text; m.hidden = !text; m.classList.toggle('err', error); }
function openAccount() { acMsg(''); refreshAccount(); $('#account').hidden = false; (account ? $('#accountClose') : $('#username')).focus(); }
function closeAccount() { $('#account').hidden = true; $('#accountBtn').focus(); }
$('#accountBtn').onclick = openAccount;
$('#accountClose').onclick = closeAccount;
$('#account').addEventListener('mousedown', ev => { if (ev.target === ev.currentTarget) closeAccount(); });
addEventListener('keydown', ev => { if (ev.code === 'Escape' && !$('#account').hidden) { ev.stopImmediatePropagation(); closeAccount(); } }, true);

function saveKey() { return 'bl_checkpoint_' + (account ? 'u_' + account.id : 'guest'); }
function readLocalSave() {
  try {
    let text = localStorage.getItem(saveKey());
    // Saves made before accounts had ids were keyed by name.
    const legacy = account && 'bl_checkpoint_' + account.name;
    if (!text && legacy && (text = localStorage.getItem(legacy))) { localStorage.setItem(saveKey(), text); localStorage.removeItem(legacy); }
    return JSON.parse(text || 'null');
  } catch { return null; }
}
function refreshAccount() {
  // Only the "Guest" placeholder is translated, never a player's name.
  for (const id of ['#accountName', '#accountTitle']) { $(id).classList.toggle('guest', !account); $(id).textContent = account ? account.name : 'Гость'; }
  $('#accountAva').innerHTML = $('#profileAva').innerHTML = avatarHTML(account);
  $('#accountBtn').classList.toggle('offline', !serverUp);
  $('#accountBtn small').textContent = !serverUp ? 'Нет сервера' : account ? `${tr('Lvl')} ${account.level || 1} · ${tr(rankOf(account.level || 1))}` : 'Войти';
  $('#accountKind').textContent = account ? 'Профиль' : 'Аккаунт';
  $('#offline').hidden = serverUp;
  $('#authPane').hidden = !!account; $('#profilePane').hidden = !account;
  for (const el of $('#authForm').elements) el.disabled = !serverUp;
  $('#sinceRow').hidden = !account;
  $('#accountSince').textContent = account ? new Date(account.created).toLocaleDateString() : '';
  $('#accountUser').value = account ? account.name : '';
  const register = authMode === 'register';
  document.querySelectorAll('[data-auth]').forEach(b => b.classList.toggle('on', b.dataset.auth === authMode));
  $('#confirmRow').hidden = $('#authHint').hidden = !register; $('#password2').required = register;
  $('#password').autocomplete = register ? 'new-password' : 'current-password';
  $('#authSubmit').textContent = register ? 'Создать аккаунт' : 'Войти';
  if (account) { renderPickers(); renderStats(); }
  $('#continue').disabled = !saved;
  $('#saveInfo').textContent = saved ? new Date(saved.date).toLocaleString() : 'Нет сохранения';
}
async function loadAccountSave() {
  saved = readLocalSave();
  if (account) {
    try { const remote = (await api('save')).save; if (remote && (!saved || remote.date > saved.date)) saved = remote; }
    catch (e) { status(e.message); }
  }
  refreshAccount();
}
function signedIn(user, text) {
  account = user;
  for (const id of ['password', 'password2', 'currentPassword', 'newPassword', 'newPassword2', 'deletePassword']) $('#' + id).value = '';
  acMsg(text); status(text);
  return loadAccountSave();
}
// Run a form action with its submit button locked so a double click cannot send it twice.
function guard(form, action) {
  form.onsubmit = async ev => {
    ev.preventDefault();
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await action(); } catch (e) { acMsg(e.message, true); } finally { button.disabled = !serverUp && form.id === 'authForm'; }
  };
}
document.querySelectorAll('[data-auth]').forEach(b => { b.onclick = () => { authMode = b.dataset.auth; acMsg(''); refreshAccount(); }; });
guard($('#authForm'), async () => {
  const name = $('#username').value.trim(), password = $('#password').value;
  if (authMode === 'register') {
    if (password !== $('#password2').value) throw Error('Пароли не совпадают');
    await signedIn((await api('register', 'POST', { name, password })).user, 'Аккаунт создан');
  } else await signedIn((await api('login', 'POST', { name, password })).user, 'Вход выполнен');
});
guard($('#passwordForm'), async () => {
  const next = $('#newPassword').value;
  if (next !== $('#newPassword2').value) throw Error('Пароли не совпадают');
  await api('password', 'POST', { current: $('#currentPassword').value, next });
  for (const id of ['currentPassword', 'newPassword', 'newPassword2']) $('#' + id).value = '';
  $('#passwordForm').closest('details').open = false;
  acMsg('Пароль изменён. Другие устройства вышли из аккаунта');
});
guard($('#deleteForm'), async () => {
  if (!confirm(document.documentElement.lang === 'en' ? 'Delete the account and its save permanently?' : 'Удалить аккаунт и его сохранение без возможности восстановления?')) return;
  const id = account.id;
  await api('account', 'DELETE', { password: $('#deletePassword').value }); setAccToken('');
  try { localStorage.removeItem('bl_checkpoint_u_' + id); } catch {}
  $('#deleteForm').closest('details').open = false;
  await signedIn(null, 'Аккаунт удалён');
});
$('#logout').onclick = async () => {
  try { await api('logout', 'POST'); setAccToken(''); await signedIn(null, 'Вы вышли из аккаунта'); } catch (e) { acMsg(e.message, true); }
};
$('#logoutOthers').onclick = async () => {
  try { const { revoked } = await api('logout-others', 'POST'); acMsg(revoked ? 'Другие устройства вышли из аккаунта' : 'Других активных входов нет'); }
  catch (e) { acMsg(e.message, true); }
};
// Called from uiMatchOver; each finished match is counted once.
function reportMatch(won) {
  if (!account || !PLAYER || GAME.attract || GAME.statsSent) return;
  GAME.statsSent = true;
  api('stats', 'POST', { won, kills: PLAYER.kills, deaths: PLAYER.deaths }).then(r => {
    account = r.user; refreshAccount();
    const box = $('#overXP'); box.hidden = false;
    box.textContent = tr('+%d experience').replace('%d', r.gained) + (r.levelUp ? ' · ' + tr('New level %d: %s!').replace('%d', account.level).replace('%s', tr(rankOf(account.level))) : '');
  }).catch(e => status(e.message));
}

// ---- leaderboard
let ranksBy = 'xp';
async function openRanks() { $('#ranks').hidden = false; renderRanks(); }
async function renderRanks() {
  document.querySelectorAll('#ranksBy [data-by]').forEach(b => b.classList.toggle('on', b.dataset.by === ranksBy));
  const list = $('#ranksList'); list.innerHTML = '<p class="empty">…</p>';
  let data;
  try { data = await api('leaderboard?by=' + ranksBy); } catch (e) { list.innerHTML = '<p class="empty"></p>'; list.firstChild.textContent = e.message; return; }
  list.innerHTML = '';
  if (!data.top.length) { list.innerHTML = '<p class="empty"></p>'; list.firstChild.textContent = tr('Nobody has finished a match yet.'); }
  for (const u of data.top) {
    const row = document.createElement('div'); row.className = 'rk' + (account && u.id === account.id ? ' me' : '');
    const value = ranksBy === 'xp' ? u.stats.xp : u.stats[ranksBy];
    row.innerHTML = `<span class="pl">${u.place}</span><span class="ava">${avatarHTML(u)}</span><div><b></b><br><small></small></div><span class="val">${value}</span>`;
    row.querySelector('b').textContent = u.name;
    row.querySelector('small').textContent = `${tr(rankOf(u.level))} · ${tr('Lvl')} ${u.level} · ${tr('Matches')}: ${u.stats.matches}`;
    list.appendChild(row);
  }
  $('#ranksMe').textContent = data.me ? tr('Your place: %a of %b').replace('%a', data.me.place).replace('%b', data.players) : account ? '' : tr('Sign in to appear in the leaderboard.');
}
document.querySelectorAll('#ranksBy [data-by]').forEach(b => { b.onclick = () => { ranksBy = b.dataset.by; renderRanks(); }; });
$('#ranksOpen').onclick = openRanks;
// ---- what's new: shown once after an update, then from the menu
const VERSION = '2.1';
const closeNews = () => { $('#news').hidden = true; try { localStorage.setItem('bl_seen_version', VERSION); } catch {} };
$('#newsOpen').onclick = () => { $('#news').hidden = false; };
$('#newsClose').onclick = $('#newsOk').onclick = closeNews;
try { if (localStorage.getItem('bl_seen_version') !== VERSION && !navigator.webdriver) $('#news').hidden = false; } catch {}
$('#ranksClose').onclick = () => { $('#ranks').hidden = true; };
function packEntity(e) {
  const out = {};
  for (const [k, v] of Object.entries(e)) if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v;
  delete out.gunKey;
  out.name = cleanName(e.name);
  out.slots = Object.fromEntries([1, 2, 3].map(k => [k, e.slots[k] ? { k: e.slots[k].k, mag: e.slots[k].mag, res: e.slots[k].res } : null]));
  out.slots[4] = e.slots[4].slice(); out.dmgTaken = { ...e.dmgTaken };
  return out;
}
function snapshot() {
  const bomb = { ...GAME.bomb, carrier: GAME.bomb.carrier?.id ?? null, defuser: GAME.bomb.defuser?.id ?? null };
  const game = { ...GAME, bomb, paused: false };
  delete game.statsSent; // per browser: each player reports their own result
  return { version: 1, date: Date.now(), map: G.key, player: PLAYER?.id ?? 0, game, entities: ENTS.map(packEntity),
    smokes: SMOKES, nades: NADES.map(({ node, owner, ...n }) => ({ ...n, owner: owner.id })), fires: FIRES.map(({ acc, ...f }) => f) };
}
function validSnapshot(s) {
  return s?.version === 1 && MAPS[s.map] && s.game && DIFF[s.game.diff] && ['freeze','live','post','over'].includes(s.game.phase) &&
    Array.isArray(s.entities) && s.entities.length === 10 && s.entities.every((e,i) => e.id === i && ['T','CT'].includes(e.team) &&
      ['x','y','z','yaw','pitch','hp','money'].every(k => Number.isFinite(e[k])) && e.slots && [1,2,3].every(k => !e.slots[k] || W[e.slots[k].k]) &&
      Array.isArray(e.slots[4]) && e.slots[4].every(k => W[k]?.nade));
}
function applySnapshot(s, playerId, initial = false) {
  if (!validSnapshot(s) || !s.entities[playerId]) throw Error('Сохранение повреждено или несовместимо');
  NET.applying = true;
  if (initial) {
    newMatch({ ...s.game.cfg, map: s.map, team: s.entities[playerId].team, attract: false });
    CAMSRC = null; UI.specTarget = null;
  }
  const previous = { phase: GAME.phase, round: GAME.round, alive: PLAYER?.alive };
  Object.assign(GAME, s.game, { mode: 'play', attract: false, paused: false });
  // A restored finished match was already counted; a host's rematch starts a new one for guests.
  if (GAME.phase !== 'over') GAME.statsSent = false; else if (initial) GAME.statsSent = true;
  s.entities.forEach((data, i) => {
    let e = ENTS[i];
    if (e.team !== data.team) { e.model = buildChar(data.team); e.gunKey = null; }
    const look = !initial && i === playerId ? [e.yaw, e.pitch] : null;
    Object.assign(e, data, { name: cleanName(data.name), isPlayer: i === playerId });
    e.slots = { 4: data.slots[4].slice() };
    for (const k of [1,2,3]) e.slots[k] = data.slots[k] ? { ...data.slots[k], d: W[data.slots[k].k] } : null;
    if (look && previous.round === GAME.round) [e.yaw, e.pitch] = look;
    if (initial) e.gunKey = null;
    if (NET.role !== 'guest') { e.bot = i !== playerId; delete e.remote; }
  });
  NET.applying = false;
  PLAYER = ENTS[playerId]; GAME.bomb = { ...s.game.bomb, carrier: ENTS[s.game.bomb.carrier] || null, defuser: ENTS[s.game.bomb.defuser] || null };
  SMOKES = s.smokes || []; FIRES = (s.fires || []).map(f => ({ ...f, acc: {} })); NADES = (s.nades || []).map(n => ({ ...n, owner: ENTS[n.owner], node: buildGun(n.k) }));
  if (initial) { aiPlanRound(); UI.last = {}; UI.camSnap = true; vmRebuild(); $('#menu').hidden = true; $('#hud').hidden = false; $('#over').hidden = true; $('#feed').innerHTML = ''; }
  if (initial || previous.round !== GAME.round || previous.phase === 'over' && GAME.phase !== 'over') { $('#over').hidden = true; uiRoundStart(); }
  if (GAME.phase === 'post' && (initial || previous.phase !== 'post') && GAME.result) uiRoundEnd(GAME.result.winner, GAME.result.reason, null);
  if (previous.alive && !PLAYER.alive) { PLAYER.specT = rules().rounds ? 2.2 : 99; uiDeath(null); }
  if (!initial && previous.alive === false && PLAYER.alive) uiRespawn();
  if (GAME.phase === 'over' && (initial || previous.phase !== 'over')) uiMatchOver(GAME.score.T >= GAME.target ? 'T' : 'CT');
}
async function saveMatch(quiet = false) {
  if (!PLAYER || GAME.attract || NET.role === 'guest' || saving) return;
  saving = true;
  try {
    const data = snapshot();
    let localError = null;
    try { localStorage.setItem(saveKey(), JSON.stringify(data)); } catch (e) { localError = e; }
    if (localError && !account) throw Error('Нет места для сохранения в браузере');
    saved = data; refreshAccount();
    if (account) { await api('save', 'PUT', { save: data }); if (!quiet) status('Матч сохранён в аккаунте'); }
    else if (!quiet) status('Матч сохранён в этом браузере');
    if (!quiet) $('#pauseStatus').textContent = account ? 'Сохранено в аккаунте' : 'Сохранено в браузере';
  } catch (e) { status(e.message); $('#pauseStatus').textContent = 'Ошибка сохранения: ' + e.message; }
  finally { saving = false; }
}
$('#saveMatch').onclick = () => saveMatch();
$('#continue').onclick = () => {
  try { disconnectLAN(); applySnapshot(saved, saved.player, true); audioInit(); FALLBACK = false; lockPointer(); }
  catch (e) { status(e.message); }
};
setInterval(() => { if (playing() && GAME.phase !== 'over') saveMatch(true); }, 15000);
addEventListener('pagehide', () => { if (playing() && NET.role !== 'guest') { try { localStorage.setItem(saveKey(), JSON.stringify(snapshot())); } catch {} } });
function netSend(message) { if (NET.socket?.readyState === WebSocket.OPEN) NET.socket.send(JSON.stringify(message)); }
function disconnectLAN() {
  const socket = NET.socket; NET.socket = null; NET.role = null; NET.id = null;
  if (socket) socket.close();
  for (const e of ENTS) if (e.remote) { e.bot = true; delete e.remote; aiInit(e); }
  NET.peers.clear(); NET.verified.clear(); NET.myId = null; MP.lobby = null; $('#lanState').textContent = ''; $('#saveMatch').disabled = false; $('#again').disabled = false;
}
function sendSnapshot(peer) { netSend({ to: peer ?? 'all', msg: { type: 'state', state: snapshot() } }); }
// ---------- multiplayer: servers, matches and the lobby ----------
// Any Breachline server can host matches: the one this page came from, or servers the player added
// (their own PC behind a port forward or a tunnel, a friend's server…). The host's browser runs the game.
const MODE_NAMES = { bomb: 'Bomb defusal', elim: 'Elimination', tdm: 'Team deathmatch', gungame: 'Arms race' };
// Translate text that is put together in code (i18n.js translates the page itself).
const tr = text => (window.I18N ? window.I18N.tr(text) : text);
const MP = { servers: [], sel: 0, status: {}, lobby: null, started: false, since: 0 };
const MP_ERRORS = {
  hello_expected: 'The server did not understand the game', version_mismatch: 'Different game versions. Reload the page',
  name_required: 'Enter a nickname', name_reserved: 'This nickname belongs to an account — sign in to use it',
  server_full: 'The server is full, try later', name_in_use: 'This nickname is already on the server',
  host_left: 'The match ended: the host left.', kicked: 'You were kicked from the server', not_admin: 'Only a server admin can start the match',
};
const mpMsg = (text, error = false) => { const m = $('#mpMsg'); m.textContent = text; m.hidden = !text; m.classList.toggle('err', error); };
const nickStored = () => { try { return localStorage.getItem('bl_nick') || ''; } catch { return ''; } };
function myName() { return account ? account.name : cleanName($('#mpNick').value || nickStored() || 'Player'); }
function officialServer() { return /^https?:$/.test(location.protocol) ? { name: 'Breachline', address: location.origin, official: true } : null; }
function loadServers() {
  let own = [];
  try { own = JSON.parse(localStorage.getItem('bl_servers') || '[]').filter(s => s && typeof s.address === 'string'); } catch {}
  MP.servers = [officialServer(), ...own].filter(Boolean);
  MP.sel = Math.min(MP.sel, Math.max(0, MP.servers.length - 1));
}
function storeServers() { try { localStorage.setItem('bl_servers', JSON.stringify(MP.servers.filter(s => !s.official).map(({ name, address }) => ({ name, address })))); } catch {} }
function serverBase(address) {
  const a = String(address).trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(a) ? a : (location.protocol === 'https:' ? 'https://' : 'http://') + a;
}
// An https page may not open plain ws:// or http:// connections; such servers are opened directly instead.
const mixedBlocked = base => location.protocol === 'https:' && base.startsWith('http:');
// "IP:port" says nothing about https: try both, the page's own scheme first.
function serverCandidates(address) {
  const a = String(address).trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(a)) return [a];
  return location.protocol === 'https:' ? ['https://' + a, 'http://' + a] : ['http://' + a, 'https://' + a];
}
async function pingServer(s) {
  const key = s.address;
  MP.status[key] = { wait: true }; renderServers();
  let result = null, blocked = null;
  for (const base of serverCandidates(s.address)) {
    if (mixedBlocked(base)) { blocked ||= base; continue; }
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 4000), t0 = performance.now();
    try {
      const info = await (await fetch(base + '/api/ping', { signal: ctl.signal, cache: 'no-store' })).json();
      result = { ok: true, base, ms: Math.round(performance.now() - t0), ...info };
    } catch {}
    clearTimeout(timer);
    if (result) break;
  }
  // Nothing answered over https, and plain http is off limits for an https page: say so and link the server itself.
  MP.status[key] = result || { ok: false, mixed: !!blocked, base: blocked || serverCandidates(s.address)[0] };
  renderServers();
  if (MP.servers[MP.sel] === s) renderServer();
}
function renderServers() {
  const list = $('#srvList'); list.innerHTML = '';
  MP.servers.forEach((s, i) => {
    const st = MP.status[s.address] || { wait: true };
    const b = document.createElement('button'); b.type = 'button'; b.className = 'srv' + (i === MP.sel ? ' on' : '');
    const label = st.wait ? '…' : st.ok ? `${st.ms} ms · ${st.players}` : st.mixed ? 'http' : '✕';
    b.innerHTML = `<b></b><span class="st ${st.wait ? 'wait' : st.ok ? 'ok' : 'bad'}">${label}</span><small></small>` + (s.official ? '' : '<span class="edit" role="button">✎</span>');
    b.querySelector('b').textContent = s.official ? (st.name || s.name) : s.name;
    b.querySelector('small').textContent = s.address.replace(/^https?:\/\//, '');
    b.onclick = ev => { if (ev.target.classList.contains('edit')) return editServer(i); MP.sel = i; renderServers(); renderServer(); };
    list.appendChild(b);
  });
  if (!MP.servers.length) list.innerHTML = '<p class="empty">Add a server to play over the network.</p>';
}
async function renderServer() {
  const s = MP.servers[MP.sel]; if (!s) { $('#srvName').textContent = ''; $('#srvAddr').textContent = ''; $('#srvInfo').innerHTML = ''; return; }
  const st = MP.status[s.address] || { wait: true }, base = st.base || serverBase(s.address);
  $('#srvName').textContent = s.official ? (st.name || s.name) : s.name;
  $('#srvAddr').textContent = base.replace(/^https?:\/\//, '');
  $('#srvState').textContent = st.wait ? '…' : st.ok ? `${tr('online')} · ${st.ms} ${tr('ms')}` : tr('offline');
  $('#srvState').className = 'srvState st ' + (st.wait ? 'wait' : st.ok ? 'ok' : 'bad');
  const note = $('#srvNote');
  note.hidden = st.ok || st.wait;
  if (st.mixed) note.innerHTML = '';
  if (st.mixed) { note.append(document.createTextNode(tr('This server has no HTTPS, so this page cannot reach it. Open the game on that server instead: '))); const a = document.createElement('a'); a.href = base; a.target = '_blank'; a.textContent = base; note.appendChild(a); }
  else if (!st.ok && !st.wait) note.textContent = tr('The server does not answer. Check the address and that the server is running.');
  $('#srvJoin').disabled = !st.ok;
  const info = $('#srvInfo'); info.innerHTML = '';
  if (!st.ok) return;
  const line = (label, value) => { const p = document.createElement('div'); p.append(tr(label) + ': '); const b = document.createElement('b'); b.textContent = value; p.appendChild(b); info.appendChild(p); };
  line('Players', `${st.players}/${st.max}` + (st.names?.length ? ' — ' + st.names.join(', ') : ''));
  line('Now', tr(st.state === 'playing' ? 'a match is running' : 'waiting in the lobby'));
  if (st.settings) line('Match', `${tr(MODE_NAMES[st.settings.mode] || st.settings.mode)} · ${MAPS[st.settings.map]?.name || st.settings.map}`);
}
function openMP() {
  loadServers(); mpMsg('');
  $('#mpAs').textContent = account ? account.name : '';
  $('#mpNickRow').hidden = !!account; $('#mpNick').value = nickStored() || $('#mpNick').value || 'Player';
  $('#mp').hidden = false; renderServers(); renderServer();
  for (const s of MP.servers) pingServer(s);
}
function closeMP() { $('#mp').hidden = true; }
let editing = -1;
function editServer(i) {
  editing = i; const s = MP.servers[i];
  $('#srvDlgKind').textContent = tr(i < 0 ? 'Add server' : 'Edit server');
  $('#srvFName').value = s ? s.name : ''; $('#srvFAddr').value = s ? s.address : '';
  $('#srvDel').hidden = i < 0; $('#srvDialog').hidden = false; $('#srvFName').focus();
}
$('#srvForm').onsubmit = ev => {
  ev.preventDefault();
  const entry = { name: $('#srvFName').value.trim().slice(0, 40), address: $('#srvFAddr').value.trim() };
  if (!entry.name || !entry.address) return;
  if (editing < 0) { MP.servers.push(entry); MP.sel = MP.servers.length - 1; } else MP.servers[editing] = entry;
  storeServers(); $('#srvDialog').hidden = true; renderServers(); pingServer(entry);
};
$('#srvDel').onclick = () => { MP.servers.splice(editing, 1); MP.sel = 0; storeServers(); $('#srvDialog').hidden = true; renderServers(); renderServer(); };
$('#srvCancel').onclick = () => { $('#srvDialog').hidden = true; };
$('#srvAdd').onclick = () => editServer(-1);
$('#srvRefresh').onclick = () => { for (const s of MP.servers) pingServer(s); };
$('#mpOpen').onclick = openMP;
$('#mpClose').onclick = closeMP;
$('#mpNick').oninput = () => { try { localStorage.setItem('bl_nick', cleanName($('#mpNick').value)); } catch {} };
$('#srvJoin').onclick = () => { const s = MP.servers[MP.sel]; if (s) connectServer(MP.status[s.address]?.base || serverBase(s.address)); };

// ---- the server lobby: everyone waits here; an admin picks the match settings and starts it
let lobbyBuilt = false;
function buildLobbyControls() {
  if (lobbyBuilt) return; lobbyBuilt = true;
  const seg = (box, values, labels, key) => values.forEach((v, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = labels[i]; b.dataset.v = v;
    b.onclick = () => sendSettings({ [key]: typeof v === 'number' ? v : String(v) });
    box.appendChild(b);
  });
  seg($('#lbMode'), Object.keys(MODE_NAMES), Object.values(MODE_NAMES), 'mode');
  seg($('#lbTarget'), [5, 8], ['5', '8'], 'target');
  seg($('#lbDiff'), ['easy', 'normal', 'hard'], ['Easy', 'Normal', 'Hard'], 'diff');
  $('#lbMap').innerHTML = Object.entries(MAPS).map(([k, m]) => `<option value="${k}">${m.name}</option>`).join('');
  $('#lbMap').onchange = () => sendSettings({ map: $('#lbMap').value });
}
function sendSettings(change) { if (MP.lobby) netSend({ type: 'settings', settings: { ...MP.lobby.settings, ...change } }); }
function me() { return MP.lobby?.players.find(p => p.id === NET.myId); }
function showLobby() { buildLobbyControls(); closeMP(); $('#lobby').hidden = false; renderLobby(); }
function hideLobby() { $('#lobby').hidden = true; }
function renderLobby() {
  const L = MP.lobby; if (!L) return;
  const mine = me(), leader = !!mine?.leader;
  $('#lbServer').textContent = L.server + ' · ' + (NET.server || '').replace(/^https?:\/\//, '');
  $('#lbTitle').textContent = tr(L.state === 'playing' ? 'Match in progress' : 'Server lobby');
  const slots = $('#lbSlots'); slots.innerHTML = '';
  for (const p of L.players) {
    const d = document.createElement('div'); d.className = 'slot in' + (p.op || p.leader ? ' host' : '');
    d.innerHTML = '<b></b><small></small>';
    d.querySelector('b').textContent = (p.op ? '★ ' : '') + p.name;
    d.querySelector('small').textContent = tr(p.id === L.hostId && L.state === 'playing' ? 'leads the match' : p.op ? 'admin' : p.leader ? 'can start' : p.id === NET.myId ? 'you' : 'ready');
    slots.appendChild(d);
  }
  const st = L.settings;
  $('#lbSettings').classList.toggle('locked', !leader || L.state !== 'lobby');
  for (const [box, v] of [['#lbMode', st.mode], ['#lbTarget', st.target], ['#lbDiff', st.diff]]) $(box).querySelectorAll('button').forEach(b => b.classList.toggle('on', String(v) === b.dataset.v));
  $('#lbMap').value = st.map;
  $('#lbStart').hidden = !leader || L.state !== 'lobby';
  const admins = L.players.filter(p => p.op).map(p => p.name);
  $('#lbInfo').textContent = L.state === 'playing' ? tr('A match is running — joining it…')
    : leader ? tr(L.opsSet ? 'You are an admin: pick the mode and map, then start the match.' : 'The server has no admins yet, so you can start: pick the mode and map, then start the match.')
    : admins.length ? tr('Waiting for an admin to start: %s').replace('%s', admins.join(', '))
    : tr(L.opsSet ? 'Waiting for an admin to join and start the match.' : 'Waiting for the first player to start the match.');
}
setInterval(() => { if (!$('#lobby').hidden) { const s = Math.floor((performance.now() - MP.since) / 1000); $('#lbTime').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); } }, 500);
$('#lbStart').onclick = () => { audioInit(); netSend({ type: 'start' }); };
$('#lbLeave').onclick = () => { disconnectLAN(); hideLobby(); openMP(); };

// Back from a match to the lobby without leaving the server.
function backToLobby(reason) {
  const wasPlaying = playing();
  for (const e of ENTS) if (e.remote) { e.bot = true; delete e.remote; aiInit(e); }
  NET.role = null; NET.id = null; NET.peers.clear(); MP.started = false;
  $('#lanState').textContent = ''; $('#saveMatch').disabled = false; $('#again').disabled = false;
  if (wasPlaying) leaveMatchView();
  showLobby();
  if (reason === 'host_left') $('#lbInfo').textContent = tr('The match ended: the host left.');
}
function admitPeer(from, command) {
  const e = ENTS.find(e => e.bot && e.team === command.team) || ENTS.find(e => e.bot);
  if (!e) return;
  e.bot = false; e.remote = true; e.name = cleanName(NET.verified.get(from) || command.name); e.planting = e.defusing = false;
  NET.peers.set(from, { id: e.id, name: e.name, input: {}, mouse: {}, at: performance.now() });
  netSend({ to: from, msg: { type: 'welcome', id: e.id, state: snapshot() } });
}
function applyLobbySettings(st) {
  if (MODE_NAMES[st.mode]) CFG.mode = st.mode;
  if (MAPS[st.map]) CFG.map = st.map;
  if ([5, 8].includes(st.target)) CFG.target = st.target;
  if (DIFF[st.diff]) CFG.diff = st.diff;
}
const matchLabel = () => `${MP.lobby?.server || ''} · ${(NET.server || '').replace(/^https?:\/\//, '')}`;
function connectServer(base) {
  mpMsg('');
  if (mixedBlocked(base)) { mpMsg(tr('This server has no HTTPS, so this page cannot reach it. Open the game on that server instead: ') + base, true); return; }
  const name = myName();
  if (!name) { mpMsg(tr(MP_ERRORS.name_required), true); return; }
  disconnectLAN();
  MP.started = false; MP.lobby = null;
  let socket;
  try { socket = new WebSocket(base.replace(/^http/, 'ws') + '/ws'); } catch { mpMsg(tr('The server does not answer. Check the address and that the server is running.'), true); return; }
  NET.socket = socket; NET.server = base;
  const timeout = setTimeout(() => { if (!NET.myId) { socket.close(); mpMsg(tr('The server does not answer. Check the address and that the server is running.'), true); } }, 8000);
  // a ticket from the account site proves to the server which account this is
  const ticket = (async () => {
    const id = Object.values(MP.status).find(st => st.base === base)?.id;
    if (!account || !id) return undefined;
    try { return (await api('ticket', 'POST', { aud: id })).ticket; } catch { return undefined; }
  })();
  socket.onopen = async () => netSend({ type: 'relay-hello', proto: 'breachline-web/3', name, ticket: await ticket });
  socket.onclose = () => {
    clearTimeout(timeout);
    if (NET.socket !== socket) return;
    const inGame = playing(); disconnectLAN(); hideLobby();
    if (inGame) toMenu(false);
    openMP(); mpMsg(tr('Disconnected from the server.'), true);
  };
  socket.onmessage = ev => {
    try {
      const m = JSON.parse(ev.data);
      if (m.type === 'relay-error') {
        socket.onclose = null; clearTimeout(timeout);
        const inGame = playing(); disconnectLAN(); hideLobby();
        if (inGame) toMenu(false);
        openMP(); mpMsg(tr(MP_ERRORS[m.reason] || m.reason), true);
        return;
      }
      if (m.type === 'joined') { clearTimeout(timeout); NET.myId = m.id; MP.since = performance.now(); showLobby(); return; }
      if (m.type === 'lobby') { MP.lobby = m.lobby; if (!$('#lobby').hidden) renderLobby(); return; }
      if (m.type === 'notice') { $('#lbInfo').textContent = tr(MP_ERRORS[m.reason] || m.reason); return; }
      if (m.type === 'match-end') { if (NET.role || playing()) backToLobby(m.reason); return; }
      if (m.type === 'role') {
        applyLobbySettings(m.settings || {});
        NET.tick = 0;
        if (m.role === 'host') {
          NET.role = 'host'; MP.started = true;
          for (const p of m.peers || []) NET.verified.set(p.peer, p.name);
          hideLobby();
          startGame(false);
          showPause(); $('#pauseStatus').textContent = tr('The match has started. Press Resume.');
        } else {
          NET.role = 'guest'; NET.id = null;
          $('#saveMatch').disabled = true; $('#again').disabled = true;
          netSend({ type: 'join', name: me()?.name || name, team: CFG.team });
          renderLobby(); $('#lbInfo').textContent = tr('Connecting to match…');
        }
        $('#lanState').textContent = matchLabel();
        return;
      }
      if (NET.role === 'host') {
        if (m.type === 'peer-join') { NET.verified.set(m.peer, m.name || m.account || null); return; }
        if (m.type === 'peer-leave') {
          const peer = NET.peers.get(m.peer); if (peer) { const e = ENTS[peer.id]; e.bot = true; delete e.remote; e.name = 'Bot ' + e.id; aiInit(e); aiPlanRound(); }
          NET.peers.delete(m.peer); NET.verified.delete(m.peer); return;
        }
        if (!m.msg) return;
        const command = m.msg;
        if (command.type === 'join' && !NET.peers.has(m.from)) { admitPeer(m.from, command); return; }
        const peer = NET.peers.get(m.from); if (!peer) return;
        const e = ENTS[peer.id];
        if (command.type === 'input') {
          if (!Number.isFinite(command.yaw) || !Number.isFinite(command.pitch)) return;
          e.yaw = command.yaw % TAU; e.pitch = clamp(command.pitch, -1.5, 1.5);
          peer.input = command.keys && typeof command.keys === 'object' ? command.keys : {};
          peer.mouse.lPress = !!command.fire && !peer.mouse.l; peer.mouse.l = !!command.fire; peer.at = performance.now();
        }
        if (command.type === 'action' && e.alive && GAME.phase !== 'over') {
          if (command.action === 'reload') startReload(e);
          if (command.action === 'slot' && [1,2,3,4].includes(command.value)) setSlot(e, command.value);
          if (command.action === 'alt' && GAME.phase === 'live') altFire(e);
          if (command.action === 'buy' && canBuyNow(e) && typeof command.value === 'string') doBuy(e, command.value);
        }
      } else if (NET.role === 'guest') {
        if (m.type === 'kill' && ENTS[m.victim]) uiFeed(ENTS[m.attacker], ENTS[m.victim], m.wk, m.head);
        if (m.type === 'fx' && Number.isFinite(m.x) && Number.isFinite(m.y) && Number.isFinite(m.z)) playFx(m.kind, m.x, m.y, m.z);
        if (m.type === 'shot' && ENTS[m.id]) { fxMuzzle(ENTS[m.id]); const w = curW(ENTS[m.id]); if (w) sfx.shot(w.d.snd, ENTS[m.id]); }
        if (m.type === 'welcome') {
          NET.id = m.id; hideLobby(); closeMP(); applySnapshot(m.state, m.id, true); showPause();
          $('#pauseStatus').textContent = tr('You are in a network match. Press Resume.');
        }
        if (m.type === 'state' && PLAYER && !GAME.attract) { applySnapshot(m.state, NET.id); if (UI.buy) renderBuy(); }
      }
    } catch (e) { console.error('LAN', e); status('Network error: ' + e.message); }
  };
}
function remoteAction(action, value) { if (NET.role !== 'guest' || NET.applying) return false; netSend({ type: 'action', action, value }); return true; }
function networkTick(dt) {
  if (!NET.role) return;
  NET.tick += dt; if (NET.tick < .05) return; NET.tick = 0;
  if (NET.role === 'host') sendSnapshot();
  else if (PLAYER && !GAME.attract) netSend({ type: 'input', yaw: PLAYER.yaw, pitch: PLAYER.pitch, keys: uiBlocking() ? {} : KEYS, fire: !uiBlocking() && MOUSE.l });
}
function updateRemotes(dt) {
  for (const peer of NET.peers.values()) {
    const e = ENTS[peer.id];
    const stale = performance.now() - peer.at > 500;
    if (stale) { peer.input = {}; peer.mouse.l = false; }
    e.planting = e.defusing = !!peer.input.KeyE;
    updatePlayer(dt, e, peer.input, peer.mouse);
  }
}
// Keep the authoritative match running when the host opens another tab.
let networkClock = performance.now();
setInterval(() => {
  const now = performance.now(), elapsed = Math.min(1, (now - networkClock) / 1000); networkClock = now;
  try {
    if (NET.role === 'host' && GAME.mode === 'play') {
      let remaining = elapsed;
      while (remaining > 0) { const dt = Math.min(.05, remaining); step(dt); remaining -= dt; }
    }
    networkTick(elapsed);
  } catch (e) { console.error(e); window.__err = String(e.stack || e); }
}, 20);
(async () => { try { account = (await api('me')).user; } catch { serverUp = false; } await loadAccountSave(); })();

window.__game = { THROWN, VM, damage, endRound, uiMatchOver, updateCamera, GAME, get ENTS() { return ENTS; }, get PLAYER() { return PLAYER; }, CAM, NET, snapshot, applySnapshot, saveMatch, connectServer, openMP, disconnectLAN, toMenu, startGame, KEYS, MOUSE, CFG, step, fire, setSlot, doBuy, G };
{ let booted = false; const go = () => { if (!booted) { booted = true; boot(); } }; if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); setTimeout(go, 1500); }

})();
