/**
 * QualityManager — Desktop-focused dynamic quality controller
 * 
 * Monitors frame rate and adaptively adjusts:
 * - DPR (device pixel ratio)
 * - Bloom strength
 * - DOF samples/blur
 * - Raycast frequency
 * - Node/link density multipliers
 * 
 * Responds to:
 * - Tab visibility (low-power mode when hidden)
 * - Prefers-reduced-motion media query
 * - Frame rate bands (ultra/high/medium/low)
 */

export class QualityManager {
  constructor({ renderer, composer, camera, isMobile = false, desktopTargetFps = 60 }) {
    this.renderer = renderer;
    this.composer = composer;
    this.camera = camera;
    this.isMobile = isMobile;
    this.target = desktopTargetFps;
    this.mode = 'high'; // 'ultra' | 'high' | 'medium' | 'low'
    this.fpsEMA = this.target; // exponential moving average
    this.lastStamp = performance.now();
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isHidden = document.hidden;

    // Quality presets for each mode
    this.configs = {
      ultra: {
        dpr: 2.0,
        bloom: 0.34,
        dof: { samples: 6, maxBlur: 0.012, aperture: 0.00028 },
        rayHz: 45,
        nodesMul: 1.0,
        linksMul: 1.0
      },
      high: {
        dpr: 1.75,
        bloom: 0.28,
        dof: { samples: 5, maxBlur: 0.010, aperture: 0.00024 },
        rayHz: 40,
        nodesMul: 0.9,
        linksMul: 0.9
      },
      medium: {
        dpr: 1.5,
        bloom: 0.22,
        dof: { samples: 4, maxBlur: 0.008, aperture: 0.00020 },
        rayHz: 30,
        nodesMul: 0.75,
        linksMul: 0.75
      },
      low: {
        dpr: 1.25,
        bloom: 0.16,
        dof: { samples: 3, maxBlur: 0.006, aperture: 0.00016 },
        rayHz: 24,
        nodesMul: 0.6,
        linksMul: 0.6
      }
    };

    // Start conservatively if reduced motion preferred
    if (this.prefersReducedMotion) {
      this.mode = 'medium';
    }

    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', () => {
      this.isHidden = document.hidden;
      if (document.hidden) {
        this._applyVisibilityLowPower();
      } else {
        this._applyMode(this.mode);
      }
    });

    // Listen for reduced motion preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', (e) => {
      this.prefersReducedMotion = e.matches;
      if (this.onReducedMotionChange) {
        this.onReducedMotionChange(e.matches);
      }
    });

    // Initialize with current mode
    this._applyMode(this.mode);

    // Callback hooks for external systems
    this.onQualityChange = null;
    this.onReducedMotionChange = null;
  }

  /**
   * Update frame budget tracking and adjust quality band if needed
   * Call this once per render frame
   */
  updateFrameBudget() {
    if (this.isHidden) return; // Skip when tab hidden

    const now = performance.now();
    const dt = (now - this.lastStamp) / 1000;
    this.lastStamp = now;
    
    const fps = 1 / Math.max(0.000001, dt);
    
    // Exponential moving average for smoother band transitions
    this.fpsEMA = this.fpsEMA * 0.9 + fps * 0.1;

    // Switch quality bands based on EMA
    if (this.fpsEMA >= 70 && this.mode !== 'ultra') {
      this._applyMode('ultra');
    } else if (this.fpsEMA >= 58 && this.fpsEMA < 70 && this.mode !== 'high') {
      this._applyMode('high');
    } else if (this.fpsEMA >= 42 && this.fpsEMA < 58 && this.mode !== 'medium') {
      this._applyMode('medium');
    } else if (this.fpsEMA < 42 && this.mode !== 'low') {
      this._applyMode('low');
    }
  }

  /**
   * Apply a specific quality mode
   */
  _applyMode(mode) {
    this.mode = mode;
    const cfg = this.configs[mode];

    // Clamp DPR to device capability and quality setting
    const maxDpr = window.devicePixelRatio || 1;
    const targetDpr = Math.min(cfg.dpr, maxDpr);
    this.renderer.setPixelRatio(targetDpr);

    // Adjust bloom pass strength
    if (this.composer?.bloomPass) {
      this.composer.bloomPass.strength = cfg.bloom;
    }

    // Adjust DOF/bokeh pass parameters
    if (this.composer?.bokehPass) {
      this.composer.bokehPass.uniforms.maxblur.value = cfg.dof.maxBlur;
      this.composer.bokehPass.uniforms.aperture.value = cfg.dof.aperture;
    }

    // Store current config for external access
    this.current = cfg;

    // Notify listeners (orchestrator will adjust layer densities)
    if (this.onQualityChange) {
      this.onQualityChange(cfg);
    }
  }

  /**
   * Apply ultra-low power settings when tab is hidden
   */
  _applyVisibilityLowPower() {
    // Drop to minimal DPR
    this.renderer.setPixelRatio(1);

    // Reduce bloom to minimum
    if (this.composer?.bloomPass) {
      this.composer.bloomPass.strength = 0.08;
    }

    // Reduce DOF blur
    if (this.composer?.bokehPass) {
      this.composer.bokehPass.uniforms.maxblur.value = 0.003;
      this.composer.bokehPass.uniforms.aperture.value = 0.00012;
    }
  }

  /**
   * Force a specific quality mode (for debugging or user preference)
   */
  setMode(mode) {
    if (this.configs[mode]) {
      this._applyMode(mode);
    }
  }

  /**
   * Get current quality stats
   */
  getStats() {
    return {
      mode: this.mode,
      fps: Math.round(this.fpsEMA),
      dpr: this.renderer.getPixelRatio(),
      prefersReducedMotion: this.prefersReducedMotion,
      isHidden: this.isHidden
    };
  }
}
