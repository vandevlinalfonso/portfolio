import{M as B,O as E,B as U,y,S as m,U as S,e as c,z as x,H as b,N as F,p as V,C as f,V as v,k as L,g as I,R as N,J as O,K as z,Q as G,X as Q,Y as W,q as k,Z as H,c as q}from"./three-core-CYWnSrLN.js";const _="aob-state-v1";class j{constructor(){this.decayLevel=.3,this.visitedWounds=new Set,this.idleTime=0,this.lastInteractionTime=Date.now(),this.currentAct=1,this.isTransitioning=!1,this.audioEnabled=!1,this.sessionStartTime=Date.now(),this.totalIdleDecay=0,this.woundStates=new Map,this.load()}incrementDecay(e){this.decayLevel=Math.min(1,this.decayLevel+e),this.totalIdleDecay+=e}markWoundVisited(e,t={}){this.visitedWounds.add(e),this.woundStates.set(e,{visitTime:Date.now(),...t}),this.save()}hasVisitedWound(e){return this.visitedWounds.has(e)}getWoundState(e){return this.woundStates.get(e)||null}getDecayLevel(){return this.decayLevel}updateIdleTime(e){Date.now()-this.lastInteractionTime>5e3?this.idleTime+=e:this.idleTime=0}recordInteraction(){this.lastInteractionTime=Date.now(),this.idleTime=0}getSessionDuration(){return(Date.now()-this.sessionStartTime)/1e3}setCurrentAct(e){this.currentAct=e}setAudioEnabled(e){this.audioEnabled=e}export(){return{decayLevel:this.decayLevel,visitedWounds:Array.from(this.visitedWounds),woundStates:Array.from(this.woundStates.entries()),totalIdleDecay:this.totalIdleDecay,savedAt:Date.now()}}import(e){if(e.decayLevel!==void 0){let t=e.decayLevel;if(e.savedAt){const i=Math.max(0,(Date.now()-e.savedAt)/36e5);this.decayedWhileAway=Math.min(.15,i*5e-4),t+=this.decayedWhileAway}this.decayLevel=Math.min(.85,Math.max(.3,t))}e.visitedWounds&&(this.visitedWounds=new Set(e.visitedWounds)),e.woundStates&&(this.woundStates=new Map(e.woundStates)),e.totalIdleDecay&&(this.totalIdleDecay=e.totalIdleDecay)}save(){try{localStorage.setItem(_,JSON.stringify(this.export()))}catch{}}load(){try{const e=localStorage.getItem(_);e&&this.import(JSON.parse(e))}catch{}}}const K=new j,D={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};class p{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}const X=new E(-1,1,1,-1,0,1);class Y extends U{constructor(){super(),this.setAttribute("position",new y([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new y([0,2,0,0,2,0],2))}}const J=new Y;class C{constructor(e){this._mesh=new B(J,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,X)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}}class R extends p{constructor(e,t){super(),this.textureID=t!==void 0?t:"tDiffuse",e instanceof m?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=S.clone(e.uniforms),this.material=new m({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this.fsQuad=new C(this.material)}render(e,t,i){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=i.texture),this.fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}class A extends p{constructor(e,t){super(),this.scene=e,this.camera=t,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,t,i){const a=e.getContext(),s=e.state;s.buffers.color.setMask(!1),s.buffers.depth.setMask(!1),s.buffers.color.setLocked(!0),s.buffers.depth.setLocked(!0);let r,n;this.inverse?(r=0,n=1):(r=1,n=0),s.buffers.stencil.setTest(!0),s.buffers.stencil.setOp(a.REPLACE,a.REPLACE,a.REPLACE),s.buffers.stencil.setFunc(a.ALWAYS,r,4294967295),s.buffers.stencil.setClear(n),s.buffers.stencil.setLocked(!0),e.setRenderTarget(i),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(t),this.clear&&e.clear(),e.render(this.scene,this.camera),s.buffers.color.setLocked(!1),s.buffers.depth.setLocked(!1),s.buffers.color.setMask(!0),s.buffers.depth.setMask(!0),s.buffers.stencil.setLocked(!1),s.buffers.stencil.setFunc(a.EQUAL,1,4294967295),s.buffers.stencil.setOp(a.KEEP,a.KEEP,a.KEEP),s.buffers.stencil.setLocked(!0)}}class Z extends p{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}}class ${constructor(e,t){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),t===void 0){const i=e.getSize(new c);this._width=i.width,this._height=i.height,t=new x(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:b}),t.texture.name="EffectComposer.rt1"}else this._width=t.width,this._height=t.height;this.renderTarget1=t,this.renderTarget2=t.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new R(D),this.copyPass.material.blending=F,this.clock=new V}swapBuffers(){const e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,t){this.passes.splice(t,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){const t=this.passes.indexOf(e);t!==-1&&this.passes.splice(t,1)}isLastEnabledPass(e){for(let t=e+1;t<this.passes.length;t++)if(this.passes[t].enabled)return!1;return!0}render(e){e===void 0&&(e=this.clock.getDelta());const t=this.renderer.getRenderTarget();let i=!1;for(let a=0,s=this.passes.length;a<s;a++){const r=this.passes[a];if(r.enabled!==!1){if(r.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(a),r.render(this.renderer,this.writeBuffer,this.readBuffer,e,i),r.needsSwap){if(i){const n=this.renderer.getContext(),o=this.renderer.state.buffers.stencil;o.setFunc(n.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),o.setFunc(n.EQUAL,1,4294967295)}this.swapBuffers()}A!==void 0&&(r instanceof A?i=!0:r instanceof Z&&(i=!1))}}this.renderer.setRenderTarget(t)}reset(e){if(e===void 0){const t=this.renderer.getSize(new c);this._pixelRatio=this.renderer.getPixelRatio(),this._width=t.width,this._height=t.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,t){this._width=e,this._height=t;const i=this._width*this._pixelRatio,a=this._height*this._pixelRatio;this.renderTarget1.setSize(i,a),this.renderTarget2.setSize(i,a);for(let s=0;s<this.passes.length;s++)this.passes[s].setSize(i,a)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}}class ee extends p{constructor(e,t,i=null,a=null,s=null){super(),this.scene=e,this.camera=t,this.overrideMaterial=i,this.clearColor=a,this.clearAlpha=s,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this._oldClearColor=new f}render(e,t,i){const a=e.autoClear;e.autoClear=!1;let s,r;this.overrideMaterial!==null&&(r=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor)),this.clearAlpha!==null&&(s=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:i),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(s),this.overrideMaterial!==null&&(this.scene.overrideMaterial=r),e.autoClear=a}}const te={uniforms:{tDiffuse:{value:null},luminosityThreshold:{value:1},smoothWidth:{value:1},defaultColor:{value:new f(0)},defaultOpacity:{value:0}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`};class g extends p{constructor(e,t,i,a){super(),this.strength=t!==void 0?t:1,this.radius=i,this.threshold=a,this.resolution=e!==void 0?new c(e.x,e.y):new c(256,256),this.clearColor=new f(0,0,0),this.renderTargetsHorizontal=[],this.renderTargetsVertical=[],this.nMips=5;let s=Math.round(this.resolution.x/2),r=Math.round(this.resolution.y/2);this.renderTargetBright=new x(s,r,{type:b}),this.renderTargetBright.texture.name="UnrealBloomPass.bright",this.renderTargetBright.texture.generateMipmaps=!1;for(let l=0;l<this.nMips;l++){const M=new x(s,r,{type:b});M.texture.name="UnrealBloomPass.h"+l,M.texture.generateMipmaps=!1,this.renderTargetsHorizontal.push(M);const w=new x(s,r,{type:b});w.texture.name="UnrealBloomPass.v"+l,w.texture.generateMipmaps=!1,this.renderTargetsVertical.push(w),s=Math.round(s/2),r=Math.round(r/2)}const n=te;this.highPassUniforms=S.clone(n.uniforms),this.highPassUniforms.luminosityThreshold.value=a,this.highPassUniforms.smoothWidth.value=.01,this.materialHighPassFilter=new m({uniforms:this.highPassUniforms,vertexShader:n.vertexShader,fragmentShader:n.fragmentShader}),this.separableBlurMaterials=[];const o=[3,5,7,9,11];s=Math.round(this.resolution.x/2),r=Math.round(this.resolution.y/2);for(let l=0;l<this.nMips;l++)this.separableBlurMaterials.push(this.getSeperableBlurMaterial(o[l])),this.separableBlurMaterials[l].uniforms.invSize.value=new c(1/s,1/r),s=Math.round(s/2),r=Math.round(r/2);this.compositeMaterial=this.getCompositeMaterial(this.nMips),this.compositeMaterial.uniforms.blurTexture1.value=this.renderTargetsVertical[0].texture,this.compositeMaterial.uniforms.blurTexture2.value=this.renderTargetsVertical[1].texture,this.compositeMaterial.uniforms.blurTexture3.value=this.renderTargetsVertical[2].texture,this.compositeMaterial.uniforms.blurTexture4.value=this.renderTargetsVertical[3].texture,this.compositeMaterial.uniforms.blurTexture5.value=this.renderTargetsVertical[4].texture,this.compositeMaterial.uniforms.bloomStrength.value=t,this.compositeMaterial.uniforms.bloomRadius.value=.1;const h=[1,.8,.6,.4,.2];this.compositeMaterial.uniforms.bloomFactors.value=h,this.bloomTintColors=[new v(1,1,1),new v(1,1,1),new v(1,1,1),new v(1,1,1),new v(1,1,1)],this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors;const d=D;this.copyUniforms=S.clone(d.uniforms),this.blendMaterial=new m({uniforms:this.copyUniforms,vertexShader:d.vertexShader,fragmentShader:d.fragmentShader,blending:L,depthTest:!1,depthWrite:!1,transparent:!0}),this.enabled=!0,this.needsSwap=!1,this._oldClearColor=new f,this.oldClearAlpha=1,this.basic=new I,this.fsQuad=new C(null)}dispose(){for(let e=0;e<this.renderTargetsHorizontal.length;e++)this.renderTargetsHorizontal[e].dispose();for(let e=0;e<this.renderTargetsVertical.length;e++)this.renderTargetsVertical[e].dispose();this.renderTargetBright.dispose();for(let e=0;e<this.separableBlurMaterials.length;e++)this.separableBlurMaterials[e].dispose();this.compositeMaterial.dispose(),this.blendMaterial.dispose(),this.basic.dispose(),this.fsQuad.dispose()}setSize(e,t){let i=Math.round(e/2),a=Math.round(t/2);this.renderTargetBright.setSize(i,a);for(let s=0;s<this.nMips;s++)this.renderTargetsHorizontal[s].setSize(i,a),this.renderTargetsVertical[s].setSize(i,a),this.separableBlurMaterials[s].uniforms.invSize.value=new c(1/i,1/a),i=Math.round(i/2),a=Math.round(a/2)}render(e,t,i,a,s){e.getClearColor(this._oldClearColor),this.oldClearAlpha=e.getClearAlpha();const r=e.autoClear;e.autoClear=!1,e.setClearColor(this.clearColor,0),s&&e.state.buffers.stencil.setTest(!1),this.renderToScreen&&(this.fsQuad.material=this.basic,this.basic.map=i.texture,e.setRenderTarget(null),e.clear(),this.fsQuad.render(e)),this.highPassUniforms.tDiffuse.value=i.texture,this.highPassUniforms.luminosityThreshold.value=this.threshold,this.fsQuad.material=this.materialHighPassFilter,e.setRenderTarget(this.renderTargetBright),e.clear(),this.fsQuad.render(e);let n=this.renderTargetBright;for(let o=0;o<this.nMips;o++)this.fsQuad.material=this.separableBlurMaterials[o],this.separableBlurMaterials[o].uniforms.colorTexture.value=n.texture,this.separableBlurMaterials[o].uniforms.direction.value=g.BlurDirectionX,e.setRenderTarget(this.renderTargetsHorizontal[o]),e.clear(),this.fsQuad.render(e),this.separableBlurMaterials[o].uniforms.colorTexture.value=this.renderTargetsHorizontal[o].texture,this.separableBlurMaterials[o].uniforms.direction.value=g.BlurDirectionY,e.setRenderTarget(this.renderTargetsVertical[o]),e.clear(),this.fsQuad.render(e),n=this.renderTargetsVertical[o];this.fsQuad.material=this.compositeMaterial,this.compositeMaterial.uniforms.bloomStrength.value=this.strength,this.compositeMaterial.uniforms.bloomRadius.value=this.radius,this.compositeMaterial.uniforms.bloomTintColors.value=this.bloomTintColors,e.setRenderTarget(this.renderTargetsHorizontal[0]),e.clear(),this.fsQuad.render(e),this.fsQuad.material=this.blendMaterial,this.copyUniforms.tDiffuse.value=this.renderTargetsHorizontal[0].texture,s&&e.state.buffers.stencil.setTest(!0),this.renderToScreen?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(i),this.fsQuad.render(e)),e.setClearColor(this._oldClearColor,this.oldClearAlpha),e.autoClear=r}getSeperableBlurMaterial(e){const t=[];for(let i=0;i<e;i++)t.push(.39894*Math.exp(-.5*i*i/(e*e))/e);return new m({defines:{KERNEL_RADIUS:e},uniforms:{colorTexture:{value:null},invSize:{value:new c(.5,.5)},direction:{value:new c(.5,.5)},gaussianCoefficients:{value:t}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`})}getCompositeMaterial(e){return new m({defines:{NUM_MIPS:e},uniforms:{blurTexture1:{value:null},blurTexture2:{value:null},blurTexture3:{value:null},blurTexture4:{value:null},blurTexture5:{value:null},bloomStrength:{value:1},bloomFactors:{value:null},bloomTintColors:{value:null},bloomRadius:{value:0}},vertexShader:`varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,fragmentShader:`varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`})}}g.BlurDirectionX=new c(1,0);g.BlurDirectionY=new c(0,1);const ie={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = OptimizedCineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};class se extends p{constructor(){super();const e=ie;this.uniforms=S.clone(e.uniforms),this.material=new N({name:e.name,uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader}),this.fsQuad=new C(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,t,i){this.uniforms.tDiffuse.value=i.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},O.getTransfer(this._outputColorSpace)===z&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===G?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===Q?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===W?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===k?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===H&&(this.material.defines.AGX_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this.fsQuad.render(e)):(e.setRenderTarget(t),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this.fsQuad.render(e))}dispose(){this.material.dispose(),this.fsQuad.dispose()}}const ae={uniforms:{tDiffuse:{value:null},time:{value:0},grain:{value:.05},aberration:{value:.0012},vignette:{value:.55},tint:{value:new f(1,1,1)},glitch:{value:0},scanline:{value:.035}},vertexShader:`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grain;
    uniform float aberration;
    uniform float vignette;
    uniform vec3 tint;
    uniform float glitch;
    uniform float scanline;

    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      // Glitch burst: horizontal band displacement (act transitions,
      // violent scrolling)
      if (glitch > 0.002) {
        float band = floor(uv.y * 28.0);
        float jitter = hash(vec2(band, floor(time * 24.0)));
        float shift = (jitter - 0.5) * glitch * 0.09 * step(0.6, jitter);
        uv.x += shift;
      }

      vec2 dir = uv - 0.5;
      float dist = length(dir);

      // Chromatic aberration, stronger toward edges, spikes with glitch
      float ca = (aberration + glitch * 0.004) * (0.5 + dist * 2.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;

      col *= tint;

      // Vignette
      col *= 1.0 - smoothstep(0.4, 0.95, dist) * vignette;

      // CRT scanlines, barely-there
      col *= 1.0 - scanline * (0.5 + 0.5 * sin(vUv.y * 1400.0));

      // Animated film grain (heavier during glitches)
      float g = hash(vUv * vec2(1920.0, 1080.0) + fract(time) * 113.0) - 0.5;
      col += g * (grain + glitch * 0.08);

      gl_FragColor = vec4(col, 1.0);
    }
  `},T={0:{bloom:.4,grain:.045,aberration:.0012,vignette:.5,tint:new f(.94,.97,1.05)},1:{bloom:.45,grain:.05,aberration:.0015,vignette:.55,tint:new f(.96,.97,1.02)},2:{bloom:.35,grain:.05,aberration:.0018,vignette:.68,tint:new f(.9,.9,.92)},3:{bloom:.5,grain:.06,aberration:.0022,vignette:.6,tint:new f(1.04,.95,.9)},4:{bloom:.45,grain:.045,aberration:.0012,vignette:.52,tint:new f(.97,.97,1)}};class oe{constructor(e,t){this.renderer=e,this.camera=t,this.composer=new $(e),this.renderPass=new ee(new q,t),this.composer.addPass(this.renderPass),this.bloomPass=new g(new c(window.innerWidth,window.innerHeight),.35,.6,.82),this.composer.addPass(this.bloomPass),this.gradePass=new R(ae),this.composer.addPass(this.gradePass),this.composer.addPass(new se),this.target={...T[0],tint:T[0].tint.clone()},this.glitchLevel=0,this.velocityBoost=0,this.setSection(0)}triggerGlitch(e=1){this.glitchLevel=Math.max(this.glitchLevel,Math.min(1,e))}setScrollVelocity(e){this.velocityBoost=Math.min(1,e)}setSection(e){const t=T[e]||T[0];this.target.bloom=t.bloom,this.target.grain=t.grain,this.target.aberration=t.aberration,this.target.vignette=t.vignette,this.target.tint.copy(t.tint)}resize(e,t){this.composer.setSize(e,t)}render(e,t){this.renderPass.scene=t;const i=Math.min(1,e*1.5),a=this.gradePass.uniforms;this.bloomPass.strength+=(this.target.bloom-this.bloomPass.strength)*i,a.grain.value+=(this.target.grain-a.grain.value)*i,a.vignette.value+=(this.target.vignette-a.vignette.value)*i,a.tint.value.lerp(this.target.tint,i),a.time.value+=e;const s=this.target.aberration*(1+this.velocityBoost*4);a.aberration.value+=(s-a.aberration.value)*Math.min(1,e*4),this.glitchLevel=Math.max(0,this.glitchLevel-e*2.2),a.glitch.value=this.glitchLevel,this.composer.render(e)}dispose(){this.composer.dispose()}}const P={0:55,1:49,2:41.2,3:36.7,4:55};class ne{constructor(){this.ctx=null,this.master=null,this.muted=!0,this.drone=null,this.currentSection=0}async enable(){if(!this.ctx){const e=window.AudioContext||window.webkitAudioContext;if(!e)return;this.ctx=new e,this.master=this.ctx.createGain(),this.master.gain.value=0,this.master.connect(this.ctx.destination)}this.ctx.state==="suspended"&&await this.ctx.resume()}async setMuted(e){if(this.muted=e,K.setAudioEnabled(!e),e){if(this.ctx&&this.master){const i=this.ctx.currentTime;this.master.gain.cancelScheduledValues(i),this.master.gain.setValueAtTime(this.master.gain.value,i),this.master.gain.linearRampToValueAtTime(0,i+.4)}return}if(await this.enable(),!this.ctx)return;this.drone||this.startDrone();const t=this.ctx.currentTime;this.master.gain.cancelScheduledValues(t),this.master.gain.setValueAtTime(this.master.gain.value,t),this.master.gain.linearRampToValueAtTime(.6,t+.8)}startDrone(){const e=this.ctx,t=P[this.currentSection]||55,i=e.createOscillator();i.type="sawtooth",i.frequency.value=t,i.detune.value=4;const a=e.createOscillator();a.type="sine",a.frequency.value=t/2;const s=e.createBiquadFilter();s.type="lowpass",s.frequency.value=220,s.Q.value=.8;const r=e.createGain();r.gain.value=.12;const n=e.createOscillator();n.type="sine",n.frequency.value=.07;const o=e.createGain();o.gain.value=60,n.connect(o),o.connect(s.frequency),i.connect(s),a.connect(s),s.connect(r),r.connect(this.master),i.start(),a.start(),n.start(),this.drone={oscA:i,oscB:a,filter:s,gain:r,lfo:n}}setSection(e){if(this.currentSection=e,!this.drone||!this.ctx)return;const t=P[e]||55,i=this.ctx.currentTime;this.drone.oscA.frequency.exponentialRampToValueAtTime(t,i+2.5),this.drone.oscB.frequency.exponentialRampToValueAtTime(t/2,i+2.5)}get ready(){return!!this.ctx&&!this.muted}setScrollVelocity(e){if(!this.drone||!this.ctx||this.muted)return;const t=performance.now();if(this._lastVelocityUpdate&&t-this._lastVelocityUpdate<120)return;this._lastVelocityUpdate=t;const i=220+Math.min(1,e)*700;this.drone.filter.frequency.setTargetAtTime(i,this.ctx.currentTime,.25)}glitchBurst(){if(!this.ready)return;const e=this.ctx,t=e.currentTime,i=Math.floor(e.sampleRate*.12),a=e.createBuffer(1,i,e.sampleRate),s=a.getChannelData(0);for(let h=0;h<i;h++)s[h]=(Math.random()*2-1)*(1-h/i)*(Math.random()>.7?1:.2);const r=e.createBufferSource();r.buffer=a;const n=e.createBiquadFilter();n.type="highpass",n.frequency.value=1800;const o=e.createGain();o.gain.setValueAtTime(.07,t),o.gain.exponentialRampToValueAtTime(1e-4,t+.12),r.connect(n),n.connect(o),o.connect(this.master),r.start(t)}hoverTick(){if(!this.ready)return;const e=this.ctx,t=e.currentTime,i=e.createOscillator();i.type="sine",i.frequency.value=1400;const a=e.createGain();a.gain.setValueAtTime(.05,t),a.gain.exponentialRampToValueAtTime(1e-4,t+.06),i.connect(a),a.connect(this.master),i.start(t),i.stop(t+.08)}click(){if(!this.ready)return;const e=this.ctx,t=e.currentTime,i=e.createOscillator();i.type="sine",i.frequency.setValueAtTime(160,t),i.frequency.exponentialRampToValueAtTime(50,t+.22);const a=e.createGain();a.gain.setValueAtTime(.35,t),a.gain.exponentialRampToValueAtTime(1e-4,t+.25),i.connect(a),a.connect(this.master),i.start(t),i.stop(t+.3);const s=Math.floor(e.sampleRate*.15),r=e.createBuffer(1,s,e.sampleRate),n=r.getChannelData(0);for(let l=0;l<s;l++)n[l]=(Math.random()*2-1)*(1-l/s);const o=e.createBufferSource();o.buffer=r;const h=e.createBiquadFilter();h.type="bandpass",h.frequency.value=700,h.Q.value=1.2;const d=e.createGain();d.gain.setValueAtTime(.12,t),d.gain.exponentialRampToValueAtTime(1e-4,t+.15),o.connect(h),h.connect(d),d.connect(this.master),o.start(t)}isEnabled(){return this.ready}}export{K as A,oe as P,ne as a};
//# sourceMappingURL=AudioManager-CLPgCg6w.js.map
