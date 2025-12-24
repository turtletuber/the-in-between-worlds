// js/avatars/panda-avatar.js

import Avatar from './Avatar.js';

export default class PandaAvatar extends Avatar {
  constructor(size = 64) {
    super(size);

    // Panda state
    this.mouthState = 'content'; // 'content' | 'eating' | 'playful' | 'sleepy' | 'excited'
    this.chewTimer = 0;
    this.floatTimer = 0;
    this.headBobTimer = 0;
    this.earWiggleTimer = 0;
    this.bambooLeaves = [];
    this.sakuraPetals = [];

    this.initializeBambooLeaves();
    this.initializeSakuraPetals();
  }

  getColors() {
    return {
      furWhite: '#FFFAF0', // Floral white
      furBlack: '#2F4F4F', // Dark slate gray
      furGray: '#696969', // Dim gray
      eyeBlack: '#000000', // Pure black
      eyeWhite: '#FFFFFF', // Pure white
      nose: '#FF69B4', // Hot pink
      tongue: '#FFB6C1', // Light pink
      bamboo: '#228B22', // Forest green
      bambooLight: '#90EE90', // Light green
      leaves: '#32CD32', // Lime green
      sakura: '#FFB6C1', // Light pink petals
      zenAura: 'rgba(144, 238, 144, 0.2)', // Light green aura
      cheeks: 'rgba(255, 182, 193, 0.3)', // Light pink cheeks
    };
  }

  initializeBambooLeaves() {
    // Initialize floating bamboo leaves
    for (let i = 0; i < 6; i++) {
      this.bambooLeaves.push({
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 80,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        floatSpeed: Math.random() * 0.3 + 0.1,
        size: Math.random() * 0.5 + 0.5,
      });
    }
  }

  initializeSakuraPetals() {
    // Initialize sakura petals
    for (let i = 0; i < 8; i++) {
      this.sakuraPetals.push({
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 0.2,
        vy: Math.random() * 0.1 + 0.05, // Gentle downward drift
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        size: Math.random() * 0.8 + 0.4,
        life: 1.0,
      });
    }
  }

  updateTimers(timestamp) {
    super.updateTimers(timestamp);
    this.chewTimer = (timestamp / 400) % (Math.PI * 2); // Chewing motion
    this.floatTimer = (timestamp / 3000) % (Math.PI * 2); // Gentle floating
    this.headBobTimer = (timestamp / 2000) % (Math.PI * 2); // Head bobbing
    this.earWiggleTimer = (timestamp / 1500) % (Math.PI * 2); // Ear movement
  }

  updateBambooLeaves() {
    this.bambooLeaves.forEach((leaf) => {
      leaf.y += leaf.floatSpeed;
      leaf.rotation += leaf.rotationSpeed;

      // Reset leaf position when it goes off screen
      if (leaf.y > 50) {
        leaf.y = -50;
        leaf.x = (Math.random() - 0.5) * 80;
      }
    });
  }

  updateSakuraPetals() {
    this.sakuraPetals.forEach((petal) => {
      petal.x += petal.vx;
      petal.y += petal.vy;
      petal.rotation += petal.rotationSpeed;

      // Reset petal when off screen
      if (petal.y > 60 || petal.x > 60 || petal.x < -60) {
        petal.y = -60;
        petal.x = (Math.random() - 0.5) * 100;
        petal.vx = (Math.random() - 0.5) * 0.2;
      }
    });
  }

  draw() {
    this.updateBambooLeaves();
    this.updateSakuraPetals();

    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const floatOffset = Math.sin(this.floatTimer) * 2;
    const headBob = Math.sin(this.headBobTimer) * 1;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(centerX, centerY + floatOffset);

    // Draw floating elements
    this.drawSakuraPetals();
    this.drawBambooLeaves();

    // Draw zen aura
    this.drawZenAura();

    // Draw panda body
    this.drawBody();

    // Draw panda head with head bob
    ctx.save();
    ctx.translate(0, headBob);

    // Draw ears
    this.drawEars();

    // Draw head
    this.drawHead();

    // Draw eye patches
    this.drawEyePatches();

    // Draw eyes
    this.drawEyes();

    // Draw nose
    this.drawNose();

    // Draw mouth
    this.drawMouth();

    // Draw cheeks
    this.drawCheeks();

    ctx.restore(); // End head bob

    // Draw bamboo (if eating)
    if (this.mouthState === 'eating') {
      this.drawBamboo();
    }

    ctx.restore();
  }

  drawFace() {
    // Panda face is drawn in parts
  }

  drawSakuraPetals() {
    const { ctx } = this;

    this.sakuraPetals.forEach((petal) => {
      ctx.save();
      ctx.translate(petal.x, petal.y);
      ctx.rotate(petal.rotation);
      ctx.scale(petal.size, petal.size);
      ctx.globalAlpha = 0.6;

      // Draw sakura petal shape
      ctx.fillStyle = this.colors.sakura;
      ctx.beginPath();

      // Petal shape (simplified)
      ctx.moveTo(0, -3);
      ctx.quadraticCurveTo(2, -2, 2, 0);
      ctx.quadraticCurveTo(1, 2, 0, 1);
      ctx.quadraticCurveTo(-1, 2, -2, 0);
      ctx.quadraticCurveTo(-2, -2, 0, -3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });
  }

  drawBambooLeaves() {
    const { ctx } = this;

    this.bambooLeaves.forEach((leaf) => {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.rotation);
      ctx.scale(leaf.size, leaf.size);
      ctx.globalAlpha = 0.4;

      // Draw bamboo leaf
      ctx.fillStyle = this.colors.leaves;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Leaf vein
      ctx.strokeStyle = this.colors.bamboo;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 6);
      ctx.stroke();

      ctx.restore();
    });
  }

  drawZenAura() {
    const { ctx } = this;
    const auraIntensity = 0.3 + Math.sin(this.floatTimer) * 0.15;

    ctx.save();
    ctx.globalAlpha = auraIntensity;

    const auraGradient = ctx.createRadialGradient(0, 0, 20, 0, 0, 45);
    auraGradient.addColorStop(0, 'rgba(144, 238, 144, 0)');
    auraGradient.addColorStop(0.8, this.colors.zenAura);
    auraGradient.addColorStop(1, 'rgba(144, 238, 144, 0)');

    ctx.fillStyle = auraGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawBody() {
    const { ctx } = this;

    // Panda body - round and cuddly
    ctx.save();

    // Body gradient
    const bodyGradient = ctx.createRadialGradient(0, 10, 0, 0, 10, 18);
    bodyGradient.addColorStop(0, this.colors.furWhite);
    bodyGradient.addColorStop(1, this.colors.furGray);

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body outline
    ctx.strokeStyle = this.colors.furGray;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawEars() {
    const { ctx } = this;
    const earWiggle = Math.sin(this.earWiggleTimer) * 0.1;

    // Left ear
    ctx.save();
    ctx.rotate(-0.3 + earWiggle);
    ctx.translate(-12, -18);

    // Outer ear
    ctx.fillStyle = this.colors.furBlack;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner ear
    ctx.fillStyle = this.colors.furWhite;
    ctx.beginPath();
    ctx.ellipse(0, 2, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Right ear
    ctx.save();
    ctx.rotate(0.3 - earWiggle);
    ctx.translate(12, -18);

    // Outer ear
    ctx.fillStyle = this.colors.furBlack;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner ear
    ctx.fillStyle = this.colors.furWhite;
    ctx.beginPath();
    ctx.ellipse(0, 2, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawHead() {
    const { ctx } = this;

    // Panda head - round and fluffy
    const headGradient = ctx.createRadialGradient(0, -8, 0, 0, -8, 20);
    headGradient.addColorStop(0, this.colors.furWhite);
    headGradient.addColorStop(1, this.colors.furGray);

    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(0, -8, 18, 0, Math.PI * 2);
    ctx.fill();

    // Head outline
    ctx.strokeStyle = this.colors.furGray;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -8, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawEyePatches() {
    const { ctx } = this;

    // Left eye patch
    ctx.fillStyle = this.colors.furBlack;
    ctx.beginPath();
    ctx.ellipse(-8, -12, 7, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Right eye patch
    ctx.beginPath();
    ctx.ellipse(8, -12, 7, 9, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawEyes() {
    const { ctx } = this;
    const isBlinking = this.blinkTimer > 3.5;
    const eyeHeight = isBlinking ? 2 : 8;

    // Left eye white
    ctx.fillStyle = this.colors.eyeWhite;
    ctx.beginPath();
    ctx.ellipse(-8, -12, 5, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right eye white
    ctx.beginPath();
    ctx.ellipse(8, -12, 5, eyeHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!isBlinking) {
      // Eye pupils
      ctx.fillStyle = this.colors.eyeBlack;

      // Left pupil
      ctx.beginPath();
      ctx.ellipse(-8, -12, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Right pupil
      ctx.beginPath();
      ctx.ellipse(8, -12, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlights
      ctx.fillStyle = this.colors.eyeWhite;
      ctx.beginPath();
      ctx.ellipse(-9, -15, 1.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(9, -15, 1.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawNose() {
    const { ctx } = this;

    // Panda nose - small and pink
    ctx.fillStyle = this.colors.nose;
    ctx.beginPath();
    ctx.ellipse(0, -6, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose highlight
    ctx.fillStyle = this.colors.eyeWhite;
    ctx.beginPath();
    ctx.ellipse(-0.5, -6.5, 0.5, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMouth() {
    const { ctx } = this;

    ctx.strokeStyle = this.colors.furBlack;
    ctx.fillStyle = this.colors.furBlack;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    switch (this.mouthState) {
      case 'content':
        // Peaceful smile
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0.3, Math.PI - 0.3);
        ctx.stroke();
        break;

      case 'eating':
        // Chewing motion
        const chewOffset = Math.sin(this.chewTimer) * 2;
        ctx.save();
        ctx.translate(0, chewOffset);

        // Open mouth while chewing
        ctx.fillStyle = this.colors.furBlack;
        ctx.beginPath();
        ctx.ellipse(0, -2, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tongue
        ctx.fillStyle = this.colors.tongue;
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        break;

      case 'playful':
        // Happy expression
        ctx.beginPath();
        ctx.arc(0, -4, 6, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Playful tongue
        ctx.fillStyle = this.colors.tongue;
        ctx.beginPath();
        ctx.ellipse(2, 0, 2, 1, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'sleepy':
        // Sleepy yawn
        ctx.fillStyle = this.colors.furBlack;
        ctx.beginPath();
        ctx.ellipse(0, -2, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'excited':
        // Big happy smile
        ctx.beginPath();
        ctx.arc(0, -6, 8, 0.1, Math.PI - 0.1);
        ctx.stroke();
        break;
    }
  }

  drawCheeks() {
    const { ctx } = this;

    // Cute blush marks
    ctx.fillStyle = this.colors.cheeks;

    // Left cheek
    ctx.beginPath();
    ctx.ellipse(-15, -8, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right cheek
    ctx.beginPath();
    ctx.ellipse(15, -8, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBamboo() {
    const { ctx } = this;

    // Bamboo stalk in mouth
    ctx.save();
    ctx.translate(6, -4);
    ctx.rotate(0.3);

    // Bamboo segments
    ctx.fillStyle = this.colors.bamboo;
    ctx.fillRect(-1, -12, 2, 15);

    // Bamboo joints
    ctx.strokeStyle = this.colors.bambooLight;
    ctx.lineWidth = 1;
    for (let i = -10; i <= 0; i += 4) {
      ctx.beginPath();
      ctx.moveTo(-2, i);
      ctx.lineTo(2, i);
      ctx.stroke();
    }

    // Bamboo leaves
    ctx.fillStyle = this.colors.leaves;
    ctx.beginPath();
    ctx.ellipse(-3, -15, 2, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(3, -13, 1.5, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  startEating() {
    const originalMood = this.mouthState;
    this.setMood('eating');
    setTimeout(() => this.setMood(originalMood), 5000);
  }

  getExcited() {
    const originalMood = this.mouthState;
    this.setMood('excited');
    setTimeout(() => this.setMood(originalMood), 3000);
  }
}