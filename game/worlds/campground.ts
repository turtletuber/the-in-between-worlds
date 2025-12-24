import * as THREE from 'three';
import { mat, createLowPolyRock, addWorldElement, addGradientSky, setupWorldLighting, rand } from './common';

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

const createLowPolyFire = (scale = 1) => {
    const group = new THREE.Group();
    const flameColors = [0xff4400, 0xffaa00, 0xff7700];
    for (let i = 0; i < 6; i++) {
        const h = (1.2 + Math.random() * 1.8) * scale;
        const r = (0.25 + Math.random() * 0.3) * scale;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 3), mat(flameColors[i % 3], flameColors[i % 3]));
        const angle = (i / 6) * Math.PI * 2;
        const dist = (Math.random() * 0.3) * scale;
        cone.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
        cone.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
        cone.userData = { bobSpeed: 8 + Math.random() * 4, bobHeight: 0.15 * scale, baseY: cone.position.y, pulseSpeed: 6 };
        group.add(cone);
    }
    for (let i = 0; i < 12; i++) {
        const ember = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), mat(0xffcc00, 0xffaa00));
        const angle = Math.random() * Math.PI * 2;
        const dist = (0.5 + Math.random()) * scale;
        ember.position.set(Math.cos(angle) * dist, (1 + Math.random() * 4) * scale, Math.sin(angle) * dist);
        ember.userData = { bobSpeed: 1 + Math.random() * 1.5, baseY: ember.position.y, bobHeight: 1.5 * scale, rotateSpeed: 3 };
        group.add(ember);
    }
    return group;
};

const createLowPolyFireAlt = (scale = 1) => {
    const fireGroup = new THREE.Group();
    for (let i = 0; i < 5; i++) {
        const flame = new THREE.Mesh(
            new THREE.TetrahedronGeometry(0.4 * scale),
            mat(0xff4400, 0xff8800)
        );
        flame.position.set((Math.random() - 0.5) * scale, i * 0.5 * scale, (Math.random() - 0.5) * scale);
        flame.rotation.set(Math.random(), Math.random(), Math.random());
        flame.userData = {
            bobSpeed: 3 + Math.random(),
            bobOffset: i,
            baseY: flame.position.y,
            bobHeight: 0.3 * scale,
            rotateSpeed: 2.0
        };
        fireGroup.add(flame);
    }
    return fireGroup;
};

const createLowPolyFirePrism = (scale = 1) => {
    const group = new THREE.Group();
    const colors = [0xffff00, 0xffaa00, 0xff0000]; // Yellow, Orange, Red

    for (let i = 0; i < 3; i++) {
        // Triangular Pyramid: Cone with 3 radial segments
        const geo = new THREE.ConeGeometry(0.35 * scale, 1.5 * scale, 3);
        const mesh = new THREE.Mesh(geo, mat(colors[i], colors[i]));

        // Interlay them by rotating 60 degrees offset?
        mesh.rotation.y = (i / 3) * Math.PI * 2;
        mesh.position.y = 0.75 * scale;

        mesh.userData = {
            rotateSpeed: 4 + i, // Different speeds
            bobSpeed: 2 + i,
            baseY: 0.75 * scale,
            bobHeight: 0.2 * scale
        };

        group.add(mesh);
    }

    // Core glow
    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 * scale), mat(0xffaa00));
    core.position.y = 0.5 * scale;
    core.userData = { pulseSpeed: 5 };
    group.add(core);

    return group;
};

export const createToggleableFire = (scale = 1) => {
    const root = new THREE.Group();
    const style1 = createLowPolyFire(scale);
    const style2 = createLowPolyFireAlt(scale);
    const style3 = createLowPolyFirePrism(scale);

    style2.visible = false;
    style3.visible = false;

    root.add(style1);
    root.add(style2);
    root.add(style3);

    root.userData.isToggleableFire = true;
    root.userData.isClickable = true;
    return root;
};

const createCabin = () => {
    const cabin = new THREE.Group();

    // A-Frame front wall
    const frontShape = new THREE.Shape();
    frontShape.moveTo(-2, 0);
    frontShape.lineTo(2, 0);
    frontShape.lineTo(0, 4);
    frontShape.lineTo(-2, 0);

    const frontGeometry = new THREE.ShapeGeometry(frontShape);
    const frontWall = new THREE.Mesh(frontGeometry, mat(0xd2691e));
    frontWall.position.set(0, 0, 1.5);
    frontWall.castShadow = true;
    frontWall.receiveShadow = true;
    cabin.add(frontWall);

    const backWall = new THREE.Mesh(frontGeometry, mat(0xd2691e));
    backWall.position.set(0, 0, -1.5);
    backWall.rotation.y = Math.PI;
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    cabin.add(backWall);

    // Roof panels
    const vertices = new Float32Array([0, 4, 1.5, -2, 0, 1.5, 0, 4, -1.5, -2, 0, -1.5]);
    const indices = [0, 1, 2, 1, 3, 2];

    const leftRoofGeometry = new THREE.BufferGeometry();
    leftRoofGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    leftRoofGeometry.setIndex(indices);
    leftRoofGeometry.computeVertexNormals();

    const leftRoof = new THREE.Mesh(leftRoofGeometry, mat(0xdc143c));
    leftRoof.castShadow = true;
    leftRoof.receiveShadow = true;
    cabin.add(leftRoof);

    const verticesRight = new Float32Array([0, 4, 1.5, 2, 0, 1.5, 0, 4, -1.5, 2, 0, -1.5]);
    const rightRoofGeometry = new THREE.BufferGeometry();
    rightRoofGeometry.setAttribute('position', new THREE.BufferAttribute(verticesRight, 3));
    rightRoofGeometry.setIndex(indices);
    rightRoofGeometry.computeVertexNormals();

    const rightRoof = new THREE.Mesh(rightRoofGeometry, mat(0xdc143c));
    rightRoof.castShadow = true;
    rightRoof.receiveShadow = true;
    cabin.add(rightRoof);

    // Door
    const doorGeometry = new THREE.BoxGeometry(0.9, 1.6, 0.15);
    const door = new THREE.Mesh(doorGeometry, mat(0xffe4b5));
    door.position.set(0, 0.8, 1.56);
    door.castShadow = true;
    cabin.add(door);

    // Door arch
    const archGeometry = new THREE.CircleGeometry(0.45, 16, 0, Math.PI);
    const arch = new THREE.Mesh(archGeometry, mat(0xffe4b5));
    arch.position.set(0, 1.6, 1.57);
    cabin.add(arch);

    // Window
    const topWindowGeometry = new THREE.CircleGeometry(0.5, 16);
    // mat helper supports opacity via 3rd arg
    const topWindow = new THREE.Mesh(topWindowGeometry, mat(0xadd8e6, 0x000000, 0.6));
    topWindow.position.set(0, 2.8, 1.52);
    cabin.add(topWindow);

    // Chimney
    const chimneyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 3.0, 8);
    const chimney = new THREE.Mesh(chimneyGeometry, mat(0xcd5c5c));
    chimney.position.set(0.8, 3.0, 0);
    chimney.castShadow = true;
    cabin.add(chimney);

    // Porch Base
    const porchBase = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2), mat(0x8d6e63));
    porchBase.position.set(0, 0.1, 2.5);
    porchBase.receiveShadow = true;
    cabin.add(porchBase);

    // Porch Posts
    const postGeo = new THREE.BoxGeometry(0.2, 1.5, 0.2);
    const postMat = mat(0x5d4037);

    const post1 = new THREE.Mesh(postGeo, postMat);
    post1.position.set(-1.8, 0.85, 3.3);
    cabin.add(post1);

    const post2 = new THREE.Mesh(postGeo, postMat);
    post2.position.set(1.8, 0.85, 3.3);
    cabin.add(post2);

    // Porch Railing
    const railGeo = new THREE.BoxGeometry(3.8, 0.1, 0.1);
    const rail = new THREE.Mesh(railGeo, postMat);
    rail.position.set(0, 1.5, 3.3);
    cabin.add(rail);

    return cabin;
};

const createTent = () => {
    const tent = new THREE.Group();

    const tentGeometry = new THREE.ConeGeometry(2, 2.5, 4);
    const tentMesh = new THREE.Mesh(tentGeometry, mat(0xdc143c));
    tentMesh.position.y = 1.25;
    tentMesh.rotation.y = Math.PI / 4;
    tentMesh.castShadow = true;
    tent.add(tentMesh);

    return tent;
};

const createRadio = () => {
    const radio = new THREE.Group();

    // Main boombox body
    const bodyGeometry = new THREE.BoxGeometry(1.62, 0.81, 0.486);
    const body = new THREE.Mesh(bodyGeometry, mat(0x2c2c2c));
    body.castShadow = true;
    radio.add(body);

    // Left speaker
    const speakerGeometry = new THREE.CylinderGeometry(0.2835, 0.2835, 0.0648, 16);
    const speakerMaterial = mat(0x1a1a1a);
    const leftSpeaker = new THREE.Mesh(speakerGeometry, speakerMaterial);
    leftSpeaker.position.set(-0.4455, 0.081, 0.2835);
    leftSpeaker.rotation.x = Math.PI / 2;
    radio.add(leftSpeaker);

    const grilleGeometry = new THREE.CylinderGeometry(0.2268, 0.2268, 0.081, 16);
    const grilleMaterial = mat(0x3a3a3a);
    const leftGrille = new THREE.Mesh(grilleGeometry, grilleMaterial);
    leftGrille.position.set(-0.4455, 0.081, 0.2916);
    leftGrille.rotation.x = Math.PI / 2;
    radio.add(leftGrille);

    // Right speaker
    const rightSpeaker = new THREE.Mesh(speakerGeometry, speakerMaterial);
    rightSpeaker.position.set(0.4455, 0.081, 0.2835);
    rightSpeaker.rotation.x = Math.PI / 2;
    radio.add(rightSpeaker);

    const rightGrille = new THREE.Mesh(grilleGeometry, grilleMaterial);
    rightGrille.position.set(0.4455, 0.081, 0.2916);
    rightGrille.rotation.x = Math.PI / 2;
    radio.add(rightGrille);

    // Cassette deck
    const deckGeometry = new THREE.BoxGeometry(0.486, 0.2835, 0.0648);
    const deck = new THREE.Mesh(deckGeometry, mat(0x505050));
    deck.position.set(0, 0.1215, 0.2592);
    radio.add(deck);

    // Antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.0162, 0.02025, 1.215, 8);
    const antenna = new THREE.Mesh(antennaGeometry, mat(0xc0c0c0));
    antenna.position.set(0.6885, 0.972, -0.081);
    antenna.rotation.z = -Math.PI / 8;
    radio.add(antenna);

    // Knobs
    const knobGeometry = new THREE.CylinderGeometry(0.0648, 0.0648, 0.0486, 12);
    const knobMaterial = mat(0xffd700);
    const volumeKnob = new THREE.Mesh(knobGeometry, knobMaterial);
    volumeKnob.position.set(-0.567, -0.2025, 0.2673);
    volumeKnob.rotation.x = Math.PI / 2;
    radio.add(volumeKnob);

    const tuningKnob = new THREE.Mesh(knobGeometry, knobMaterial);
    tuningKnob.position.set(0.567, -0.2025, 0.2673);
    tuningKnob.rotation.x = Math.PI / 2;
    radio.add(tuningKnob);

    return radio;
};

export const createWeatherStation = () => {
    const station = new THREE.Group();

    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8);
    const base = new THREE.Mesh(baseGeometry, mat(0x8b7355));
    base.position.y = 0.15;
    base.castShadow = true;
    station.add(base);

    // Bamboo pole segments
    const poleSegments = 4;
    for (let i = 0; i < poleSegments; i++) {
        const poleGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 8);
        const poleMaterial = mat(0xdaa520);
        const segment = new THREE.Mesh(poleGeometry, poleMaterial);
        segment.position.y = 0.45 + i * 0.55;
        segment.castShadow = true;
        station.add(segment);
    }

    // Solar panel
    const solarPanelGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.6);
    const solarPanel = new THREE.Mesh(solarPanelGeometry, mat(0x1e3a5f));
    solarPanel.position.y = 2.8;
    solarPanel.rotation.x = Math.PI / 6;
    solarPanel.castShadow = true;
    station.add(solarPanel);

    // Solar cells
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
            const cellGeometry = new THREE.BoxGeometry(0.22, 0.03, 0.22);
            const cell = new THREE.Mesh(cellGeometry, mat(0x4169e1));
            cell.position.set(-0.25 + i * 0.25, 2.82, -0.15 + j * 0.3);
            cell.rotation.x = Math.PI / 6;
            station.add(cell);
        }
    }

    // Sensor housing
    const housingGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 8);
    const housing = new THREE.Mesh(housingGeometry, mat(0xe8e8e8));
    housing.position.y = 2.3;
    housing.castShadow = true;
    station.add(housing);

    // Wind vane
    const vaneShaft = new THREE.BoxGeometry(0.05, 0.05, 0.8);
    const shaft = new THREE.Mesh(vaneShaft, mat(0xff6347));
    shaft.position.y = 2.7;
    shaft.castShadow = true;
    station.add(shaft);

    // Anemometer cups (Spinner)
    const spinner = new THREE.Group();
    spinner.userData = { rotateSpeed: 5.0 }; // Auto-rotate

    const cupPoleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const cupPoleMaterial = mat(0xc0c0c0);

    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const cupPole = new THREE.Mesh(cupPoleGeometry, cupPoleMaterial);
        cupPole.position.set(Math.cos(angle) * 0.2, 0, Math.sin(angle) * 0.2);
        cupPole.rotation.x = Math.PI / 2;
        cupPole.rotation.y = angle;
        spinner.add(cupPole);

        const cupGeometry = new THREE.SphereGeometry(0.08, 8, 8, 0, Math.PI);
        const cup = new THREE.Mesh(cupGeometry, mat(0xffffff));
        cup.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
        cup.rotation.y = angle + Math.PI / 2;
        spinner.add(cup);
    }
    spinner.position.y = 3.0; // Higher up
    station.add(spinner);

    station.userData.isWeatherStation = true;
    station.userData.isClickable = true;

    return station;
};


export function buildCampgroundWorld(scene: THREE.Scene) {
    addGradientSky(scene, 0x0a1033, 0x020205);
    setupWorldLighting(scene, 0x4466ff, 0x050515, 0.6);

    const moonLight = new THREE.DirectionalLight(0x88ccff, 1.5);
    moonLight.position.set(-30, 40, -20);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    addWorldElement(scene, moonLight);

    const moonGeo = new THREE.IcosahedronGeometry(8, 1);
    const moon = new THREE.Mesh(moonGeo, mat(0xffffff, 0xaaddff, 1.0));
    moon.position.set(-100, 80, -100);
    addWorldElement(scene, moon);

    const ground = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 1, 10), mat(0x121a12));
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    addWorldElement(scene, ground);

    const fireGroup = createToggleableFire(1.3);
    fireGroup.position.y = 0.2;
    addWorldElement(scene, fireGroup);

    const fireLight = new THREE.PointLight(0xff7700, 8, 45);
    fireLight.position.set(0, 3, 0);
    fireLight.userData.pulseSpeed = 8;
    addWorldElement(scene, fireLight);

    // Props
    const cabin = createCabin();
    cabin.position.set(7, 0, -6); // Raised to ground level
    cabin.rotation.y = -Math.PI / 6;
    addWorldElement(scene, cabin);

    const tent = createTent();
    tent.position.set(-5, 0, 3); // Raised to ground level
    tent.rotation.y = 0.5;
    addWorldElement(scene, tent);

    const radioRock = createLowPolyRock(0.7, 0x555555);
    radioRock.position.set(-2.5, 0.3, -2.5);
    radioRock.scale.set(1.5, 0.6, 1.5); // Flatten it a bit to make a nice table
    addWorldElement(scene, radioRock);

    const radio = createRadio();
    radio.position.set(-2.5, 1.15, -2.5); // Lifted to sit on rock (0.3 + 0.42 [rock top] + 0.4 [radio half height])
    radio.rotation.y = 0.8;
    addWorldElement(scene, radio);

    const weatherStation = createWeatherStation();
    weatherStation.position.set(0, 0, -8); // Moved further away from cabin (which is at 7, 0, -6)
    addWorldElement(scene, weatherStation);

    for (let i = 0; i < 12; i++) {
        const rock = createLowPolyRock(0.55, 0x333333);
        const a = (i / 12) * Math.PI * 2;
        rock.position.set(Math.cos(a) * 2.5, 0.2, Math.sin(a) * 2.5);
        addWorldElement(scene, rock);
    }

    for (let i = 0; i < 55; i++) {
        const a = rand(0, Math.PI * 2);
        const d = rand(15, 35);
        const tree = createLowPolyTree(0x103a15, 0x2e1d13, rand(1.1, 2.2));
        tree.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
        tree.castShadow = true;
        addWorldElement(scene, tree);
    }
}
