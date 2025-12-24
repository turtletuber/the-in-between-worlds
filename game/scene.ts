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
import { createAvatars, updateAvatarBehaviors, disposeAvatars } from './avatars';
import { CosmicHub } from './cosmic';
import { MechanicalArm } from './MechanicalArm';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let clock: THREE.Clock;
let cosmicHub: CosmicHub;
let player: THREE.Group;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let onWorldChangeCallback: (name: string, msg: string) => void;
let hudArm: MechanicalArm;

// State
let currentWorld = 'campground';
const keys = { w: false, a: false, s: false, d: false };
const playerState = {
    position: new THREE.Vector3(0, 1.5, 0),
    moveSpeed: 5.0,
    facingDirection: new THREE.Vector3(0, 0, -1)
};

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    hudArm = new MechanicalArm(scene);
    hudArm.handleResize(window.innerWidth, window.innerHeight);

    createPlayer();

    // Initial world setup
    switchWorld(currentWorld, false);

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('click', onClick);

    try {
        createAvatars(scene);
    } catch (e) {
        console.error("Failed to create avatars:", e);
    }
    animate();

    return () => {
        if (animationId) cancelAnimationFrame(animationId);
        window.removeEventListener('resize', onWindowResize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('click', onClick);
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

    updatePlayerMovement(delta);
    updateZoom(delta);

    if (cosmicHub) cosmicHub.update(delta);
    if (hudArm) hudArm.update(delta);

    updateAvatarBehaviors(time, delta, player.position, currentWorld);

    scene.traverse((obj) => {
        // Individual Shard Geodesic Animation
        if (obj.userData.center && (obj instanceof THREE.Mesh)) {
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
            // Optional: some objects might rotate on X too, but let's stick to Y mostly or check config
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

    // Render HUD on top
    if (hudArm) hudArm.render(renderer);
}

function updatePlayerMovement(delta: number) {
    if (!player) return;

    const moveDirection = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys.w) moveDirection.add(cameraDirection);
    if (keys.s) moveDirection.sub(cameraDirection);
    if (keys.d) moveDirection.add(cameraRight);
    if (keys.a) moveDirection.sub(cameraRight);

    moveDirection.normalize();

    if (moveDirection.length() > 0) {
        const moveDistance = playerState.moveSpeed * delta;
        player.position.add(moveDirection.multiplyScalar(moveDistance));
        playerState.facingDirection.copy(moveDirection);
    }

    player.position.y = 1.5 + Math.sin(clock.getElapsedTime() * 3) * 0.08;

    if (controls) {
        controls.target.lerp(player.position, delta * 5);
        const targetDist = currentZoom.distance;
        const targetHeight = currentZoom.height;
        const offset = camera.position.clone().sub(controls.target);
        offset.y = 0;
        offset.normalize().multiplyScalar(targetDist);
        offset.y = targetHeight;
        const targetCamPos = controls.target.clone().add(offset);
        camera.position.lerp(targetCamPos, delta * 2);
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

function createPlayer() {
    const group = new THREE.Group();
    const geometry = new THREE.OctahedronGeometry(0.5, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x88ccff,
        emissiveIntensity: 0.8,
        flatShading: true,
        roughness: 0.2,
        metalness: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    const light = new THREE.PointLight(0x88ccff, 3, 12);
    group.add(light);
    group.position.copy(playerState.position);
    player = group;
    scene.add(player);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (hudArm) hudArm.handleResize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    // 'M' or 'H' toggles the Mechanical Arm
    if (key === 'm' || key === 'h') {
        if (hudArm) hudArm.toggle();
    }
    const worlds: { [key: string]: string } = {
        '0': 'deskview', '1': 'CosmicHub', '2': 'campground',
        '3': 'mountains', '4': 'forest', '5': 'caves', '6': 'sky',
        '7': 'crops', '8': 'waterfalls'
    };
    if (worlds[key]) switchWorld(worlds[key]);
}

function onKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
}

function onWheel(e: WheelEvent) {
    e.preventDefault();
    const sensitivity = 0.0015;
    targetZoomProgress += e.deltaY * sensitivity;

    // Limits: Hub can go way out, Desk can go way in
    if (currentWorld === 'CosmicHub') {
        targetZoomProgress = Math.max(0, Math.min(targetZoomProgress, 7.0));
    } else if (currentWorld === 'deskview') {
        targetZoomProgress = Math.max(-3.0, Math.min(targetZoomProgress, zoomLevels.length - 1));
    } else {
        targetZoomProgress = Math.max(0, Math.min(targetZoomProgress, 5.0));
    }
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

                if (currentWorld === 'campground') {
                    const isMoody = scene.fog?.color.getHex() === 0x050515;
                    if (isMoody) {
                        // Switch to Sunny Day
                        scene.background = new THREE.Color(0x87ceeb);
                        scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);
                        if (light) {
                            light.color.setHex(0xffffff);
                            light.groundColor.setHex(0x4a7c59);
                            light.intensity = 1.0;
                        }
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "It's a beautiful day!");
                    } else {
                        // Switch back to Moody Night
                        scene.background = new THREE.Color(0x0a1033);
                        scene.fog = new THREE.FogExp2(0x050515, 0.02);
                        if (light) {
                            light.color.setHex(0x4466ff);
                            light.groundColor.setHex(0x050515);
                            light.intensity = 0.6;
                        }
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "The night is quiet...");
                    }
                } else if (currentWorld === 'forest') {
                    const isNight = scene.fog?.color.getHex() === 0x022c22;
                    if (isNight) {
                        // Switch to Misty Day
                        scene.background = new THREE.Color(0xdbeafe);
                        scene.fog = new THREE.FogExp2(0xdbeafe, 0.02);
                        if (light) {
                            light.color.setHex(0xffffff);
                            light.groundColor.setHex(0x2e7d32);
                            light.intensity = 0.8;
                        }
                        if (fireflies) fireflies.visible = false;
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "Morning mist rolls in...");
                    } else {
                        // Switch to Deep Forest Night
                        scene.background = new THREE.Color(0x052e16);
                        scene.fog = new THREE.FogExp2(0x022c22, 0.03);
                        if (light) {
                            light.color.setHex(0x4a7c59);
                            light.groundColor.setHex(0x022c22);
                            light.intensity = 0.4;
                        }
                        if (fireflies) fireflies.visible = true;
                        if (onWorldChangeCallback) onWorldChangeCallback(currentWorld, "The forest comes alive at night...");
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
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.015);

    // Reset player position for new world
    player.position.set(0, 1.5, 0);

    // Detach Dragon avatar if it was attached
    const dragonAvatar = scene.getObjectByName('Dragon');
    if (dragonAvatar) {
        if (dragonAvatar.parent?.name === 'DragonSpirit') {
            scene.add(dragonAvatar); // Move back to root
            dragonAvatar.scale.set(5, 5, 1); // Reset scale to default
        }
        dragonAvatar.visible = true;
    }

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
            // Dragon Attachment Logic
            const spirit = scene.getObjectByName('DragonSpirit');
            if (spirit && dragonAvatar) {
                spirit.add(dragonAvatar);
                dragonAvatar.position.set(0, 0, 0.7); // Move to nose
                dragonAvatar.rotation.set(0, 0, 0);
                dragonAvatar.scale.setScalar(8.0); // Make it BIG
            }
            break;
        case 'waterfalls': buildWaterfallWorld(scene); break;
    }

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
