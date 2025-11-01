import * as THREE from 'three';
import gsap from 'gsap';
import { SceneOrchestrator } from './js/hero/SceneOrchestrator.js';
import { SECTION_PROFILES } from './js/hero/palettes.js';
import { CursorController } from './js/hero/input/CursorController.js';
import { ProfilerHUD, setupHUDToggle } from './js/perf/ProfilerHUD.js';

/**
 * Mobile Detection (Enhanced)
 */
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

// Detect specific mobile features for optimization
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);
const isLowEndDevice = isMobile && (navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4);

/**
 * Parameters (Mobile-Optimized)
 */
const parameters = {
    materialColor: '#64ffda',
    particleColor: '#ffffff',
    particleCount: isMobile ? (isLowEndDevice ? 300 : 500) : 1000, // Extra reduction for low-end devices
    galaxyRadius: 10
};

// Neural network will be initialized after DOM is ready

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

// Scene Orchestrator - cinematic dual-layer hero
let orchestrator = null;

/**
 * Lights - Will be added to orchestrator scene after initialization
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 2);
directionalLight.position.set(1, 1, 0);

const secondaryLight = new THREE.DirectionalLight('#64ffda', 1);
secondaryLight.position.set(-1, -1, -1);

// Orchestrator has its own ambient light, so we can skip this
// const ambientLight = new THREE.AmbientLight('#ffffff', 0.5);

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
    // Don't add to scene yet - orchestrator will add it
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
        
        // Update orchestrator on resize
        if (orchestrator) {
            orchestrator.resize();
        }
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
        const maxDPR = isMobile ? (isLowEndDevice ? 1.0 : 1.5) : 2.0;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
        
        // Update object positions on resize
        // Neural network handles its own positioning
    }, 200);
});

// Mobile memory pressure detection (Chrome/Safari)
if (isMobile && 'memory' in performance) {
    let lastMemoryCheck = 0;
    const checkMemoryPressure = () => {
        const now = performance.now();
        if (now - lastMemoryCheck < 5000) return; // Check every 5 seconds
        lastMemoryCheck = now;
        
        const memInfo = performance.memory;
        const usedPercent = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        
        // If using >80% of heap, reduce quality
        if (usedPercent > 0.8 && orchestrator) {
            console.warn('High memory usage detected, reducing quality');
            // Could trigger layer cleanup or quality reduction here
        }
    };
    
    setInterval(checkMemoryPressure, 5000);
}

// iOS-specific optimizations
if (isIOS) {
    // Prevent iOS bounce scroll
    document.body.style.overscrollBehavior = 'none';
    
    // Handle iOS focus issues
    document.addEventListener('touchstart', () => {}, { passive: true });
}

// Android-specific optimizations  
if (isAndroid) {
    // Android Chrome may need explicit GPU hints
    document.body.style.transform = 'translateZ(0)';
}

// OLD updateObjectPositions() removed - Neural network handles positioning

/**
 * Camera
 */
const cameraGroup = new THREE.Group();
// Don't add to old scene - orchestrator will use its own scene

const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
camera.position.z = 10; // Further back for better orchestrator view
cameraGroup.add(camera);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: !isMobile, // Disable antialiasing on mobile for better performance
    powerPreference: isMobile ? 'default' : 'high-performance',
    stencil: false, // Disable stencil buffer on mobile (not needed)
    depth: true,
    logarithmicDepthBuffer: false, // Disable for better mobile performance
    precision: isMobile ? 'mediump' : 'highp' // Use medium precision on mobile
});
renderer.setClearColor(0x0a0a0f, 1);
renderer.setClearAlpha(1.0);
renderer.setSize(sizes.width, sizes.height);
// Mobile DPR capping: 1.0 for low-end, 1.5 for mid-range, 2.0 for desktop
const maxDPR = isMobile ? (isLowEndDevice ? 1.0 : 1.5) : 2.0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDPR));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = isMobile ? 1.0 : 1.2; // Lower exposure on mobile
renderer.outputEncoding = THREE.sRGBEncoding;

// Mobile-specific renderer optimizations
if (isMobile) {
    // Reduce shadow map size on mobile
    renderer.shadowMap.enabled = false; // Disable shadows completely on mobile
    // Force garbage collection hint (browser may ignore)
    if (typeof window.gc === 'function') {
        setTimeout(() => window.gc(), 5000);
    }
}

/**
 * Scene Orchestrator - Cinematic Dual-Layer Hero
 */
orchestrator = new SceneOrchestrator({
    canvas,
    camera,
    renderer,
    isMobile
});

// Add camera group to orchestrator's scene
orchestrator.scene.add(cameraGroup);

// Add lights to orchestrator's scene
orchestrator.scene.add(directionalLight);
orchestrator.scene.add(secondaryLight);

// Initialize with hero program (section 0)
orchestrator.applyProgramBySectionId('hero', true);
orchestrator.applyProfile(SECTION_PROFILES[0], true);

/**
 * Performance Profiler HUD (desktop only, toggle with ?hud=1 or Ctrl+Shift+P)
 */
let profilerHUD = null;
if (!isMobile && orchestrator.qualityManager) {
    profilerHUD = new ProfilerHUD({
        qualityManager: orchestrator.qualityManager,
        frameController: orchestrator.frameController,
        renderer: renderer
    });
    setupHUDToggle(profilerHUD);
}

// Add particles to orchestrator's scene
if (particles) {
    orchestrator.scene.add(particles);
}

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

// Scroll-driven section detection
if (scroller) {
    scroller.addEventListener('scroll', () => {
        const y = scroller.scrollTop;
        const indexFloat = y / vh(); // 0..6 continuous
        
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
 * Cursor Controller (desktop only)
 */
const cursorCtl = !isMobile ? new CursorController({ smoothing: 0.18 }) : null;

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
let fpsArray = [];
let currentFps = 60;

// Mobile FPS throttling (cap at 30fps to save battery)
const mobileFrameDelay = isMobile ? 1000 / 30 : 0; // 30fps cap for mobile
let lastFrameTime = 0;

const tick = () => {
    // Mobile frame rate throttling
    if (isMobile && mobileFrameDelay > 0) {
        const now = performance.now();
        if (now - lastFrameTime < mobileFrameDelay) {
            requestAnimationFrame(tick);
            return;
        }
        lastFrameTime = now;
    }
    
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - previousTime;
    previousTime = elapsedTime;
    
    // Track FPS for profiler
    const instantFps = 1 / Math.max(0.0001, deltaTime);
    fpsArray.push(instantFps);
    if (fpsArray.length > 10) fpsArray.shift();
    currentFps = fpsArray.reduce((a, b) => a + b, 0) / fpsArray.length;

    // Update cursor controller and get smooth pointer data
    let pointerData = null;
    if (cursorCtl) {
        pointerData = cursorCtl.update();
        if (pointerData && orchestrator) {
            orchestrator.setPointerNDC(pointerData.ndcX, pointerData.ndcY);
        }
    }

    // Calculate scroll position for section detection
    let indexFloat = currentSection; // Default to discrete section
    if (scroller) {
        // Calculate continuous scroll position (0..6 for 7 sections)
        indexFloat = scroller.scrollTop / vh();
    }
    
    // Keep camera at origin - orchestrator scene is always centered
    // No vertical camera movement needed since we switch programs per section
    camera.position.y = 0;
    
    // Calculate scroll progress
    const progress = indexFloat / Math.max(1, totalSections - 1);

    // Apply parallax effect to camera group (use smoothed cursor or fallback)
    // Reduce parallax intensity when cursor is idle
    const isIdle = cursorCtl?.isIdle?.() ?? false;
    const parallaxScale = isIdle ? 0.6 : 1.0;
    
    const effectiveCursor = pointerData ? 
        { x: pointerData.ndcX * 0.5, y: pointerData.ndcY * 0.5 } : 
        cursor;
    
    const parallaxX = (pointerData ? effectiveCursor.x : cursor.x) * 0.5 * parallaxScale;
    const parallaxY = (pointerData ? effectiveCursor.y : -cursor.y) * 0.5 * parallaxScale;
    cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 3 * deltaTime;
    cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 3 * deltaTime;

    // Camera dolly and roll based on progress
    camera.rotation.z = Math.sin(progress * Math.PI) * 0.08;
    camera.position.z = 10 + Math.sin(progress * Math.PI) * 0.6;

    // Section IDs map
    const sectionIdMap = ['hero', 'about', 'experience', 'work', 'skills', 'education', 'contact'];
    
    // Check if section changed and apply new program + profile
    const nextIndex = Math.round(indexFloat);
    if (nextIndex >= 0 && nextIndex < SECTION_PROFILES.length) {
        // Use a persistent variable to track last applied program
        if (typeof tick.lastProgramIndex === 'undefined') {
            tick.lastProgramIndex = -1;
        }
        
        if (nextIndex !== tick.lastProgramIndex) {
            tick.lastProgramIndex = nextIndex;
            const sectionId = sectionIdMap[nextIndex];
            console.log('Switching to section:', nextIndex, sectionId);
            orchestrator.applyProgramBySectionId(sectionId);
            orchestrator.applyProfile(SECTION_PROFILES[nextIndex]);
        }
    }

    // Pointer for orchestrator (use smoothed pointer if available)
    const pointer = pointerData ? 
        { x: pointerData.ndcX, y: pointerData.ndcY } : 
        { x: cursor.x * 2, y: cursor.y * 2 };

    // Update orchestrator with current FPS
    if (orchestrator) {
        orchestrator.update(deltaTime, progress, pointer, currentFps);
    }

    // Animate particles with smooth flow (apply reduced motion scaling)
    const motionScale = orchestrator?.prefersReducedMotion ? 0.5 : 1.0;
    particles.rotation.y = elapsedTime * 0.05 * motionScale;
    particles.position.y = Math.sin(elapsedTime * 0.2 * motionScale) * 0.2;
    particles.position.x = Math.cos(elapsedTime * 0.15 * motionScale) * 0.1;

    // Update profiler HUD
    if (profilerHUD) {
        profilerHUD.update(currentFps);
    }

    // Render with orchestrator (includes post-processing)
    if (orchestrator) {
        orchestrator.render();
    } else {
        renderer.render(scene, camera);
    }
    
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

// Force loading manager to complete since we have no textures to load
setTimeout(() => {
    if (!isLoadingComplete) {
        console.log('Forcing loading completion...');
        loadingManager.onLoad();
    }
}, 100);

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