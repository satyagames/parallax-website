import * as THREE from 'three';

export function createLinkMaterial(color = '#64ffda', opacity = 0.25) {
  return new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}
