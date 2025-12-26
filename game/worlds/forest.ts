import * as THREE from 'three';
import { mat, rand, addWorldElement, addGradientSky, setupWorldLighting } from './common';
import { createWeatherStation } from './campground';

const createShrub = (size = 1) => {
    const group = new THREE.Group();
    const leafColor = 0x2d5016;
    const stickColor = 0x5d4e37;
    const branchCount = 6;

    for (let i = 0; i < branchCount; i++) {
        const branchGroup = new THREE.Group();
        const height = size * (0.6 + Math.random() * 0.5);
        const r = 0.04;

        // Stick
        const stick = new THREE.Mesh(
            new THREE.CylinderGeometry(r, r, height, 4),
            mat(stickColor)
        );
        stick.position.y = height / 2;
        branchGroup.add(stick);

        // Leaves
        const leaf = new THREE.Mesh(
            new THREE.SphereGeometry(size * 0.2, 5, 4),
            mat(leafColor)
        );
        leaf.position.y = height;
        leaf.scale.y = 0.4;
        branchGroup.add(leaf);

        const angle = (i / branchCount) * Math.PI * 2 + Math.random();
        const dist = size * 0.2;
        branchGroup.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        branchGroup.rotation.z = 0.3 + Math.random() * 0.3;
        branchGroup.rotation.y = angle;

        group.add(branchGroup);
    }
    return group;
};

const createRedwoodTree = (scale = 1) => {
    const group = new THREE.Group();

    // Massive Trunk
    const trunkH = 55 * scale;
    const r = 2.5 * scale;
    // Taper to a point (0.1) so it doesn't pop out
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.05, r, trunkH, 8),
        mat(0x5d4037)
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // High Canopy (multiple layers)
    const canopyStart = trunkH * 0.45; // Higher up to clear ground (was 0.25)
    const canopyHeight = trunkH - canopyStart + (5 * scale); // Extend top slightly
    const layers = 8;

    for (let i = 0; i < layers; i++) {
        const progress = i / (layers - 1);
        const layerY = canopyStart + (progress * (canopyHeight * 0.9)); // Spread along top section

        // Non-linear size for better shape
        const sizeCurve = Math.pow(1 - progress, 0.8);
        const layerR = r * 3.5 * sizeCurve + (r * 0.5); // Narrower base (was r*6)
        const layerH = (10 - (progress * 4)) * scale; // Layers get shorter near top

        // Use ConeGeometry with segments to allow noise
        const geo = new THREE.ConeGeometry(layerR, layerH, 9, 3);
        const pos = geo.attributes.position;

        // Add Noise to vertices
        for (let k = 0; k < pos.count; k++) {
            // Distort vertices slightly for "brush" effect
            const noise = 0.8 * scale; // Reduced noise slightly for cleaner layers
            pos.setXYZ(
                k,
                pos.getX(k) + (Math.random() - 0.5) * noise,
                pos.getY(k) + (Math.random() - 0.5) * noise,
                pos.getZ(k) + (Math.random() - 0.5) * noise
            );
        }
        geo.computeVertexNormals();

        const layer = new THREE.Mesh(geo, mat(0x1b5e20));
        layer.position.y = layerY;
        layer.castShadow = true;
        // Random rotation for extra variance
        layer.rotation.y = Math.random() * Math.PI;
        layer.rotation.z = (Math.random() - 0.5) * 0.15;
        group.add(layer);
    }

    return group;
};

const createFireflies = (count = 20, area = 10) => {
    const group = new THREE.Group();
    group.userData.isFireflies = true;
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const m = mat(0xffff00, 0xffff00); // Glowing yellow

    for (let i = 0; i < count; i++) {
        const fly = new THREE.Mesh(geo, m);
        fly.position.set(
            (Math.random() - 0.5) * area,
            1 + Math.random() * 2,
            (Math.random() - 0.5) * area
        );
        fly.userData = {
            baseY: fly.position.y,
            speed: 0.5 + Math.random(),
            offset: Math.random() * 10
        };
        group.add(fly);
    }
    return group;
};

export function buildSequoiaForestWorld(scene: THREE.Scene) {
    addGradientSky(scene, 0x052e16, 0x064e3b); // Deep forest green/night
    setupWorldLighting(scene, 0x4a7c59, 0x022c22, 0.6); // Brightened from 0.4

    // Ground
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 1, 12), mat(0x1a2e1a));
    ground.position.y = -0.5;
    addWorldElement(scene, ground);

    // Massive Redwoods
    for (let i = 0; i < 25; i++) {
        const trunkH = rand(25, 40);
        const r = rand(1.8, 3.0);
        // Use new detailed redwood helper
        const tree = createRedwoodTree(r * 0.4);
        const a = (i / 25) * Math.PI * 2 + rand(-0.2, 0.2);
        const d = rand(18, 55); // Pushed further out (was 12-38) to reduce crowding
        tree.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        tree.rotation.y = rand(0, Math.PI);
        addWorldElement(scene, tree);
    }

    // Shrubs & Undergrowth
    for (let i = 0; i < 40; i++) {
        const shrub = createShrub(rand(0.8, 1.5));
        const a = rand(0, Math.PI * 2);
        const d = rand(5, 35);
        shrub.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        addWorldElement(scene, shrub);
    }

    // Fireflies (Night Ambience)
    const fireflies = createFireflies(30, 25);
    fireflies.position.y = 2;
    fireflies.visible = true; // Default to night/moody
    addWorldElement(scene, fireflies);

    // Weather Station (for toggling Day/Night)
    const station = createWeatherStation();
    station.position.set(0, 0, 5);
    addWorldElement(scene, station);
}
