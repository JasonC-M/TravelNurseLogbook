/**
 * Contract Form Controller
 */

class ContractFormController {
  constructor() {
    this.currentMode = null;
    this.currentContract = null;
    this.form = null;
    this.slideout = null;
    
    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }
  
  initialize() {
    // Prevent duplicate initialization
    if (this.initialized) {
      return true;
    }
    
    this.form = document.getElementById('contract-form');
    this.slideout = document.getElementById('contract-slideout');
    
    if (!this.form || !this.slideout) {
      // Only retry once to prevent infinite loops
      if (!this.retryAttempted) {
        this.retryAttempted = true;
        setTimeout(() => {
          this.initialize();
        }, 500);
      }
      return false;
    }
    
    this.setupEventHandlers();
    this.initialized = true; // Mark as initialized
    
    return true;
  }


  
  setupEventHandlers() {
    // Close button
    const closeBtn = document.getElementById('close-contract');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeForm();
      });
    }
    
    // Save Contract button (CREATE mode)
    const saveBtn = document.getElementById('save-contract-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.saveContract();
      });
    }
    
    // Update Contract button (EDIT mode)  
    const updateBtn = document.getElementById('update-contract-btn');
    if (updateBtn) {
      updateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.updateContract();
      });
    }
    
    // Edit Contract button (DISPLAY mode)
    const editBtn = document.getElementById('edit-contract-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this.openEditMode();
      });
    }
    
    // Delete Contract button (EDIT mode)
    const deleteBtn = document.getElementById('delete-contract-btn');
    
    if (deleteBtn) {
      // Check if event listener already attached to prevent duplicates
      if (deleteBtn.dataset.listenerAttached) {
        return;
      }
      
      // Single delete handler to prevent multiple confirmations
      const deleteHandler = (e) => {
        e.preventDefault(); // Prevent any form submission
        e.stopPropagation(); // Stop event bubbling
        
        // Prevent multiple rapid clicks
        if (deleteBtn.dataset.processing) {
          return;
        }
        
        this.deleteContract();
      };
      
      deleteBtn.addEventListener('click', deleteHandler);
      deleteBtn.dataset.listenerAttached = 'true'; // Mark as having listener
    }

    // Cancel buttons
    const cancelBtn = document.getElementById('cancel-contract-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const closeDisplayBtn = document.getElementById('close-display-btn');
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.closeForm();
      });
    }
    
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        this.closeForm();
      });
    }
    
    if (closeDisplayBtn) {
      closeDisplayBtn.addEventListener('click', () => {
        this.closeForm();
      });
    }
  }
  
  openCreateMode() {
    this.currentMode = 'create';
    this.currentContract = null;
    this.clearForm();      // Clear all form fields for new contract
    this.setCreateMode();  // Set form to create mode
    this.openForm();
  }
  
  openDisplayMode(contract) {
    this.currentMode = 'display';
    this.currentContract = contract;
    this.populateFormBasic(contract);
    this.setDisplayMode();  // Set form to display mode
    this.openForm();
  }
  
  updateDebugInfo() {
    // Method kept for compatibility
  }
  
  populateFormBasic(contract) {
    if (!contract) {
      return;
    }
    
    // Update title
    const titleEl = document.getElementById('contract-form-title');
    if (titleEl) {
      titleEl.textContent = `Contract: ${contract.hospital_name}`;
    }
    
    // Actually populate the form fields
    
    const hospitalNameInput = document.getElementById('contract-hospital-name');
    const hospitalAddressInput = document.getElementById('contract-hospital-address');
    const startDateInput = document.getElementById('contract-start-date');
    const endDateInput = document.getElementById('contract-end-date');
    
    if (hospitalNameInput) {
      hospitalNameInput.value = contract.hospital_name || '';
    }
    
    if (hospitalAddressInput) {
      hospitalAddressInput.value = contract.address || '';
    }
    
    if (startDateInput) {
      startDateInput.value = contract.start_date || '';
    }
    
    if (endDateInput) {
      endDateInput.value = contract.end_date || '';
    }
    
    // Populate display values for read-only display mode
    const hospitalNameDisplay = document.getElementById('contract-hospital-name-display');
    const hospitalAddressDisplay = document.getElementById('contract-hospital-address-display');
    const startDateDisplay = document.getElementById('contract-start-date-display');
    const endDateDisplay = document.getElementById('contract-end-date-display');
    
    if (hospitalNameDisplay) {
      hospitalNameDisplay.textContent = contract.hospital_name || '';
    }
    
    if (hospitalAddressDisplay) {
      hospitalAddressDisplay.textContent = contract.address || '';
    }
    
    if (startDateDisplay) {
      startDateDisplay.textContent = contract.start_date || '';
    }
    
    if (endDateDisplay) {
      endDateDisplay.textContent = contract.end_date || '';
    }
    
    // Populate coordinate fields
    const latitudeInput = document.getElementById('contract-latitude');
    const longitudeInput = document.getElementById('contract-longitude');
    
    if (latitudeInput) {
      latitudeInput.value = contract.latitude || '';
    }
    
    if (longitudeInput) {
      longitudeInput.value = contract.longitude || '';
    }
    
    // Populate coordinate display values
    const latitudeDisplay = document.getElementById('contract-latitude-display');
    const longitudeDisplay = document.getElementById('contract-longitude-display');
    
    if (latitudeDisplay) {
      latitudeDisplay.textContent = contract.latitude || '';
    }
    
    if (longitudeDisplay) {
      longitudeDisplay.textContent = contract.longitude || '';
    }
    
    // Populate contract info fields (for display) - using correct IDs
    const contractIdEl = document.getElementById('contract-id-display');
    const createdEl = document.getElementById('contract-created-display');
    const updatedEl = document.getElementById('contract-updated-display');
    
    if (contractIdEl) {
      contractIdEl.textContent = contract.id || '';
    }
    
    if (createdEl) {
      const createdDate = contract.created_at ? new Date(contract.created_at).toLocaleDateString() : '';
      createdEl.textContent = createdDate;
    }
    
    if (updatedEl) {
      const updatedDate = contract.updated_at ? new Date(contract.updated_at).toLocaleDateString() : '';
      updatedEl.textContent = updatedDate;
    }
  }
  
  setDisplayMode() {
    
    // Hide all input fields, show display values
    const inputFields = this.form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]');
    inputFields.forEach(input => {
      input.style.display = 'none';
    });
    
    const displayValues = this.form.querySelectorAll('.display-value');
    displayValues.forEach(display => {
      display.style.display = 'block';
    });
    
    // Hide all action button groups
    const allActions = this.form.querySelectorAll('.create-actions, .display-actions, .edit-actions');
    allActions.forEach(actions => {
      actions.style.display = 'none';
    });
    
    // Show only display actions
    const displayActions = this.form.querySelector('.display-actions');
    if (displayActions) {
      displayActions.style.display = 'flex';
    }
  }
  
  setCreateMode() {
    
    // Show input fields, hide display values  
    const inputFields = this.form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]');
    inputFields.forEach(input => {
      input.style.display = 'block';
    });
    
    const displayValues = this.form.querySelectorAll('.display-value');
    displayValues.forEach(display => {
      display.style.display = 'none';
    });
    
    // Hide all action button groups
    const allActions = this.form.querySelectorAll('.create-actions, .display-actions, .edit-actions');
    allActions.forEach(actions => {
      actions.style.display = 'none';
    });
    
    // Show only create actions
    const createActions = this.form.querySelector('.create-actions');
    if (createActions) {
      createActions.style.display = 'flex';
    }
  }
  
  setEditMode() {
    
    // Show input fields, hide display values
    const inputFields = this.form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]');
    inputFields.forEach(input => {
      input.style.display = 'block';
    });
    
    const displayValues = this.form.querySelectorAll('.display-value');
    displayValues.forEach(display => {
      display.style.display = 'none';
    });
    
    // Hide all action button groups
    const allActions = this.form.querySelectorAll('.create-actions, .display-actions, .edit-actions');
    allActions.forEach(actions => {
      actions.style.display = 'none';
    });
    
    // Show only edit actions
    const editActions = this.form.querySelector('.edit-actions');
    if (editActions) {
      editActions.style.display = 'flex';
      
        // Debug: Check if delete button is visible in edit actions
      const deleteBtn = editActions.querySelector('#delete-contract-btn');
    } else {
    }
  }
  
  openForm() {
    if (this.slideout) {
      this.slideout.classList.add('open');
    } else {
    }
  }
  
  collectFormData() {
    
    try {
      const hospitalName = document.getElementById('contract-hospital-name')?.value?.trim();
      const hospitalAddress = document.getElementById('contract-hospital-address')?.value?.trim();
      const startDate = document.getElementById('contract-start-date')?.value;
      const endDate = document.getElementById('contract-end-date')?.value;
      const latitude = document.getElementById('contract-latitude')?.value;
      const longitude = document.getElementById('contract-longitude')?.value;
      
      // Basic validation
      if (!hospitalName) {
        alert('Hospital name is required');
        return null;
      }
      
      if (!hospitalAddress) {
        alert('Hospital address is required');
        return null;
      }
      
      if (!startDate) {
        alert('Start date is required');
        return null;
      }
      
      if (!endDate) {
        alert('End date is required');
        return null;
      }
      
      const formData = {
        hospital_name: hospitalName,
        address: hospitalAddress,
        start_date: startDate,
        end_date: endDate
      };
      
      // Add coordinates if provided
      if (latitude && !isNaN(parseFloat(latitude))) {
        formData.latitude = parseFloat(latitude);
      }
      
      if (longitude && !isNaN(parseFloat(longitude))) {
        formData.longitude = parseFloat(longitude);
      }
      
      return formData;
      
    } catch (error) {
      return null;
    }
  }

  clearForm() {
    
    // Clear all input fields
    const inputs = this.form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]');
    inputs.forEach(input => {
      input.value = '';
    });
    
    // Clear all display values
    const displayValues = this.form.querySelectorAll('.display-value');
    displayValues.forEach(display => {
      display.textContent = '';
    });
    
    // Clear title
    const titleEl = document.getElementById('contract-form-title');
    if (titleEl) {
      titleEl.textContent = 'New Contract';
    }
    
    // Log clear operation instead of updating debug area
    
  }

  openEditMode() {
    if (!this.currentContract) {
      return;
    }
    
    this.currentMode = 'edit';
    this.updateDebugInfo();
    this.populateFormBasic(this.currentContract);
    this.setEditMode();
  }


  
  async saveContract() {
    
    // Collect form data
    const formData = this.collectFormData();
    if (!formData) {
      return;
    }
    
    
    // Save to database
    const user = window.auth?.getCurrentUser();
    if (!user || !user.id) {
      alert('Error: User not authenticated');
      return;
    }
    const userId = user.id;
    
    const result = await window.database.createContract(userId, formData);
    
    if (result.success) {
      
      // Refresh the contract list to show new contract
      if (window.logbookApp && typeof window.logbookApp.loadContractsFromDatabase === 'function') {
        await window.logbookApp.loadContractsFromDatabase();
      }
      
      // Close the form
      this.closeForm();
    } else {
      alert('Failed to create contract: ' + result.error);
    }
  }
  
  async updateContract() {
    if (!this.currentContract) {
      return;
    }
    
    // Collect form data
    const formData = this.collectFormData();
    if (!formData) {
      return;
    }
    
    
    // Update in database
    const user = window.auth?.getCurrentUser();
    if (!user || !user.id) {
      alert('Error: User not authenticated');
      return;
    }
    const userId = user.id;
    
    const result = await window.database.updateContract(this.currentContract.id, userId, formData);
    
    if (result.success) {
      
      // Refresh the contract list to show updated data
      if (window.logbookApp && typeof window.logbookApp.loadContractsFromDatabase === 'function') {
        await window.logbookApp.loadContractsFromDatabase();
      }
      
      // Close the form
      this.closeForm();
    } else {
      alert('Failed to update contract: ' + result.error);
    }
  }

  async deleteContract() {
    // Prevent multiple simultaneous delete attempts
    const deleteBtn = document.getElementById('delete-contract-btn');
    if (deleteBtn?.dataset.processing === 'true') {
      return;
    }
    
    if (deleteBtn) {
      deleteBtn.dataset.processing = 'true';
    }
    
    if (!this.currentContract) {
      alert('No contract selected for deletion');
      // Clear processing flag
      if (deleteBtn) delete deleteBtn.dataset.processing;
      return;
    }

    // Confirm deletion
    const hospitalName = this.currentContract.hospital_name || 'Unknown Hospital';
    const confirmMessage = `⚠️ Are you sure you want to DELETE this contract?\n\nHospital: ${hospitalName}\n\nThis action CANNOT be undone!`;
    
    const userConfirmed = confirm(confirmMessage);
    
    if (!userConfirmed) {
      // Clear processing flag on cancellation
      if (deleteBtn) delete deleteBtn.dataset.processing;
      return;
    }

    try {
      // Get current user
      const user = await window.auth.getCurrentSession();
      
      if (!user || !user.user) {
        throw new Error('No authenticated user found');
      }
      
      const actualUser = user.user;
      
      if (!window.database) {
        throw new Error('Database not available');
      }

      // Delete contract from database
      const result = await window.database.deleteContract(this.currentContract.id, actualUser.id);
      
      if (result.success) {
        // Refresh the contract list to remove deleted contract
        if (window.logbookApp && typeof window.logbookApp.loadContractsFromDatabase === 'function') {
          await window.logbookApp.loadContractsFromDatabase();
        }
        
        // Close the form
        this.closeForm();
        
        // Clear processing flag on success
        if (deleteBtn) delete deleteBtn.dataset.processing;
        
      } else {
        throw new Error(result.error || 'Unknown database error');
      }
      
    } catch (error) {
      alert('Failed to delete contract: ' + error.message);
    } finally {
      // Always clear processing flag
      const deleteBtn = document.getElementById('delete-contract-btn');
      if (deleteBtn) {
        delete deleteBtn.dataset.processing;
      }
    }
  }

  closeForm() {
    if (this.slideout) {
      this.slideout.classList.remove('open');
    }
    this.currentMode = null;
    this.currentContract = null;
    this.updateDebugInfo();
  }
}

// Create global instance
window.contractForm = new ContractFormController();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContractFormController;
}