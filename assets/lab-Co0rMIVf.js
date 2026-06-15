import"./modulepreload-polyfill-B5Qt9EMX.js";import{C as ee}from"./Cursor-C1SwI0fm.js";import{i as te,q as ie}from"./Quality-TTk3dsl2.js";import{W as A,c as S,C as X,O as U,z as W,_ as B,H as j,$ as q,a0 as y,a1 as O,S as h,V as R,M as H,f as k,B as se,a as G,k as re,i as ae,e as f,a2 as N,t as $,u as oe}from"./three-core-CYWnSrLN.js";const Y=["EMBERS","TOUCH ME","STILL HERE","BURN SLOW"],ne=`
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
`;class le{constructor(t,e){this.simW=e.isMobile?256:448,this.simH=e.isMobile?160:280,this.count=this.simW*this.simH,this.wordIndex=0,this.heat=0,this.burst=0,this.renderer=new A({antialias:!1,powerPreference:"high-performance"}),this.renderer.setSize(innerWidth,innerHeight),this.renderer.setPixelRatio(Math.min(devicePixelRatio,e.maxPixelRatio)),t.appendChild(this.renderer.domElement),this.scene=new S,this.scene.background=new X(460552),this.aspect=innerWidth/innerHeight,this.camera=new U(-this.aspect,this.aspect,1,-1,.1,10),this.camera.position.z=5,this.buildSim(),this.buildPoints(),this.setWord(0),this.wordTimer=setInterval(()=>{this.setWord((this.wordIndex+1)%Y.length)},7e3)}buildSim(){const t={type:j,minFilter:B,magFilter:B,depthBuffer:!1,stencilBuffer:!1};this.rtA=new W(this.simW,this.simH,t),this.rtB=new W(this.simW,this.simH,t);const e=new Float32Array(this.count*4);for(let r=0;r<this.count;r++)e[r*4]=(Math.random()-.5)*2*this.aspect,e[r*4+1]=(Math.random()-.5)*2,e[r*4+2]=(Math.random()-.5)*.4,e[r*4+3]=Math.random();this.seedTex=new q(e,this.simW,this.simH,y,O),this.seedTex.needsUpdate=!0,this.simScene=new S,this.simCamera=new U(-1,1,1,-1,0,1),this.simMaterial=new h({uniforms:{posTex:{value:this.seedTex},targetTex:{value:null},dt:{value:.016},time:{value:0},cursor:{value:new R(99,99,0)}},vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",fragmentShader:`
        uniform sampler2D posTex;
        uniform sampler2D targetTex;
        uniform float dt;
        uniform float time;
        uniform vec3 cursor;
        varying vec2 vUv;
        ${ne}
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
      `}),this.simScene.add(new H(new k(2,2),this.simMaterial));const s=new h({uniforms:{tex:{value:this.seedTex}},vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",fragmentShader:"uniform sampler2D tex; varying vec2 vUv; void main() { gl_FragColor = texture2D(tex, vUv); }"}),i=new S;i.add(new H(new k(2,2),s));for(const r of[this.rtA,this.rtB])this.renderer.setRenderTarget(r),this.renderer.render(i,this.simCamera);this.renderer.setRenderTarget(null),s.dispose()}buildPoints(){const t=new Float32Array(this.count*2);for(let s=0;s<this.count;s++)t[s*2]=(s%this.simW+.5)/this.simW,t[s*2+1]=(Math.floor(s/this.simW)+.5)/this.simH;const e=new se;e.setAttribute("position",new G(new Float32Array(this.count*3),3)),e.setAttribute("ref",new G(t,2)),this.pointsMaterial=new h({transparent:!0,depthWrite:!1,blending:re,uniforms:{posTex:{value:null},targetTex:{value:null},pr:{value:Math.min(devicePixelRatio,2)}},vertexShader:`
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
      `}),this.points=new ae(e,this.pointsMaterial),this.points.frustumCulled=!1,this.scene.add(this.points)}setWord(t){this.wordIndex=t;const e=Y[t],s=1200,i=400,r=document.createElement("canvas");r.width=s,r.height=i;const o=r.getContext("2d");o.fillStyle="#fff",o.textAlign="center",o.textBaseline="middle";let a=230;do o.font=`700 ${a}px 'Space Grotesk', sans-serif`,a-=10;while(o.measureText(e).width>s*.92&&a>40);o.fillText(e,s/2,i/2);const u=o.getImageData(0,0,s,i).data,v=[];for(let n=0;n<i;n+=2)for(let d=0;d<s;d+=2)u[(n*s+d)*4+3]>128&&v.push([d,n]);v.length||v.push([s/2,i/2]);const x=this.aspect*1.5/s,l=new Float32Array(this.count*4);for(let n=0;n<this.count;n++){const[d,w]=v[Math.random()*v.length|0];l[n*4]=(d-s/2)*x+(Math.random()-.5)*.012,l[n*4+1]=-(w-i/2)*x+(Math.random()-.5)*.012,l[n*4+2]=(Math.random()-.5)*.16,l[n*4+3]=1}const p=this.targetTex;this.targetTex=new q(l,this.simW,this.simH,y,O),this.targetTex.needsUpdate=!0,this.simMaterial.uniforms.targetTex.value=this.targetTex,this.pointsMaterial.uniforms.targetTex.value=this.targetTex,p==null||p.dispose()}click(){this.burst=3.2}update(t,e,s){const i=(s.x/innerWidth*2-1)*this.aspect,r=-(s.y/innerHeight*2-1),o=Math.hypot(s.x-s.px,s.y-s.py);this.heat+=((o>1?Math.min(o/18,1.4):0)-this.heat)*.12,this.burst=Math.max(0,this.burst-t*4);const a=this.simMaterial.uniforms;a.cursor.value.set(i,r,.25+this.heat+this.burst),a.dt.value=Math.min(t,.033),a.time.value=e,a.posTex.value=this.rtA.texture,this.renderer.setRenderTarget(this.rtB),this.renderer.render(this.simScene,this.simCamera),this.renderer.setRenderTarget(null),[this.rtA,this.rtB]=[this.rtB,this.rtA],this.pointsMaterial.uniforms.posTex.value=this.rtA.texture,this.renderer.render(this.scene,this.camera)}resize(t,e){this.aspect=t/e,this.camera.left=-this.aspect,this.camera.right=this.aspect,this.camera.updateProjectionMatrix(),this.renderer.setSize(t,e),this.setWord(this.wordIndex)}dispose(){var t;clearInterval(this.wordTimer),this.rtA.dispose(),this.rtB.dispose(),this.seedTex.dispose(),(t=this.targetTex)==null||t.dispose(),this.points.geometry.dispose(),this.pointsMaterial.dispose(),this.simMaterial.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}const m="varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }";function z(c,t,e){const s={type:j,format:e,minFilter:$,magFilter:$,wrapS:N,wrapT:N,depthBuffer:!1,stencilBuffer:!1};return{read:new W(c,t,s),write:new W(c,t,s),swap(){[this.read,this.write]=[this.write,this.read]},dispose(){this.read.dispose(),this.write.dispose()}}}class he{constructor(t,e){const s=e.isMobile?96:144,i=e.isMobile?320:512;this.aspect=innerWidth/innerHeight,this.simW=Math.round(s*this.aspect),this.simH=s,this.dyeW=Math.round(i*this.aspect),this.dyeH=i,this.jacobi=e.isMobile?14:22,this.hue=Math.random(),this.renderer=new A({antialias:!1,powerPreference:"high-performance"}),this.renderer.setSize(innerWidth,innerHeight),this.renderer.setPixelRatio(Math.min(devicePixelRatio,e.maxPixelRatio)),t.appendChild(this.renderer.domElement),this.camera=new U(-1,1,1,-1,0,1),this.quadScene=new S,this.quad=new H(new k(2,2)),this.quadScene.add(this.quad),this.velocity=z(this.simW,this.simH,y),this.dye=z(this.dyeW,this.dyeH,y),this.pressure=z(this.simW,this.simH,y),this.divergence=z(this.simW,this.simH,y),this.buildMaterials()}buildMaterials(){const t=new f(1/this.simW,1/this.simH),e=new f(1/this.dyeW,1/this.dyeH);this.advectMat=new h({uniforms:{velocity:{value:null},source:{value:null},texelSize:{value:t},dt:{value:.016},dissipation:{value:.98}},vertexShader:m,fragmentShader:`
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
      `}),this.splatMat=new h({uniforms:{target:{value:null},point:{value:new f},color:{value:new R},radius:{value:.0016},aspect:{value:this.aspect}},vertexShader:m,fragmentShader:`
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
      `}),this.divergenceMat=new h({uniforms:{velocity:{value:null},texelSize:{value:t}},vertexShader:m,fragmentShader:`
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
      `}),this.pressureMat=new h({uniforms:{pressure:{value:null},divergence:{value:null},texelSize:{value:t}},vertexShader:m,fragmentShader:`
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
      `}),this.gradientMat=new h({uniforms:{pressure:{value:null},velocity:{value:null},texelSize:{value:t}},vertexShader:m,fragmentShader:`
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
      `}),this.clearMat=new h({uniforms:{target:{value:null},value:{value:.85}},vertexShader:m,fragmentShader:`
        uniform sampler2D target;
        uniform float value;
        varying vec2 vUv;
        void main() { gl_FragColor = value * texture2D(target, vUv); gl_FragColor.a = 1.0; }
      `}),this.displayMat=new h({uniforms:{dye:{value:null},dyeTexel:{value:e}},vertexShader:m,fragmentShader:`
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
      `})}blit(t,e){this.quad.material=e,this.renderer.setRenderTarget(t),this.renderer.render(this.quadScene,this.camera)}splat(t,e,s,i,r,o=.0016){const a=this.splatMat.uniforms;a.aspect.value=this.aspect,a.point.value.set(t,1-e),a.radius.value=o,a.target.value=this.velocity.read.texture,a.color.value.set(s,-i,0),this.blit(this.velocity.write,this.splatMat),this.velocity.swap(),a.target.value=this.dye.read.texture,a.color.value.copy(r),this.blit(this.dye.write,this.splatMat),this.dye.swap()}click(t,e){const s=this.currentColor(3.2);for(let i=0;i<10;i++){const r=i/10*Math.PI*2;this.splat(t/innerWidth,e/innerHeight,Math.cos(r)*220,Math.sin(r)*220,s,.004)}}currentColor(t=1){this.hue=(this.hue+.0013)%1;const e=new X().setHSL(this.hue,.85,.5);return new R(e.r*.32*t,e.g*.32*t,e.b*.32*t)}update(t,e,s){const i=this.advectMat.uniforms,r=new f(1/this.simW,1/this.simH),o=s.x-s.px,a=s.y-s.py;Math.hypot(o,a)>.5&&this.splat(s.x/innerWidth,s.y/innerHeight,o*9,a*9,this.currentColor(s.down?2.2:1)),i.velocity.value=this.velocity.read.texture,i.source.value=this.velocity.read.texture,i.texelSize.value=r,i.dt.value=Math.min(t,.033)*60,i.dissipation.value=.985,this.blit(this.velocity.write,this.advectMat),this.velocity.swap(),this.divergenceMat.uniforms.velocity.value=this.velocity.read.texture,this.blit(this.divergence.read,this.divergenceMat),this.clearMat.uniforms.target.value=this.pressure.read.texture,this.blit(this.pressure.write,this.clearMat),this.pressure.swap();for(let u=0;u<this.jacobi;u++)this.pressureMat.uniforms.pressure.value=this.pressure.read.texture,this.pressureMat.uniforms.divergence.value=this.divergence.read.texture,this.blit(this.pressure.write,this.pressureMat),this.pressure.swap();this.gradientMat.uniforms.pressure.value=this.pressure.read.texture,this.gradientMat.uniforms.velocity.value=this.velocity.read.texture,this.blit(this.velocity.write,this.gradientMat),this.velocity.swap(),i.velocity.value=this.velocity.read.texture,i.source.value=this.dye.read.texture,i.texelSize.value=new f(1/this.dyeW,1/this.dyeH),i.dissipation.value=.988,this.blit(this.dye.write,this.advectMat),this.dye.swap(),this.displayMat.uniforms.dye.value=this.dye.read.texture,this.blit(null,this.displayMat)}resize(t,e){this.aspect=t/e,this.renderer.setSize(t,e)}dispose(){this.velocity.dispose(),this.dye.dispose(),this.pressure.dispose(),this.divergence.dispose(),[this.advectMat,this.splatMat,this.divergenceMat,this.pressureMat,this.gradientMat,this.clearMat,this.displayMat].forEach(t=>t.dispose()),this.quad.geometry.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}const b=["BREACH","SIGNAL","DECAY","PULSE","STATIC"];class ce{constructor(t,e){this.canvas=document.createElement("canvas"),this.ctx=this.canvas.getContext("2d"),t.appendChild(this.canvas),this.dpr=Math.min(devicePixelRatio||1,e.isMobile?1.5:2),this.phraseIndex=0,this.morph=1,this.smooth={x:innerWidth/2,y:innerHeight/2},this.wheelAccum=0,this.resize(innerWidth,innerHeight)}wheel(t){if(this.wheelAccum+=t,Math.abs(this.wheelAccum)>140){const e=Math.sign(this.wheelAccum);this.wheelAccum=0,this.phraseIndex=(this.phraseIndex+e+b.length)%b.length,this.morph=0}}click(){this.phraseIndex=(this.phraseIndex+1)%b.length,this.morph=0}layout(){const t=b[this.phraseIndex];this.fontSize=Math.max(20,Math.min(innerWidth,innerHeight)/13),this.ctx.font=`700 ${this.fontSize}px 'Space Grotesk', sans-serif`;const e=this.ctx.measureText(t).width;this.cellW=e+this.fontSize*.9,this.cellH=this.fontSize*1.55,this.cols=Math.ceil(innerWidth/this.cellW)+2,this.rows=Math.ceil(innerHeight/this.cellH)+2}update(t,e,s){const i=this.ctx,r=innerWidth,o=innerHeight;this.smooth.x+=(s.x-this.smooth.x)*.08,this.smooth.y+=(s.y-this.smooth.y)*.08,this.morph=Math.min(1,this.morph+t*1.6),i.setTransform(this.dpr,0,0,this.dpr,0,0),i.fillStyle="#070708",i.fillRect(0,0,r,o);const a=b[this.phraseIndex];i.font=`700 ${this.fontSize}px 'Space Grotesk', sans-serif`,i.textAlign="center",i.textBaseline="middle";const u=Math.min(r,o)*.42,v=this.smooth.x,T=this.smooth.y;for(let l=-1;l<this.rows;l++)for(let p=-1;p<this.cols;p++){const n=l%2===0?0:this.cellW*.5,d=p*this.cellW+this.cellW/2+n,w=l*this.cellH+this.cellH/2,I=d-v,_=w-T,K=Math.hypot(I,_),E=Math.max(0,1-K/u),g=E*E*(3-2*E),C=Math.sin(e*.8+d*.004+w*.006)*.5+.5,J=(l+1)/(this.rows+1),L=Math.max(0,Math.min(1,this.morph*2.2-J)),D=Math.atan2(_,I),Q=g*.5*Math.sin(D*2+e*.6)+(C-.5)*.06,P=(.86+C*.07+g*.45)*(.6+L*.4),F=g*26;if(i.save(),i.translate(d+Math.cos(D)*F,w+Math.sin(D)*F),i.rotate(Q),i.scale(P,P),g>.55)i.fillStyle=`rgba(196, 58, 47, ${.5+g*.5})`;else{const Z=.1+C*.1+g*.55;i.fillStyle=`rgba(232, 230, 225, ${(Z*L).toFixed(3)})`}i.fillText(a,0,0),i.restore()}const x=i.createRadialGradient(v,T,0,v,T,u*.5);x.addColorStop(0,"rgba(196, 58, 47, 0.08)"),x.addColorStop(1,"rgba(196, 58, 47, 0)"),i.fillStyle=x,i.fillRect(0,0,r,o)}resize(t,e){this.canvas.width=t*this.dpr,this.canvas.height=e*this.dpr,this.layout()}dispose(){this.canvas.remove()}}class de{constructor(t,e){this.renderer=new A({antialias:!1,powerPreference:"high-performance"}),this.renderer.setSize(innerWidth,innerHeight),this.renderer.setPixelRatio(Math.min(devicePixelRatio,e.isMobile?1:1.4)),t.appendChild(this.renderer.domElement),this.camera=new U(-1,1,1,-1,0,1),this.scene=new S,this.flare=0,this.shake=0,this.tilt=.17,this.orbit=new f(0,0),this.orbitTarget=new f(0,0);const s=e.isMobile?96:140;this.material=new h({uniforms:{time:{value:0},aspect:{value:innerWidth/innerHeight},orbit:{value:this.orbit},tilt:{value:this.tilt},flare:{value:0},shake:{value:0}},vertexShader:"varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }",fragmentShader:`
        precision highp float;

        uniform float time;
        uniform float aspect;
        uniform vec2 orbit;
        uniform float tilt;
        uniform float flare;
        uniform float shake;
        varying vec2 vUv;

        #define STEPS ${s}
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
      `}),this.scene.add(new H(new k(2,2),this.material))}click(){this.flare=1.4,this.shake=1}wheel(t){this.tilt=oe.clamp(this.tilt+t*45e-5,.05,.7)}update(t,e,s){this.orbitTarget.set((s.x/innerWidth-.5)*1.1,-(s.y/innerHeight-.5)*.22),this.orbit.lerp(this.orbitTarget,.016),this.flare=Math.max(0,this.flare-t*.55),this.shake=Math.max(0,this.shake-t*2.4);const i=this.material.uniforms;i.time.value=e,i.aspect.value=innerWidth/innerHeight,i.flare.value=this.flare,i.shake.value=this.shake,i.tilt.value+=(this.tilt-i.tilt.value)*.05,this.renderer.render(this.scene,this.camera)}resize(t,e){this.renderer.setSize(t,e)}dispose(){this.material.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}const M=[{id:"embers",label:"01 — Embers",Cls:le,hint:"Move to scatter the embers — they remember the words"},{id:"ink",label:"02 — Ink",Cls:he,hint:"Drag luminous ink through black water — click for a pulse"},{id:"lattice",label:"03 — Lattice",Cls:ce,hint:"The wall bends around your cursor — scroll to change the phrase"},{id:"blackhole",label:"04 — Blackhole",Cls:de,hint:"Move to orbit it — scroll to dive toward the disk, click to feed it"}];class ve{constructor(){this.host=document.getElementById("stage"),this.hintEl=document.getElementById("lab-hint"),this.current=null,this.index=-1,this.pointer={x:innerWidth/2,y:innerHeight/2,px:innerWidth/2,py:innerHeight/2,down:!1},this.lastTime=performance.now(),new ee,this.buildTabs(),this.bindInput(),this.select(0),requestAnimationFrame(this.loop.bind(this))}buildTabs(){const t=document.getElementById("lab-tabs");this.tabs=M.map((e,s)=>{const i=document.createElement("button");return i.textContent=e.label,i.setAttribute("role","tab"),i.addEventListener("click",()=>this.select(s)),t.appendChild(i),i})}bindInput(){const t=(e,s)=>{this.pointer.x=e,this.pointer.y=s};window.addEventListener("mousemove",e=>t(e.clientX,e.clientY),{passive:!0}),window.addEventListener("mousedown",()=>{this.pointer.down=!0}),window.addEventListener("mouseup",()=>{this.pointer.down=!1}),window.addEventListener("touchstart",e=>{this.pointer.down=!0,t(e.touches[0].clientX,e.touches[0].clientY),this.pointer.px=this.pointer.x,this.pointer.py=this.pointer.y},{passive:!0}),window.addEventListener("touchmove",e=>t(e.touches[0].clientX,e.touches[0].clientY),{passive:!0}),window.addEventListener("touchend",()=>{this.pointer.down=!1}),window.addEventListener("keydown",e=>{e.key==="ArrowRight"&&this.select((this.index+1)%M.length),e.key==="ArrowLeft"&&this.select((this.index+M.length-1)%M.length)}),window.addEventListener("resize",()=>{var e;(e=this.current)==null||e.resize(innerWidth,innerHeight)}),window.addEventListener("wheel",e=>{var s,i;(i=(s=this.current)==null?void 0:s.wheel)==null||i.call(s,e.deltaY)},{passive:!0}),window.addEventListener("click",e=>{var s,i;e.target.closest("#lab-tabs")||e.target.closest(".frame-nav")||(i=(s=this.current)==null?void 0:s.click)==null||i.call(s,e.clientX,e.clientY)})}select(t){if(t===this.index)return;this.index=t,this.tabs.forEach((s,i)=>s.classList.toggle("active",i===t)),this.current&&(this.current.dispose(),this.current=null),this.host.innerHTML="";const e=M[t];this.hintEl.textContent=e.hint,this.current=new e.Cls(this.host,ie)}loop(t){requestAnimationFrame(this.loop.bind(this));const e=Math.min(.05,(t-this.lastTime)/1e3);this.lastTime=t,this.current&&this.current.update(e,t/1e3,this.pointer),this.pointer.px=this.pointer.x,this.pointer.py=this.pointer.y}}function V(){var c;if(!te()){(c=document.getElementById("webgl-fallback"))==null||c.classList.add("visible");return}new ve}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",V):V();
//# sourceMappingURL=lab-Co0rMIVf.js.map
