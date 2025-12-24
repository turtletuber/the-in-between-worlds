// js/avatars/ghost-avatar.js

import Avatar from './Avatar.js';

export default class GhostAvatar extends Avatar {
  constructor(size = 64) {
    super(size);

    // Ghost state
    this.mouthState = 'peaceful'; // 'peaceful' | 'surprised' | 'playful' | 'mysterious' | 'phasing'
    this.floatTimer = 0;
    this.fadeTimer = 0;
    this.phaseTimer = 0;
    this.wisp1Timer = 0;
    this.wisp2Timer = 0;
    this.etherealParticles = [];
    this.trailPoints = [];

    this.initializeTrail();
  }

  getColors() {
    return {
      bodyPrimary: 'rgba(240, 248, 255, 0.85)', // Alice blue with transparency
      bodySecondary: 'rgba(230, 230, 250, 0.75)', // Lavender with transparency
      bodyCore: 'rgba(255, 255, 255, 0.9)', // White core
      eyes: '#4169E1', // Royal blue
      eyeGlow: 'rgba(65, 105, 225, 0.6)', // Blue glow
      mouth: '#8A2BE2', // Blue violet
      wisp: 'rgba(186, 85, 211, 0.7)', // Medium orchid
      trail: 'rgba(221, 160, 221, 0.4)', // Plum trail
      aura: 'rgba(147, 112, 219, 0.3)', // Medium purple aura
      sparkle: '#FFFFFF', // White sparkles
      phase: 'rgba(75, 0, 130, 0.5)', // Indigo for phasing
    };
  }

  initializeTrail() {
    // Initialize ethereal trail points
    for (let i = 0; i < 8; i++) {
      this.trailPoints.push({
        x: 0,
        y: 0,
        opacity: ((8 - i) / 8) * 0.3,
      });
    }
  }

  updateTimers(timestamp) {
    super.updateTimers(timestamp);
    this.floatTimer = (timestamp / 2500) % (Math.PI * 2); // Ethereal floating
    this.fadeTimer = (timestamp / 3000) % (Math.PI * 2); // Fade in/out
    this.phaseTimer = (timestamp / 4000) % (Math.PI * 2); // Phasing effect
    this.wisp1Timer = (timestamp / 1800) % (Math.PI * 2); // Wisp movement
    this.wisp2Timer = (timestamp / 2200) % (Math.PI * 2); // Second wisp
  }

  updateEtherealParticles() {
    // Add ethereal sparkles
    if (Math.random() < 0.15) {
      this.etherealParticles.push({
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.2, // Slight upward drift
        life: 1.0,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    // Update particles
    this.etherealParticles = this.etherealParticles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.twinkle += 0.1;
      particle.life -= 0.008;
      return particle.life > 0;
    });
  }

  updateTrail() {
    // Update trail points to follow current position
    const currentY = Math.sin(this.floatTimer) * 3;

    // Shift trail points
    for (let i = this.trailPoints.length - 1; i > 0; i--) {
      this.trailPoints[i].x = this.trailPoints[i - 1].x;
      this.trailPoints[i].y = this.trailPoints[i - 1].y;
    }
    this.trailPoints[0].x = 0;
    this.trailPoints[0].y = currentY;
  }

  draw() {
    this.updateEtherealParticles();
    this.updateTrail();

    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const floatOffset = Math.sin(this.floatTimer) * 3;
    const fadeOpacity = 0.7 + Math.sin(this.fadeTimer) * 0.2;
    const phaseOpacity = this.mouthState === 'phasing' ? 0.3 + Math.sin(this.phaseTimer) * 0.3 : 1;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(centerX, centerY + floatOffset);
    ctx.globalAlpha = fadeOpacity * phaseOpacity;

    // Draw ethereal trail
    this.drawTrail();

    // Draw ethereal particles
    this.drawEtherealParticles();

    // Draw aura
    this.drawAura();

    // Draw wisps
    this.drawWisps();

    // Draw main ghost body
    this.drawBody();

    // Draw face features
    this.drawEyes();
    this.drawMouth();

    // Draw ethereal details
    this.drawEtherealDetails();

    ctx.restore();
  }

  drawFace() {
    // Ghost face is drawn in parts
  }

  drawTrail() {
    const { ctx } = this;

    // Draw ghostly trail
    this.trailPoints.forEach((point, index) => {
      if (index === 0) {
        return;
      } // Skip current position

      ctx.save();
      ctx.globalAlpha = point.opacity;

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 15);
      gradient.addColorStop(0, this.colors.trail);
      gradient.addColorStop(1, 'rgba(221, 160, 221, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 15 - index, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  drawEtherealParticles() {
    const { ctx } = this;

    this.etherealParticles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.life * (0.5 + Math.sin(particle.twinkle) * 0.5);

      // Sparkle effect
      ctx.fillStyle = this.colors.sparkle;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      // Cross sparkle
      ctx.strokeStyle = this.colors.sparkle;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(particle.x - particle.size * 2, particle.y);
      ctx.lineTo(particle.x + particle.size * 2, particle.y);
      ctx.moveTo(particle.x, particle.y - particle.size * 2);
      ctx.lineTo(particle.x, particle.y + particle.size * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  drawAura() {
    const { ctx } = this;
    const auraIntensity = 0.4 + Math.sin(this.fadeTimer) * 0.2;

    // Ethereal aura
    ctx.save();
    ctx.globalAlpha = auraIntensity;

    const auraGradient = ctx.createRadialGradient(0, 0, 15, 0, 0, 35);
    auraGradient.addColorStop(0, 'rgba(147, 112, 219, 0)');
    auraGradient.addColorStop(0.7, this.colors.aura);
    auraGradient.addColorStop(1, 'rgba(147, 112, 219, 0)');

    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawWisps() {
    const { ctx } = this;

    // Floating wisps around the ghost
    const wisp1X = Math.cos(this.wisp1Timer) * 20;
    const wisp1Y = Math.sin(this.wisp1Timer * 0.7) * 15 - 10;

    const wisp2X = Math.cos(this.wisp2Timer + Math.PI) * 18;
    const wisp2Y = Math.sin(this.wisp2Timer * 0.9) * 12 + 8;

    // Draw wisps
    [
      { x: wisp1X, y: wisp1Y, size: 3 },
      { x: wisp2X, y: wisp2Y, size: 2.5 },
    ].forEach((wisp) => {
      ctx.save();
      ctx.globalAlpha = 0.6;

      const wispGradient = ctx.createRadialGradient(
        wisp.x,
        wisp.y,
        0,
        wisp.x,
        wisp.y,
        wisp.size * 2
      );
      wispGradient.addColorStop(0, this.colors.wisp);
      wispGradient.addColorStop(1, 'rgba(186, 85, 211, 0)');

      ctx.fillStyle = wispGradient;
      ctx.beginPath();
      ctx.arc(wisp.x, wisp.y, wisp.size * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  drawBody() {
    const { ctx } = this;

    // Main ghost body with flowing bottom
    ctx.save();

    // Body gradient
    const bodyGradient = ctx.createRadialGradient(0, -5, 0, 0, 0, 25);
    bodyGradient.addColorStop(0, this.colors.bodyCore);
    bodyGradient.addColorStop(0.6, this.colors.bodyPrimary);
    bodyGradient.addColorStop(1, this.colors.bodySecondary);

    ctx.fillStyle = bodyGradient;

    // Ghost body shape with wavy bottom
    ctx.beginPath();
    ctx.arc(0, -5, 20, Math.PI, 0, true); // Top half circle

    // Wavy bottom edge
    const waveOffset = Math.sin(this.floatTimer * 2) * 2;
    for (let i = -20; i <= 20; i += 4) {
      const waveY = 15 + Math.sin((i / 4 + this.floatTimer) * 0.5) * 3 + waveOffset;
      if (i === -20) {
        ctx.lineTo(i, waveY);
      } else {
        ctx.lineTo(i, waveY);
      }
    }

    ctx.closePath();
    ctx.fill();

    // Subtle inner glow
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = this.colors.bodyCore;
    ctx.beginPath();
    ctx.arc(0, -5, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  drawEyes() {
    const { ctx } = this;
    const isBlinking = this.blinkTimer > 4.5;
    const eyeHeight = isBlinking ? 1 : 6;

    // Eye glow
    ctx.save();
    ctx.shadowColor = this.colors.eyeGlow;
    ctx.shadowBlur = 8;

    // Left eye
    ctx.fillStyle = this.colors.eyes;
    ctx.beginPath();
    ctx.ellipse(-6, -8, 3, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(6, -8, 3, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (!isBlinking) {
      // Eye highlights - ethereal glow
      ctx.fillStyle = this.colors.sparkle;
      ctx.beginPath();
      ctx.ellipse(-7, -10, 1, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(7, -10, 1, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mystical eye centers
      ctx.fillStyle = this.colors.eyeGlow;
      ctx.beginPath();
      ctx.ellipse(-6, -8, 1, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(6, -8, 1, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMouth() {
    const { ctx } = this;

    ctx.strokeStyle = this.colors.mouth;
    ctx.fillStyle = this.colors.mouth;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';

    switch (this.mouthState) {
      case 'peaceful':
        // Serene smile
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();
        break;

      case 'surprised':
        // Open 'O' mouth
        ctx.beginPath();
        ctx.arc(0, 2, 3, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'playful':
        // Mischievous grin
        ctx.beginPath();
        ctx.arc(-2, 0, 5, 0.3, Math.PI - 0.5);
        ctx.stroke();

        // Playful tongue
        ctx.fillStyle = this.colors.wisp;
        ctx.beginPath();
        ctx.ellipse(2, 3, 2, 1, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'mysterious':
        // Knowing smile
        ctx.beginPath();
        ctx.moveTo(-4, 1);
        ctx.quadraticCurveTo(0, -1, 4, 1);
        ctx.stroke();
        break;

      case 'phasing':
        // Wavering ethereal mouth
        const wavePhase = Math.sin(this.phaseTimer * 3) * 2;
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(-3, 1 + wavePhase);
        ctx.quadraticCurveTo(0, 3 - wavePhase, 3, 1 + wavePhase);
        ctx.stroke();
        ctx.restore();
        break;
    }
  }

  drawEtherealDetails() {
    const { ctx } = this;

    // Floating mystical symbols
    if (this.mouthState === 'mysterious') {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = this.colors.wisp;
      ctx.lineWidth = 1;

      // Small mystical circle above head
      const symbolY = -25 + Math.sin(this.fadeTimer) * 2;
      ctx.beginPath();
      ctx.arc(0, symbolY, 3, 0, Math.PI * 2);
      ctx.stroke();

      // Inner dot
      ctx.fillStyle = this.colors.wisp;
      ctx.beginPath();
      ctx.arc(0, symbolY, 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Phase distortion effect
    if (this.mouthState === 'phasing') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = this.colors.phase;
      ctx.lineWidth = 0.5;

      // Distortion lines
      for (let i = -15; i <= 15; i += 3) {
        const distort = Math.sin(this.phaseTimer * 2 + i * 0.1) * 2;
        ctx.beginPath();
        ctx.moveTo(i + distort, -20);
        ctx.lineTo(i - distort, 20);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  startPhasing() {
    const originalMood = this.mouthState;
    this.setMood('phasing');
    setTimeout(() => this.setMood(originalMood), 5000);
  }

  beSurprised() {
    const originalMood = this.mouthState;
    this.setMood('surprised');
    setTimeout(() => this.setMood(originalMood), 2000);
  }
}