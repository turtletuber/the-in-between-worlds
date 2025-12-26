// js/ui/flo-ui.js
import anime from 'animejs/lib/anime.es.js';

export default class FloUI {
    constructor() {
        this.container = null;
        this.avatar = null;
        this.leftEye = null;
        this.rightEye = null;
        this.leftPupil = null;
        this.rightPupil = null;
        this.mouth = null;
        this.shapePath = null;

        this.time = 0;
        this.isBlinking = false;
        this.nextBlink = Math.random() * 3000 + 2000;
        this.lastBlinkTime = 0;
        this.mood = 'happy';
        this.tooltip = null;
        this.tooltipTimeout = null;
        this.asciiParticles = [];
        this.asciiElements = {};

        // Floating movement state (cat-like behavior)
        this.position = { x: window.innerWidth - 100, y: 40 };
        this.velocity = { x: 0.5, y: 0.3 };
        this.targetPosition = { x: this.position.x, y: this.position.y };
        this.isPaused = false;
        this.pauseEndTime = 0;
        this.isForced = false;
        this.forcedPosition = null;
        this.nextDirectionChange = Date.now() + 3000 + Math.random() * 4000;

        // Color shifting state
        this.hue = Math.random() * 360;

        // Dragging state
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.wasDragging = false; // To prevent click triggering after drag

        this.createAvatar();

        // Drag events
        // Mouse Drag events
        this.container.addEventListener('mousedown', (e) => this.startDrag(e));
        window.addEventListener('mousemove', (e) => {
            window.mouseX = e.clientX;
            window.mouseY = e.clientY;
            this.handleDrag(e);
        });
        window.addEventListener('mouseup', () => this.endDrag());

        // Touch drag events
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        window.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        window.addEventListener('touchend', () => this.endDrag());

        this.animate();
    }

    startDrag(e) {
        if (e.button !== 0) return; // Only left click
        this.isDragging = true;
        this.isPaused = true; // Stop autonomous movement
        this.wasDragging = false;

        // Calculate offset from top-left of container
        const rect = this.container.getBoundingClientRect();
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;

        // Visual feedback
        this.container.style.cursor = 'grabbing';
        this.avatar.style.transform = 'scale(1.15)';
        this.mood = 'surprised';
        this.updateMouth();
    }

    handleDrag(e) {
        if (!this.isDragging) return;

        // Flag that we are actually dragging (moved more than a pixel?)
        this.wasDragging = true;

        // Mark for RadialMenu to ignore the click at the end
        this.container.dataset.wasDragging = 'true';

        // Update position
        this.position.x = e.clientX - this.dragOffset.x;
        this.position.y = e.clientY - this.dragOffset.y;

        // Apply immediately
        this.container.style.left = `${this.position.x}px`;
        this.container.style.top = `${this.position.y}px`;

        // Update Radial Menu if active
        if (window.radialMenu && window.radialMenu.updatePosition) {
            window.radialMenu.updatePosition();
        }
    }

    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.container.style.cursor = 'pointer';
        this.avatar.style.transform = 'scale(1)';

        // Resume behavior after a short delay
        this.mood = 'content';
        this.updateMouth();

        // Reset velocity to 0 to prevent "flinging" accidentally
        this.pauseEndTime = Date.now() + 2000;
        this.isPaused = true;
    }

    handleTouchStart(e) {
        if (e.touches.length > 1) return;
        const touch = e.touches[0];

        // Emulate mousedown
        const mockEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            button: 0
        };
        this.startDrag(mockEvent);
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;
        const touch = e.touches[0];

        // Update global mouse for eyes etc
        window.mouseX = touch.clientX;
        window.mouseY = touch.clientY;

        // Emulate mousemove
        const mockEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY
        };
        this.handleDrag(mockEvent);

        // Only prevent default if we're actually dragging Flo
        // This allows normal page scrolling if touching elsewhere
        e.preventDefault();
    }

    createAvatar() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'flo-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 40px;
            left: ${window.innerWidth - 100}px;
            width: 80px;
            height: 80px;
            z-index: 1000;
            cursor: pointer;
            pointer-events: auto;
            transition: none;
        `;

        // Avatar body
        this.avatar = document.createElement('div');
        this.avatar.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            position: relative;
            overflow: visible;
            transition: transform 0.3s ease;
        `;

        // SVG Shape Background
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.style.cssText = `
            position: absolute;
            top: -10%;
            left: -10%;
            width: 120%;
            height: 120%;
            z-index: -1;
            filter: drop-shadow(0 8px 16px rgba(255, 215, 0, 0.4));
        `;

        this.shapePath = document.createElementNS(svgNS, "path");

        // Path Definitions (all 8 points for smooth morphing)
        this.paths = {
            // Organic Circle (Floating/Happy)
            orb: "M50,10 C62,10 75,15 82,25 C90,35 90,50 90,62 C90,75 80,90 62,90 C50,90 35,90 25,82 C15,75 10,65 10,50 C10,35 15,22 25,12 C35,5 45,10 50,10 Z",
            // Perfect Geometric Circle (Content)
            perfect: "M50,10 C61,10 71.2,14.4 78.3,21.7 C85.6,28.8 90,39 90,50 C90,61 85.6,71.2 78.3,78.3 C71.2,85.6 61,90 50,90 C39,90 28.8,85.6 21.7,78.3 C14.4,71.2 10,61 10,50 C10,39 14.4,28.8 21.7,21.7 C28.8,14.4 39,10 50,10 Z",
            // Star-ish (Excited/Playful)
            star: "M50,5 L65,35 L95,45 L70,65 L80,95 L50,80 L20,95 L30,65 L5,45 L35,35 Z",
            // Sleepy/Puddle
            sleepy: "M50,40 C70,40 90,45 95,65 C100,85 80,95 50,95 C20,95 0,85 5,65 C10,45 30,40 50,40 Z",
            // Surprised/Octagon
            surprised: "M50,5 L85,15 L95,50 L85,85 L50,95 L15,85 L5,50 L15,15 Z"
        };

        this.shapePath.setAttribute("d", this.paths.orb);
        this.shapePath.setAttribute("fill", "url(#floGradient)");
        this.shapePath.style.transition = "fill 0.5s ease";

        // Gradient for SVG
        const defs = document.createElementNS(svgNS, "defs");
        const grad = document.createElementNS(svgNS, "linearGradient");
        grad.setAttribute("id", "floGradient");
        grad.setAttribute("x1", "0%");
        grad.setAttribute("y1", "0%");
        grad.setAttribute("x2", "100%");
        grad.setAttribute("y2", "100%");

        const stop1 = document.createElementNS(svgNS, "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", "#fffacd");
        this.stop1 = stop1;

        const stop2 = document.createElementNS(svgNS, "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", "#ffd700");
        this.stop2 = stop2;

        grad.appendChild(stop1);
        grad.appendChild(stop2);
        defs.appendChild(grad);
        svg.appendChild(defs);
        svg.appendChild(this.shapePath);
        this.avatar.appendChild(svg);

        // Eyes container
        const eyesContainer = document.createElement('div');
        eyesContainer.style.cssText = `
            display: flex;
            gap: 2px;
            margin-bottom: 4px;
            position: relative;
        `;

        // Left eye
        this.leftEye = document.createElement('div');
        this.leftEye.style.cssText = `
            width: 14px;
            height: 14px;
            background: white;
            border-radius: 50%;
            position: relative;
            overflow: hidden;
            transition: height 0.1s ease;
        `;

        // Left pupil
        this.leftPupil = document.createElement('div');
        this.leftPupil.style.cssText = `
            width: 8px;
            height: 8px;
            background: #333;
            border-radius: 50%;
            position: absolute;
            top: 3px;
            left: 3px;
        `;
        this.leftEye.appendChild(this.leftPupil);

        // Right eye
        this.rightEye = document.createElement('div');
        this.rightEye.style.cssText = `
            width: 14px;
            height: 14px;
            background: white;
            border-radius: 50%;
            position: relative;
            overflow: hidden;
            transition: height 0.1s ease;
        `;

        // Right pupil
        this.rightPupil = document.createElement('div');
        this.rightPupil.style.cssText = `
            width: 8px;
            height: 8px;
            background: #333;
            border-radius: 50%;
            position: absolute;
            top: 3px;
            left: 3px;
        `;
        this.rightEye.appendChild(this.rightPupil);

        eyesContainer.appendChild(this.leftEye);
        eyesContainer.appendChild(this.rightEye);

        // Mouth
        this.mouth = document.createElement('div');
        this.updateMouth();

        // Assemble
        this.avatar.appendChild(eyesContainer);
        this.avatar.appendChild(this.mouth);

        this.container.appendChild(this.avatar);
        document.body.appendChild(this.container);

        // Add hover effect
        this.container.addEventListener('mouseenter', () => {
            this.avatar.style.transform = 'scale(1.1)';
        });
        this.container.addEventListener('mouseleave', () => {
            this.avatar.style.transform = 'scale(1)';
        });
    }

    updateMouth() {
        if (!this.mouth) return;

        // ASCII emoticon-style mouth shapes
        const mouthShapes = {
            happy: 'ᴗ',      // upward curve smile!
            sleepy: '˘',     // gentle curve
            surprised: 'o',  // small surprised
            content: 'ᵕ',    // satisfied smile
            playful: '◡'     // happy curve
        };

        this.mouth.textContent = mouthShapes[this.mood] || 'ᴗ';

        // Style with monospace font for ASCII aesthetic
        this.mouth.style.cssText = `
            font-size: 20px;
            font-weight: bold;
            color: #333;
            line-height: 1;
            margin-top: 4px;
            font-family: 'Courier New', monospace;
            display: inline-block;
        `;
    }

    animate() {
        if (this.isDestroyed) return;
        const now = Date.now();
        this.time = now;


        // Blinking
        if (now - this.lastBlinkTime > this.nextBlink) {
            this.blink();
            this.lastBlinkTime = now;
            this.nextBlink = Math.random() * 3000 + 2000;
        }

        // Random mood changes & spontaneous emotes
        if (Math.random() < 0.001) {
            const moods = ['happy', 'sleepy', 'surprised', 'content', 'playful'];
            this.mood = moods[Math.floor(Math.random() * moods.length)];
            this.updateMouth();

            // Occasionally emote physically
            if (Math.random() < 0.3 && !this.tooltip) {
                const emotes = ["(^◡^)", "(o.o)", "(>ω<)", "(ᵕᗨᵕ)", "(˘⌣˘)"];
                this.say(emotes[Math.floor(Math.random() * emotes.length)], 2500);
            }
        }

        // Cat-like floating behavior
        this.updateFloatingMovement();

        // Color cycle
        this.hue = (this.hue + 0.2) % 360;
        this.updateColors();

        this.updateEyes();

        requestAnimationFrame(() => this.animate());
    }

    updateColors() {
        if (!this.avatar || !this.stop1 || !this.stop2) return;
        // Smooth pastel gradient cycle
        const c1 = `hsl(${this.hue}, 100%, 85%)`;
        const c2 = `hsl(${(this.hue + 30) % 360}, 100%, 70%)`;
        // const shadow = `hsla(${this.hue}, 90%, 60%, 0.3)`;

        this.stop1.setAttribute("stop-color", c1);
        this.stop2.setAttribute("stop-color", c2);
        // this.avatar.style.boxShadow = `0 8px 32px ${shadow}`;
    }

    updateFloatingMovement() {
        if (this.isDragging) return;

        const now = Date.now();

        // 0. Forced behavior for tutorials
        if (this.isForced && this.forcedPosition) {
            this.position.x += (this.forcedPosition.x - this.position.x) * 0.05;
            this.position.y += (this.forcedPosition.y - this.position.y) * 0.05;
            const bob = Math.sin(now * 0.003) * 3;
            this.container.style.left = `${this.position.x}px`;
            this.container.style.top = `${this.position.y + bob}px`;
            return;
        }

        const dt = 16; // Approx delta for 60fps

        // Check if paused (cat stops to observe)
        if (this.isPaused) {
            if (now > this.pauseEndTime) {
                this.isPaused = false;
                // After pause, pick a new direction
                this.pickNewDirection();
            } else {
                // Just gentle bobbing while paused
                const bob = Math.sin(now * 0.002) * 2;
                this.container.style.left = `${this.position.x}px`;
                this.container.style.top = `${this.position.y + bob}px`;
                return;
            }
        }

        // Random pauses (stalking/observing)
        if (Math.random() < 0.002) {
            this.isPaused = true;
            this.pauseEndTime = now + 1000 + Math.random() * 2000;
            this.mood = 'sleepy'; // Eyes squinting/observing
            this.updateMouth();
            return;
        }

        // Zoomies! (Random bursts of speed)
        if (Math.random() < 0.005) {
            this.velocity.x *= 3.0;
            this.velocity.y *= 3.0;
            this.mood = 'playful';
            this.updateMouth();
            // Reset speed after a bit? 
            // Natural drag will handle it if we had drag, but here we just let it fly for a bit until next direction change?
            // Actually `pickNewDirection` resets velocity. Let's force a direction change soon.
            this.nextDirectionChange = now + 1000;
        }

        // Change direction periodically
        if (now > this.nextDirectionChange) {
            this.pickNewDirection();
            this.nextDirectionChange = now + 3000 + Math.random() * 4000;

            if (Math.random() < 0.3) {
                this.mood = 'surprised'; // Alert!
                this.updateMouth();
            }
        }

        // Move toward current direction
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Screen Wrapping (Pop in from other side)
        const width = 80; // approximate width
        const height = 80;
        const buffer = 10; // Distance off-screen before wrapping

        if (this.position.x > window.innerWidth + buffer) {
            this.position.x = -width - buffer;
            this.pickNewDirection(); // New trajectory entering screen
        } else if (this.position.x < -width - buffer) {
            this.position.x = window.innerWidth + buffer;
            this.pickNewDirection();
        }

        if (this.position.y > window.innerHeight + buffer) {
            this.position.y = -height - buffer;
            this.pickNewDirection();
        } else if (this.position.y < -height - buffer) {
            this.position.y = window.innerHeight + buffer;
            this.pickNewDirection();
        }

        // Apply position with gentle bobbing (only Y)
        const bob = Math.sin(this.time * 0.003) * 3;
        const fy = this.position.y + bob;
        this.container.style.left = `${this.position.x}px`;
        this.container.style.top = `${fy}px`;

        // Update tooltip position if active
        if (this.tooltip) {
            this.tooltip.style.left = `${this.position.x + 35}px`;
            this.tooltip.style.top = `${fy + 5}px`;
        }

        // Update radial menu position if it exists
        if (window.radialMenu && window.radialMenu.positionOptionsContainer) {
            window.radialMenu.positionOptionsContainer();
        }
    }

    updateEyes() {
        if (!this.leftPupil || !this.rightPupil || this.isBlinking) return;

        const now = Date.now();
        const eyeRadius = 3; // Max pupil offset from center
        let tx = 0, ty = 0;

        // Decide state: Follow Mouse vs Wander
        // "Attention span": Flo looks at mouse for a bit, then looks away
        if (!this.eyeState) {
            this.eyeState = {
                mode: 'wander', // wander, follow
                nextSwitch: now + 2000,
                wanderTarget: { x: 0, y: 0 }
            };
        }

        if (now > this.eyeState.nextSwitch) {
            // Switch modes
            if (this.eyeState.mode === 'wander') {
                // 60% chance to look at mouse
                this.eyeState.mode = Math.random() < 0.6 ? 'follow' : 'wander';
                this.eyeState.nextSwitch = now + 1000 + Math.random() * 4000;
            } else {
                // Stop staring, look somewhere else
                this.eyeState.mode = 'wander';
                this.eyeState.nextSwitch = now + 500 + Math.random() * 2000;
                // Pick new random spot to look at
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random();
                this.eyeState.wanderTarget = { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
            }
        }

        if (this.eyeState.mode === 'follow') {
            // Track mouse relative to Flo's center on screen
            if (window.mouseX !== undefined && window.mouseY !== undefined) {
                // Calculate Flo's center (approx based on DOM)
                const fx = this.position.x + 40;
                const fy = this.position.y + 40;

                let dx = window.mouseX - fx;
                let dy = window.mouseY - fy;

                // Normalize
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    dx /= dist;
                    dy /= dist;
                }

                // Scale movement dampening
                // If cursor is super far, pupils shouldn't be pinned to edge 100% of time? 
                // Actually pinned looks like looking at it.
                tx = dx;
                ty = dy;
            }
        } else {
            // Wander
            tx = this.eyeState.wanderTarget.x;
            ty = this.eyeState.wanderTarget.y;
        }

        // Lerp current pupil position
        if (!this.pupilPos) this.pupilPos = { x: 0, y: 0 };

        // Smooth movement
        this.pupilPos.x += (tx - this.pupilPos.x) * 0.1;
        this.pupilPos.y += (ty - this.pupilPos.y) * 0.1;

        // Apply (assuming pupil size 8px inside 14px eye -> 3px padding on sides allows 3px movement)
        const x = this.pupilPos.x * eyeRadius;
        const y = this.pupilPos.y * eyeRadius;

        // Base top/left is 3px. Add offset.
        const rule = `translate(${x}px, ${y}px)`;
        this.leftPupil.style.transform = rule;
        this.rightPupil.style.transform = rule;
    }

    pickNewDirection() {
        // Cat-like movement: sometimes slow and lazy, sometimes quick and curious
        const speed = Math.random() < 0.3 ? 0.8 : 0.4; // 30% chance of faster movement
        const angle = Math.random() * Math.PI * 2;

        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.y = Math.sin(angle) * speed;
    }

    blink() {
        this.isBlinking = true;
        this.leftEye.style.height = '2px';
        this.rightEye.style.height = '2px';

        setTimeout(() => {
            this.isBlinking = false;
            this.leftEye.style.height = '14px';
            this.rightEye.style.height = '14px';
        }, 150);
    }

    say(text, duration = 4000) {
        if (this.tooltip) {
            this.tooltip.remove();
            if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
        }

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'flo-tooltip';
        this.tooltip.style.cssText = `
            position: fixed;
            z-index: 1001;
            transform: translate(-50%, -100%);
            color: #00ffff;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 5px #00ffff;
            pointer-events: none;
            white-space: nowrap;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: -15px; /* Pull closer to Flo like radial label */
            animation: floTooltipIn 0.3s ease-out forwards;
        `;

        this.tooltip.textContent = `[ ${text} ]`;

        // Initial position sync (prevent bottom-left flash)
        const bob = Math.sin(this.time * 0.003) * 3;
        this.tooltip.style.left = `${this.position.x + 35}px`;
        this.tooltip.style.top = `${this.position.y + bob + 5}px`;

        document.body.appendChild(this.tooltip);

        if (duration > 0) {
            this.tooltipTimeout = setTimeout(() => {
                if (this.tooltip) {
                    this.tooltip.style.animation = 'floTooltipOut 0.3s ease forwards';
                    setTimeout(() => {
                        if (this.tooltip) {
                            this.tooltip.remove();
                            this.tooltip = null;
                        }
                    }, 300);
                }
            }, duration);
        }
    }

    setMood(mood) {
        if (this.mood === mood) return;
        this.mood = mood;
        this.updateMouth();

        // Morph Shape if we have a path definition for the new mood
        let targetPath = this.paths.orb;
        if (mood === 'content') targetPath = this.paths.perfect;
        if (mood === 'playful') targetPath = this.paths.star;
        if (mood === 'sleepy') targetPath = this.paths.sleepy;
        if (mood === 'surprised') targetPath = this.paths.surprised;

        anime({
            targets: this.shapePath,
            d: [
                { value: targetPath }
            ],
            easing: 'spring(1, 80, 10, 0)',
            duration: 800
        });
    }

    show() {
        this.container.style.display = 'block';
    }

    hide() {
        this.container.style.display = 'none';
    }

    destroy() {
        this.isDestroyed = true;
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.tooltip) {
            this.tooltip.remove();
        }
    }
}

// Add CSS animations globally
const style = document.createElement('style');
style.textContent = `
    @keyframes floTooltipIn {
        from { opacity: 0; transform: translate(-100%, -80%) scale(0.9); }
        to { opacity: 1; transform: translate(-100%, -100%) scale(1); }
    }
    @keyframes floTooltipOut {
        from { opacity: 1; transform: translate(-100%, -100%) scale(1); }
        to { opacity: 0; transform: translate(-100%, -110%) scale(0.9); }
    }
`;
document.head.appendChild(style);