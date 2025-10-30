import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Parameters
 */
const parameters = {
    materialColor: '#64ffda',
    particleColor: '#ffffff',
    particleCount: 1000,
    galaxyRadius: 10
};

/**
 * Loading Manager
 */
let isLoadingComplete = false;

const loadingManager = new THREE.LoadingManager();

// Setup loading manager handlers
loadingManager.onLoad = () => {
    if (isLoadingComplete) return;
    isLoadingComplete = true;

    try {
        // Initialize sections first
        const sections = document.querySelectorAll('.section');
        if (!sections.length) {
            console.error('No sections found in the document');
            return;
        }

        // Initialize sections and setup page
        sections.forEach((section, index) => {
            section.style.visibility = index === 0 ? 'visible' : 'hidden';
            section.style.opacity = index === 0 ? '1' : '0';
            section.setAttribute('data-active', index === 0 ? 'true' : 'false');
        });

        setupPage();

        // Handle loading screen
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            requestAnimationFrame(() => {
                gsap.to(loadingScreen, {
                    opacity: 0,
                    duration: 0.5,
                    onComplete: () => {
                        loadingScreen.style.display = 'none';
                        
                        // Ensure first section is visible
                        const firstSection = sections[0];
                        if (firstSection) {
                            firstSection.style.visibility = 'visible';
                            firstSection.style.opacity = '1';
                            firstSection.style.transform = 'translateY(0)';
                        }
                    }
                });
            });
        }
    } catch (error) {
        console.error('Error during loading completion:', error);
        // Force remove loading screen after error
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
};

loadingManager.onProgress = (itemUrl, itemsLoaded, itemsTotal) => {
    try {
        const progressRatio = itemsLoaded / itemsTotal;
        const loadingText = document.querySelector('.loader-content h2');
        if (loadingText) {
            loadingText.textContent = `Loading Experience ${Math.round(progressRatio * 100)}%`;
        }
    } catch (error) {
        console.error('Error updating loading progress:', error);
    }
};

loadingManager.onError = (url) => {
    console.error('Error loading resource:', url);
    // Force remove loading screen after error
    const loadingScreen = document.querySelector('.loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
};

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

// Textures with Loading Manager
const textureLoader = new THREE.TextureLoader(loadingManager);

/**
 * Objects
 */
// Materials
const material = new THREE.MeshPhysicalMaterial({
    color: parameters.materialColor,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
});

// Objects
const objectsDistance = 4;
const geometries = [
    new THREE.TorusGeometry(1, 0.3, 32, 100), // Hero
    new THREE.OctahedronGeometry(1.2, 1), // About
    new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16), // Experience
    new THREE.IcosahedronGeometry(1, 0), // Skills
    new THREE.ConeGeometry(0.8, 1.5, 32), // Education
    new THREE.SphereGeometry(1, 32, 32) // Contact
];

const materials = geometries.map(() => {
    return new THREE.MeshPhysicalMaterial({
        color: parameters.materialColor,
        metalness: 0.8,
        roughness: 0.1,
        transmission: 0.3,
        thickness: 1,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        envMapIntensity: 2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });
});

const sectionMeshes = [];

for(let i = 0; i < 6; i++) {
    const geometry = geometries[i];
    const mesh = new THREE.Mesh(geometry, materials[i]);
    
    // Position objects in a more interesting pattern
    const radius = 3;
    const angle = (i / 6) * Math.PI * 2;
    mesh.position.x = Math.sin(angle) * radius;
    mesh.position.y = - objectsDistance * i;
    mesh.position.z = Math.cos(angle) * radius - 2;
    
    // Random initial rotation
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    
    // Scale based on section
    const scale = 1 - (i * 0.05);
    mesh.scale.set(scale, scale, scale);
    
    sectionMeshes.push(mesh);
    scene.add(mesh);
    
    // Add secondary floating object for each section
    const smallGeometry = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
    const smallMesh = new THREE.Mesh(smallGeometry, materials[i]);
    smallMesh.position.x = mesh.position.x + (Math.random() - 0.5) * 2;
    smallMesh.position.y = mesh.position.y + (Math.random() - 0.5) * 2;
    smallMesh.position.z = mesh.position.z + (Math.random() - 0.5) * 2;
    scene.add(smallMesh);
    sectionMeshes.push(smallMesh);
}

// Create floating rings
const ringGeometry = new THREE.TorusGeometry(0.3, 0.04, 16, 32);
const ringMaterial = new THREE.MeshPhysicalMaterial({
    color: parameters.materialColor,
    metalness: 1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.8
});

const rings = [];
for(let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
    );
    ring.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    rings.push(ring);
    scene.add(ring);
}

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 2);
directionalLight.position.set(1, 1, 0);
scene.add(directionalLight);

const secondaryLight = new THREE.DirectionalLight('#64ffda', 1);
secondaryLight.position.set(-1, -1, -1);
scene.add(secondaryLight);

const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);
scene.add(ambientLight);

// Add point lights for each section
const pointLights = [];
for(let i = 0; i < 6; i++) {
    const light = new THREE.PointLight('#64ffda', 0.5, 10);
    light.position.y = - objectsDistance * i;
    pointLights.push(light);
    scene.add(light);
}

/**
 * Particles
 */
const generateGalaxy = () => {
    const positions = new Float32Array(parameters.particleCount * 3);
    const colors = new Float32Array(parameters.particleCount * 3);
    const scales = new Float32Array(parameters.particleCount);

    const insideColor = new THREE.Color(parameters.materialColor);
    const outsideColor = new THREE.Color(parameters.particleColor);

    for(let i = 0; i < parameters.particleCount; i++) {
        const radius = Math.random() * parameters.galaxyRadius;
        const spinAngle = radius * 5;
        const branchAngle = ((i % 3) / 3) * Math.PI * 2;

        const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.3;
        const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.3;
        const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * 0.3;

        positions[i * 3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
        positions[i * 3 + 1] = randomY - (radius * 0.5);
        positions[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

        const mixedColor = insideColor.clone();
        mixedColor.lerp(outsideColor, radius / parameters.galaxyRadius);

        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;

        scales[i] = Math.random();
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particlesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.03,
        sizeAttenuation: true,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    return particles;
};

const particles = generateGalaxy();

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const cameraGroup = new THREE.Group();
scene.add(cameraGroup);

const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
camera.position.z = 6;
cameraGroup.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setClearColor(0x0a0a0f, 1);
renderer.setClearAlpha(1.0);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Scroll
 */
let currentSection = 0;
const totalSections = 6;
let isScrolling = false;

let startY = 0;
const sections = document.querySelectorAll('.section');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Initialize sections
const initializeSections = () => {
    sections.forEach((section, index) => {
        if (index === 0) {
            section.setAttribute('data-active', 'true');
            section.style.transform = 'translateY(0)';
            section.style.opacity = '1';
            section.style.visibility = 'visible';
        } else {
            section.setAttribute('data-active', 'false');
            section.setAttribute('data-direction', 'down');
            section.style.transform = 'translateY(100%)';
            section.style.opacity = '0';
            section.style.visibility = 'hidden';
        }
    });
};

// Update sections visibility and position
const updateSections = (targetSection) => {
    sections.forEach((section, index) => {
        if (index === targetSection) {
            section.setAttribute('data-active', 'true');
            section.style.visibility = 'visible';
            requestAnimationFrame(() => {
                section.style.transform = 'translateY(0)';
                section.style.opacity = '1';
            });
        } else {
            section.setAttribute('data-active', 'false');
            const direction = index < targetSection ? 'up' : 'down';
            section.setAttribute('data-direction', direction);
            section.style.transform = `translateY(${direction === 'up' ? '-100%' : '100%'})`;
            section.style.opacity = '0';
            setTimeout(() => {
                if (section.getAttribute('data-active') === 'false') {
                    section.style.visibility = 'hidden';
                }
            }, 800);
        }
    });
};

// Universal scroll handler
const handleScroll = (direction) => {
    if (isScrolling) return;
    
    const nextSection = currentSection + direction;
    
    if (nextSection >= 0 && nextSection < totalSections) {
        isScrolling = true;
        
        const currentSectionEl = sections[currentSection];
        const nextSectionEl = sections[nextSection];
        
        // Show next section before animation
        nextSectionEl.style.visibility = 'visible';
        nextSectionEl.style.display = 'flex';
        nextSectionEl.style.transform = `translateY(${direction > 0 ? '100%' : '-100%'})`;
        nextSectionEl.style.opacity = '0';
        
        // Use GSAP for smoother animations
        gsap.timeline()
            .to(currentSectionEl, {
                y: direction > 0 ? '-100%' : '100%',
                opacity: 0,
                duration: 0.8,
                ease: 'power2.inOut',
                onStart: () => {
                    currentSectionEl.setAttribute('data-active', 'false');
                }
            })
            .to(nextSectionEl, {
                y: '0%',
                opacity: 1,
                duration: 0.8,
                ease: 'power2.inOut',
                onStart: () => {
                    nextSectionEl.setAttribute('data-active', 'true');
                }
            }, '-=0.8')
            .to(camera.position, {
                y: -nextSection * objectsDistance,
                duration: 0.8,
                ease: 'power2.inOut'
            }, '-=0.8');

        // Animate section objects
        if (sectionMeshes[nextSection]) {
            gsap.to(sectionMeshes[nextSection].rotation, {
                duration: 1,
                ease: 'power2.inOut',
                x: '+=6',
                y: '+=3',
                z: '+=1.5'
            });
        }
        
        // Update navigation dots
        document.querySelectorAll('.nav-dot').forEach((dot, index) => {
            dot.style.background = index === nextSection ? '#64ffda' : 'rgba(255, 255, 255, 0.3)';
        });
        
        // Reset after animation
        setTimeout(() => {
            currentSectionEl.style.visibility = 'hidden';
            currentSectionEl.style.display = 'none';
            isScrolling = false;
            currentSection = nextSection;
        }, 800);
    } else {
        isScrolling = false;
    }
};

// Scroll event listeners
window.addEventListener('wheel', (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    handleScroll(direction);
}, { passive: false });

window.addEventListener('touchstart', (event) => {
    startY = event.touches[0].clientY;
}, { passive: false });

window.addEventListener('touchmove', (event) => {
    event.preventDefault();
}, { passive: false });

window.addEventListener('touchend', (event) => {
    if (isScrolling) return;
    const endY = event.changedTouches[0].clientY;
    const direction = startY > endY ? 1 : -1;
    
    if (Math.abs(startY - endY) > 50) {
        handleScroll(direction);
    }
});

window.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'ArrowDown':
        case 'PageDown':
            handleScroll(1);
            break;
        case 'ArrowUp':
        case 'PageUp':
            handleScroll(-1);
            break;
    }
});

// Setup page with navigation
const setupPage = () => {
    if (!document.querySelector('.section-nav')) {
        const nav = document.createElement('div');
        nav.className = 'section-nav';
        nav.style.cssText = `
            position: fixed;
            right: 20px;
            top: 50%;
            transform: translateY(-50%);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        sections.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'nav-dot';
            dot.style.cssText = `
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: ${i === 0 ? '#64ffda' : 'rgba(255, 255, 255, 0.3)'};
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
            `;
            dot.addEventListener('click', () => {
                if (!isScrolling && currentSection !== i) {
                    const direction = i > currentSection ? 1 : -1;
                    handleScroll(direction);
                }
            });
            nav.appendChild(dot);
        });

        document.body.appendChild(nav);
    }
};

/**
 * Animation
 */
const cursor = {
    x: 0,
    y: 0
};

window.addEventListener('mousemove', (event) => {
    cursor.x = event.clientX / sizes.width - 0.5;
    cursor.y = event.clientY / sizes.height - 0.5;
});

const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;

    const targetCameraY = - currentSection * objectsDistance;
    camera.position.y += (targetCameraY - camera.position.y) * 5 * deltaTime;
    
    const scrollProgress = currentSection / (totalSections - 1);
    camera.rotation.z = Math.sin(scrollProgress * Math.PI) * 0.1;

    const parallaxX = cursor.x * 0.5;
    const parallaxY = - cursor.y * 0.5;
    cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 3 * deltaTime;
    cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 3 * deltaTime;

    sectionMeshes.forEach((mesh, i) => {
        const isMainObject = i % 2 === 0;
        if (isMainObject) {
            mesh.rotation.x = elapsedTime * 0.1;
            mesh.rotation.y = elapsedTime * 0.15;
            
            mesh.position.y = - objectsDistance * Math.floor(i/2) + Math.sin(elapsedTime * 0.5) * 0.2;
            mesh.position.x += (Math.sin(elapsedTime * 0.3) * 0.1 - mesh.position.x) * deltaTime;
            mesh.position.z += (Math.cos(elapsedTime * 0.2) * 0.1 - mesh.position.z) * deltaTime;
        } else {
            mesh.rotation.x = elapsedTime * 0.2;
            mesh.rotation.y = elapsedTime * 0.3;
            mesh.rotation.z = elapsedTime * 0.1;
            
            const mainMesh = sectionMeshes[i - 1];
            const angle = elapsedTime * 0.5;
            const radius = 1.5;
            mesh.position.x = mainMesh.position.x + Math.cos(angle) * radius;
            mesh.position.y = mainMesh.position.y + Math.sin(angle) * radius;
            mesh.position.z = mainMesh.position.z + Math.sin(angle * 2) * radius;
        }
    });

    pointLights.forEach((light, i) => {
        light.position.y = - objectsDistance * i + Math.sin(elapsedTime * 0.5) * 0.5;
        light.intensity = 0.5 + Math.sin(elapsedTime * 0.5) * 0.2;
    });

    particles.rotation.y = elapsedTime * 0.05;
    particles.position.y = Math.sin(elapsedTime * 0.2) * 0.2;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
};

// Initialize everything
if (!loadingManager.isStarted) {
    loadingManager.onLoad();
}

// Failsafe initialization
setTimeout(() => {
    if (!isLoadingComplete) {
        console.log('Force initializing page...');
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        initializeSections();
        setupPage();
    }
}, 3000);

// Start animation
tick();