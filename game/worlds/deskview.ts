import * as THREE from 'three';
import { mat, addWorldElement, setupWorldLighting, createToggleableFire } from './common';

const createLowPolyTree = (color: number, trunkColor: number, heightScale = 1) => {
    const group = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 2 * heightScale, 5);
    const trunk = new THREE.Mesh(trunkGeo, mat(trunkColor));
    trunk.position.y = heightScale;
    group.add(trunk);

    const layers = 3;
    for (let i = 0; i < layers; i++) {
        const size = (1.5 - (i * 0.4)) * heightScale;
        const y = (2 + (i * 1.2)) * heightScale;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(size, 1.5 * heightScale, 6), mat(color));
        cone.position.y = y;
        group.add(cone);
    }
    return group;
};

export function buildDeskviewWorld(scene: THREE.Scene) {
    setupWorldLighting(scene, 0xffeedd, 0x110d0a, 0.9);

    const lamp = new THREE.PointLight(0xffaa55, 1.8, 30);
    lamp.position.set(6, 6, 4);
    lamp.castShadow = true;
    addWorldElement(scene, lamp);

    const deskGroup = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 14), mat(0x5d4037));
    deskGroup.add(top);

    const legGeom = new THREE.CylinderGeometry(0.4, 0.2, 10, 4);
    const positions = [[-10, -8], [10, -8], [-10, 5], [10, 5]];
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeom, mat(0x222222));
        leg.position.set(pos[0], -5, pos[1]);
        deskGroup.add(leg);
    });
    deskGroup.position.y = -3;
    deskGroup.receiveShadow = true;
    addWorldElement(scene, deskGroup);

    // --- HOLLOW CRT MONITOR ---
    const monitorGroup = new THREE.Group();
    monitorGroup.position.set(0, 0, -4);

    const stand = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 5), mat(0x333333));
    stand.position.y = -2.75;
    monitorGroup.add(stand);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 1, 6), mat(0x222222));
    neck.position.y = -2.25;
    monitorGroup.add(neck);

    // Create a hollow shell (5 pieces: Bottom, Top, Left, Right, Back)
    const shellColor = 0x444444;
    const housingWidth = 10;
    const housingHeight = 8;
    const housingDepth = 8;
    const thickness = 0.4;

    const shellParts = [
        { size: [housingWidth, thickness, housingDepth], pos: [0, 1.5 - (housingHeight / 2), 0] }, // Bottom
        { size: [housingWidth, thickness, housingDepth], pos: [0, 1.5 + (housingHeight / 2), 0] }, // Top
        { size: [thickness, housingHeight, housingDepth], pos: [-(housingWidth / 2), 1.5, 0] }, // Left
        { size: [thickness, housingHeight, housingDepth], pos: [(housingWidth / 2), 1.5, 0] },  // Right
        { size: [housingWidth, housingHeight, thickness], pos: [0, 1.5, -(housingDepth / 2)] }, // Back
    ];

    shellParts.forEach(p => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]), mat(shellColor));
        mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
        monitorGroup.add(mesh);
    });

    // Glass Screen (Thin pane at the front)
    // CRT Shader Material
    const crtVertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const crtFragmentShader = `
        uniform float time;
        varying vec2 vUv;

        void main() {
            // Scanlines (sine wave pattern)
            float scanline = sin(vUv.y * 800.0) * 0.04;
            
            // Vignette (darken corners)
            vec2 center = vUv - 0.5;
            float dist = length(center);
            float vignette = smoothstep(0.4, 0.7, dist);
            
            // Base color tint (bluish glass)
            vec4 color = vec4(0.1, 0.2, 0.4, 0.1); 
            
            // Apply effects
            color.rgb -= scanline;
            color.rgb -= vignette * 0.2;
            
            // Subtle pulse
            color.a += sin(time * 2.0) * 0.01;

            gl_FragColor = color;
        }
    `;

    const crtUniforms = {
        time: { value: 0 }
    };

    const screenMat = new THREE.ShaderMaterial({
        uniforms: crtUniforms,
        vertexShader: crtVertexShader,
        fragmentShader: crtFragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });

    // Glass Screen (Thin pane at the front)
    const screenMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(housingWidth - thickness, housingHeight - thickness),
        screenMat
    );
    screenMesh.userData.isCrtScreen = true; // Flag for animation loop update
    screenMesh.onBeforeRender = () => {
        crtUniforms.time.value = performance.now() / 1000;
    };
    screenMesh.position.set(0, 1.5, (housingDepth / 2) - 0.05);
    monitorGroup.add(screenMesh);

    // Mini Diorama inside monitor (positioned in the hollow volume)
    const miniWorld = new THREE.Group();
    miniWorld.position.set(0, 1.5, 0);
    miniWorld.scale.set(0.12, 0.12, 0.12);

    const miniLight = new THREE.PointLight(0x88ccff, 1.5, 12);
    miniLight.position.set(0, 5, 0);
    miniWorld.add(miniLight);

    const miniGround = new THREE.Mesh(new THREE.CylinderGeometry(25, 25, 1, 10), mat(0x1b2e1b));
    miniGround.position.y = -28;
    miniWorld.add(miniGround);

    const miniFire = createToggleableFire(2.0);
    miniFire.position.set(0, -27, 0);
    miniWorld.add(miniFire);

    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const tree = createLowPolyTree(0x1b5e20, 0x3e2723, 3.0);
        tree.position.set(Math.cos(a) * 18, -27, Math.sin(a) * 18);
        miniWorld.add(tree);
    }
    monitorGroup.add(miniWorld);

    addWorldElement(scene, monitorGroup);

    // Peripherals
    const kb = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 3), mat(0x333333));
    kb.position.set(0, -2.7, 3);
    kb.rotation.x = 0.1;
    addWorldElement(scene, kb);

    const pad = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 4), mat(0x111111));
    pad.position.set(8, -2.75, 3.5);
    addWorldElement(scene, pad);

    const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mat(0xeeeeee));
    mouse.scale.set(1, 0.6, 1.4);
    mouse.position.set(8, -2.6, 3.5);
    addWorldElement(scene, mouse);

    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), mat(0xdddddd));
    mug.position.set(-8, -2.4, 4);
    addWorldElement(scene, mug);
}
