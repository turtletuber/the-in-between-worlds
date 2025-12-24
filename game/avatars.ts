import * as THREE from 'three';

// @ts-ignore
import { DragonAvatar, RobotAvatar, PandaAvatar, GhostAvatar, AlienAvatar, WhiskersAvatar } from '../avatars/index.js';
import { hubIslands } from './worlds/hub';

let activeAvatars: any[] = [];
let activeSprites: THREE.Sprite[] = [];
let activeTextures: THREE.CanvasTexture[] = [];

export function createAvatars(scene: THREE.Scene) {
    // Clear previous
    disposeAvatars();

    const avatarConfigs = [
        {
            name: 'Dragon',
            Class: DragonAvatar,
            pos: [-3, 2, -2],
            personality: {
                preferredWorlds: ['caves', 'mountains'],
                interests: ['singingCrystal', 'starlightStalactite', 'depthMemoryStone', 'dataNode'],
                movementSpeed: 0.015,
                wanderRadius: 8,
                investigationTime: 5,
                curiosity: 0.8
            }
        },
        {
            name: 'Robot',
            Class: RobotAvatar,
            pos: [3, 2, -2],
            personality: {
                preferredWorlds: ['caves', 'mountains', 'CosmicHub'],
                interests: ['singingCrystal', 'dataNode', 'dataCrystal', 'echoC hamber'],
                movementSpeed: 0.012,
                wanderRadius: 10,
                investigationTime: 8,
                curiosity: 0.9
            }
        },
        {
            name: 'Panda',
            Class: PandaAvatar,
            pos: [-3, 2, 2],
            personality: {
                preferredWorlds: ['forest', 'campground'],
                interests: ['meditationStone', 'singingSequoia', 'harmonicOrb', 'eternalEmber'],
                movementSpeed: 0.008,
                wanderRadius: 6,
                investigationTime: 12,
                curiosity: 0.4
            }
        },
        {
            name: 'Ghost',
            Class: GhostAvatar,
            pos: [3, 2, 2],
            opacity: 0.9,
            personality: {
                preferredWorlds: ['campground', 'CosmicHub'],
                interests: ['memoryFragment', 'shelterOfSolitude', 'cosmicIsland'],
                movementSpeed: 0.01,
                wanderRadius: 12,
                investigationTime: 6,
                curiosity: 0.6
            }
        },
        {
            name: 'Zorp',
            Class: AlienAvatar,
            pos: [0, 2, -4],
            personality: {
                preferredWorlds: ['sky', 'CosmicHub'],
                interests: ['dataCrystal', 'dataNode', 'observationPlatform', 'mistStream', 'cosmicIsland', 'MechanicalArm'],
                movementSpeed: 0.013,
                wanderRadius: 15,
                investigationTime: 10,
                curiosity: 1.0
            }
        },
        {
            name: 'Whiskers',
            Class: WhiskersAvatar,
            pos: [0, 2, 3],
            personality: {
                preferredWorlds: ['campground', 'forest'],
                interests: ['glowingFern', 'lightMote'],
                movementSpeed: 0.02,
                wanderRadius: 8,
                curiosity: 0.7
            }
        }
    ];

    avatarConfigs.forEach((config: any) => {
        // Instantiate the avatar (UI component processing canvas)
        if (!config.Class) {
            console.warn(`Class for ${config.name} not found`);
            return;
        }

        const avatar = new config.Class(256); // Higher resolution for closeups
        activeAvatars.push(avatar);

        const canvas = avatar.getCanvas();
        // Ensure canvas is ready

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        activeTextures.push(texture);

        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: config.opacity || 1.0,
            alphaTest: 0.5 // KEY FIX: Prevent transparent parts from occluding background
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.set(config.pos[0], config.pos[1], config.pos[2]);
        sprite.scale.set(5.0, 5.0, 1);

        // Metadata for behavior
        sprite.userData.type = 'avatarSprite';
        sprite.userData.name = config.name;
        sprite.name = config.name; // Critical for scene.getObjectByName lookup!
        sprite.userData.baseY = config.pos[1];
        sprite.userData.bobSpeed = 2 + Math.random();
        sprite.userData.bobHeight = 0.2;
        sprite.userData.originalClass = avatar; // Reference back if needed
        sprite.userData.personality = config.personality; // Attach Lore
        sprite.userData.state = 'wandering';
        sprite.userData.stateTimer = 0;

        // Find Home Island for Hub Meandering
        const prefs = config.personality.preferredWorlds || [];
        const homeIsland = hubIslands.find(island => prefs.includes(island.id));
        if (homeIsland) {
            sprite.userData.hubBasePos = new THREE.Vector3(homeIsland.pos[0], homeIsland.pos[1] + 2.5, homeIsland.pos[2]);
            sprite.userData.targetPos = sprite.userData.hubBasePos.clone(); // Initial target
        } else {
            // Default to center if no pref
            sprite.userData.hubBasePos = new THREE.Vector3(0, 2, 0);
            sprite.userData.targetPos = new THREE.Vector3(0, 2, 0);
        }

        scene.add(sprite);
        activeSprites.push(sprite);
    });
}

export function updateAvatarBehaviors(time: number, delta: number, playerPos: THREE.Vector3, currentWorld: string) {
    // Update textures to reflect canvas changes
    activeTextures.forEach(texture => {
        texture.needsUpdate = true;
    });

    activeSprites.forEach(sprite => {
        // Meandering Logic in Cosmic Hub
        if (currentWorld === 'CosmicHub' && sprite.userData.hubBasePos) {
            const dt = delta;

            // Initialize state if missing
            if (!sprite.userData.hubState) {
                sprite.userData.hubState = 'idle'; // idle, move, observe
                sprite.userData.hubTimer = Math.random() * 5.0;
            }

            // Update Timer
            sprite.userData.hubTimer -= dt;

            if (sprite.userData.hubState === 'idle') {
                // IDLE: Just hover/bob in place
                if (sprite.userData.hubTimer <= 0) {
                    // Decide next action: Move or Observe
                    if (Math.random() < 0.7) {
                        sprite.userData.hubState = 'move';
                        sprite.userData.hubTimer = 0; // Move immediately

                        // Pick new target
                        const radius = 1.0 + Math.random() * 2.5;
                        const angle = Math.random() * Math.PI * 2;
                        const offset = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
                        sprite.userData.targetPos.copy(sprite.userData.hubBasePos).add(offset);
                    } else {
                        sprite.userData.hubState = 'observe';
                        sprite.userData.hubTimer = 1.0 + Math.random() * 2.0;
                    }
                }
            } else if (sprite.userData.hubState === 'observe') {
                // OBSERVE: Maybe rotate slightly or look at something (simulated by pause)
                // Just a different pause flavor basically, maybe could look at player in future.
                if (sprite.userData.hubTimer <= 0) {
                    sprite.userData.hubState = 'idle';
                    sprite.userData.hubTimer = 1.0 + Math.random() * 3.0;
                }
            } else if (sprite.userData.hubState === 'move') {
                // MOVE: Walk towards target
                const target = sprite.userData.targetPos as THREE.Vector3;
                // Much slower speed for "tiny being" feel
                const baseSpeed = sprite.userData.personality.movementSpeed || 0.01;
                const speed = baseSpeed * 0.5; // Significant slow down

                const dir = new THREE.Vector3().subVectors(target, sprite.position);
                dir.y = 0;
                const dist = dir.length();

                if (dist < 0.2) {
                    // Reached target
                    sprite.userData.hubState = 'idle';
                    sprite.userData.hubTimer = 2.0 + Math.random() * 4.0; // Rest after walking
                } else {
                    dir.normalize();
                    sprite.position.add(dir.multiplyScalar(speed * dt * 60));
                }
            }

            // Match BaseY smoothly
            sprite.userData.baseY = THREE.MathUtils.lerp(sprite.userData.baseY, sprite.userData.hubBasePos.y, dt * 2.0);
        }
    });
}

export function disposeAvatars() {
    activeAvatars.forEach(a => a.destroy && a.destroy());
    activeAvatars = [];
    activeSprites = []; // Clear current sprites
    activeTextures.forEach(t => t.dispose());
    activeTextures = [];
}