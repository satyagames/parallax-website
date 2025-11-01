import * as THREE from 'three';

export class GalaxyBackground {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.timeAcc = 0;
    
    this._createGalaxy();
  }

  _createGalaxy() {
    const count = this.isMobile ? 800 : 1500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const radius = Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // White-blue gradient
      const brightness = 0.7 + Math.random() * 0.3;
      colors[i * 3] = brightness * 0.8;
      colors[i * 3 + 1] = brightness * 0.9;
      colors[i * 3 + 2] = brightness;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.stars = new THREE.Points(geometry, material);
    this.group.add(this.stars);
  }

  setPalette(primary, secondary) {
    // Subtle tint based on section colors
    const color = new THREE.Color(primary);
    this.stars.material.color = color;
    this.stars.material.opacity = 0.4;
  }

  update(delta) {
    this.timeAcc += delta;
    
    // Slow orbit
    this.group.rotation.y += delta * 0.02;
    this.group.rotation.x = Math.sin(this.timeAcc * 0.1) * 0.05;
    
    // Twinkle effect - only when not fading and fully visible
    const isFading = this.group.userData.isFading;
    const currentOpacity = this.stars.material.opacity;
    const isFullyVisible = this.group.visible && this.group.userData.targetOpacity === 1;
    const isFullyFadedIn = currentOpacity > 0.5;
    
    // Only apply twinkle when layer is fully visible (prevents glitches during transitions)
    if (!isFading && isFullyVisible && isFullyFadedIn) {
      const twinkle = 0.4 + Math.sin(this.timeAcc * 2) * 0.2;
      const baseOpacity = this.stars.material.userData.baseOpacity || 0.6;
      this.stars.material.opacity = twinkle * baseOpacity;
    }
  }

  get object3d() {
    return this.group;
  }
}
