import"./modulepreload-polyfill-B5Qt9EMX.js";import{C as J,T as m,L as y}from"./Cursor-12wpnqhY.js";import{i as tt,q as C}from"./Quality-TTk3dsl2.js";import{z as w,N as F,K as z,H as R,Q as D,u as I,O as et,M as Y,P as j,h as Q,S as g,J as st,R as it,B as at,a as V,X as nt,Y as rt,Z as ot,V as x,f as ht,W as lt,r as ct,C as ut,s as dt,d as G,_ as mt,$ as vt,v as E}from"./three-core-B-BFjvfq.js";import{P as ft}from"./PostProcessing-CupuAfwY.js";import{M as Z,a as L,S as U,c as pt,K as u,d as _,s as H,f as gt,F as p,b as f,e as xt,r as yt,T as W,H as O,m as wt,p as bt,g as B,h as P}from"./glyph-GmXeSW2Z.js";const b="varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",Mt=`
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }
`,kt=`
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uW[${Z}];
  const float PI = 3.14159265;

  void main() {
    float cu[9], su[9], cv[9], sv[9];
    for (int m = 0; m < 9; m++) {
      float fm = float(m) * PI;
      cu[m] = cos(fm * vUv.x); su[m] = sin(fm * vUv.x);
      cv[m] = cos(fm * vUv.y); sv[m] = sin(fm * vUv.y);
    }
    vec2 A = vec2(0.0), Au = vec2(0.0), Av = vec2(0.0);
    for (int m = 0; m < 9; m++) {
      for (int n = 0; n < 9; n++) {
        vec2 w = uW[m * 9 + n];
        A  += w * (cu[m] * cv[n]);
        Au += w * (-float(m) * PI * su[m] * cv[n]);
        Av += w * (-float(n) * PI * cu[m] * sv[n]);
      }
    }
    // ∇|A|² = 2 Re(conj(A) ∇A)
    gl_FragColor = vec4(length(A), 2.0 * dot(A, Au), 2.0 * dot(A, Av), 1.0);
  }
`,Tt=`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPos;
  uniform sampler2D uVel;
  uniform sampler2D uField;
  uniform float uDrive;    // amplitude → plate acceleration in g
  uniform float uDt;
  uniform float uTime;
  uniform float uHold;     // 1 = frozen (tumbler set), grains stay put
  uniform float uScatter;  // one-shot shake that redistributes everything
  ${Mt}

  const float GRAVITY = 7.5;

  void main() {
    vec4 P = texture2D(uPos, vUv);
    vec4 V = texture2D(uVel, vUv);
    vec4 F = texture2D(uField, P.xy);

    float acc = F.r * uDrive * (1.0 - uHold);
    bool grounded = P.z <= 0.0;
    vec2 r = hash22(vUv * 1731.0 + fract(uTime * 13.17) * 97.0);

    if (grounded) {
      float excess = acc - 1.0;
      if (uScatter > 0.0) {
        float a = r.x * 6.2831853;
        V.xy = vec2(cos(a), sin(a)) * (0.1 + 0.3 * r.y) * uScatter;
        V.z = (0.25 + 0.3 * fract(r.y * 5.31)) * uScatter;
      } else if (excess > 0.0) {
        // bounce: a random scatter plus a bias down the amplitude slope —
        // a grain lands a little nearer the node more often than not
        float e = min(sqrt(excess), 2.4);
        float a = r.x * 6.2831853;
        vec2 slope = F.gb;
        float sl = length(slope);
        vec2 downhill = sl > 1e-4 ? -slope / sl * min(sl * 0.15, 1.0) : vec2(0.0);
        V.xy = vec2(cos(a), sin(a)) * e * (0.015 + 0.035 * r.y) + downhill * (0.12 + 0.1 * e) * (0.8 + 0.4 * fract(r.y * 3.7));
        V.z = e * (0.1 + 0.14 * fract(r.y * 7.13));
      } else if (acc > 0.12) {
        // below launch, a buzzing surface still ratchets grains downhill:
        // this is what collapses the still band onto one crisp nodal line
        vec2 slope = F.gb;
        float sl = length(slope);
        V.xy = sl > 1e-4 ? -slope / sl * (acc - 0.12) * 0.05 : vec2(0.0);
        V.z = 0.0;
      } else {
        V = vec4(0.0);
      }
    } else {
      V.z -= GRAVITY * uDt;
      V.xy *= 1.0 - 1.5 * uDt;
    }
    gl_FragColor = V;
  }
`,At=`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPos;
  uniform sampler2D uVel;
  uniform float uDt;

  void main() {
    vec4 P = texture2D(uPos, vUv);
    vec4 V = texture2D(uVel, vUv);
    P.xyz += V.xyz * uDt;
    P.z = max(P.z, 0.0);
    // the plate has a rim: reflect back inside
    P.xy = 1.0 - abs(1.0 - abs(P.xy));
    P.xy = clamp(P.xy, 0.002, 0.998);
    gl_FragColor = P;
  }
`,St=`
  attribute vec2 ref;
  uniform sampler2D uPos;
  uniform sampler2D uField;
  uniform float uSize;
  uniform float uDist;
  uniform float uHop;
  uniform float uPeak;
  varying float vAir;
  varying float vNode;
  varying float vSeed;

  void main() {
    vec4 P = texture2D(uPos, ref);
    float amp = texture2D(uField, P.xy).r;
    vAir = clamp(P.z * 60.0, 0.0, 1.0);
    vNode = 1.0 - clamp(amp / max(uPeak, 1e-3) * 5.0, 0.0, 1.0);
    vSeed = P.w;
    vec3 world = vec3((P.xy - 0.5) * 2.0, P.z * uHop);
    vec4 mv = modelViewMatrix * vec4(world, 1.0);
    gl_PointSize = uSize * (0.75 + 0.5 * fract(P.w * 17.3) + vAir * 0.4) * (uDist / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`,Gt=`
  precision highp float;
  uniform vec3 uAccent;
  uniform float uLock;     // 0..1 glow of a set tumbler
  uniform float uGain;
  varying float vAir;
  varying float vNode;
  varying float vSeed;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    // quartz sand: bone with a few darker and a few glinting grains
    float tone = fract(vSeed * 91.7);
    vec3 sand = mix(vec3(0.34, 0.31, 0.27), vec3(0.86, 0.82, 0.74), tone);
    sand *= 0.8 + 0.6 * vAir;
    vec3 col = mix(sand, uAccent * uAccent * 2.2 + 0.08, uLock * vNode);
    float a = (1.0 - d * 2.0) * uGain * (0.7 + 0.5 * vAir);
    gl_FragColor = vec4(col * a, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;class Pt{constructor(t,e){this.renderer=t;const i=e.isMobile?208:320;this.simW=i,this.simH=i,this.count=i*i,this.weights=new Float32Array(Z*2);const s={type:t.capabilities.isWebGL2&&t.extensions.has("EXT_color_buffer_float")?z:R,minFilter:F,magFilter:F,depthBuffer:!1,stencilBuffer:!1};this.pos=[new w(i,i,s),new w(i,i,s)],this.vel=[new w(i,i,s),new w(i,i,s)],this.field=new w(256,256,{type:R,minFilter:I,magFilter:I,wrapS:D,wrapT:D,depthBuffer:!1,stencilBuffer:!1}),this.quadCamera=new et(-1,1,1,-1,0,1),this.quad=new Y(new j(2,2)),this.quadScene=new Q,this.quadScene.add(this.quad),this.fieldMat=new g({uniforms:{uW:{value:this.weights}},vertexShader:b,fragmentShader:kt}),this.velMat=new g({uniforms:{uPos:{value:null},uVel:{value:null},uField:{value:this.field.texture},uDrive:{value:1},uDt:{value:1/120},uTime:{value:0},uHold:{value:0},uScatter:{value:0}},vertexShader:b,fragmentShader:Tt}),this.posMat=new g({uniforms:{uPos:{value:null},uVel:{value:null},uDt:{value:1/120}},vertexShader:b,fragmentShader:At}),this.seed(),this.buildPoints(e)}seed(){const t=new Float32Array(this.count*4);for(let s=0;s<this.count;s++)t[s*4]=Math.random(),t[s*4+1]=Math.random(),t[s*4+2]=0,t[s*4+3]=Math.random();const e=new st(t,this.simW,this.simH,it,z);e.needsUpdate=!0;const i=new g({uniforms:{t:{value:e}},vertexShader:b,fragmentShader:"uniform sampler2D t; varying vec2 vUv; void main() { gl_FragColor = texture2D(t, vUv); }"}),a=new g({vertexShader:b,fragmentShader:"void main() { gl_FragColor = vec4(0.0); }"});this.pass(i,this.pos[0]),this.pass(i,this.pos[1]),this.pass(a,this.vel[0]),this.pass(a,this.vel[1]),i.dispose(),a.dispose(),e.dispose()}buildPoints(t){const e=new Float32Array(this.count*2);for(let a=0;a<this.count;a++)e[a*2]=(a%this.simW+.5)/this.simW,e[a*2+1]=(Math.floor(a/this.simW)+.5)/this.simH;const i=new at;i.setAttribute("position",new V(new Float32Array(this.count*3),3)),i.setAttribute("ref",new V(e,2)),this.pointsMat=new g({uniforms:{uPos:{value:this.pos[0].texture},uField:{value:this.field.texture},uSize:{value:1.6},uDist:{value:6},uHop:{value:t.reducedMotion?.8:2.4},uPeak:{value:1},uAccent:{value:new x(.2,.7,.77)},uLock:{value:0},uGain:{value:t.isMobile?.55:.42}},vertexShader:St,fragmentShader:Gt,transparent:!0,depthWrite:!1,blending:ot,blendSrc:rt,blendDst:nt}),this.points=new ht(i,this.pointsMat),this.points.frustumCulled=!1,this.points.renderOrder=2}pass(t,e){this.quad.material=t,this.renderer.setRenderTarget(e),this.renderer.render(this.quadScene,this.quadCamera)}setWeights(t){this.weights.set(t),this.pass(this.fieldMat,this.field),this.renderer.setRenderTarget(null)}step(t,e,{drive:i,hold:a,scatter:s}){const n=this.velMat.uniforms;n.uDrive.value=i,n.uHold.value=a,n.uScatter.value=s,n.uDt.value=t,n.uTime.value=e,n.uPos.value=this.pos[0].texture,n.uVel.value=this.vel[0].texture,this.pass(this.velMat,this.vel[1]),this.vel.reverse();const o=this.posMat.uniforms;o.uDt.value=t,o.uPos.value=this.pos[0].texture,o.uVel.value=this.vel[0].texture,this.pass(this.posMat,this.pos[1]),this.pos.reverse(),this.renderer.setRenderTarget(null),this.pointsMat.uniforms.uPos.value=this.pos[0].texture}dispose(){[...this.pos,...this.vel,this.field].forEach(t=>t.dispose()),[this.fieldMat,this.velMat,this.posMat,this.pointsMat].forEach(t=>t.dispose()),this.quad.geometry.dispose(),this.points.geometry.dispose()}}const Ct=`
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`,Ft=`
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorld;
  uniform sampler2D uField;
  uniform float uPeak;
  uniform float uTime;
  uniform vec3 uAccent;
  uniform vec3 uCam;
  uniform vec2 uDrive;
  uniform float uDriveOn;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    // brushed steel: long anisotropic streaks along u
    float brush = noise(vec2(uv.x * 3.0, uv.y * 900.0)) * 0.6 + noise(vec2(uv.x * 11.0, uv.y * 2400.0)) * 0.4;
    // (linear light: the output pass tonemaps + encodes)
    vec3 base = vec3(0.011, 0.012, 0.0145) * (0.8 + 0.4 * brush);

    // soft key light as a broad specular band that shifts with the viewer
    vec3 N = vec3(0.0, 0.0, 1.0);
    vec3 V = normalize(uCam - vWorld);
    vec3 L = normalize(vec3(-0.6, 0.9, 1.4));
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 60.0) * (0.5 + 0.5 * brush);
    base += vec3(0.07, 0.074, 0.084) * spec;
    base += vec3(0.004, 0.0045, 0.005) * pow(1.0 - max(dot(N, V), 0.0), 3.0);

    // vibration haze where the plate is loud
    float amp = texture2D(uField, uv).r / max(uPeak, 1e-3);
    float shimmer = 0.5 + 0.5 * sin(uTime * 41.0 + uv.x * 60.0 + uv.y * 47.0);
    base += vec3(0.004, 0.0044, 0.005) * smoothstep(0.45, 1.0, amp) * (0.5 + 0.5 * shimmer);

    // bevelled rim + engraved edge ticks (instrument feel)
    vec2 e = min(uv, 1.0 - uv);
    float edge = min(e.x, e.y);
    base += vec3(0.05) * smoothstep(0.006, 0.0, edge);
    base *= mix(0.55, 1.0, smoothstep(0.0, 0.03, edge));
    float tickU = step(0.94, fract(uv.x * 16.0 + 0.03)) * step(edge, 0.018) * step(e.y, 0.018);
    float tickV = step(0.94, fract(uv.y * 16.0 + 0.03)) * step(edge, 0.018) * step(e.x, 0.018);
    base += vec3(0.012) * max(tickU, tickV);

    // center bolt
    float r = length(uv - 0.5);
    float bolt = smoothstep(0.022, 0.018, r);
    base = mix(base, vec3(0.016, 0.017, 0.019) + spec * 0.08, bolt);
    base += vec3(0.02) * smoothstep(0.003, 0.0, abs(r - 0.021));

    // transducer puck
    float pd = length(uv - uDrive);
    float ring = smoothstep(0.004, 0.0, abs(pd - 0.028)) + 0.5 * smoothstep(0.003, 0.0, abs(pd - 0.012));
    float pulse = 0.6 + 0.4 * sin(uTime * 6.0);
    base += uAccent * uAccent * ring * uDriveOn * pulse * 0.8;

    gl_FragColor = vec4(base, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;class zt{constructor(t,e){this.quality=e,this.renderer=new lt({antialias:!e.postProcessing,powerPreference:"high-performance"}),this.dpr=Math.min(devicePixelRatio,e.maxPixelRatio),this.renderer.setPixelRatio(this.dpr),this.renderer.setSize(innerWidth,innerHeight),this.renderer.toneMapping=ct,this.renderer.toneMappingExposure=1.1,t.appendChild(this.renderer.domElement),this.scene=new Q,this.scene.background=new ut(460552),this.camera=new dt(30,innerWidth/innerHeight,.1,50),this.look=new x(0,0,0),this.parallax=new G,this.frame={x:0,y:0,zoom:1},this.frameGoal={x:0,y:0,zoom:1},this.sand=new Pt(this.renderer,e),this.plateUniforms={uField:{value:this.sand.field.texture},uPeak:{value:1},uTime:{value:0},uAccent:{value:new x(.2,.7,.77)},uCam:{value:new x},uDrive:{value:new G(.5,.5)},uDriveOn:{value:0}},this.plate=new Y(new j(2,2),new g({uniforms:this.plateUniforms,vertexShader:Ct,fragmentShader:Ft})),this.plate.renderOrder=1,this.scene.add(this.plate),this.sand.points.position.z=.002,this.scene.add(this.sand.points),e.postProcessing&&(this.post=new ft(this.renderer,this.camera)),this.raycaster=new mt,this.ndc=new G,this.planeZ=new vt(new x(0,0,1),0),this.hit=new x,this.resize(innerWidth,innerHeight)}setAccent(t){this.plateUniforms.uAccent.value.set(...t),this.sand.pointsMat.uniforms.uAccent.value.set(...t)}pick(t,e,i=!1){if(this.ndc.set(t/innerWidth*2-1,-(e/innerHeight)*2+1),this.raycaster.setFromCamera(this.ndc,this.camera),!this.raycaster.ray.intersectPlane(this.planeZ,this.hit))return null;let a=(this.hit.x+1)/2,s=(this.hit.y+1)/2;return!(a>=0&&a<=1&&s>=0&&s<=1)&&!i?null:(a=Math.min(.985,Math.max(.015,a)),s=Math.min(.985,Math.max(.015,s)),{u:a,v:s})}project(t,e){const i=new x(t*2-1,e*2-1,0).project(this.camera);return{x:(i.x+1)/2*innerWidth,y:(1-i.y)/2*innerHeight}}resize(t,e){var o;this.renderer.setSize(t,e),(o=this.post)==null||o.resize(t,e),this.camera.aspect=t/e,this.portrait=t/e<.9;const i=this.portrait?.88:.6,a=E.degToRad(this.camera.fov/2),s=1/(Math.tan(a)*i),n=s/Math.min(1,this.camera.aspect);this.baseDist=this.portrait?n:s,this.camera.updateProjectionMatrix(),this.sand.pointsMat.uniforms.uSize.value=this.dpr*Math.min(1.5,Math.max(1.05,e/760)),this.place()}setFraming(t,e,i=1){this.frameGoal={x:t,y:e,zoom:i}}place(){const e=this.baseDist/this.frame.zoom;this.dist=e;const i=Math.tan(E.degToRad(this.camera.fov/2))*e,a=i*this.camera.aspect,s=-this.frame.x*a*2,n=-this.frame.y*i*2-.08;this.camera.position.set(s+this.parallax.x*.35,n-Math.sin(.5)*e+this.parallax.y*.2,Math.cos(.5)*e),this.look.set(s,n,0),this.camera.lookAt(this.look),this.plateUniforms.uCam.value.copy(this.camera.position),this.sand.pointsMat.uniforms.uDist.value=e}render(t,e,{peak:i,drive:a,driveOn:s,lock:n}){this.plateUniforms.uTime.value=e,this.plateUniforms.uPeak.value=i,this.plateUniforms.uDrive.value.set(a.u,a.v),this.plateUniforms.uDriveOn.value=s;const o=this.sand.pointsMat.uniforms;o.uPeak.value=i,o.uLock.value=n;const l=Math.min(1,t*2.2);this.frame.x+=(this.frameGoal.x-this.frame.x)*l,this.frame.y+=(this.frameGoal.y-this.frame.y)*l,this.frame.zoom+=(this.frameGoal.zoom-this.frame.zoom)*l,this.place(),this.post?this.post.render(t,this.scene):this.renderer.render(this.scene,this.camera)}glitch(t){var e;(e=this.post)==null||e.triggerGlitch(t)}dispose(){var t;this.sand.dispose(),this.plate.geometry.dispose(),this.plate.material.dispose(),(t=this.post)==null||t.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}const $="resonance-muted-v1";class Rt{constructor(){this.ctx=null;try{this.muted=localStorage.getItem($)==="1"}catch{this.muted=!1}}start(){var h,v;if(this.ctx){(v=(h=this.ctx).resume)==null||v.call(h);return}const t=window.AudioContext||window.webkitAudioContext;if(!t)return;const e=new t;this.ctx=e,this.master=e.createGain(),this.master.gain.value=this.muted?0:.9;const i=e.createDynamicsCompressor();i.threshold.value=-18,i.ratio.value=4,this.master.connect(i).connect(e.destination);const a=e.createBiquadFilter();a.type="lowpass",a.frequency.value=2400,a.connect(this.master),this.drive=e.createOscillator(),this.drive.type="sine",this.driveGain=e.createGain(),this.driveGain.gain.value=0,this.drive.connect(this.driveGain).connect(a),this.sub=e.createOscillator(),this.sub.type="triangle",this.subGain=e.createGain(),this.subGain.gain.value=0,this.sub.connect(this.subGain).connect(a),this.ring=e.createOscillator(),this.ring.type="sine",this.ringGain=e.createGain(),this.ringGain.gain.value=0,this.ring.connect(this.ringGain).connect(a);const s=e.createBufferSource(),n=e.createBuffer(1,e.sampleRate*2,e.sampleRate),o=n.getChannelData(0);for(let d=0;d<o.length;d++)o[d]=Math.random()*2-1;s.buffer=n,s.loop=!0,this.noiseBuf=n;const l=e.createBiquadFilter();l.type="bandpass",l.frequency.value=3800,l.Q.value=.7,this.hissGain=e.createGain(),this.hissGain.gain.value=0,s.connect(l).connect(this.hissGain).connect(this.master),[this.drive,this.sub,this.ring,s].forEach(d=>d.start())}set(t,e,i){if(!this.ctx)return;const a=this.ctx.currentTime,s=.05;this.drive.frequency.setTargetAtTime(t,a,.02),this.sub.frequency.setTargetAtTime(t/2,a,.02),this.ring.frequency.setTargetAtTime(t*1.0021,a,.02);const n=Math.min(1,220/t);this.driveGain.gain.setTargetAtTime(.018+e*.13,a,s),this.subGain.gain.setTargetAtTime((.01+e*.05)*(.5+n),a,s),this.ringGain.gain.setTargetAtTime(e*e*.08,a,s),this.hissGain.gain.setTargetAtTime(Math.min(1,i*1.6)*.05,a,.08)}silence(){if(!this.ctx)return;const t=this.ctx.currentTime;[this.driveGain,this.subGain,this.ringGain,this.hissGain].forEach(e=>e.gain.setTargetAtTime(0,t,.12))}clack(t=!1){if(!this.ctx)return;const e=this.ctx,i=e.currentTime,a=e.createOscillator();a.frequency.setValueAtTime(t?120:160,i),a.frequency.exponentialRampToValueAtTime(48,i+.18);const s=e.createGain();s.gain.setValueAtTime(.5,i),s.gain.exponentialRampToValueAtTime(.001,i+.28),a.connect(s).connect(this.master),a.start(i),a.stop(i+.3);const n=e.createBufferSource();n.buffer=this.noiseBuf;const o=e.createBiquadFilter();o.type="highpass",o.frequency.value=1800;const l=e.createGain();l.gain.setValueAtTime(.28,i),l.gain.exponentialRampToValueAtTime(.001,i+.06),n.connect(o).connect(l).connect(this.master),n.start(i,Math.random()),n.stop(i+.08),[1,2.76,5.4].forEach((h,v)=>{const d=e.createOscillator();d.frequency.value=(t?660:880)*h;const S=e.createGain();S.gain.setValueAtTime(.06/(v+1),i+.01),S.gain.exponentialRampToValueAtTime(5e-4,i+(t?2.4:1.1)/(v+1)),d.connect(S).connect(this.master),d.start(i),d.stop(i+2.5)})}open(){if(!this.ctx)return;const t=this.ctx,e=t.currentTime;[110,165,220,330.5].forEach((i,a)=>{const s=t.createOscillator();s.type=a%2?"triangle":"sine",s.frequency.value=i;const n=t.createGain();n.gain.setValueAtTime(0,e),n.gain.linearRampToValueAtTime(.07/(1+a*.4),e+1.6+a*.2),n.gain.exponentialRampToValueAtTime(5e-4,e+7),s.connect(n).connect(this.master),s.start(e),s.stop(e+7.2)})}setMuted(t){this.muted=t;try{localStorage.setItem($,t?"1":"0")}catch{}this.ctx&&this.master.gain.setTargetAtTime(t?0:.9,this.ctx.currentTime,.1)}suspend(){var t,e;(e=(t=this.ctx)==null?void 0:t.suspend)==null||e.call(t)}resume(){var t,e;(e=(t=this.ctx)==null?void 0:t.resume)==null||e.call(t)}}const T=30,q=5,N=.55,M=640,K=[{f:4,drive:[.5,.5]},{f:20,drive:[.5,.5]},{f:25,drive:[.02,.03]},{f:13,drive:[.1,.08]},{f:50,drive:[.15,.15]},{f:41,drive:[.2,.02]},{f:65,drive:[.02,.02]},{f:34,drive:[.3,.12]}],r=c=>document.getElementById(c),A=c=>Math.min(1,Math.max(0,c)),k=c=>`${String(Math.floor(c/60)).padStart(2,"0")}:${String(Math.floor(c%60)).padStart(2,"0")}`;class Dt{constructor(){this.stage=new zt(r("stage"),C),this.tone=new Rt,this.cursor=new J,this.mode="attract",this.f=4,this.fGoal=4,this.drive={u:.5,v:.5},this.driveGoal={u:.5,v:.5},this.keyIndex=0,this.hold=0,this.lockGlow=0,this.setting=0,this.scatter=0,this.elapsed=0,this.fullRun=!1,this.attractIndex=0,this.attractClock=0,this.trace=new Float32Array(M),this.weights=new Float32Array(L*L*2),this.cur=new Float32Array(T*T),this.readouts={match:0,tune:0,peak:0,airborne:0},this.parallax={x:0,y:0},this.save=this.load(),this.buildRing(),this.bindUI(),this.bindInput(),this.applyLens(m.lens),m.onChange(t=>this.applyLens(t)),this.frame(),window.addEventListener("resize",()=>{this.stage.resize(innerWidth,innerHeight),this.frame()}),document.addEventListener("visibilitychange",()=>{document.hidden?this.tone.suspend():this.mode!=="attract"&&this.tone.resume()}),this.last=performance.now(),requestAnimationFrame(t=>this.loop(t)),window.__resonance=this}load(){try{return{solved:0,best:null,...JSON.parse(localStorage.getItem(U)||"{}")}}catch{return{solved:0,best:null}}}persist(){try{localStorage.setItem(U,JSON.stringify(this.save))}catch{}}applyLens(t){this.copy=pt(t),this.accent=m.rgb,this.stage.setAccent(m.accentVec3()),r("rz-eyebrow").textContent=this.copy.eyebrow,r("rz-kicker").textContent=this.copy.kicker,r("rz-lede").textContent=this.copy.lede,this.refreshRing(),this.mode==="vault"&&this.showKey()}buildRing(){const t=r("rz-ring");this.ringSlots=u.map((e,i)=>{const a=document.createElement("div");return a.className="rz-slot",a.innerHTML=`<canvas width="72" height="72"></canvas><span>0${i+1}</span>`,t.appendChild(a),a})}refreshRing(){this.ringSlots.forEach((t,e)=>{const i=this.mode==="vault"||this.mode==="open"?e<this.keyIndex:e<this.save.solved;t.classList.toggle("done",i),t.classList.toggle("current",this.mode==="vault"&&e===this.keyIndex),_(t.querySelector("canvas"),u[e],this.accent,{dim:!i})})}bindUI(){r("rz-begin").addEventListener("click",()=>this.startVault(0)),r("rz-continue").addEventListener("click",()=>this.startVault(this.save.solved)),r("rz-studio").addEventListener("click",()=>this.startStudio()),r("rz-exit").addEventListener("click",()=>this.toAttract()),r("rz-scatter").addEventListener("click",()=>{this.scatter=.6}),r("rz-again").addEventListener("click",()=>this.startVault(0)),r("rz-open-studio").addEventListener("click",()=>this.startStudio());const t=r("rz-sound"),e=()=>{t.textContent=this.tone.muted?"Sound: Off":"Sound: On",t.classList.toggle("on",!this.tone.muted)};t.addEventListener("click",()=>{this.tone.setMuted(!this.tone.muted),e()}),e(),this.refreshIntro()}refreshIntro(){const t=r("rz-continue"),e=this.save.solved>0&&this.save.solved<u.length;t.hidden=!e,e&&(t.textContent=`Continue · Key 0${this.save.solved+1}`);const i=["Sound on · headphones recommended"];this.save.best&&i.push(`Best run ${k(this.save.best)}`),r("rz-note").textContent=i.join(" · ")}setMode(t){t!==this.mode&&(this.setting=0),this.mode=t,document.body.dataset.mode=t,this.refreshRing(),this.frame()}frame(){const t=innerWidth/innerHeight<.9;this.mode==="attract"?t?this.stage.setFraming(0,.2,.86):this.stage.setFraming(innerWidth>1100?.2:.15,0,.9):t?this.stage.setFraming(0,.02,.96):this.stage.setFraming(0,0,1)}toAttract(){this.tone.silence(),this.setMode("attract"),this.refreshIntro(),r("rz-open").hidden=!0}startVault(t){this.tone.start(),this.keyIndex=t,this.fullRun=t===0,this.elapsed=0,this.setting=0,this.hold=0,r("rz-open").hidden=!0,this.setMode("vault"),this.showKey(),this.scatter=.5,this.status("")}startStudio(){this.tone.start(),r("rz-open").hidden=!0,document.body.classList.remove("drive-locked"),this.setMode("studio"),this.trace.fill(0),this.status("Free play · every figure is real")}showKey(){const t=u[this.keyIndex];t&&(r("rk-index").textContent=`Key 0${this.keyIndex+1} / 0${u.length}`,r("rk-name").textContent=t.name,r("rk-hint").textContent=t.hint,_(r("rk-canvas"),t,this.accent),this.target=H(gt(t.f,t.drive[0],t.drive[1]),T),this.trace.fill(0),t.locked&&(this.driveGoal={u:.5,v:.5}),document.body.classList.toggle("drive-locked",!!t.locked),this.refreshRing())}status(t,e=!1){const i=r("rz-status");i.textContent=t,i.classList.toggle("flash",e)}bindInput(){const t=r("rr-canvas"),e=s=>s.target.closest("button, a, #rz-intro, #rz-open, #rz-key");let i=null;window.addEventListener("pointerdown",s=>{var o,l;if(this.mode!=="vault"&&this.mode!=="studio")return;if(s.target===t){const h=t.getBoundingClientRect();this.fGoal=this.railToF((s.clientX-h.left)/h.width),i={type:"rail",x:s.clientX,f:this.fGoal,top:h.top},(o=t.setPointerCapture)==null||o.call(t,s.pointerId);return}if(e(s))return;const n=this.stage.pick(s.clientX,s.clientY);if(n){if(this.mode==="vault"&&((l=u[this.keyIndex])!=null&&l.locked)){this.status("The drive is bolted to the center for this key · tune instead",!0);return}i={type:"drive"},this.driveGoal=n}}),window.addEventListener("pointermove",s=>{if(this.parallax.x=(s.clientX/innerWidth-.5)*2,this.parallax.y=(s.clientY/innerHeight-.5)*2,!!i)if(i.type==="rail"){const o=1/(1+Math.max(0,i.top-s.clientY)/45),l=t.getBoundingClientRect(),h=(p-f)/l.width;this.fGoal=this.clampF(this.fGoal+(s.clientX-i.x)*h*o),i.x=s.clientX}else{const n=this.stage.pick(s.clientX,s.clientY,!0);n&&(this.driveGoal=n)}});const a=()=>{i=null};window.addEventListener("pointerup",a),window.addEventListener("pointercancel",a),window.addEventListener("wheel",s=>{if(this.mode!=="vault"&&this.mode!=="studio")return;s.preventDefault();const n=s.shiftKey?6e-4:.0028,o=Math.abs(s.deltaY)>Math.abs(s.deltaX)?s.deltaY:s.deltaX;this.fGoal=this.clampF(this.fGoal-o*n)},{passive:!1}),window.addEventListener("keydown",s=>{if(this.mode!=="vault"&&this.mode!=="studio")return;const n=s.shiftKey?.01:.06;(s.key==="ArrowRight"||s.key==="ArrowUp")&&(this.fGoal=this.clampF(this.fGoal+n),s.preventDefault()),(s.key==="ArrowLeft"||s.key==="ArrowDown")&&(this.fGoal=this.clampF(this.fGoal-n),s.preventDefault()),s.key==="Escape"&&this.toAttract()})}clampF(t){return Math.min(p,Math.max(f,t))}railToF(t){return this.clampF(f+A(t)*(p-f))}attract(t){this.attractClock+=t;const e=K[this.attractIndex];this.attractClock>6.5&&(this.attractClock=0,this.attractIndex=(this.attractIndex+1)%K.length,this.scatter=.35);const i=Math.sin(this.attractClock*.7)*.05;this.fGoal=e.f+i,this.driveGoal={u:e.drive[0],v:e.drive[1]}}width(){var t;return this.mode==="vault"?((t=u[this.keyIndex])==null?void 0:t.width)??N:this.mode==="attract"?.7:N}judge(t){const e=u[this.keyIndex];if(!e||this.setting>0)return;const i=xt(this.cur,this.target),a=yt(this.f,e.f,e.width);this.readouts.match=i,this.readouts.tune=a;const s=this.readouts.peak>.9,n=i>=e.match&&a>=W&&s;this.hold=A(this.hold+(n?t/O:-t/(O*.6))),n?this.status(this.hold>.5?"Hold it…":"That is the key · hold the note"):s?a<W&&i>=e.match-.05?this.status("Close · fine-tune the note"):this.status(""):this.status("The plate is quiet · find a resonance"),this.hold>=1&&this.setTumbler()}setTumbler(){var e;const t=u[this.keyIndex];this.setting=2.3,this.hold=0,this.tone.clack(this.keyIndex===u.length-1),this.stage.glitch(.45),this.status(`Tumbler ${this.keyIndex+1} set · ${t.name}`,!0),this.keyIndex+=1,this.save.solved=Math.max(this.save.solved,this.keyIndex),this.persist(),this.refreshRing(),(e=this.ringSlots[this.keyIndex-1])==null||e.classList.add("just")}afterSet(){if(this.keyIndex>=u.length){this.openVault();return}this.scatter=.55,this.showKey(),this.status("")}openVault(){this.setMode("open"),this.tone.open(),this.tone.silence();const t=this.elapsed;this.fullRun&&(!this.save.best||t<this.save.best)&&(this.save.best=t),this.save.solved=0,this.persist(),r("ro-title").textContent=this.copy.openTitle,r("ro-body").textContent=this.copy.openBody,r("ro-time").textContent=this.fullRun?`Run ${k(t)}${this.save.best?` · Best ${k(this.save.best)}`:""}`:`Resumed run · ${k(t)}`;const i=y.list().find(n=>!y.isUnlocked(n.id))||y.list().find(n=>n.id!==y.activeId),a=r("ro-code"),s=r("ro-switch");i?(y.unlock(i.id),a.innerHTML=`Recovered codename <b>${i.codename.toUpperCase()}</b> · type it on any page`,s.hidden=!1,s.textContent=`Switch to ${i.label}`,s.onclick=()=>m.switchLive(i.id)):(a.textContent="",s.hidden=!0),r("rz-open").hidden=!1}loop(t){requestAnimationFrame(l=>this.loop(l));const e=Math.min(.05,(t-this.last)/1e3);this.last=t;const i=t/1e3;if(document.hidden)return;(this.mode==="attract"||this.mode==="open")&&this.attract(e),this.mode==="vault"&&this.setting<=0&&(this.elapsed+=e),this.f+=(this.fGoal-this.f)*Math.min(1,e*12),this.drive.u+=(this.driveGoal.u-this.drive.u)*Math.min(1,e*16),this.drive.v+=(this.driveGoal.v-this.drive.v)*Math.min(1,e*16),wt(this.f,this.drive.u,this.drive.v,this.width(),this.weights),this.stage.sand.setWeights(this.weights),H(this.weights,T,this.cur);const a=bt(this.cur);this.readouts.peak=a;let s=0;for(let l=0;l<this.cur.length;l++)this.cur[l]*q>1&&s++;this.readouts.airborne=s/this.cur.length,this.mode==="vault"&&this.judge(e),this.setting>0&&(this.setting-=e,this.setting<=0&&this.mode==="vault"&&this.afterSet());const n=this.setting>.5?1:0;this.lockGlow+=((this.setting>0?1:this.hold*.35)-this.lockGlow)*Math.min(1,e*5),this.simAcc=(this.simAcc||0)+e;let o=0;for(;this.simAcc>=1/120&&o<4;)this.stage.sand.step(1/120,i+o*.0083,{drive:q,hold:n,scatter:this.scatter>0?1.1:0}),this.simAcc-=1/120,o++;this.scatter=Math.max(0,this.scatter-e),C.reducedMotion||(this.stage.parallax.x+=(this.parallax.x-this.stage.parallax.x)*Math.min(1,e*2),this.stage.parallax.y+=(this.parallax.y-this.stage.parallax.y)*Math.min(1,e*2)),this.stage.render(e,i,{peak:Math.max(a,.6),drive:this.drive,driveOn:this.mode==="vault"||this.mode==="studio"?1:.35,lock:this.lockGlow}),(this.mode==="vault"||this.mode==="studio")&&this.updateHud(e)}updateHud(){const t=this.f*B,e=A((this.readouts.peak-.25)/1.6);this.tone.set(t,e,this.readouts.airborne);const i=Math.round((this.f-f)/(p-f)*(M-1));for(let n=Math.max(0,i-1);n<=Math.min(M-1,i+1);n++)this.trace[n]=Math.max(this.trace[n],e);r("rr-hz").textContent=`${t.toFixed(1)} Hz`;const a=Math.round(this.f),s=Math.abs(this.f-a)<.3&&P(a)&&e>.25;if(r("rr-mode").textContent=s?`Mode ${P(a)}`:"Between modes",r("t-plate").textContent=e>.45?"SINGING":e>.15?"HUMMING":"QUIET",r("t-plate").classList.toggle("live",e>.45),this.mode==="vault"){r("rk-match").textContent=`${Math.round(A(this.readouts.match)*100)}%`,r("rk-tune").textContent=`${Math.round(this.readouts.tune*100)}%`;const n=r("rk-progress");n.style.strokeDashoffset=String(1-this.hold),r("t-key").textContent=`${String(Math.min(this.keyIndex+1,u.length)).padStart(2,"0")}/${String(u.length).padStart(2,"0")}`,r("t-time").textContent=k(this.elapsed)}this.drawRail()}drawRail(){const t=r("rr-canvas"),e=Math.min(devicePixelRatio||1,2),i=t.clientWidth,a=t.clientHeight;(t.width!==Math.round(i*e)||t.height!==Math.round(a*e))&&(t.width=Math.round(i*e),t.height=Math.round(a*e));const s=t.getContext("2d");s.setTransform(e,0,0,e,0,0),s.clearRect(0,0,i,a);const n=a-18,o=h=>(h-f)/(p-f)*i;s.strokeStyle="rgba(232, 230, 225, 0.14)",s.beginPath(),s.moveTo(0,n+.5),s.lineTo(i,n+.5),s.stroke(),s.fillStyle="rgba(232, 230, 225, 0.32)",s.font=`9px ${getComputedStyle(document.body).getPropertyValue("--mono")||"monospace"}`,s.textAlign="center";for(let h=5;h<=p;h+=5){const v=h%10===0;s.fillRect(Math.round(o(h)),n+2,1,v?6:3),v&&s.fillText(`${Math.round(h*B)}`,o(h),a-1)}if(this.mode==="studio"){s.fillStyle=m.accentRgba(.5);for(let h=1;h<=p;h++)P(h)&&s.fillRect(Math.round(o(h))-1,n-3,2,2)}s.beginPath(),s.moveTo(0,n);for(let h=0;h<M;h++)s.lineTo(h/(M-1)*i,n-this.trace[h]*(n-6));s.lineTo(i,n),s.closePath(),s.fillStyle=m.accentRgba(.16),s.fill(),s.strokeStyle=m.accentRgba(.55),s.stroke();const l=o(this.f);s.fillStyle=m.accentRgba(1),s.fillRect(Math.round(l)-.5,0,1.5,n),s.beginPath(),s.moveTo(l-5,n+7),s.lineTo(l+5,n+7),s.lineTo(l,n+1),s.closePath(),s.fill()}}function X(){var c;if(!tt()){(c=document.getElementById("webgl-fallback"))==null||c.classList.add("visible");return}document.body.dataset.mode="attract",new Dt}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",X):X();
