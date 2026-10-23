import"./modulepreload-polyfill-B5Qt9EMX.js";import{T as h,C as S}from"./Cursor-12wpnqhY.js";import{g as y}from"./gsap-core-C8pce-KX.js";import{S as f,T as A}from"./TextScramble-DloupxSv.js";import{q as E,i as P}from"./Quality-TTk3dsl2.js";import{W as U,h as H,O as _,V as D,d as x,M as j,P as O,S as z,x as F,y as N,u as V}from"./three-core-B-BFjvfq.js";class W{constructor(e,i){this.canvas=document.createElement("canvas"),this.canvas.id="cv-field",this.ctx=this.canvas.getContext("2d"),e.appendChild(this.canvas),this.quality=i,this.dpr=Math.min(window.devicePixelRatio||1,i.isMobile?1.5:2),this.gap=i.isMobile?46:38,this.smooth={x:window.innerWidth/2,y:window.innerHeight/2},this.resize()}update(e,i,t){const o=this.ctx,m=window.innerWidth,l=window.innerHeight;this.smooth.x+=(t.x-this.smooth.x)*.06,this.smooth.y+=(t.y-this.smooth.y)*.06,o.setTransform(this.dpr,0,0,this.dpr,0,0),o.clearRect(0,0,m,l);const u=Math.min(m,l)*.5,n=this.smooth.x,c=this.smooth.y,s=i*.05%1*(l+200)-100;for(let v=0;v<l+this.gap;v+=this.gap)for(let p=0;p<m+this.gap;p+=this.gap){const C=p-n,I=v-c,B=Math.hypot(C,I),k=Math.max(0,1-B/u),L=Math.sin(i*.6+p*.02+v*.015)*.5+.5,w=Math.max(0,1-Math.abs(v-s)/60);let $=.05+L*.05+k*.28+w*.18,M=.9+k*1.1+w*.6;k>.62||w>.5?o.fillStyle=h.accentRgba(($*.9).toFixed(3)):o.fillStyle=`rgba(232, 230, 225, ${$.toFixed(3)})`,o.beginPath(),o.arc(p,v,M,0,Math.PI*2),o.fill()}const d=o.createRadialGradient(n,c,0,n,c,u*.6);d.addColorStop(0,h.accentRgba(.05)),d.addColorStop(1,h.accentRgba(0)),o.fillStyle=d,o.fillRect(0,0,m,l)}resize(){const e=window.innerWidth,i=window.innerHeight;this.canvas.width=e*this.dpr,this.canvas.height=i*this.dpr,this.canvas.style.width=e+"px",this.canvas.style.height=i+"px"}dispose(){this.canvas.remove()}}const G=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`,K=`
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uReveal;     // 0..1 decrypt progress
  uniform float uHover;      // 0..1 pointer inside
  uniform float uReady;      // 1 once texture loaded
  uniform vec2  uMouse;      // -1..1 within panel
  uniform vec2  uRes;        // panel px
  uniform float uPanelA;     // panel aspect w/h
  uniform float uImgA;       // image aspect w/h
  uniform vec3  uAccent;     // active lens accent

  const vec3 VOID   = vec3(0.039, 0.039, 0.043);
  const vec3 BONE   = vec3(0.910, 0.902, 0.882);
  #define ACCENT uAccent

  float hash21(vec2 p){ p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23); return fract(p.x * p.y); }
  float noise2(vec2 p){
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1,0)), c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  vec3 filmic(vec3 c){ return (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14); }

  // object-fit: cover mapping
  vec2 coverUv(vec2 uv){
    vec2 c = uv - 0.5;
    if (uPanelA > uImgA) c.y *= uImgA / uPanelA;
    else                 c.x *= uPanelA / uImgA;
    return c + 0.5;
  }

  // 1.0 where the red studio background is, 0.0 on the subject.
  // Threshold sits well above skin redness so cheeks are never keyed.
  float bgKey(vec2 uv){
    vec3 s = texture2D(uTex, uv).rgb;
    float redness = s.r - max(s.g, s.b);
    return smoothstep(0.34, 0.56, redness);
  }

  void main(){
    // subtle parallax + breathing zoom
    vec2 par = uMouse * 0.012 * (0.4 + 0.6 * uHover);
    float zoom = 1.0 - 0.02 * uHover;
    vec2 uv = coverUv((vUv - 0.5) * zoom + 0.5 + par);

    vec3 tex = texture2D(uTex, uv).rgb;
    float mask = bgKey(uv);                 // 1 = background

    // ---- duotone grade of the subject ----
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    lum = pow(clamp(lum, 0.0, 1.0), 0.92);
    vec3 subject = mix(VOID * 1.1, BONE, smoothstep(0.04, 0.96, lum));
    subject += ACCENT * smoothstep(0.32, 0.68, lum) * 0.03;   // faint accent midtones
    // cold key from upper-left
    float key = clamp(dot(normalize(vec2(-0.6, 0.8)), (vUv - 0.5)) + 0.5, 0.0, 1.0);
    subject *= mix(vec3(0.86, 0.9, 1.02), vec3(1.04, 1.0, 0.95), key);

    // ---- silhouette rim light (faux relight) ----
    // Only fires where a real background pixel sits next to the subject, so
    // near-threshold skin regions (cheeks) never glow.
    vec2 e = 1.8 / uRes;
    float kL = bgKey(uv + vec2(e.x, 0.0));
    float kR = bgKey(uv - vec2(e.x, 0.0));
    float kU = bgKey(uv + vec2(0.0, e.y));
    float kD = bgKey(uv - vec2(0.0, e.y));
    float edge = abs(mask - kL) + abs(mask - kR) + abs(mask - kU) + abs(mask - kD);
    float nbBg = max(max(kL, kR), max(kU, kD));           // is a neighbour truly background?
    edge = clamp(edge * 1.4, 0.0, 1.0) * smoothstep(0.35, 0.8, nbBg) * (1.0 - mask);
    float rim = pow(edge, 1.25);

    // ---- background field (void + spotlight behind head) ----
    vec2 p = vUv - vec2(0.5, 0.62);
    p.x *= uPanelA;
    float halo = smoothstep(0.62, 0.0, length(p));
    vec3 bg = mix(VOID * 0.65, ACCENT * 0.14, halo * 0.6);
    bg += (noise2(vUv * uRes * 0.18 + uTime * 0.05) - 0.5) * 0.015;

    vec3 col = mix(subject, bg, mask);
    col += ACCENT * rim * (0.55 + 0.45 * uHover);   // accent rim on the silhouette

    // ---- slow drifting scan highlight ----
    float scanY = fract(uTime * 0.05);
    float scan = smoothstep(0.010, 0.0, abs((1.0 - vUv.y) - scanY));
    col += ACCENT * scan * 0.05;

    // ---- develop / signal-lock reveal (top -> bottom) ----
    // The portrait resolves out of a dim, finely-grained, interlaced "latent"
    // of itself — a photograph developing / a feed locking on — not blocky static.
    float py = 1.0 - vUv.y;
    float line = uReveal * 1.16;
    float lock = 1.0 - smoothstep(line - 0.11, line + 0.02, py);   // 1 = resolved

    float fine = hash21(vUv * uRes * 0.85 + floor(uTime * 46.0) * 2.71);
    float interlace = 0.62 + 0.38 * step(0.5, fract(vUv.y * uRes.y * 0.5));
    vec3 latent = col * 0.5;
    latent = mix(latent, ACCENT * 0.40, 0.12);       // faint accent cast
    latent *= interlace;                              // thin, even interlace lines
    latent += (fine - 0.5) * 0.11;                    // fine grain, not blocks

    float lockEdge = smoothstep(0.055, 0.0, abs(py - line)) * step(uReveal, 0.999);
    col = mix(latent, col, lock);
    col += (ACCENT * 0.5 + BONE * 0.18) * lockEdge;   // soft bright lock edge
    col = mix(VOID, col, uReady);

    // ---- finish ----
    float d = length(vUv - 0.5);
    col *= smoothstep(1.28, 0.32, d);                                  // vignette
    col *= 0.965 + 0.035 * sin(vUv.y * uRes.y * 1.5);                  // fine scanlines
    col += (hash21(vUv * uRes + fract(uTime)) - 0.5) * 0.022;         // subtle grain
    col = filmic(col * 1.06);

    gl_FragColor = vec4(col, 1.0);
  }
`;class Y{constructor(e,i,t){this.canvas=e,this.quality=i,this.dpr=Math.min(window.devicePixelRatio||1,i.isMobile?1.5:2),this.renderer=new U({canvas:e,antialias:!1,alpha:!1,preserveDrawingBuffer:!0}),this.renderer.setPixelRatio(this.dpr),this.scene=new H,this.camera=new _(-1,1,1,-1,0,1),this.uniforms={uTex:{value:null},uTime:{value:0},uReveal:{value:0},uHover:{value:0},uReady:{value:0},uMouse:{value:new x(0,0)},uRes:{value:new x(1,1)},uPanelA:{value:1},uImgA:{value:.75},uAccent:{value:new D(...h.accentVec3())}},this.offTheme=h.onChange(()=>this.uniforms.uAccent.value.set(...h.accentVec3())),this.mesh=new j(new O(2,2),new z({vertexShader:G,fragmentShader:K,uniforms:this.uniforms})),this.scene.add(this.mesh),this._targetReveal=0,this._targetHover=0,this._mouse=new x(0,0),this._rect=e.getBoundingClientRect(),this.resize(),new F().load(t,o=>{o.colorSpace=N,o.minFilter=V,this.uniforms.uTex.value=o,this.uniforms.uImgA.value=o.image.width/o.image.height,this.uniforms.uReady.value=1,this._loaded=!0,this._pendingReveal&&this.reveal()})}reveal(){if(!this._loaded){this._pendingReveal=!0;return}this._revealing=!0,this._revealStart=-1}setPointer(e,i){const t=this._rect,o=e>=t.left&&e<=t.right&&i>=t.top&&i<=t.bottom;this._targetHover=o?1:0,this._mouse.set((e-t.left)/t.width*2-1,-((i-t.top)/t.height*2-1))}update(e,i){this.uniforms.uTime.value=i,this._revealing&&(this._revealStart<0&&(this._revealStart=i),this.uniforms.uReveal.value=Math.min(1,(i-this._revealStart)/1.7)),this.uniforms.uHover.value+=(this._targetHover-this.uniforms.uHover.value)*Math.min(1,e*6),this.uniforms.uMouse.value.lerp(this._mouse,Math.min(1,e*4)),this.renderer.render(this.scene,this.camera)}captureDataURL(){return this.renderer.render(this.scene,this.camera),this.renderer.domElement.toDataURL("image/jpeg",.92)}resize(){this._rect=this.canvas.getBoundingClientRect();const e=this.canvas.clientWidth||1,i=this.canvas.clientHeight||1;this.renderer.setSize(e,i,!1),this.uniforms.uRes.value.set(e*this.dpr,i*this.dpr),this.uniforms.uPanelA.value=e/i}dispose(){var e;this.offTheme(),this.mesh.geometry.dispose(),this.mesh.material.dispose(),(e=this.uniforms.uTex.value)==null||e.dispose(),this.renderer.dispose()}}y.registerPlugin(f);const b="../",r=a=>String(a).replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[e]);function q(a){const e=a.identity;document.getElementById("id-name").textContent=e.name,document.getElementById("frame-name").textContent=e.name,document.getElementById("id-role").textContent=e.role,document.getElementById("id-disc").textContent=e.discipline,document.getElementById("print-portrait").src=`${b}${e.portrait}`,document.getElementById("print-portrait-light").src=`${b}${e.portrait}`,document.getElementById("id-meta").innerHTML=[`Based · ${r(e.location)}`,`Clearance · ${r(e.clearance)}`].map(t=>`<span>${t}</span>`).join("");const i=new Date().getFullYear()-e.since;document.getElementById("id-stats").innerHTML=`
    <div><div class="n">${String(i).padStart(2,"0")}</div><div class="k">Years Active</div></div>
    <div><div class="n">${String(a.certifications.length).padStart(2,"0")}</div><div class="k">Certifications</div></div>`,document.getElementById("id-clearance").innerHTML=a.certifications.map(t=>`<span>${r(t.code)}</span>`).join(""),document.getElementById("id-contact").innerHTML=`
    <a href="mailto:${r(a.contact.email)}"><span class="ck">Email</span>${r(a.contact.email)}</a>
    <a href="${r(a.contact.linkedin)}" target="_blank" rel="noopener"><span class="ck">LinkedIn</span>${r(a.contact.linkedinLabel)}</a>`,document.getElementById("t-clear").textContent=e.clearance.split(" ")[0],document.getElementById("t-years").textContent=`${i}Y`}function g(a,e,i){return`
    <section class="rec-block" data-reveal>
      <div class="sec-label">${a} / ${e}</div>
      ${i}
    </section>`}function X(a){const e=document.getElementById("cv-record"),i=[];i.push(g("01","Profile",`<p class="lede">${r(a.profile)}</p>`)),i.push(g("02","Service Record",`
    <div class="roles">
      ${a.experience.map(s=>`
        <div class="role" data-cursor>
          <div class="period">${r(s.period)}</div>
          <div class="org">${r(s.org)}</div>
          <div class="title">${r(s.title)}</div>
          <ul>${s.points.map(d=>`<li>${r(d)}</li>`).join("")}</ul>
        </div>`).join("")}
    </div>`)),i.push(g("03","Clearances",`
    <div class="certs">
      ${a.certifications.map(s=>{const d=s.url?`<a class="cref" href="${r(s.url)}" target="_blank" rel="noopener">${r(s.ref)} ↗</a>`:`<span class="cref">${r(s.ref)}</span>`;return`
          <div class="cert" data-cursor>
            <div class="code">${r(s.code)}</div>
            <div><div class="cname">${r(s.name)}</div><div class="cissuer">${r(s.issuer)}</div></div>
            ${d}
          </div>`}).join("")}
    </div>`)),i.push(g("04","Capabilities",`
    <div class="skill-grid">
      ${a.skills.map(s=>`
        <div class="skill-grp">
          <div class="gk">${r(s.group)}</div>
          <div class="chips">${s.items.map(d=>`<span>${r(d)}</span>`).join("")}</div>
        </div>`).join("")}
    </div>`));const t=s=>`<div>${s.join("")}</div>`,o=a.education.map(s=>`<div class="mini-row"><div><div class="mt">${r(s.org)}</div><div class="ms">${r(s.title)}</div></div><div class="mr">${r(s.period)}</div></div>`),m=a.languages.map(s=>`<div class="mini-row"><div class="mt">${r(s.name)}</div><div class="mr">${r(s.level)}</div></div>`),l=(a.highlights||[]).map(s=>`<div class="mini-row"><div><div class="mt">${r(s.label)}</div><div class="ms">${r(s.text)}</div></div></div>`);i.push(g("05","Record",`
    <div class="two-up">
      <div class="skill-grp"><div class="gk">Education</div>${t(o)}</div>
      <div class="skill-grp"><div class="gk">Languages</div>${t(m)}</div>
      ${l.length?`<div class="skill-grp"><div class="gk">Recognition</div>${t(l)}</div>`:""}
    </div>`)),e.innerHTML=i.join("");const u=new Date,n=`${u.getFullYear()}.${String(u.getMonth()+1).padStart(2,"0")}.${String(u.getDate()).padStart(2,"0")}`,c=document.createElement("div");c.className="doc-footer",c.innerHTML=`<span>End of file · Personnel 0002</span><span>Compiled ${n}</span>`,e.appendChild(c)}function R(a,e){const i=document.getElementById("boot-log"),t=document.getElementById("boot-progress-fill");let o=0;const m=()=>{if(o<a.length){const l=document.createElement("div");l.innerHTML=a[o].replace("ok",'<span class="ok">ok</span>'),i.appendChild(l),t.style.width=`${Math.round((o+1)/a.length*100)}%`,o++,setTimeout(m,190+Math.random()*120)}else setTimeout(e,340)};m()}function J(){E.reducedMotion||y.utils.toArray("[data-reveal]").forEach(a=>{y.from(a,{y:34,opacity:0,duration:1.05,ease:"power3.out",scrollTrigger:{trigger:a,start:"top 88%",once:!0}})})}async function T(){var u;const a=await fetch(`${b}data/cv.json`).then(n=>n.json()).catch(()=>null);if(!a){R(['&gt; mount /personnel/0002 … <span class="err">fail</span>',"&gt; record unavailable · aborting"],()=>{document.getElementById("loading-screen").classList.add("hidden");const n=document.getElementById("webgl-fallback");n.querySelector(".inner").innerHTML='<h1>Record Unavailable</h1><p>The personnel file could not be retrieved. <a href="../">Return home</a>.</p>',n.classList.add("visible")});return}q(a),X(a),new S;const e=new W(document.getElementById("field-host"),E),i={x:innerWidth/2,y:innerHeight/2};let t=null;const o=document.getElementById("portrait-canvas");if(P())t=new Y(o,E,`${b}${a.identity.portrait}`);else{o.style.display="none";const n=document.getElementById("print-portrait");n.style.display="block",n.style.width=n.style.height="100%",n.style.objectFit="cover",n.style.filter="grayscale(0.2) contrast(1.05)"}window.addEventListener("mousemove",n=>{i.x=n.clientX,i.y=n.clientY,t==null||t.setPointer(n.clientX,n.clientY)},{passive:!0}),window.addEventListener("resize",()=>{e.resize(),t==null||t.resize(),f.refresh()});let m=performance.now();(function n(c){requestAnimationFrame(n);const s=Math.min(.05,(c-m)/1e3);m=c;const d=c/1e3;e.update(s,d,i),t==null||t.update(s,d)})(m);const l=n=>{if(t)try{document.getElementById("print-portrait").src=t.captureDataURL()}catch{}const c=n==="light"?"pdf-light":"pdf-dark";document.documentElement.classList.add(c);const s=()=>{document.documentElement.classList.remove("pdf-light","pdf-dark"),window.removeEventListener("afterprint",s)};window.addEventListener("afterprint",s),window.print(),setTimeout(s,1200)};document.getElementById("dl-dark").addEventListener("click",()=>l("dark")),document.getElementById("dl-light").addEventListener("click",()=>l("light")),(u=document.getElementById("fallback-download"))==null||u.addEventListener("click",n=>{n.preventDefault(),l("light")}),window.addEventListener("beforeprint",()=>{if(y.set("[data-reveal]",{clearProps:"all"}),f.getAll().forEach(n=>n.kill(!1)),t)try{document.getElementById("print-portrait").src=t.captureDataURL()}catch{}}),R(["&gt; mount /personnel/0002 … ok","&gt; decrypt identity.key … ok","&gt; verify clearances OSCP+ · eWPTX · eMAPT … ok","&gt; compositing portrait … ok","&gt; record ready"],()=>{document.getElementById("loading-screen").classList.add("hidden");const n=document.getElementById("cv-doc");n.hidden=!1,f.refresh(),J(),t==null||t.reveal(),t&&setTimeout(()=>{try{document.getElementById("print-portrait").src=t.captureDataURL()}catch{}},2200);const c=document.getElementById("id-name");new A(c).setText(a.identity.name)})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",T):T();
