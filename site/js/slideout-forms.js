/**
 * Universal Slideout Form Utility
 * Provides common functionality for profile and contract slideout forms
 */

class SlideoutFormManager {
  constructor(slideoutId, options = {}) {
    this.slideoutId = slideoutId;
    this.slideout = document.getElementById(slideoutId);
    this.isOpen = false;
    
    // Configuration options
    this.options = {
      closeButtonSelector: options.closeButtonSelector || '.close-btn',
      cancelButtonSelectors: options.cancelButtonSelectors || ['.secondary-btn'],
      onClose: options.onClose || null,
      onSave: options.onSave || null,
      enableRetry: options.enableRetry !== false, // Default true
      retryDelay: options.retryDelay || 2000,
      debug: options.debug || false
    };

    this.log = this.options.debug ? console.log : () => {};
    
    // Initialize with retry mechanism
    this.initialize();
  }

  initialize() {
    if (this.options.enableRetry) {
      // Retry mechanism for DOM elements that might not exist yet
      setTimeout(() => {
        this.setupEventHandlers();
      }, this.options.retryDelay);
    } else {
      this.setupEventHandlers();
    }
  }

  setupEventHandlers() {
    this.log(`SlideoutFormManager - Setting up event handlers for ${this.slideoutId}`);
    
    if (!this.slideout) {
      this.log(`SlideoutFormManager - ⚠️ Slideout element ${this.slideoutId} not found`);
      return;
    }

    // Setup close button (X in header)
    this.setupCloseButton();
    
    // Setup cancel buttons (Cancel, Close display buttons)
    this.setupCancelButtons();
  }

  setupCloseButton() {
    const closeButton = this.slideout.querySelector(this.options.closeButtonSelector);
    if (closeButton) {
      this.log(`SlideoutFormManager - ✅ Setting up close button for ${this.slideoutId}`);
      
      // Remove existing listener to prevent duplicates
      closeButton.removeEventListener('click', this.handleClose);
      
      // Add new listener
      closeButton.addEventListener('click', (e) => {
        this.log(`SlideoutFormManager - 🔲 Close button clicked for ${this.slideoutId}`);
        this.handleClose(e);
      });
    } else {
      this.log(`SlideoutFormManager - ⚠️ Close button not found in ${this.slideoutId}`);
    }
  }

  setupCancelButtons() {
    this.options.cancelButtonSelectors.forEach(selector => {
      const buttons = this.slideout.querySelectorAll(selector);
      buttons.forEach(button => {
        // Only setup cancel functionality for buttons that contain "close" text (not "cancel")
        const buttonText = button.textContent.toLowerCase();
        if (buttonText.includes('close')) {
          this.log(`SlideoutFormManager - ✅ Setting up close button "${button.textContent}" for ${this.slideoutId}`);
          
          // Remove existing listener to prevent duplicates
          button.removeEventListener('click', this.handleClose);
          
          // Add new listener
          button.addEventListener('click', (e) => {
            this.log(`SlideoutFormManager - 🔲 Close button clicked: "${button.textContent}" for ${this.slideoutId}`);
            this.handleClose(e);
          });
        }
        // Skip "cancel" buttons - let the form handle those with custom logic
      });
    });
  }

  handleClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    this.log(`SlideoutFormManager - 🚪 Closing ${this.slideoutId}`);
    
    // Call custom close handler if provided
    if (this.options.onClose && typeof this.options.onClose === 'function') {
      this.options.onClose();
    } else {
      // Default close behavior
      this.close();
    }
  }

  close() {
    if (!this.slideout) {
      this.log(`SlideoutFormManager - ⚠️ Cannot close - slideout ${this.slideoutId} not found`);
      return;
    }

    this.slideout.classList.remove('open');
    this.isOpen = false;
    this.log(`SlideoutFormManager - ✅ ${this.slideoutId} closed successfully`);
  }

  open() {
    if (!this.slideout) {
      this.log(`SlideoutFormManager - ⚠️ Cannot open - slideout ${this.slideoutId} not found`);
      return;
    }

    this.slideout.classList.add('open');
    this.isOpen = true;
    this.log(`SlideoutFormManager - ✅ ${this.slideoutId} opened successfully`);
    
    // Re-setup handlers in case DOM changed
    this.setupEventHandlers();
  }

  // Utility method to show/hide mode-specific button groups
  setFormMode(mode) {
    if (!this.slideout) return;

    // Hide all action groups first
    const actionGroups = this.slideout.querySelectorAll('.create-actions, .display-actions, .edit-actions');
    actionGroups.forEach(group => {
      group.style.display = 'none';
    });

    // Show the appropriate action group
    const targetGroup = this.slideout.querySelector(`.${mode}-actions`);
    if (targetGroup) {
      targetGroup.style.display = 'block';
      this.log(`SlideoutFormManager - 📝 Set form mode to: ${mode}`);
      
      // Re-setup cancel buttons for the new mode
      this.setupCancelButtons();
    }
  }

  // Utility method to show/hide edit-only elements
  setEditMode(isEdit) {
    if (!this.slideout) return;

    const editOnlyElements = this.slideout.querySelectorAll('.edit-only');
    editOnlyElements.forEach(element => {
      element.style.display = isEdit ? 'block' : 'none';
    });
    
    this.log(`SlideoutFormManager - 🔧 Edit mode: ${isEdit}`);
  }
}

// Export for global use
window.SlideoutFormManager = SlideoutFormManager;