import * as THREE from 'three';

export class RippleRing {
  constructor({ color = '#64ffda' } = {}) {
    this.group = new THREE.Group();
    const geo = new THREE.RingGeometry(0.01, 0.012, 64);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);
    this.age = 0;
    this.alive = false;
  }

  trigger(atWorld) {
    this.group.position.copy(atWorld);
    this.age = 0;
    this.alive = true;
    this.mesh.scale.set(1, 1, 1);
    this.mesh.material.opacity = 0.9;
  }

  update(delta) {
    if (!this.alive) return;
    this.age += delta;
    const k = Math.min(1, this.age / 0.8);
    this.mesh.scale.setScalar(1 + k * 6);
    this.mesh.material.opacity = 0.9 * (1 - k);
    if (k >= 1) this.alive = false;
  }

  get object3d() {
    return this.group;
  }
}
