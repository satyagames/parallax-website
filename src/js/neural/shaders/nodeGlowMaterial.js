import * as THREE from 'three';

export function createNodeGlowMaterial(color = '#64ffda') {
  const vertexShader = `
    attribute float aSize;
    varying vec3 vColor;
    
    void main() {
      vColor = vec3(1.0);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * 60.0 * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    varying vec3 vColor;
    
    void main() {
      // Radial gradient for soft glow
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
      alpha = pow(alpha, 2.0);
      
      gl_FragColor = vec4(uColor * vColor, alpha * 0.9);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}
