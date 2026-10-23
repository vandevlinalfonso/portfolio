var ot=Object.defineProperty;var at=(h,t,e)=>t in h?ot(h,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):h[t]=e;var V=(h,t,e)=>at(h,typeof t!="symbol"?t+"":t,e);import"./modulepreload-polyfill-B5Qt9EMX.js";import{L as M,C as nt,T as rt}from"./Cursor-12wpnqhY.js";import{C as g,V as l,G as Z,I as E,B as T,a as B,S as A,U as lt,M as w,L as F,E as D,b as W,c as q,d as J,e as ct,P as tt,f as ht,g as dt,A as P,h as et,F as ft,i as mt,D as ut,j as U,k as R,l as pt,m as vt,n as H,T as gt,o as yt,p as _,q as wt,W as xt,r as bt,s as St}from"./three-core-B-BFjvfq.js";import{g as x}from"./gsap-core-C8pce-KX.js";import{S as Ct,T as Mt}from"./TextScramble-DloupxSv.js";import{A as d,a as At}from"./AudioManager-BKaduczM.js";import{q as p,i as zt}from"./Quality-TTk3dsl2.js";import{P as Pt}from"./PostProcessing-CupuAfwY.js";const L={uniforms:{time:{value:0},decay:{value:.3},highlight:{value:0},scar:{value:0},seed:{value:0},scanY:{value:-10},scanIntensity:{value:0},lightPosition:{value:new l(3,5,2)},baseColor:{value:new g(921620)},veinColor:{value:new g(12859951)},rimColor:{value:new g(12109012)},scarTint:{value:new g(.13,.05,.045)}},vertexShader:`
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;

    void main() {
      vLocalPos = position;
      vNormal = normalize(normalMatrix * normal);
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,fragmentShader:`
    uniform float time;
    uniform float decay;
    uniform float highlight;
    uniform float scar;
    uniform float seed;
    uniform float scanY;
    uniform float scanIntensity;
    uniform vec3 lightPosition;
    uniform vec3 baseColor;
    uniform vec3 veinColor;
    uniform vec3 rimColor;
    uniform vec3 scarTint;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vLocalPos;
    varying vec3 vWorldPos;

    float hash3(vec3 p) {
      return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
    }

    float vnoise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float n000 = hash3(i);
      float n100 = hash3(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash3(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash3(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash3(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash3(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash3(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash3(i + vec3(1.0, 1.0, 1.0));
      return mix(
        mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
        mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
        f.z
      );
    }

    float fbm3(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * vnoise3(p);
        p *= 2.07;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec3 N = normalize(vNormal);
      vec3 V = normalize(vViewPosition);

      // Key light in view space
      vec3 fragViewPos = -vViewPosition;
      vec3 lightView = (viewMatrix * vec4(lightPosition, 1.0)).xyz;
      vec3 L = normalize(lightView - fragViewPos);

      // Obsidian base, slightly modulated so facets are not uniform
      float grain = fbm3(vLocalPos * 5.0 + seed);
      vec3 base = baseColor * (0.85 + grain * 0.3);

      // Scarred fragments dry out toward the lens's scar tint
      base = mix(base, scarTint, scar * 0.55);

      // Faceted specular: tight highlight per face (flat normals)
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 60.0) * 0.7;

      // Fresnel rim — cool bone light catching edges
      float fresnel = pow(1.0 - abs(dot(N, V)), 2.6);
      vec3 rim = rimColor * fresnel * mix(0.18, 0.45, highlight);

      // Soft diffuse so the form reads
      float diffuse = max(dot(N, L), 0.0) * 0.25 + 0.12;

      // Intrusion veins: thin filaments where the noise field crosses
      // the decay threshold — coverage spreads as the specimen rots
      float field = fbm3(vLocalPos * 3.2 + seed * 1.7);
      float threshold = 0.8 - decay * 0.42;
      float vein = smoothstep(threshold, threshold - 0.03, field)
                 - smoothstep(threshold - 0.055, threshold - 0.11, field);
      vein = clamp(vein, 0.0, 1.0);

      // Veins cluster in infected regions rather than covering evenly
      float region = smoothstep(0.38, 0.68, fbm3(vLocalPos * 1.1 + seed * 0.9 + 5.0));
      vein *= mix(region, 1.0, decay * 0.55);

      float pulse = 0.75 + 0.25 * sin(time * 1.6 + seed * 3.1);
      vec3 veins = veinColor * vein * pulse * (1.3 + highlight * 1.6);

      // Hover ignition floods the whole fragment faintly
      vec3 ignite = veinColor * highlight * 0.22;

      // Forensic scan sweep: a thin bright band crossing the specimen,
      // exposing the vein lattice as it passes
      float scanBand = smoothstep(0.22, 0.0, abs(vWorldPos.y - scanY)) * scanIntensity;
      vec3 scanGlow = vec3(0.9, 0.95, 1.0) * scanBand * 0.35;
      float scanVeinExpose = scanBand * 2.0;
      float wideExpose = smoothstep(0.9, 0.0, abs(vWorldPos.y - scanY)) * scanIntensity;

      // Veins below the passed scan line stay lit while scanning
      float passed = smoothstep(0.0, 0.15, scanY - vWorldPos.y) * scanIntensity;

      vec3 color = base * (diffuse + 0.55)
                 + vec3(spec)
                 + rim
                 + veins * (1.0 + scanVeinExpose + passed * 0.8 + wideExpose * 0.5)
                 + scanGlow
                 + ignite;

      gl_FragColor = vec4(color, 1.0);
    }
  `};class b{constructor(t=5,e=null){this.group=new Z,this.fragments=[],this.core=null,this.payload=null,this.explode=0,this.payloadGlow=0,this.agitation=0,this.time=0,this.palette=e,this._seamHot=new g(1,.4,.33),this.build(t),this.buildPayload(),e&&this.applyPalette(e)}static toColor(t){return Array.isArray(t)?new g(t[0],t[1],t[2]):new g(t)}applyPalette(t){this.palette=t;const e={baseColor:t.baseColor,veinColor:t.veinColor,rimColor:t.rimColor,scarTint:t.scarTint};if(this.group.traverse(s=>{if(!(!s.isMesh||!s.material.uniforms))for(const[o,i]of Object.entries(e))i!==void 0&&s.material.uniforms[o]&&s.material.uniforms[o].value.copy(b.toColor(i))}),this.payload){const s=this.payload.material.uniforms;t.payloadHot&&s.hot.value.copy(b.toColor(t.payloadHot)),t.payloadDeep&&s.deep.value.copy(b.toColor(t.payloadDeep))}this.payloadWire&&t.payloadHot&&this.payloadWire.material.color.copy(b.toColor(t.payloadHot)),t.payloadHot&&this._seamHot.copy(b.toColor(t.payloadHot))}build(t){const e=new E(1.15,1),s=e.getAttribute("position"),o=s.count/3,i=[];for(let f=0;f<t;f++){const u=Math.acos(1-2*(f+.5)/t),m=Math.PI*(1+Math.sqrt(5))*f;i.push(new l(Math.sin(u)*Math.cos(m),Math.cos(u),Math.sin(u)*Math.sin(m)))}const a=Array.from({length:t+1},()=>[]),r=new l,n=new l,c=new l,y=new l;for(let f=0;f<o;f++){n.fromBufferAttribute(s,f*3),c.fromBufferAttribute(s,f*3+1),y.fromBufferAttribute(s,f*3+2),r.copy(n).add(c).add(y).divideScalar(3).normalize();let u=-1,m=.62;for(let v=0;v<i.length;v++){const I=r.dot(i[v]);I>m&&(m=I,u=v)}a[u===-1?t:u].push(f)}e.computeVertexNormals(),a.forEach((f,u)=>{if(f.length===0)return;const m=u===t,v=this.buildFragmentMesh(e,f,u,m);m?this.core=v:this.fragments[u]=v,this.group.add(v)}),e.dispose()}buildFragmentMesh(t,e,s,o){const i=t.getAttribute("position"),a=new Float32Array(e.length*9),r=new l,n=new l;for(let m=0;m<e.length;m++)for(let v=0;v<3;v++)n.fromBufferAttribute(i,e[m]*3+v),r.add(n),a.set([n.x,n.y,n.z],(m*3+v)*3);r.divideScalar(e.length*3);for(let m=0;m<a.length;m+=3)a[m]-=r.x,a[m+1]-=r.y,a[m+2]-=r.z;const c=new T;c.setAttribute("position",new B(a,3)),c.computeVertexNormals();const y=new A({uniforms:lt.clone(L.uniforms),vertexShader:L.vertexShader,fragmentShader:L.fragmentShader});y.uniforms.seed.value=s*7.31+1.7;const f=new w(c,y);f.position.copy(r);const u=new F(new D(c,8),new W({color:15263457,transparent:!0,opacity:o?.08:.14}));return f.add(u),f.userData={basePos:r.clone(),dir:r.lengthSq()>1e-4?r.clone().normalize():new l(0,1,0),spread:o?.12:.55+Math.random()*.6,spinAxis:new l().randomDirection(),spinAmount:o?.05:(Math.random()-.5)*1.1,driftPhase:Math.random()*Math.PI*2,driftAxis:new l().randomDirection(),edges:u,highlightLift:{value:0}},f}buildPayload(){const t=new A({transparent:!0,uniforms:{time:{value:0},glow:{value:0},hot:{value:new g(1,.42,.3)},deep:{value:new g(.55,.06,.05)}},vertexShader:`
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,fragmentShader:`
        uniform float time;
        uniform float glow;
        uniform vec3 hot;
        uniform vec3 deep;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(N, V)), 1.6);
          float pulse = 0.82 + 0.18 * sin(time * 2.4);
          vec3 color = mix(deep, hot, fresnel) * (0.6 + glow * 2.2) * pulse;
          gl_FragColor = vec4(color, glow * (0.55 + fresnel * 0.45));
        }
      `});this.payload=new w(new E(.34,1),t),this.payloadWire=new F(new D(new E(.46,0)),new W({color:16734788,transparent:!0,opacity:0})),this.payload.add(this.payloadWire),this.group.add(this.payload)}setExplode(t){this.explode=t}setPayloadGlow(t){this.payloadGlow=t}setAgitation(t){this.agitation=t}setScan(t,e){this.group.traverse(s=>{s.isMesh&&s.material.uniforms&&s.material.uniforms.scanY&&(s.material.uniforms.scanY.value=t,s.material.uniforms.scanIntensity.value=e)})}setHighlight(t,e){const s=this.fragments[t];s&&(x.to(s.material.uniforms.highlight,{value:e?1:0,duration:.45,ease:"power2.out"}),x.to(s.userData.highlightLift,{value:e?1:0,duration:.45,ease:"power2.out"}))}setScar(t,e=!1){const s=this.fragments[t];s&&(e?s.material.uniforms.scar.value=1:x.to(s.material.uniforms.scar,{value:1,duration:1.4}))}setDecay(t){this.group.traverse(e=>{e.isMesh&&e.material.uniforms&&e.material.uniforms.decay&&(e.material.uniforms.decay.value=t)})}update(t){this.time+=t,this.group.rotation.y+=t*.08,this.group.position.y=Math.sin(this.time*.45)*.05;const e=this.explode,s=this.core?[...this.fragments,this.core]:this.fragments;for(const o of s){if(!o)continue;const i=o.userData,a=e*i.spread+i.highlightLift.value*.14;if(o.position.copy(i.basePos).addScaledVector(i.dir,a),e>.03){const r=this.time*.6+i.driftPhase,n=.07*e;if(o.position.x+=Math.sin(r)*n*i.driftAxis.x,o.position.y+=Math.sin(r*1.31+1.7)*n*i.driftAxis.y,o.position.z+=Math.cos(r*.83)*n*i.driftAxis.z,this.agitation>.02){const c=this.agitation*.04*e;o.position.x+=(Math.random()-.5)*c,o.position.y+=(Math.random()-.5)*c}o.quaternion.setFromAxisAngle(i.spinAxis,e*i.spinAmount+this.time*.1*e*Math.sign(i.spinAmount))}else o.quaternion.setFromAxisAngle(i.spinAxis,e*i.spinAmount);if(o.material.uniforms&&(o.material.uniforms.time.value=this.time),i.edges){const r=o===this.core?.08:.14;i.edges.material.opacity=r+this.payloadGlow*.25;const n=this._seamHot;i.edges.material.color.setRGB(.91+(n.r-.91)*this.payloadGlow,.9+(n.g-.9)*this.payloadGlow,.88+(n.b-.88)*this.payloadGlow)}}if(this.payload){const o=this.payload.material.uniforms;o.time.value=this.time,o.glow.value=this.payloadGlow,this.payload.visible=this.payloadGlow>.01,this.payload.rotation.y=-this.time*.4,this.payload.rotation.x=Math.sin(this.time*.3)*.4;const i=1+Math.sin(this.time*2.4)*.06*this.payloadGlow;this.payload.scale.setScalar(i),this.payloadWire.material.opacity=this.payloadGlow*.5,this.payloadWire.rotation.y=this.time*.7}}getGroup(){return this.group}dispose(){this.group.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&t.material.dispose()})}}const k=new ct,G=new l(0,1,0),$=new l,N=new l,C=new l;function S(h,t){const e=Math.min(h.length-2,Math.floor(t*(h.length-1))),s=t*(h.length-1)-e;return h[e]+(h[e+1]-h[e])*s}class st{constructor(t,e,s=.16){this.camera=t,this.keyCount=e.length,this.posCurve=new q(e.map(o=>o.pos),!1,"centripetal"),this.lookCurve=new q(e.map(o=>o.look),!1,"centripetal"),this.smoothedPos=e[0].pos.clone(),this.smoothedLook=e[0].look.clone(),this.targetPos=new l,this.targetLook=new l,this.parallax=new J,this.parallaxStrength=s,this.sectionAnchors=e.map((o,i)=>i/(e.length-1)),t.position.copy(this.smoothedPos),t.lookAt(this.smoothedLook)}setSectionAnchors(t){t.length===this.keyCount&&(this.sectionAnchors=t)}progressToCurveT(t){const e=this.sectionAnchors,s=e.length-1;if(t<=e[0])return 0;if(t>=e[s])return 1;for(let o=0;o<s;o++)if(t<=e[o+1]){const i=(t-e[o])/Math.max(1e-6,e[o+1]-e[o]);return(o+i)/s}return 1}update(t,e,s=0){const o=this.progressToCurveT(t);return this.posCurve.getPoint(o,this.targetPos),this.lookCurve.getPoint(o,this.targetLook),this.smoothedPos.lerp(this.targetPos,.06),this.smoothedLook.lerp(this.targetLook,.06),C.copy(this.smoothedPos).sub(this.smoothedLook),s&&C.applyAxisAngle(G,s),C.add(this.smoothedLook),this.parallax.lerp(e,.04),k.lookAt(C,this.smoothedLook,G),$.setFromMatrixColumn(k,0),N.setFromMatrixColumn(k,1),this.camera.position.copy(C).addScaledVector($,this.parallax.x*this.parallaxStrength).addScaledVector(N,this.parallax.y*this.parallaxStrength*.6),this.camera.lookAt(this.smoothedLook),o}}function Et(h,{baseColor:t=657931,lineColor:e=15263457,y:s=-1.85}={}){const o=new tt(44,44),i=new A({uniforms:{baseColor:{value:new g(t)},lineColor:{value:new g(e)}},vertexShader:`
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,fragmentShader:`
      uniform vec3 baseColor;
      uniform vec3 lineColor;
      varying vec3 vWorldPos;

      float gridLine(float coord) {
        float f = abs(fract(coord) - 0.5);
        return 1.0 - smoothstep(0.47, 0.5, 0.5 - f);
      }

      void main() {
        float gx = gridLine(vWorldPos.x * 0.8);
        float gz = gridLine(vWorldPos.z * 0.8);
        float grid = max(gx, gz);

        float dist = length(vWorldPos.xz);
        float fade = 1.0 - smoothstep(2.5, 13.0, dist);

        vec3 color = baseColor + lineColor * grid * 0.07 * fade;
        gl_FragColor = vec4(color, 1.0);
      }
    `}),a=new w(o,i);return a.rotation.x=-Math.PI/2,a.position.y=s,h.add(a),a}function Rt(h,{color:t=16777215,opacity:e=.28}={}){const s=Math.floor(220*p.particleMultiplier),o=new T,i=new Float32Array(s*3),a=new Float32Array(s*3);for(let n=0;n<s;n++)i[n*3]=(Math.random()-.5)*9,i[n*3+1]=Math.random()*6-1.8,i[n*3+2]=(Math.random()-.5)*9,a[n*3]=(Math.random()-.5)*.0012,a[n*3+1]=Math.random()*.002,a[n*3+2]=(Math.random()-.5)*.0012;o.setAttribute("position",new B(i,3));const r=new ht(o,new dt({color:t,size:.018,sizeAttenuation:!0,transparent:!0,opacity:e,blending:P,depthWrite:!1,fog:!0}));return h.add(r),{points:r,update(){const n=o.attributes.position.array;for(let c=0;c<s;c++)n[c*3]+=a[c*3],n[c*3+1]+=a[c*3+1],n[c*3+2]+=a[c*3+2],n[c*3+1]>4.5&&(n[c*3+1]=-1.8),Math.abs(n[c*3])>4.5&&(n[c*3]*=-.92),Math.abs(n[c*3+2])>4.5&&(n[c*3+2]*=-.92);o.attributes.position.needsUpdate=!0}}}const Y=[{pos:new l(-2.4,.6,4.6),look:new l(-1.3,.15,0)},{pos:new l(2.6,.9,4.2),look:new l(1.55,.1,0)},{pos:new l(0,1.9,8),look:new l(0,.3,0)},{pos:new l(-2.3,-.5,3.9),look:new l(-1.25,.35,0)},{pos:new l(-1.8,.5,6.2),look:new l(-1.15,.1,0)}],Lt={explodeKeys:[.02,.15,.8,.45,.05],payloadKeys:[0,.12,1,.7,.22]};class kt{constructor(t,e=M.active){this.lens=e,this.palette=e.palette;const s=e.physics||Lt;this.explodeKeys=s.explodeKeys,this.payloadKeys=s.payloadKeys,this.scene=new et,this.scene.background=new g(this.palette.background),this.scene.fog=new ft(this.palette.fog[0],this.palette.fog[1],this.palette.fog[2]),this.rig=new st(t,Y,p.reducedMotion?0:.16),this.artifact=new b(5,this.palette),this.scene.add(this.artifact.getGroup()),this.agitation=0,this.setupLights(),this.floor=Et(this.scene,{baseColor:this.palette.background,lineColor:15263457,y:-1.85}),this.createShadowBlob(),this.dust=Rt(this.scene),this.createLightShaft(),this.createScanRing()}setupLights(){this.scene.add(new mt(16777215,.35));const t=new ut(16777215,1.1);t.position.set(3,5,2),this.scene.add(t);const e=new U(6719743,8,12);e.position.set(-3,1.5,-2.5),this.scene.add(e);const s=new U(this.palette.lightWarm,4,9);s.position.set(2.5,-1.5,2),this.scene.add(s)}createShadowBlob(){const e=document.createElement("canvas");e.width=256,e.height=256;const s=e.getContext("2d"),o=s.createRadialGradient(256/2,256/2,0,256/2,256/2,256/2);o.addColorStop(0,"rgba(0, 0, 0, 0.55)"),o.addColorStop(.6,"rgba(0, 0, 0, 0.25)"),o.addColorStop(1,"rgba(0, 0, 0, 0)"),s.fillStyle=o,s.fillRect(0,0,256,256),this.shadowBlob=new w(new tt(4.4,4.4),new R({map:new pt(e),transparent:!0,depthWrite:!1})),this.shadowBlob.rotation.x=-Math.PI/2,this.shadowBlob.position.y=-1.84,this.scene.add(this.shadowBlob)}createLightShaft(){const t=new vt(1.7,6.2,32,1,!0),e=new A({transparent:!0,depthWrite:!1,blending:P,side:H,uniforms:{time:{value:0},intensity:{value:.07}},vertexShader:`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        uniform float time;
        uniform float intensity;
        varying vec2 vUv;
        void main() {
          float fade = pow(vUv.y, 2.2);
          float flicker = 0.9 + 0.1 * sin(time * 0.7) * sin(time * 0.23 + 1.7);
          gl_FragColor = vec4(vec3(0.8, 0.86, 1.0), fade * intensity * flicker);
        }
      `});this.shaft=new w(t,e),this.shaft.position.set(0,4.6-3.1,0),this.scene.add(this.shaft)}createScanRing(){this.scanRing=new Z;const t=new w(new gt(1.85,.008,8,96),new R({color:14477045,transparent:!0,opacity:0,blending:P,depthWrite:!1}));t.rotation.x=Math.PI/2,this.scanRing.add(t);const e=new w(new yt(1.85,64),new R({color:9545928,transparent:!0,opacity:0,blending:P,depthWrite:!1,side:H}));e.rotation.x=-Math.PI/2,this.scanRing.add(e),this.scanRingMat=t.material,this.scanDiscMat=e.material,this.scanRing.visible=!1,this.scene.add(this.scanRing)}setAgitation(t){this.agitation=t,this.artifact.setAgitation(t)}setSectionAnchors(t){this.rig.setSectionAnchors(t)}setHighlight(t,e){this.artifact.setHighlight(t,e)}setMark(t,e=!1){this.artifact.setScar(t,e)}update(t,e,s){const i=this.rig.progressToCurveT(e)*(Y.length-1),r=Math.max(0,1-Math.abs(i-2))*Math.sin(this.artifact.time*.07)*.5,n=this.rig.update(e,s,r),c=S(this.explodeKeys,n);this.artifact.setExplode(c),this.artifact.setPayloadGlow(S(this.payloadKeys,n));const y=Math.min(1,Math.max(0,i-.45)/1),u=i>.45&&i<1.55?Math.min(1,Math.min((i-.45)/.15,(1.55-i)/.15)):0,m=-1.5+y*3.1+Math.sin(this.artifact.time*.8)*.04;if(this.artifact.setScan(m,u),this.scanRing&&(this.scanRing.visible=u>.01,this.scanRing.position.y=m+this.artifact.group.position.y,this.scanRingMat.opacity=u*.55,this.scanDiscMat.opacity=u*.05,this.scanRing.rotation.y=this.artifact.time*.3),this.shadowBlob){this.shadowBlob.material.opacity=1-c*.55;const v=1+c*.5;this.shadowBlob.scale.set(v,v,1)}this.artifact.setDecay(d.getDecayLevel()),this.artifact.update(t),this.shaft&&(this.shaft.material.uniforms.time.value+=t),this.dust.update()}getScene(){return this.scene}dispose(){this.artifact.dispose(),this.scene.traverse(t=>{t.geometry&&t.geometry.dispose(),t.material&&t.material.dispose&&t.material.dispose()})}}function Tt(h){const t=e=>new g(e);return{time:{value:0},aspect:{value:1},camPos:{value:new l(0,0,6)},camRight:{value:new l(1,0,0)},camUp:{value:new l(0,1,0)},camFwd:{value:new l(0,0,-1)},iris:{value:.3},spread:{value:0},fracture:{value:0},cov:{value:0},motionAmp:{value:1},highlight:{value:[0,0,0,0,0]},markArr:{value:[0,0,0,0,0]},fault0:{value:new _(0,0,0,0)},fault1:{value:new _(0,0,0,0)},flareTheta:{value:0},flareAmt:{value:0},strandColor:{value:t(h.strandColor)},ringColor:{value:t(h.ringColor)},braidColor:{value:t(h.braidColor)},coreColor:{value:t(h.coreColor)},faultColor:{value:t(h.faultColor)}}}const Bt=`
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;function It(h){return`
    precision highp float;

    #define STEPS ${h}
    #define TAU 6.28318530718
    #define SECTOR 1.25663706144   // TAU / 5

    uniform float time;
    uniform float aspect;
    uniform vec3 camPos;
    uniform vec3 camRight;
    uniform vec3 camUp;
    uniform vec3 camFwd;

    uniform float iris;
    uniform float spread;
    uniform float fracture;
    uniform float cov;
    uniform float motionAmp;

    uniform float highlight[5];
    uniform float markArr[5];

    uniform vec4 fault0;
    uniform vec4 fault1;
    uniform float flareTheta;
    uniform float flareAmt;

    uniform vec3 strandColor;
    uniform vec3 ringColor;
    uniform vec3 braidColor;
    uniform vec3 coreColor;
    uniform vec3 faultColor;

    varying vec2 vUv;

    /* ------------- noise (ported from the Blackhole) ------------- */

    float hash21(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    float noise2(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x),
                 mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 3; i++) {
        v += a * noise2(p);
        p = p * 2.13 + 19.7;
        a *= 0.5;
      }
      return v;
    }

    /* ------------- sky: sparse cold starfield, teal void ------------- */

    vec3 sky(vec3 v) {
      vec3 n = v / (abs(v.x) + abs(v.y) + abs(v.z));
      vec2 uv = n.y >= 0.0 ? n.xz : (1.0 - abs(n.zx)) * sign(n.xz);
      uv = uv * 2.0 + 17.3;
      vec3 col = vec3(0.0);
      for (int l = 0; l < 2; l++) {
        float scale = l == 0 ? 22.0 : 52.0;
        vec2 g = uv * scale + float(l) * 37.0;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float h = hash21(id);
        vec2 off = vec2(fract(h * 71.3), fract(h * 31.7)) - 0.5;
        float d = length(f - off * 0.85);
        float tw = 0.65 + 0.35 * sin(time * (0.6 + h * 2.4) + h * 43.0);
        float star = smoothstep(0.06, 0.0, d) * step(0.94, h) * tw;
        col += mix(vec3(0.7, 0.85, 1.0), vec3(0.85, 1.0, 0.95), fract(h * 7.0))
               * star * (l == 0 ? 0.55 : 0.3);
      }
      float band = exp(-v.y * v.y * 12.0);
      col += vec3(0.02, 0.035, 0.045) * band * fbm(v.xz * 4.0);
      return col;
    }

    /* ------------- the machine (SDF, machined detail) ------------- */

    float sdTorusZ(vec3 p, float R, float r) {
      vec2 q = vec2(length(p.xy) - R, p.z);
      return length(q) - r;
    }

    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    // n-fold angular block pattern: ~0 on segment bodies, 1 in the grooves
    float grooves(float th, float n) {
      return smoothstep(0.32, 0.5, abs(fract(th * n / TAU) - 0.5) * 2.0);
    }

    float hash1(float n) {
      return fract(sin(n * 17.13) * 437.58);
    }

    vec2 rot2(vec2 v, float a) {
      float c = cos(a), s = sin(a);
      return vec2(c * v.x - s * v.y, s * v.x + c * v.y);
    }

    // Distance to the machine. Also reports the angular sector (used for
    // per-discipline lighting: hover glow, seal arcs).
    //
    // 'fracture' DISASSEMBLES the machine along its real component seams —
    // an engineering exploded view: the front ring slides toward the
    // viewer, the heavy back ring recedes and tilts, the struts unclip and
    // drift outward, the shutter's petals separate, and the rim's teeth
    // individually loosen. No arbitrary break lines — the mechanism simply
    // comes undone, then reseats.
    float machineD(vec3 p, out float sid) {
      float thw = atan(p.y, p.x);
      sid = floor(mod(thw + TAU, TAU) / SECTOR);

      float f = fracture;
      float rxy = length(p.xy);

      // Cheap bounding proxy first: a slab-annulus around the assembly
      // (including full disassembly + telescoping). It also excludes the
      // interior hole, so rays looking through the ring at the core skip
      // all the machined-detail math below. max() underestimates the true
      // distance, so marching by it is conservative and safe.
      float irisRb = mix(0.16, 1.26, iris) - f * 0.3;
      float dz = abs(p.z + 0.03) - (0.72 + f * 1.55 + spread * 0.85);
      float dr = max(min(irisRb, 0.9) - rxy, rxy - (2.05 + f * 0.85));
      float dbound = max(dz, dr);
      if (dbound > 0.3) return dbound;

      float wob = f * 0.05 * sin(time * 0.4 * motionAmp);

      // One shared angular frame for every segment pattern (component
      // tilts are small enough that per-component angles aren't worth
      // the extra atan cost)
      float thn = mod(thw + TAU, TAU);

      // ---- Ring A: the main rim — the anchor. Its 48 teeth unclip. ----
      float segA = floor(thn * 48.0 / TAU);
      float hA = hash1(segA + 3.0);
      float ra = rxy + f * (hA - 0.5) * 0.24;
      float za = p.z + f * (fract(hA * 7.31) - 0.5) * 0.3 + wob * sin(segA);
      float dA = length(vec2(ra - 1.5, za)) - 0.075
               - 0.014 * (1.0 - grooves(thw, 48.0));

      // ---- Ring B: heavy back ring — recedes, tilts, blocks unclip ----
      vec3 qb = p;
      qb.x -= f * 0.2;
      qb.yz = rot2(qb.yz, f * 0.14);
      float segB = floor(thn * 20.0 / TAU);
      float hB = hash1(segB + 11.0);
      float rb = length(qb.xy) + f * (hB - 0.5) * 0.4;
      float zb = qb.z + 0.34 + spread * 0.7 + f * 1.35
               + f * (fract(hB * 5.7) - 0.5) * 0.25 + wob * sin(segB);
      float dB = length(vec2(rb - 1.85, zb)) - 0.095
               - 0.02 * (1.0 - grooves(thw, 20.0));

      // ---- Ring C: thin front ring — slides toward the viewer, rises ----
      vec3 qc = p;
      qc.y -= f * 0.15;
      qc.yz = rot2(qc.yz, -f * 0.10);
      float zc = qc.z - (0.3 + spread * 0.75 + f * 1.15) + wob;
      float dC = length(vec2(length(qc.xy) - 1.32, zc)) - 0.034
               - 0.005 * (1.0 - grooves(thw, 90.0));

      // ---- Struts: five radial bars — they detach and drift outward ----
      float hS = hash1(sid + 9.0);
      float a5 = (fract(thw * 5.0 / TAU + 0.5) - 0.5) * SECTOR
               + f * (hS - 0.5) * 0.2;
      vec3 ps = vec3(rxy - 1.66 - f * 0.75,
                     a5 * rxy,
                     p.z + 0.15 + spread * 0.3 - f * (fract(hS * 5.7) - 0.5) * 0.9);
      float dS = sdBox(ps, vec3(0.32, 0.048, 0.048));

      // ---- Iris shutter: slides forward, its 15 petals separate ----
      float pet = floor(thn * 15.0 / TAU);
      float hP = hash1(pet + 27.0);
      float rrP = rxy + f * (hP - 0.5) * 0.5;
      float saw = abs(fract(thw * 15.0 / TAU) - 0.5) * 2.0;
      float irisR = mix(0.16, 1.26, iris) + saw * 0.1 * (1.0 - iris);
      float dPlate = max(abs(p.z - 0.06 - f * 0.55 - f * 0.08 * p.y) - 0.018,
                         max(irisR - rrP, rrP - 1.3));

      return min(min(dA, dB), min(min(dC, dS), dPlate));
    }

    float machineDist(vec3 p) {
      float sid;
      return machineD(p, sid);
    }

    /* ------------- the river: one continuous volumetric flow ------------- */

    // Funnel envelope: the visible compression. Chaos radius far out,
    // narrowing smoothly into the throat, exiting as a tight tube.
    float envelopeR(float z) {
      if (z < 0.0) {
        float s = smoothstep(-11.0, -0.35, z);
        return mix(4.2, 0.5, pow(s, 0.8));
      }
      return 0.42 + z * 0.045;
    }

    float angDist(float a, float b) {
      return abs(mod(a - b + 3.14159265, TAU) - 3.14159265);
    }

    // Emission + opacity of the river at p
    vec4 flowSample(vec3 p) {
      vec3 fp = p;
      // the exit beam bends down-right toward the viewer
      if (p.z > 0.0) {
        fp.x -= 0.16 * p.z + 0.045 * p.z * p.z;
        fp.y += 0.2 * p.z + 0.05 * p.z * p.z;
      }

      float z = fp.z;
      if (z < -11.5 || z > 6.0) return vec4(0.0);

      float r = length(fp.xy);
      float Rf = envelopeR(z);
      if (r > Rf * 1.35 + 0.35) return vec4(0.0);

      float th = atan(fp.y, fp.x);
      float rn = r / max(Rf, 0.001);

      // hollow tube of filaments in normalized coordinates: the same
      // lanes physically converge as the funnel narrows
      float shell = smoothstep(1.25, 0.95, rn) * smoothstep(0.15, 0.5, rn);
      // most samples sit inside/outside the tube — skip the noise for them
      if (shell < 0.012) return vec4(0.0);

      // chaos wobble, proportional to how wide the funnel still is
      float wav = clamp((Rf - 0.5) / 3.7, 0.0, 1.0);
      float wob = (fbm(vec2(th * 2.0 + z * 0.33, z * 0.75 - time * 0.45 * motionAmp)) - 0.5)
                * wav * 5.0;

      // ---- faults: a contaminated filament, convulsing, then severed ----
      float fm = 0.0;
      float cutBulge = 0.0;
      if (z < 0.3) {
        float f0 = smoothstep(0.5, 0.12, angDist(th, fault0.x)) * fault0.y;
        float f1 = smoothstep(0.5, 0.12, angDist(th, fault1.x)) * fault1.y;
        fm = max(f0, f1);
        wob += fm * sin(time * 14.0 + z * 7.0) * 1.6;
        // the cut deflects that slice outward near the rim — it never enters
        float nearRim = smoothstep(-2.2, -0.4, z);
        cutBulge = max(f0 * fault0.z, f1 * fault1.z) * nearRim;
        rn -= cutBulge * 0.9;
      }

      float lanes;
      float packets;
      if (z < 0.0) {
        lanes = pow(0.5 + 0.5 * sin(th * 9.0 + wob + z * 0.55), 3.0);
        packets = 0.55 + 0.45 * sin(z * 2.1 - time * 2.3 * motionAmp + th * 2.0);
      } else {
        // the braid: tight counter-twisted strands
        lanes = pow(0.5 + 0.5 * sin(th * 7.0 - z * 5.5 - time * 1.9 * motionAmp), 4.0);
        packets = 0.6 + 0.4 * sin(z * 3.0 - time * 2.6 * motionAmp);
      }

      // ends fade into the void
      float gate = smoothstep(-11.5, -8.5, z) * smoothstep(6.0, 4.2, z);

      float density = shell * lanes * packets * gate;
      density *= 0.72 + cov * 0.28;

      // physical compression: the narrower the funnel, the denser the light
      float comp = 3.4 / (Rf + 0.45);

      // per-sector hover ignition of the incoming river
      float sid = floor(mod(th + TAU, TAU) / SECTOR);
      float h = 0.0;
      for (int i = 0; i < 5; i++) {
        if (float(i) == sid) h = highlight[i];
      }
      if (z < 0.0) density *= 1.0 + h * 1.1;

      // temperature: cold teal far out, white-gold as it meets the gate
      float heat = z < 0.0 ? smoothstep(-3.6, -0.1, z) : smoothstep(2.2, 0.0, z);
      vec3 hot = mix(coreColor, vec3(1.25, 1.12, 0.95), 0.45);
      vec3 col = mix(z < 0.0 ? strandColor : braidColor, hot, heat);
      col = mix(col, faultColor, clamp(fm * (0.65 + 0.35 * sin(time * 16.0)), 0.0, 1.0));

      float e = density * comp;
      return vec4(col * e, e * 0.55);
    }

    /* ------------- march ------------- */

    vec2 sphereBound(vec3 ro, vec3 rd, vec3 c, float R) {
      vec3 oc = ro - c;
      float b = dot(oc, rd);
      float h = b * b - (dot(oc, oc) - R * R);
      if (h < 0.0) return vec2(-1.0);
      h = sqrt(h);
      return vec2(-b - h, -b + h);
    }

    vec3 shadeMetal(vec3 p, vec3 rd, float sid) {
      vec2 e = vec2(0.006, -0.006);
      vec3 n = normalize(
        e.xyy * machineDist(p + e.xyy) + e.yyx * machineDist(p + e.yyx) +
        e.yxy * machineDist(p + e.yxy) + e.xxx * machineDist(p + e.xxx));

      float h = 0.0;
      float m = 0.0;
      for (int i = 0; i < 5; i++) {
        if (float(i) == sid) { h = highlight[i]; m = markArr[i]; }
      }

      // Polished dark chrome: brighter base, a teal fill from below-front,
      // a wide fresnel rim — depth without dead-black masses
      vec3 base = vec3(0.09, 0.10, 0.115);
      vec3 keyDir = normalize(vec3(0.4, 0.8, 0.45));
      vec3 fillDir = normalize(vec3(-0.3, -0.6, 0.7));
      float diff = max(dot(n, keyDir), 0.0);
      float fill = max(dot(n, fillDir), 0.0);
      float fres = pow(1.0 - abs(dot(n, rd)), 2.2);

      // lit by its own core
      vec3 toCore = -p;
      float coreLit = max(dot(n, normalize(toCore)), 0.0)
                    / (dot(toCore, toCore) * 0.4 + 0.6);

      // Luminous seams — ONLY the joints between the main rim's teeth.
      // Any angular pattern on the shutter plate reads as radial stripes
      // filling the whole aperture: the plate stays clean dark chrome and
      // gets its interest from the fresnel + the glowing sawtooth edge.
      float th = atan(p.y, p.x);
      float rxy = length(p.xy);
      float seam = grooves(th, 48.0) * smoothstep(0.14, 0.06, abs(rxy - 1.5));

      return base * (0.45 + 0.55 * diff)
           + ringColor * fill * 0.12
           + ringColor * fres * (0.7 + h * 1.6 + m * 0.4)
           + ringColor * seam * 0.3
           + coreColor * coreLit * (0.35 + iris * 0.5 + fracture * 0.5);
    }

    void main() {
      vec2 uv = vUv - 0.5;
      uv.x *= aspect;
      // matches the app's PerspectiveCamera fov 45°
      vec3 rd = normalize(camFwd * 1.2071 + camRight * uv.x + camUp * uv.y);
      vec3 ro = camPos;

      vec3 col = vec3(0.0);
      float T = 1.0;

      vec2 bound = sphereBound(ro, rd, vec3(0.0, 0.0, -2.5), 11.8);
      bool hitSurface = false;

      if (bound.y > 0.0) {
        float t = max(bound.x, 0.0);
        float tMax = bound.y;

        float breathe = 0.82 + 0.18 * sin(time * 0.55 * motionAmp);
        vec3 flarePos = vec3(cos(flareTheta), sin(flareTheta), 0.0) * 1.5;
        vec3 burst0 = vec3(cos(fault0.x), sin(fault0.x), 0.0) * 1.5;
        vec3 burst1 = vec3(cos(fault1.x), sin(fault1.x), 0.0) * 1.5;

        // The burning throat, integrated ANALYTICALLY per segment:
        // ∫ dt / (|ro + t·rd|² + a²) = atan((t+b)/s) / s. Point-sampling
        // this near-singular glow at march strides banded and crawled as
        // the camera dollied — the closed form is exact at any stride.
        float coreK = 0.05 * breathe * (0.15 + iris * 0.85)
                    * (1.0 + fracture * 1.3 + cov * 0.2);
        vec3 coreCol = (coreColor * 1.15 + 0.25) * coreK;
        float bRay = dot(ro, rd);
        float invS = inversesqrt(max(dot(ro, ro) + 0.02 - bRay * bRay, 1e-4));
        float prevF = atan((t + bRay) * invS);

        // total soft-edge coverage this ray has composited (grazing rays
        // must not smear the same edge repeatedly)
        float srfAcc = 0.0;

        for (int i = 0; i < STEPS; i++) {
          vec3 p = ro + rd * t;

          float sid;
          float dM = machineD(p, sid);

          // Soft-edge compositing: near the surface, blend the metal in by
          // partial coverage instead of a hard hit — silhouettes get ~1px
          // soft edges rather than aliased staircases
          if (dM < 0.012) {
            float srf = smoothstep(0.012, 0.0, dM) * (1.0 - srfAcc);
            srfAcc += srf;
            col += T * srf * shadeMetal(p, rd, sid);
            T *= 1.0 - srf;
            if (T < 0.03) {
              hitSurface = true;
              break;
            }
            // step past the grazing region decisively, keeping the
            // analytic core integral in sync with the advanced t
            t += max(0.045, dM + 0.02);
            float edgeF = atan((t + bRay) * invS);
            col += T * coreCol * (edgeF - prevF) * invS;
            prevF = edgeF;
            continue;
          }

          // ---- volumetrics along this stride ----
          float stride = clamp(dM * 0.8, 0.07, 0.9);
          float Rf = envelopeR(min(p.z, 0.0));
          bool inFlow = p.z > -11.6 && p.z < 6.2 && length(p.xy) < Rf * 1.4 + 2.6;
          if (inFlow) stride = min(stride, 0.32);
          // the compression throat is the hottest, highest-frequency zone
          if (dot(p.xy, p.xy) < 1.0 && abs(p.z) < 1.5) stride = min(stride, 0.2);
          // NEVER tunnel: the shutter plate (0.036 thick) and the thin
          // front ring are thinner than the volumetric stride floor, so an
          // unclamped stride steps clean over them — pixels stochastically
          // see through the machine. Classic sphere-tracing rule: when the
          // surface is nearer than the stride, converge onto it.
          stride = min(stride, max(dM, 0.013));

          vec4 fs = inFlow ? flowSample(p) : vec4(0.0);

          // machine edge-light bleeding into the medium. Faded out BEFORE
          // the bounding-proxy shell (0.28): dM switches from the cheap
          // bound to the true machined distance there, and an unfaded glow
          // paints that discontinuity as wavy contour bands.
          vec3 glow = ringColor * exp(-max(dM, 0.0) * 6.5)
                    * smoothstep(0.26, 0.15, dM) * 0.05;

          // seal arc: a permanently burning ring segment on marked shards
          float mk = 0.0;
          float hl = 0.0;
          for (int s = 0; s < 5; s++) {
            if (float(s) == sid) { mk = markArr[s]; hl = highlight[s]; }
          }
          if (mk + hl > 0.001) {
            float dSeal = sdTorusZ(p - vec3(0.0, 0.0, 0.14), 1.62, 0.02);
            glow += ringColor * exp(-max(dSeal, 0.0) * 22.0) * (mk * 0.5 + hl * 0.2);
          }

          // the burning throat — exact segment integral (see coreCol above)
          float newF = atan((t + stride + bRay) * invS);
          col += T * coreCol * (newF - prevF) * invS;
          prevF = newF;

          // rejection: rim flare + severed-strand burst
          glow += faultColor * flareAmt * 0.5
                * exp(-dot(p - flarePos, p - flarePos) * 5.0);
          float b0 = fault0.z * (1.0 - fault0.z) * 4.0;
          float b1 = fault1.z * (1.0 - fault1.z) * 4.0;
          glow += faultColor * b0 * 0.6 * exp(-dot(p - burst0, p - burst0) * 7.0);
          glow += faultColor * b1 * 0.6 * exp(-dot(p - burst1, p - burst1) * 7.0);

          col += T * (fs.rgb + glow) * stride;
          T *= exp(-fs.a * stride);

          t += stride;
          if (t > tMax || T < 0.03) break;
        }
      }

      if (!hitSurface && T > 0.03) {
        col += T * sky(rd);
      }

      // ACES-ish tonemap (the Blackhole's): keeps the throat blinding
      // without clipping ugly
      col *= vec3(0.98, 1.0, 1.02);
      col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

      gl_FragColor = vec4(col, 1.0);
    }
  `}const K=5,Vt=[{pos:new l(-3,.7,6.2),look:new l(-1.2,0,0)},{pos:new l(2.6,.9,3.8),look:new l(1.2,.3,-.3)},{pos:new l(0,.2,7.2),look:new l(0,.1,0)},{pos:new l(-2.9,-1.6,4.6),look:new l(-1,.1,-.4)},{pos:new l(-3.5,2.2,14),look:new l(-.9,0,-1)}],Ft=[.25,.9,.75,1,.35],Dt=[.05,.9,.1,.3,.05],Wt=[0,0,.55,1,0],O=[.15,.5,.55,1,.08],z=new l;class it{constructor(t,e){this.lens=e,this.palette=e.palette,this.camera=t,this.scene=new et,this.rig=new st(t,Vt,p.reducedMotion?0:.16),this.time=0,this.agitation=0,this.drama=O[0],this.onImpact=null,this.highlightValues=[0,0,0,0,0],this.markValues=[0,0,0,0,0],this.faults=[],this.faultCooldown=4,this.flareTheta=0,this.flareAmt=0,this.covSmooth=Math.min(1,Math.max(0,(d.getDecayLevel()-.3)/.55)),this.uniforms=Tt(this.palette),this.uniforms.highlight.value=this.highlightValues,this.uniforms.markArr.value=this.markValues,this.uniforms.motionAmp.value=p.reducedMotion?.15:1;const s=p.low?56:88,o=new A({uniforms:this.uniforms,vertexShader:Bt,fragmentShader:It(s),depthWrite:!1,depthTest:!1}),i=new T;i.setAttribute("position",new B(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3)),this.quad=new w(i,o),this.quad.frustumCulled=!1,this.scene.add(this.quad)}spawnFault(){this.faults.length>=2||this.faults.push({theta:Math.random()*Math.PI*2,level:0,phase:"flicker",hold:.4+Math.random()*.4,cut:0,seed:Math.random()})}updateFaults(t){this.faultCooldown-=t;const e=(.015+this.drama*this.drama*.34)*(p.reducedMotion?.35:1);this.faultCooldown<=0&&Math.random()<e*t&&(this.spawnFault(),this.faultCooldown=3+(1-this.drama)*12);for(let r=this.faults.length-1;r>=0;r--){const n=this.faults[r];n.phase==="flicker"?(n.level=Math.min(1,n.level+t*1.3),n.level>=1&&(n.hold-=t,n.hold<=0&&(n.phase="cut",this.flareTheta=n.theta,this.flareAmt=1,!p.reducedMotion&&this.drama>.5&&this.onImpact&&this.onImpact(.1+this.drama*.22)))):(n.cut=Math.min(1,n.cut+t*1.4),n.level=Math.max(0,1-n.cut*1.2),n.cut>=1&&this.faults.splice(r,1))}const s=this.uniforms.fault0.value,o=this.uniforms.fault1.value,i=this.faults[0],a=this.faults[1];i?s.set(i.theta,i.level,i.cut,i.seed):s.set(0,0,0,0),a?o.set(a.theta,a.level,a.cut,a.seed):o.set(0,0,0,0)}setSectionAnchors(t){this.rig.setSectionAnchors(t)}setAgitation(t){this.agitation=t}setHighlight(t,e){t<0||t>=K||x.to(this.highlightValues,{[t]:e?1:0,duration:.45,ease:"power2.out"})}setMark(t,e=!1){t<0||t>=K||(e?this.markValues[t]=1:x.to(this.markValues,{[t]:1,duration:1.4}))}update(t,e,s){this.time+=t;const o=this.rig.update(e,s);this.drama=S(O,o);const i=Math.min(1,Math.max(0,(d.getDecayLevel()-.3)/.55));this.covSmooth+=(i-this.covSmooth)*Math.min(1,t*.05);const a=this.uniforms;a.time.value=this.time,a.iris.value=S(Ft,o),a.spread.value=S(Dt,o),a.fracture.value=S(Wt,o),a.cov.value=this.covSmooth,this.flareAmt=Math.max(0,this.flareAmt-t*2.2),a.flareTheta.value=this.flareTheta,a.flareAmt.value=this.flareAmt,this.updateFaults(t),this.camera.updateMatrixWorld();const r=this.camera.matrixWorld.elements;a.camPos.value.copy(this.camera.position),a.camRight.value.set(r[0],r[1],r[2]).normalize(),a.camUp.value.set(r[4],r[5],r[6]).normalize(),z.set(r[8],r[9],r[10]).normalize(),a.camFwd.value.set(-z.x,-z.y,-z.z),a.aspect.value=this.camera.aspect}getScene(){return this.scene}dispose(){this.quad.geometry.dispose(),this.quad.material.dispose()}}V(it,"renderProfile",{maxPixelRatio:p.low?1:1.25,adaptive:p.low?null:{budgetMs:19,ladder:[1.1,.95]}});const j={specimen:kt,loom:it},qt=.05,Q=2,Ut=1.5;class Ht{constructor(t,e,s,{budgetMs:o,ladder:i}){this.renderer=t,this.post=e,this.budgetMs=o,this.ladder=i.filter(a=>a<s),this.ema=0,this.warmup=Q,this.overBudgetFor=0}reset(){this.ema=0,this.warmup=Q,this.overBudgetFor=0}update(t){if(this.ladder.length===0)return;const e=t*1e3;if(this.ema=this.ema===0?e:this.ema+(e-this.ema)*qt,this.warmup>0){this.warmup-=t;return}if(this.ema>this.budgetMs){if(this.overBudgetFor+=t,this.overBudgetFor>=Ut){const s=this.ladder.shift();this.renderer.setPixelRatio(s),this.post.setPixelRatio(s),this.reset()}}else this.overBudgetFor=0}}class _t{constructor(){this.decayRate=.003,this.lastDecayTime=Date.now()}update(t){if(d.idleTime>0){const e=this.decayRate*t;d.incrementDecay(e)}}forceDecay(t){d.incrementDecay(t)}getDecayLevel(){return d.getDecayLevel()}reset(){d.decayLevel=.3}}class Gt{constructor(){this.root=document.getElementById("telemetry"),this.decayEl=document.getElementById("t-decay"),this.sessionEl=document.getElementById("t-session"),this.woundsEl=document.getElementById("t-wounds"),this.statusEl=document.getElementById("t-status"),this.accum=0,this.flashUntil=0,this.flashText="",this.scalar=M.active.persistScalar}flash(t,e=4){this.flashText=t,this.flashUntil=performance.now()+e*1e3}update(t){if(!this.root||(this.accum+=t,this.accum<.25))return;this.accum=0;const e=d.getDecayLevel();if(this.decayEl&&(this.decayEl.textContent=`${(e*100).toFixed(1)}%`,this.decayEl.classList.toggle("critical",!this.scalar.inverse&&e>.55)),this.sessionEl){const s=Math.floor(d.getSessionDuration()),o=String(Math.floor(s/60)).padStart(2,"0"),i=String(s%60).padStart(2,"0");this.sessionEl.textContent=`${o}:${i}`}if(this.woundsEl){const s=d.totalWounds||"··";this.woundsEl.textContent=`${d.visitedWounds.size}/${s}`}this.statusEl&&(performance.now()<this.flashUntil?(this.statusEl.textContent=this.flashText,this.statusEl.className="degrading"):d.idleTime>3?(this.statusEl.textContent=this.scalar.statusActive,this.statusEl.className="degrading"):(this.statusEl.textContent=this.scalar.statusStable,this.statusEl.className=""))}}x.registerPlugin(Ct);class X{constructor(){this.lens=M.active,this.renderer=null,this.camera=null,this.scene=null,this.post=null,this.audioManager=null,this.decaySystem=null,this.cursor=null,this.telemetry=null,this.panelTitleScramble=null,this.clock=new wt,this.isRunning=!1,this.smoothedScroll=0,this.lastRawScroll=0,this.scrollVelocity=0,this.mouse=new J,this.currentSection=-1,this.hiddenAt=0,this.sections=[],this.projects=[],this.init()}async init(){var s,o,i;if(M.applyCopy(this.lens),this.applyLensChrome(),this.setupLensSwitch(),this.contacts=this.loadIdentity(),!zt()){(s=document.getElementById("loading-screen"))==null||s.classList.add("hidden"),(o=document.getElementById("webgl-fallback"))==null||o.classList.add("visible");return}const t=this.runBootSequence();this.SceneClass=j[this.lens.scene]||j.specimen,this.setupRenderer(),this.setupCamera(),this.decaySystem=new _t,this.audioManager=new At,this.cursor=new nt,this.telemetry=new Gt,this.scene=new this.SceneClass(this.camera,this.lens),p.postProcessing&&(this.post=new Pt(this.renderer,this.camera));const e=(i=this.SceneClass.renderProfile)==null?void 0:i.adaptive;e&&this.post&&(this.adaptiveRes=new Ht(this.renderer,this.post,this.basePixelRatio,e)),this.scene.onImpact=a=>{var r;return(r=this.post)==null?void 0:r.triggerGlitch(a)},await this.loadContent(),this.restoreScars(),this.sections=Array.from(document.querySelectorAll("main section")),this.buildSectionNav(),this.setupReveals(),this.setupPanel(),this.setupUI(),this.refreshSectionAnchors(),window.addEventListener("mousemove",a=>{this.mouse.x=a.clientX/window.innerWidth*2-1,this.mouse.y=-(a.clientY/window.innerHeight)*2+1,d.recordInteraction()},{passive:!0}),window.addEventListener("scroll",()=>d.recordInteraction(),{passive:!0}),this._onResize=this.onResize.bind(this),window.addEventListener("resize",this._onResize),this.setupVisibilityHandling(),await t,this.hideLoadingScreen(),this.isRunning=!0,this.animate()}runBootSequence(){const t=document.getElementById("boot-log"),e=document.getElementById("boot-progress-fill");if(!t||!e)return Promise.resolve();const s=this.lens.bootLines,o=p.reducedMotion?60:200;return new Promise(i=>{s.forEach((a,r)=>{setTimeout(()=>{const n=document.createElement("div");n.innerHTML=a,t.appendChild(n),e.style.width=`${(r+1)/s.length*100}%`,r===s.length-1&&setTimeout(i,350)},o*(r+1))})})}applyLensChrome(){const t=document.querySelector(".boot-header");t&&(t.textContent=this.lens.bootHeader);const e=document.querySelector("#webgl-fallback h1");e&&this.lens.copy.fallbackTitle&&(e.textContent=this.lens.copy.fallbackTitle),document.title=this._baseTitle()}_baseTitle(){const t=this.lens.copy.heroTitle.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();return`${this.lens.label} · ${t}`}setupLensSwitch(){rt.setSwitchHandler(t=>this.switchLens(t))}switchLens(t){var s,o,i,a;M.setActive(t),(s=this.telemetry)==null||s.flash("RECONFIGURING LENS",3),(o=this.post)==null||o.triggerGlitch(.7),(a=(i=this.audioManager)==null?void 0:i.glitchBurst)==null||a.call(i);const e=document.createElement("div");e.style.cssText="position:fixed;inset:0;z-index:9999;background:#050506;opacity:0;transition:opacity 0.55s ease;pointer-events:none",document.body.appendChild(e),requestAnimationFrame(()=>{e.style.opacity="1"}),d.save(),setTimeout(()=>window.location.reload(),620)}hideLoadingScreen(){const t=document.getElementById("loading-screen");t&&setTimeout(()=>t.classList.add("hidden"),250)}setupRenderer(){const t=document.getElementById("canvas-container");this.renderer=new xt({antialias:!p.postProcessing,alpha:!1,powerPreference:"high-performance"}),this.renderer.setSize(window.innerWidth,window.innerHeight);const e=this.SceneClass.renderProfile;this.basePixelRatio=Math.min(window.devicePixelRatio,(e==null?void 0:e.maxPixelRatio)??p.maxPixelRatio),this.renderer.setPixelRatio(this.basePixelRatio),this.renderer.toneMapping=bt,this.renderer.toneMappingExposure=1.15,t.appendChild(this.renderer.domElement)}setupCamera(){this.camera=new St(45,window.innerWidth/window.innerHeight,.1,100)}loadIdentity(){return fetch("./data/cv.json").then(t=>t.json()).then(t=>{var o;const e={email:`mailto:${t.contact.email}`,linkedin:t.contact.linkedin};document.querySelectorAll("[data-contact]").forEach(i=>{e[i.dataset.contact]&&(i.href=e[i.dataset.contact])});const s=document.getElementById("portfolio-name");return s&&((o=t.identity)!=null&&o.name)&&(s.textContent=`Engineer: ${t.identity.name}`),e}).catch(()=>({}))}async loadContent(){const t="./",[e,s,o,i]=await Promise.all([fetch(`${t}data/projects.json`).then(a=>a.json()).catch(()=>[]),fetch(`${t}data/philosophy.json`).then(a=>a.json()).catch(()=>[]),fetch(`${t}data/socials.json`).then(a=>a.json()).catch(()=>[]),this.contacts]);this.projects=e,d.totalWounds=e.length,this.renderCaseRows(e),this.renderQuotes(s),this.renderSocials(o,i)}renderCaseRows(t){const e=document.getElementById("case-list");e&&t.forEach((s,o)=>{const i=document.createElement("button");i.className="case-row",i.dataset.index=o,i.dataset.reveal="",d.hasVisitedWound(s.id)&&i.classList.add("examined"),i.innerHTML=`
        <span class="c-idx">${String(o+1).padStart(3,"0")}</span>
        <span class="c-title">${s.title}</span>
        <span class="c-class">${s.type||""}</span>
        <span class="c-year">${s.year||""}</span>
        <span class="c-arrow">→</span>
      `,i.addEventListener("mouseenter",()=>{var a;this.scene.setHighlight(o,!0),(a=this.audioManager)==null||a.hoverTick()}),i.addEventListener("mouseleave",()=>{this.scene.setHighlight(o,!1)}),i.addEventListener("click",()=>this.openCase(o)),e.appendChild(i)})}renderQuotes(t){const e=document.getElementById("quote-list");e&&t.forEach((s,o)=>{const i=document.createElement("blockquote");i.className="quote",i.dataset.reveal="",i.innerHTML=`
        <span class="q-idx">0${o+1}</span>
        <span>${s.text}</span>
      `,e.appendChild(i)})}renderSocials(t,e={}){const s=document.getElementById("socials");s&&t.forEach(o=>{const i=document.createElement("a");i.href=e[o.id]||o.url,i.target="_blank",i.rel="noopener",i.textContent=o.label||o.id,s.appendChild(i)})}restoreScars(){this.projects.forEach((t,e)=>{d.hasVisitedWound(t.id)&&this.scene.setMark(e,!0)})}setupPanel(){var t,e;(t=document.getElementById("panel-close"))==null||t.addEventListener("click",()=>this.closeCase()),(e=document.getElementById("panel-scrim"))==null||e.addEventListener("click",()=>this.closeCase()),window.addEventListener("keydown",s=>{s.key==="Escape"&&this.closeCase()})}openCase(t){var i,a,r;const e=this.projects[t];if(!e)return;const s=document.getElementById("panel-meta");s&&(s.textContent=`Case ${e.id.toUpperCase()} // Class: ${(e.type||"unknown").toUpperCase()}${e.year?` // ${e.year}`:""}`);const o=document.getElementById("panel-title");this.panelTitleScramble||(this.panelTitleScramble=new Mt(o)),this.panelTitleScramble.setText(e.title),document.getElementById("panel-context").textContent=e.context,document.getElementById("panel-threat").textContent=e.threat,document.getElementById("panel-action").textContent=e.action,document.getElementById("panel-tradeoff").textContent=e.tradeoff,document.body.classList.add("panel-open"),d.markWoundVisited(e.id,{examined:!0}),this.scene.setMark(t),(i=document.querySelector(`.case-row[data-index="${t}"]`))==null||i.classList.add("examined"),(a=this.audioManager)==null||a.click(),(r=this.post)==null||r.triggerGlitch(.45)}closeCase(){document.body.classList.remove("panel-open")}buildSectionNav(){const t=document.getElementById("section-nav");t&&(this.sections.forEach((e,s)=>{const o=document.createElement("button");o.innerHTML=`
        <span class="nav-label">${e.dataset.name||""}</span>
        <span>0${s}</span>
      `,o.addEventListener("click",()=>{e.scrollIntoView({behavior:p.reducedMotion?"auto":"smooth"})}),t.appendChild(o)}),this.navButtons=Array.from(t.children))}setupReveals(){p.reducedMotion||x.utils.toArray("[data-reveal]").forEach(t=>{x.from(t,{y:34,opacity:0,duration:1.1,ease:"power3.out",scrollTrigger:{trigger:t,start:"top 88%",once:!0}})})}refreshSectionAnchors(){const t=window.innerHeight,e=Math.max(1,document.documentElement.scrollHeight-t),s=this.sections.map(o=>{const i=o.offsetTop+o.offsetHeight/2-t/2;return Math.min(1,Math.max(0,i/e))});this.scene.setSectionAnchors(s)}updateCurrentSection(){var s,o,i,a,r;const t=window.scrollY+window.innerHeight*.5;let e=0;for(let n=0;n<this.sections.length;n++)t>=this.sections[n].offsetTop&&(e=n);if(e!==this.currentSection&&(this.currentSection=e,(s=this.post)==null||s.setSection(e),(o=this.post)==null||o.triggerGlitch(.5),(i=this.audioManager)==null||i.setSection(e),(a=this.audioManager)==null||a.glitchBurst(),(r=this.navButtons)==null||r.forEach((n,c)=>{n.classList.toggle("active",c===e)}),e===this.sections.length-1)){const n=document.getElementById("footer-decay");if(n){const c=(d.getDecayLevel()*100).toFixed(1);n.textContent=this.lens.footerClose(c,d.visitedWounds.size,d.totalWounds)}}}setupUI(){var e;const t=document.getElementById("sound-toggle");t&&(t.addEventListener("click",async()=>{const s=!t.classList.contains("on");t.classList.toggle("on",s),t.textContent=s?"Sound: On":"Sound: Off",await this.audioManager.setMuted(!s),s&&this.audioManager.setSection(Math.max(0,this.currentSection))}),this.magnetize(t)),this.lens.flashReturn&&d.decayedWhileAway>.002&&((e=this.telemetry)==null||e.flash(this.lens.flashReturn,6)),console.log(`%c${this.lens.console.title}`,`color:${this.lens.theme.accent}; font-family:monospace; font-size:13px; font-weight:bold;`),console.log(`%c${this.lens.console.body}`,"color:#8a8a8a; font-family:monospace; font-size:11px;")}magnetize(t,e=80,s=.35){p.reducedMotion||p.isMobile||window.addEventListener("mousemove",o=>{const i=t.getBoundingClientRect(),a=i.left+i.width/2,r=i.top+i.height/2,n=o.clientX-a,c=o.clientY-r,y=Math.hypot(n,c);if(y<e){const f=1-y/e;t.style.transform=`translate(${n*f*s}px, ${c*f*s}px)`}else t.style.transform&&(t.style.transform="")},{passive:!0})}setupVisibilityHandling(){this._onVisibility=()=>{var t,e,s;if(document.visibilityState==="hidden")d.save(),this.hiddenAt=performance.now(),this._savedTitle=document.title,document.title=this.lens.titleAway;else{if(document.title=this._savedTitle||this._baseTitle(),(t=this.adaptiveRes)==null||t.reset(),this.hiddenAt&&this.lens.persistScalar.decayWhileAway){const o=(performance.now()-this.hiddenAt)/1e3,i=Math.min(.02,o*2e-4);i>5e-4&&(this.decaySystem.forceDecay(i),this.lens.flashAway&&((e=this.telemetry)==null||e.flash(this.lens.flashAway)),(s=this.post)==null||s.triggerGlitch(.5))}this.hiddenAt=0}},document.addEventListener("visibilitychange",this._onVisibility),window.addEventListener("beforeunload",()=>d.save())}onResize(){var s;const t=window.innerWidth,e=window.innerHeight;this.camera.aspect=t/e,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,e),(s=this.post)==null||s.resize(t,e),this.refreshSectionAnchors()}animate(){var o,i,a,r;if(!this.isRunning)return;requestAnimationFrame(this.animate.bind(this));const t=Math.min(this.clock.getDelta(),.05),e=Math.max(1,document.documentElement.scrollHeight-window.innerHeight),s=Math.min(1,window.scrollY/e);if(this.smoothedScroll+=(s-this.smoothedScroll)*.08,t>0){const n=Math.abs(s-this.lastRawScroll)/t;this.scrollVelocity+=(Math.min(1,n*2.5)-this.scrollVelocity)*.1}this.lastRawScroll=s,(o=this.post)==null||o.setScrollVelocity(this.scrollVelocity),(i=this.audioManager)==null||i.setScrollVelocity(this.scrollVelocity),this.scene.setAgitation(this.scrollVelocity),this.updateCurrentSection(),this.decaySystem.update(t),this.scene.update(t,this.smoothedScroll,this.mouse),(a=this.telemetry)==null||a.update(t),this.post?this.post.render(t,this.scene.getScene()):this.renderer.render(this.scene.getScene(),this.camera),(r=this.adaptiveRes)==null||r.update(t)}dispose(){var t,e,s;this.isRunning=!1,d.save(),(t=this.scene)==null||t.dispose(),(e=this.post)==null||e.dispose(),(s=this.cursor)==null||s.dispose(),window.removeEventListener("resize",this._onResize),document.removeEventListener("visibilitychange",this._onVisibility)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{new X}):new X;
