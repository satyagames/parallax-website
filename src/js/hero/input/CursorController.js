export class CursorController {
  constructor({ element = document.getElementById('ux-cursor'), smoothing = 0.18 } = {}) {
    this.el = element;
    this.core = this.el?.querySelector('.ux-cursor-core');
    this.ring = this.el?.querySelector('.ux-cursor-ring');
    this.smoothing = smoothing;

    this.visible = true;
    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.target = { x: this.pos.x, y: this.pos.y };
    this.velocity = { x: 0, y: 0 };
    
    // Idle detection
    this.lastMove = performance.now();
    this.idleThreshold = 800; // ms

    this._bind();
  }

  _bind() {
    window.addEventListener('pointermove', e => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
      this.lastMove = performance.now();
      if (!this.visible && this.el) {
        this.el.style.display = 'block';
        this.visible = true;
      }
    }, { passive: true });

    window.addEventListener('pointerdown', () => { this._press(); }, { passive: true });
    window.addEventListener('pointerup', () => { this._release(); }, { passive: true });
    window.addEventListener('mouseleave', () => {
      this.visible = false;
      if (this.el) this.el.style.display = 'none';
    });
    window.addEventListener('mouseenter', () => {
      this.visible = true;
      if (this.el) this.el.style.display = 'block';
    });
  }

  _press() {
    if (!this.ring || !this.core) return;
    this.ring.style.borderColor = 'rgba(100,255,218,0.9)';
    this.ring.style.borderWidth = '2px';
    this.core.style.transform = 'scale(0.85)';
  }

  _release() {
    if (!this.ring || !this.core) return;
    this.ring.style.borderColor = 'rgba(100,255,218,0.4)';
    this.ring.style.borderWidth = '1.5px';
    this.core.style.transform = 'scale(1)';
  }

  update() {
    // Smooth lerp follow with velocity for more natural feel
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    
    this.pos.x += dx * this.smoothing;
    this.pos.y += dy * this.smoothing;
    
    // Track velocity for dynamic effects
    this.velocity.x = dx * this.smoothing;
    this.velocity.y = dy * this.smoothing;
    
    if (!this.el) return null;

    // Use transform for hardware acceleration
    this.el.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
    
    // Scale ring based on velocity for dynamic feel
    if (this.ring) {
      const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
      const scale = 1 + Math.min(speed * 0.003, 0.15);
      this.ring.style.transform = `scale(${scale})`;
    }
    
    return {
      ndcX: (this.pos.x / window.innerWidth) * 2 - 1,
      ndcY: -(this.pos.y / window.innerHeight) * 2 + 1,
      clientX: this.pos.x,
      clientY: this.pos.y
    };
  }

  /**
   * Check if cursor has been idle for longer than threshold
   * @returns {boolean}
   */
  isIdle() {
    return (performance.now() - this.lastMove) > this.idleThreshold;
  }
}
