import * as THREE from 'three';

export class DataLattice {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.timeAcc = 0;
    this.pulsePhase = 0;
    
    this._createLattice();
  }

  _createLattice() {
    const count = this.isMobile ? 200 : 400;
    const positions = new Float32Array(count * 3);
    
    // Create ellipsoid lattice points
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 0.8;
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.5;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0xff6b9d,
      size: 0.04,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.points = new THREE.Points(geometry, material);
    this.group.add(this.points);
    
    // Add cross-links
    this._createLinks(positions, count);
  }

  _createLinks(positions, count) {
    const linkPositions = [];
    
    for (let i = 0; i < count; i += 3) {
      if (i + 3 < count) {
        linkPositions.push(
          positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
          positions[(i + 3) * 3], positions[(i + 3) * 3 + 1], positions[(i + 3) * 3 + 2]
        );
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(linkPositions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0xff6b9d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.links = new THREE.LineSegments(geometry, material);
    this.group.add(this.links);
  }

  setPalette(primary, secondary) {
    const color = new THREE.Color(primary);
    this.points.material.color.copy(color);
    this.links.material.color.copy(color);
  }

  update(delta, { pulseScale = 1, orbitScale = 1 }) {
    this.timeAcc += delta;
    this.pulsePhase += delta * pulseScale;
    
    // Wave through lattice
    this.group.rotation.y += delta * 0.05 * orbitScale;
    this.group.rotation.x = Math.sin(this.timeAcc * 0.3) * 0.1;
    
    // Shimmer - only if not being animated by fade system AND fully visible
    const isFading = this.group.userData.isFading;
    const isVisible = this.group.visible && this.group.userData.targetOpacity === 1;
    const pointsOpacity = this.points.material.opacity;
    const isFullyFadedIn = pointsOpacity > 0.7; // Only shimmer when mostly visible
    
    if (!isFading && isVisible && isFullyFadedIn) {
      const shimmer = 0.15 + Math.sin(this.pulsePhase * 2) * 0.05;
      const basePoints = this.points.material.userData.baseOpacity || 1;
      const baseLinks = this.links.material.userData.baseOpacity || 1;
      this.points.material.opacity = Math.min(0.8, shimmer * 4) * basePoints;
      this.links.material.opacity = Math.min(0.3, shimmer * 2) * baseLinks;
    }
  }

  get object3d() {
    return this.group;
  }
}
