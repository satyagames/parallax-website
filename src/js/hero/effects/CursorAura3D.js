import * as THREE from 'three';

export class CursorAura3D {
  constructor({ color = '#64ffda' } = {}) {
    this.group = new THREE.Group();
    const tex = CursorAura3D._makeRadialTexture();
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.sprite = new THREE.Sprite(mat);
    this.sprite.scale.set(0.6, 0.6, 0.6);
    this.group.add(this.sprite);

    this.targetWorld = new THREE.Vector3(0, 0, 0);
    this.planeZ = 0; // raycast to z=0 plane by default
  }

  static _makeRadialTexture(size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  setColor(hex) {
    this.sprite.material.color.set(hex);
  }

  setFromPointerNDC(ndc, camera) {
    // Project ndc ray to plane z=this.planeZ
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const ndcVec = new THREE.Vector3(ndc.x, ndc.y, 0.5);
    ndcVec.unproject(camera);
    origin.copy(camera.position);
    dir.copy(ndcVec).sub(camera.position).normalize();
    const t = (this.planeZ - origin.z) / dir.z;
    this.targetWorld.set(origin.x + dir.x * t, origin.y + dir.y * t, this.planeZ);
  }

  update(delta) {
    // Faster ease to target for more responsive feel
    this.group.position.lerp(this.targetWorld, 0.25);
    
    // Gentle breathing
    const t = performance.now() * 0.001;
    const s = 0.5 + Math.sin(t * 2.0) * 0.08;
    this.sprite.scale.set(s, s, s);
    this.sprite.material.opacity = 0.6 + 0.2 * Math.sin(t * 1.8);
  }

  get object3d() {
    return this.group;
  }
}
