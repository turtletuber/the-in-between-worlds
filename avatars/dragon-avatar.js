// js/avatars/dragon-avatar.js

import Avatar from './Avatar.js';

export default class DragonAvatar extends Avatar {
  constructor(size = 64) {
    super(size);

    // Dragon state
    this.mouthState = 'neutral'; // 'neutral' | 'roaring' | 'happy' | 'sleeping' | 'angry'
    this.wingFlapTimer = 0;
    this.fireTimer = 0;
    this.eyeGlowTimer = 0;
    this.fireParticles = [];
  }

  getColors() {
    return {
      bodyPrimary: '#FF4500', // Red-orange
      bodySecondary: '#DC143C', // Crimson
      belly: '#FFD700', // Gold
      horns: '#8B4513', // Saddle brown
      eyes: '#FF6347', // Tomato
      pupils: '#8B0000', // Dark red
      fire: '#FF8C00', // Dark orange
      fireCore: '#FFD700', // Gold center
      wings: '#B22222', // Fire brick
      wingMembrane: '#FF6347', // Tomato
      scales: '#228B22', // Forest green (accent)
      glow: 'rgba(255, 69, 0, 0.8)',
    };
  }

  updateTimers(timestamp) {
    super.updateTimers(timestamp);
    this.wingFlapTimer = (timestamp / 500) % (Math.PI * 2); // Wing flapping
    this.fireTimer = (timestamp / 100) % (Math.PI * 2); // Fire flicker
    this.eyeGlowTimer = (timestamp / 800) % (Math.PI * 2); // Eye glow pulse
  }

  updateFireParticles() {
    // Add new fire particles when roaring
    if (this.mouthState === 'roaring' && Math.random() < 0.3) {
      this.fireParticles.push({
        x: 0,
        y: 5,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * -2 - 1,
        life: 1.0,
        size: Math.random() * 3 + 1,
      });
    }

    // Update existing particles
    this.fireParticles = this.fireParticles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // Gravity
      particle.life -= 0.02;
      return particle.life > 0;
    });
  }

  draw() {
    this.updateFireParticles();

    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 0.9 + Math.sin(this.breathingTimer) * 0.08; // Dragon breathing

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);

    // Draw fire particles first (behind dragon)
    this.drawFireParticles();

    // Draw dragon glow
    this.drawGlow();

    // Draw wings (behind body)
    this.drawWings();

    // Draw main body
    this.drawBody();

    // Draw horns
    this.drawHorns();

    // Draw face features
    this.drawFace();

    // Draw spikes/scales
    this.drawSpikes();

    ctx.restore();
  }

  drawFace() {
    this.drawEyes();
    this.drawNose();
    this.drawMouth();
  }

  drawFireParticles() {
    const { ctx } = this;

    this.fireParticles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.life;

      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size
      );
      gradient.addColorStop(0, this.colors.fireCore);
      gradient.addColorStop(0.5, this.colors.fire);
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  drawGlow() {
    const { ctx } = this;
    const glowIntensity = 0.4 + Math.sin(this.eyeGlowTimer) * 0.3;

    ctx.save();
    ctx.shadowColor = this.colors.glow;
    ctx.shadowBlur = 20 * glowIntensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Invisible shape to create glow
    ctx.globalAlpha = 0;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 25, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.colors.bodyPrimary;
    ctx.fill();

    ctx.restore();
  }

  drawWings() {
    const { ctx } = this;
    const flapOffset = Math.sin(this.wingFlapTimer) * 0.3;

    ctx.save();

    // Left wing
    ctx.save();
    ctx.rotate(-0.5 + flapOffset);
    ctx.translate(-15, -10);
    this.drawWing();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.rotate(0.5 - flapOffset);
    ctx.translate(15, -10);
    ctx.scale(-1, 1); // Mirror
    this.drawWing();
    ctx.restore();

    ctx.restore();
  }

  drawWing() {
    const { ctx } = this;

    // Wing membrane
    ctx.fillStyle = this.colors.wingMembrane;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-10, -5, -12, 5);
    ctx.quadraticCurveTo(-8, 12, 0, 8);
    ctx.closePath();
    ctx.fill();

    // Wing structure
    ctx.strokeStyle = this.colors.wings;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-8, 2);
    ctx.moveTo(0, 4);
    ctx.lineTo(-6, 8);
    ctx.stroke();
  }

  drawBody() {
    const { ctx } = this;

    // Main body - dragon shaped
    ctx.save();

    // Body gradient
    const gradient = ctx.createRadialGradient(0, -5, 0, 0, 0, 30);
    gradient.addColorStop(0, this.colors.bodyPrimary);
    gradient.addColorStop(0.7, this.colors.bodySecondary);
    gradient.addColorStop(1, this.colors.wings);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = this.colors.belly;
    ctx.beginPath();
    ctx.ellipse(0, 5, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = this.colors.wings;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 22, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawHorns() {
    const { ctx } = this;

    ctx.fillStyle = this.colors.horns;

    // Left horn
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.lineTo(-6, -25);
    ctx.lineTo(-4, -18);
    ctx.closePath();
    ctx.fill();

    // Right horn
    ctx.beginPath();
    ctx.moveTo(8, -18);
    ctx.lineTo(6, -25);
    ctx.lineTo(4, -18);
    ctx.closePath();
    ctx.fill();
  }

  drawEyes() {
    const { ctx } = this;
    const isBlinking = this.blinkTimer > 3.7;
    const eyeHeight = isBlinking ? 2 : 6;
    const glowIntensity = 0.5 + Math.sin(this.eyeGlowTimer) * 0.3;

    // Eye glow
    ctx.save();
    ctx.shadowColor = this.colors.fire;
    ctx.shadowBlur = 10 * glowIntensity;

    // Left eye
    ctx.fillStyle = this.colors.eyes;
    ctx.beginPath();
    ctx.ellipse(-8, -5, 5, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right eye
    ctx.beginPath();
    ctx.ellipse(8, -5, 5, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (!isBlinking) {
      // Pupils - slit like dragon eyes
      ctx.fillStyle = this.colors.pupils;
      ctx.beginPath();
      ctx.ellipse(-8, -5, 1, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(8, -5, 1, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = this.colors.fireCore;
      ctx.beginPath();
      ctx.ellipse(-9, -7, 1, 1, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(9, -7, 1, 1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawNose() {
    const { ctx } = this;

    // Dragon snout
    ctx.fillStyle = this.colors.bodySecondary;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = this.colors.pupils;
    ctx.beginPath();
    ctx.ellipse(-2, -1, 1, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(2, -1, 1, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMouth() {
    const { ctx } = this;

    ctx.strokeStyle = this.colors.pupils;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    switch (this.mouthState) {
      case 'neutral':
        // Slight dragon smile
        ctx.beginPath();
        ctx.moveTo(-6, 8);
        ctx.quadraticCurveTo(0, 10, 6, 8);
        ctx.stroke();
        break;

      case 'roaring':
        // Open roaring mouth
        ctx.fillStyle = this.colors.pupils;
        ctx.beginPath();
        ctx.ellipse(0, 10, 8, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Teeth
        ctx.fillStyle = 'white';
        for (let i = -6; i <= 6; i += 3) {
          ctx.beginPath();
          ctx.moveTo(i, 7);
          ctx.lineTo(i + 1, 4);
          ctx.lineTo(i + 2, 7);
          ctx.closePath();
          ctx.fill();
        }
        break;

      case 'happy':
        // Big dragon grin
        ctx.beginPath();
        ctx.arc(0, 6, 8, 0, Math.PI);
        ctx.stroke();
        break;

      case 'sleeping':
        // Peaceful sleeping
        ctx.beginPath();
        ctx.moveTo(-4, 8);
        ctx.quadraticCurveTo(0, 6, 4, 8);
        ctx.stroke();
        break;

      case 'angry':
        // Angry snarl
        ctx.beginPath();
        ctx.moveTo(-8, 10);
        ctx.quadraticCurveTo(-4, 6, 0, 8);
        ctx.quadraticCurveTo(4, 6, 8, 10);
        ctx.stroke();
        break;
    }
  }

  drawSpikes() {
    const { ctx } = this;

    ctx.fillStyle = this.colors.scales;

    // Back spikes
    for (let i = -12; i <= 12; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, -20);
      ctx.lineTo(i - 2, -15);
      ctx.lineTo(i + 2, -15);
      ctx.closePath();
      ctx.fill();
    }

    // Side scales
    ctx.fillStyle = this.colors.bodySecondary;
    for (let i = -15; i <= 15; i += 8) {
      for (let j = -10; j <= 10; j += 8) {
        ctx.beginPath();
        ctx.arc(i, j, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  breatheFire() {
    const originalMood = this.mouthState;
    this.setMood('roaring');
    setTimeout(() => this.setMood(originalMood), 3000);
  }
}