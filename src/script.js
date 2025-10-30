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

for(let i = 0; i < 7; i++) {
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
    
    // Set initial color
    mesh.material.color.set(sectionColors[i]);
    
    sectionMeshes.push(mesh);
    scene.add(mesh);
    
    // Add secondary floating object for each section
    const smallGeometry = new THREE.TorusGeometry(0.3, 0.1, 16, 32);
    const smallMesh = new THREE.Mesh(smallGeometry, materials[i].clone());
    smallMesh.material.color.set(sectionColors[i]);
    smallMesh.position.x = mesh.position.x + (Math.random() - 0.5) * 2;
    smallMesh.position.y = mesh.position.y + (Math.random() - 0.5) * 2;
    smallMesh.position.z = mesh.position.z + (Math.random() - 0.5) * 2;
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

// Add point lights for each section
const pointLights = [];
for(let i = 0; i < 7; i++) {
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
    }, 200);
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
 * Scroll
 */
let currentSection = 0;
const totalSections = 7; // Updated to include all 7 sections
let isScrolling = false;

let startY = 0;
const sections = document.querySelectorAll('.section');

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Initialize sections
const initializeSections = () => {
    console.log('Initializing sections');
    sections.forEach((section, index) => {
        // Store the original index as a data attribute
        section.setAttribute('data-index', index.toString());
        
        if (index === 0) {
            section.setAttribute('data-active', 'true');
            section.style.transform = 'translateY(0)';
            section.style.opacity = '1';
            section.style.visibility = 'visible';
            section.style.display = 'flex';
        } else {
            section.setAttribute('data-active', 'false');
            section.setAttribute('data-direction', 'down');
            section.style.transform = 'translateY(100%)';
            section.style.opacity = '0';
            section.style.visibility = 'hidden';
            section.style.display = 'none';
        }
    });
    
    // Log section order for debugging
    sections.forEach(section => {
        console.log(`Section ${section.id}: index ${section.getAttribute('data-index')}`);
    });
};

let isDirectNavigating = false;

// Update sections visibility and position
const updateSections = (targetSection) => {
    if (isDirectNavigating) return;
    
    sections.forEach((section, index) => {
        if (index === targetSection) {
            section.setAttribute('data-active', 'true');
            section.style.visibility = 'visible';
            section.style.display = 'flex';
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
                    section.style.display = 'none';
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
        // Update navigation dots
        updateNavigationDots(nextSection);
        
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

        // Animate section objects with smooth morphing and color transitions
        const currentMeshIndex = currentSection * 2;
        const nextMeshIndex = nextSection * 2;
        
        if (sectionMeshes[currentMeshIndex]) {
            gsap.to(sectionMeshes[currentMeshIndex].material, {
                duration: 0.8,
                opacity: 0.3,
                ease: 'power2.inOut'
            });
            gsap.to(sectionMeshes[currentMeshIndex].scale, {
                duration: 0.8,
                x: 0.8,
                y: 0.8,
                z: 0.8,
                ease: 'power2.inOut'
            });
        }
        
        if (sectionMeshes[nextMeshIndex]) {
            // Smooth color transition
            const nextColor = new THREE.Color(sectionColors[nextSection]);
            gsap.to(sectionMeshes[nextMeshIndex].material.color, {
                duration: 1.2,
                r: nextColor.r,
                g: nextColor.g,
                b: nextColor.b,
                ease: 'power2.inOut'
            });
            
            gsap.to(sectionMeshes[nextMeshIndex].material, {
                duration: 0.8,
                opacity: 0.7,
                ease: 'power2.inOut'
            });
            gsap.to(sectionMeshes[nextMeshIndex].scale, {
                duration: 0.8,
                x: 1.0,
                y: 1.0,
                z: 1.0,
                ease: 'power2.inOut'
            });
            gsap.to(sectionMeshes[nextMeshIndex].rotation, {
                duration: 1,
                ease: 'power2.inOut',
                x: '+=6',
                y: '+=3',
                z: '+=1.5'
            });
        }
        
        // Blend all meshes colors smoothly
        sectionMeshes.forEach((mesh, i) => {
            const meshSection = Math.floor(i / 2);
            const targetColor = new THREE.Color(sectionColors[nextSection]);
            const blendAmount = Math.max(0, 1 - Math.abs(meshSection - nextSection) * 0.3);
            
            gsap.to(mesh.material.color, {
                duration: 1.2,
                r: targetColor.r * blendAmount + mesh.material.color.r * (1 - blendAmount * 0.3),
                g: targetColor.g * blendAmount + mesh.material.color.g * (1 - blendAmount * 0.3),
                b: targetColor.b * blendAmount + mesh.material.color.b * (1 - blendAmount * 0.3),
                ease: 'power2.inOut'
            });
        });
        
        // Blend particles during transition
        gsap.to(particles.material, {
            duration: 0.8,
            opacity: 0.6 + Math.random() * 0.4,
            ease: 'power2.inOut'
        });
        
        // Smooth light color transitions
        pointLights.forEach((light, i) => {
            const lightColor = new THREE.Color(sectionColors[nextSection]);
            gsap.to(light.color, {
                duration: 1.0,
                r: lightColor.r,
                g: lightColor.g,
                b: lightColor.b,
                ease: 'power2.inOut'
            });
        });
        
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

// Define section order mapping
const sectionOrder = {
    'hero': 0,
    'about': 1,
    'experience': 2,
    'work': 3,
    'skills': 4,
    'education': 5,
    'contact': 6
};

// Handle section navigation
const navigateToSection = (targetId) => {
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        const targetIndex = sectionOrder[targetId];
        if (targetIndex !== undefined && currentSection !== targetIndex) {
            const steps = targetIndex - currentSection;
            const direction = steps > 0 ? 1 : -1;
            const stepsCount = Math.abs(steps);
            
            let currentStep = 0;
            const scrollInterval = setInterval(() => {
                if (currentStep < stepsCount && !isScrolling) {
                    handleScroll(direction);
                    currentStep++;
                } else {
                    clearInterval(scrollInterval);
                }
            }, 800);
        }
    }
};

// Direct navigation function
const updateNavigationDots = (index) => {
    document.querySelectorAll('.nav-dot').forEach((dot, i) => {
        dot.style.background = i === index ? '#64ffda' : 'rgba(255, 255, 255, 0.3)';
    });
};

const directNavigateToSection = (targetIndex) => {
    if (targetIndex !== currentSection) {
        // Store current section for animation
        const currentSectionEl = sections[currentSection];
        const targetSectionEl = sections[targetIndex];

        // Show target section
        targetSectionEl.style.visibility = 'visible';
        targetSectionEl.style.display = 'flex';

        // Update navigation dots immediately
        updateNavigationDots(targetIndex);

        // Smooth mesh transitions
        const currentMeshIndex = currentSection * 2;
        const targetMeshIndex = targetIndex * 2;
        
        if (sectionMeshes[currentMeshIndex]) {
            gsap.to(sectionMeshes[currentMeshIndex].material, {
                duration: 0.8,
                opacity: 0.3,
                ease: 'power2.inOut'
            });
        }
        
        if (sectionMeshes[targetMeshIndex]) {
            const targetColor = new THREE.Color(sectionColors[targetIndex]);
            gsap.to(sectionMeshes[targetMeshIndex].material.color, {
                duration: 1.2,
                r: targetColor.r,
                g: targetColor.g,
                b: targetColor.b,
                ease: 'power2.inOut'
            });
            gsap.to(sectionMeshes[targetMeshIndex].material, {
                duration: 0.8,
                opacity: 0.7,
                ease: 'power2.inOut'
            });
        }
        
        // Blend all shapes smoothly
        sectionMeshes.forEach((mesh, i) => {
            const meshSection = Math.floor(i / 2);
            const targetColor = new THREE.Color(sectionColors[targetIndex]);
            const blendAmount = Math.max(0, 1 - Math.abs(meshSection - targetIndex) * 0.3);
            
            gsap.to(mesh.material.color, {
                duration: 1.2,
                r: targetColor.r * blendAmount + mesh.material.color.r * (1 - blendAmount * 0.3),
                g: targetColor.g * blendAmount + mesh.material.color.g * (1 - blendAmount * 0.3),
                b: targetColor.b * blendAmount + mesh.material.color.b * (1 - blendAmount * 0.3),
                ease: 'power2.inOut'
            });
        });

        // Animate the transition
        gsap.timeline()
            .to(currentSectionEl, {
                y: targetIndex > currentSection ? '-100%' : '100%',
                opacity: 0,
                duration: 0.8,
                ease: 'power2.inOut',
                onStart: () => {
                    currentSectionEl.setAttribute('data-active', 'false');
                }
            })
            .to(targetSectionEl, {
                y: '0%',
                opacity: 1,
                duration: 0.8,
                ease: 'power2.inOut',
                onStart: () => {
                    targetSectionEl.setAttribute('data-active', 'true');
                }
            }, '-=0.8')
            .to(camera.position, {
                y: -targetIndex * objectsDistance,
                duration: 0.8,
                ease: 'power2.inOut',
                onComplete: () => {
                    currentSection = targetIndex;
                    currentSectionEl.style.visibility = 'hidden';
                    currentSectionEl.style.display = 'none';
                }
            }, '-=0.8');
    }
};

// Handle click events for navigation
const initializeNavigation = () => {
    // Handle "View My Work" button specifically
    const workButton = document.querySelector('a[href="#work"]');
    if (workButton) {
        workButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Work button clicked');
            // Get the work section index
            const workSection = document.getElementById('work');
            const workIndex = Array.from(sections).indexOf(workSection);
            console.log('Work section index:', workIndex);
            directNavigateToSection(workIndex);
        });
    }

    // Handle all other section navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (anchor !== workButton) {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = anchor.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    const targetIndex = Array.from(sections).indexOf(targetSection);
                    directNavigateToSection(targetIndex);
                }
            });
        }
    });
};

// Initialize navigation when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
    initializeNavigation();
}

// Scroll event listeners
window.addEventListener('wheel', (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    handleScroll(direction);
}, { passive: false });

// Improved touch handling for mobile - allow scrolling inside content
let touchStartY = 0;
let touchStartX = 0;
let touchStartElement = null;

window.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
    touchStartElement = event.target;
}, { passive: true });

window.addEventListener('touchmove', (event) => {
    // Check if touch is inside a scrollable content area or sub-container
    const scrollableContainers = ['.content', '.timeline', '.about-wrapper', '.projects-container'];
    let isInsideScrollable = false;
    
    for (const selector of scrollableContainers) {
        if (event.target.closest(selector)) {
            isInsideScrollable = true;
            break;
        }
    }
    
    if (isInsideScrollable) {
        // Allow natural scrolling inside scrollable areas
        return;
    }
    
    // Prevent default only outside scrollable areas
    event.preventDefault();
}, { passive: false });

window.addEventListener('touchend', (event) => {
    if (isScrolling) return;
    
    // Check if the touch is inside a scrollable sub-container first
    const scrollableSubContainers = ['.timeline', '.about-wrapper', '.projects-container'];
    let scrollableElement = null;
    
    for (const selector of scrollableSubContainers) {
        scrollableElement = touchStartElement?.closest(selector);
        if (scrollableElement) break;
    }
    
    // If in a scrollable sub-container, handle its boundaries
    if (scrollableElement) {
        const scrollTop = scrollableElement.scrollTop;
        const scrollHeight = scrollableElement.scrollHeight;
        const clientHeight = scrollableElement.clientHeight;
        
        const touchEndY = event.changedTouches[0].clientY;
        const deltaY = touchStartY - touchEndY;
        const isScrollingDown = deltaY > 0;
        const isScrollingUp = deltaY < 0;
        
        const atTop = scrollTop <= 5;
        const atBottom = scrollTop + clientHeight >= scrollHeight - 5;
        
        // Only change section if at boundary with strong swipe (100px threshold)
        if ((atTop && isScrollingUp && Math.abs(deltaY) > 100) || 
            (atBottom && isScrollingDown && Math.abs(deltaY) > 100)) {
            const direction = isScrollingDown ? 1 : -1;
            handleScroll(direction);
        }
        return;
    }
    
    // Check if inside general content area
    const content = touchStartElement?.closest('.content');
    if (content) {
        const contentScrollTop = content.scrollTop;
        const contentScrollHeight = content.scrollHeight;
        const contentClientHeight = content.clientHeight;
        
        const touchEndY = event.changedTouches[0].clientY;
        const deltaY = touchStartY - touchEndY;
        const isScrollingDown = deltaY > 0;
        const isScrollingUp = deltaY < 0;
        
        const atTop = contentScrollTop <= 5;
        const atBottom = contentScrollTop + contentClientHeight >= contentScrollHeight - 5;
        
        // Only change section if at boundary with strong swipe (100px threshold)
        if ((atTop && isScrollingUp && Math.abs(deltaY) > 100) || 
            (atBottom && isScrollingDown && Math.abs(deltaY) > 100)) {
            const direction = isScrollingDown ? 1 : -1;
            handleScroll(direction);
        }
        return;
    }
    
    // Normal section scroll when not in any content area
    const endY = event.changedTouches[0].clientY;
    const direction = touchStartY > endY ? 1 : -1;
    
    if (Math.abs(touchStartY - endY) > 50) {
        handleScroll(direction);
    }
}, { passive: true });

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

        // Create a dot for each section
        for (let i = 0; i < totalSections; i++) {
            const dot = document.createElement('button');
            dot.className = 'nav-dot';
            dot.setAttribute('data-section', i.toString());
            dot.setAttribute('aria-label', `Go to section ${i + 1}`);
            dot.style.cssText = `
                width: ${isMobile ? '12px' : '10px'};
                height: ${isMobile ? '12px' : '10px'};
                padding: ${isMobile ? '8px' : '6px'};
                border-radius: 50%;
                background: ${i === currentSection ? '#64ffda' : 'rgba(255, 255, 255, 0.3)'};
                border: 2px solid ${i === currentSection ? '#64ffda' : 'transparent'};
                cursor: pointer;
                transition: all 0.3s ease;
                touch-action: manipulation;
                -webkit-tap-highlight-color: rgba(100, 255, 218, 0.3);
            `;
            dot.addEventListener('click', () => {
                if (!isScrolling && currentSection !== i) {
                    directNavigateToSection(i);
                }
            });
            nav.appendChild(dot);
        }

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

    // Update camera position for section transitions
    const targetCameraY = -currentSection * objectsDistance;
    camera.position.y += (targetCameraY - camera.position.y) * 5 * deltaTime;
    
    // Calculate and apply camera rotation based on scroll progress
    const progress = currentSection / (totalSections - 1);
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
            // Animate main objects
            mesh.rotation.x = elapsedTime * 0.1 + Math.sin(elapsedTime * 0.3) * 0.1;
            mesh.rotation.y = elapsedTime * 0.15 + Math.cos(elapsedTime * 0.4) * 0.1;
            
            const baseY = -objectsDistance * Math.floor(i/2);
            mesh.position.y = baseY + Math.sin(elapsedTime * 0.5 + i) * 0.2;
            mesh.position.x += (Math.sin(elapsedTime * 0.3 + i) * 0.15 - mesh.position.x) * deltaTime;
            mesh.position.z += (Math.cos(elapsedTime * 0.2 + i) * 0.15 - mesh.position.z) * deltaTime;
            
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
        initializeSections();
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