import * as THREE from 'three';
import { keys as playerKeys } from './Player';

export interface InputContext {
    camera: THREE.PerspectiveCamera;
    hudArm: any;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    currentWorld: string;
    switchWorld: (name: string) => void;
    onWorldChangeCallback: (name: string, msg: string) => void;
    getZoomProgress: () => number;
    setZoomProgress: (val: number) => void;
    zoomLevelsCount: number;
}

export function setupInputHandlers(context: InputContext) {
    const onWindowResize = () => {
        context.camera.aspect = window.innerWidth / window.innerHeight;
        context.camera.updateProjectionMatrix();
        context.renderer.setSize(window.innerWidth, window.innerHeight);
        if (context.hudArm) context.hudArm.handleResize(window.innerWidth, window.innerHeight);
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (context.hudArm && context.hudArm.isDeployed) {
            if (e.key === 'Escape') {
                context.hudArm.retract();
                return;
            }
        }

        const key = e.key.toLowerCase();

        // Movement
        if (key === 'w') playerKeys.w = true;
        if (key === 'a') playerKeys.a = true;
        if (key === 's') playerKeys.s = true;
        if (key === 'd') playerKeys.d = true;
        if (key === ' ') playerKeys.space = true;

        // HUD Toggle
        if (key === 'm' || key === 'h') {
            if (context.hudArm) context.hudArm.toggle();
        }

        // Performance Toggle
        if (key === 'l') {
            const isLow = context.renderer.shadowMap.enabled === true;
            console.log(`Toggling Performance Mode: ${isLow ? 'Low Power' : 'High Quality'}`);

            context.renderer.shadowMap.enabled = !isLow;
            context.renderer.setPixelRatio(isLow ? 1.0 : Math.min(window.devicePixelRatio, 1.5));

            context.scene.traverse((obj) => {
                if (obj instanceof THREE.Mesh && obj.material) {
                    obj.material.needsUpdate = true;
                }
            });

            if (context.onWorldChangeCallback) {
                context.onWorldChangeCallback(context.currentWorld, isLow ? "Low Power Mode Enabled" : "High Quality Restored");
            }
        }

        // World Switching
        const worlds: { [key: string]: string } = {
            '0': 'deskview', '1': 'CosmicHub', '2': 'campground',
            '3': 'mountains', '4': 'forest', '5': 'caves', '6': 'sky',
            '7': 'crops', '8': 'waterfalls'
        };
        if (worlds[key]) context.switchWorld(worlds[key]);
    };

    const onKeyUp = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'w') playerKeys.w = false;
        if (key === 'a') playerKeys.a = false;
        if (key === 's') playerKeys.s = false;
        if (key === 'd') playerKeys.d = false;
        if (key === ' ') playerKeys.space = false;
    };

    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const sensitivity = 0.0015;
        let p = context.getZoomProgress();
        p += e.deltaY * sensitivity;

        // Apply Limits
        if (context.currentWorld === 'CosmicHub') {
            p = Math.max(0, Math.min(p, 7.0));
        } else if (context.currentWorld === 'deskview') {
            p = Math.max(-3.0, Math.min(p, context.zoomLevelsCount - 1));
        } else {
            p = Math.max(0, Math.min(p, 5.0));
        }

        context.setZoomProgress(p);
    };

    // Custom UI Events
    const onOpenSidePanel = (e: any) => {
        if (context.hudArm) {
            if (!context.hudArm.isDeployed) context.hudArm.deploy();
            context.hudArm.setPanelContent(e.detail.panel);
        }
    };

    const onCloseSidePanel = () => {
        if (context.hudArm && context.hudArm.isDeployed) {
            context.hudArm.retract();
        }
    };

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('open-side-panel', onOpenSidePanel as any);
    window.addEventListener('close-side-panel', onCloseSidePanel);

    return () => {
        window.removeEventListener('resize', onWindowResize);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('open-side-panel', onOpenSidePanel as any);
        window.removeEventListener('close-side-panel', onCloseSidePanel);
    };
}
