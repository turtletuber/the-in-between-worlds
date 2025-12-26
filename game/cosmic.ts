import * as THREE from 'three';

export class CosmicHub {
    scene: THREE.Scene;
    stars: THREE.Points | null = null;
    nebula: THREE.Mesh | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    create() {
        // Low Poly Stars (Larger, fewer, square points)
        const count = 300;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r = 100 + Math.random() * 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            sizes[i] = 1.0 + Math.random() * 2.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.8
        });

        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);

        // High Visibility Nebula (Particle Cloud)
        const nebulaCount = 2000;
        const nebGeo = new THREE.BufferGeometry();
        const nebPos = new Float32Array(nebulaCount * 3);

        for (let i = 0; i < nebulaCount; i++) {
            const r = 80 + Math.random() * 120; // Wide spread
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            nebPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            nebPos[i * 3 + 1] = (r * Math.sin(phi) * Math.sin(theta)) * 0.5; // Flattened disc
            nebPos[i * 3 + 2] = r * Math.cos(phi);
        }

        nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));

        const nebMat = new THREE.PointsMaterial({
            color: 0xff00ff, // Bright Magenta
            size: 2.0, // Large points
            transparent: true,
            opacity: 0.6, // High visibility
            sizeAttenuation: true
        });

        // Use Points for the nebula instead of Mesh
        // We cast to any because in TS class def it might be defined as Mesh
        this.nebula = new THREE.Points(nebGeo, nebMat) as any;
        this.scene.add(this.nebula);
    }

    update(delta: number) {
        if (this.stars) this.stars.rotation.y += delta * 0.02;
        if (this.nebula) this.nebula.rotation.x += delta * 0.01;
    }
}