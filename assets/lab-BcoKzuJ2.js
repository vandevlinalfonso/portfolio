import"./modulepreload-polyfill-B5Qt9EMX.js";import{T as S,C as ie}from"./Cursor-12wpnqhY.js";import{i as se,q as B}from"./Quality-TTk3dsl2.js";import{W as U,h as b,C as K,O as M,z as W,N as q,H as J,J as O,R as y,K as N,S as l,V as R,M as k,P as z,B as re,a as G,A as ae,f as oe,d as p,Q as V,u as Y,v as ne}from"./three-core-B-BFjvfq.js";const $=["EMBERS","TOUCH ME","STILL HERE","BURN SLOW"],le=`
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash3(i), f),
                       dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
                       dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
                       dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
                       dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }
  vec3 curl(vec3 p) {
    const float e = 0.04;
    float nx1 = noise3(p + vec3(0, e, 0)), nx2 = noise3(p - vec3(0, e, 0));
    float ny1 = noise3(p + vec3(0, 0, e)), ny2 = noise3(p - vec3(0, 0, e));
    float nz1 = noise3(p + vec3(e, 0, 0)), nz2 = noise3(p - vec3(e, 0, 0));
    return normalize(vec3(nx1 - nx2, ny1 - ny2, nz1 - nz2) / (2.0 * e) + 1e-6);
  }
`;class he{constructor(t,i){this.simW=i.isMobile?256:448,this.simH=i.isMobile?160:280,this.count=this.simW*this.simH,this.wordIndex=0,this.heat=0,this.burst=0,this.renderer=new U({antialias:!1,powerPreference:"high-performance"}),this.renderer.setSize(innerWidth,innerHeight),this.renderer.setPixelRatio(Math.min(devicePixelRatio,i.maxPixelRatio)),t.appendChild(this.renderer.domElement),this.scene=new b,this.scene.background=new K(460552),this.aspect=innerWidth/innerHeight,this.camera=new M(-this.aspect,this.aspect,1,-1,.1,10),this.camera.position.z=5,this.buildSim(),this.buildPoints(),this.setWord(0),this.wordTimer=setInterval(()=>{this.setWord((this.wordIndex+1)%$.length)},7e3)}buildSim(){const t={type:J,minFilter:q,magFilter:q,depthBuffer:!1,stencilBuffer:!1};this.rtA=new W(this.simW,this.simH,t),this.rtB=new W(this.simW,this.simH,t);const i=new Float32Array(this.count*4);for(let r=0;r<this.count;r++)i[r*4]=(Math.random()-.5)*2*this.aspect,i[r*4+1]=(Math.random()-.5)*2,i[r*4+2]=(Math.random()-.5)*.4,i[r*4+3]=Math.random();this.seedTex=new O(i,this.simW,this.simH,y,N),this.seedTex.needsUpdate=!0,this.simScene=new b,this.simCamera=new M(-1,1,1,-1,0,1),this.simMaterial=new l({uniforms:{posTex:{value:this.seedTex},targetTex:{value:null},dt:{value:.016},time:{value:0},cursor:{value:new R(99,99,0)}},vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",fragmentShader:`
        uniform sampler2D posTex;
        uniform sampler2D targetTex;
        uniform float dt;
        uniform float time;
        uniform vec3 cursor;
        varying vec2 vUv;
        ${le}
        void main() {
          vec4 p = texture2D(posTex, vUv);
          vec3 target = texture2D(targetTex, vUv).xyz;
          vec3 pos = p.xyz;
          float seed = p.w;

          vec3 vel = (target - pos) * (1.6 + seed * 1.2);
          vel += curl(pos * 2.2 + vec3(0.0, 0.0, time * 0.1)) * (0.10 + 0.22 * fract(seed * 7.31));

          vec2 d = pos.xy - cursor.xy;
          float dist2 = dot(d, d);
          float push = exp(-dist2 * 18.0) * cursor.z;
          vel.xy += normalize(d + 1e-5) * push * 7.0;
          vel.z += (fract(seed * 13.7) - 0.5) * push * 2.0;

          pos += vel * dt;
          gl_FragColor = vec4(pos, seed);
        }
      `}),this.simScene.add(new k(new z(2,2),this.simMaterial));const e=new l({uniforms:{tex:{value:this.seedTex}},vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",fragmentShader:"uniform sampler2D tex; varying vec2 vUv; void main() { gl_FragColor = texture2D(tex, vUv); }"}),s=new b;s.add(new k(new z(2,2),e));for(const r of[this.rtA,this.rtB])this.renderer.setRenderTarget(r),this.renderer.render(s,this.simCamera);this.renderer.setRenderTarget(null),e.dispose()}buildPoints(){const t=new Float32Array(this.count*2);for(let e=0;e<this.count;e++)t[e*2]=(e%this.simW+.5)/this.simW,t[e*2+1]=(Math.floor(e/this.simW)+.5)/this.simH;const i=new re;i.setAttribute("position",new G(new Float32Array(this.count*3),3)),i.setAttribute("ref",new G(t,2)),this.pointsMaterial=new l({transparent:!0,depthWrite:!1,blending:ae,uniforms:{posTex:{value:null},targetTex:{value:null},pr:{value:Math.min(devicePixelRatio,2)}},vertexShader:`
        attribute vec2 ref;
        uniform sampler2D posTex;
        uniform sampler2D targetTex;
        uniform float pr;
        varying float vHeat;
        varying float vSeed;
        void main() {
          vec4 p = texture2D(posTex, ref);
          vec3 t = texture2D(targetTex, ref).xyz;
          vHeat = clamp(length(p.xyz - t) * 2.4, 0.0, 1.0);
          vSeed = p.w;
          gl_PointSize = (1.4 + 2.2 * vHeat + fract(p.w * 5.0)) * pr;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p.xyz, 1.0);
        }
      `,fragmentShader:`
        varying float vHeat;
        varying float vSeed;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          vec3 cold = vec3(0.38, 0.07, 0.05);
          vec3 hot = vec3(1.0, 0.52, 0.16);
          vec3 col = mix(cold, hot, vHeat);
          col += vec3(0.25, 0.1, 0.03) * step(0.96, fract(vSeed * 91.7)); // rare bright sparks
          float a = (1.0 - d * 2.0) * (0.55 + vHeat * 0.45);
          gl_FragColor = vec4(col, a);
        }
      `}),this.points=new oe(i,this.pointsMaterial),this.points.frustumCulled=!1,this.scene.add(this.points)}setWord(t){this.wordIndex=t;const i=$[t],e=1200,s=400,r=document.createElement("canvas");r.width=e,r.height=s;const o=r.getContext("2d");o.fillStyle="#fff",o.textAlign="center",o.textBaseline="middle";let a=230;do o.font=`700 ${a}px 'Space Grotesk', sans-serif`,a-=10;while(o.measureText(i).width>e*.92&&a>40);o.fillText(i,e/2,s/2);const u=o.getImageData(0,0,e,s).data,v=[];for(let n=0;n<s;n+=2)for(let d=0;d<e;d+=2)u[(n*e+d)*4+3]>128&&v.push([d,n]);v.length||v.push([e/2,s/2]);const x=this.aspect*1.5/e,c=new Float32Array(this.count*4);for(let n=0;n<this.count;n++){const[d,w]=v[Math.random()*v.length|0];c[n*4]=(d-e/2)*x+(Math.random()-.5)*.012,c[n*4+1]=-(w-s/2)*x+(Math.random()-.5)*.012,c[n*4+2]=(Math.random()-.5)*.16,c[n*4+3]=1}const m=this.targetTex;this.targetTex=new O(c,this.simW,this.simH,y,N),this.targetTex.needsUpdate=!0,this.simMaterial.uniforms.targetTex.value=this.targetTex,this.pointsMaterial.uniforms.targetTex.value=this.targetTex,m==null||m.dispose()}click(){this.burst=3.2}update(t,i,e){const s=(e.x/innerWidth*2-1)*this.aspect,r=-(e.y/innerHeight*2-1),o=Math.hypot(e.x-e.px,e.y-e.py);this.heat+=((o>1?Math.min(o/18,1.4):0)-this.heat)*.12,this.burst=Math.max(0,this.burst-t*4);const a=this.simMaterial.uniforms;a.cursor.value.set(s,r,.25+this.heat+this.burst),a.dt.value=Math.min(t,.033),a.time.value=i,a.posTex.value=this.rtA.texture,this.renderer.setRenderTarget(this.rtB),this.renderer.render(this.simScene,this.simCamera),this.renderer.setRenderTarget(null),[this.rtA,this.rtB]=[this.rtB,this.rtA],this.pointsMaterial.uniforms.posTex.value=this.rtA.texture,this.renderer.render(this.scene,this.camera)}resize(t,i){this.aspect=t/i,this.camera.left=-this.aspect,this.camera.right=this.aspect,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,i),this.setWord(this.wordIndex)}dispose(){var t;clearInterval(this.wordTimer),this.rtA.dispose(),this.rtB.dispose(),this.seedTex.dispose(),(t=this.targetTex)==null||t.dispose(),this.points.geometry.dispose(),this.pointsMaterial.dispose(),this.simMaterial.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}const f="varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }";function E(h,t,i){const e={type:J,format:i,minFilter:Y,magFilter:Y,wrapS:V,wrapT:V,depthBuffer:!1,stencilBuffer:!1};return{read:new W(h,t,e),write:new W(h,t,e),swap(){[this.read,this.write]=[this.write,this.read]},dispose(){this.read.dispose(),this.write.dispose()}}}class ce{constructor(t,i){const e=i.isMobile?96:144,s=i.isMobile?320:512;this.aspect=innerWidth/innerHeight,this.simW=Math.round(e*this.aspect),this.simH=e,this.dyeW=Math.round(s*this.aspect),this.dyeH=s,this.jacobi=i.isMobile?14:22,this.hue=Math.random(),this.renderer=new U({antialias:!1,powerPreference:"high-performance"}),this.renderer.setSize(innerWidth,innerHeight),this.renderer.setPixelRatio(Math.min(devicePixelRatio,i.maxPixelRatio)),t.appendChild(this.renderer.domElement),this.camera=new M(-1,1,1,-1,0,1),this.quadScene=new b,this.quad=new k(new z(2,2)),this.quadScene.add(this.quad),this.velocity=E(this.simW,this.simH,y),this.dye=E(this.dyeW,this.dyeH,y),this.pressure=E(this.simW,this.simH,y),this.divergence=E(this.simW,this.simH,y),this.buildMaterials()}buildMaterials(){const t=new p(1/this.simW,1/this.simH),i=new p(1/this.dyeW,1/this.dyeH);this.advectMat=new l({uniforms:{velocity:{value:null},source:{value:null},texelSize:{value:t},dt:{value:.016},dissipation:{value:.98}},vertexShader:f,fragmentShader:`
        uniform sampler2D velocity;
        uniform sampler2D source;
        uniform vec2 texelSize;
        uniform float dt;
        uniform float dissipation;
        varying vec2 vUv;
        void main() {
          vec2 vel = texture2D(velocity, vUv).xy;
          vec2 coord = vUv - dt * vel * texelSize;
          gl_FragColor = dissipation * texture2D(source, coord);
          gl_FragColor.a = 1.0;
        }
      `}),this.splatMat=new l({uniforms:{target:{value:null},point:{value:new p},color:{value:new R},radius:{value:.0016},aspect:{value:this.aspect}},vertexShader:f,fragmentShader:`
        uniform sampler2D target;
        uniform vec2 point;
        uniform vec3 color;
        uniform float radius;
        uniform float aspect;
        varying vec2 vUv;
        void main() {
          vec2 d = vUv - point;
          d.x *= aspect;
          vec3 splat = exp(-dot(d, d) / radius) * color;
          gl_FragColor = vec4(texture2D(target, vUv).xyz + splat, 1.0);
        }
      `}),this.divergenceMat=new l({uniforms:{velocity:{value:null},texelSize:{value:t}},vertexShader:f,fragmentShader:`
        uniform sampler2D velocity;
        uniform vec2 texelSize;
        varying vec2 vUv;
        void main() {
          float l = texture2D(velocity, vUv - vec2(texelSize.x, 0.0)).x;
          float r = texture2D(velocity, vUv + vec2(texelSize.x, 0.0)).x;
          float b = texture2D(velocity, vUv - vec2(0.0, texelSize.y)).y;
          float t = texture2D(velocity, vUv + vec2(0.0, texelSize.y)).y;
          gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
        }
      `}),this.pressureMat=new l({uniforms:{pressure:{value:null},divergence:{value:null},texelSize:{value:t}},vertexShader:f,fragmentShader:`
        uniform sampler2D pressure;
        uniform sampler2D divergence;
        uniform vec2 texelSize;
        varying vec2 vUv;
        void main() {
          float l = texture2D(pressure, vUv - vec2(texelSize.x, 0.0)).x;
          float r = texture2D(pressure, vUv + vec2(texelSize.x, 0.0)).x;
          float b = texture2D(pressure, vUv - vec2(0.0, texelSize.y)).x;
          float t = texture2D(pressure, vUv + vec2(0.0, texelSize.y)).x;
          float div = texture2D(divergence, vUv).x;
          gl_FragColor = vec4((l + r + b + t - div) * 0.25, 0.0, 0.0, 1.0);
        }
      `}),this.gradientMat=new l({uniforms:{pressure:{value:null},velocity:{value:null},texelSize:{value:t}},vertexShader:f,fragmentShader:`
        uniform sampler2D pressure;
        uniform sampler2D velocity;
        uniform vec2 texelSize;
        varying vec2 vUv;
        void main() {
          float l = texture2D(pressure, vUv - vec2(texelSize.x, 0.0)).x;
          float r = texture2D(pressure, vUv + vec2(texelSize.x, 0.0)).x;
          float b = texture2D(pressure, vUv - vec2(0.0, texelSize.y)).x;
          float t = texture2D(pressure, vUv + vec2(0.0, texelSize.y)).x;
          vec2 vel = texture2D(velocity, vUv).xy;
          vel -= vec2(r - l, t - b) * 0.5;
          gl_FragColor = vec4(vel, 0.0, 1.0);
        }
      `}),this.clearMat=new l({uniforms:{target:{value:null},value:{value:.85}},vertexShader:f,fragmentShader:`
        uniform sampler2D target;
        uniform float value;
        varying vec2 vUv;
        void main() { gl_FragColor = value * texture2D(target, vUv); gl_FragColor.a = 1.0; }
      `}),this.displayMat=new l({uniforms:{dye:{value:null},dyeTexel:{value:i}},vertexShader:f,fragmentShader:`
        uniform sampler2D dye;
        uniform vec2 dyeTexel;
        varying vec2 vUv;
        void main() {
          vec3 c = texture2D(dye, vUv).rgb;
          // cheap emboss lighting from dye density gradient
          float h0 = dot(texture2D(dye, vUv - dyeTexel).rgb, vec3(0.33));
          float h1 = dot(texture2D(dye, vUv + dyeTexel).rgb, vec3(0.33));
          c += (h1 - h0) * 0.55;
          c = pow(max(c, 0.0), vec3(0.85));
          float vig = smoothstep(1.05, 0.4, length(vUv - 0.5));
          c *= mix(0.55, 1.0, vig);
          gl_FragColor = vec4(c, 1.0);
        }
      `})}blit(t,i){this.quad.material=i,this.renderer.setRenderTarget(t),this.renderer.render(this.quadScene,this.camera)}splat(t,i,e,s,r,o=.0016){const a=this.splatMat.uniforms;a.aspect.value=this.aspect,a.point.value.set(t,1-i),a.radius.value=o,a.target.value=this.velocity.read.texture,a.color.value.set(e,-s,0),this.blit(this.velocity.write,this.splatMat),this.velocity.swap(),a.target.value=this.dye.read.texture,a.color.value.copy(r),this.blit(this.dye.write,this.splatMat),this.dye.swap()}click(t,i){const e=this.currentColor(3.2);for(let s=0;s<10;s++){const r=s/10*Math.PI*2;this.splat(t/innerWidth,i/innerHeight,Math.cos(r)*220,Math.sin(r)*220,e,.004)}}currentColor(t=1){this.hue=(this.hue+.0013)%1;const i=new K().setHSL(this.hue,.85,.5);return new R(i.r*.32*t,i.g*.32*t,i.b*.32*t)}update(t,i,e){const s=this.advectMat.uniforms,r=new p(1/this.simW,1/this.simH),o=e.x-e.px,a=e.y-e.py;Math.hypot(o,a)>.5&&this.splat(e.x/innerWidth,e.y/innerHeight,o*9,a*9,this.currentColor(e.down?2.2:1)),s.velocity.value=this.velocity.read.texture,s.source.value=this.velocity.read.texture,s.texelSize.value=r,s.dt.value=Math.min(t,.033)*60,s.dissipation.value=.985,this.blit(this.velocity.write,this.advectMat),this.velocity.swap(),this.divergenceMat.uniforms.velocity.value=this.velocity.read.texture,this.blit(this.divergence.read,this.divergenceMat),this.clearMat.uniforms.target.value=this.pressure.read.texture,this.blit(this.pressure.write,this.clearMat),this.pressure.swap();for(let u=0;u<this.jacobi;u++)this.pressureMat.uniforms.pressure.value=this.pressure.read.texture,this.pressureMat.uniforms.divergence.value=this.divergence.read.texture,this.blit(this.pressure.write,this.pressureMat),this.pressure.swap();this.gradientMat.uniforms.pressure.value=this.pressure.read.texture,this.gradientMat.uniforms.velocity.value=this.velocity.read.texture,this.blit(this.velocity.write,this.gradientMat),this.velocity.swap(),s.velocity.value=this.velocity.read.texture,s.source.value=this.dye.read.texture,s.texelSize.value=new p(1/this.dyeW,1/this.dyeH),s.dissipation.value=.988,this.blit(this.dye.write,this.advectMat),this.dye.swap(),this.displayMat.uniforms.dye.value=this.dye.read.texture,this.blit(null,this.displayMat)}resize(t,i){this.aspect=t/i,this.renderer.setSize(t,i)}dispose(){this.velocity.dispose(),this.dye.dispose(),this.pressure.dispose(),this.divergence.dispose(),[this.advectMat,this.splatMat,this.divergenceMat,this.pressureMat,this.gradientMat,this.clearMat,this.displayMat].forEach(t=>t.dispose()),this.quad.geometry.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}const X=["SIGNAL","PULSE","STATIC"];class de{constructor(t,i){var e;this.canvas=document.createElement("canvas"),this.ctx=this.canvas.getContext("2d"),t.appendChild(this.canvas),this.dpr=Math.min(devicePixelRatio||1,i.isMobile?1.5:2),this.phrases=((e=S.lens.site)==null?void 0:e.words)||X,this.phraseIndex=0,this.morph=1,this.smooth={x:innerWidth/2,y:innerHeight/2},this.wheelAccum=0,this.offTheme=S.onChange(s=>{var r;this.phrases=((r=s.site)==null?void 0:r.words)||X,this.phraseIndex%=this.phrases.length,this.morph=0}),this.resize(innerWidth,innerHeight)}wheel(t){if(this.wheelAccum+=t,Math.abs(this.wheelAccum)>140){const i=Math.sign(this.wheelAccum);this.wheelAccum=0,this.phraseIndex=(this.phraseIndex+i+this.phrases.length)%this.phrases.length,this.morph=0}}click(){this.phraseIndex=(this.phraseIndex+1)%this.phrases.length,this.morph=0}layout(){const t=this.phrases[this.phraseIndex];this.fontSize=Math.max(20,Math.min(innerWidth,innerHeight)/13),this.ctx.font=`700 ${this.fontSize}px 'Space Grotesk', sans-serif`;const i=this.ctx.measureText(t).width;this.cellW=i+this.fontSize*.9,this.cellH=this.fontSize*1.55,this.cols=Math.ceil(innerWidth/this.cellW)+2,this.rows=Math.ceil(innerHeight/this.cellH)+2}update(t,i,e){const s=this.ctx,r=innerWidth,o=innerHeight;this.smooth.x+=(e.x-this.smooth.x)*.08,this.smooth.y+=(e.y-this.smooth.y)*.08,this.morph=Math.min(1,this.morph+t*1.6),s.setTransform(this.dpr,0,0,this.dpr,0,0),s.fillStyle="#070708",s.fillRect(0,0,r,o);const a=this.phrases[this.phraseIndex];s.font=`700 ${this.fontSize}px 'Space Grotesk', sans-serif`,s.textAlign="center",s.textBaseline="middle";const u=Math.min(r,o)*.42,v=this.smooth.x,T=this.smooth.y;for(let c=-1;c<this.rows;c++)for(let m=-1;m<this.cols;m++){const n=c%2===0?0:this.cellW*.5,d=m*this.cellW+this.cellW/2+n,w=c*this.cellH+this.cellH/2,L=d-v,A=w-T,Q=Math.hypot(L,A),H=Math.max(0,1-Q/u),g=H*H*(3-2*H),D=Math.sin(i*.8+d*.004+w*.006)*.5+.5,Z=(c+1)/(this.rows+1),F=Math.max(0,Math.min(1,this.morph*2.2-Z)),_=Math.atan2(A,L),ee=g*.5*Math.sin(_*2+i*.6)+(D-.5)*.06,I=(.86+D*.07+g*.45)*(.6+F*.4),P=g*26;if(s.save(),s.translate(d+Math.cos(_)*P,w+Math.sin(_)*P),s.rotate(ee),s.scale(I,I),g>.55)s.fillStyle=S.accentRgba(.5+g*.5);else{const te=.1+D*.1+g*.55;s.fillStyle=`rgba(232, 230, 225, ${(te*F).toFixed(3)})`}s.fillText(a,0,0),s.restore()}const x=s.createRadialGradient(v,T,0,v,T,u*.5);x.addColorStop(0,S.accentRgba(.08)),x.addColorStop(1,S.accentRgba(0)),s.fillStyle=x,s.fillRect(0,0,r,o)}resize(t,i){this.canvas.width=t*this.dpr,this.canvas.height=i*this.dpr,this.layout()}dispose(){this.offTheme(),this.canvas.remove()}}class ve{constructor(t,i){this.renderer=new U({antialias:!1,powerPreference:"high-performance"}),this.renderer.setSize(innerWidth,innerHeight),this.renderer.setPixelRatio(Math.min(devicePixelRatio,i.isMobile?1:1.4)),t.appendChild(this.renderer.domElement),this.camera=new M(-1,1,1,-1,0,1),this.scene=new b,this.flare=0,this.shake=0,this.tilt=.17,this.orbit=new p(0,0),this.orbitTarget=new p(0,0);const e=i.isMobile?96:140;this.material=new l({uniforms:{time:{value:0},aspect:{value:innerWidth/innerHeight},orbit:{value:this.orbit},tilt:{value:this.tilt},flare:{value:0},shake:{value:0}},vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",fragmentShader:`
        precision highp float;

        uniform float time;
        uniform float aspect;
        uniform vec2 orbit;
        uniform float tilt;
        uniform float flare;
        uniform float shake;
        varying vec2 vUv;

        #define STEPS ${e}
        #define R_IN 2.2
        #define R_OUT 6.8

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
          for (int i = 0; i < 4; i++) {
            v += a * noise2(p);
            p = p * 2.13 + 19.7;
            a *= 0.5;
          }
          return v;
        }

        // Sparse cold starfield sampled by escape direction
        // (octahedral mapping: no pole stretch, no streak artifacts)
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
            float star = smoothstep(0.06, 0.0, d) * step(0.93, h) * tw;
            col += mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.88, 0.75), fract(h * 7.0))
                   * star * (l == 0 ? 0.9 : 0.45);
          }
          // the faintest breath of a galactic band — darkness should win
          float band = exp(-v.y * v.y * 14.0);
          col += vec3(0.04, 0.045, 0.075) * band * fbm(v.xz * 4.0);
          return col;
        }

        // Disk emission where a geodesic pierces the equatorial plane
        vec3 diskEmit(vec3 q, vec3 rd, float boost, out float alpha) {
          float rr = length(q.xz);
          // differential (Keplerian) rotation: rotate the sample frame
          float w = 2.6 / pow(rr, 1.5);
          float ca = cos(w * time), sa = sin(w * time);
          vec2 rq = mat2(ca, -sa, sa, ca) * q.xz;
          float n = fbm(rq * vec2(1.7, 1.7));
          float fil = fbm(vec2(rr * 6.0, atan(rq.y, rq.x) * 3.0));
          n = n * 0.65 + fil * 0.35;

          float density = smoothstep(R_IN, R_IN + 0.4, rr)
                        * smoothstep(R_OUT, R_OUT - 2.2, rr)
                        * (0.18 + 0.82 * smoothstep(0.34, 0.8, n));

          // white-hot rim where matter is about to fall in
          float rim = smoothstep(R_IN + 1.0, R_IN, rr);
          density += rim * 0.5 + flare * rim * 1.2;

          // doppler beaming: g = 1 / (1 - beta . n), brightness ~ g^3
          vec3 tang = normalize(vec3(-q.z, 0.0, q.x));
          float beta = min(0.62, 0.85 / sqrt(max(rr, 1.4)));
          float g = 1.0 / max(1.0 - beta * dot(tang, -rd), 0.3);
          float g3 = g * g * g;

          // temperature: white-hot inner edge cooling to molten amber
          float tgrad = smoothstep(R_IN, R_OUT * 0.55, rr);
          vec3 tcol = mix(vec3(1.12, 1.02, 0.85), vec3(1.0, 0.5, 0.14), tgrad);
          // blue-shift the approaching limb
          tcol = mix(tcol, vec3(0.8, 0.88, 1.08), clamp((g - 1.0) * 1.4, 0.0, 0.5));

          float radial = 1.0 / (0.3 * pow(rr, 1.7));
          float bright = density * radial * g3 * (0.5 + 0.5 * n) * boost;

          alpha = clamp(density * 0.85, 0.0, 1.0);
          return tcol * bright;
        }

        void main() {
          vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);

          // camera on an orbit rail, almost in the disk plane
          float yaw = orbit.x;
          float pitch = tilt + orbit.y;
          float dist = 17.0;
          vec3 ro = vec3(sin(yaw) * cos(pitch), sin(pitch), -cos(yaw) * cos(pitch)) * dist;

          // feed shake
          ro.xy += (vec2(noise2(vec2(time * 9.0, 3.7)), noise2(vec2(1.3, time * 8.0))) - 0.5) * shake * 0.7;

          vec3 fwd = normalize(-ro);
          vec3 rgt = normalize(cross(fwd, vec3(0.0, 1.0, 0.0)));
          vec3 up = cross(rgt, fwd);
          // keep the whole structure in frame on portrait screens
          float focal = 1.9 * min(1.0, aspect / 1.5);
          vec3 rd = normalize(fwd * focal + rgt * uv.x + up * uv.y);

          // conserved angular momentum of the photon
          vec3 h = cross(ro, rd);
          float h2 = dot(h, h);

          vec3 p = ro;
          vec3 v = rd;
          vec3 col = vec3(0.0);
          float T = 1.0;              // transmittance through the disk
          float boost = 1.0 + flare * 1.1;
          bool captured = false;

          for (int i = 0; i < STEPS; i++) {
            float r2 = dot(p, p);
            float r = sqrt(r2);

            if (r < 1.0) { captured = true; break; }
            if (r2 > 420.0 && dot(p, v) > 0.0) break;

            // adaptive step: creep near the photon sphere, stride far out
            // (bending ~ 1/r^5, so long far steps cost no accuracy and the
            // step budget reaches the lensed far side of the disk)
            float dt = clamp(0.06 * (r - 0.6), 0.04, 0.8);

            vec3 a = -1.5 * h2 * p / (r2 * r2 * r);
            vec3 pn = p + v * dt + 0.5 * a * dt * dt;

            // equatorial plane crossing → disk sample
            if (p.y * pn.y < 0.0) {
              float f = p.y / (p.y - pn.y);
              vec3 q = mix(p, pn, f);
              float rr = length(q.xz);
              if (rr > R_IN * 0.92 && rr < R_OUT) {
                float alpha;
                vec3 e = diskEmit(q, normalize(v), boost, alpha);
                col += T * e;
                T *= 1.0 - alpha * 0.82;
                if (T < 0.02) break;
              }
            }

            v += a * dt;
            p = pn;
          }

          if (!captured && T > 0.02) {
            col += T * sky(normalize(v));
          }

          // ACES-ish tonemap — keeps the core blinding without clipping ugly
          col *= 0.8 * vec3(1.06, 0.98, 0.88);
          col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);

          // vignette + grain: the void presses in
          float vig = smoothstep(1.3, 0.4, length(vUv - 0.5) * 1.6);
          col *= mix(0.42, 1.0, vig);
          col += (hash21(vUv * vec2(913.0, 717.0) + fract(time)) - 0.5) * 0.025;

          gl_FragColor = vec4(col, 1.0);
        }
      `}),this.scene.add(new k(new z(2,2),this.material))}click(){this.flare=1.4,this.shake=1}wheel(t){this.tilt=ne.clamp(this.tilt+t*45e-5,.05,.7)}update(t,i,e){this.orbitTarget.set((e.x/innerWidth-.5)*1.1,-(e.y/innerHeight-.5)*.22),this.orbit.lerp(this.orbitTarget,.016),this.flare=Math.max(0,this.flare-t*.55),this.shake=Math.max(0,this.shake-t*2.4);const s=this.material.uniforms;s.time.value=i,s.aspect.value=innerWidth/innerHeight,s.flare.value=this.flare,s.shake.value=this.shake,s.tilt.value+=(this.tilt-s.tilt.value)*.05,this.renderer.render(this.scene,this.camera)}resize(t,i){this.renderer.setSize(t,i)}dispose(){this.material.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}class pe{constructor(t,i){this.reduced=i.reducedMotion,this.renderer=new U({antialias:!1,powerPreference:"high-performance"}),this.renderer.setSize(innerWidth,innerHeight),this.renderer.setPixelRatio(Math.min(devicePixelRatio,i.isMobile?1:1.4)),t.appendChild(this.renderer.domElement),this.camera=new M(-1,1,1,-1,0,1),this.scene=new b,this.mouse=new p(0,0),this.mouseTarget=new p(0,0),this.pulse=0,this.params={field:.72,density:.66,visc:.35,oil:0};const e=i.isMobile?84:150;this.material=new l({uniforms:{time:{value:0},aspect:{value:innerWidth/innerHeight},mouse:{value:this.mouse},pulse:{value:0},uField:{value:this.params.field},uDensity:{value:this.params.density},uVisc:{value:this.params.visc},uOil:{value:this.params.oil}},vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,1.0); }",fragmentShader:`
        precision highp float;
        uniform float time, aspect, pulse;
        uniform vec2 mouse;
        uniform float uField, uDensity, uVisc, uOil;
        varying vec2 vUv;

        #define STEPS ${e}

        float hash(vec3 p){
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float vnoise(vec3 p){
          vec3 i = floor(p), f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                         mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                         mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
        }
        float fbm(vec3 p){
          float v = 0.0, a = 0.55;
          for (int i = 0; i < 4; i++){ v += a * vnoise(p); p = p * 2.02 + 7.3; a *= 0.5; }
          return v;
        }

        // the magnet in 3D: cursor projected onto a plane in front of the blob
        vec3 magnet(){ return vec3(mouse.x * 1.7, mouse.y * 1.7, 1.6); }

        // signed distance to the spiked blob
        float map(vec3 p){
          float r = length(p);
          vec3 dir = p / max(r, 1e-4);
          float align = dot(dir, normalize(magnet()));
          float facing = smoothstep(-0.4, 1.0, align);     // gentle bias toward the magnet

          // spike field: only the PEAKS of the noise rise into spikes — the
          // rest of the pool stays smooth chrome. That threshold is what reads
          // as ferrofluid rather than a rough rock.
          float freq = mix(3.5, 8.5, uDensity);
          float sharp = mix(1.8, 3.6, 1.0 - uVisc);
          float n = fbm(dir * freq + vec3(0.0, 0.0, time * 0.15));
          n = pow(clamp(n * 1.2, 0.0, 1.0), sharp);         // dense bristle across the WHOLE surface

          float amp = (0.6 + 0.4 * pulse) * uField;
          float spike = amp * n * (0.8 + 0.2 * facing);      // covers everything, a touch more toward the magnet
          float base = 1.0 + 0.1 * facing * uField;
          return (r - base - spike) * 0.5;                   // shrink Lipschitz for safety
        }

        vec3 calcN(vec3 p){
          vec2 e = vec2(0.0016, 0.0);
          return normalize(vec3(
            map(p+e.xyy) - map(p-e.xyy),
            map(p+e.yxy) - map(p-e.yxy),
            map(p+e.yyx) - map(p-e.yyx)));
        }

        // dark studio environment reflected by the black chrome — mostly dark
        // with a few bright sources so the body reads as a black mirror
        vec3 env(vec3 d){
          float y = d.y * 0.5 + 0.5;
          vec3 grad = mix(vec3(0.012, 0.013, 0.019), vec3(0.075, 0.085, 0.12), smoothstep(-0.1, 1.0, y));
          vec3 key = normalize(vec3(0.4, 0.82, 0.42));
          grad += vec3(1.0, 0.95, 0.82) * smoothstep(0.62, 1.0, dot(d, key)) * 1.7;   // bright soft key
          grad += vec3(1.0, 0.98, 0.9) * pow(max(dot(d, key), 0.0), 64.0) * 3.2;       // hot key core
          grad += vec3(0.7, 0.76, 0.92) * smoothstep(0.11, 0.0, abs(d.y - 0.04)) * 0.55; // softbox band
          vec3 rim = normalize(vec3(-0.6, 0.1, -0.7));
          grad += vec3(0.35, 0.46, 0.78) * pow(max(dot(d, rim), 0.0), 3.0) * 0.85;     // cool rim
          return grad;
        }

        void main(){
          vec2 uv = (vUv - 0.5) * vec2(aspect, 1.0);
          vec3 ro = vec3(0.0, 0.4, 4.5);                 // pulled back: a contained, centred pool
          vec3 ta = vec3(0.0, 0.0, 0.0);
          vec3 f = normalize(ta - ro);
          vec3 rt = normalize(cross(f, vec3(0.0, 1.0, 0.0)));
          vec3 uu = cross(rt, f);
          vec3 rd = normalize(uv.x * rt + uv.y * uu + 1.7 * f);

          float t = 0.0;
          bool hit = false;
          vec3 p;
          for (int i = 0; i < STEPS; i++){
            p = ro + rd * t;
            float d = map(p);
            if (d < 0.0008){ hit = true; break; }
            t += d;
            if (t > 7.0) break;
          }

          vec3 col;
          if (hit){
            vec3 n = calcN(p);
            vec3 view = -rd;
            float fres = pow(1.0 - max(dot(n, view), 0.0), 5.0);
            vec3 refl = reflect(rd, n);
            vec3 reflC = env(refl);

            vec3 base = vec3(0.012);                      // deep-black ferrofluid body
            col = base + reflC * (0.28 + 0.72 * fres);    // dark, absorbing — light only at edges

            vec3 key = normalize(vec3(0.55, 0.85, 0.35));
            float spec = pow(max(dot(refl, key), 0.0), 44.0);
            col += vec3(1.0, 0.97, 0.9) * spec * 1.7;     // sharp glossy glint

            // oil-slick: thin-film iridescence rising with grazing angle
            vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fres * 3.2 + vec3(0.0, 0.33, 0.67)));
            vec3 oilCol = base + reflC * 0.25 + irid * (0.28 + 0.72 * fres);
            col = mix(col, oilCol, uOil);

            // contact shadow / depth fade
            col *= mix(1.0, 0.85, smoothstep(2.6, 4.2, t));
          } else {
            // dim studio backdrop so the chrome pool stays the hero
            float y = rd.y * 0.5 + 0.5;
            col = mix(vec3(0.015, 0.017, 0.026), vec3(0.06, 0.07, 0.10), smoothstep(-0.2, 1.0, y));
            col *= smoothstep(1.5, 0.25, length(vUv - 0.5) * 1.4); // gentle spotlight
          }

          // ACES-ish tonemap
          col *= 1.05;
          col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
          // vignette + grain (house look)
          float vig = smoothstep(1.35, 0.35, length(vUv - 0.5) * 1.55);
          col *= mix(0.5, 1.0, vig);
          col += (hash(vec3(vUv * vec2(913.0, 717.0), fract(time))) - 0.5) * 0.02;

          gl_FragColor = vec4(col, 1.0);
        }
      `}),this.scene.add(new k(new z(2,2),this.material)),this.buildDeck()}buildDeck(){const t=document.createElement("style");t.textContent=`
      .ferro-deck{
        position:fixed; right:0; top:50%; transform:translate(24px,-50%);
        z-index:60; width:238px; padding:20px 20px 18px;
        display:flex; flex-direction:column; gap:16px;
        background:rgba(10,10,11,0.62); backdrop-filter:blur(14px);
        border:1px solid var(--line,rgba(232,230,225,0.14));
        border-right:none; border-radius:10px 0 0 10px;
        opacity:0; pointer-events:none;
        transition:opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1);
        font-family:var(--mono,monospace);
      }
      .ferro-deck.show{ opacity:1; pointer-events:auto; transform:translate(0,-50%); }
      .ferro-deck h4{
        margin:0 0 2px; font-size:9px; letter-spacing:3px; text-transform:uppercase;
        color:var(--fg-faint,rgba(232,230,225,0.4)); font-weight:500;
      }
      .ferro-row{ display:flex; flex-direction:column; gap:7px; }
      .ferro-row label{
        display:flex; justify-content:space-between; font-size:10px; letter-spacing:2px;
        text-transform:uppercase; color:var(--fg-dim,rgba(232,230,225,0.55));
      }
      .ferro-row label span{ color:var(--accent); }
      .ferro-deck input[type=range]{
        -webkit-appearance:none; appearance:none; width:100%; height:2px;
        background:rgba(232,230,225,0.18); outline:none; border-radius:2px; margin:2px 0;
      }
      .ferro-deck input[type=range]:focus-visible{ outline:1px solid var(--accent); outline-offset:4px; }
      .ferro-deck input[type=range]::-webkit-slider-thumb{
        -webkit-appearance:none; width:12px; height:12px; border-radius:50%;
        background:var(--accent); cursor:pointer; border:2px solid #0a0a0b;
      }
      .ferro-deck input[type=range]::-moz-range-thumb{
        width:12px; height:12px; border-radius:50%; background:var(--accent);
        cursor:pointer; border:2px solid #0a0a0b;
      }
      .ferro-seg{ display:flex; gap:6px; }
      .ferro-seg button{
        flex:1; font-family:var(--mono,monospace); font-size:9px; letter-spacing:1.5px;
        text-transform:uppercase; padding:7px 4px; cursor:pointer;
        background:transparent; color:var(--fg-faint,rgba(232,230,225,0.4));
        border:1px solid var(--line,rgba(232,230,225,0.14)); border-radius:4px;
        transition:color .25s, border-color .25s;
      }
      .ferro-seg button.on{ color:var(--accent); border-color:var(--accent); }
      .ferro-tab{
        position:fixed; right:8px; top:50%; transform:translateY(-50%); z-index:59;
        writing-mode:vertical-rl; font-family:var(--mono,monospace); font-size:9px;
        letter-spacing:3px; text-transform:uppercase; color:var(--fg-faint,rgba(232,230,225,0.32));
        pointer-events:none; transition:opacity .4s ease;
      }
      .ferro-tab.hide{ opacity:0; }
    `,document.head.appendChild(t),this._style=t;const i=document.createElement("div");i.className="ferro-deck",i.innerHTML=`
      <h4>Field deck</h4>
      <div class="ferro-row"><label>Field strength <span data-v="field"></span></label>
        <input type="range" min="0" max="1" step="0.01" data-k="field"></div>
      <div class="ferro-row"><label>Spike density <span data-v="density"></span></label>
        <input type="range" min="0" max="1" step="0.01" data-k="density"></div>
      <div class="ferro-row"><label>Viscosity <span data-v="visc"></span></label>
        <input type="range" min="0" max="1" step="0.01" data-k="visc"></div>
      <div class="ferro-row"><label>Surface</label>
        <div class="ferro-seg">
          <button data-oil="0">Chrome</button>
          <button data-oil="1">Oil-slick</button>
        </div></div>
    `,document.body.appendChild(i),this._deck=i;const e=document.createElement("div");e.className="ferro-tab",e.textContent="Field deck →",document.body.appendChild(e),this._tab=e;const s=o=>Math.round(o*100)+"%";i.querySelectorAll("input[type=range]").forEach(o=>{const a=o.dataset.k;o.value=this.params[a],i.querySelector(`[data-v="${a}"]`).textContent=s(this.params[a]),o.addEventListener("input",()=>{this.params[a]=parseFloat(o.value),i.querySelector(`[data-v="${a}"]`).textContent=s(this.params[a])})}),this._oilBtns=i.querySelectorAll(".ferro-seg button");const r=o=>{this.params.oil=o,this._oilBtns.forEach(a=>a.classList.toggle("on",parseInt(a.dataset.oil,10)===o))};this._oilBtns.forEach(o=>o.addEventListener("click",()=>r(parseInt(o.dataset.oil,10)))),r(0),this._overDeck=!1,i.addEventListener("pointerenter",()=>{this._overDeck=!0}),i.addEventListener("pointerleave",()=>{this._overDeck=!1}),this.idle=0,this.deckShown=!1}_reveal(t){t!==this.deckShown&&(this.deckShown=t,this._deck.classList.toggle("show",t),this._tab.classList.toggle("hide",t))}click(){this.pulse=1}update(t,i,e){this.mouseTarget.set((e.x/innerWidth-.5)*(innerWidth/innerHeight),-(e.y/innerHeight-.5));const s=1-Math.exp(-t/(.06+this.params.visc*.5));this.mouse.lerp(this.mouseTarget,s),this.pulse=Math.max(0,this.pulse-t*1.6),Math.hypot(e.x-e.px,e.y-e.py)>1.5?this.idle=0:this.idle+=t;const o=e.x>innerWidth-300;this._reveal(this._overDeck||o||this.idle>1.5);const a=this.material.uniforms;a.time.value=i,a.aspect.value=innerWidth/innerHeight,a.pulse.value=this.pulse,a.uField.value=this.params.field,a.uDensity.value=this.params.density,a.uVisc.value=this.params.visc,a.uOil.value+=(this.params.oil-a.uOil.value)*(1-Math.exp(-t/.12)),this.renderer.render(this.scene,this.camera)}resize(t,i){this.renderer.setSize(t,i)}dispose(){var t,i,e;this.material.dispose(),this.renderer.dispose(),this.renderer.domElement.remove(),(t=this._deck)==null||t.remove(),(i=this._tab)==null||i.remove(),(e=this._style)==null||e.remove()}}const C=[{id:"embers",label:"01 · Embers",Cls:he,hint:"Move to scatter the embers: they remember the words"},{id:"ink",label:"02 · Ink",Cls:ce,hint:"Drag luminous ink through black water: click for a pulse"},{id:"lattice",label:"03 · Lattice",Cls:de,hint:"The wall bends around your cursor: scroll to change the phrase"},{id:"blackhole",label:"04 · Blackhole",Cls:ve,hint:"Move to orbit it: scroll to dive toward the disk, click to feed it"},{id:"ferrofluid",label:"05 · Ferrofluid",Cls:pe,hint:"Your cursor is the magnet: the chrome fluid spikes toward it. Reach the right edge for the field deck"}];class ue{constructor(){this.host=document.getElementById("stage"),this.hintEl=document.getElementById("lab-hint"),this.current=null,this.index=-1,this.pointer={x:innerWidth/2,y:innerHeight/2,px:innerWidth/2,py:innerHeight/2,down:!1},this.lastTime=performance.now(),new ie,this.buildTabs(),this.bindInput(),this.select(0),requestAnimationFrame(this.loop.bind(this))}buildTabs(){const t=document.getElementById("lab-tabs");this.tabs=C.map((i,e)=>{const s=document.createElement("button");return s.textContent=i.label,s.setAttribute("role","tab"),s.setAttribute("aria-selected","false"),s.tabIndex=-1,s.addEventListener("click",()=>this.select(e)),t.appendChild(s),s})}bindInput(){const t=(e,s)=>{this.pointer.x=e,this.pointer.y=s};window.addEventListener("mousemove",e=>t(e.clientX,e.clientY),{passive:!0}),window.addEventListener("mousedown",()=>{this.pointer.down=!0}),window.addEventListener("mouseup",()=>{this.pointer.down=!1}),window.addEventListener("touchstart",e=>{this.pointer.down=!0,t(e.touches[0].clientX,e.touches[0].clientY),this.pointer.px=this.pointer.x,this.pointer.py=this.pointer.y},{passive:!0}),window.addEventListener("touchmove",e=>t(e.touches[0].clientX,e.touches[0].clientY),{passive:!0}),window.addEventListener("touchend",()=>{this.pointer.down=!1});let i=null;this.host.addEventListener("touchstart",e=>{const s=e.touches[0];i=e.touches.length===1?{x:s.clientX,y:s.clientY,at:performance.now()}:null},{passive:!0}),this.host.addEventListener("touchend",e=>{if(!i)return;const s=e.changedTouches[0],r=s.clientX-i.x,o=s.clientY-i.y,a=performance.now()-i.at<450;i=null,a&&Math.abs(r)>70&&Math.abs(r)>Math.abs(o)*1.5&&this.step(r<0?1:-1)},{passive:!0}),window.addEventListener("keydown",e=>{var s,r;e.key!=="ArrowRight"&&e.key!=="ArrowLeft"||(r=(s=e.target).closest)!=null&&r.call(s,"input, select, textarea, [contenteditable]")||(this.step(e.key==="ArrowRight"?1:-1),this.tabs.includes(document.activeElement)&&this.tabs[this.index].focus({preventScroll:!0}))}),window.addEventListener("resize",()=>{var e;(e=this.current)==null||e.resize(innerWidth,innerHeight)}),window.addEventListener("wheel",e=>{var s,r;(r=(s=this.current)==null?void 0:s.wheel)==null||r.call(s,e.deltaY)},{passive:!0}),window.addEventListener("click",e=>{var s,r;e.target.closest("#lab-tabs, .frame-nav, .ferro-deck, button, a, input, select, textarea, label")||(r=(s=this.current)==null?void 0:s.click)==null||r.call(s,e.clientX,e.clientY)})}step(t){this.select((this.index+t+C.length)%C.length)}revealTab(t){const i=t.parentElement;if(i.scrollWidth<=i.clientWidth)return;const e=i.getBoundingClientRect(),s=t.getBoundingClientRect();i.scrollTo({left:i.scrollLeft+s.left-e.left-(e.width-s.width)/2,behavior:B.reducedMotion?"auto":"smooth"})}select(t){if(t===this.index)return;this.index=t,this.tabs.forEach((e,s)=>{const r=s===t;e.classList.toggle("active",r),e.setAttribute("aria-selected",String(r)),e.tabIndex=r?0:-1}),this.revealTab(this.tabs[t]),this.current&&(this.current.dispose(),this.current=null),this.host.innerHTML="";const i=C[t];this.hintEl.textContent=i.hint,this.current=new i.Cls(this.host,B)}loop(t){requestAnimationFrame(this.loop.bind(this));const i=Math.min(.05,(t-this.lastTime)/1e3);this.lastTime=t,this.current&&this.current.update(i,t/1e3,this.pointer),this.pointer.px=this.pointer.x,this.pointer.py=this.pointer.y}}function j(){var h;if(!se()){(h=document.getElementById("webgl-fallback"))==null||h.classList.add("visible");return}new ue}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",j):j();
