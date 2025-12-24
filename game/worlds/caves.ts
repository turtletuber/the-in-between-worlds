import * as THREE from 'three';
import { mat, rand, addWorldElement, addGradientSky, setupWorldLighting } from './common';

const createGlowingRiver = () => {
    const group = new THREE.Group();
    group.userData.isGlowingRiver = true;

    // Create diagonal river using PlaneGeometry
    const riverLength = 80;
    const riverWidth = 3.0;
    const riverGeometry = new THREE.PlaneGeometry(riverWidth, riverLength, 30, 80);

    const positions = riverGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const normalizedY = y / (riverLength / 2);

        let sCurve = Math.sin(normalizedY * Math.PI * 2) * 0.8 + Math.sin(normalizedY * Math.PI * 4) * 0.3;

        // Campfire avoidance (center bulge) simulation
        const dist = Math.abs(normalizedY);
        if (dist < 0.4) {
            const avoid = (0.4 - dist) / 0.4;
            sCurve -= avoid * Math.cos(dist * Math.PI / 0.4) * 4.5;
        }

        const h = Math.sin(y * 0.15) * 0.4 + Math.cos(x * 0.3 + y * 0.2) * 0.3;
        positions.setX(i, x + sCurve);
        positions.setZ(i, h);
    }
    riverGeometry.computeVertexNormals();

    const riverMat = new THREE.MeshPhongMaterial({
        color: 0x00ffff, emissive: 0x00ccff, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.85, shininess: 100, side: THREE.DoubleSide
    });

    const riverMesh = new THREE.Mesh(riverGeometry, riverMat);
    riverMesh.rotation.y = -Math.PI / 4;
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.y = 0.1;
    group.add(riverMesh);

    // Particles
    const particles: THREE.Mesh[] = [];
    for (let i = 0; i < 40; i++) {
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), mat(0xffffff));
        p.material.transparent = true;
        p.material.opacity = 0.8;

        const t = i / 40;
        const localY = (t - 0.5) * riverLength;
        const normY = localY / (riverLength / 2);

        let sCurve = Math.sin(normY * Math.PI * 2) * 0.8 + Math.sin(normY * Math.PI * 4) * 0.3;
        const dist = Math.abs(normY);
        if (dist < 0.4) {
            const avoid = (0.4 - dist) / 0.4;
            sCurve -= avoid * Math.cos(dist * Math.PI / 0.4) * 4.5;
        }

        p.position.set(sCurve, localY, 0.2);
        p.userData = { flowProgress: t, speed: 0.3 + Math.random() * 0.2 };
        particles.push(p);
        riverMesh.add(p);
    }

    // Update function
    group.userData.onUpdate = (time: number) => {
        const pulse = Math.sin(time * 1.5) * 0.3 + 0.7;
        if (riverMesh.material instanceof THREE.MeshPhongMaterial) {
            riverMesh.material.emissiveIntensity = 0.8 * pulse;
        }

        particles.forEach(p => {
            const ud = p.userData;
            let np = ud.flowProgress - ud.speed * 0.01;
            if (np < 0) np = 1;
            ud.flowProgress = np;

            const ly = (np - 0.5) * riverLength;
            const ny = ly / (riverLength / 2);
            let sc = Math.sin(ny * Math.PI * 2) * 0.8 + Math.sin(ny * Math.PI * 4) * 0.3;
            const d = Math.abs(ny);
            if (d < 0.4) {
                const a = (0.4 - d) / 0.4;
                sc -= a * Math.cos(d * Math.PI / 0.4) * 4.5;
            }
            p.position.x = sc;
            p.position.y = ly;
            (p.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(time * 3 + np * 10) * 0.4;
        });
    };

    return group;
};

const createCrystal = (color = 0x00ffff, scale = 1) => {
    const group = new THREE.Group();
    // Octahedron crystal
    const geo = new THREE.OctahedronGeometry(1, 0);
    geo.scale(scale * 0.6, scale * 2, scale * 0.6);

    const m = new THREE.MeshPhongMaterial({
        color: color, emissive: color, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.8, flatShading: true
    });
    const crystal = new THREE.Mesh(geo, m);
    crystal.position.y = scale;
    group.add(crystal);

    // Light
    const light = new THREE.PointLight(color, 1, 10);
    light.position.y = scale * 1.5;
    group.add(light);

    // Base
    const base = new THREE.Mesh(new THREE.DodecahedronGeometry(scale * 0.8, 0), mat(0x4a4a5a));
    base.position.y = 0.3;
    group.add(base);

    group.userData.onUpdate = (time: number) => {
        const pulse = Math.sin(time * 2) * 0.3 + 0.7;
        light.intensity = 1.0 * pulse;
        m.emissiveIntensity = 0.5 * pulse;
        group.rotation.y += 0.002;
    };

    return group;
};

const createStalagmite = (height = 2) => {
    const group = new THREE.Group();
    const geo = new THREE.ConeGeometry(0.5, height, 6, 3);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const n = (Math.random() - 0.5) * 0.15;
        pos.setXYZ(i, pos.getX(i) + n, pos.getY(i), pos.getZ(i) + n);
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, mat(0x5a5a6a));
    mesh.position.y = height / 2;
    group.add(mesh);
    return group;
}

export function buildCrystalCavesWorld(scene: THREE.Scene) {
    addGradientSky(scene, 0x000000, 0x1a1a2e); // Dark cave void
    setupWorldLighting(scene, 0x311b92, 0x050010, 0.3);

    const ground = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 1, 12), mat(0x120021));
    ground.position.y = -0.5;
    addWorldElement(scene, ground);

    // Glowing River ("Stream of Data")
    const river = createGlowingRiver();
    river.position.set(0, 0, 0);
    addWorldElement(scene, river);

    // Main Master Crystal (Interactive)
    const masterCrystal = createCrystal(0xff00ff, 2.0);
    masterCrystal.position.set(0, 0, -5);
    masterCrystal.userData.isMasterCrystal = true;
    masterCrystal.userData.isClickable = true;
    addWorldElement(scene, masterCrystal);

    // Scattered Crystals
    const colors = [0x00e5ff, 0xd500f9, 0x76ff03];
    for (let i = 0; i < 20; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const c = createCrystal(color, rand(0.8, 1.5));
        const a = rand(0, Math.PI * 2);
        const d = rand(8, 30);
        c.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        addWorldElement(scene, c);
    }

    // Stalagmites
    for (let i = 0; i < 15; i++) {
        const s = createStalagmite(rand(1.5, 4));
        const a = rand(0, Math.PI * 2);
        const d = rand(10, 35);
        s.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        addWorldElement(scene, s);
    }
}
