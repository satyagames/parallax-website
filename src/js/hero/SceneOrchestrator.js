import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { CognitiveOrb } from './layers/CognitiveOrb.js';
import { NeuralWeb } from './layers/NeuralWeb.js';
import { GalaxyBackground } from './layers/GalaxyBackground.js';
import { DataStreamsBackground } from './layers/DataStreamsBackground.js';
import { DataLattice } from './layers/DataLattice.js';
import { DigitalTwinWireframe } from './layers/DigitalTwinWireframe.js';
import { HexGridField } from './layers/HexGridField.js';
import { GlyphField } from './layers/GlyphField.js';
import { SignalBeacons } from './layers/SignalBeacons.js';
import { ParticlePortal } from './layers/ParticlePortal.js';
import { CursorAura3D } from './effects/CursorAura3D.js';
import { RippleRing } from './effects/RippleRing.js';
import { QualityManager } from '../perf/QualityManager.js';
import { AdaptiveFrameController } from '../perf/AdaptiveFrameController.js';

export class SceneOrchestrator {
  constructor({ canvas, camera, renderer, isMobile }) {
    this.canvas = canvas;
    this.camera = camera;
    this.renderer = renderer;
    this.isMobile = isMobile;
    this.scene = new THREE.Scene();
    
    // Layer groups
    this.frontGroup = new THREE.Group();
    this.bgGroup = new THREE.Group();
    this.scene.add(this.bgGroup);
    this.scene.add(this.frontGroup);
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);
    
    // Program system
    this.programs = {};
    this.activeProgramKey = null;
    this.layersMounted = false;
    
    // Layer cache (lazy-created)
    this.layers = {
      cognitiveOrb: null,
      neuralWeb: null,
      galaxy: null,
      streams: null,
      dataLattice: null,
      twinWireframe: null,
      hexGrid: null,
      glyphField: null,
      beacons: null,
      portal: null
    };
    
    // Motion parameters (set by active program)
    this.motion = {
      pulseScale: 1,
      orbitScale: 1,
      parallax: { front: 0.6, back: 0.2 }
    };
    
    // Reduced motion preference
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Cursor interaction effects (skip on mobile for performance)
    if (!isMobile) {
      this.cursorAura = new CursorAura3D({ color: '#64ffda' });
      this.frontGroup.add(this.cursorAura.object3d);
      
      // Ripple pool
      this.ripplePool = [...Array(4)].map(() => new RippleRing({ color: '#64ffda' }));
      this.ripplePool.forEach(r => this.frontGroup.add(r.object3d));
      
      // Bind click handler
      this._setupClickHandler();
    }
    
    // Store NDC pointer for raycasting
    this._ndc = { x: 0, y: 0 };
    
    // Setup
    this._setupPostProcessing();
    this._buildPrograms();
    
    // State
    this.activeProfile = null;
    this._colorLerp = null;
    this._bloomLerp = null;
    this._dofLerp = null;
  }

  _setupClickHandler() {
    window.addEventListener('pointerdown', () => {
      // Skip ripples if reduced motion is enabled
      if (this.prefersReducedMotion) return;
      if (!this.cursorAura || !this.ripplePool) return;
      const p = this.cursorAura.object3d.position.clone();
      // Find a free ripple
      const r = this.ripplePool.find(x => !x.alive);
      if (r) r.trigger(p);
    }, { passive: true });
  }

  // Lazy layer getter
  _ensureLayer(name, factoryFn) {
    if (!this.layers[name]) {
      const instance = factoryFn();
      this.layers[name] = instance;
    }
    return this.layers[name];
  }

  // Opacity fade helpers
  _fadeIn(obj, dur = 0.6) {
    if (!obj) return;
    obj.visible = true;
    obj.userData.isFading = dur > 0;
    obj.userData.targetOpacity = 1;
    this._setOpacity(obj, 1, dur);
    
    if (dur > 0) {
      setTimeout(() => { 
        obj.userData.isFading = false;
      }, dur * 1000);
    }
  }

  _fadeOut(obj, dur = 0.6) {
    if (!obj) return;
    obj.userData.isFading = dur > 0;
    obj.userData.targetOpacity = 0;
    this._setOpacity(obj, 0, dur);
    
    if (dur > 0) {
      setTimeout(() => {
        // Only hide if still at target opacity 0 (not faded back in)
        // Add extra buffer time to ensure smooth crossfade
        if (obj.userData.targetOpacity === 0) {
          // Double-check opacity is actually near zero before hiding
          let actuallyZero = true;
          obj.traverse(o => {
            if (o.material) {
              const mats = Array.isArray(o.material) ? o.material : [o.material];
              mats.forEach(m => {
                if (m.opacity > 0.01) actuallyZero = false;
              });
            }
          });
          
          if (actuallyZero) {
            obj.visible = false;
          }
        }
        obj.userData.isFading = false;
      }, dur * 1000 + 100); // Add 100ms buffer for smoother transitions
    } else {
      // Instant hide
      obj.visible = false;
    }
  }

  _setOpacity(obj, target, dur = 0.6) {
    if (!obj) return;
    
    const mats = new Set();
    obj.traverse(o => {
      if (o.material) {
        if (Array.isArray(o.material)) {
          o.material.forEach(m => mats.add(m));
        } else {
          mats.add(o.material);
        }
      }
    });

    // Instant mode
    if (dur === 0) {
      mats.forEach(m => {
        m.transparent = true;
        m.opacity = target;
      });
      return;
    }

    mats.forEach(m => {
      if (m.transparent !== true) m.transparent = true;
      
      // Cancel any existing animation for this material
      if (m.userData && m.userData.opacityAnimId) {
        cancelAnimationFrame(m.userData.opacityAnimId);
      }
      if (!m.userData) m.userData = {};
      
      // Store the base opacity for this material (used by layer animations)
      m.userData.baseOpacity = target;
      
      const start = { v: m.opacity };
      const end = { v: target };
      const t0 = performance.now();
      
      const step = () => {
        const elapsed = (performance.now() - t0) / (dur * 1000);
        const k = Math.min(1, elapsed);
        m.opacity = start.v + (end.v - start.v) * k;
        
        if (k < 1) {
          m.userData.opacityAnimId = requestAnimationFrame(step);
        } else {
          // Ensure final value is set
          m.opacity = target;
          m.userData.baseOpacity = target;
          m.userData.opacityAnimId = null;
        }
      };
      
      m.userData.opacityAnimId = requestAnimationFrame(step);
    });
  }

  // Build all 7 programs
  _buildPrograms() {
    const mk = (name, factory) => {
      if (!this.layers[name]) {
        this.layers[name] = factory();
      }
      return this.layers[name];
    };

    const Prog = (key, frontLayers = [], backLayers = [], opts = {}) => {
      this.programs[key] = {
        key,
        front: frontLayers.map(f => mk(f.name, f.factory)),
        back: backLayers.map(b => mk(b.name, b.factory)),
        opts
      };
    };

    // Layer factories - return wrapper instances
    const F = {
      cognitiveOrb: { name: 'cognitiveOrb', factory: () => new CognitiveOrb({ isMobile: this.isMobile }) },
      neuralWeb: { name: 'neuralWeb', factory: () => new NeuralWeb({ isMobile: this.isMobile }) },
      galaxy: { name: 'galaxy', factory: () => new GalaxyBackground({ isMobile: this.isMobile }) },
      streams: { name: 'streams', factory: () => new DataStreamsBackground({ isMobile: this.isMobile }) },
      dataLattice: { name: 'dataLattice', factory: () => new DataLattice({ isMobile: this.isMobile }) },
      twinWireframe: { name: 'twinWireframe', factory: () => new DigitalTwinWireframe({ isMobile: this.isMobile }) },
      hexGrid: { name: 'hexGrid', factory: () => new HexGridField({ isMobile: this.isMobile }) },
      glyphField: { name: 'glyphField', factory: () => new GlyphField({ isMobile: this.isMobile }) },
      beacons: { name: 'beacons', factory: () => new SignalBeacons({ isMobile: this.isMobile }) },
      portal: { name: 'portal', factory: () => new ParticlePortal({ isMobile: this.isMobile }) }
    };

    // 0 — HERO: Neural + Orb / Galaxy
    Prog('hero',
      [F.cognitiveOrb, F.neuralWeb],
      [F.galaxy],
      { pulseScale: 1.0, orbitScale: 1.0, parallax: { front: 0.6, back: 0.2 } }
    );

    // 1 — ABOUT: Neural + Orb / Streams
    Prog('about',
      [F.cognitiveOrb, F.neuralWeb],
      [F.streams],
      { pulseScale: 0.95, orbitScale: 0.9, parallax: { front: 0.55, back: 0.22 } }
    );

    // 2 — EXPERIENCE: Data Lattice + Neural Filaments / Galaxy
    Prog('experience',
      [F.dataLattice, F.neuralWeb],
      [F.galaxy],
      { pulseScale: 1.05, orbitScale: 1.1, parallax: { front: 0.5, back: 0.18 } }
    );

    // 3 — WORK: Digital Twin Wireframe / Data Streams
    Prog('work',
      [F.twinWireframe],
      [F.streams],
      { pulseScale: 1.1, orbitScale: 1.0, parallax: { front: 0.45, back: 0.18 } }
    );

    // 4 — SKILLS: Modular Skill Nodes + Hex Grid Field
    Prog('skills',
      [F.neuralWeb],
      [F.hexGrid],
      { pulseScale: 0.9, orbitScale: 0.9, parallax: { front: 0.5, back: 0.15 } }
    );

    // 5 — EDUCATION: Blueprint Grid + Glyph Field
    Prog('education',
      [F.glyphField],
      [F.hexGrid],
      { pulseScale: 0.85, orbitScale: 0.8, parallax: { front: 0.45, back: 0.14 } }
    );

    // 6 — CONTACT: Signal Beacons + Particle Portal
    Prog('contact',
      [F.beacons],
      [F.portal],
      { pulseScale: 1.15, orbitScale: 1.1, parallax: { front: 0.6, back: 0.2 } }
    );
  }

  // Mount all layers once (called on first program switch)
  _mountAllLayers() {
    Object.entries(this.layers).forEach(([k, wrapper]) => {
      if (!wrapper) return;
      
      const obj = wrapper.object3d;
      if (!obj) return;
      
      // Decide which group
      if (['galaxy', 'streams', 'hexGrid', 'glyphField', 'portal'].includes(k)) {
        this.bgGroup.add(obj);
      } else {
        this.frontGroup.add(obj);
      }
      
      obj.visible = false;
      this._setOpacity(obj, 0, 0); // Snap to 0
    });
  }

  _setupPostProcessing() {
    // Create composer
    this.composer = new EffectComposer(this.renderer);
    
    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // Bloom pass (reduced for mobile)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.isMobile ? 0.18 : 0.28, // strength (lower on mobile)
      this.isMobile ? 0.5 : 0.7,   // radius (smaller on mobile)
      this.isMobile ? 0.15 : 0.1   // threshold (higher on mobile)
    );
    this.composer.addPass(this.bloomPass);
    
    // Bokeh (DOF) pass (reduced for mobile)
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 7.5,
      aperture: this.isMobile ? 0.00015 : 0.00024,
      maxblur: this.isMobile ? 0.005 : 0.01
    });
    this.composer.addPass(this.bokehPass);
    
    // Store pass references on composer for quality manager
    this.composer.bloomPass = this.bloomPass;
    this.composer.bokehPass = this.bokehPass;
    
    // Initialize quality management system (desktop only)
    if (!this.isMobile) {
      this.qualityManager = new QualityManager({
        renderer: this.renderer,
        composer: this.composer,
        camera: this.camera,
        isMobile: this.isMobile,
        desktopTargetFps: 60
      });
      
      this.frameController = new AdaptiveFrameController({
        desktop: true,
        target: 60
      });
      
      // React to quality changes
      this.qualityManager.onQualityChange = (cfg) => {
        // Adjust neural web density and raycast frequency
        if (this.layers.neuralWeb) {
          if (this.layers.neuralWeb.setDensityMultipliers) {
            this.layers.neuralWeb.setDensityMultipliers(cfg.nodesMul, cfg.linksMul);
          }
          if (this.layers.neuralWeb.setRaycastHz) {
            this.layers.neuralWeb.setRaycastHz(cfg.rayHz);
          }
        }
      };
      
      // React to reduced motion preference changes
      this.qualityManager.onReducedMotionChange = (enabled) => {
        this.prefersReducedMotion = enabled;
        // Disable ripples if reduced motion enabled
        if (enabled && this.ripplePool) {
          this.ripplePool.forEach(r => r.alive = false);
        }
      };
    }
  }

  setPointerNDC(ndcX, ndcY) {
    this._ndc = { x: ndcX, y: ndcY };
    // Pass to layers that use it (NeuralWeb for highlighting)
    if (this.layers.neuralWeb && this.layers.neuralWeb.setPointerNDC) {
      this.layers.neuralWeb.setPointerNDC(this._ndc, this.camera);
    }
  }

  // Switch visual program by section ID
  applyProgramBySectionId(sectionId, instant = false) {
    if (!this.programs[sectionId]) {
      console.warn('Unknown program:', sectionId, 'Available:', Object.keys(this.programs));
      return;
    }
    
    // Mount layers on first call
    if (!this.layersMounted) {
      console.log('Mounting all layers for first time...');
      this._mountAllLayers();
      this.layersMounted = true;
      console.log('Mounted layers:', Object.keys(this.layers).filter(k => this.layers[k]));
    }

    // Skip if already active
    if (this.activeProgramKey === sectionId) {
      console.log('Program already active:', sectionId);
      return;
    }
    
    console.log('Program → ' + sectionId);
    
    const next = this.programs[sectionId];
    this.activeProgramKey = sectionId;

    console.log('Switching to:', sectionId, 'Front:', next.front.length, 'Back:', next.back.length);

    // Build set of layers that should be visible in next program
    const nextLayers = new Set([...next.front, ...next.back]);

    // Start fading in new layers FIRST (crossfade technique)
    // This prevents the "black flash" glitch during transitions
    console.log('Fading in layers for:', sectionId);
    [...next.front, ...next.back].forEach((wrapper, i) => {
      if (!wrapper || !wrapper.object3d) return;
      
      // Only fade in if not already visible
      if (!wrapper.object3d.visible || wrapper.object3d.userData.targetOpacity !== 1) {
        console.log('  Fading in:', wrapper.object3d.constructor.name);
        this._fadeIn(wrapper.object3d, instant ? 0 : 0.5);
      } else {
        console.log('  Already visible:', wrapper.object3d.constructor.name);
      }
    });

    // Then fade out old layers that are NOT in the next program
    // Small delay ensures crossfade overlap
    const fadeOutDelay = instant ? 0 : 50;
    setTimeout(() => {
      Object.values(this.layers).forEach(wrapper => {
        if (!wrapper || !wrapper.object3d) return;
        
        if (!nextLayers.has(wrapper)) {
          this._fadeOut(wrapper.object3d, instant ? 0 : 0.5);
        }
      });
    }, fadeOutDelay);

    // Store motion parameters
    this.motion = next.opts || { pulseScale: 1, orbitScale: 1, parallax: { front: 0.6, back: 0.2 } };
  }

  setBackgroundMode(mode) {
    // Legacy method - kept for compatibility
    this.backgroundMode = mode;
  }

  applyProfile(profile, instant = false) {
    if (!profile) return;
    
    const prev = this.activeProfile || profile;
    this.activeProfile = profile;
    
    const dur = instant ? 0 : 0.6;
    
    // Color transitions
    this._colorLerp = {
      t: 0,
      dur,
      fromPrimary: new THREE.Color(prev.primary),
      toPrimary: new THREE.Color(profile.primary),
      fromSecondary: new THREE.Color(prev.secondary),
      toSecondary: new THREE.Color(profile.secondary),
      profile
    };
    
    // Bloom transition
    this._bloomLerp = {
      t: 0,
      dur,
      from: this.bloomPass.strength,
      to: profile.bloom
    };
    
    // DOF transition
    this._dofLerp = {
      t: 0,
      dur,
      fromFocus: this.bokehPass.uniforms['focus'].value,
      toFocus: profile.dof.focus,
      fromAperture: this.bokehPass.uniforms['aperture'].value,
      toAperture: profile.dof.aperture
    };
    
    // Apply to all layers immediately for instant mode
    if (instant) {
      this._applyColorsToLayers(profile.primary, profile.secondary, profile);
      this.bloomPass.strength = profile.bloom;
      this.bokehPass.uniforms['focus'].value = profile.dof.focus;
      this.bokehPass.uniforms['aperture'].value = profile.dof.aperture;
    }
  }

  _applyColorsToLayers(primary, secondary, profile) {
    // Apply to all existing layer instances
    Object.entries(this.layers).forEach(([key, wrapper]) => {
      if (!wrapper) return;
      
      if (key === 'cognitiveOrb') {
        if (wrapper.setColors) wrapper.setColors(primary, secondary);
        if (wrapper.setPulse && profile) wrapper.setPulse(profile.pulseHz);
      } else if (key === 'neuralWeb') {
        if (wrapper.applyProfile && profile) wrapper.applyProfile(profile);
      } else {
        // All other layers use setPalette
        if (wrapper.setPalette) wrapper.setPalette(primary, secondary);
      }
    });
  }

  update(delta, progressFloat, pointer, currentFps = 60) {
    // Update quality manager (desktop only)
    if (this.qualityManager) {
      this.qualityManager.updateFrameBudget();
      this.frameController.setBandByFps(this.qualityManager.fpsEMA);
    }
    
    // Check if we should run heavy updates this frame (adaptive frame control)
    // On mobile, skip some heavy updates based on frame budget
    let runHeavyUpdates = true;
    if (this.isMobile) {
      // Mobile: Skip heavy updates every other frame to maintain 30fps
      this._mobileFrameCount = (this._mobileFrameCount || 0) + 1;
      runHeavyUpdates = this._mobileFrameCount % 2 === 0;
    } else if (this.frameController) {
      runHeavyUpdates = this.frameController.shouldUpdate(delta);
    }
    
    // Apply reduced motion scaling
    const motionScale = this.prefersReducedMotion ? 0.5 : 1.0;
    
    // Update color lerp
    if (this._colorLerp) {
      const l = this._colorLerp;
      l.t = Math.min(1, l.t + (l.dur ? delta / l.dur : 1));
      
      const primary = l.fromPrimary.clone().lerp(l.toPrimary, l.t);
      const secondary = l.fromSecondary.clone().lerp(l.toSecondary, l.t);
      
      this._applyColorsToLayers('#' + primary.getHexString(), '#' + secondary.getHexString(), l.profile);
      
      if (l.t === 1) this._colorLerp = null;
    }
    
    // Update bloom lerp
    if (this._bloomLerp) {
      const b = this._bloomLerp;
      b.t = Math.min(1, b.t + (b.dur ? delta / b.dur : 1));
      this.bloomPass.strength = b.from + (b.to - b.from) * b.t;
      if (b.t === 1) this._bloomLerp = null;
    }
    
    // Update DOF lerp
    if (this._dofLerp) {
      const d = this._dofLerp;
      d.t = Math.min(1, d.t + (d.dur ? delta / d.dur : 1));
      this.bokehPass.uniforms['focus'].value = d.fromFocus + (d.toFocus - d.fromFocus) * d.t;
      this.bokehPass.uniforms['aperture'].value = d.fromAperture + (d.toAperture - d.fromAperture) * d.t;
      if (d.t === 1) this._dofLerp = null;
    }
    
    // Pointer parallax (use motion params from active program)
    const pg = this.motion?.parallax || { front: 0.6, back: 0.2 };
    if (pointer) {
      const targetX = pointer.x * pg.front;
      const targetY = pointer.y * pg.front * 0.67;
      this.frontGroup.position.x += (targetX - this.frontGroup.position.x) * delta * 3;
      this.frontGroup.position.y += (targetY - this.frontGroup.position.y) * delta * 3;
      
      const bgTargetX = pointer.x * pg.back;
      const bgTargetY = pointer.y * pg.back * 0.75;
      this.bgGroup.position.x += (bgTargetX - this.bgGroup.position.x) * delta * 1.5;
      this.bgGroup.position.y += (bgTargetY - this.bgGroup.position.y) * delta * 1.5;
    }
    
    // Cursor aura projection + update
    if (this._ndc && this.cursorAura) {
      this.cursorAura.setFromPointerNDC(this._ndc, this.camera);
      this.cursorAura.update(delta);
    }
    
    // Update ripples
    if (this.ripplePool) {
      this.ripplePool.forEach(r => r.update(delta));
    }
    
    // Update all active layer instances
    // Apply motion scale for reduced motion preference (halve pulse speeds)
    const pointerVec = pointer ? new THREE.Vector2(pointer.x, pointer.y) : null;
    const updateParams = {
      pulseScale: (this.motion?.pulseScale ?? 1) * motionScale,
      orbitScale: (this.motion?.orbitScale ?? 1) * motionScale,
      pointer: pointerVec
    };

    // Update each layer wrapper if it exists and is visible
    // Only run heavy shimmer/particle updates if frame budget allows
    Object.entries(this.layers).forEach(([key, wrapper]) => {
      if (!wrapper || !wrapper.object3d || !wrapper.object3d.visible) return;
      
      if (wrapper.update) {
        // Cognitive orb: always update (transforms only)
        if (key === 'cognitiveOrb') {
          wrapper.update(delta * motionScale);
        } 
        // Neural web: gate heavy raycast updates (already throttled internally)
        else if (key === 'neuralWeb') {
          wrapper.update(delta * motionScale, pointerVec);
        } 
        // Other layers: gate heavy particle/shimmer effects
        else if (runHeavyUpdates) {
          wrapper.update(delta * motionScale, updateParams);
        }
      }
    });
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  render() {
    this.composer.render();
  }
}
