import * as THREE from 'three';

export class CognitiveOrb {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.pulseHz = 0.65;
    this.pulsePhase = 0;
    
    // Create main orb
    this._createMainOrb();
    // Create inner particle swirl
    this._createInnerSwirl();
    // Create shell layers
    this._createShells();
  }

  _createMainOrb() {
    const geometry = new THREE.IcosahedronGeometry(1.2, 3);
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#64ffda'),
      metalness: 0.3,
      roughness: 0.1,
      transmission: 0.9,
      thickness: 0.5,
      transparent: true,
      opacity: 0.6,
      envMapIntensity: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide
    });
    
    this.mainOrb = new THREE.Mesh(geometry, material);
    this.group.add(this.mainOrb);
  }

  _createInnerSwirl() {
    const count = this.isMobile ? 100 : 200;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const radius = Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x64ffda,
      size: 0.03,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.innerSwirl = new THREE.Points(geometry, material);
    this.group.add(this.innerSwirl);
  }

  _createShells() {
    this.shells = [];
    const shellCount = this.isMobile ? 2 : 3;
    
    for (let i = 0; i < shellCount; i++) {
      const radius = 1.4 + i * 0.3;
      const geometry = new THREE.IcosahedronGeometry(radius, 2);
      const material = new THREE.MeshBasicMaterial({
        color: 0x64ffda,
        transparent: true,
        opacity: 0.05 - i * 0.01,
        wireframe: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const shell = new THREE.Mesh(geometry, material);
      this.shells.push(shell);
      this.group.add(shell);
    }
  }

  setColors(primary, secondary) {
    const primaryColor = new THREE.Color(primary);
    const secondaryColor = new THREE.Color(secondary);
    
    this.mainOrb.material.color.copy(primaryColor);
    this.innerSwirl.material.color.copy(primaryColor);
    
    this.shells.forEach((shell, i) => {
      const blend = i / Math.max(1, this.shells.length - 1);
      shell.material.color.copy(primaryColor.clone().lerp(secondaryColor, blend));
    });
  }

  setPulse(hz) {
    this.pulseHz = hz;
  }

  update(delta) {
    this.pulsePhase += delta * this.pulseHz * Math.PI * 2;
    
    // Pulse scale
    const pulse = 0.98 + Math.sin(this.pulsePhase) * 0.02;
    this.mainOrb.scale.setScalar(pulse);
    
    // Rotate orb
    this.mainOrb.rotation.y += delta * 0.1;
    this.mainOrb.rotation.x += delta * 0.05;
    
    // Swirl particles
    this.innerSwirl.rotation.y += delta * 0.3;
    this.innerSwirl.rotation.x += delta * 0.15;
    
    // Rotate shells
    this.shells.forEach((shell, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      shell.rotation.y += delta * 0.08 * dir;
      shell.rotation.x += delta * 0.04 * dir;
      shell.rotation.z += delta * 0.02 * dir;
    });
  }

  get object3d() {
    return this.group;
  }
}
