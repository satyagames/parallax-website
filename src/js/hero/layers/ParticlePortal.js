import * as THREE from 'three';

export class ParticlePortal {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.timeAcc = 0;
    
    this._createPortal();
  }

  _createPortal() {
    const particleCount = this.isMobile ? 500 : 1000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 * 10;
      const radius = 2 + (i / particleCount) * 3;
      const height = (i / particleCount) * 0.5 - 0.25;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Purple-pink gradient
      const t = i / particleCount;
      colors[i * 3] = 1 - t * 0.3;
      colors[i * 3 + 1] = 0.2 + t * 0.3;
      colors[i * 3 + 2] = 1;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }

  setPalette(primary, secondary) {
    // Portal has fixed gradient, but we can tint it
    const color = new THREE.Color(primary);
    this.particles.material.color = color;
  }

  update(delta, { orbitScale = 1 }) {
    this.timeAcc += delta;
    
    // Spiral rotation
    this.particles.rotation.y += delta * 0.5 * orbitScale;
    this.particles.rotation.x = Math.sin(this.timeAcc * 0.3) * 0.1;
    
    // Pulse opacity - only if fully visible and not fading
    const isFading = this.group.userData.isFading;
    const targetOpacity = this.group.userData.targetOpacity;
    if (!isFading && targetOpacity === 1) {
      const baseOpacity = this.particles.material.userData.baseOpacity || 1;
      this.particles.material.opacity = Math.min(0.8, 0.5 + Math.sin(this.timeAcc * 2) * 0.3) * baseOpacity;
    }
  }

  get object3d() {
    return this.group;
  }
}
