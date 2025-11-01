import * as THREE from 'three';

export class GlyphField {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.timeAcc = 0;
    
    this._createGlyphs();
  }

  _createGlyphs() {
    const glyphCount = this.isMobile ? 20 : 40;
    
    for (let i = 0; i < glyphCount; i++) {
      const size = 0.2 + Math.random() * 0.3;
      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.MeshBasicMaterial({
        color: 0x4169e1,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      
      const glyph = new THREE.Mesh(geometry, material);
      
      // Random position
      glyph.position.x = (Math.random() - 0.5) * 15;
      glyph.position.y = (Math.random() - 0.5) * 10;
      glyph.position.z = (Math.random() - 0.5) * 10;
      
      glyph.userData.riseSpeed = 0.2 + Math.random() * 0.3;
      glyph.userData.rotSpeed = (Math.random() - 0.5) * 0.5;
      glyph.userData.initialY = glyph.position.y;
      
      this.group.add(glyph);
    }
  }

  setPalette(primary, secondary) {
    const color = new THREE.Color(primary);
    this.group.children.forEach(child => {
      if (child.material) child.material.color.copy(color);
    });
  }

  update(delta) {
    this.timeAcc += delta;
    
    const isFading = this.group.userData.isFading;
    const targetOpacity = this.group.userData.targetOpacity;
    
    this.group.children.forEach(glyph => {
      // Rise and fade
      glyph.position.y += delta * glyph.userData.riseSpeed;
      glyph.rotation.z += delta * glyph.userData.rotSpeed;
      
      // Reset if too high
      if (glyph.position.y > 5) {
        glyph.position.y = -5;
      }
      
      // Fade based on height - only if fully visible and not fading
      if (!isFading && targetOpacity === 1) {
        const fadePos = (glyph.position.y + 5) / 10;
        const baseOpacity = glyph.material.userData.baseOpacity || 1;
        glyph.material.opacity = Math.min(0.6, Math.sin(fadePos * Math.PI) * 0.6) * baseOpacity;
      }
    });
  }

  get object3d() {
    return this.group;
  }
}
