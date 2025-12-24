import * as THREE from 'three';
import { mat, addWorldElement, setupWorldLighting } from './common';

export const hubIslands = [
    { id: 'campground', pos: [-16, 0, 0], color: 0x4caf50 },
    { id: 'mountains', pos: [16, 3, 8], color: 0x90caf9 },
    { id: 'forest', pos: [0, -3, -16], color: 0x2e7d32 },
    { id: 'caves', pos: [-12, 5, -12], color: 0x673ab7 },
    { id: 'sky', pos: [12, -4, 12], color: 0x81d4fa },
    { id: 'crops', pos: [0, -6, 16], color: 0xff7043 },
    { id: 'waterfalls', pos: [-12, -4, 12], color: 0x0277bd } // Waterfalls island
];

export function buildCosmicHubWorld(scene: THREE.Scene) {
    setupWorldLighting(scene, 0x402060, 0x050510, 0.7);

    const geodesicCore = new THREE.Group();
    const baseGeo = new THREE.IcosahedronGeometry(3.5, 2).toNonIndexed();
    const posAttr = baseGeo.attributes.position;

    for (let i = 0; i < posAttr.count; i += 3) {
        const v1 = new THREE.Vector3().fromBufferAttribute(posAttr, i);
        const v2 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
        const v3 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);
        const triangleGeo = new THREE.BufferGeometry().setFromPoints([v1, v2, v3]);
        triangleGeo.computeVertexNormals();
        const color = new THREE.Color(0xff00ff).lerp(new THREE.Color(0xaa00ff), Math.random() * 0.3);
        const shard = new THREE.Mesh(triangleGeo, mat(color, color, 0.8));
        const center = new THREE.Vector3().add(v1).add(v2).add(v3).divideScalar(3);
        shard.userData.center = center.clone();
        shard.userData.bobSpeed = 0.6 + Math.random() * 0.4;
        shard.userData.bobHeight = 0.2;
        shard.userData.rotateSpeed = 0.1 + Math.random() * 0.2;
        geodesicCore.add(shard);
    }
    geodesicCore.position.y = 2;
    geodesicCore.userData.rotateSpeed = 0.05;
    addWorldElement(scene, geodesicCore);

    const ringGroup = new THREE.Group();
    for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), mat(0x00ffff, 0x00ffff));
        shard.position.set(Math.cos(a) * 8.5, 0, Math.sin(a) * 8.5);
        shard.rotation.set(Math.random(), Math.random(), Math.random());
        shard.userData.rotateSpeed = 0.8;
        ringGroup.add(shard);
    }
    ringGroup.position.y = 2;
    ringGroup.userData.rotateSpeed = -0.08;
    addWorldElement(scene, ringGroup);

    const islands = hubIslands;
    islands.forEach(data => {
        const group = new THREE.Group();
        group.position.set(data.pos[0], data.pos[1], data.pos[2]);

        // Base Platform
        const base = new THREE.Mesh(new THREE.ConeGeometry(3, 4, 5), mat(0x222222));
        base.rotation.x = Math.PI;
        group.add(base);

        // Unique Marker Logic
        const markerGroup = new THREE.Group();
        markerGroup.position.y = 2.0;

        switch (data.id) {
            case 'campground':
                // Tent
                const tent = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.5, 4), mat(data.color));
                tent.rotation.y = Math.PI / 4;
                markerGroup.add(tent);
                // Fire
                const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 3), mat(0xff5722, 0xff5722));
                f.position.set(0.8, -0.5, 0.8);
                markerGroup.add(f);
                break;

            case 'mountains':
                // Snowy Peak
                const mtn = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.5, 4), mat(0x546e7a));
                const snow = new THREE.Mesh(new THREE.ConeGeometry(1.51, 0.8, 4), mat(0xffffff));
                snow.position.y = 0.85;
                markerGroup.add(mtn);
                markerGroup.add(snow);
                break;

            case 'forest':
                // Tree
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1, 5), mat(0x3e2723));
                const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.5, 5), mat(data.color));
                leaves.position.y = 1.0;
                markerGroup.add(trunk);
                markerGroup.add(leaves);
                break;

            case 'caves':
                // Crystal Cluster
                for (let k = 0; k < 5; k++) {
                    const cry = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 3), mat(data.color, data.color));
                    cry.position.set((Math.random() - 0.5), 0, (Math.random() - 0.5));
                    cry.rotation.set((Math.random() - 0.5), 0, (Math.random() - 0.5));
                    markerGroup.add(cry);
                }
                break;

            case 'sky':
                // Cloud
                const cloud = new THREE.Group();
                for (let k = 0; k < 3; k++) {
                    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6), mat(0xffffff));
                    puff.position.set((Math.random() - 0.5) * 1.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.5);
                    cloud.add(puff);
                }
                markerGroup.add(cloud);
                break;

            case 'crops':
                // Golden Corn/Wheat
                const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2, 4), mat(0xffeb3b));
                const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 4, 8), mat(0xffa000));
                ear.position.y = 0.5;
                ear.rotation.z = -0.3;
                markerGroup.add(stalk);
                markerGroup.add(ear);
                break;

            case 'waterfalls':
                // Mini Fall
                const rock = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1), mat(0x546e7a));
                rock.position.y = 0.5;
                const stream = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.1), mat(0x0277bd, 0x000000, 0.8));
                stream.position.set(0, -0.2, 0.5);
                stream.rotation.x = -Math.PI / 6;
                markerGroup.add(rock);
                markerGroup.add(stream);
                break;

            default:
                // Fallback
                const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), mat(data.color, data.color, 0.8));
                markerGroup.add(m);
        }

        markerGroup.userData.bobSpeed = 1.0;
        markerGroup.userData.baseY = 2.0;

        // Add a glow halo
        const halo = new THREE.PointLight(data.color, 2, 5);
        halo.position.y = 1;
        markerGroup.add(halo);

        group.add(markerGroup);
        group.userData.worldId = data.id;
        addWorldElement(scene, group);
    });
}
