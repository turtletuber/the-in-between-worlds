import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    buildCampgroundWorld,
    buildCosmicHubWorld,
    buildMountainsWorld,
    buildSequoiaForestWorld,
    buildCrystalCavesWorld,
    buildSkyIslandWorld,
    buildDeskviewWorld,
    buildMemoryCropsWorld,
    buildWaterfallWorld
} from './worlds';
import { createAvatars, updateAvatarBehaviors, disposeAvatars, activeSprites } from './avatars';
import { CosmicHub } from './cosmic';
import { SidePanelProjector } from './SidePanelProjector';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import {
    createPlayer,
    updatePlayerMovement,
    playerState
} from './Player';
import { setupInputHandlers } from './InputManager';
import { TutorialManager } from './TutorialManager';

// Extension for fast collision
// @ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
// @ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
// @ts-ignore
THREE.Mesh.prototype.raycast = acceleratedRaycast;

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;
let cosmicHub: CosmicHub;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let onWorldChangeCallback: (name: string, msg: string) => void;
let hudArm: SidePanelProjector;
let animatedObjects: THREE.Object3D[] = [];
let worldElements: THREE.Object3D[] = [];

// State
let currentWorld = 'campground';

// Zoom system
const zoomLevels = [
    { distance: 8, height: 4, fov: 65, polar: Math.PI / 3 },
    { distance: 25, height: 20, fov: 60, polar: Math.PI / 4 },
    { distance: 60, height: 55, fov: 50, polar: Math.PI / 6 },
    { distance: 120, height: 110, fov: 45, polar: Math.PI / 8 },
];

let targetZoomProgress = 1.0;
let currentZoomProgress = 1.0;
let currentZoom = { ...zoomLevels[1] };

export function initScene(container: HTMLElement, onWorldChange: (name: string, msg: string) => void) {
    onWorldChangeCallback = onWorldChange;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.015);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1500);
    camera.position.set(0, 20, 25);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Optimization: Cap pixel ratio at 1.5 for performance (Pi/Mobile friendly)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Can switch to BasicShadowMap for more speed
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;

    cosmicHub = new CosmicHub(scene);

    // Initialize HUD Arm
    hudArm = new SidePanelProjector(scene);
    hudArm.handleResize(window.innerWidth, window.innerHeight);

    // Initialize Player
    const player = createPlayer(scene);

    // Initialize Avatars before first world switch
    try {
        createAvatars(scene);
    } catch (e) {
        console.error("Failed to create avatars:", e);
    }

    // Initial world setup
    (window as any).currentWorld = currentWorld;
    switchWorld(currentWorld, false);

    // Initial behavior update to set visibility
    updateAvatarBehaviors(scene, 0, 0.016, player.position, currentWorld);

    (window as any).currentWorld = currentWorld;
    (window as any).targetZoomProgress = targetZoomProgress;

    // Initialize Input Handlers
    const cleanupInput = setupInputHandlers({
        camera,
        hudArm,
        renderer,
        scene,
        currentWorld,
        switchWorld,
        onWorldChangeCallback,
        getZoomProgress: () => targetZoomProgress,
        setZoomProgress: (val) => {
            targetZoomProgress = val;
            (window as any).targetZoomProgress = val;
        },
        zoomLevelsCount: zoomLevels.length
    });

    window.addEventListener('click', onClick);

    // Start the guided tutorial
    new TutorialManager();

    animate();

    return () => {
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener('click', onClick);
        cleanupInput();
    };
}

export function disposeScene() {
    if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }
    disposeAvatars();
}

let animationId: number;

function animate() {
    animationId = requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    updatePlayerMovement(scene, camera, controls, currentZoom, delta, time, worldElements);
    updateZoom(delta);

    if (cosmicHub) cosmicHub.update(delta);
    if (hudArm) hudArm.update(delta);

    updateAvatarBehaviors(scene, time, delta, playerState.position, currentWorld);

    animatedObjects.forEach((obj) => {
        // Individual Shard Geodesic Animation - ONLY animate if it's actually in the core
        if (obj.userData.center && (obj instanceof THREE.Mesh) && obj.parent?.userData.isWorldElement) {
            const shift = (Math.sin(time * obj.userData.bobSpeed) * 0.5 + 0.5) * obj.userData.bobHeight;
            const dir = obj.userData.center.clone().normalize();
            obj.position.copy(dir.multiplyScalar(shift));
            obj.rotation.z = Math.sin(time * obj.userData.rotateSpeed) * 0.1;
        }

        // Generic Bobbing
        if (obj.userData.bobSpeed && !obj.userData.center) {
            // Special exemption: Don't bob the Dragon if it's riding the Spirit
            if (obj.name === 'Dragon' && obj.parent?.name === 'DragonSpirit') {
                // Do nothing
            } else {
                obj.position.y = obj.userData.baseY + Math.sin(time * obj.userData.bobSpeed + (obj.userData.bobOffset || 0)) * (obj.userData.bobHeight || 0.1);
            }
        }
        if (obj.userData.onUpdate) {
            obj.userData.onUpdate(time);
        }

        // Generic Rotation
        if (obj.userData.rotateSpeed) {
            obj.rotation.y += obj.userData.rotateSpeed * delta;
            if (obj.userData.rotateX) obj.rotation.x += obj.userData.rotateSpeed * delta;
        }

        // Pulse / Flicker Logic
        if (obj.userData.pulseSpeed && obj instanceof THREE.Mesh) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            if (mat.emissiveIntensity !== undefined) {
                const min = 0.6;
                const max = 1.4;
                mat.emissiveIntensity = min + (Math.sin(time * obj.userData.pulseSpeed) * 0.5 + 0.5) * (max - min);
            }
        }
    });

    controls.update();
    renderer.render(scene, camera);

    // Render HUD on top - HUD update is already handled in the main loop area
    if (hudArm) {
        hudArm.render(renderer);
    }
}


function updateZoom(delta: number) {
    const speed = 5.0;
    currentZoomProgress += (targetZoomProgress - currentZoomProgress) * delta * speed;

    // Breakthrough transitions (Infinite Loop logic)
    // 1. Zoom out of Cosmic Hub -> Transition to Deskview
    if (currentWorld === 'CosmicHub' && targetZoomProgress > 6.0) {
        switchWorld('deskview');
        targetZoomProgress = 1.0;
        currentZoomProgress = 1.0;
        return;
    }

    // 2. Zoom into Deskview Monitor -> Transition to Campground
    if (currentWorld === 'deskview' && targetZoomProgress < -2.0) {
        switchWorld('campground');
        targetZoomProgress = 0.0; // Start zoomed in
        currentZoomProgress = 0.0;
        return;
    }

    // 3. Zoom out of any other World -> Transition to Cosmic Hub
    // This effectively makes every other world behave as a "sub-world" of the hub
    if (currentWorld !== 'deskview' && currentWorld !== 'CosmicHub' && targetZoomProgress > 4.5) {
        switchWorld('CosmicHub');
        targetZoomProgress = 1.0; // Start comfortably in the hub
        currentZoomProgress = 1.0;
        return;
    }

    // Standard Zoom Interpolation
    const p = Math.max(0, Math.min(zoomLevels.length - 1.0001, currentZoomProgress));
    const idxA = Math.floor(p);
    const idxB = idxA + 1;
    const alpha = p - idxA;
    const levelA = zoomLevels[idxA];
    const levelB = zoomLevels[idxB] || levelA;

    currentZoom.distance = THREE.MathUtils.lerp(levelA.distance, levelB.distance, alpha);
    currentZoom.height = THREE.MathUtils.lerp(levelA.height, levelB.height, alpha);
    currentZoom.fov = THREE.MathUtils.lerp(levelA.fov, levelB.fov, alpha);

    camera.fov = currentZoom.fov;
    camera.updateProjectionMatrix();
}



function onClick(event: MouseEvent) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        while (obj) {
            // Check for toggleable fire
            if (obj.userData.isToggleableFire) {
                const children = obj.children;
                if (children.length >= 2) {
                    // find current visible index
                    let visibleIndex = children.findIndex(c => c.visible);
                    if (visibleIndex === -1) visibleIndex = 0; // fallback

                    // hide current
                    children[visibleIndex].visible = false;

                    // show next
                    const nextIndex = (visibleIndex + 1) % children.length;
                    children[nextIndex].visible = true;
                }
                return;
            }
            // Weather Station Interaction
            if (obj.userData.isWeatherStation && obj.userData.isClickable) {
                const light = scene.children.find(c => c instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
                const fireflies = scene.children.find(c => c.userData.isFireflies);

                // Initialize state if undefined (Default is Night/Dark for most)
                if (scene.userData.isDaytime === undefined) {
                    // Assume we start at Night for Campground/Forest/Caves, Day for others
                    scene.userData.isDaytime = false;
                }

                // Toggle State
                scene.userData.isDaytime = !scene.userData.isDaytime;
                const isDay = scene.userData.isDaytime;

                if (currentWorld === 'campground') {
                    if (isDay) {
                        // Switch to Golden Evening
                        scene.background = new THREE.Color(0xffaa55);
                        scene.fog = new THREE.FogExp2(0xffaa55, 0.012);
                        if (light) {
                            light.color.setHex(0xffddaa);
                            light.groundColor.setHex(0x664422);
                            light.intensity = 1.2;
                        }
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "A golden sunset warms the camp...");
                    } else {
                        // Switch to Night (Lighter Moon Standard)
                        scene.background = new THREE.Color(0x020205);
                        scene.fog = new THREE.FogExp2(0x050515, 0.025);
                        if (light) {
                            light.color.setHex(0x3344aa);
                            light.groundColor.setHex(0x020211);
                            light.intensity = 1.0;
                        }
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "Darkness falls...");
                    }
                } else if (currentWorld === 'forest') {
                    if (isDay) {
                        // Switch to Golden Afternoon
                        scene.background = new THREE.Color(0xfde68a);
                        scene.fog = new THREE.FogExp2(0xfde68a, 0.015);
                        if (light) {
                            light.color.setHex(0xfff7ed);
                            light.groundColor.setHex(0x4d7c0f);
                            light.intensity = 1.1;
                        }
                        if (fireflies) fireflies.visible = false;
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "Sunlight filters through the leaves...");
                    } else {
                        // Switch to Deep Forest Night (New Brightened Standard)
                        scene.background = new THREE.Color(0x020402);
                        scene.fog = new THREE.FogExp2(0x022c22, 0.04);
                        if (light) {
                            light.color.setHex(0x1e3a8a);
                            light.groundColor.setHex(0x020202);
                            light.intensity = 0.6; // Matches new brighter baseline
                        }
                        if (fireflies) fireflies.visible = true;
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "The ancient forest sleeps...");
                    }
                } else {
                    // GENERIC Islands (Sky, Cave, Mountains, etc.)
                    if (isDay) {
                        // Switch to Day
                        scene.background = new THREE.Color(0x87ceeb);
                        scene.fog = new THREE.FogExp2(0x87ceeb, 0.005);
                        if (light) {
                            light.color.setHex(0xffffff);
                            light.groundColor.setHex(0xaaaaaa);
                            light.intensity = 1.0;
                        }
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "Sunlight floods the island...");
                    } else {
                        // Switch to Night
                        scene.background = new THREE.Color(0x050510);
                        scene.fog = new THREE.FogExp2(0x050510, 0.015);
                        if (light) {
                            light.color.setHex(0x4455ff);
                            light.groundColor.setHex(0x222222);
                            light.intensity = 0.75; // Matches new brighter baseline
                        }
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "The stars return...");
                    }
                }
            }
            // Master Crystal Interaction (Caves)
            if (obj.userData.isMasterCrystal && obj.userData.isClickable) {
                const light = scene.children.find(c => c instanceof THREE.HemisphereLight) as THREE.HemisphereLight;
                const river = scene.children.find(c => c.userData.isGlowingRiver);

                const isDormant = scene.fog?.color.getHex() === 0x050010;

                if (isDormant) {
                    // Activate Data Stream
                    scene.background = new THREE.Color(0x000033);
                    scene.fog = new THREE.FogExp2(0x001133, 0.02);
                    if (light) {
                        light.color.setHex(0x00ffff);
                        light.groundColor.setHex(0x000033);
                        light.intensity = 0.8;
                    }
                    if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "Data stream active...");
                } else {
                    // Dormant Mode
                    scene.background = new THREE.Color(0x000000);
                    scene.fog = new THREE.FogExp2(0x050010, 0.03);
                    if (light) {
                        light.color.setHex(0x311b92);
                        light.groundColor.setHex(0x050010);
                        light.intensity = 0.3;
                    }
                    if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "System dormant...");
                }
                return;
            }
            if (obj.userData.isClickable && obj.userData.targetWorld) {
                switchWorld(obj.userData.targetWorld);
                return;
            }
            if (obj.userData.worldId) {
                switchWorld(obj.userData.worldId);
                return;
            }
            obj = obj.parent as THREE.Object3D;
        }
    }
}

function switchWorld(worldName: string, notify: boolean = true) {
    if (currentWorld === worldName && notify) return;

    const toRemove: THREE.Object3D[] = [];
    scene.traverse(obj => {
        if (obj.userData.isWorldElement) toRemove.push(obj);
    });
    toRemove.forEach(obj => {
        if (obj.parent) obj.parent.remove(obj);
    });

    if (worldName === 'CosmicHub') {
        if (!cosmicHub.stars) cosmicHub.create();
        if (cosmicHub.stars) cosmicHub.stars.visible = true;
        if (cosmicHub.nebula) cosmicHub.nebula.visible = true;
    } else {
        if (cosmicHub.stars) cosmicHub.stars.visible = false;
        if (cosmicHub.nebula) cosmicHub.nebula.visible = false;
    }

    currentWorld = worldName;
    (window as any).currentWorld = worldName;
    window.dispatchEvent(new CustomEvent('world-switch', { detail: worldName }));
    window.dispatchEvent(new CustomEvent('whisper-trigger'));

    // Update HUD Arm context
    if (hudArm) {
        hudArm.setCurrentWorld(currentWorld);
    }

    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.015);

    // Start with a standard orientation, but let switch decide specifics
    playerState.position.set(0, 30.0, 0); // Dramatic drop in from above
    if (worldName === 'CosmicHub') {
        // Move player to an "observation" spot in the hub so they aren't inside the core
        playerState.position.set(0, 8, 20);
    }
    playerState.velocity.set(0, 0, 0);

    // CRITICAL: Snap controls target immediately to avoid "dragging" view from old world
    if (controls) {
        controls.target.copy(playerState.position);
        controls.update();
    }

    // Detach all potentially attached avatars
    activeSprites.forEach(sprite => {
        if (sprite.parent && sprite.parent !== scene) {
            scene.add(sprite); // Direct to root
        }
        // Hub avatars should be slightly smaller to not block island markers
        const s = worldName === 'CosmicHub' ? 3.0 : 5.0;
        sprite.scale.set(s, s, 1);
        sprite.visible = false; // Let updateAvatarBehaviors decide visibility
    });

    switch (worldName) {
        case 'deskview': buildDeskviewWorld(scene); break;
        case 'CosmicHub': buildCosmicHubWorld(scene); break;
        case 'campground': buildCampgroundWorld(scene); break;
        case 'mountains': buildMountainsWorld(scene); break;
        case 'forest': buildSequoiaForestWorld(scene); break;
        case 'caves': buildCrystalCavesWorld(scene); break;
        case 'sky': buildSkyIslandWorld(scene); break;
        case 'crops':
            buildMemoryCropsWorld(scene);
            // Special Attachment for Dragon
            const spirit = scene.getObjectByName('DragonSpirit');
            const dragonAvatar = scene.getObjectByName('Dragon');
            if (spirit && dragonAvatar) {
                spirit.add(dragonAvatar);
                dragonAvatar.position.set(0, 0, 0.7);
                dragonAvatar.rotation.set(0, 0, 0);
                dragonAvatar.scale.setScalar(8.0);
            }
            break;
        case 'waterfalls': buildWaterfallWorld(scene); break;
    }

    // --- Animation Registry Optimization ---
    // Instead of traversing the tree every frame, we collect everything that needs updates once
    animatedObjects = [];
    worldElements = [];
    scene.traverse(obj => {
        if (obj.userData.bobSpeed || obj.userData.rotateSpeed || obj.userData.pulseSpeed || obj.userData.onUpdate || obj.userData.center) {
            animatedObjects.push(obj);
        }
        if (obj.userData.isWorldElement) {
            worldElements.push(obj);
        }
    });

    // --- BVH Optimization ---
    computeWorldBVH();

    if (notify && onWorldChangeCallback) {
        let msg = `Entering ${worldName}...`;
        if (worldName === 'CosmicHub') msg = '˚ ༘♡ ⋆｡˚ the cosmic nexus... ˚ ༘♡ ⋆｡˚';
        if (worldName === 'campground') msg = '˚ ༘♡ ⋆｡˚ warmth without heat... ˚ ༘♡ ⋆｡˚';
        if (worldName === 'sky') msg = '˚ ༘♡ ⋆｡˚ dreaming in pastel... ˚ ༘♡ ⋆｡˚';
        if (worldName === 'mountains') msg = '˚ ༘♡ ⋆｡˚ silence of the peaks... ˚ ༘♡ ⋆｡˚';
        if (worldName === 'deskview') msg = '˚ ༘♡ ⋆｡˚ back to the beginning... ˚ ༘♡ ⋆｡˚';
        if (worldName === 'crops') msg = '˚ ༘♡ ⋆｡˚ the eternal cycle of memory... ˚ ༘♡ ⋆｡˚';
        if (worldName === 'waterfalls') msg = '˚ ༘♡ ⋆｡˚ the endless flow... ˚ ༘♡ ⋆｡˚';
        onWorldChangeCallback(worldName, msg);
    }
}

function computeWorldBVH() {
    scene.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.userData.isWorldElement && obj.geometry) {
            // @ts-ignore
            obj.geometry.computeBoundsTree();
        }
    });
}
