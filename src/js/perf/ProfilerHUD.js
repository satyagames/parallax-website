/**
 * ProfilerHUD — Lightweight performance monitor for development
 * 
 * Displays real-time stats in top-left corner:
 * - FPS (current and EMA)
 * - Quality mode
 * - Frame band
 * - DPR
 * - Memory usage (if available)
 * - Renderer info
 * 
 * Toggle visibility with ?hud=1 query parameter
 * or by calling show()/hide()
 */

export class ProfilerHUD {
  constructor({ qualityManager, frameController, renderer }) {
    this.quality = qualityManager;
    this.frameCtl = frameController;
    this.renderer = renderer;
    
    this.visible = false;
    this.element = null;
    this.lastUpdate = 0;
    this.updateInterval = 200; // Update HUD every 200ms
    
    // Check for ?hud=1 query param
    const params = new URLSearchParams(window.location.search);
    if (params.get('hud') === '1') {
      this.show();
    }
  }

  /**
   * Create and show the HUD
   */
  show() {
    if (this.element) {
      this.element.style.display = 'block';
      this.visible = true;
      return;
    }

    this.element = document.createElement('div');
    this.element.id = 'profiler-hud';
    this.element.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #64ffda;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 10px 12px;
      border-radius: 4px;
      border: 1px solid rgba(100, 255, 218, 0.3);
      z-index: 10000;
      pointer-events: none;
      user-select: none;
      line-height: 1.5;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      min-width: 200px;
    `;

    document.body.appendChild(this.element);
    this.visible = true;
  }

  /**
   * Hide the HUD
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
      this.visible = false;
    }
  }

  /**
   * Toggle HUD visibility
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Update HUD display (call from render loop)
   */
  update(currentFps) {
    if (!this.visible || !this.element) return;

    const now = performance.now();
    if (now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;

    const qualityStats = this.quality.getStats();
    const frameStats = this.frameCtl.getStats();
    const rendererInfo = this.renderer.info;

    // Memory info (if available)
    let memoryInfo = '';
    if (performance.memory) {
      const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
      const limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(1);
      memoryInfo = `<div style="color: #8892b0;">MEM: ${used}/${limit} MB</div>`;
    }

    // Build status indicators
    const modeColor = {
      ultra: '#64ffda',
      high: '#5eead4',
      medium: '#ffd700',
      low: '#ff6b6b'
    }[qualityStats.mode] || '#64ffda';

    const fpsColor = currentFps >= 55 ? '#64ffda' : currentFps >= 40 ? '#ffd700' : '#ff6b6b';

    this.element.innerHTML = `
      <div style="color: ${fpsColor}; font-weight: bold; font-size: 13px;">
        FPS: ${Math.round(currentFps)} (${qualityStats.fps})
      </div>
      <div style="color: ${modeColor}; font-weight: bold;">
        MODE: ${qualityStats.mode.toUpperCase()}
      </div>
      <div style="color: #8892b0;">
        BAND: ${frameStats.band} fps (skip: ${frameStats.skipRatio})
      </div>
      <div style="color: #8892b0;">
        DPR: ${qualityStats.dpr.toFixed(2)}
      </div>
      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(100, 255, 218, 0.2);">
        <div style="color: #8892b0;">DRAW: ${rendererInfo.render.calls}</div>
        <div style="color: #8892b0;">TRIS: ${(rendererInfo.render.triangles / 1000).toFixed(1)}k</div>
        <div style="color: #8892b0;">PROG: ${rendererInfo.programs?.length || 0}</div>
      </div>
      ${memoryInfo}
      ${qualityStats.prefersReducedMotion ? '<div style="color: #ffd700; margin-top: 4px;">⚠ REDUCED MOTION</div>' : ''}
      ${qualityStats.isHidden ? '<div style="color: #ff6b6b; margin-top: 4px;">⏸ TAB HIDDEN</div>' : ''}
    `;
  }

  /**
   * Destroy the HUD
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.visible = false;
  }
}

// Export keyboard shortcut helper
export function setupHUDToggle(profilerHUD) {
  if (!profilerHUD) return;

  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+P to toggle HUD
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      profilerHUD.toggle();
    }
  });
}
