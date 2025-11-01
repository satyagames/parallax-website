/**
 * AdaptiveFrameController — Frame rate band management for desktop
 * 
 * Locks animation updates to consistent fps bands (90/75/60/45/30)
 * to maintain smooth visuals even under varying load.
 * 
 * Uses frame skipping: accumulates delta time and triggers updates
 * at consistent intervals based on the current band.
 * 
 * Desktop-focused: mobile typically runs at native refresh rate.
 */

export class AdaptiveFrameController {
  constructor({ desktop = true, target = 60 }) {
    this.desktop = desktop;
    this.target = target; // Starting target FPS
    this.accum = 0; // Accumulated time
    this.step = 1 / this.target; // Time step for current band
    this.band = 60; // Current fps band: 90, 75, 60, 45, 30
    this.frameCount = 0; // Total frames processed
    this.updateCount = 0; // Updates executed (post-skip)
  }

  /**
   * Update the fps band based on measured performance
   * Called by quality manager or main loop
   */
  setBandByFps(fpsEMA) {
    // Map FPS to nearest band for consistent cadence
    let newBand;
    if (fpsEMA >= 82) {
      newBand = 90;
    } else if (fpsEMA >= 68) {
      newBand = 75;
    } else if (fpsEMA >= 52) {
      newBand = 60;
    } else if (fpsEMA >= 36) {
      newBand = 45;
    } else {
      newBand = 30;
    }

    if (newBand !== this.band) {
      this.band = newBand;
      this.step = 1 / this.band;
      // Reset accumulator on band change to avoid jumps
      this.accum = 0;
    }
  }

  /**
   * Check if this frame should execute heavy updates
   * @param {number} dt - Delta time in seconds
   * @returns {boolean} - True if update should run
   */
  shouldUpdate(dt) {
    this.frameCount++;
    this.accum += dt;

    if (this.accum >= this.step) {
      this.accum -= this.step; // Carry over remainder
      this.updateCount++;
      return true;
    }

    return false;
  }

  /**
   * Get the effective update rate
   */
  getUpdateRate() {
    return this.band;
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      band: this.band,
      frameCount: this.frameCount,
      updateCount: this.updateCount,
      skipRatio: this.frameCount > 0 
        ? (1 - this.updateCount / this.frameCount).toFixed(2)
        : '0.00'
    };
  }

  /**
   * Reset counters (useful for debugging)
   */
  reset() {
    this.frameCount = 0;
    this.updateCount = 0;
    this.accum = 0;
  }
}
