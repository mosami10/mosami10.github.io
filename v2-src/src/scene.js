import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Fluid } from './fluid.js';

const STAGES = {
  hero:  { shape: 'rig',   cam: [0, 0.05, 4.9], tilt: [0.42, -0.72], at: [1.25, 0.48] },
  f1:    { shape: 'rig',   cam: [0, 0.0, 4.7],  tilt: [0.3, -0.9], cfg: 'scoop' },
  drone: { shape: 'drone', cam: [0, 0.3, 4.5],  tilt: [0.8, 0.55] },
  hvac:  { shape: 'none',  cam: [0, 0, 5.4],    tilt: [0, 0.2] },
  free:  { shape: 'none',  cam: [0, -0.1, 5.8], tilt: [0, -0.2] }
};
// Lumped thermal model. Equilibria under sustained braking come from the dissertation CHT results:
// scoop 407.6 K, dome 516.5 K, no duct runs away (solver limit 5,000 K). Rates are illustrative.
const P = 172, T0 = 300;
export const CFG = {
  none:  { k: 0.02,          kr: 0.3, scale: 1,    cz: 0,     tilt: [0, 0] },
  dome:  { k: P / 216.5,     kr: 1.0, scale: 0.5,  cz: -1.9,  tilt: [-0.12, -0.42] },
  scoop: { k: P / 107.6,     kr: 1.7, scale: 0.52, cz: -1.8,  tilt: [-0.12, -0.42] }
};
const REST = { rig: 0, drone: 0, none: 0.1 };

const GLSL = `
float h31(vec3 p){ p=fract(p*.1031); p+=dot(p,p.yzx+33.33); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
vec3 ramp(float t){ vec3 a=vec3(.03,0.,0.),b=vec3(.85,.05,0.),c=vec3(1.,.4,.03),d=vec3(1.,.93,.7);
  return t<.35?mix(a,b,t/.35):t<.7?mix(b,c,(t-.35)/.35):mix(c,d,(t-.7)/.3); }`;

const BG_F = `precision highp float; varying vec2 vUv; uniform sampler2D tDye; uniform vec2 px; uniform float uScrim,uHot; uniform vec2 uGlow;
void main(){
  vec3 d=texture2D(tDye,vUv).rgb;
  float lx=dot(texture2D(tDye,vUv+vec2(px.x,0.)).rgb-texture2D(tDye,vUv-vec2(px.x,0.)).rgb,vec3(.4)), ly=dot(texture2D(tDye,vUv+vec2(0.,px.y)).rgb-texture2D(tDye,vUv-vec2(0.,px.y)).rgb,vec3(.4));
  vec3 col=vec3(.012,.013,.015)+d*clamp(1.+(lx*-.7+ly*.7)*6.,.4,1.9);
  vec2 g=vUv-uGlow; g.x*=1.6; col+=mix(vec3(.05,.06,.075),vec3(.42,.11,.015),uHot)*.32*exp(-dot(g,g)*4.5);
  col*=mix(1.,smoothstep(-.15,.62,vUv.x)*.7+.3,uScrim);
  gl_FragColor=vec4(col,1.);
}`;
const POST = { uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmt: { value: 0.004 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uAmt; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 d=vUv-.5; float r2=dot(d,d); vec2 o=d*r2*uAmt*4.;
      vec3 c=vec3(texture2D(tDiffuse,vUv+o).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-o).b);
      c*=1.-r2*.7; c+=(h(vUv*vec2(1920.,1080.)+uTime)-.5)*.012; gl_FragColor=vec4(c,1.); }` };

export class Scene {
  constructor(canvas, opts = {}) {
    this.mobile = opts.mobile; this.lite = opts.lite;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, this.mobile ? 1.5 : 1.75));
    r.setClearColor(0x030405, 1); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
    this.cam = new THREE.PerspectiveCamera(36, 1, 0.1, 60); this.cam.position.set(0, 0.05, 4.9);
    this.clock = new THREE.Clock();
    this.stage = 'hero'; this.shape = 'none'; this.mix = 1; this.prev = 'none';
    this.userCfg = 'none'; this.held = false; this.T = T0; this.rpm = 1500; this.hn = 0;
    this.pointer = new THREE.Vector2(); this.energy = 0; this.cloud = {}; this.parts = {};
    this.anchor = new THREE.Vector3(1.45, 0, 0); this.dragV = new THREE.Vector2(); this.dragR = new THREE.Vector2();
    this.frames = 0; this.slow = 0; this.cfgS = { scale: 1, cz: 0, tx: 0, ty: 0 };

    this.fluid = new Fluid(r, this.mobile ? { sim: 96, dye: 384, iters: 8 } : { sim: 128, dye: 640, iters: 14 });
    this.bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ depthTest: false, depthWrite: false, toneMapped: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,1.,1.); }`, fragmentShader: BG_F,
      uniforms: { tDye: { value: null }, px: { value: this.fluid.dpx }, uScrim: { value: 1 }, uHot: { value: 0 }, uGlow: { value: new THREE.Vector2(0.7, 0.5) } } }));
    this.bg.frustumCulled = false; this.bg.renderOrder = -10; this.scene.add(this.bg);

    const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(2, 3, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd0ff, 2.2); rim.position.set(-4, 1, -2); this.scene.add(rim);
    this.rig = new THREE.Group(); this.scene.add(this.rig);
    this.asm = new THREE.Group(); this.rig.add(this.asm);            // disc + duct, shifted so the assembly stays centred
    this.spinner = new THREE.Group(); this.asm.add(this.spinner);    // only the disc turns

    // sparks off the pads
    const SN = this.SN = this.mobile ? 160 : 360;
    this.sp = { p: new Float32Array(SN * 3), v: new Float32Array(SN * 3), l: new Float32Array(SN), pos: new Float32Array(SN * 6), col: new Float32Array(SN * 6), i: 0 };
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.sp.pos, 3).setUsage(THREE.DynamicDrawUsage)); sg.setAttribute('color', new THREE.BufferAttribute(this.sp.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.sparks = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.sparks.frustumCulled = false; this.scene.add(this.sparks);

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.cam));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.6, 0.85); this.composer.addPass(this.bloom);
    this.post = new ShaderPass(POST); this.composer.addPass(this.post); this.composer.addPass(new OutputPass());
    if (this.lite) this.composer = null;
    this.resize(); addEventListener('resize', () => this.resize());
  }

  _part(geo, color, metal, rough, heat) {
    const u = { uHeat: { value: 0 }, uTime: { value: 0 }, uShow: { value: 0 } };
    const mat = new THREE.MeshPhysicalMaterial({ color, metalness: metal, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 1.5, side: THREE.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP=position; vON=normal;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON; uniform float uHeat,uTime,uShow;' + GLSL)
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat dn=vnoise(vOP*5.); float th=uShow*1.25-.12; if(dn>th) discard;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          ${heat ? `float rr=length(vOP.xy); float band=exp(-pow((rr-.78)/.2,2.))*mix(.3,1.,abs(normalize(vON).z));
          float hh=uHeat*band*(.75+.25*vnoise(vec3(vOP.xy*5.,uTime*.4)));
          totalEmissiveRadiance+=ramp(clamp(hh,0.,1.))*min(hh,1.)*1.15;` : ''}
          totalEmissiveRadiance+=vec3(1.,.35,.08)*smoothstep(.1,0.,th-dn)*4.*step(uShow,.995);`);
    };
    const mesh = new THREE.Mesh(geo, mat);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    const grp = new THREE.Group(); grp.add(mesh, edges); grp.visible = false;
    return { grp, u, edges, show: 0 };
  }

  async load(onProgress) {
    const loader = new GLTFLoader();
    const defs = [['disc', 0x3a3d42, 0.55, 0.38, true], ['dome', 0x1c1e21, 0.5, 0.42, false], ['scoop', 0x1c1e21, 0.5, 0.42, false], ['drone', 0x14161a, 0.6, 0.4, false]];
    const N = this.N = this.mobile ? 9000 : 20000; let done = 0;
    await Promise.all(defs.map(async ([name, color, metal, rough, heat]) => {
      try {
        const g = await loader.loadAsync(`assets/models/${name}.glb`); const geos = [];
        g.scene.updateMatrixWorld(true);
        g.scene.traverse((o) => { if (o.isMesh) { const ge = o.geometry.clone(); ge.applyMatrix4(o.matrixWorld); for (const k of Object.keys(ge.attributes)) if (k !== 'position' && k !== 'normal') ge.deleteAttribute(k); if (!ge.attributes.normal) ge.computeVertexNormals(); geos.push(ge); } });
        const geo = mergeGeometries(geos, false);
        if (name === 'drone') { geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(new THREE.Vector3()); geo.translate(-c.x, -c.y, -c.z); geo.computeBoundingSphere(); const s = 1 / geo.boundingSphere.radius; geo.scale(s, s, s); }
        const p = this.parts[name] = this._part(geo, color, metal, rough, heat);
        (name === 'disc' ? this.spinner : name === 'drone' ? this.rig : this.asm).add(p.grp);
        if (name === 'disc' || name === 'drone') {
          const smp = new MeshSurfaceSampler(p.grp.children[0]).build(), arr = new Float32Array(N * 3), v = new THREE.Vector3();
          for (let i = 0; i < N; i++) { smp.sample(v); arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z; }
          this.cloud[name === 'disc' ? 'rig' : 'drone'] = arr;
        }
      } catch (e) { console.warn('model failed', name, e); }
      onProgress && onProgress(++done / defs.length);
    }));
    const dust = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { dust[i * 3] = (Math.random() - 0.62) * 13; dust[i * 3 + 1] = (Math.random() - 0.5) * 7; dust[i * 3 + 2] = (Math.random() - 0.7) * 7; }
    this.cloud.none = dust;
    const rnd = new Float32Array(N); for (let i = 0; i < N; i++) rnd[i] = Math.random();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dust.slice(), 3));
    g.setAttribute('aA', new THREE.BufferAttribute(dust.slice(), 3)); g.setAttribute('aB', new THREE.BufferAttribute(dust.slice(), 3)); g.setAttribute('aR', new THREE.BufferAttribute(rnd, 1));
    this.pts = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uMix: { value: 1 }, uTime: { value: 0 }, uSize: { value: this.mobile ? 18 : 24 }, uAlpha: { value: 0.1 } },
      vertexShader: `attribute vec3 aA,aB; attribute float aR; uniform float uMix,uTime,uSize; varying float vK; varying float vR;
        void main(){ float m=clamp(uMix*1.7-aR*.7,0.,1.); m=m*m*(3.-2.*m); vec3 p=mix(aA,aB,m);
          vec3 n=vec3(sin(p.y*2.7+uTime*.9+aR*6.3),sin(p.z*3.1+uTime*1.1+aR*9.1),sin(p.x*2.3+uTime*.8+aR*4.7));
          float k=sin(m*3.14159); p+=n*(k*.6+.03); vK=k; vR=aR;
          vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=uSize*(.35+aR)*(1.+k)/-mv.z; }`,
      fragmentShader: `uniform float uAlpha; varying float vK; varying float vR;
        void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); a*=a;
          vec3 c=mix(vec3(.8,.86,.95),vec3(1.,.4,.1),vK)*(1.+vK*1.5); gl_FragColor=vec4(c*a*uAlpha*(.4+vR),1.); }` }));
    this.pts.frustumCulled = false; this.rig.add(this.pts);
    this._go(STAGES[this.stage].shape);
  }

  _go(shape) {
    if (shape === this.shape || !this.pts) return;
    const g = this.pts.geometry; g.attributes.aA.array.set(this.cloud[this.shape] || this.cloud.none); g.attributes.aB.array.set(this.cloud[shape] || this.cloud.none);
    g.attributes.aA.needsUpdate = g.attributes.aB.needsUpdate = true;
    this.prev = this.shape; this.shape = shape; this.mix = 0; this.kick(0.5);
  }
  setStage(s) { if (STAGES[s]) { this.stage = s; this._go(STAGES[s].shape); } }
  setCfg(c) { if (CFG[c]) { this.userCfg = c; this.kick(0.4); } }
  setHeld(b) { this.held = b; }
  get cfg() { return STAGES[this.stage].cfg || this.userCfg; }
  kick(v) { this.energy = Math.min(1, this.energy + v); }
  stir(x, y, dx, dy, strength = 1) {
    const k = 0.03 * strength * Math.min(1, Math.hypot(dx, dy) / 40);
    this.fluid.splat(x / innerWidth, 1 - y / innerHeight, dx / innerHeight * 5200, -dy / innerHeight * 5200, [0.55 * k, 0.75 * k, k], this.mobile ? 0.0022 : 0.0012);
    this.pointer.set(x / innerWidth * 2 - 1, -(y / innerHeight * 2 - 1));
  }
  burst(x, y) {
    const u = x / innerWidth, v = 1 - y / innerHeight;
    for (let i = 0; i < 8; i++) { const t = i / 8 * 6.283 + Math.random(); this.fluid.splat(u, v, Math.cos(t) * 900, Math.sin(t) * 900, [0.02, 0.026, 0.034], 0.0016); }
    this.kick(0.3);
  }
  scrollKick(dy) { const f = Math.max(-1, Math.min(1, dy / 80)); this.fluid.splat(Math.random(), Math.random(), (Math.random() - 0.5) * 200, f * 1500, [0.012, 0.016, 0.022], 0.004); }
  spin(dx, dy) { this.dragV.x += dx * 0.0035; this.dragV.y += dy * 0.0025; }

  resize() {
    const w = innerWidth, h = innerHeight; this.portrait = w < h * 0.9;
    this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = this.portrait ? 50 : 36; this.cam.updateProjectionMatrix();
    this.composer && this.composer.setSize(w, h);
    this.fit = this.portrait ? 0.7 : 1;
    this.bg.material.uniforms.uScrim.value = this.portrait ? 0 : 1;
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime, st = STAGES[this.stage];
    const k = 1 - Math.exp(-dt * 3); const at = this.portrait ? [0, 1.05] : (st.at || [1.45, 0]); this.anchor.x += (at[0] - this.anchor.x) * k; this.anchor.y += (at[1] - this.anchor.y) * k;
    const onRig = this.shape === 'rig', cfg = this.cfg, C = onRig ? CFG[cfg] : CFG.none, S = this.cfgS;
    this.energy *= Math.exp(-dt * 2); const e = this.energy;
    this.mix = Math.min(1, this.mix + dt / 1.6);

    // the rig: brake heats, air cools, the duct sets how fast
    const braking = this.held && onRig && this.mix > 0.6;
    this.T += (braking ? P - CFG[cfg].k * (this.T - T0) : -CFG[cfg].kr * (this.T - T0)) * dt; this.T = Math.min(5000, Math.max(T0, this.T));
    this.rpm += ((braking ? 260 : 1500) - this.rpm) * (1 - Math.exp(-dt * (braking ? 1.3 : 0.8)));
    const hn = this.hn = Math.min(1.25, Math.max(0, (this.T - 330) / 850)), bite = braking ? this.rpm / 1500 : 0;

    if (this.composer && ++this.frames > 60 && this.frames < 400) { if (dt > 0.04) this.slow++; if (this.slow > 90) { this.composer = null; this.fluid.iters = 6; this.renderer.setPixelRatio(1); this.resize(); } }

    const cp = this.cam.position, sh = bite * 0.012;
    cp.x += (st.cam[0] + this.pointer.x * 0.2 - cp.x) * k + (Math.random() - 0.5) * sh; cp.y += (st.cam[1] + this.pointer.y * 0.12 - cp.y) * k + (Math.random() - 0.5) * sh; cp.z += (st.cam[2] - cp.z) * k;
    this.cam.lookAt(this.anchor.x * 0.4, this.anchor.y * 0.4, 0);

    S.scale += (C.scale - S.scale) * k; S.cz += (C.cz - S.cz) * k; S.tx += (C.tilt[0] - S.tx) * k; S.ty += (C.tilt[1] - S.ty) * k;
    this.dragR.add(this.dragV); this.dragV.multiplyScalar(Math.exp(-dt * 3.2)); this.dragR.multiplyScalar(Math.exp(-dt * 0.55));
    const rg = this.rig; rg.position.copy(this.anchor); rg.scale.setScalar(this.fit * S.scale); this.asm.position.z = -S.cz;
    rg.rotation.x += (st.tilt[0] + S.tx - this.pointer.y * 0.1 + this.dragR.y - rg.rotation.x) * k * 1.5;
    rg.rotation.y += (st.tilt[1] + S.ty + this.pointer.x * 0.22 + this.dragR.x + (1 - this.mix) * 1.2 - rg.rotation.y) * k * 1.5;
    this.spinner.rotation.z -= dt * this.rpm / 1500 * 9;

    const rigOn = onRig && this.mix > 0.55 ? 1 : 0;
    for (const [name, m] of Object.entries(this.parts)) {
      const tgt = name === 'drone' ? (this.shape === 'drone' && this.mix > 0.55 ? 1 : 0) : name === 'disc' ? rigOn : rigOn && cfg === name ? 1 : 0;
      m.show += (tgt - m.show) * (1 - Math.exp(-dt * (tgt ? 2.6 : 7)));
      m.grp.visible = m.show > 0.01; if (!m.grp.visible) continue;
      m.u.uShow.value = m.show; m.u.uTime.value = t; m.u.uHeat.value = hn * m.show;
      m.edges.material.opacity = ((name === 'drone' ? 0.3 : name === 'disc' ? 0.04 : 0.12) + e * 0.3) * m.show;
      if (name === 'drone') { m.edges.material.color.setHex(0xffb84a); m.grp.rotation.z += dt * (0.1 + e * 1.5); }
    }
    if (this.pts) {
      const u = this.pts.material.uniforms, tr = Math.sin(this.mix * Math.PI);
      u.uMix.value = this.mix; u.uTime.value = t; u.uAlpha.value = Math.max(tr * 0.9, REST[this.shape] * this.mix + REST[this.prev] * (1 - this.mix));
      this.pts.scale.setScalar(1 / S.scale);
    }

    // sparks: thrown from where the pads clamp, along the direction the rim is moving
    const sp = this.sp, w = this.rig.matrixWorld, sc = this.fit * S.scale;
    if (bite > 0.05) {
      const n = Math.min(14, Math.ceil(dt * 520 * bite)), v3 = new THREE.Vector3();
      for (let j = 0; j < n; j++) {
        const i = sp.i = (sp.i + 1) % this.SN, a = 2.2 + (Math.random() - 0.5) * 0.35, rr = 0.72 + Math.random() * 0.26, sd = Math.random() < 0.5 ? 0.11 : -0.11;
        v3.set(Math.cos(a) * rr, Math.sin(a) * rr, sd - S.cz).applyMatrix4(w); sp.p[i * 3] = v3.x; sp.p[i * 3 + 1] = v3.y; sp.p[i * 3 + 2] = v3.z;
        const s = (2.2 + Math.random() * 3.2) * bite * sc;
        v3.set(Math.sin(a) + (Math.random() - 0.5) * 0.5, -Math.cos(a) + (Math.random() - 0.5) * 0.5, sd * 4 + (Math.random() - 0.5) * 0.6).transformDirection(w).multiplyScalar(s);
        sp.v[i * 3] = v3.x; sp.v[i * 3 + 1] = v3.y; sp.v[i * 3 + 2] = v3.z; sp.l[i] = 0.35 + Math.random() * 0.6;
      }
    }
    for (let i = 0; i < this.SN; i++) {
      const o = i * 6, j = i * 3; if (sp.l[i] <= 0) { sp.col[o] = sp.col[o + 1] = sp.col[o + 2] = 0; continue; }
      sp.l[i] -= dt; sp.v[j + 1] -= 3.2 * dt; sp.p[j] += sp.v[j] * dt; sp.p[j + 1] += sp.v[j + 1] * dt; sp.p[j + 2] += sp.v[j + 2] * dt;
      const tl = 0.035, li = Math.max(0, sp.l[i]) * 2.2;
      sp.pos[o] = sp.p[j]; sp.pos[o + 1] = sp.p[j + 1]; sp.pos[o + 2] = sp.p[j + 2]; sp.pos[o + 3] = sp.p[j] - sp.v[j] * tl; sp.pos[o + 4] = sp.p[j + 1] - sp.v[j + 1] * tl; sp.pos[o + 5] = sp.p[j + 2] - sp.v[j + 2] * tl;
      sp.col[o] = 2.4 * li; sp.col[o + 1] = 1.3 * li * li; sp.col[o + 2] = 0.35 * li * li * li; sp.col[o + 3] = sp.col[o + 4] = sp.col[o + 5] = 0;
    }
    this.sparks.geometry.attributes.position.needsUpdate = this.sparks.geometry.attributes.color.needsUpdate = true;

    // smoke only when there is heat to make it
    const ndc = this.anchor.clone().project(this.cam), gx = ndc.x * 0.5 + 0.5, gy = ndc.y * 0.5 + 0.5, bgU = this.bg.material.uniforms;
    bgU.uGlow.value.set(gx, gy); bgU.uHot.value = onRig ? Math.min(1, hn) : 0;
    const sm = onRig ? Math.min(1, Math.max(0, (this.T - 380) / 600)) + bite * 0.25 : 0;
    if (sm > 0.02) { const ang = t * 2.1, rr = 0.1 * sc; this.fluid.splat(gx + Math.cos(ang) * rr * 0.6, gy + Math.sin(ang) * rr, 200 + bite * 700, 260 + Math.sin(t * 0.9) * 120, [0.05 * sm, 0.02 * sm + 0.008 * bite, 0.008 * sm + 0.01 * bite], 0.0012); }
    this.fluid.step(Math.min(dt, 0.0167));
    bgU.tDye.value = this.fluid.texture;

    if (this.composer) { this.bloom.strength = 0.4 + bite * 0.25 + Math.min(1, hn) * 0.1; this.post.uniforms.uTime.value = t; this.post.uniforms.uAmt.value = 0.004 + bite * 0.03 + e * 0.012; this.composer.render(); }
    else this.renderer.render(this.scene, this.cam);
    return { T: this.T, rpm: this.rpm, braking, bite, cfg, onRig, hn, energy: e };
  }
}
