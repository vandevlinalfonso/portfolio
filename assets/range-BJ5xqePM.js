import"./modulepreload-polyfill-B5Qt9EMX.js";import{C as h,T as l}from"./Cursor-12wpnqhY.js";import{q as f}from"./Quality-TTk3dsl2.js";import{c as m,S as g,K as o,d as y}from"./glyph-GmXeSW2Z.js";const k=a=>`${String(Math.floor(a/60)).padStart(2,"0")}:${String(Math.floor(a%60)).padStart(2,"0")}`;function S(a){const t=[0,1].map(()=>{const s=document.createElement("canvas");return s.width=s.height=288,a.appendChild(s),s});let i=o.length-1,r=0;const e=()=>{y(t[r],o[i],l.rgb),t[r].style.opacity="1",t[1-r].style.opacity="0"};return e(),f.reducedMotion||setInterval(()=>{document.hidden||(i=(i+1)%o.length,r=1-r,e())},2600),e}function x(){let a={};try{a=JSON.parse(localStorage.getItem(g)||"{}")}catch{}const t=String(o.length).padStart(2,"0");return a.best?{status:"Cleared",detail:`Best run ${k(a.best)}`}:a.solved>0?{status:"In progress",detail:`Key ${String(a.solved+1).padStart(2,"0")} / ${t}`}:{status:"Open",detail:`${t} keys`}}const p=[{href:"./resonance/",title:"Resonance",kicker:a=>m(a).kicker,brief:"A vault that opens to sound. Tune a singing steel plate and move where you strike it until its sand draws each of seven keys. Nothing is drawn: the figures fall out of real Chladni physics.",meta:["Plate physics","GPU sand","Procedural audio","Headphones on"],cta:"Enter the exercise →",figure:S,record:x}],E=[{kicker:"In preparation",title:"Classified"}];function $(){const a=document.getElementById("exercises"),t=[],i=[];p.forEach((e,s)=>{const n=e.record(),c=document.createElement("a");c.className="ex",c.href=e.href,c.innerHTML=`
      <span class="x-no">${String(s+1).padStart(2,"0")}</span>
      <span class="x-fig" aria-hidden="true"></span>
      <span class="x-main">
        <span class="x-kicker" style="display:block"></span>
        <span class="x-title">${e.title}</span>
        <span class="x-brief" style="display:block">${e.brief}</span>
        <span class="x-meta">${e.meta.map(u=>`<span>${u}</span>`).join("")}</span>
      </span>
      <span class="x-side">
        <span class="x-status">${n.status}</span>
        <span>${n.detail}</span>
        <span class="x-cta">${e.cta}</span>
      </span>
    `,a.appendChild(c),t.push([c.querySelector(".x-kicker"),e.kicker]),i.push(e.figure(c.querySelector(".x-fig")))}),E.forEach((e,s)=>{const n=document.createElement("div");n.className="ex sealed",n.setAttribute("aria-disabled","true"),n.innerHTML=`
      <span class="x-no">${String(p.length+s+1).padStart(2,"0")}</span>
      <span class="x-fig" aria-hidden="true"></span>
      <span class="x-main">
        <span class="x-kicker" style="display:block">${e.kicker}</span>
        <span class="x-title">${e.title}</span>
        <span class="x-bars" aria-hidden="true"><span></span><span></span></span>
      </span>
      <span class="x-side"><span class="x-status dim">Sealed</span></span>
    `,a.appendChild(n)});const r=e=>t.forEach(([s,n])=>{s.textContent=n(e)});r(l.lens),l.onChange(e=>{r(e),i.forEach(s=>s())}),[...a.children].forEach((e,s)=>setTimeout(()=>e.classList.add("in"),150+s*120))}function d(){new h,$()}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",d):d();
