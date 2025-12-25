import * as THREE from 'three';

export type HUDTint = 'orange' | 'green' | 'yellow' | 'clear' | 'white';

export class SidePanelProjector {
  // Meshes
  private projectorGroup: THREE.Group;
  private spinnerRing: THREE.Mesh;
  private coreLight: THREE.PointLight;
  private particleSystem: THREE.Points;

  // State
  public isDeployed: boolean = false;
  private deployProgress: number = 0;
  private targetDeploy: number = 0;
  private rotationSpeed: number = 0;

  // Colors
  private tintColors: Record<HUDTint, THREE.Color> = {
    orange: new THREE.Color(0xff8800),
    green: new THREE.Color(0x00ff00),
    yellow: new THREE.Color(0xffff00),
    clear: new THREE.Color(0x00ffff),
    white: new THREE.Color(0xffffff),
  };
  private currentTint: HUDTint = 'clear';

  // Scene & Camera
  private hudScene: THREE.Scene;
  private hudCamera: THREE.OrthographicCamera;

  constructor(mainScene: THREE.Scene) {
    this.hudScene = new THREE.Scene();

    // Orthographic Camera for HUD (Left: -Aspect, Right: +Aspect, Top: 1, Bottom: -1)
    const aspect = window.innerWidth / window.innerHeight;
    this.hudCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 100);
    this.hudCamera.position.z = 10;

    this.projectorGroup = new THREE.Group();
    this.hudScene.add(this.projectorGroup);

    // Initial Setup
    this.createProjectorDevice();
    this.createParticles();

    // Position in Bottom Left
    // Starting hidden below screen
    this.projectorGroup.position.set(-1.5, -1.2, 0);
    this.projectorGroup.rotation.x = 0.2; // Slight tilt
  }

  private createProjectorDevice(): void {
    // 1. Ultra-Flat Base Puck
    const baseGeo = new THREE.CylinderGeometry(0.35, 0.4, 0.02, 64);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      metalness: 0.95,
      roughness: 0.1,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    this.projectorGroup.add(base);

    // 2. Flat Glowing Ring (Spinner) embedded
    const ringGeo = new THREE.TorusGeometry(0.25, 0.005, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    this.spinnerRing = new THREE.Mesh(ringGeo, ringMat);
    this.spinnerRing.rotation.x = Math.PI / 2;
    this.spinnerRing.position.y = 0.011; // Just above base
    this.projectorGroup.add(this.spinnerRing);

    // 3. Flat Lens
    const lensGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.005, 32);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
      metalness: 1,
      roughness: 0,
    });
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.y = 0.012;
    this.projectorGroup.add(lens);

    // 4. Lighting from device - Subtle glow upwards
    this.coreLight = new THREE.PointLight(0x00ffff, 0, 4);
    this.coreLight.position.y = 0.1;
    this.projectorGroup.add(this.coreLight);

    // Ambient light for HUD
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.hudScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(2, 5, 5);
    this.hudScene.add(dirLight);
  }

  private createParticles(): void {
    const count = 80;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.5; // Wider x spread
      positions[i * 3 + 1] = Math.random() * 4;     // y (upwards)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5; // z
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.02, // Smaller particles
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.projectorGroup.add(this.particleSystem);
  }

  public deploy(): void {
    this.isDeployed = true;
    this.targetDeploy = 1;
    window.dispatchEvent(new CustomEvent('side-panel-state', { detail: { isOpen: true } }));
  }

  public retract(): void {
    this.isDeployed = false;
    this.targetDeploy = 0;
    window.dispatchEvent(new CustomEvent('side-panel-state', { detail: { isOpen: false } }));
  }

  public toggle(): void {
    this.isDeployed ? this.retract() : this.deploy();
  }

  public setCurrentWorld(worldName: string): void { }
  public setPanelContent(panel: string): void { }
  public getLoadProgress(): number { return 0; }
  public handleKeyInput(key: string): void { }
  public setTint(tint: HUDTint): void { }

  public update(deltaTime: number): void {
    const speed = 3.0;

    if (this.deployProgress < this.targetDeploy) {
      this.deployProgress += deltaTime * speed;
      if (this.deployProgress > 1) this.deployProgress = 1;
    } else if (this.deployProgress > this.targetDeploy) {
      this.deployProgress -= deltaTime * speed;
      if (this.deployProgress < 0) this.deployProgress = 0;
    }

    const eased = this.easeInOutQuad(this.deployProgress);

    // 1. Move Projector Up into View
    // Target Y: -0.95 (Just peering over bottom edge)
    // Start Y: -1.5 (Hidden)
    this.projectorGroup.position.y = THREE.MathUtils.lerp(-1.5, -0.95, eased);

    // 2. Spinner Rotation
    this.rotationSpeed = THREE.MathUtils.lerp(0, 8, eased);
    this.spinnerRing.rotation.z += deltaTime * this.rotationSpeed;

    // 3. Core Light
    this.coreLight.intensity = eased * 1.5;

    // 4. Particles
    const partsMat = this.particleSystem.material as THREE.PointsMaterial;
    partsMat.opacity = eased * 0.5;

    const positions = this.particleSystem.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 80; i++) {
      // Reset if too high or hidden
      if (positions[i * 3 + 1] > 4 || this.deployProgress <= 0.1) {
        positions[i * 3 + 1] = 0;
        partsMat.opacity = 0; // Hide abruptly on reset
      } else {
        partsMat.opacity = eased * 0.5;
      }

      // Float up
      positions[i * 3 + 1] += deltaTime * (0.8 + Math.random() * 0.8);
    }
    this.particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  public handleResize(width: number, height: number): void {
    const aspect = width / height;

    this.hudCamera.left = -aspect;
    this.hudCamera.right = aspect;
    this.hudCamera.top = 1;
    this.hudCamera.bottom = -1;
    this.hudCamera.updateProjectionMatrix();

    // Re-align to bottom left
    // X: -aspect + margin (0.4 units)
    if (this.projectorGroup) {
      this.projectorGroup.position.x = -aspect + 0.4;
    }
  }

  public render(renderer: THREE.WebGLRenderer): void {
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.hudScene, this.hudCamera);
    renderer.autoClear = true;
  }
} // End of SidePanelProjector Class
