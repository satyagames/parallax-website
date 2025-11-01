import * as THREE from 'three';

export class DigitalTwinWireframe {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.timeAcc = 0;
    
    this._createCity();
  }

  _createCity() {
    const buildingCount = this.isMobile ? 8 : 15;
    
    for (let i = 0; i < buildingCount; i++) {
      const width = 0.3 + Math.random() * 0.5;
      const height = 1 + Math.random() * 2;
      const depth = 0.3 + Math.random() * 0.5;
      
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const edges = new THREE.EdgesGeometry(geometry);
      
      const material = new THREE.LineBasicMaterial({
        color: 0xffa500,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const wireframe = new THREE.LineSegments(edges, material);
      
      // Position in grid
      const angle = (i / buildingCount) * Math.PI * 2;
      const radius = 3 + Math.random() * 2;
      wireframe.position.x = Math.cos(angle) * radius;
      wireframe.position.z = Math.sin(angle) * radius;
      wireframe.position.y = -height / 2;
      
      this.group.add(wireframe);
      geometry.dispose();
    }
  }

  setPalette(primary, secondary) {
    const color = new THREE.Color(primary);
    this.group.children.forEach(child => {
      if (child.material) child.material.color.copy(color);
    });
  }

  update(delta, { orbitScale = 1 }) {
    this.timeAcc += delta;
    this.group.rotation.y += delta * 0.08 * orbitScale;
  }

  get object3d() {
    return this.group;
  }
}
