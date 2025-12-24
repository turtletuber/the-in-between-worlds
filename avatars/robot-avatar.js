// js/avatars/robot-avatar.js

import Avatar from './Avatar.js';

export default class RobotAvatar extends Avatar {
  constructor(size = 64) {
    super(size);

    // Robot state
    this.mouthState = 'idle'; // 'idle' | 'processing' | 'happy' | 'error' | 'sleeping'
    this.scanLineTimer = 0;
    this.processingTimer = 0;
    this.glitchTimer = 0;
    this.powerPulseTimer = 0;
    this.digitalParticles = [];
    this.scanLines = [];

    this.initializeScanLines();
  }

  getColors() {
    return {
      chassis: '#2C3E50', // Dark blue-gray
      chassisLight: '#34495E', // Lighter blue-gray
      screen: '#00FFFF', // Cyan
      screenDark: '#008080', // Dark cyan
      led: '#00FF00', // Bright green
      ledOff: '#003300', // Dark green
      warning: '#FF6600', // Orange
      error: '#FF0000', // Red
      power: '#0080FF', // Blue
      digital: '#00CCFF', // Light blue
      wireframe: '#FFFFFF', // White
      glow: 'rgba(0, 255, 255, 0.6)',
    };
  }

  initializeScanLines() {
    // Initialize floating scan lines
    for (let i = 0; i < 3; i++) {
      this.scanLines.push({
        y: Math.random() * 60 - 30,
        speed: 0.5 + Math.random() * 1,
        opacity: 0.3 + Math.random() * 0.4,
      });
    }
  }

  updateTimers(timestamp) {
    super.updateTimers(timestamp);
    this.scanLineTimer = (timestamp / 200) % (Math.PI * 2);
    this.processingTimer = (timestamp / 150) % (Math.PI * 2);
    this.glitchTimer = (timestamp / 50) % (Math.PI * 2);
    this.powerPulseTimer = (timestamp / 1000) % (Math.PI * 2);
  }

  updateDigitalParticles() {
    // Add digital particles when processing
    if (this.mouthState === 'processing' && Math.random() < 0.2) {
      this.digitalParticles.push({
        x: (Math.random() - 0.5) * 40,
        y: (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1.0,
        size: Math.random() * 2 + 1,
        type: Math.random() < 0.5 ? 'bit' : 'pixel',
      });
    }

    // Update particles
    this.digitalParticles = this.digitalParticles.filter((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 0.015;
      return particle.life > 0;
    });
  }

  updateScanLines() {
    this.scanLines.forEach((line) => {
      line.y += line.speed;
      if (line.y > 35) {
        line.y = -35;
      }
    });
  }

  draw() {
    this.updateDigitalParticles();
    this.updateScanLines();

    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(centerX, centerY);

    // Draw digital effects first
    this.drawScanLines();
    this.drawDigitalParticles();

    // Draw robot glow
    this.drawGlow();

    // Draw main chassis
    this.drawChassis();

    // Draw antennas
    this.drawAntennas();

    // Draw face screen
    this.drawFaceScreen();

    // Draw eyes (LED displays)
    this.drawEyes();

    // Draw mouth display
    this.drawMouth();

    // Draw power indicators
    this.drawPowerIndicators();

    // Draw wireframe overlay
    this.drawWireframe();

    ctx.restore();
  }

  drawFace() {
    // The robot's face is more complex and drawn in parts within the main draw() method
  }

  drawScanLines() {
    const { ctx } = this;

    ctx.save();
    this.scanLines.forEach((line) => {
      ctx.globalAlpha = line.opacity;
      ctx.strokeStyle = this.colors.digital;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-30, line.y);
      ctx.lineTo(30, line.y);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawDigitalParticles() {
    const { ctx } = this;

    this.digitalParticles.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.life;

      if (particle.type === 'bit') {
        // Draw binary digits
        ctx.fillStyle = this.colors.digital;
        ctx.font = `${particle.size * 2}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.random() < 0.5 ? '0' : '1', particle.x, particle.y);
      } else {
        // Draw pixels
        ctx.fillStyle = this.colors.screen;
        ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
      }

      ctx.restore();
    });
  }

  drawGlow() {
    const { ctx } = this;
    const glowIntensity = 0.3 + Math.sin(this.powerPulseTimer) * 0.2;

    ctx.save();
    ctx.shadowColor = this.colors.glow;
    ctx.shadowBlur = 15 * glowIntensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Invisible shape to create glow
    ctx.globalAlpha = 0;
    ctx.beginPath();
    ctx.roundRect(-22, -22, 44, 44, 8);
    ctx.fillStyle = this.colors.chassis;
    ctx.fill();

    ctx.restore();
  }

  drawChassis() {
    const { ctx } = this;

    // Main body - rectangular with rounded corners
    ctx.save();

    // Body gradient
    const gradient = ctx.createLinearGradient(0, -22, 0, 22);
    gradient.addColorStop(0, this.colors.chassisLight);
    gradient.addColorStop(0.5, this.colors.chassis);
    gradient.addColorStop(1, this.colors.chassisLight);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(-20, -20, 40, 40, 6);
    ctx.fill();

    // Chassis outline
    ctx.strokeStyle = this.colors.screen;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-20, -20, 40, 40, 6);
    ctx.stroke();

    // Panel lines
    ctx.strokeStyle = this.colors.chassisLight;
    ctx.lineWidth = 0.5;
    for (let i = -15; i <= 15; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, -20);
      ctx.lineTo(i, 20);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawAntennas() {
    const { ctx } = this;
    const pulse = Math.sin(this.powerPulseTimer);

    // Left antenna
    ctx.strokeStyle = this.colors.chassisLight;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -20);
    ctx.lineTo(-10, -28);
    ctx.stroke();

    // Left antenna tip
    ctx.fillStyle = pulse > 0 ? this.colors.led : this.colors.ledOff;
    ctx.beginPath();
    ctx.arc(-10, -28, 2, 0, Math.PI * 2);
    ctx.fill();

    // Right antenna
    ctx.beginPath();
    ctx.moveTo(12, -20);
    ctx.lineTo(10, -28);
    ctx.stroke();

    // Right antenna tip
    ctx.fillStyle = pulse < 0 ? this.colors.led : this.colors.ledOff;
    ctx.beginPath();
    ctx.arc(10, -28, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFaceScreen() {
    const { ctx } = this;

    // Face screen background
    ctx.fillStyle = '#001122';
    ctx.beginPath();
    ctx.roundRect(-15, -15, 30, 25, 4);
    ctx.fill();

    // Screen border
    ctx.strokeStyle = this.colors.screen;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-15, -15, 30, 25, 4);
    ctx.stroke();

    // Screen scanlines
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = this.colors.digital;
    ctx.lineWidth = 0.5;
    for (let i = -12; i <= 8; i += 2) {
      ctx.beginPath();
      ctx.moveTo(-13, i);
      ctx.lineTo(13, i);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawEyes() {
    const { ctx } = this;
    const isBlinking = this.blinkTimer > 2.7;
    const eyeHeight = isBlinking ? 1 : 4;

    // Eye glow effect
    ctx.save();
    ctx.shadowColor = this.colors.screen;
    ctx.shadowBlur = 6;

    // Left eye display
    ctx.fillStyle = this.colors.screen;
    ctx.beginPath();
    ctx.roundRect(-10, -8, 6, eyeHeight, 1);
    ctx.fill();

    // Right eye display
    ctx.beginPath();
    ctx.roundRect(4, -8, 6, eyeHeight, 1);
    ctx.fill();

    ctx.restore();

    if (!isBlinking) {
      // Eye pixels/details
      ctx.fillStyle = this.colors.screenDark;

      // Left eye pixels
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          if (Math.random() > 0.7) {
            ctx.fillRect(-9 + i * 2, -7 + j * 2, 1, 1);
          }
        }
      }

      // Right eye pixels
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 2; j++) {
          if (Math.random() > 0.7) {
            ctx.fillRect(5 + i * 2, -7 + j * 2, 1, 1);
          }
        }
      }
    }
  }

  drawMouth() {
    const { ctx } = this;

    switch (this.mouthState) {
      case 'idle':
        // Simple line display
        ctx.strokeStyle = this.colors.screen;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-6, 5);
        ctx.lineTo(6, 5);
        ctx.stroke();
        break;

      case 'processing':
        // Animated processing bars
        ctx.fillStyle = this.colors.warning;
        for (let i = -6; i <= 6; i += 3) {
          const height = 2 + Math.sin(this.processingTimer + i) * 2;
          ctx.fillRect(i, 7 - height, 2, height);
        }
        break;

      case 'happy':
        // Smiley curve display
        ctx.strokeStyle = this.colors.led;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 3, 6, 0, Math.PI);
        ctx.stroke();

        // Happy indicator dots
        ctx.fillStyle = this.colors.led;
        ctx.beginPath();
        ctx.arc(-8, 5, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(8, 5, 1, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'error':
        // Error X display
        ctx.strokeStyle = this.colors.error;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-4, 2);
        ctx.lineTo(4, 8);
        ctx.moveTo(4, 2);
        ctx.lineTo(-4, 8);
        ctx.stroke();
        break;

      case 'sleeping':
        // Sleep mode dots
        ctx.fillStyle = this.colors.ledOff;
        for (let i = -4; i <= 4; i += 4) {
          ctx.beginPath();
          ctx.arc(i, 5, 1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
  }

  drawPowerIndicators() {
    const { ctx } = this;
    const pulse = Math.sin(this.powerPulseTimer);

    // Power level bars
    ctx.fillStyle = this.colors.chassisLight;
    ctx.fillRect(15, -18, 3, 8);

    // Active power levels
    const powerLevel = 3 + Math.floor(pulse * 2);
    ctx.fillStyle = this.colors.led;
    for (let i = 0; i < powerLevel; i++) {
      ctx.fillRect(15, -12 + i * 1.5, 3, 1);
    }

    // Status LED
    ctx.fillStyle = this.mouthState === 'error' ? this.colors.error : this.colors.led;
    ctx.beginPath();
    ctx.arc(16.5, -20, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawWireframe() {
    const { ctx } = this;

    if (this.mouthState === 'processing') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = this.colors.wireframe;
      ctx.lineWidth = 0.5;

      // Grid overlay
      for (let i = -20; i <= 20; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, -20);
        ctx.lineTo(i, 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-20, i);
        ctx.lineTo(20, i);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  startProcessing() {
    const originalMood = this.mouthState;
    this.setMood('processing');
    setTimeout(() => this.setMood(originalMood), 4000);
  }

  showError() {
    const originalMood = this.mouthState;
    this.setMood('error');
    setTimeout(() => this.setMood(originalMood), 2000);
  }
}