import * as THREE from 'three';

export const mat = (color: THREE.ColorRepresentation, emissive: THREE.ColorRepresentation = 0x000000, opacity = 1.0) => {
  return new THREE.MeshStandardMaterial({
    color: color,
    emissive: emissive,
    emissiveIntensity: emissive !== 0x000000 ? 1.0 : 0,
    flatShading: true,
    roughness: 0.8,
    metalness: 0.1,
    transparent: opacity < 1.0,
    opacity: opacity,
    side: THREE.DoubleSide
  });
};

export const createLowPolyRock = (scale: number, color: number) => {
  const geo = new THREE.DodecahedronGeometry(scale, 0);
  const mesh = new THREE.Mesh(geo, mat(color));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.scale.set(1 + Math.random() * 0.3, 0.7 + Math.random() * 0.5, 1 + Math.random() * 0.3);
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  return mesh;
};

export const rand = (min: number, max: number) => Math.random() * (max - min) + min;

export function addWorldElement(scene: THREE.Scene, object: THREE.Object3D) {
  object.userData.isWorldElement = true;
  scene.add(object);
}

export function setupWorldLighting(scene: THREE.Scene, skyColor: number, groundColor: number, intensity: number) {
  const hemiLight = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  addWorldElement(scene, hemiLight);
  scene.background = new THREE.Color(groundColor);
  scene.fog = new THREE.FogExp2(groundColor, 0.01);
}

export function addGradientSky(scene: THREE.Scene, topColor: number, bottomColor: number) {
  const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;
  const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize( vWorldPosition + offset ).y;
        gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
      }
    `;
  const uniforms = {
    topColor: { value: new THREE.Color(topColor) },
    bottomColor: { value: new THREE.Color(bottomColor) },
    offset: { value: 15 },
    exponent: { value: 0.7 }
  };
  const skyGeo = new THREE.SphereGeometry(600, 32, 15);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  addWorldElement(scene, sky);
}
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

  // Core Flame Layers
  const colors = [0xff0000, 0xff5500, 0xffaa00, 0xffff00];
  for (let i = 0; i < 8; i++) {
    const size = (0.6 - i * 0.05) * scale;
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(size, size * 2.5, 4),
      mat(colors[i % 4], colors[i % 4], 0.8)
    );
    flame.position.y = (i * 0.15) * scale;
    flame.rotation.y = (i * Math.PI) / 4;
    flame.userData = {
      bobSpeed: 5 + i,
      bobHeight: 0.1 * scale,
      baseY: flame.position.y,
      pulseSpeed: 4,
      rotateSpeed: 1 + Math.random()
    };
    fireGroup.add(flame);
  }

  // Rising Embers/Sparkles
  for (let i = 0; i < 15; i++) {
    const ember = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.05 * scale, 0),
      mat(0xffff00, 0xffaa00)
    );
    // Cylinder distribution
    const r = 0.5 * scale * Math.sqrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    ember.position.set(
      r * Math.cos(theta),
      (Math.random() * 2.5) * scale,
      r * Math.sin(theta)
    );
    ember.userData = {
      velocity: new THREE.Vector3(0, (0.5 + Math.random()) * scale, 0),
      resetY: 2.5 * scale,
      baseX: ember.position.x,
      baseZ: ember.position.z,
      wobbleSpeed: 2 + Math.random() * 3
    };

    // Custom update logic for embers
    ember.userData.onUpdate = (time: number) => {
      ember.position.y += 0.02 * scale;
      ember.position.x = ember.userData.baseX + Math.sin(time * ember.userData.wobbleSpeed) * 0.1 * scale;
      if (ember.position.y > 3.0 * scale) {
        ember.position.y = 0;
        ember.visible = false;
        // Delay reappearance? Handled by simple loop wrap
        if (Math.random() > 0.1) ember.visible = true;
      }
    };
    fireGroup.add(ember);
  }

  // Base Glow
  const light = new THREE.PointLight(0xff6600, 3, 10 * scale);
  light.position.y = 0.5 * scale;
  light.userData = { pulseSpeed: 8 };
  fireGroup.add(light);

  return fireGroup;
};

export const createToggleableFire = (scale = 1) => {
  const root = new THREE.Group();
  const style1 = createLowPolyFire(scale);
  const style2 = createLowPolyFireAlt(scale);
  style2.visible = false;
  root.add(style1);
  root.add(style2);
  root.userData.isToggleableFire = true;
  root.userData.isClickable = true;
  return root;
};

export const createWeatherStation = () => {
  const group = new THREE.Group();

  // Base Stand
  const standGeo = new THREE.CylinderGeometry(0.1, 0.3, 2, 8);
  const standMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.2 });
  const stand = new THREE.Mesh(standGeo, standMat);
  stand.position.y = 1;
  group.add(stand);

  // Rotating Anemometer (Cups)
  const cupsGroup = new THREE.Group();
  cupsGroup.position.y = 2.0;

  const armGeo = new THREE.BoxGeometry(1.2, 0.05, 0.05);
  const armMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const arm1 = new THREE.Mesh(armGeo, armMat);
  const arm2 = new THREE.Mesh(armGeo, armMat);
  arm2.rotation.y = Math.PI / 2;
  cupsGroup.add(arm1);
  cupsGroup.add(arm2);

  // Cups
  const cupGeo = new THREE.SphereGeometry(0.2, 8, 8, 0, Math.PI);
  const cupMat = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide });

  [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].forEach(([x, z], i) => {
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(x, 0, z);
    // orient cups to catch wind
    cup.rotation.y = i * (Math.PI / 2) + Math.PI / 2;
    cup.rotation.x = Math.PI / 2;
    cupsGroup.add(cup);
  });

  cupsGroup.userData = { rotateSpeed: 4.0 };
  group.add(cupsGroup);

  // Weather Vane (Arrow)
  const arrowGroup = new THREE.Group();
  arrowGroup.position.y = 1.7;
  const arrowBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: 0xffff00 }));
  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 4), new THREE.MeshStandardMaterial({ color: 0xffff00 }));
  arrowHead.rotation.z = -Math.PI / 2;
  arrowHead.position.x = 0.5;
  arrowGroup.add(arrowBody);
  arrowGroup.add(arrowHead);
  arrowGroup.userData = { bobSpeed: 1, bobHeight: 0 }; // Just for potential interaction
  // Allow arrow to rotate based on time to simulate wind direction change?
  arrowGroup.rotation.y = Math.PI / 4;
  group.add(arrowGroup);

  // Add interaction data
  group.userData.isWeatherStation = true;
  group.userData.isClickable = true;

  // Add hitbox
  const hitbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 3, 8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.position.y = 1.5;
  group.add(hitbox);

  return group;
};
