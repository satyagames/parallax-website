import * as THREE from 'three';

export class HexGridField {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.timeAcc = 0;
    
    this._createHexGrid();
  }

  _createHexGrid() {
    const hexCount = this.isMobile ? 30 : 60;
    const hexRadius = 0.5;
    
    for (let i = 0; i < hexCount; i++) {
      const points = [];
      
      for (let j = 0; j <= 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        points.push(new THREE.Vector3(
          Math.cos(angle) * hexRadius,
          0,
          Math.sin(angle) * hexRadius
        ));
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const hex = new THREE.Line(geometry, material);
      
      // Position in grid
      const row = Math.floor(i / 10);
      const col = i % 10;
      hex.position.x = (col - 5) * hexRadius * 1.8;
      hex.position.z = (row - 3) * hexRadius * 1.6 + (col % 2) * hexRadius * 0.8;
      hex.position.y = -5;
      
      this.group.add(hex);
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
    
    // Gentle wave effect
    this.group.children.forEach((hex, i) => {
      const wave = Math.sin(this.timeAcc + i * 0.1) * 0.2;
      hex.position.y = -5 + wave;
    });
  }

  get object3d() {
    return this.group;
  }
}
