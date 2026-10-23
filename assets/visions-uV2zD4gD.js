import"./modulepreload-polyfill-B5Qt9EMX.js";import{C}from"./Cursor-12wpnqhY.js";import{t as E,u as I,v as p,P as z,S as x,d as f,M as L,B as M,a as g,g as R,A as P,f as A,C as u,l as B,q as D,W as k,r as F,h as U,w as q,s as G,x as H,y as O}from"./three-core-B-BFjvfq.js";import{P as W}from"./PostProcessing-CupuAfwY.js";import{a as _}from"./AudioManager-BKaduczM.js";import{i as $,q as d}from"./Quality-TTk3dsl2.js";class N{constructor(e,t=45){this.texture=e,e&&(e.minFilter=E,e.magFilter=I,e.generateMipmaps=!0);const s=e&&e.image,i=s&&s.width?s.width/s.height:16/9;let n,o;i>=1?(o=5,n=o*i):(n=4.7,o=n/i),this.aspect=i,this.baseDist=o/2/Math.tan(p.degToRad(t/2))/.96;const a=new z(n,o,200,200);this.material=new x({transparent:!0,depthWrite:!1,uniforms:{map:{value:e},time:{value:0},depthScale:{value:.2},parallax:{value:new f},opacity:{value:0},enter:{value:0},grain:{value:0}},vertexShader:`
        uniform sampler2D map;
        uniform float depthScale;
        uniform vec2 parallax;
        varying vec2 vUv;
        varying float vDepth;

        float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

        void main() {
          vUv = uv;
          vec2 c = uv - 0.5;

          // Radial bias: the centre lifts toward the viewer (the "tunnel
          // into the picture"); content luminance adds true relief.
          float radial = 1.0 - smoothstep(0.0, 0.78, length(c));
          float l = luma(texture2D(map, uv).rgb);
          float depth = radial * 0.5 + l * 0.55;
          vDepth = depth;

          vec3 pos = position;
          pos.z += depth * depthScale;
          // Nearer (deeper) regions shift more under parallax
          pos.xy += parallax * (depth - 0.25);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,fragmentShader:`
        uniform sampler2D map;
        uniform float opacity;
        uniform float enter;
        uniform float time;
        uniform float grain;
        uniform vec2 parallax;
        varying vec2 vUv;
        varying float vDepth;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          // Micro layered parallax in the texture lookup for extra depth
          vec2 uv = vUv + parallax * 0.02 * (vDepth - 0.4);
          vec3 col = texture2D(map, uv).rgb;

          // Gentle filmic lift; deepen as the visitor enters
          col = pow(col, vec3(0.94));
          col *= 1.0 + enter * 0.05;

          // Cinematic vignette focusing the centre
          float vig = smoothstep(0.92, 0.28, length(vUv - 0.5));
          col *= mix(0.62, 1.0, vig);

          // Feather the rectangular border into nothing
          float edge = smoothstep(0.0, 0.07, vUv.x) * smoothstep(1.0, 0.93, vUv.x)
                     * smoothstep(0.0, 0.07, vUv.y) * smoothstep(1.0, 0.93, vUv.y);

          // Subtle moving grain
          float g = (hash(floor((vUv + time * 0.4) * 900.0)) - 0.5) * grain;
          col += g;

          gl_FragColor = vec4(col, opacity * edge);
        }
      `}),this.mesh=new L(a,this.material),this.mesh.frustumCulled=!1}update(e,t,s,i){const n=p.smoothstep(e,-.95,-.4),o=1-p.smoothstep(e,.38,.78),a=n*o;if(this.mesh.visible=a>.002,!this.mesh.visible){this.material.uniforms.opacity.value=0;return}const r=this.material.uniforms;r.opacity.value=a;const c=this.baseDist*(1-e*.8);this.mesh.position.z=-c;const l=p.smoothstep(e,-.6,.95);if(r.enter.value=l,r.depthScale.value=.16+l*.6,r.time.value=s,r.grain.value=.05,i){r.parallax.value.set(0,0),this.mesh.rotation.set(0,0,0),this.mesh.scale.setScalar(1);return}r.parallax.value.lerp(this._p||(this._p=new f),0),r.parallax.value.set(t.x*.14,t.y*.11),this.mesh.rotation.y+=(t.x*.07-this.mesh.rotation.y)*.06,this.mesh.rotation.x+=(-t.y*.05-this.mesh.rotation.x)*.06,this.mesh.scale.setScalar(1+Math.sin(s*.35)*.008)}dispose(){this.mesh.geometry.dispose(),this.material.dispose()}}function S(h=0){const t=document.createElement("canvas");t.width=64,t.height=64;const s=t.getContext("2d"),i=s.createRadialGradient(64/2,64/2,64*h,64/2,64/2,64/2);return i.addColorStop(0,"rgba(255,255,255,1)"),i.addColorStop(.5,"rgba(255,255,255,0.5)"),i.addColorStop(1,"rgba(255,255,255,0)"),s.fillStyle=i,s.fillRect(0,0,64,64),new B(t)}function j(h,e=16777215){const t=new Float32Array(h*3),s=new Float32Array(h);for(let a=0;a<h;a++)t[a*3]=(Math.random()-.5)*16,t[a*3+1]=(Math.random()-.5)*11,t[a*3+2]=1-Math.random()*13,s[a]=.04+Math.random()*.12;const i=new M;i.setAttribute("position",new g(t,3));const n=new R({map:S(),color:e,size:.06,sizeAttenuation:!0,transparent:!0,opacity:.5,blending:P,depthWrite:!1}),o=new A(i,n);return o.frustumCulled=!1,o.userData.speeds=s,o}function V(h,e=12570879){const t=new Float32Array(h*3),s=new Float32Array(h);for(let a=0;a<h;a++)t[a*3]=(Math.random()-.5)*12,t[a*3+1]=(Math.random()-.5)*8,t[a*3+2]=.5-Math.random()*9,s[a]=Math.random()*Math.PI*2;const i=new M;i.setAttribute("position",new g(t,3)),i.setAttribute("phase",new g(s,1));const n=new x({transparent:!0,depthWrite:!1,blending:P,uniforms:{time:{value:0},color:{value:new u(e)},tex:{value:S(.1)}},vertexShader:`
      attribute float phase;
      uniform float time;
      varying float vA;
      void main() {
        vA = 0.25 + 0.25 * sin(time * 0.6 + phase);
        vec3 p = position;
        p.x += sin(time * 0.2 + phase) * 0.3;
        p.y += cos(time * 0.15 + phase) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (60.0 + 40.0 * sin(phase)) * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,fragmentShader:`
      uniform sampler2D tex;
      uniform vec3 color;
      varying float vA;
      void main() {
        float a = texture2D(tex, gl_PointCoord).a;
        gl_FragColor = vec4(color, a * vA);
      }
    `}),o=new A(i,n);return o.frustumCulled=!1,o}const b=45,v=['CALIBRATING GALLERY OPTICS ........ <span class="ok">OK</span>','MOUNTING PLATES ................... <span class="ok">OK</span>',"DOORS OPEN"],m=[{file:"1.jpeg",no:"Plate I",title:"Temptation",desc:"The fall caught mid-decision, salvation and ruin breathing on either side of a single red choice.",meta:["Photomanipulation","Composite"],tint:16734788},{file:"2-1.jpeg",no:"Plate II",title:"Descent",desc:"An angel suspended over a sea of cloud, wings caught at the top of the beat, feathers let go.",meta:["Photomanipulation","Motion study"],tint:9085183},{file:"3.jpeg",no:"Plate III",title:"The Cast",desc:"A die the size of a verdict meets the earth, chance made colossal, the figure already weightless.",meta:["Photomanipulation","Light study"],tint:10120447}];class y{constructor(){this.panels=[],this.clock=new D,this.mouse=new f,this.targetMouse=new f,this.activeIndex=-1,this.isRunning=!1,this.init()}async init(){var t,s,i;if(!$()){(t=document.getElementById("loading-screen"))==null||t.classList.add("hidden"),(s=document.getElementById("webgl-fallback"))==null||s.classList.add("visible");return}const e=this.runBoot();this.setupRenderer(),this.cursor=new C,this.audio=new _,await this.loadTextures(),this.buildPanels(),this.buildAtmosphere(),this.buildPlaques(),this.buildProgress(),d.postProcessing&&(this.post=new W(this.renderer,this.camera),this.post.setSection(1)),window.addEventListener("mousemove",n=>{this.targetMouse.x=n.clientX/window.innerWidth*2-1,this.targetMouse.y=-(n.clientY/window.innerHeight)*2+1},{passive:!0}),this._onResize=this.onResize.bind(this),window.addEventListener("resize",this._onResize),await e,(i=document.getElementById("loading-screen"))==null||i.classList.add("hidden"),this.isRunning=!0,this.animate()}runBoot(){const e=document.getElementById("boot-log"),t=document.getElementById("boot-progress-fill"),s=d.reducedMotion?60:170;return new Promise(i=>{v.forEach((n,o)=>{setTimeout(()=>{const a=document.createElement("div");a.innerHTML=n,e.appendChild(a),t.style.width=`${(o+1)/v.length*100}%`,o===v.length-1&&setTimeout(i,300)},s*(o+1))})})}setupRenderer(){const e=document.getElementById("canvas-container");this.renderer=new k({antialias:!0,powerPreference:"high-performance"}),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,d.maxPixelRatio)),this.renderer.toneMapping=F,this.renderer.toneMappingExposure=1.05,e.appendChild(this.renderer.domElement),this.scene=new U,this.scene.background=new u(394760),this.scene.fog=new q(394760,.045),this.camera=new G(b,window.innerWidth/window.innerHeight,.1,100),this.camera.position.set(0,0,0)}loadTextures(){const e=new H;return Promise.all(m.map(t=>new Promise(s=>{e.load(`./${t.file}`,i=>{i.colorSpace=O,i.anisotropy=this.renderer.capabilities.getMaxAnisotropy(),s(i)},void 0,()=>s(null))}))).then(t=>{this.textures=t})}buildPanels(){this.textures.forEach(e=>{const t=new N(e,b);this.panels.push(t),this.scene.add(t.mesh)})}buildAtmosphere(){this.dust=j(d.isMobile?90:220),this.bokeh=V(d.isMobile?10:26),this.scene.add(this.dust,this.bokeh),this.tint=new u(m[0].tint)}buildPlaques(){const e=document.getElementById("plaques");this.plaques=m.map(t=>{const s=document.createElement("div");return s.className="plaque",s.innerHTML=`
        <div class="p-no">${t.no}</div>
        <div class="p-title">${t.title}</div>
        <div class="p-desc">${t.desc}</div>
        <div class="p-meta">${t.meta.map(i=>`<span>${i}</span>`).join("")}</div>
      `,e.appendChild(s),s})}buildProgress(){const e=document.getElementById("v-progress");this.progressRows=m.map((t,s)=>{const i=document.createElement("div");return i.className="vp",i.innerHTML=`<span>${t.title}</span><span class="bar"><i></i></span><span>0${s+1}</span>`,e.appendChild(i),i})}computeP(){const e=document.querySelectorAll(".v-exhibit");if(e.length<3)return-.25;const t=e[0].offsetTop,s=e[2].offsetTop+e[2].offsetHeight,i=Math.max(1,s-t);return p.clamp((window.scrollY+window.innerHeight*.5-t)/i,0,1)*3.95-.45}setActive(e){var s,i,n,o;if(e===this.activeIndex)return;const t=this.activeIndex;this.activeIndex=e,this.plaques.forEach((a,r)=>a.classList.toggle("visible",r===e)),this.progressRows.forEach((a,r)=>a.classList.toggle("active",r===e)),e>=0&&((s=this.post)==null||s.setSection(e+1),(i=this.audio)==null||i.setSection(e+1),t>=0&&((n=this.post)==null||n.triggerGlitch(.35),(o=this.audio)==null||o.glitchBurst()),this.targetTint=new u(m[e].tint))}onResize(){var e;this.camera.aspect=window.innerWidth/window.innerHeight,this.camera.updateProjectionMatrix(),this.renderer.setSize(window.innerWidth,window.innerHeight),(e=this.post)==null||e.resize(window.innerWidth,window.innerHeight)}animate(){if(!this.isRunning)return;requestAnimationFrame(this.animate.bind(this));const e=Math.min(.05,this.clock.getDelta()),t=this.clock.elapsedTime;this.mouse.lerp(this.targetMouse,.06);const s=this.computeP(),i=d.reducedMotion;let n=-1,o=1e9;this.panels.forEach((r,c)=>{const l=s-(c+.5);r.update(l,this.mouse,t,i);const T=p.clamp((l+1)/2,0,1),w=this.progressRows[c].querySelector(".bar i");w&&(w.style.transform=`scaleX(${T})`),Math.abs(l)<o&&(o=Math.abs(l),n=c)});const a=s>.05&&s<3.45;if(this.setActive(a?n:-1),i||(this.camera.position.x+=(this.mouse.x*.35-this.camera.position.x)*.04,this.camera.position.y+=(this.mouse.y*.25-this.camera.position.y)*.04,this.camera.lookAt(0,0,-3)),this.dust){const r=this.dust.geometry.attributes.position.array,c=this.dust.userData.speeds;for(let l=0;l<c.length;l++)r[l*3+1]-=c[l]*e,r[l*3]+=Math.sin(t*.3+l)*.002,r[l*3+1]<-5.5&&(r[l*3+1]=5.5);this.dust.geometry.attributes.position.needsUpdate=!0}this.bokeh&&(this.bokeh.material.uniforms.time.value=t),this.targetTint&&(this.tint.lerp(this.targetTint,.02),this.bokeh&&this.bokeh.material.uniforms.color.value.copy(this.tint)),this.post?this.post.render(e,this.scene):this.renderer.render(this.scene,this.camera)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>new y):new y;
