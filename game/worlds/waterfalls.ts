import * as THREE from 'three';
import { mat, addWorldElement, addGradientSky, setupWorldLighting, createToggleableFire } from './common';

const createWaterfall = (height: number, width: number, scene: THREE.Scene) => {
    const group = new THREE.Group();

    // Water plane
    const geo = new THREE.PlaneGeometry(width, height, 4, 12);
    // Simple shader for flowing water
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    const fragmentShader = `
        uniform float time;
        varying vec2 vUv;
        void main() {
            float noise = sin(vUv.y * 20.0 - time * 5.0) * 0.1 + sin(vUv.x * 10.0) * 0.05;
            float flow = mod(vUv.y - time * 0.5, 1.0);
            vec3 color = mix(vec3(0.2, 0.6, 1.0), vec3(0.5, 0.8, 1.0), flow + noise);
            
            // Foam edges
            if (vUv.x < 0.1 || vUv.x > 0.9) color += 0.3;
            
            gl_FragColor = vec4(color, 0.85);
        }
    `;

    const matWater = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader,
        fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });

    const water = new THREE.Mesh(geo, matWater);
    water.rotation.x = -0.1; // Slightly angled
    group.add(water);

    // Mist at bottom
    const mistGeo = new THREE.SphereGeometry(width * 0.8, 8, 8, 0, Math.PI);
    const mistMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
    const mist = new THREE.Mesh(mistGeo, mistMat);
    mist.position.y = -height / 2;
    mist.rotation.x = -Math.PI / 2;
    mist.scale.set(1, 0.5, 1);

    // Mist Animation
    mist.userData = {
        bobSpeed: 2.0,
        baseY: mist.position.y,
        bobHeight: 0.5,
        pulseSpeed: 3.0
    };

    group.add(mist);

    group.userData.onUpdate = (time: number) => {
        matWater.uniforms.time.value = time;
    };

    return group;
};

const createFloatingRock = (size: number) => {
    // Modified to be oblong and flat (platform-like)
    // Dodecahedron provides good chunkiness
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mesh = new THREE.Mesh(geo, mat(0x78909c));
    mesh.castShadow = true;
    // Flatten Y, Stretch X/Z randomly
    const stretchX = 1.2 + Math.random() * 0.5;
    const stretchZ = 1.2 + Math.random() * 0.5;
    const flatY = 0.3 + Math.random() * 0.2;
    mesh.scale.set(stretchX, flatY, stretchZ);
    return mesh;
};

const createHangingVine = (length: number) => {
    const points = [];
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
        points.push(new THREE.Vector3(
            Math.sin(i * 0.5) * 0.2,
            -i * (length / segments),
            Math.cos(i * 0.5) * 0.2
        ));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const geo = new THREE.TubeGeometry(curve, 8, 0.08, 4, false);
    const m = mat(0x558b2f); // Vine green
    const vine = new THREE.Mesh(geo, m);
    return vine;
};

const createWillowTree = (scale = 1) => {
    const group = new THREE.Group();

    // Trunk (Crooked)
    const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.2, 1, 0),
        new THREE.Vector3(-0.1, 2, 0.1),
        new THREE.Vector3(0, 3, 0)
    ]);
    const trunkGeo = new THREE.TubeGeometry(trunkCurve, 5, 0.2 * scale, 5, false);
    const trunk = new THREE.Mesh(trunkGeo, mat(0x3e2723)); // Dark wood
    group.add(trunk);

    // Canopy (Drooping strands)
    const canopy = new THREE.Group();
    canopy.position.y = 2.8;
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const len = 1.5 + Math.random();

        // Curve leaf strand
        const pts = [];
        pts.push(new THREE.Vector3(0, 0, 0));
        pts.push(new THREE.Vector3(Math.cos(angle) * 0.5, 0.2, Math.sin(angle) * 0.5)); // Up a bit
        pts.push(new THREE.Vector3(Math.cos(angle) * 1.0, -len * 0.5, Math.sin(angle) * 1.0)); // Down
        pts.push(new THREE.Vector3(Math.cos(angle) * 1.2, -len, Math.sin(angle) * 1.2)); // Down more

        const curve = new THREE.CatmullRomCurve3(pts);
        const geo = new THREE.TubeGeometry(curve, 8, 0.1 * scale, 3, false);
        const mesh = new THREE.Mesh(geo, mat(0x7cb342)); // Lighter green
        canopy.add(mesh);
    }
    group.add(canopy);
    group.scale.setScalar(scale);

    return group;
};

export function buildWaterfallWorld(scene: THREE.Scene) {
    addGradientSky(scene, 0x81d4fa, 0xe0f7fa); // Bright blue sky
    setupWorldLighting(scene, 0xffffff, 0xb2ebf2, 1.1);

    // Central Pool
    const poolGeo = new THREE.CylinderGeometry(25, 20, 2, 16);
    const pool = new THREE.Mesh(poolGeo, mat(0x0277bd, 0x000000, 0.8));
    pool.position.y = -2;
    addWorldElement(scene, pool);

    // Center Grass Mound
    const moundGeo = new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.4);
    const mound = new THREE.Mesh(moundGeo, mat(0x66bb6a)); // Green grass
    mound.position.set(0, -2, 0); // Partially submerged
    mound.scale.set(1, 0.6, 1);
    addWorldElement(scene, mound);

    // Flower on mound
    const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5), mat(0xffeb3b));
    flower.position.set(0, 0.5, 0);
    flower.userData = { bobSpeed: 2.0, bobHeight: 0.1, baseY: 0.5 };
    addWorldElement(scene, flower);

    // Big Waterfall
    const bigFalls = createWaterfall(35, 12, scene);
    bigFalls.position.set(0, 15, -25);
    addWorldElement(scene, bigFalls);

    // Source Rock for Big Falls
    const sourceRock = createFloatingRock(8);
    sourceRock.position.set(0, 32, -28);
    // Force dimensions for the source rock to be distinct
    sourceRock.scale.set(2.0, 0.5, 1.5);
    addWorldElement(scene, sourceRock);

    // Trees on Source Rock
    const sourceTree = createWillowTree(1.5);
    sourceTree.position.set(2, 33, -28);
    addWorldElement(scene, sourceTree);

    // Vines on Source Rock
    for (let i = 0; i < 3; i++) {
        const v = createHangingVine(5 + Math.random() * 5);
        v.position.set(-6 + i * 4, 32, -26);
        addWorldElement(scene, v);
    }

    // Surrounding Floating Islands with smaller falls
    const islands = [
        { pos: [-20, 10, -10], scale: 5 },
        { pos: [20, 8, -5], scale: 6 },
        { pos: [-15, 5, 15], scale: 4 },
        { pos: [18, 12, 12], scale: 5 }
    ];

    islands.forEach((isl, i) => {
        // Rock Mesh
        const rock = createFloatingRock(isl.scale);
        rock.position.set(isl.pos[0], isl.pos[1], isl.pos[2]);
        rock.userData.bobSpeed = 0.5 + Math.random() * 0.5;
        rock.userData.bobHeight = 1.0;
        rock.userData.baseY = rock.position.y;
        addWorldElement(scene, rock);

        // Calculate actual width from scale for placement
        const widthEst = isl.scale * 1.5 * 0.8; // approx

        // Vines hanging from bottom
        for (let j = 0; j < 2 + Math.random() * 3; j++) {
            const vLen = 3 + Math.random() * 4;
            const vine = createHangingVine(vLen);
            // Offset from center
            const offX = (Math.random() - 0.5) * widthEst;
            const offZ = (Math.random() - 0.5) * widthEst;
            vine.position.set(isl.pos[0] + offX, isl.pos[1] - (rock.scale.y * isl.scale * 0.4), isl.pos[2] + offZ);

            // Sync bobbing with parent rock
            vine.userData.bobSpeed = rock.userData.bobSpeed;
            vine.userData.bobHeight = rock.userData.bobHeight;
            vine.userData.baseY = vine.position.y;

            addWorldElement(scene, vine);
        }

        // Tree on top
        const tree = createWillowTree(0.6 + Math.random() * 0.4);
        tree.position.set(isl.pos[0], isl.pos[1] + (rock.scale.y * isl.scale * 0.5), isl.pos[2]);
        // Adjust Y slightly to sit on curved surface
        tree.position.y -= 0.5;

        tree.userData.bobSpeed = rock.userData.bobSpeed;
        tree.userData.bobHeight = rock.userData.bobHeight;
        tree.userData.baseY = tree.position.y;

        addWorldElement(scene, tree);

        // Add a small waterfall from each island
        // Position it at edge
        const smallFalls = createWaterfall(12 + Math.random() * 5, 2 + Math.random() * 2, scene);
        smallFalls.position.set(isl.pos[0], isl.pos[1] - 4, isl.pos[2] + widthEst * 0.6);
        addWorldElement(scene, smallFalls);
    });

    // Ambient particles (mist/droplets)
    const particles = new THREE.Group();
    particles.userData.isParticles = true;
    for (let i = 0; i < 50; i++) {
        const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), mat(0xe0f7fa));
        p.position.set(
            (Math.random() - 0.5) * 60,
            Math.random() * 30,
            (Math.random() - 0.5) * 60
        );
        p.userData = {
            velocity: new THREE.Vector3(0, -0.1 - Math.random() * 0.2, 0),
            resetY: 30
        };
        particles.add(p);
    }
    particles.userData.onUpdate = (time: number) => {
        particles.children.forEach((p: any) => {
            p.position.add(p.userData.velocity);
            if (p.position.y < -5) p.position.y = p.userData.resetY;
        });
    };
    addWorldElement(scene, particles);


}
