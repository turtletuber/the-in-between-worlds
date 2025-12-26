import * as THREE from 'three';

// @ts-ignore
import { DragonAvatar, RobotAvatar, PandaAvatar, GhostAvatar, AlienAvatar, WhiskersAvatar } from '../avatars/index.js';
import { hubIslands } from './worlds/hub';

let activeAvatars: any[] = [];
export let activeSprites: THREE.Sprite[] = [];
let activeTextures: THREE.CanvasTexture[] = [];

export function createAvatars(scene: THREE.Scene) {
    // Clear previous
    disposeAvatars();

    const avatarConfigs = [
        {
            name: 'Auto',
            Class: RobotAvatar,
            homeWorld: 'forest',
            manifestPos: new THREE.Vector3(0, 2.5, -5), // Among the redwoods
            personality: {
                interests: ['codeShard', 'automationMatrix', 'logicGate', 'sequoiaRoot'],
                movementSpeed: 0.012,
                wanderRadius: 10,
                domain: 'Code, Automation'
            }
        },
        {
            name: 'Panda',
            Class: PandaAvatar,
            homeWorld: 'waterfalls',
            manifestPos: new THREE.Vector3(0, 1.0, 0), // On the center mound
            personality: {
                interests: ['meditationStone', 'harmonicOrb', 'eternalEmber'],
                movementSpeed: 0.008,
                wanderRadius: 6,
                domain: 'Mindfulness, UX Research, Empathy'
            }
        },
        {
            name: 'Ghosty',
            Class: GhostAvatar,
            homeWorld: 'caves',
            manifestPos: new THREE.Vector3(0, 2.5, -3), // Near Master Crystal
            personality: {
                interests: ['memoryFragment', 'shelterOfSolitude', 'cosmicIsland'],
                movementSpeed: 0.01,
                wanderRadius: 12,
                domain: 'Memory Retrieval'
            }
        },
        {
            name: 'Zorp',
            Class: AlienAvatar,
            homeWorld: 'mountains',
            manifestPos: new THREE.Vector3(8, 2.5, 8), // Near Weather Station
            personality: {
                interests: ['dataCrystal', 'dataNode', 'observationPlatform'],
                movementSpeed: 0.013,
                wanderRadius: 15,
                domain: 'Network, Research'
            }
        },
        {
            name: 'Whiskers',
            Class: WhiskersAvatar,
            homeWorld: 'campground',
            manifestPos: new THREE.Vector3(3, 1.2, 3), // Near the fire
            personality: {
                interests: ['glowingFern', 'lightMote'],
                movementSpeed: 0.02,
                wanderRadius: 8,
                domain: 'Persona, Writing, Chat'
            }
        },
        {
            name: 'Dragon',
            Class: DragonAvatar,
            homeWorld: 'crops',
            manifestPos: new THREE.Vector3(0, 0, 0.7), // Attached to DragonSpirit in scene
            personality: {
                interests: ['singingCrystal', 'starlightStalactite'],
                movementSpeed: 0.015,
                wanderRadius: 8,
                domain: 'Creative Compute'
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
        sprite.position.copy(config.manifestPos);
        sprite.scale.set(5.0, 5.0, 1);

        // Metadata for behavior
        sprite.userData.type = 'avatarSprite';
        sprite.userData.name = config.name;
        sprite.name = config.name; // Critical for scene.getObjectByName lookup!
        sprite.userData.baseY = config.manifestPos.y;
        sprite.userData.bobSpeed = 2 + Math.random();
        sprite.userData.bobHeight = 0.2;
        sprite.userData.originalClass = avatar; // Reference back if needed
        sprite.userData.personality = config.personality; // Attach Lore
        sprite.userData.state = 'wandering';
        sprite.userData.homeWorld = config.homeWorld;
        sprite.userData.manifestPos = config.manifestPos.clone();

        // Find Home Island for Hub Meandering
        const homeIsland = hubIslands.find(island => island.id === config.homeWorld);
        if (homeIsland) {
            sprite.userData.hubBasePos = new THREE.Vector3(homeIsland.pos[0], homeIsland.pos[1] + 2.5, homeIsland.pos[2]);
            sprite.userData.targetPos = sprite.userData.hubBasePos.clone();
        } else {
            sprite.userData.hubBasePos = new THREE.Vector3(0, 2, 0);
            sprite.userData.targetPos = new THREE.Vector3(0, 2, 0);
        }

        scene.add(sprite);
        activeSprites.push(sprite);
    });
}

export function updateAvatarBehaviors(scene: THREE.Scene, time: number, delta: number, playerPos: THREE.Vector3, currentWorld: string) {
    activeSprites.forEach((sprite, index) => {
        if (sprite.visible) {
            const texture = activeTextures[index];
            if (texture) texture.needsUpdate = true;
        }

        const personality = sprite.userData.personality;

        // 1. COSMIC HUB MEANDERING
        if (currentWorld === 'CosmicHub' && sprite.userData.hubBasePos) {
            sprite.visible = true;
            sprite.scale.set(5, 5, 1);

            const dt = delta;
            if (!sprite.userData.hubState) {
                sprite.userData.hubState = 'idle';
                sprite.userData.hubTimer = Math.random() * 5.0;
            }

            sprite.userData.hubTimer -= dt;

            if (sprite.userData.hubState === 'idle') {
                if (sprite.userData.hubTimer <= 0) {
                    if (Math.random() < 0.7) {
                        sprite.userData.hubState = 'move';
                        sprite.userData.hubTimer = 0;
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
                if (sprite.userData.hubTimer <= 0) {
                    sprite.userData.hubState = 'idle';
                    sprite.userData.hubTimer = 1.0 + Math.random() * 3.0;
                }
            } else if (sprite.userData.hubState === 'move') {
                const target = sprite.userData.targetPos as THREE.Vector3;
                const baseSpeed = personality.movementSpeed || 0.01;
                const speed = baseSpeed * 0.5;
                const dir = new THREE.Vector3().subVectors(target, sprite.position);
                dir.y = 0;
                const dist = dir.length();
                if (dist < 0.2) {
                    sprite.userData.hubState = 'idle';
                    sprite.userData.hubTimer = 2.0 + Math.random() * 4.0;
                } else {
                    dir.normalize();
                    sprite.position.add(dir.multiplyScalar(speed * dt * 60));
                }
            }
            sprite.userData.baseY = THREE.MathUtils.lerp(sprite.userData.baseY, sprite.userData.hubBasePos.y, dt * 2.0);
        }
        // 2. HOME WORLD MANIFESTATION
        else if (currentWorld === sprite.userData.homeWorld) {
            sprite.visible = true;

            // Special scaling for manifestation
            const targetScale = sprite.name === 'Dragon' ? 8.0 : 6.5;
            sprite.scale.set(targetScale, targetScale, 1);

            // Move towards manifest position (Skip if attached to Spirit)
            if (sprite.parent === scene) {
                sprite.position.lerp(sprite.userData.manifestPos, delta * 3.0);
                sprite.userData.baseY = sprite.userData.manifestPos.y;
            }

            // --- Specialized Lore Behaviors ---
            switch (sprite.name) {
                case 'Panda':
                    // Meditative breathing (Pulse scale)
                    const p = Math.sin(time * 0.5) * 0.05 + 1.0;
                    sprite.scale.set(targetScale * p, targetScale * p, 1);
                    break;
                case 'Ghosty':
                    // Ghostly fading/flickering
                    const mat = sprite.material as THREE.SpriteMaterial;
                    mat.opacity = 0.5 + Math.sin(time * 2.5) * 0.2;
                    sprite.position.x += Math.sin(time * 0.5) * 0.005; // Gentle float
                    break;
                case 'Auto':
                    // Mechanical jitter/look-around
                    sprite.rotation.y = Math.sin(time * 12) * 0.08;
                    if (Math.random() > 0.99) sprite.position.y += 0.15; // Jitter hop
                    break;
                case 'Whiskers':
                    // Rapid cat bobbing near fire
                    sprite.userData.bobSpeed = 5.0;
                    break;
                case 'Zorp':
                    // Scanning rotation
                    sprite.rotation.y += delta * 4.0;
                    break;
                case 'Dragon':
                    // Subtle golden/creative pulse
                    const dragMat = sprite.material as THREE.SpriteMaterial;
                    if (dragMat.color) dragMat.color.setHSL(0.1, 0.8, 0.7 + Math.sin(time * 2) * 0.1);
                    break;
            }
        }
        // 3. Not in Cosmic Hub, not in Home World -> Invisible
        else {
            sprite.visible = false;
        }
    });
}

export function disposeAvatars() {
    activeAvatars.forEach(a => a.destroy && a.destroy());
    activeAvatars.length = 0;
    activeSprites.length = 0; // KEY FIX: Clear in-place to preserve exported reference
    activeTextures.forEach(t => t.dispose());
    activeTextures.length = 0;
}