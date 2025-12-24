import * as THREE from 'three';
import { CrystalElement } from './maps/cave/elements/CrystalElement';
import { CaveRockElement } from './maps/cave/elements/CaveRockElement';
import { StalactiteElement } from './maps/cave/elements/StalactiteElement';
import { StalagmiteElement } from './maps/cave/elements/StalagmiteElement';

/**
 * ObjectManagerPage - A web page for managing 3D objects/assets
 * Displays spinning 3D previews of all available objects with configuration options
 */
export class ObjectManagerPage {
  private container: HTMLElement;
  private objectDefinitions: ObjectDefinition[] = [];
  private previewScenes: Map<string, ObjectPreview> = new Map();
  private currentFilter: string = 'all';

  // Map emojis for display - easily extensible
  private mapEmojis: Record<string, string> = {
    campground: '🏕️',
    cave: '🕳️',
    forest: '🌲',
    beach: '🏖️',
    mountain: '⛰️',
    desert: '🏜️',
  };

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'objectManagerPage';
    this.setupObjectDefinitions();
    this.render();
  }

  private loadObjectConfigs(): void {
    // Load object configurations from localStorage
    const saved = localStorage.getItem('objectManagerConfigs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse object configs:', e);
      }
    }
    return {};
  }

  private saveObjectConfigs(): void {
    const configs: any = {};
    this.objectDefinitions.forEach((def) => {
      configs[def.id] = {
        editable: def.editable,
        availableMaps: def.availableMaps,
      };
    });
    localStorage.setItem('objectManagerConfigs', JSON.stringify(configs));
    console.log('💾 Saved object configurations:', configs);
  }

  private setupObjectDefinitions(): void {
    // Load saved configurations
    const savedConfigs = this.loadObjectConfigs();

    // Define all available objects with their metadata
    this.objectDefinitions = [
      {
        id: 'campfire',
        name: 'Campfire',
        description: 'Animated campfire with flames and embers',
        type: 'campfire',
        availableMaps: ['campground', 'cave'],
        editable: true,
        clickHandler: 'Opens map switcher modal',
        createPreview: () => this.createCampfirePreview(),
      },
      {
        id: 'cabin',
        name: 'Cabin',
        description: 'A-frame cabin with chimney and porch',
        type: 'cabin',
        availableMaps: ['campground'],
        editable: true,
        clickHandler: 'Opens checklist panel',
        createPreview: () => this.createCabinPreview(),
      },
      {
        id: 'tent',
        name: 'Tent',
        description: 'Camping tent structure',
        type: 'tent',
        availableMaps: ['campground'],
        editable: true,
        clickHandler: 'None',
        createPreview: () => this.createTentPreview(),
      },
      {
        id: 'radio',
        name: 'Radio/Boombox',
        description: 'Retro boombox with speakers and controls',
        type: 'radio',
        availableMaps: ['campground'],
        editable: true,
        clickHandler: 'Opens music panel',
        createPreview: () => this.createRadioPreview(),
      },
      {
        id: 'weatherStation',
        name: 'Weather Station',
        description: 'Station with solar panels and sensors',
        type: 'weatherStation',
        availableMaps: ['campground'],
        editable: true,
        clickHandler: 'Toggles weather (day/night/rain)',
        createPreview: () => this.createWeatherStationPreview(),
      },
      {
        id: 'rock',
        name: 'Rock (Campground)',
        description: 'Decorative campground rock',
        type: 'rock',
        availableMaps: ['campground'],
        editable: true,
        clickHandler: 'None',
        createPreview: () => this.createCampgroundRockPreview(),
      },
      {
        id: 'magazineStand',
        name: 'Magazine Stand',
        description: 'Wooden stand displaying tomoZine Issue #1',
        type: 'magazineStand',
        availableMaps: ['campground'],
        editable: true,
        clickHandler: 'Opens tomoZine in new tab',
        createPreview: () => this.createMagazineStandPreview(),
      },
      {
        id: 'crystal',
        name: 'Crystal',
        description: 'Glowing crystal with pulsing light',
        type: 'crystal',
        availableMaps: ['cave'],
        editable: true,
        clickHandler: 'None',
        createPreview: () => {
          const crystal = new CrystalElement(0x00ffff, 1.4);
          return crystal.getGroup();
        },
      },
      {
        id: 'stalactite',
        name: 'Stalactite',
        description: 'Cave ceiling formation',
        type: 'stalactite',
        availableMaps: ['cave'],
        editable: true,
        clickHandler: 'None',
        createPreview: () => {
          const stalactite = new StalactiteElement();
          return stalactite.getGroup();
        },
      },
      {
        id: 'stalagmite',
        name: 'Stalagmite',
        description: 'Cave floor formation',
        type: 'stalagmite',
        availableMaps: ['cave'],
        editable: true,
        clickHandler: 'None',
        createPreview: () => {
          const stalagmite = new StalagmiteElement();
          return stalagmite.getGroup();
        },
      },
      {
        id: 'caveRock',
        name: 'Cave Rock',
        description: 'Rocky cave formation',
        type: 'caveRock',
        availableMaps: ['cave'],
        editable: true,
        clickHandler: 'None',
        createPreview: () => {
          const rock = new CaveRockElement();
          return rock.getGroup();
        },
      },
      {
        id: 'caveWall',
        name: 'Cave Wall',
        description: 'Large cave background wall',
        type: 'caveWall',
        availableMaps: ['cave'],
        editable: false,
        clickHandler: 'None',
        createPreview: () => this.createCaveWallPreview(),
      },
      {
        id: 'glowingRiver',
        name: 'Glowing River',
        description: 'Bioluminescent river with flowing effect',
        type: 'glowingRiver',
        availableMaps: ['cave'],
        editable: false,
        clickHandler: 'None',
        createPreview: () => this.createGlowingRiverPreview(),
      },
    ];

    // Apply saved configurations
    this.objectDefinitions.forEach((def) => {
      if (savedConfigs[def.id]) {
        if (savedConfigs[def.id].editable !== undefined) {
          def.editable = savedConfigs[def.id].editable;
        }
        if (savedConfigs[def.id].availableMaps) {
          def.availableMaps = savedConfigs[def.id].availableMaps;
        }
      }
    });

    console.log('📦 Loaded object definitions with saved configs');
  }

  private createCampfirePreview(): THREE.Group {
    const campfire = new THREE.Group();

    // Fire pit stones (low-poly rocks in a circle)
    const stoneGeometry = new THREE.DodecahedronGeometry(0.4, 0);
    const stoneMaterial = new THREE.MeshLambertMaterial({
      color: 0x808080,
      flatShading: true,
    });

    for (let i = 0; i < 10; i++) {
      const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
      const angle = (i / 10) * Math.PI * 2;
      const radius = 1.3 + Math.random() * 0.3;
      stone.position.set(Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius);
      stone.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      stone.castShadow = true;
      campfire.add(stone);
    }

    // Logs arranged in teepee style
    const logGeometry = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8);
    const logMaterial = new THREE.MeshLambertMaterial({
      color: 0x4a2511,
      flatShading: true,
    });

    for (let i = 0; i < 6; i++) {
      const log = new THREE.Mesh(logGeometry, logMaterial);
      const angle = (i / 6) * Math.PI * 2;
      const radius = 0.4;

      log.position.set(Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);

      log.rotation.z = Math.cos(angle) * 0.3;
      log.rotation.x = Math.sin(angle) * 0.3;
      log.rotation.y = angle;

      log.castShadow = true;
      campfire.add(log);
    }

    // Inner flame layers
    const innerFlameGeometry = new THREE.ConeGeometry(0.5, 1.2, 4);
    const innerFlameMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.9,
    });
    const innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial);
    innerFlame.position.y = 0.8;
    innerFlame.rotation.y = Math.PI / 4;
    campfire.add(innerFlame);

    const midFlameGeometry = new THREE.ConeGeometry(0.6, 1.5, 4);
    const midFlameMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8c00,
      transparent: true,
      opacity: 0.7,
    });
    const midFlame = new THREE.Mesh(midFlameGeometry, midFlameMaterial);
    midFlame.position.y = 0.9;
    campfire.add(midFlame);

    const outerFlameGeometry = new THREE.ConeGeometry(0.7, 1.8, 4);
    const outerFlameMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.5,
    });
    const outerFlame = new THREE.Mesh(outerFlameGeometry, outerFlameMaterial);
    outerFlame.position.y = 1.0;
    outerFlame.rotation.y = Math.PI / 8;
    campfire.add(outerFlame);

    // Hot coals/embers at the base
    const emberGeometry = new THREE.SphereGeometry(0.08, 6, 6);
    const emberMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2200,
    });

    for (let i = 0; i < 15; i++) {
      const ember = new THREE.Mesh(emberGeometry, emberMaterial);
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      ember.position.set(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius);
      ember.scale.set(
        0.5 + Math.random() * 0.8,
        0.5 + Math.random() * 0.8,
        0.5 + Math.random() * 0.8
      );
      campfire.add(ember);
    }

    // Fire glow light
    const fireLight = new THREE.PointLight(0xff6600, 3, 12);
    fireLight.position.set(0, 1.2, 0);
    campfire.add(fireLight);

    const emberLight = new THREE.PointLight(0xff2200, 1, 5);
    emberLight.position.set(0, 0.2, 0);
    campfire.add(emberLight);

    return campfire;
  }

  private createCabinPreview(): THREE.Group {
    const cabin = new THREE.Group();

    // A-Frame front wall
    const frontShape = new THREE.Shape();
    frontShape.moveTo(-2, 0);
    frontShape.lineTo(2, 0);
    frontShape.lineTo(0, 4);
    frontShape.lineTo(-2, 0);

    const frontGeometry = new THREE.ShapeGeometry(frontShape);
    const woodMaterial = new THREE.MeshLambertMaterial({
      color: 0xd2691e,
      flatShading: true,
    });
    const frontWall = new THREE.Mesh(frontGeometry, woodMaterial);
    frontWall.position.set(0, 0, 1.5);
    frontWall.castShadow = true;
    cabin.add(frontWall);

    const backWall = new THREE.Mesh(frontGeometry, woodMaterial);
    backWall.position.set(0, 0, -1.5);
    backWall.rotation.y = Math.PI;
    backWall.castShadow = true;
    cabin.add(backWall);

    // Roof panels
    const roofMaterial = new THREE.MeshLambertMaterial({
      color: 0xdc143c,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    const vertices = new Float32Array([0, 4, 1.5, -2, 0, 1.5, 0, 4, -1.5, -2, 0, -1.5]);

    const indices = [0, 1, 2, 1, 3, 2];

    const leftRoofGeometry = new THREE.BufferGeometry();
    leftRoofGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    leftRoofGeometry.setIndex(indices);
    leftRoofGeometry.computeVertexNormals();

    const leftRoof = new THREE.Mesh(leftRoofGeometry, roofMaterial);
    leftRoof.castShadow = true;
    cabin.add(leftRoof);

    const verticesRight = new Float32Array([0, 4, 1.5, 2, 0, 1.5, 0, 4, -1.5, 2, 0, -1.5]);

    const rightRoofGeometry = new THREE.BufferGeometry();
    rightRoofGeometry.setAttribute('position', new THREE.BufferAttribute(verticesRight, 3));
    rightRoofGeometry.setIndex(indices);
    rightRoofGeometry.computeVertexNormals();

    const rightRoof = new THREE.Mesh(rightRoofGeometry, roofMaterial);
    rightRoof.castShadow = true;
    cabin.add(rightRoof);

    // Door
    const doorGeometry = new THREE.BoxGeometry(0.9, 1.6, 0.15);
    const doorMaterial = new THREE.MeshLambertMaterial({
      color: 0xffe4b5,
      flatShading: true,
    });
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0.8, 1.56);
    door.castShadow = true;
    cabin.add(door);

    // Door arch
    const archGeometry = new THREE.CircleGeometry(0.45, 16, 0, Math.PI);
    const arch = new THREE.Mesh(archGeometry, doorMaterial);
    arch.position.set(0, 1.6, 1.57);
    cabin.add(arch);

    // Window
    const topWindowGeometry = new THREE.CircleGeometry(0.5, 16);
    const windowMaterial = new THREE.MeshLambertMaterial({
      color: 0xadd8e6,
      transparent: true,
      opacity: 0.6,
    });
    const topWindow = new THREE.Mesh(topWindowGeometry, windowMaterial);
    topWindow.position.set(0, 2.8, 1.52);
    cabin.add(topWindow);

    // Chimney
    const chimneyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 3.0, 8);
    const chimneyMaterial = new THREE.MeshLambertMaterial({
      color: 0xcd5c5c,
      flatShading: true,
    });
    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.set(0.8, 3.0, 0);
    chimney.castShadow = true;
    cabin.add(chimney);

    return cabin;
  }

  private createTentPreview(): THREE.Group {
    const tent = new THREE.Group();

    const tentGeometry = new THREE.ConeGeometry(2, 2.5, 4);
    const tentMaterial = new THREE.MeshLambertMaterial({
      color: 0xdc143c,
      flatShading: true,
    });
    const tentMesh = new THREE.Mesh(tentGeometry, tentMaterial);
    tentMesh.position.y = 1.25;
    tentMesh.rotation.y = Math.PI / 4;
    tentMesh.castShadow = true;
    tent.add(tentMesh);

    return tent;
  }

  private createRadioPreview(): THREE.Group {
    const radio = new THREE.Group();

    // Main boombox body
    const bodyGeometry = new THREE.BoxGeometry(1.62, 0.81, 0.486);
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: 0x2c2c2c,
      flatShading: true,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    radio.add(body);

    // Left speaker
    const speakerGeometry = new THREE.CylinderGeometry(0.2835, 0.2835, 0.0648, 16);
    const speakerMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      flatShading: true,
    });
    const leftSpeaker = new THREE.Mesh(speakerGeometry, speakerMaterial);
    leftSpeaker.position.set(-0.4455, 0.081, 0.2835);
    leftSpeaker.rotation.x = Math.PI / 2;
    radio.add(leftSpeaker);

    const grilleGeometry = new THREE.CylinderGeometry(0.2268, 0.2268, 0.081, 16);
    const grilleMaterial = new THREE.MeshLambertMaterial({
      color: 0x3a3a3a,
    });
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
    const deckMaterial = new THREE.MeshLambertMaterial({
      color: 0x505050,
      flatShading: true,
    });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.set(0, 0.1215, 0.2592);
    radio.add(deck);

    // Antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.0162, 0.02025, 1.215, 8);
    const antennaMaterial = new THREE.MeshLambertMaterial({
      color: 0xc0c0c0,
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0.6885, 0.972, -0.081);
    antenna.rotation.z = -Math.PI / 8;
    radio.add(antenna);

    // Knobs
    const knobGeometry = new THREE.CylinderGeometry(0.0648, 0.0648, 0.0486, 12);
    const knobMaterial = new THREE.MeshLambertMaterial({
      color: 0xffd700,
    });
    const volumeKnob = new THREE.Mesh(knobGeometry, knobMaterial);
    volumeKnob.position.set(-0.567, -0.2025, 0.2673);
    volumeKnob.rotation.x = Math.PI / 2;
    radio.add(volumeKnob);

    const tuningKnob = new THREE.Mesh(knobGeometry, knobMaterial);
    tuningKnob.position.set(0.567, -0.2025, 0.2673);
    tuningKnob.rotation.x = Math.PI / 2;
    radio.add(tuningKnob);

    return radio;
  }

  private createWeatherStationPreview(): THREE.Group {
    const station = new THREE.Group();

    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.3, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({
      color: 0x8b7355,
      flatShading: true,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    base.castShadow = true;
    station.add(base);

    // Bamboo pole segments
    const poleSegments = 4;
    for (let i = 0; i < poleSegments; i++) {
      const poleGeometry = new THREE.CylinderGeometry(0.12, 0.14, 0.6, 8);
      const poleMaterial = new THREE.MeshLambertMaterial({
        color: 0xdaa520,
        flatShading: true,
      });
      const segment = new THREE.Mesh(poleGeometry, poleMaterial);
      segment.position.y = 0.45 + i * 0.55;
      segment.castShadow = true;
      station.add(segment);
    }

    // Solar panel
    const solarPanelGeometry = new THREE.BoxGeometry(0.8, 0.05, 0.6);
    const solarPanelMaterial = new THREE.MeshLambertMaterial({
      color: 0x1e3a5f,
      flatShading: true,
    });
    const solarPanel = new THREE.Mesh(solarPanelGeometry, solarPanelMaterial);
    solarPanel.position.y = 2.8;
    solarPanel.rotation.x = Math.PI / 6;
    solarPanel.castShadow = true;
    station.add(solarPanel);

    // Solar cells
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const cellGeometry = new THREE.BoxGeometry(0.22, 0.03, 0.22);
        const cellMaterial = new THREE.MeshLambertMaterial({
          color: 0x4169e1,
        });
        const cell = new THREE.Mesh(cellGeometry, cellMaterial);
        cell.position.set(-0.25 + i * 0.25, 2.82, -0.15 + j * 0.3);
        cell.rotation.x = Math.PI / 6;
        station.add(cell);
      }
    }

    // Sensor housing
    const housingGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 8);
    const housingMaterial = new THREE.MeshLambertMaterial({
      color: 0xe8e8e8,
      flatShading: true,
    });
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.y = 2.3;
    housing.castShadow = true;
    station.add(housing);

    // Wind vane
    const vaneShaft = new THREE.BoxGeometry(0.05, 0.05, 0.8);
    const vaneMaterial = new THREE.MeshLambertMaterial({
      color: 0xff6347,
      flatShading: true,
    });
    const shaft = new THREE.Mesh(vaneShaft, vaneMaterial);
    shaft.position.y = 2.7;
    shaft.castShadow = true;
    station.add(shaft);

    // Anemometer cups
    const cupPoleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const cupPoleMaterial = new THREE.MeshLambertMaterial({
      color: 0xc0c0c0,
    });

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const cupPole = new THREE.Mesh(cupPoleGeometry, cupPoleMaterial);
      cupPole.position.set(Math.cos(angle) * 0.2, 2.0, Math.sin(angle) * 0.2);
      cupPole.rotation.x = Math.PI / 2;
      cupPole.rotation.y = angle;
      station.add(cupPole);

      const cupGeometry = new THREE.SphereGeometry(0.08, 8, 8, 0, Math.PI);
      const cupMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
      });
      const cup = new THREE.Mesh(cupGeometry, cupMaterial);
      cup.position.set(Math.cos(angle) * 0.4, 2.0, Math.sin(angle) * 0.4);
      cup.rotation.y = angle + Math.PI / 2;
      station.add(cup);
    }

    return station;
  }

  private createCampgroundRockPreview(): THREE.Group {
    const rock = new THREE.Group();

    const rockGeometry = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.5, 0);
    const rockMaterial = new THREE.MeshLambertMaterial({
      color: 0x696969,
      flatShading: true,
    });
    const rockMesh = new THREE.Mesh(rockGeometry, rockMaterial);
    rockMesh.position.y = 0.3;
    rockMesh.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    rockMesh.castShadow = true;
    rock.add(rockMesh);

    return rock;
  }

  private createMagazineStandPreview(): THREE.Group {
    const stand = new THREE.Group()

    // Brick wall material (reddish-brown)
    const brickMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4545 })

    // Create brick wall with individual bricks for texture
    const brickWidth = 0.4
    const brickHeight = 0.2
    const rows = 13
    const cols = 6

    for (let row = 0; row < rows; row++) {
      const bricksInRow = cols
      const offset = (row % 2) * (brickWidth / 2) // Offset every other row for brick pattern

      for (let col = 0; col < bricksInRow; col++) {
        const brickGeometry = new THREE.BoxGeometry(brickWidth - 0.02, brickHeight - 0.02, 0.15)
        const brick = new THREE.Mesh(brickGeometry, brickMaterial)

        // Position bricks
        brick.position.set(
          -1.0 + offset + col * brickWidth,
          0.3 + row * brickHeight,
          0
        )
        brick.castShadow = true
        stand.add(brick)
      }
    }

    // Magazine poster glued at a slight angle
    const posterGeometry = new THREE.PlaneGeometry(1.4, 2.0)
    const posterMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    })
    const poster = new THREE.Mesh(posterGeometry, posterMaterial)
    poster.position.set(0, 1.5, 0.1)

    // Slight rotation for a more casual/glued look
    poster.rotation.z = 0.08 // About 4.5 degrees tilt
    poster.castShadow = true
    stand.add(poster)

    // Load actual tomoZine cover image
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load('/tomoZine/1.png', (texture) => {
      poster.material.map = texture
      poster.material.needsUpdate = true
    })

    return stand
  }

  private createCaveWallPreview(): THREE.Group {
    const wall = new THREE.Group();

    const wallMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 3, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x2a2a3a, side: THREE.DoubleSide })
    );
    wallMesh.position.y = 1.5;
    wall.add(wallMesh);

    return wall;
  }

  private createGlowingRiverPreview(): THREE.Group {
    const river = new THREE.Group();

    const riverMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1),
      new THREE.MeshLambertMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 0.3,
      })
    );
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.position.y = 0.1;
    river.add(riverMesh);

    return river;
  }

  private createObjectCard(def: ObjectDefinition): HTMLElement {
    const card = document.createElement('div');
    card.className = 'object-card';

    // Generate map badges dynamically based on available maps
    const availableMaps = this.getAvailableMaps();
    const mapBadgesHTML = availableMaps
      .map(
        (mapId) => `
      <button class="map-badge ${def.availableMaps.includes(mapId) ? 'active' : ''}" data-map="${mapId}">
        ${mapId}
      </button>
    `
      )
      .join('');

    card.innerHTML = `
      <div class="object-preview" id="preview-${def.id}"></div>
      <div class="object-info">
        <h3>${def.name}</h3>
        <p class="object-description">${def.description}</p>

        <div class="object-config">
          <div class="config-section">
            <label>Available on Maps:</label>
            <div class="map-badges" data-object-id="${def.id}">
              ${mapBadgesHTML}
            </div>
            <p class="map-hint">Click to toggle</p>
          </div>

          <div class="config-section">
            <label>
              <input type="checkbox" class="editable-checkbox" data-object-id="${def.id}" ${def.editable ? 'checked' : ''}>
              Editable in Edit Mode
            </label>
          </div>

          <div class="config-section">
            <label>Click Handler:</label>
            <p class="click-handler">${def.clickHandler}</p>
          </div>
        </div>
      </div>
    `;

    // Add event listeners for map badges
    const mapBadges = card.querySelector('.map-badges');
    if (mapBadges) {
      mapBadges.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('map-badge')) {
          target.classList.toggle('active');
          const map = target.getAttribute('data-map');

          // Update the object definition
          const isActive = target.classList.contains('active');
          if (isActive) {
            if (!def.availableMaps.includes(map!)) {
              def.availableMaps.push(map!);
            }
          } else {
            const index = def.availableMaps.indexOf(map!);
            if (index > -1) {
              def.availableMaps.splice(index, 1);
            }
          }

          console.log(`${def.name} now available on:`, def.availableMaps);
          this.saveObjectConfigs();
        }
      });
    }

    // Add event listener for editable checkbox
    const editableCheckbox = card.querySelector('.editable-checkbox') as HTMLInputElement;
    if (editableCheckbox) {
      editableCheckbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        def.editable = target.checked;
        console.log(`${def.name} editable:`, def.editable);
        this.saveObjectConfigs();
      });
    }

    return card;
  }

  private createPreviewScene(def: ObjectDefinition, container: HTMLElement): void {
    // Create a small Three.js scene for this preview
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2e3a5a);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(4, 3, 4);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(300, 300);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Add object
    const object = def.createPreview();
    scene.add(object);

    // Animation loop for this preview
    let animationId = 0;
    const animate = (time: number) => {
      animationId = requestAnimationFrame(animate);

      // Rotate the object
      object.rotation.y = time * 0.0005;

      // Update animated objects (like campfire, crystal)
      if (typeof (object as any).update === 'function') {
        (object as any).update(time * 0.001);
      }

      renderer.render(scene, camera);
    };

    animate(0);

    // Store for cleanup
    this.previewScenes.set(def.id, {
      scene,
      camera,
      renderer,
      object,
      animationId,
      cleanup: () => {
        cancelAnimationFrame(animationId);
        renderer.dispose();
        if (container && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      },
    });
  }

  private filterObjects(): ObjectDefinition[] {
    if (this.currentFilter === 'all') {
      return this.objectDefinitions;
    }
    return this.objectDefinitions.filter((def) => def.availableMaps.includes(this.currentFilter));
  }

  private getAvailableMaps(): string[] {
    // Extract all unique map names from object definitions
    const mapsSet = new Set<string>();
    this.objectDefinitions.forEach((def) => {
      def.availableMaps.forEach((map) => mapsSet.add(map));
    });
    return Array.from(mapsSet).sort();
  }

  private getMapEmoji(mapId: string): string {
    return this.mapEmojis[mapId] || '🗺️';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  public render(): void {
    const availableMaps = this.getAvailableMaps();

    // Build filter buttons dynamically
    const allButton = `
      <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">
        🌍 All Maps
      </button>
    `;
    const mapButtons = availableMaps
      .map(
        (mapId) => `
      <button class="filter-btn ${this.currentFilter === mapId ? 'active' : ''}" data-filter="${mapId}">
        ${this.getMapEmoji(mapId)} ${this.capitalizeFirst(mapId)}
      </button>
    `
      )
      .join('');

    this.container.innerHTML = `
      <div class="object-manager-header">
        <h1>🎨 Object Manager</h1>
        <p>Manage and preview all available 3D objects/assets</p>

        <div class="filter-controls">
          <label>Filter by Map:</label>
          <div class="filter-buttons">
            ${allButton}
            ${mapButtons}
          </div>
        </div>

        <a href="/" class="back-link">← Back to Campground</a>
      </div>

      <div class="object-grid"></div>
    `;

    // Add filter button click handlers
    const filterButtons = this.container.querySelectorAll('.filter-btn');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const filter = (e.target as HTMLElement).getAttribute('data-filter')!;
        this.currentFilter = filter;
        this.render();
      });
    });

    const grid = this.container.querySelector('.object-grid') as HTMLElement;
    const filteredObjects = this.filterObjects();

    // Show count
    const header = this.container.querySelector('.object-manager-header p') as HTMLElement;
    header.textContent = `Showing ${filteredObjects.length} of ${this.objectDefinitions.length} objects`;

    // Create cards for filtered objects
    filteredObjects.forEach((def) => {
      const card = this.createObjectCard(def);
      grid.appendChild(card);

      // Create 3D preview
      const previewContainer = card.querySelector(`#preview-${def.id}`) as HTMLElement;
      if (previewContainer) {
        this.createPreviewScene(def, previewContainer);
      }
    });
  }

  public mount(parent: HTMLElement): void {
    // Force scrolling with direct inline styles (overrides all CSS)
    document.body.style.cssText = `
      overflow-y: scroll;
      overflow-x: hidden;
      height: auto;
      min-height: 100vh;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    parent.appendChild(this.container);

    // Debug: Check if page is scrollable
    setTimeout(() => {
      console.log('📏 Body scrollHeight:', document.body.scrollHeight);
      console.log('📏 Window innerHeight:', window.innerHeight);
      console.log('📏 Can scroll:', document.body.scrollHeight > window.innerHeight);
      console.log('📏 Body overflow:', window.getComputedStyle(document.body).overflow);
      console.log('📏 Body overflow-y:', window.getComputedStyle(document.body).overflowY);
    }, 100);

    // Add wheel event listener to debug
    const wheelListener = (e: WheelEvent) => {
      console.log('🎡 Wheel event detected! deltaY:', e.deltaY);
    };
    document.addEventListener('wheel', wheelListener, { passive: true });
  }

  public unmount(): void {
    // Restore original body styles
    document.body.style.cssText = `
      overflow: hidden;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;

    // Cleanup all preview scenes
    this.previewScenes.forEach((preview) => preview.cleanup());
    this.previewScenes.clear();

    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}

interface ObjectDefinition {
  id: string;
  name: string;
  description: string;
  type: string;
  availableMaps: string[];
  editable: boolean;
  clickHandler: string;
  createPreview: () => THREE.Group | THREE.Object3D;
}

interface ObjectPreview {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  object: THREE.Object3D;
  animationId: number;
  cleanup: () => void;
}
