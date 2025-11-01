import * as THREE from 'three';

export class SignalBeacons {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.timeAcc = 0;
    
    this._createBeacons();
  }

  _createBeacons() {
    const beaconCount = this.isMobile ? 5 : 10;
    
    for (let i = 0; i < beaconCount; i++) {
      const geometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff1493,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const beacon = new THREE.Mesh(geometry, material);
      
      // Position in circle
      const angle = (i / beaconCount) * Math.PI * 2;
      const radius = 6;
      beacon.position.x = Math.cos(angle) * radius;
      beacon.position.z = Math.sin(angle) * radius;
      beacon.position.y = 0;
      
      beacon.userData.pulseOffset = i * 0.3;
      
      this.group.add(beacon);
      
      // Add halo sprite
      const haloGeometry = new THREE.PlaneGeometry(0.5, 0.5);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: 0xff1493,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(beacon.position);
      halo.position.y += 1.5;
      beacon.userData.halo = halo;
      
      this.group.add(halo);
    }
  }

  setPalette(primary, secondary) {
    const color = new THREE.Color(primary);
    this.group.children.forEach(child => {
      if (child.material) child.material.color.copy(color);
    });
  }

  update(delta, { pulseScale = 1 }) {
    this.timeAcc += delta;
    
    const isFading = this.group.userData.isFading;
    const targetOpacity = this.group.userData.targetOpacity;
    
    this.group.children.forEach((child, i) => {
      if (child.userData.halo) {
        // Pulse beacon - only if fully visible and not fading
        const pulse = Math.sin(this.timeAcc * pulseScale * 2 + child.userData.pulseOffset);
        if (!isFading && targetOpacity === 1) {
          const baseBeacon = child.material.userData.baseOpacity || 1;
          const baseHalo = child.userData.halo.material.userData.baseOpacity || 1;
          
          child.material.opacity = Math.min(0.7, 0.3 + pulse * 0.2) * baseBeacon;
          child.userData.halo.material.opacity = Math.min(0.5, 0.2 + pulse * 0.15) * baseHalo;
        }
        const scale = 1 + pulse * 0.2;
        child.userData.halo.scale.set(scale, scale, scale);
      }
    });
  }

  get object3d() {
    return this.group;
  }
}
