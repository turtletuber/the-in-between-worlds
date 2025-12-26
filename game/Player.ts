import * as THREE from 'three';

export interface PlayerState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    acceleration: number;
    friction: number;
    maxSpeed: number;
    facingDirection: THREE.Vector3;
    tiltAngle: number;
    targetTilt: number;
}

export const keys = { w: false, a: false, s: false, d: false, space: false };

export const playerState: PlayerState = {
    position: new THREE.Vector3(4, 1.5, 4),
    velocity: new THREE.Vector3(),
    acceleration: 45.0,
    friction: 0.88,
    maxSpeed: 8.5,
    facingDirection: new THREE.Vector3(0, 0, -1),
    tiltAngle: 0,
    targetTilt: 0
};

let playerGroup: THREE.Group;

export function createPlayer(scene: THREE.Scene): THREE.Group {
    const group = new THREE.Group();
    const geometry = new THREE.OctahedronGeometry(0.5, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x88ccff,
        emissiveIntensity: 0.8,
        flatShading: true,
        roughness: 0.2,
        metalness: 0.8
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    const light = new THREE.PointLight(0x88ccff, 3, 12);
    group.add(light);
    group.position.copy(playerState.position);
    playerGroup = group;
    scene.add(playerGroup);
    return playerGroup;
}

export function getPlayer(): THREE.Group {
    return playerGroup;
}

export function updatePlayerMovement(
    scene: THREE.Scene,
    camera: THREE.Camera,
    controls: any,
    currentZoom: any,
    delta: number,
    time: number,
    worldElements: THREE.Object3D[]
) {
    if (!playerGroup) return;

    const inputDirection = new THREE.Vector3();
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraRight = new THREE.Vector3();
    cameraRight.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys.w) inputDirection.add(cameraDirection);
    if (keys.s) inputDirection.sub(cameraDirection);
    if (keys.d) inputDirection.add(cameraRight);
    if (keys.a) inputDirection.sub(cameraRight);

    inputDirection.normalize();

    // 1. Acceleration & Velocity
    if (inputDirection.length() > 0) {
        const accel = inputDirection.multiplyScalar(playerState.acceleration * delta);
        playerState.velocity.add(accel);
        playerState.facingDirection.lerp(inputDirection, delta * 12.0).normalize();
    }

    // 2. Friction & Max Speed
    playerState.velocity.multiplyScalar(playerState.friction);
    if (playerState.velocity.length() > playerState.maxSpeed) {
        playerState.velocity.setLength(playerState.maxSpeed);
    }

    // 3. Apply Movement
    playerGroup.position.add(playerState.velocity.clone().multiplyScalar(delta));
    playerState.position.copy(playerGroup.position);

    // 4. Visual Leaning & Bobbing
    const horizontalVel = new THREE.Vector3(playerState.velocity.x, 0, playerState.velocity.z);
    playerState.targetTilt = horizontalVel.length() * -0.05;
    playerState.tiltAngle = THREE.MathUtils.lerp(playerState.tiltAngle, playerState.targetTilt, delta * 5.0);

    // Tilt the inner mesh, not the light group
    const innerMesh = playerGroup.children[0];
    if (innerMesh) {
        innerMesh.rotation.x = playerState.tiltAngle;
        innerMesh.rotation.z = Math.sin(time * 2) * 0.05; // Gentle weave
        innerMesh.scale.y = 1.0 + Math.sin(time * 4) * 0.03; // Squash/Stretch
    }

    // Hover height (Base floor logic)
    const hoverBase = 1.5 + Math.sin(time * 3) * 0.12;

    // 5. Collision & Ground Snapping
    // Start the ray much higher to ensure we catch the island surface even if dropping in
    const downRay = new THREE.Raycaster(
        new THREE.Vector3(playerGroup.position.x, playerGroup.position.y + 50, playerGroup.position.z),
        new THREE.Vector3(0, -1, 0)
    );
    downRay.camera = camera;

    // Test against all world elements (now passed in for performance)
    const intersects = downRay.intersectObjects(worldElements, true);

    if (keys.space) {
        // Floating Ability: Rise up and stay up
        const targetFloatY = playerGroup.position.y + 2.0;
        playerGroup.position.y = THREE.MathUtils.lerp(playerGroup.position.y, targetFloatY, delta * 2.0);
    } else {
        if (intersects.length > 0) {
            const groundY = intersects[0].point.y;
            const targetY = groundY + hoverBase;

            // If we are way above (dropping in), fall faster. If close, glide.
            const dist = playerGroup.position.y - targetY;
            const lerpSpeed = dist > 5 ? 4.0 : 8.0;

            playerGroup.position.y = THREE.MathUtils.lerp(playerGroup.position.y, targetY, delta * lerpSpeed);
        } else {
            // Fall slowly if no ground (void)
            playerGroup.position.y -= delta * 5.0;
            // Clamp to void floor
            if (playerGroup.position.y < -50) playerGroup.position.y = -50;
        }
    }

    if (controls) {
        controls.target.lerp(playerGroup.position, delta * 8);
        const targetDist = currentZoom.distance;
        const targetHeight = currentZoom.height;
        const offset = camera.position.clone().sub(controls.target);
        offset.y = 0;
        offset.normalize().multiplyScalar(targetDist);
        offset.y = targetHeight;
        const targetCamPos = controls.target.clone().add(offset);
        camera.position.lerp(targetCamPos, delta * 6);
    }
}
