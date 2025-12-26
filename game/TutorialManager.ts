import { keys } from './Player';

export class TutorialManager {
    private step = 0;
    private flo: any = null;
    private hasMoved = false;
    private hasZoomed = false;

    constructor() {
        this.init();
    }

    private async init() {
        // Wait for Flo to be ready
        while (!(window as any).flo) {
            await new Promise(r => setTimeout(r, 500));
        }
        this.flo = (window as any).flo;

        // Wait for Splash to end
        window.addEventListener('tutorial-start', () => {
            // Short delay after reveal for breathing room
            setTimeout(() => this.start(), 1500);
        }, { once: true });
    }

    private async start() {
        this.flo.isForced = true;
        // Center-third position for high visibility
        const targetPos = {
            x: window.innerWidth * 0.15, // Left third
            y: window.innerHeight * 0.4
        };
        this.flo.forcedPosition = targetPos;
        this.flo.setMood('happy');

        // Wait until Flo is actually close to the target position
        const arrivalCheck = () => {
            const dx = this.flo.position.x - targetPos.x;
            const dy = this.flo.position.y - targetPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5) {
                // Direct Minimal Instruction
                this.step = 1;
                this.flo.say("MOVE WITH WASD", 0);
                this.listenForMovement();
            } else {
                requestAnimationFrame(arrivalCheck);
            }
        };
        arrivalCheck();
    }

    private listenForMovement() {
        const check = () => {
            if (this.step !== 1) return;
            if (keys.w || keys.a || keys.s || keys.d) {
                this.step = 2;
                this.flo.setMood('happy');
                this.flo.say("EXCELLENT", 3000);

                setTimeout(() => {
                    this.flo.say("SPACE TO FLOAT", 0);
                    this.listenForFloat();
                }, 3500);
            } else {
                requestAnimationFrame(check);
            }
        };
        check();
    }

    private listenForFloat() {
        const check = () => {
            if (this.step !== 2) return;
            if (keys.space) {
                this.step = 3;
                this.flo.setMood('playful');
                this.flo.say("MAGICAL", 3000);

                setTimeout(() => {
                    this.flo.say("SCROLL OUT TO BREAKTHROUGH", 0);
                    this.listenForZoom();
                }, 3500);
            } else {
                requestAnimationFrame(check);
            }
        };
        check();
    }

    private listenForZoom() {
        const check = () => {
            if (this.step !== 3) return;

            const world = (window as any).currentWorld;
            if (world === 'CosmicHub') {
                this.step = 4;
                this.flo.setMood('happy');
                this.flo.say("HUB REACHED", 3000);

                setTimeout(() => {
                    this.flo.say("SCROLL IN A LIL", 0);
                    this.listenForScrollIn();
                }, 3500);
            } else {
                requestAnimationFrame(check);
            }
        };
        check();
    }

    private listenForScrollIn() {
        // We need to wait for them to scroll "in" relative to the furthest they've been
        let peakZoom = (window as any).targetZoomProgress || 0;

        const check = () => {
            if (this.step !== 4) return;

            const currentZoom = (window as any).targetZoomProgress || 0;

            // If they are scrolling in, currentZoom will be LESS than peakZoom
            if (currentZoom < peakZoom - 0.2) {
                this.step = 5;
                this.flo.setMood('playful');
                this.flo.say("PERFECT CONTROL", 3000);

                setTimeout(() => {
                    this.flo.say("CLICK AN ISLAND", 0);
                    this.listenForIslandClick();
                }, 3500);
            } else {
                // Keep track of the furthest "out" they've scrolled to detect the "in" movement
                peakZoom = Math.max(peakZoom, currentZoom);
                requestAnimationFrame(check);
            }
        };
        check();
    }

    private listenForIslandClick() {
        const check = (e: any) => {
            if (this.step !== 5) return;
            const newWorld = e.detail;

            if (newWorld !== 'CosmicHub') {
                this.step = 6;
                this.flo.setMood('happy');
                this.flo.say("ADVENTURE AWAITS", 5000);

                // Release Flo after tutorial
                setTimeout(() => {
                    this.flo.isForced = false;
                    // whisper-trigger already happens in switchWorld
                }, 5500);

                window.removeEventListener('world-switch', check);
            }
        };
        window.addEventListener('world-switch', check);
    }
}
