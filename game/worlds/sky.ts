import * as THREE from 'three';
import { mat, addWorldElement, addGradientSky, setupWorldLighting, createWeatherStation } from './common';

export function buildSkyIslandWorld(scene: THREE.Scene) {
    addGradientSky(scene, 0xffc1e3, 0x80d8ff);
    setupWorldLighting(scene, 0xffffff, 0xb3e5fc, 1.2);
    const createVastIsland = (radius: number, x: number, z: number, y: number = 0) => {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        const base = new THREE.Mesh(new THREE.ConeGeometry(radius, radius * 0.8, 7), mat(0x9ca3af));
        base.rotation.x = Math.PI;
        base.position.y = -radius * 0.4;
        group.add(base);
        const grass = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.95, 0.6, 7), mat(0x86efac));
        grass.position.y = 0.3;
        group.add(grass);
        addWorldElement(scene, group);
        return group;
    };
    createVastIsland(30, 0, 0, 0);
    const satellites = [
        { r: 18, d: 65, a: 0, y: 10 },
        { r: 20, d: 80, a: 2.3, y: -15 },
        { r: 14, d: 55, a: 4.1, y: 6 },
        { r: 25, d: 100, a: 1.2, y: 20 }
    ];
    satellites.forEach(s => {
        const sx = Math.cos(s.a) * s.d;
        const sz = Math.sin(s.a) * s.d;
        createVastIsland(s.r, sx, sz, s.y);
        const count = 10;
        for (let i = 1; i < count; i++) {
            const t = i / count;
            const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.7, 3), mat(0xd1d5db));
            step.position.set(sx * t, s.y * t, sz * t);
            step.userData.bobSpeed = 1.0;
            step.userData.bobOffset = i;
            step.userData.baseY = step.position.y;
            addWorldElement(scene, step);
        }
    });

    // Add Weather Station
    const weatherStation = createWeatherStation();
    weatherStation.position.set(-15, 0, -5);
    addWorldElement(scene, weatherStation);
}
