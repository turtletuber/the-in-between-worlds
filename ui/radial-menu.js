// js/ui/radial-menu.js

export default class RadialMenu {
  constructor(config = {}) {
    // Configuration
    this.SELECTOR_ANGLE = config.selectorAngle || 135; // Fixed selector position (northwest/top-left diagonal)
    this.RADIUS = config.radius || 120; // Distance from center (pixels)
    this.NUM_OPTIONS = config.numOptions || 8; // Number of menu options
    this.ANGLE_STEP = 360 / this.NUM_OPTIONS; // Degrees between each option
    this.SCROLL_THRESHOLD = config.scrollThreshold || 15; // Pixels of scroll needed to trigger rotation
    this.SCROLL_DEBOUNCE_TIME = config.scrollDebounceTime || 40; // ms cooldown after rotation
    this.SCROLL_RESET_TIME = config.scrollResetTime || 150; // ms before scroll accumulator resets
    this.DEBUG_MODE = config.debugMode || false; // Set to true to enable console logging

    // State
    this.currentRotation = this.SELECTOR_ANGLE; // Start with first option at selector
    this.menuExpanded = false;
    this.currentOptionIndex = 0;

    // Easter egg: Track full scroll cycles without selection
    this.cycleCount = 0;
    this.rotationsSinceSelection = 0;
    this.ROTATIONS_PER_CYCLE = this.NUM_OPTIONS; // One full rotation through all options

    // Scroll state
    this.debounceTimeout = null;
    this.resetTimeout = null;
    this.scrollAccumulator = 0;

    // Animation state
    this.isAnimating = false; // Prevents updates during selection animation
    this.restoreTimeout = null; // Track the restore timeout

    // Store references
    this.centerElement = null;
    this.menuContainer = null;
    this.optionsContainer = null;
    this.options = [];

    // Callbacks
    this.onExpand = config.onExpand || null;
    this.onCollapse = config.onCollapse || null;
    this.onOptionSelect = config.onOptionSelect || null;
  }

  /**
   * Initialize the radial menu with a center element
   * @param {HTMLElement} centerElement - The element to use as the menu center (e.g., Flo)
   * @param {Array} menuOptions - Array of option configs: [{icon: '💬', panel: 'chat'}, ...]
   */
  init(centerElement, menuOptions) {
    this.centerElement = centerElement;

    // Create menu container that wraps the center element
    this.menuContainer = document.createElement('div');
    this.menuContainer.className = 'radial-menu';
    this.menuContainer.style.cssText = `
      position: fixed;
      z-index: 10000;
    `;

    // Wrap the center element
    centerElement.parentNode.insertBefore(this.menuContainer, centerElement);
    this.menuContainer.appendChild(centerElement);

    // Create options container (positioned relative to center element)
    this.optionsContainer = document.createElement('div');
    this.optionsContainer.className = 'radial-menu-options';
    this.optionsContainer.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      pointer-events: none;
    `;
    this.menuContainer.appendChild(this.optionsContainer);

    // Position options container at center of centerElement
    this.positionOptionsContainer();

    // Create menu options
    menuOptions.forEach((optionConfig, index) => {
      const option = this.createOption(optionConfig, index);
      this.options.push(option);
      this.optionsContainer.appendChild(option);
    });

    // Setup event listeners
    this.setupEventListeners();

    if (window.LOGGING?.LOG_INITIALIZATION) {
      console.log('🎯 Radial menu initialized with', this.NUM_OPTIONS, 'options');
    }
  }

  /**
   * Position the options container at the center of the center element
   */
  positionOptionsContainer() {
    const rect = this.centerElement.getBoundingClientRect();
    const parentRect = this.menuContainer.getBoundingClientRect();

    const centerX = rect.left - parentRect.left + rect.width / 2;
    const centerY = rect.top - parentRect.top + rect.height / 2;

    this.optionsContainer.style.left = `${centerX}px`;
    this.optionsContainer.style.top = `${centerY}px`;
  }

  /**
   * Update the menu position (call this when center element moves)
   */
  updatePosition() {
    if (this.menuExpanded) {
      this.positionOptionsContainer();
    }
  }

  /**
   * Create a menu option element
   */
  createOption(config, index) {
    const option = document.createElement('div');
    option.className = 'radial-menu-option';
    option.innerHTML = config.icon || '❓';
    option.dataset.panel = config.panel || '';
    option.dataset.action = config.action || '';
    option.dataset.index = index;

    option.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 56px;
      height: 56px;
      margin-left: -28px;
      margin-top: -28px;
      background: linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5em;
      box-shadow: 0 3px 12px rgba(0,0,0,0.2);
      cursor: pointer;
      opacity: 0;
      transform: translate(0, 0);
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
      border: 2px solid rgba(255, 255, 255, 0.8);
    `;

    // Click handler
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleOptionClick(config, index);
    });

    return option;
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Center element click to toggle menu
    this.centerElement.addEventListener('click', (e) => {
      // Only toggle if not dragging (for Flo compatibility)
      const wasDragging = this.centerElement.dataset.wasDragging === 'true';
      if (!wasDragging) {
        e.stopPropagation();
        this.toggle();
      }
      this.centerElement.dataset.wasDragging = 'false';
    });

    // Global scroll wheel rotation handler
    window.addEventListener('wheel', this.handleScroll.bind(this), { passive: false });

    // Keyboard handlers
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Close menu when clicking outside
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  /**
   * Handle scroll wheel for menu rotation
   */
  handleScroll(e) {
    // Don't interfere with scrolling inside panels or chat
    if (
      e.target.closest('.side-panel') ||
      e.target.closest('input') ||
      e.target.closest('textarea')
    ) {
      return;
    }

    // ONLY activate radial menu scroll when menu is already expanded
    // Do NOT expand on scroll - only on click
    if (!this.menuExpanded) {
      return; // Don't interfere with scene navigation
    }

    // Only prevent default if menu is expanded
    e.preventDefault();

    // Accumulate scroll delta to prevent jittery movement
    this.scrollAccumulator += e.deltaY;

    // Clear the reset timeout since user is actively scrolling
    clearTimeout(this.resetTimeout);

    // Trigger rotation when threshold is reached (if not in debounce cooldown)
    if (Math.abs(this.scrollAccumulator) >= this.SCROLL_THRESHOLD && !this.debounceTimeout) {
      const direction = this.scrollAccumulator > 0 ? 1 : -1;
      this.scrollAccumulator = 0;

      // Rotate by one step
      this.currentRotation = (this.currentRotation - direction * this.ANGLE_STEP + 360) % 360;
      this.updateOptionPositions();

      // Easter egg: Track rotations for explosion
      this.rotationsSinceSelection++;
      if (this.rotationsSinceSelection >= this.ROTATIONS_PER_CYCLE) {
        this.rotationsSinceSelection = 0;
        this.cycleCount++;
        if (window.LOGGING?.LOG_UI_EVENTS) {
          console.log(`🔄 Cycle ${this.cycleCount}/3 completed`);
        }

        if (this.cycleCount >= 3) {
          this.cycleCount = 0;
          this.rotationsSinceSelection = 0;
          this.triggerExplosion();
        }
      }

      // Debounce to prevent rapid successive rotations
      this.debounceTimeout = setTimeout(() => {
        this.debounceTimeout = null;
      }, this.SCROLL_DEBOUNCE_TIME);
    }

    // Reset accumulator if user stops scrolling for a while
    this.resetTimeout = setTimeout(() => {
      this.scrollAccumulator = 0;
    }, this.SCROLL_RESET_TIME);
  }

  /**
   * Handle keyboard input
   */
  handleKeydown(e) {
    // Enter or Space to activate selected option
    if ((e.key === 'Enter' || e.key === ' ') && !e.target.matches('input, textarea')) {
      if (!this.menuExpanded) {
        return;
      }

      e.preventDefault();
      const selectedOption = this.options[this.currentOptionIndex];
      if (selectedOption) {
        selectedOption.click();
      }
    }

    // Escape to close menu
    if (e.key === 'Escape') {
      if (this.menuExpanded) {
        this.collapse();
      }
    }
  }

  /**
   * Handle clicking outside the menu
   */
  handleOutsideClick(e) {
    if (this.menuExpanded && !this.menuContainer.contains(e.target)) {
      this.collapse();
    }
  }

  /**
   * Calculate position for each option based on current rotation
   */
  updateOptionPositions() {
    // Don't update positions during selection animation
    if (this.isAnimating) {
      return;
    }

    this.options.forEach((option, index) => {
      // Calculate angle for this option (starting at 0 degrees = right)
      const baseAngle = index * this.ANGLE_STEP;
      const currentAngle = (baseAngle + this.currentRotation) % 360;

      // Convert to radians
      const radians = (currentAngle * Math.PI) / 180;

      // Calculate position from center point (0, 0)
      // IMPORTANT: CSS screen coordinates have Y-axis pointing DOWN
      const x = Math.cos(radians) * this.RADIUS;
      const y = -Math.sin(radians) * this.RADIUS; // Flip Y for screen coordinates

      // Check if this option is at the selector position (within tolerance)
      let angleDiff = currentAngle - this.SELECTOR_ANGLE;
      while (angleDiff > 180) {
        angleDiff -= 360;
      }
      while (angleDiff < -180) {
        angleDiff += 360;
      }

      const isSelected = Math.abs(angleDiff) < this.ANGLE_STEP / 2;

      // Slight scale on highlighted item (at selector position), normal for others
      const scale = isSelected ? 1.1 : 1.0;
      option.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      option.style.opacity = '1'; // All fully visible while rotating
      option.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';

      // Debug mode: Add angle info to tooltip
      if (this.DEBUG_MODE) {
        option.title = `${currentAngle.toFixed(0)}° [${x.toFixed(0)}, ${y.toFixed(0)}]`;
      }

      // Update selected state
      if (isSelected) {
        option.classList.add('selected');
        this.currentOptionIndex = index;

        // Debug mode: Log selection changes
        if (this.DEBUG_MODE && option.dataset.wasSelected !== 'true') {
          console.log(
            `✓ Option ${index} selected at ${currentAngle.toFixed(1)}° (target: ${this.SELECTOR_ANGLE}°)`
          );
          option.dataset.wasSelected = 'true';
        }
      } else {
        option.classList.remove('selected');
        if (this.DEBUG_MODE && option.dataset.wasSelected === 'true') {
          option.dataset.wasSelected = 'false';
        }
      }
    });
  }

  /**
   * Handle option click
   */
  handleOptionClick(config, index) {
    // Reset easter egg counter on selection
    this.cycleCount = 0;
    this.rotationsSinceSelection = 0;

    // Clear any existing restore timeout
    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout);
      this.restoreTimeout = null;
    }

    // Set animation flag to prevent position updates
    this.isAnimating = true;

    // Disable pointer events on ALL options during animation
    this.options.forEach((option) => {
      option.style.pointerEvents = 'none';
    });

    // Make non-selected items fall back behind Flo
    this.options.forEach((option, i) => {
      if (i !== index) {
        // Non-selected items shrink back behind Flo
        option.style.transform = 'translate(0, 0) scale(0)';
        option.style.opacity = '0';
      } else {
        // Selected item stays visible at its position
        option.classList.add('activated');
      }
    });

    // After a delay, restore the menu for continued rotation
    this.restoreTimeout = setTimeout(() => {
      this.isAnimating = false; // Clear animation flag
      this.restoreTimeout = null;

      this.options.forEach((option) => {
        option.classList.remove('activated');
        option.style.pointerEvents = 'all'; // Re-enable pointer events
      });
      this.updateOptionPositions();
    }, 800);

    // Call callback if provided
    if (this.onOptionSelect) {
      this.onOptionSelect(config, index);
    }

    if (window.LOGGING?.LOG_UI_EVENTS) {
      console.log('🎯 Menu option selected:', config);
    }
  }

  /**
   * Expand the menu
   */
  expand() {
    if (this.menuExpanded) {
      return;
    }

    this.menuExpanded = true;
    this.menuContainer.classList.add('expanded');

    // Emerge animation: items come from behind Flo (scale 0) and grow outward
    this.options.forEach((option, index) => {
      option.style.pointerEvents = 'all';

      // Start from behind Flo (small and invisible)
      option.style.transform = 'translate(0, 0) scale(0)';
      option.style.opacity = '0';

      // Stagger the emergence for a wave effect
      setTimeout(() => {
        // Let updateOptionPositions handle the final state
        this.updateOptionPositions();
      }, index * 30); // Each item emerges 30ms after the previous
    });

    if (this.onExpand) {
      this.onExpand();
    }

    if (window.LOGGING?.LOG_UI_EVENTS) {
      console.log('📖 Radial menu expanded');
    }
  }

  /**
   * Collapse the menu
   */
  collapse() {
    if (!this.menuExpanded) {
      return;
    }

    this.menuExpanded = false;
    this.menuContainer.classList.remove('expanded');

    // Recede animation: items shrink back behind Flo in reverse order
    this.options.forEach((option, index) => {
      option.style.pointerEvents = 'none';

      // Stagger the recession in reverse for a wave effect
      setTimeout(
        () => {
          option.style.transform = 'translate(0, 0) scale(0)';
          option.style.opacity = '0';
        },
        (this.options.length - index) * 30
      ); // Reverse order
    });

    if (this.onCollapse) {
      this.onCollapse();
    }

    if (window.LOGGING?.LOG_UI_EVENTS) {
      console.log('📕 Radial menu collapsed');
    }
  }

  /**
   * Toggle menu expanded/collapsed
   */
  toggle() {
    if (this.menuExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  /**
   * Easter egg: Explosion animation
   */
  triggerExplosion() {
    if (window.LOGGING?.LOG_UI_EVENTS) {
      console.log('💥 RADIAL MENU EXPLOSION! 💥');
    }

    // Shake animation on center element
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
      const randomX = (Math.random() - 0.5) * 30;
      const randomY = (Math.random() - 0.5) * 30;
      const randomRotate = (Math.random() - 0.5) * 45;
      const scale = 1 + Math.random() * 0.5;

      this.centerElement.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg) scale(${scale})`;

      shakeCount++;
      if (shakeCount >= 15) {
        clearInterval(shakeInterval);

        // Final explosion burst - options fly out
        this.options.forEach((option, index) => {
          const angle = (index * this.ANGLE_STEP * Math.PI) / 180;
          const distance = 300 + Math.random() * 200;
          const x = Math.cos(angle) * distance;
          const y = -Math.sin(angle) * distance;
          const rotation = Math.random() * 720 - 360;

          option.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
          option.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(2)`;
          option.style.opacity = '0';
        });

        // Reset after animation
        setTimeout(() => {
          this.centerElement.style.transform = '';

          this.options.forEach((option) => {
            option.style.transition = '';
            option.style.opacity = '1';
          });

          this.updateOptionPositions();
        }, 800);
      }
    }, 40);
  }

  /**
   * Destroy the menu
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('wheel', this.handleScroll);
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('click', this.handleOutsideClick);

    // Remove DOM elements
    if (this.menuContainer) {
      this.menuContainer.remove();
    }

    if (window.LOGGING?.LOG_UI_EVENTS) {
      console.log('🗑️ Radial menu destroyed');
    }
  }
}