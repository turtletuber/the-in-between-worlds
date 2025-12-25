import * as THREE from 'three';
import { mat, rand, addWorldElement, addGradientSky, setupWorldLighting, createWeatherStation } from './common';

export function buildMountainsWorld(scene: THREE.Scene) {
    addGradientSky(scene, 0x546e7a, 0x90a4ae);
    setupWorldLighting(scene, 0xffffff, 0xb0bec5, 1.0);
    const ground = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 2, 8), mat(0x78909c));
    ground.position.y = -1;
    addWorldElement(scene, ground);
    for (let i = 0; i < 12; i++) {
        const h = rand(25, 45);
        const r = rand(10, 18);
        const sides = Math.random() > 0.5 ? 3 : 4;
        const mnt = new THREE.Mesh(new THREE.ConeGeometry(r, h, sides), mat(0x455a64));
        mnt.position.y = h / 2 - 1;
        const capH = h * 0.4;
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.4, capH, sides), mat(0xffffff));
        cap.position.y = h * 0.3;
        cap.scale.set(1.1, 1, 1.1);
        mnt.add(cap);
        const a = rand(0, Math.PI * 2);
        const d = rand(30, 50);
        mnt.position.x = Math.cos(a) * d;
        mnt.position.z = Math.sin(a) * d;
        mnt.rotation.y = rand(0, Math.PI * 2);
        addWorldElement(scene, mnt);
    }

    // Add Weather Station
    const weatherStation = createWeatherStation();
    weatherStation.position.set(10, 0, 10);
    addWorldElement(scene, weatherStation);
}
