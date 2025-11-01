import * as THREE from 'three';
import { SECTION_PROFILES } from './palettes.js';
import { createNodeGlowMaterial } from './shaders/nodeGlowMaterial.js';
import { createLinkMaterial } from './shaders/linkMaterial.js';

export class NeuralUniverse {
  constructor({ canvas, isMobile, renderer, scene, camera }) {
    this.canvas = canvas;
    this.scene = scene || new THREE.Scene();
    this.camera = camera;
    this.renderer = renderer;
    this.isMobile = isMobile;
    this.clock = new THREE.Clock();
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Settings
    this.nodeCount = isMobile ? 350 : 700;
    this.radius = 6;
    this.kNeighbors = isMobile ? 2 : 3;
    this.linkDistance = 1.7;
    this.pulseHz = 0.6;
    this.pointer = new THREE.Vector2(0, 0);

    this._buildStarfield();
    this._buildNodes();
    this._buildLinks();
    this._setupInteraction();

    this.activeProfile = null;
    this.timeAcc = 0;
    
    // Lerp state
    this._colorLerp = null;
    this._linkCapLerp = null;
    this._pulseLerp = null;
  }

  _buildStarfield() {
    const count = this.isMobile ? 400 : 800;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3 + 0] = (Math.random() - 0.5) * 60;
      p[i * 3 + 1] = (Math.random() - 0.5) * 60;
      p[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ 
      size: 0.02, 
      color: 0x7aa4aa, 
      transparent: true, 
      opacity: 0.4, 
      depthWrite: false 
    });
    this.stars = new THREE.Points(g, m);
    this.group.add(this.stars);
  }

  _buildNodes() {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(this.nodeCount * 3);
    const sizes = new Float32Array(this.nodeCount);
    
    for (let i = 0; i < this.nodeCount; i++) {
      // Ellipsoid distribution
      const r = this.radius * (0.65 + Math.random() * 0.35);
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const x = r * Math.sin(phi) * Math.cos(theta) * 0.9;
      const y = r * Math.cos(phi) * 0.6;
      const z = r * Math.sin(phi) * Math.sin(theta);
      positions.set([x, y, z], i * 3);
      sizes[i] = 0.9 + Math.random() * 0.6;
    }
    
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    // Use custom shader material for better glow
    this.nodeMat = createNodeGlowMaterial('#64ffda');
    this.nodes = new THREE.Points(g, this.nodeMat);
    this.group.add(this.nodes);

    // Store positions for KNN
    this.nodePositions = positions;
    
    // Build neighbor graph
    this._buildKNN();
  }

  _buildKNN() {
    const pos = this.nodes.geometry.getAttribute('position');
    const N = this.nodeCount;
    const coords = new Array(N);
    
    for (let i = 0; i < N; i++) {
      coords[i] = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    }

    // Build K-nearest neighbor graph
    this.links = [];
    for (let i = 0; i < N; i++) {
      const dists = [];
      for (let j = 0; j < N; j++) {
        if (i !== j) {
          dists.push([j, coords[i].distanceTo(coords[j])]);
        }
      }
      dists.sort((a, b) => a[1] - b[1]);
      
      let k = 0;
      for (let h = 0; h < dists.length && k < this.kNeighbors; h++) {
        const [j, d] = dists[h];
        if (d <= this.linkDistance * 1.25) {
          this.links.push([i, j, d]);
          k++;
        }
      }
    }

    // Create line segments for links
    const L = this.links.length;
    const linkPos = new Float32Array(L * 2 * 3);
    
    for (let l = 0; l < L; l++) {
      const [i, j] = this.links[l];
      linkPos.set([pos.getX(i), pos.getY(i), pos.getZ(i)], l * 6 + 0);
      linkPos.set([pos.getX(j), pos.getY(j), pos.getZ(j)], l * 6 + 3);
    }
    
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
    
    this.linkMat = createLinkMaterial('#64ffda', 0.25);
    this.linkLines = new THREE.LineSegments(lg, this.linkMat);
    this.group.add(this.linkLines);
  }

  _buildLinks() {
    // Already built in _buildKNN
  }

  _setupInteraction() {
    window.addEventListener('pointermove', (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });
  }

  applyProfile(profile, instant = false) {
    if (!profile) return;
    
    const prev = this.activeProfile || profile;
    this.activeProfile = profile;

    const fromCol = prev.primary;
    const toCol = profile.primary;
    const fromLinkCap = this.linkDistance;
    const toLinkCap = profile.linkCap;
    const fromPulse = this.pulseHz;
    const toPulse = profile.pulseHz;

    const dur = instant ? 0 : 0.6;
    
    this._colorLerp = { 
      t: 0, 
      from: new THREE.Color(fromCol), 
      to: new THREE.Color(toCol), 
      dur 
    };
    
    this._linkCapLerp = { 
      t: 0, 
      from: fromLinkCap, 
      to: toLinkCap, 
      dur 
    };
    
    this._pulseLerp = { 
      t: 0, 
      from: fromPulse, 
      to: toPulse, 
      dur 
    };
  }

  resize() {
    // Optional viewport-aware scaling
  }

  update(delta) {
    this.timeAcc += delta;

    // Orbit sway
    const t = this.timeAcc * 0.2;
    this.group.rotation.y = Math.sin(t) * 0.1;
    this.group.rotation.x = Math.cos(t * 0.7) * 0.06;

    // Parallax follow pointer
    this.group.position.x += (this.pointer.x * 0.6 - this.group.position.x) * 0.08;
    this.group.position.y += (this.pointer.y * 0.4 - this.group.position.y) * 0.08;

    // Smooth color lerp
    if (this._colorLerp) {
      const l = this._colorLerp;
      l.t = Math.min(1, l.t + (l.dur ? delta / l.dur : 1));
      const c = l.from.clone().lerp(l.to, l.t);
      
      // Update node material color
      if (this.nodeMat.uniforms && this.nodeMat.uniforms.uColor) {
        this.nodeMat.uniforms.uColor.value.copy(c);
      }
      
      // Update link material color
      this.linkMat.color.copy(c);
      
      if (l.t === 1) this._colorLerp = null;
    }

    // Smooth link distance cap lerp
    if (this._linkCapLerp) {
      const L = this._linkCapLerp;
      L.t = Math.min(1, L.t + (L.dur ? delta / L.dur : 1));
      this.linkDistance = L.from + (L.to - L.from) * L.t;
      if (L.t === 1) this._linkCapLerp = null;
    }

    // Smooth pulse rate lerp
    if (this._pulseLerp) {
      const P = this._pulseLerp;
      P.t = Math.min(1, P.t + (P.dur ? delta / P.dur : 1));
      this.pulseHz = P.from + (P.to - P.from) * P.t;
      if (P.t === 1) this._pulseLerp = null;
    }

    // Pulse shimmer along links
    const baseOpacity = 0.22;
    const shimmer = 0.06 * Math.sin(this.timeAcc * (this.pulseHz * 2.0 + 0.3));
    this.linkMat.opacity = baseOpacity + shimmer;

    // Starfield drift
    if (this.stars) {
      this.stars.rotation.y += delta * 0.01;
    }
  }

  dispose() {
    // Cleanup
    if (this.nodes) {
      this.nodes.geometry.dispose();
      this.nodeMat.dispose();
    }
    if (this.linkLines) {
      this.linkLines.geometry.dispose();
      this.linkMat.dispose();
    }
    if (this.stars) {
      this.stars.geometry.dispose();
      this.stars.material.dispose();
    }
    this.scene.remove(this.group);
  }
}
