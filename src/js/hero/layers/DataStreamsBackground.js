import * as THREE from 'three';

export class DataStreamsBackground {
  constructor({ isMobile }) {
    this.isMobile = isMobile;
    this.group = new THREE.Group();
    this.timeAcc = 0;
    this.streams = [];
    
    this._createStreams();
  }

  _createStreams() {
    const streamCount = this.isMobile ? 20 : 40;
    
    for (let i = 0; i < streamCount; i++) {
      const geometry = new THREE.BoxGeometry(0.05, 8, 0.05);
      const material = new THREE.MeshBasicMaterial({
        color: 0x64ffda,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const stream = new THREE.Mesh(geometry, material);
      
      // Random position in cylinder
      const radius = 10 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      stream.position.x = Math.cos(angle) * radius;
      stream.position.z = Math.sin(angle) * radius;
      stream.position.y = (Math.random() - 0.5) * 10;
      
      // Random phase for animation
      stream.userData.phase = Math.random() * Math.PI * 2;
      stream.userData.speed = 0.5 + Math.random() * 0.5;
      
      this.streams.push(stream);
      this.group.add(stream);
    }
  }

  setPalette(primary, secondary) {
    const color = new THREE.Color(primary);
    this.streams.forEach(stream => {
      stream.material.color.copy(color);
    });
  }

  update(delta) {
    this.timeAcc += delta;
    
    this.streams.forEach(stream => {
      // Rising motion with phase
      const phase = stream.userData.phase + this.timeAcc * stream.userData.speed;
      stream.position.y = Math.sin(phase) * 5;
      
      // Pulse opacity
      const pulse = 0.1 + Math.sin(phase * 2) * 0.05;
      stream.material.opacity = pulse;
      
      // Slight rotation
      stream.rotation.y += delta * 0.1;
    });
    
    // Group rotation
    this.group.rotation.y += delta * 0.01;
  }

  get object3d() {
    return this.group;
  }
}
