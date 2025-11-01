import * as THREE from 'three';

export class NeuralWeb {
  constructor({ isMobile, radius = 6, countDesktop = 700, countMobile = 350 }) {
    this.isMobile = isMobile;
    this.radius = radius;
    this.baseNodeCount = isMobile ? countMobile : countDesktop;
    this.nodeCount = this.baseNodeCount;
    this.kNeighbors = isMobile ? 2 : 3;
    this.linkDistance = 1.8;
    this.pulseHz = 0.65;
    this.pulsePhase = 0;
    
    // Quality management
    this.nodesMul = 1.0;
    this.linksMul = 1.0;
    this.rayHz = 40; // Raycast frequency (Hz)
    this._rayTimer = 0;
    
    // Highlight state
    this._highlightIndex = -1;
    this._highlightStrength = 0;
    this._ndc = null;
    this._camera = null;
    
    this.group = new THREE.Group();
    
    this._buildNodes();
    this._buildLinks();
  }

  _buildNodes() {
    const positions = new Float32Array(this.nodeCount * 3);
    const sizes = new Float32Array(this.nodeCount);
    
    this.nodePositions = [];
    
    for (let i = 0; i < this.nodeCount; i++) {
      const r = this.radius * (0.7 + Math.random() * 0.3);
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      
      const x = r * Math.sin(phi) * Math.cos(theta) * 0.8;
      const y = r * Math.cos(phi) * 0.5;
      const z = r * Math.sin(phi) * Math.sin(theta);
      
      positions.set([x, y, z], i * 3);
      sizes[i] = 0.8 + Math.random() * 0.4;
      
      this.nodePositions.push(new THREE.Vector3(x, y, z));
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      color: 0x64ffda,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    
    this.nodes = new THREE.Points(geometry, material);
    this.group.add(this.nodes);
  }

  _buildLinks() {
    // Build K-nearest neighbor graph
    this.links = [];
    
    for (let i = 0; i < this.nodeCount; i++) {
      const distances = [];
      
      for (let j = 0; j < this.nodeCount; j++) {
        if (i !== j) {
          const dist = this.nodePositions[i].distanceTo(this.nodePositions[j]);
          distances.push([j, dist]);
        }
      }
      
      distances.sort((a, b) => a[1] - b[1]);
      
      let k = 0;
      for (let h = 0; h < distances.length && k < this.kNeighbors; h++) {
        const [j, dist] = distances[h];
        if (dist <= this.linkDistance * 1.3) {
          this.links.push([i, j, dist]);
          k++;
        }
      }
    }
    
    // Create line segments
    const linkCount = this.links.length;
    const linkPositions = new Float32Array(linkCount * 2 * 3);
    
    for (let l = 0; l < linkCount; l++) {
      const [i, j] = this.links[l];
      const pos = this.nodes.geometry.getAttribute('position');
      
      linkPositions.set([
        pos.getX(i), pos.getY(i), pos.getZ(i),
        pos.getX(j), pos.getY(j), pos.getZ(j)
      ], l * 6);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0x64ffda,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    this.linkLines = new THREE.LineSegments(geometry, material);
    this.group.add(this.linkLines);
  }

  /**
   * Adjust node/link density multipliers for quality management
   * Note: This is mainly for future optimization. For now, stores multipliers
   * for potential geometry rebuilding or instance count adjustment.
   */
  setDensityMultipliers(nodesMul, linksMul) {
    this.nodesMul = nodesMul;
    this.linksMul = linksMul;
    
    // Could implement dynamic node/link reduction here
    // For now, just store multipliers for reference
    // Future: Adjust geometry.setDrawRange() or use instancing
  }

  /**
   * Set raycast update frequency (Hz)
   */
  setRaycastHz(hz) {
    this.rayHz = hz;
  }

  setPointerNDC(ndc, camera) {
    this._ndc = ndc;
    this._camera = camera;
  }

  _updateHighlight() {
    if (!this._ndc || !this._camera || this.isMobile) return;

    // Project ray; find approx nearest node in small radius
    const pos = this.nodes.geometry.getAttribute('position');
    const tmp = new THREE.Vector3();
    const origin = new THREE.Vector3().copy(this._camera.position);
    const ndcVec = new THREE.Vector3(this._ndc.x, this._ndc.y, 0.5);
    ndcVec.unproject(this._camera);
    const dir = new THREE.Vector3().copy(ndcVec).sub(origin).normalize();

    // Transform to local space
    const worldToLocal = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    const localOrigin = origin.clone().applyMatrix4(worldToLocal);
    const localDir = dir.clone().transformDirection(worldToLocal);

    let bestIdx = -1;
    let bestDist = 1e9;
    const radius = 1.5; // pick nodes within this distance to ray

    for (let i = 0; i < pos.count; i++) {
      tmp.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      
      // Distance from point to ray
      const toPoint = tmp.clone().sub(localOrigin);
      const projection = toPoint.dot(localDir);
      if (projection < 0) continue; // Behind camera
      
      const closestPoint = localOrigin.clone().add(localDir.clone().multiplyScalar(projection));
      const d = tmp.distanceTo(closestPoint);
      
      if (d < radius && d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }

    // Smoothly highlight with faster response
    if (bestIdx !== -1) {
      this._highlightIndex = bestIdx;
      this._highlightStrength += (1 - this._highlightStrength) * 0.15;
    } else {
      this._highlightStrength *= 0.92; // Smooth decay
    }
  }

  applyProfile({ primary, linkCap, pulseHz }) {
    const color = new THREE.Color(primary);
    this.nodes.material.color.copy(color);
    this.linkLines.material.color.copy(color);
    this.linkDistance = linkCap;
    this.pulseHz = pulseHz;
  }

  update(delta, pointerVec2) {
    this.pulsePhase += delta * this.pulseHz * Math.PI * 2;
    
    // Gentle sway
    this.group.rotation.y += delta * 0.05;
    this.group.rotation.x = Math.sin(this.pulsePhase * 0.3) * 0.05;
    
    // Shimmer links - only when fully visible (prevents glitches during transitions)
    const isFading = this.group.userData.isFading;
    const isVisible = this.group.visible && this.group.userData.targetOpacity === 1;
    const currentOpacity = this.linkLines.material.opacity;
    const isFullyFadedIn = currentOpacity > 0.12; // Only shimmer when mostly visible
    
    const shimmer = 0.15 + Math.sin(this.pulsePhase) * 0.05;
    
    if (!isFading && isVisible && isFullyFadedIn) {
      const baseOpacity = this.linkLines.material.userData.baseOpacity || 1;
      this.linkLines.material.opacity = shimmer * baseOpacity;
    }
    
    // Pointer awareness - subtle bias
    if (pointerVec2) {
      const biasStrength = 0.1;
      this.group.rotation.y += pointerVec2.x * delta * biasStrength;
      this.group.rotation.x += pointerVec2.y * delta * biasStrength;
    }
    
    // Update highlight with throttling (raycast is expensive)
    this._rayTimer += delta;
    const rayInterval = 1 / this.rayHz;
    if (this._rayTimer >= rayInterval) {
      this._rayTimer = 0;
      this._updateHighlight();
    }
    
    // Apply highlight effect - only when fully visible
    if (!isFading && isVisible && isFullyFadedIn) {
      if (this._highlightStrength > 0 && this._highlightIndex !== undefined) {
        const t = performance.now() * 0.002;
        const pulse = 1 + 0.15 * Math.sin(t * 4) * this._highlightStrength;
        this.nodes.material.size = 0.05 * pulse;
        const baseOpacity = this.linkLines.material.userData.baseOpacity || 1;
        this.linkLines.material.opacity = shimmer * (1 + 0.3 * this._highlightStrength) * baseOpacity;
      } else {
        this.nodes.material.size = 0.05;
      }
    }
  }

  get object3d() {
    return this.group;
  }
}
