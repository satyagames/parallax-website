import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Mobile Detection
 */
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

/**
 * Parameters
 */
const parameters = {
    materialColor: '#64ffda',
    particleColor: '#ffffff',
    particleCount: isMobile ? 500 : 1000, // Reduce particles on mobile for better performance
    galaxyRadius: 10
};

// Section color palette for smooth blending
const sectionColors = [
    '#64ffda', // Hero - cyan
    '#7b68ee', // About - medium slate blue
    '#ff6b9d', // Experience - pink
    '#ffa500', // Work - orange
    '#00ff88', // Skills - green
    '#4169e1', // Education - royal blue
    '#ff1493'  // Contact - deep pink
];

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
        // Setup navigation system
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
    new THREE.IcosahedronGeometry(1, 0), // Work
    new THREE.ConeGeometry(0.8, 1.5, 32), // Skills
    new THREE.SphereGeometry(1, 32, 32), // Education
    new THREE.DodecahedronGeometry(1, 0) // Contact
];

const materials = geometries.map(() => {
    return new THREE.MeshPhysicalMaterial({
        color: parameters.materialColor,
        metalness: 0.9,
        roughness: 0.05,
        transmission: 0.3,
        thickness: 0.8,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        envMapIntensity: 3,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        premultipliedAlpha: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
});

const sectionMeshes = [];

// Desktop layout: Odd sections (0,2,4,6) - content LEFT, objects RIGHT
// Even sections (1,3,5) - content RIGHT, objects LEFT
// Mobile: objects centered
const isMobileLayout = window.innerWidth <= 768;

for(let i = 0; i < 7; i++) {
    const geometry = geometries[i];
    const mesh = new THREE.Mesh(geometry, materials[i]);
    
    // Position objects on opposite side of content
    let xPosition;
    if (isMobileLayout) {
        // Mobile: keep centered with slight variation
        const angle = (i / 6) * Math.PI * 2;
        xPosition = Math.sin(angle) * 1.5;
    } else {
        // Desktop: alternate left/right based on section
        // Odd sections (0,2,4,6): content on left, objects on RIGHT (+2 to +3)
        // Even sections (1,3,5): content on right, objects on LEFT (-2 to -3)
        const isOddSection = i % 2 === 0;
        xPosition = isOddSection ? 2.5 : -2.5;
    }
    
    mesh.position.x = xPosition;
    mesh.position.y = - objectsDistance * i;
    mesh.position.z = -2;
    
    // Random initial rotation
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    
    // Scale based on section
    const scale = 1 - (i * 0.05);
    mesh.scale.set(scale, scale, scale);
    
    // Set initial color
    mesh.material.color.set(sectionColors[i]);
    
    sectionMeshes.push(mesh);
    scene.add(mesh);
    
    // Add secondary floating object for each section
    const smallGeometry = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
    const smallMesh = new THREE.Mesh(smallGeometry, materials[i].clone());
    smallMesh.material.color.set(sectionColors[i]);
    smallMesh.position.x = mesh.position.x + (Math.random() - 0.5) * 1;
    smallMesh.position.y = mesh.position.y + (Math.random() - 0.5) * 2;
    smallMesh.position.z = mesh.position.z + (Math.random() - 0.5) * 1;
    scene.add(smallMesh);
    sectionMeshes.push(smallMesh);
}

// Create floating rings with blend modes
const ringGeometry = new THREE.TorusGeometry(0.3, 0.04, 16, 32);
const ringMaterial = new THREE.MeshPhysicalMaterial({
    color: parameters.materialColor,
    metalness: 1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.9,
    premultipliedAlpha: true,
    envMapIntensity: 2.5,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});

const rings = [];
for(let i = 0; i < 5; i++) {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial.clone());
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

// Add point lights for each section - positioned with objects
const pointLights = [];
for(let i = 0; i < 7; i++) {
    const light = new THREE.PointLight('#64ffda', 0.5, 10);
    light.position.y = - objectsDistance * i;
    
    // Position lights near the objects (opposite side of content)
    if (!isMobileLayout) {
        const isOddSection = i % 2 === 0;
        light.position.x = isOddSection ? 2.5 : -2.5;
    } else {
        light.position.x = 0;
    }
    
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

// Handle resize with debouncing for better mobile performance
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;

        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();

        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }, 100);
});

// Handle orientation change on mobile
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;

        camera.aspect = sizes.width / sizes.height;
        camera.updateProjectionMatrix();

        renderer.setSize(sizes.width, sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Update object positions on resize
        updateObjectPositions();
    }, 200);
});

// Update object positions based on screen size
function updateObjectPositions() {
    const isDesktop = window.innerWidth > 768;
    sectionMeshes.forEach((mesh, i) => {
        const isMainObject = i % 2 === 0;
        if (isMainObject) {
            const sectionIndex = Math.floor(i / 2);
            const isOddSection = sectionIndex % 2 === 0;
            mesh.position.x = isDesktop ? (isOddSection ? 2.5 : -2.5) : 0;
        }
    });
    
    pointLights.forEach((light, i) => {
        const isOddSection = i % 2 === 0;
        light.position.x = isDesktop ? (isOddSection ? 2.5 : -2.5) : 0;
    });
}

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
    antialias: !isMobile, // Disable antialiasing on mobile for better performance
    powerPreference: isMobile ? 'default' : 'high-performance'
});
renderer.setClearColor(0x0a0a0f, 1);
renderer.setClearAlpha(1.0);
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)); // Lower pixel ratio on mobile
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputEncoding = THREE.sRGBEncoding;

/**
 * Native Scroll-Snap Navigation System
 */
const scroller = document.querySelector('.sections-container');
const sectionEls = [...document.querySelectorAll('.section')];
const sectionIds = sectionEls.map(el => el.id);
const totalSections = sectionEls.length;

let currentSection = 0;
let isSnapping = false;

// Respect reduced motion preference
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Helper to get viewport height
const vh = () => scroller ? scroller.clientHeight : window.innerHeight;

// Build dot navigation
const dotNav = document.querySelector('.section-dots');
if (dotNav && sectionIds.length > 0) {
    dotNav.innerHTML = sectionIds.map((id, i) => 
        `<button type="button" data-i="${i}" aria-label="Go to ${id}" title="${id}"></button>`
    ).join('');
    
    dotNav.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        const i = +b.dataset.i;
        if (scroller) {
            scroller.scrollTo({ top: i * vh(), behavior: 'smooth' });
        }
    });
}

// Announce section changes and update dot nav
function setActiveSection(i) {
    currentSection = Math.max(0, Math.min(totalSections - 1, i));
    
    // Update dot nav
    if (dotNav) {
        dotNav.querySelectorAll('button').forEach((b, bi) => {
            b.setAttribute('aria-current', bi === currentSection ? 'true' : 'false');
        });
    }
    
    // Announce to screen readers
    const status = document.getElementById('sr-status');
    if (status) {
        status.textContent = `Section ${currentSection + 1} of ${totalSections}: ${sectionIds[currentSection]}`;
    }
    
    // Update URL hash
    if (history.replaceState) {
        history.replaceState(null, '', `#${sectionIds[currentSection]}`);
    }
}

// Scroll-driven camera and color updates
if (scroller) {
    scroller.addEventListener('scroll', () => {
        const y = scroller.scrollTop;
        const indexFloat = y / vh(); // 0..6 continuous
        
        // Smoothly drive camera position
        const targetCamY = -indexFloat * objectsDistance;
        // Camera lerping happens in tick() function
        
        // Update active section when crossing threshold
        const newIndex = Math.round(indexFloat);
        if (newIndex !== currentSection) {
            setActiveSection(newIndex);
        }
    }, { passive: true });
}

// Velocity-aware snap on pointer end (mobile polish)
let touchStartY = 0;
let lastY = 0;
let lastT = 0;
let velocity = 0;

if (scroller) {
    scroller.addEventListener('pointerdown', e => {
        lastY = touchStartY = e.clientY;
        lastT = performance.now();
        velocity = 0;
    }, { passive: true });

    scroller.addEventListener('pointermove', e => {
        const now = performance.now();
        const dy = e.clientY - lastY;
        const dt = now - lastT || 1;
        velocity = dy / dt; // px per ms
        lastY = e.clientY;
        lastT = now;
    }, { passive: true });

    scroller.addEventListener('pointerup', () => {
        if (prefersReduced || isSnapping) return; // Let browser snap if reduced motion
        
        const iFloat = scroller.scrollTop / vh();
        let target = Math.round(iFloat);

        const progress = iFloat - Math.floor(iFloat); // 0..1 into current section
        const v = -velocity; // positive when swiping up

        // Velocity and progress thresholds
        const velocityThresh = 0.45; // px/ms
        const progressThresh = 0.48;
        
        if (v > velocityThresh) {
            target = Math.floor(iFloat) + 1;
        } else if (v < -velocityThresh) {
            target = Math.ceil(iFloat) - 1;
        } else if (progress > progressThresh) {
            target = Math.ceil(iFloat);
        } else {
            target = Math.floor(iFloat);
        }

        target = Math.max(0, Math.min(totalSections - 1, target));
        
        isSnapping = true;
        scroller.scrollTo({ top: target * vh(), behavior: 'smooth' });
        
        // Optional haptic feedback
        if (navigator.vibrate && target !== currentSection) {
            navigator.vibrate(10);
        }
        
        setTimeout(() => { isSnapping = false; }, 380);
    }, { passive: true });
}

// Deep-link on load: if hash exists, jump to section
const initializeDeepLink = () => {
    const hash = location.hash.slice(1);
    const hashIndex = Math.max(0, sectionIds.indexOf(hash));
    if (hashIndex > 0 && scroller) {
        // Use instant behavior on load
        scroller.scrollTo({ top: hashIndex * vh(), behavior: 'instant' });
        setActiveSection(hashIndex);
    } else {
        setActiveSection(0);
    }
};

// Convert internal anchor links to smooth scrolls
const initializeAnchorLinks = () => {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href').slice(1);
            const idx = sectionIds.indexOf(id);
            if (idx > -1 && scroller) {
                e.preventDefault();
                scroller.scrollTo({ top: idx * vh(), behavior: 'smooth' });
            }
        });
    });
};

// REMOVED: Old manual scroll handler - now using native scroll-snap
// All section transitions handled by browser + smooth camera following in tick()

// Setup page with navigation
const setupPage = () => {
    // Initialize anchor links and deep-linking
    initializeDeepLink();
    initializeAnchorLinks();
};

// REMOVED: ALL OLD NAVIGATION CODE - NOW USES SCROLL-SNAP
// All old GSAP section animations, handleScroll, nav dot creation removed
// New system: native browser scroll-snap + velocity-aware pointer handlers above

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

    // Update camera position from scroll - smooth continuous following
    let indexFloat = currentSection; // Default to discrete section
    if (scroller) {
        // Calculate continuous scroll position (0..6 for 7 sections)
        indexFloat = scroller.scrollTop / vh();
    }
    const targetCameraY = -indexFloat * objectsDistance;
    camera.position.y += (targetCameraY - camera.position.y) * 5 * deltaTime;
    
    // Calculate and apply camera rotation based on scroll progress
    const progress = indexFloat / (totalSections - 1);
    camera.rotation.z = Math.sin(progress * Math.PI) * 0.1;

    // Apply parallax effect
    const parallaxX = cursor.x * 0.5;
    const parallaxY = -cursor.y * 0.5;
    cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 3 * deltaTime;
    cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 3 * deltaTime;

    // Update meshes animations with smooth blending effects
    sectionMeshes.forEach((mesh, i) => {
        const isMainObject = i % 2 === 0;
        const sectionIndex = Math.floor(i / 2);
        const distanceFromCurrent = Math.abs(sectionIndex - currentSection);
        
        // Calculate blend factor based on distance from current section
        const blendFactor = Math.max(0, 1 - distanceFromCurrent * 0.3);
        
        if (isMainObject) {
            // Determine base X position (alternating left/right)
            const isDesktop = window.innerWidth > 768;
            const isOddSection = sectionIndex % 2 === 0;
            const baseX = isDesktop ? (isOddSection ? 2.5 : -2.5) : 0;
            
            // Animate main objects
            mesh.rotation.x = elapsedTime * 0.1 + Math.sin(elapsedTime * 0.3) * 0.1;
            mesh.rotation.y = elapsedTime * 0.15 + Math.cos(elapsedTime * 0.4) * 0.1;
            
            const baseY = -objectsDistance * Math.floor(i/2);
            mesh.position.y = baseY + Math.sin(elapsedTime * 0.5 + i) * 0.2;
            // Keep X near base position with subtle oscillation
            mesh.position.x = baseX + Math.sin(elapsedTime * 0.3 + i) * 0.15;
            mesh.position.z = -2 + Math.cos(elapsedTime * 0.2 + i) * 0.15;
            
            // Smooth opacity blending based on distance
            const targetOpacity = sectionIndex === currentSection ? 0.7 : 0.3 + blendFactor * 0.2;
            mesh.material.opacity += (targetOpacity - mesh.material.opacity) * deltaTime * 2;
            
            // Smooth scale blending
            const targetScale = sectionIndex === currentSection ? 1.0 : 0.8 + blendFactor * 0.15;
            mesh.scale.x += (targetScale - mesh.scale.x) * deltaTime * 2;
            mesh.scale.y += (targetScale - mesh.scale.y) * deltaTime * 2;
            mesh.scale.z += (targetScale - mesh.scale.z) * deltaTime * 2;
            
            // Color blending based on proximity
            const currentColor = new THREE.Color(sectionColors[currentSection]);
            const targetColor = new THREE.Color(sectionColors[sectionIndex]);
            mesh.material.color.lerp(targetColor, deltaTime * blendFactor * 0.5);
            if (sectionIndex === currentSection) {
                mesh.material.color.lerp(currentColor, deltaTime * 2);
            }
        } else {
            // Animate secondary objects with orbital motion
            mesh.rotation.x = elapsedTime * 0.2;
            mesh.rotation.y = elapsedTime * 0.3;
            mesh.rotation.z = elapsedTime * 0.1;
            
            const mainMesh = sectionMeshes[i - 1];
            if (mainMesh) {
                const angle = elapsedTime * 0.5 + i;
                const radius = 1.5 + Math.sin(elapsedTime * 0.3) * 0.2;
                mesh.position.x = mainMesh.position.x + Math.cos(angle) * radius;
                mesh.position.y = mainMesh.position.y + Math.sin(angle) * radius;
                mesh.position.z = mainMesh.position.z + Math.sin(angle * 2) * radius;
                
                // Sync opacity with main mesh for smooth blending
                mesh.material.opacity = mainMesh.material.opacity * 0.6;
            }
        }
    });

    pointLights.forEach((light, i) => {
        // Keep lights positioned on the same side as objects
        const isDesktop = window.innerWidth > 768;
        const isOddSection = i % 2 === 0;
        const baseX = isDesktop ? (isOddSection ? 2.5 : -2.5) : 0;
        
        light.position.x = baseX;
        light.position.y = - objectsDistance * i + Math.sin(elapsedTime * 0.5) * 0.5;
        const distanceFromCurrent = Math.abs(i - currentSection);
        const lightBlend = Math.max(0, 1 - distanceFromCurrent * 0.4);
        light.intensity = 0.3 + lightBlend * 0.4 + Math.sin(elapsedTime * 0.5) * 0.1;
    });

    // Animate particles with smooth flow
    particles.rotation.y = elapsedTime * 0.05;
    particles.position.y = Math.sin(elapsedTime * 0.2) * 0.2;
    particles.position.x = Math.cos(elapsedTime * 0.15) * 0.1;
    
    // Smooth rings animation for blending effect
    rings.forEach((ring, i) => {
        ring.rotation.x += deltaTime * 0.2 * (i % 2 === 0 ? 1 : -1);
        ring.rotation.y += deltaTime * 0.3;
        ring.rotation.z += deltaTime * 0.1 * (i % 2 === 0 ? -1 : 1);
        
        // Pulsating opacity for blend effect
        const pulse = Math.sin(elapsedTime * 0.5 + i) * 0.5 + 0.5;
        ring.material.opacity = 0.5 + pulse * 0.4;
    });

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
        setupPage();
    }
}, 3000);

/**
 * Project Section Interactivity
 * (Defined below after loading manager)
 */

// Start animation
tick();

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
        setupPage();
    }
}, 3000);

/**
 * Project Section Interactivity
 */

// Project expand/collapse functionality
const initProjectInteractivity = () => {
    // Expand/Collapse functionality
    const expandButtons = document.querySelectorAll('.expand-btn');
    expandButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = button.closest('.project-card');
            const content = card.querySelector('.project-content');
            
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
            }
        });
    });

    // Filter functionality
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Filter projects with animation
            projectCards.forEach((card, index) => {
                const categories = card.getAttribute('data-category');
                
                setTimeout(() => {
                    if (filter === 'all' || categories.includes(filter)) {
                        card.classList.remove('hidden');
                        setTimeout(() => {
                            card.style.animation = 'fadeInUp 0.5s ease forwards';
                        }, 50);
                    } else {
                        card.style.animation = 'fadeOut 0.3s ease forwards';
                        setTimeout(() => {
                            card.classList.add('hidden');
                        }, 300);
                    }
                }, index * 50);
            });
        });
    });
};

// Initialize project interactivity when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProjectInteractivity);
} else {
    initProjectInteractivity();
}

// Start animation
tick();