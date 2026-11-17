import * as THREE from 'three';

// Real time 2D fluid (stable fluids: advect, vorticity, divergence, pressure, project). Dye is what you see.
const V = `varying vec2 vUv,vL,vR,vT,vB; uniform vec2 px;
void main(){ vUv=uv; vL=uv-vec2(px.x,0.); vR=uv+vec2(px.x,0.); vT=uv+vec2(0.,px.y); vB=uv-vec2(0.,px.y); gl_Position=vec4(position.xy,0.,1.); }`;
const H = `precision highp float; varying vec2 vUv,vL,vR,vT,vB;`;
const F = {
  splat: `${H} uniform sampler2D tBase; uniform float aspect,radius; uniform vec3 color; uniform vec2 point;
    void main(){ vec2 p=vUv-point; p.x*=aspect; gl_FragColor=vec4(texture2D(tBase,vUv).xyz+exp(-dot(p,p)/radius)*color,1.); }`,
  advect: `${H} uniform sampler2D tVel,tSrc; uniform vec2 px; uniform float dt,diss;
    void main(){ vec2 c=vUv-dt*texture2D(tVel,vUv).xy*px; gl_FragColor=vec4(texture2D(tSrc,c).xyz/(1.+diss*dt),1.); }`,
  curl: `${H} uniform sampler2D tVel;
    void main(){ float L=texture2D(tVel,vL).y,R=texture2D(tVel,vR).y,T=texture2D(tVel,vT).x,B=texture2D(tVel,vB).x; gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.); }`,
  vort: `${H} uniform sampler2D tVel,tCurl; uniform float curl,dt;
    void main(){ float L=texture2D(tCurl,vL).x,R=texture2D(tCurl,vR).x,T=texture2D(tCurl,vT).x,B=texture2D(tCurl,vB).x,C=texture2D(tCurl,vUv).x;
      vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); f/=length(f)+1e-4; f*=curl*C; f.y*=-1.;
      vec2 v=texture2D(tVel,vUv).xy+f*dt; gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.); }`,
  div: `${H} uniform sampler2D tVel;
    void main(){ float L=texture2D(tVel,vL).x,R=texture2D(tVel,vR).x,T=texture2D(tVel,vT).y,B=texture2D(tVel,vB).y; vec2 C=texture2D(tVel,vUv).xy;
      if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y; gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.); }`,
  clear: `${H} uniform sampler2D tBase; uniform float k; void main(){ gl_FragColor=k*texture2D(tBase,vUv); }`,
  press: `${H} uniform sampler2D tP,tDiv;
    void main(){ float L=texture2D(tP,vL).x,R=texture2D(tP,vR).x,T=texture2D(tP,vT).x,B=texture2D(tP,vB).x; gl_FragColor=vec4((L+R+B+T-texture2D(tDiv,vUv).x)*.25,0.,0.,1.); }`,
  grad: `${H} uniform sampler2D tP,tVel;
    void main(){ float L=texture2D(tP,vL).x,R=texture2D(tP,vR).x,T=texture2D(tP,vT).x,B=texture2D(tP,vB).x; gl_FragColor=vec4(texture2D(tVel,vUv).xy-vec2(R-L,T-B),0.,1.); }`
};

export class Fluid {
  constructor(renderer, { sim = 128, dye = 512, iters = 14 } = {}) {
    this.r = renderer; this.iters = iters; this.queue = [];
    const a = innerWidth / innerHeight, size = (n) => a > 1 ? [Math.round(n * a), n] : [n, Math.round(n / a)];
    const [sw, sh] = size(sim), [dw, dh] = size(dye);
    this.spx = new THREE.Vector2(1 / sw, 1 / sh); this.dpx = new THREE.Vector2(1 / dw, 1 / dh);
    const rt = (w, h) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false });
    const dbl = (w, h) => ({ read: rt(w, h), write: rt(w, h), swap() { const t = this.read; this.read = this.write; this.write = t; } });
    this.vel = dbl(sw, sh); this.dye = dbl(dw, dh); this.p = dbl(sw, sh); this.dv = rt(sw, sh); this.cl = rt(sw, sh);
    this.scene = new THREE.Scene(); this.cam = new THREE.Camera();
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.mesh.frustumCulled = false; this.scene.add(this.mesh);
    this.m = {};
    for (const k in F) this.m[k] = new THREE.ShaderMaterial({ vertexShader: V, fragmentShader: F[k], depthTest: false, depthWrite: false,
      uniforms: { px: { value: this.spx }, tBase: { value: null }, tVel: { value: null }, tSrc: { value: null }, tCurl: { value: null }, tP: { value: null }, tDiv: { value: null },
        aspect: { value: a }, radius: { value: 0.001 }, color: { value: new THREE.Vector3() }, point: { value: new THREE.Vector2() }, dt: { value: 0.016 }, diss: { value: 0 }, curl: { value: 24 }, k: { value: 0.8 } } });
  }
  get texture() { return this.dye.read.texture; }
  _pass(mat, target, set) { const u = mat.uniforms; for (const k in set) u[k].value = set[k]; this.mesh.material = mat; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }
  // x,y in 0..1 (y up). dx,dy velocity. color rgb array. radius ~0.0005 to 0.01
  splat(x, y, dx, dy, color, radius = 0.002) { if (this.queue.length < 40) this.queue.push([x, y, dx, dy, color, radius]); }
  step(dt) {
    const m = this.m, old = this.r.getRenderTarget();
    for (const [x, y, dx, dy, c, rad] of this.queue) {
      m.splat.uniforms.point.value.set(x, y); m.splat.uniforms.color.value.set(dx, dy, 0);
      this._pass(m.splat, this.vel.write, { tBase: this.vel.read.texture, radius: rad, px: this.spx }); this.vel.swap();
      m.splat.uniforms.color.value.set(c[0], c[1], c[2]);
      this._pass(m.splat, this.dye.write, { tBase: this.dye.read.texture, radius: rad, px: this.dpx }); this.dye.swap();
    }
    this.queue.length = 0;
    this._pass(m.curl, this.cl, { tVel: this.vel.read.texture, px: this.spx });
    this._pass(m.vort, this.vel.write, { tVel: this.vel.read.texture, tCurl: this.cl.texture, dt, px: this.spx }); this.vel.swap();
    this._pass(m.div, this.dv, { tVel: this.vel.read.texture, px: this.spx });
    this._pass(m.clear, this.p.write, { tBase: this.p.read.texture, k: 0.8, px: this.spx }); this.p.swap();
    for (let i = 0; i < this.iters; i++) { this._pass(m.press, this.p.write, { tP: this.p.read.texture, tDiv: this.dv.texture, px: this.spx }); this.p.swap(); }
    this._pass(m.grad, this.vel.write, { tP: this.p.read.texture, tVel: this.vel.read.texture, px: this.spx }); this.vel.swap();
    this._pass(m.advect, this.vel.write, { tVel: this.vel.read.texture, tSrc: this.vel.read.texture, dt, diss: 0.35, px: this.spx }); this.vel.swap();
    this._pass(m.advect, this.dye.write, { tVel: this.vel.read.texture, tSrc: this.dye.read.texture, dt, diss: 1.25, px: this.spx }); this.dye.swap();
    this.r.setRenderTarget(old);
  }
}
