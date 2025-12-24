import * as THREE from 'three';
import { mat, createLowPolyRock, addWorldElement, addGradientSky, setupWorldLighting } from './common';

// --- Procedural Corn Assets ---

const createCornKernelTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Background (Golden Yellow)
    ctx.fillStyle = '#e6b800';
    ctx.fillRect(0, 0, 256, 256);

    // Draw Kernels (Grid of ovals)
    const rows = 16;
    const cols = 8;
    const w = 256 / cols;
    const h = 256 / rows;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            // Slight offset for organic look
            const offX = (y % 2) * (w / 2);

            // Gradient for depth
            const grad = ctx.createRadialGradient(
                x * w + offX + w / 2, y * h + h / 2, 2,
                x * w + offX + w / 2, y * h + h / 2, w / 1.5
            );
            grad.addColorStop(0, '#ffdb4d'); // Highlight
            grad.addColorStop(0.5, '#cca300'); // Base
            grad.addColorStop(1, '#997a00'); // Shadow

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(x * w + offX + w / 2, y * h + h / 2, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Outline
            ctx.strokeStyle = '#665200';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
};

// Singleton texture to save memory
let _cornTexture: THREE.CanvasTexture | null = null;
const getCornTexture = () => {
    if (!_cornTexture) _cornTexture = createCornKernelTexture();
    return _cornTexture;
};

const createCurvedLeaf = (length = 1.5, width = 0.3) => {
    const segments = 6;
    const vertices = [];
    const uvs = [];
    const indices = [];

    // Curve control points: Start (0,0,0), Up & Out, Droop Down
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.1, length * 0.4, 0),
        new THREE.Vector3(0.5, length * 0.7, 0),
        new THREE.Vector3(0.9, length * 0.5, 0) // Droop info
    ]);

    const points = curve.getPoints(segments);

    for (let i = 0; i <= segments; i++) {
        const p = points[i];
        const t = i / segments;
        // Width taper: Thin start (stem), Wide middle, Pointy tip
        const w = width * Math.sin(t * Math.PI);

        // Cross vector (Z axis assuming leaf goes along X/Y plane)
        vertices.push(p.x, p.y, p.z - w / 2); // Left
        vertices.push(p.x, p.y, p.z + w / 2); // Right

        uvs.push(0, t);
        uvs.push(1, t);

        if (i < segments) {
            const base = i * 2;
            // 2 triangles forming a quad, double sided
            indices.push(base, base + 1, base + 2);
            indices.push(base + 1, base + 3, base + 2);
            indices.push(base, base + 2, base + 1);
            indices.push(base + 1, base + 2, base + 3);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        color: 0x558b2f,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0.1
    });

    return new THREE.Mesh(geo, mat);
};

// --- Main Crop Function ---

const createMemoryCrop = () => {
    const group = new THREE.Group();
    group.userData.isCrop = true;

    // Plant Structure container (scales together)
    const plant = new THREE.Group();
    group.add(plant);

    // Main Stalk (Jointed look)
    const stalkHeight = 2.0;
    const joints = 4;
    const jointH = stalkHeight / joints;
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x689f38, roughness: 0.8 });

    for (let i = 0; i < joints; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, jointH, 7), stalkMat);
        seg.position.y = (i * jointH) + (jointH / 2);
        // Add a "node" bulge
        const node = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 8), stalkMat);
        node.rotation.x = Math.PI / 2;
        node.position.y = jointH / 2; // Top of segment
        seg.add(node);
        plant.add(seg);

        // Add leaves at nodes (alternating sides)
        if (i > 0 && i < joints) {
            const leaf = createCurvedLeaf(1.0 + Math.random() * 0.5, 0.25);
            leaf.position.y = i * jointH;
            // Alternate rotation
            leaf.rotation.y = (i % 2 === 0) ? 0 : Math.PI;
            // Random variation
            leaf.rotation.y += (Math.random() - 0.5);
            plant.add(leaf);
        }
    }

    // The Corn Ear (The Memory)
    const earGroup = new THREE.Group();
    earGroup.position.set(0.05, stalkHeight * 0.65, 0);
    earGroup.rotation.z = -Math.PI / 6; // Angled out
    plant.add(earGroup);

    // Husk (Leaf wrapping bottom)
    const husk = createCurvedLeaf(0.8, 0.3);
    husk.rotation.z = Math.PI / 2; // Wrap around
    husk.position.y = -0.2;
    earGroup.add(husk);

    // Kernels (Textured Cylinder)
    const cobGeo = new THREE.CapsuleGeometry(0.12, 0.6, 4, 12);
    const cobMat = new THREE.MeshStandardMaterial({
        map: getCornTexture(),
        bumpMap: getCornTexture(),
        bumpScale: 0.05,
        color: 0xffffff,
        emissive: 0xffa000,
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.2
    });
    const cob = new THREE.Mesh(cobGeo, cobMat);
    earGroup.add(cob);

    // Silk (Hair particles at top)
    const silkGeo = new THREE.BufferGeometry();
    const silkCount = 30;
    const silkVerts = [];
    for (let i = 0; i < silkCount; i++) {
        const r = 0.05;
        const theta = Math.random() * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = 0.3; // Top of cob
        // End point
        const len = 0.3 + Math.random() * 0.2;
        silkVerts.push(x, y, z);
        silkVerts.push(x + (Math.random() - 0.5) * 0.2, y + len, z + (Math.random() - 0.5) * 0.2);
    }
    silkGeo.setAttribute('position', new THREE.Float32BufferAttribute(silkVerts, 3));
    const silkMat = new THREE.LineBasicMaterial({ color: 0xffecb3, transparent: true, opacity: 0.6 });
    const silk = new THREE.LineSegments(silkGeo, silkMat);
    earGroup.add(silk);

    // Keep hidden until mature
    earGroup.visible = false;

    // Lifecycle State
    const state = {
        phase: 'growing',
        timer: Math.random() * 5,
        maxHeight: 1.0, // Scale multiplier
        burnTime: 0
    };

    group.userData.onUpdate = (time: number) => {
        const dt = 0.016;

        switch (state.phase) {
            case 'growing':
                if (plant.scale.y < state.maxHeight) {
                    plant.scale.y += dt * 0.5; // Grow slower
                } else {
                    state.phase = 'mature';
                    earGroup.visible = true;
                }
                break;
            case 'mature':
                // Pulse the corn glow
                const pulse = Math.sin(time * 3) * 0.3 + 0.5;
                cobMat.emissiveIntensity = pulse;

                if (Math.random() < 0.0005) { // Rare burn
                    state.phase = 'burning';
                }
                break;
            case 'burning':
                state.burnTime += dt;
                earGroup.visible = false;
                stalkMat.color.setHex(0xff5722); // Fire

                // Add temporary flame if not present
                // Add temporary flame if not present
                if (!group.userData.flame) {
                    const f = new THREE.Group();
                    // Taller flames
                    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.2, 4), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
                    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.15, 1.0, 4), new THREE.MeshBasicMaterial({ color: 0xff5500 }));
                    f2.position.x = 0.1; f2.rotation.z = -0.2;
                    f.add(f1, f2);
                    f.position.y = plant.scale.y * 0.5; // mid-height
                    group.add(f);
                    group.userData.flame = f;
                }

                if (group.userData.flame) {
                    const f = group.userData.flame;
                    // Stretch it vertically more
                    f.scale.set(0.8 + Math.random() * 0.4, 1.0 + Math.random() * 0.8, 0.8 + Math.random() * 0.4);
                    f.position.y = plant.scale.y * 0.8;
                }

                // Charring effect
                plant.scale.y = Math.max(0.2, plant.scale.y - dt * 1.5); // Burn faster

                if (state.burnTime > 1.5) {
                    state.phase = 'ash';
                    state.burnTime = 0;
                    if (group.userData.flame) {
                        group.remove(group.userData.flame);
                        group.userData.flame = null;
                    }
                }
                break;
            case 'ash':
                stalkMat.color.setHex(0x3e2723);
                cobMat.color.setHex(0x000000);
                plant.scale.y = 0.2;
                if (Math.random() < 0.005) {
                    // Regrow
                    state.phase = 'growing';
                    stalkMat.color.setHex(0x689f38);
                    cobMat.color.setHex(0xffffff);
                }
                break;
        }
    };

    return group;
};

// --- Dragon Spirit ---

const createDragonSpirit = () => {
    const group = new THREE.Group();
    group.name = 'DragonSpirit';
    // ^ NAME IT so we can find it later for attaching avatar!

    const segments = 12;

    for (let i = 0; i < segments; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.4 * (1 - i / segments), 8, 8), mat(0xffaa00));
        s.position.z = -i * 0.8; // Negative Z so tail trails behind head
        group.add(s);
    }

    const light = new THREE.PointLight(0xff5500, 2, 15);
    group.add(light);

    // FIXED: Reversed the movement direction
    group.userData.onUpdate = (time: number) => {
        const t = time * 0.4;

        // Path: Figure 8-ish
        const getPos = (offset: number) => {
            const T = t + offset;
            return new THREE.Vector3(
                Math.sin(T) * 25,
                15 + Math.sin(T * 2) * 3,
                Math.cos(T * 0.7) * 25
            );
        };

        const currentPos = getPos(0);
        const futurePos = getPos(0.05); // Look slightly ahead

        group.position.copy(currentPos);
        group.lookAt(futurePos);

        // Undulate segments (snake movement)
        group.children.forEach((c, i) => {
            if (c instanceof THREE.Mesh) {
                // Simple sine wave relative to body is okay, 
                // but real trails need a position history buffer. 
                // For now, simpler undulation:
                c.position.y = Math.sin(time * 5 - i) * 0.3; // -i to ripple backwards
            }
        });
    };

    return group;
}

export function buildMemoryCropsWorld(scene: THREE.Scene) {
    addGradientSky(scene, 0x5d4037, 0xffab91); // Brown to Peach
    setupWorldLighting(scene, 0xffccbc, 0x8d6e63, 1.5); // Bright warm light

    // Rolling Terrain Function
    const getTerrainHeight = (x: number, z: number) => {
        // Gentle rolling hills
        const h1 = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
        const h2 = Math.sin(x * 0.3 + z * 0.2) * 0.5;
        // Flatten center for the Spire
        const dist = Math.sqrt(x * x + z * z);
        const centerFlatten = Math.min(1, Math.max(0, (dist - 5) / 10));

        return (h1 + h2) * centerFlatten;
    };

    // Create Ground Mesh
    const groundGeo = new THREE.PlaneGeometry(120, 120, 64, 64);
    groundGeo.rotateX(-Math.PI / 2);

    // Deform vertices
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, getTerrainHeight(x, z));
    }
    groundGeo.computeVertexNormals();

    const ground = new THREE.Mesh(groundGeo, mat(0x4e342e));
    addWorldElement(scene, ground);

    // Spire (Central Rock Formation)
    const spire = new THREE.Group();
    // Build it up from y=0
    for (let i = 0; i < 6; i++) {
        const rock = createLowPolyRock(3 - i * 0.4, 0x1a1a1a);
        rock.position.y = i * 1.5;
        rock.rotation.y = Math.random() * Math.PI;
        rock.castShadow = true;
        spire.add(rock);
    }
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), mat(0xff3d00));
    core.position.y = 8;
    spire.add(core);
    const coreLight = new THREE.PointLight(0xff3d00, 3, 25);
    coreLight.position.y = 9;
    spire.add(coreLight);

    addWorldElement(scene, spire);

    // Scatter Crops on the Hills
    for (let i = 0; i < 300; i++) { // Increased count for lushness
        const crop = createMemoryCrop();
        const a = Math.random() * Math.PI * 2;
        // Don't spawn too close to center
        const d = 6 + Math.random() * 50;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        const y = getTerrainHeight(x, z);

        crop.position.set(x, y, z);

        // Orient to normal roughly? (Optional, simplifies to just standing up)
        // crop.lookAt(...) 

        addWorldElement(scene, crop);
    }

    const dragon = createDragonSpirit();
    addWorldElement(scene, dragon);
}
