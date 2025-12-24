// js/avatars/alien-avatar.js

import Avatar from './Avatar.js';

export default class AlienAvatar extends Avatar {
  constructor(size = 64) {
    super(size);

    // Alien state
    this.mouthState = 'observing'; // 'observing' | 'communicating' | 'analyzing' | 'peaceful' | 'teleporting'
    this.pulseTimer = 0;
    this.brainWaveTimer = 0;
    this.telepathyTimer = 0;
    this.cosmicTimer = 0;
    this.antennaeTimer = 0;
    this.cosmicParticles = [];
    this.brainWaves = [];
    this.stars = [];

    this.initializeStars();
    this.initializeBrainWaves();
  }

  getColors() {
    return {
      skin: '#98FB98', // Pale green
      skinShade: '#7FFFD4', // Aquamarine
      brain: '#9370DB', // Medium purple
      brainGlow: 'rgba(147, 112, 219, 0.6)', // Purple glow
      eyes: '#00CED1', // Dark turquoise
      eyeGlow: 'rgba(0, 206, 209, 0.8)', // Turquoise glow
      pupils: '#000080', // Navy
      mouth: '#8A2BE2', // Blue violet
      antennae: '#FFD700', // Gold
      cosmic: '#FF69B4', // Hot pink
      telepathy: 'rgba(255, 20, 147, 0.5)', // Deep pink telepathy
      stars: '#FFFFFF', // White stars
      nebula: 'rgba(138, 43, 226, 0.3)', // Violet nebula
      aura: 'rgba(0, 255, 127, 0.2)', // Spring green aura
    };
  }

  initializeStars() {
    // Initialize cosmic background stars
    for (let i = 0; i < 15; i++) {
      this.stars.push({
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 80,
        size: Math.random() * 1 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.01,
      });
    }
  }

  initializeBrainWaves() {
    // Initialize telepathic brain waves
    for (let i = 0; i < 4; i++) {
      this.brainWaves.push({
        radius: 10 + i * 5,
        opacity: ((4 - i) / 4) * 0.4,
        phase: (i * Math.PI) / 2,
      });
    }
  }

  updateTimers(timestamp) {
    super.updateTimers(timestamp);
    this.pulseTimer = (timestamp / 2000) % (Math.PI * 2); // Body pulse
    this.brainWaveTimer = (timestamp / 1500) % (Math.PI * 2); // Brain activity
    this.telepathyTimer = (timestamp / 3000) % (Math.PI * 2); // Telepathic waves
    this.cosmicTimer = (timestamp / 1200) % (Math.PI * 2); // Cosmic effects
    this.antennaeTimer = (timestamp / 800) % (Math.PI * 2); // Antennae movement
  }

  updateCosmicParticles() {
    // Add cosmic energy particles
    if (Math.random() < 0.1) {
      this.cosmicParticles.push({
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        life: 1.0,
        size: Math.random() * 2 + 0.5,
        color: Math.random() < 0.5 ? this.colors.cosmic : this.colors.telepathy,
        spin: Math.random() * 0.1,
      });
    }

    // Update particles
    this.cosmicParticles = this.cosmicParticles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.spin += 0.05;
      particle.life -= 0.01;
      return particle.life > 0;
    });
  }

  updateStars() {
    this.stars.forEach((star) => {
      star.twinkle += star.speed;
    });
  }

  updateBrainWaves() {
    if (this.mouthState === 'communicating' || this.mouthState === 'analyzing') {
      this.brainWaves.forEach((wave) => {
        wave.radius = 10 + Math.sin(this.brainWaveTimer + wave.phase) * 8;
      });
    }
  }

  draw() {
    this.updateCosmicParticles();
    this.updateStars();
    this.updateBrainWaves();

    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const pulseScale = 1 + Math.sin(this.pulseTimer) * 0.05;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(pulseScale, pulseScale);

    // Draw cosmic background
    this.drawStars();
    this.drawCosmicParticles();

    // Draw alien aura
    this.drawAura();

    // Draw telepathic brain waves
    this.drawBrainWaves();

    // Draw main alien body
    this.drawBody();

    // Draw large brain
    this.drawBrain();

    // Draw antennae
    this.drawAntennae();

    // Draw large alien eyes
    this.drawEyes();

    // Draw mouth
    this.drawMouth();

    // Draw cosmic details
    this.drawCosmicDetails();

    ctx.restore();
  }

  drawFace() {
    // Alien face is drawn in parts
  }

  drawStars() {
    const { ctx } = this;

    this.stars.forEach((star) => {
      ctx.save();
      const twinkleIntensity = 0.3 + Math.sin(star.twinkle) * 0.7;
      ctx.globalAlpha = twinkleIntensity;

      ctx.fillStyle = this.colors.stars;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();

      // Star cross
      if (twinkleIntensity > 0.7) {
        ctx.strokeStyle = this.colors.stars;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(star.x - star.size * 2, star.y);
        ctx.lineTo(star.x + star.size * 2, star.y);
        ctx.moveTo(star.x, star.y - star.size * 2);
        ctx.lineTo(star.x, star.y + star.size * 2);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  drawCosmicParticles() {
    const { ctx } = this;

    this.cosmicParticles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin);

      // Cosmic energy shape
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.moveTo(0, -particle.size);
      ctx.lineTo(particle.size * 0.8, particle.size * 0.5);
      ctx.lineTo(-particle.size * 0.8, particle.size * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  }

  drawAura() {
    const { ctx } = this;
    const auraIntensity = 0.3 + Math.sin(this.cosmicTimer) * 0.2;

    ctx.save();
    ctx.globalAlpha = auraIntensity;

    const auraGradient = ctx.createRadialGradient(0, -5, 15, 0, -5, 40);
    auraGradient.addColorStop(0, 'rgba(0, 255, 127, 0)');
    auraGradient.addColorStop(0.8, this.colors.aura);
    auraGradient.addColorStop(1, 'rgba(0, 255, 127, 0)');

    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.ellipse(0, -5, 40, 45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawBrainWaves() {
    const { ctx } = this;

    if (this.mouthState === 'communicating' || this.mouthState === 'analyzing') {
      this.brainWaves.forEach((wave) => {
        ctx.save();
        ctx.globalAlpha = wave.opacity;
        ctx.strokeStyle = this.colors.telepathy;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -15, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }
  }

  drawBody() {
    const { ctx } = this;

    // Alien body - more slender and elongated
    ctx.save();

    // Body gradient
    const bodyGradient = ctx.createLinearGradient(0, -10, 0, 20);
    bodyGradient.addColorStop(0, this.colors.skin);
    bodyGradient.addColorStop(0.5, this.colors.skinShade);
    bodyGradient.addColorStop(1, this.colors.skin);

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 5, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body texture/pattern
    ctx.strokeStyle = this.colors.skinShade;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;
    for (let i = -10; i <= 10; i += 5) {
      ctx.beginPath();
      ctx.ellipse(0, 5 + i, 12, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  drawBrain() {
    const { ctx } = this;
    const brainPulse = 1 + Math.sin(this.brainWaveTimer) * 0.1;

    ctx.save();
    ctx.scale(brainPulse, brainPulse);

    // Large exposed brain
    const brainGradient = ctx.createRadialGradient(0, -18, 0, 0, -18, 15);
    brainGradient.addColorStop(0, this.colors.brain);
    brainGradient.addColorStop(0.7, this.colors.brainGlow);
    brainGradient.addColorStop(1, this.colors.brain);

    ctx.fillStyle = brainGradient;
    ctx.beginPath();
    ctx.ellipse(0, -18, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Brain texture/wrinkles
    ctx.strokeStyle = this.colors.brainGlow;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;

    // Brain folds
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.quadraticCurveTo(0, -22, 12, -18);
    ctx.moveTo(-8, -15);
    ctx.quadraticCurveTo(0, -20, 8, -15);
    ctx.moveTo(-6, -12);
    ctx.quadraticCurveTo(0, -16, 6, -12);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawAntennae() {
    const { ctx } = this;
    const antennaeBob = Math.sin(this.antennaeTimer) * 0.2;

    // Left antenna
    ctx.strokeStyle = this.colors.antennae;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -25);
    ctx.lineTo(-8 + antennaeBob, -35);
    ctx.stroke();

    // Left antenna orb
    ctx.fillStyle = this.colors.antennae;
    ctx.beginPath();
    ctx.arc(-8 + antennaeBob, -35, 2, 0, Math.PI * 2);
    ctx.fill();

    // Antenna energy
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = this.colors.cosmic;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-8 + antennaeBob, -35, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Right antenna
    ctx.strokeStyle = this.colors.antennae;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, -25);
    ctx.lineTo(8 - antennaeBob, -35);
    ctx.stroke();

    // Right antenna orb
    ctx.fillStyle = this.colors.antennae;
    ctx.beginPath();
    ctx.arc(8 - antennaeBob, -35, 2, 0, Math.PI * 2);
    ctx.fill();

    // Antenna energy
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = this.colors.cosmic;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(8 - antennaeBob, -35, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawEyes() {
    const { ctx } = this;
    const isBlinking = this.blinkTimer > 5.5;
    const eyeHeight = isBlinking ? 2 : 12; // Very large alien eyes

    // Eye glow
    ctx.save();
    ctx.shadowColor = this.colors.eyeGlow;
    ctx.shadowBlur = 12;

    // Left eye - much larger
    ctx.fillStyle = this.colors.eyes;
    ctx.beginPath();
    ctx.ellipse(-8, -8, 8, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(8, -8, 8, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (!isBlinking) {
      // Large pupils
      ctx.fillStyle = this.colors.pupils;
      ctx.beginPath();
      ctx.ellipse(-8, -8, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(8, -8, 4, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Multiple eye reflections
      ctx.fillStyle = this.colors.stars;
      // Main highlights
      ctx.beginPath();
      ctx.ellipse(-10, -12, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(10, -12, 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Secondary highlights
      ctx.beginPath();
      ctx.ellipse(-6, -6, 1, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, -6, 1, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMouth() {
    const { ctx } = this;

    ctx.strokeStyle = this.colors.mouth;
    ctx.fillStyle = this.colors.mouth;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    switch (this.mouthState) {
      case 'observing':
        // Small neutral line
        ctx.beginPath();
        ctx.moveTo(-3, 8);
        ctx.lineTo(3, 8);
        ctx.stroke();
        break;

      case 'communicating':
        // Pulsing communication mouth
        const commPulse = Math.sin(this.telepathyTimer * 2) * 2;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(0, 8, 4 + commPulse, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;

      case 'analyzing':
        // Thoughtful expression
        ctx.beginPath();
        ctx.moveTo(-4, 8);
        ctx.quadraticCurveTo(0, 6, 4, 8);
        ctx.stroke();

        // Analysis indicators
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = this.colors.cosmic;
        for (let i = -6; i <= 6; i += 3) {
          ctx.beginPath();
          ctx.moveTo(i, 12);
          ctx.lineTo(i, 14);
          ctx.stroke();
        }
        ctx.restore();
        break;

      case 'peaceful':
        // Serene smile
        ctx.beginPath();
        ctx.arc(0, 6, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();
        break;

      case 'teleporting':
        // Distorted mouth during teleportation
        const telePhase = Math.sin(this.cosmicTimer * 4) * 3;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(-3 + telePhase, 8);
        ctx.lineTo(3 - telePhase, 8);
        ctx.stroke();
        ctx.restore();
        break;
    }
  }

  drawCosmicDetails() {
    const { ctx } = this;

    // Cosmic energy emanating from brain
    if (this.mouthState === 'communicating') {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = this.colors.telepathy;
      ctx.lineWidth = 1;

      // Energy spirals
      for (let i = 0; i < 3; i++) {
        const spiralRadius = 20 + i * 5;
        const spiralPhase = this.telepathyTimer + (i * Math.PI) / 3;

        ctx.beginPath();
        for (let angle = 0; angle < Math.PI * 4; angle += 0.2) {
          const x = Math.cos(angle + spiralPhase) * (spiralRadius - angle * 2);
          const y = -20 + Math.sin(angle + spiralPhase) * (spiralRadius - angle * 2);
          if (angle === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      ctx.restore();
    }

    // Teleportation effect
    if (this.mouthState === 'teleporting') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = this.colors.cosmic;
      ctx.lineWidth = 0.5;

      // Distortion grid
      for (let i = -30; i <= 30; i += 5) {
        const distort = Math.sin(this.cosmicTimer * 3 + i * 0.1) * 2;
        ctx.beginPath();
        ctx.moveTo(i + distort, -40);
        ctx.lineTo(i - distort, 40);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-40, i + distort);
        ctx.lineTo(40, i - distort);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  startTeleporting() {
    const originalMood = this.mouthState;
    this.setMood('teleporting');
    setTimeout(() => this.setMood(originalMood), 4000);
  }

  communicate() {
    const originalMood = this.mouthState;
    this.setMood('communicating');
    setTimeout(() => this.setMood(originalMood), 6000);
  }
}