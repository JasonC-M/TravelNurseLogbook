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
    this.initializeDefaultState(); // Set default button visibility
    this.initialized = true; // Mark as initialized
    
    return true;
  }
  
  setButtonVisibility(mode) {
    console.log(`🎯 Setting button visibility for mode: ${mode}`);
    
    // Find the contract slideout container where the contract form HTML is loaded
    const contractSlideout = document.getElementById('contract-slideout');
    const profileContent = document.querySelector('.profile-content');
    
    console.log('🔍 DOM Structure Check:');
    console.log('  Contract slideout element check:');
    console.log('    by ID:', document.getElementById('contract-slideout'));
    console.log('    by class:', document.querySelector('.contract-slideout'));
    console.log('  All slideouts:', document.querySelectorAll('[id*="slideout"]'));
    console.log('  Profile content:', profileContent ? 'found' : 'missing');
    
    if (contractSlideout) {
      console.log('  Contract slideout HTML:', contractSlideout.innerHTML.substring(0, 300) + '...');
    } else {
      console.log('❌ Contract slideout not found - checking page structure...');
      console.log('  Body innerHTML preview:', document.body.innerHTML.substring(0, 500));
    }
    
    // Get button groups specifically from the contract slideout (not global)
    const formCreateActions = contractSlideout?.querySelector('.create-actions');
    const formDisplayActions = contractSlideout?.querySelector('.display-actions');
    const formEditActions = contractSlideout?.querySelector('.edit-actions');
    
    console.log('🔍 Contract form button groups:');
    console.log('  Create actions:', formCreateActions ? 'found' : 'missing');
    console.log('  Display actions:', formDisplayActions ? 'found' : 'missing');  
    console.log('  Edit actions:', formEditActions ? 'found' : 'missing');
    
    // Use only the contract form button groups (not profile form)
    const useCreateActions = formCreateActions;
    const useDisplayActions = formDisplayActions;
    const useEditActions = formEditActions;
    
    // Hide all groups first
    if (useCreateActions) useCreateActions.style.display = 'none';
    if (useDisplayActions) useDisplayActions.style.display = 'none';
    if (useEditActions) useEditActions.style.display = 'none';
    
    // Show the appropriate group based on mode
    if (mode === 'create' && useCreateActions) {
      useCreateActions.style.display = 'flex';
      console.log('✅ Showing CREATE actions: Save, Cancel');
    } else if (mode === 'edit' && useEditActions) {
      useEditActions.style.display = 'flex';
      console.log('✅ Showing EDIT actions: Save, Cancel');
    } else if (mode === 'display' && useDisplayActions) {
      useDisplayActions.style.display = 'flex';
      console.log('✅ Showing DISPLAY actions: Edit, Close');
    } else {
      console.error(`❌ Could not show buttons for mode: ${mode}`);
      console.log('Available elements:', {
        useCreateActions: !!useCreateActions,
        useDisplayActions: !!useDisplayActions,
        useEditActions: !!useEditActions
      });
    }
    
    // Show actual button contents
    if (useCreateActions) {
      const buttons = useCreateActions.querySelectorAll('button');
      console.log('  CREATE buttons:', Array.from(buttons).map(b => `${b.id}: "${b.textContent}"`));
    }
    if (useDisplayActions) {
      const buttons = useDisplayActions.querySelectorAll('button');
      console.log('  DISPLAY buttons:', Array.from(buttons).map(b => `${b.id}: "${b.textContent}"`));
    }
    if (useEditActions) {
      const buttons = useEditActions.querySelectorAll('button');
      console.log('  EDIT buttons:', Array.from(buttons).map(b => `${b.id}: "${b.textContent}"`));
    }
  }
  
  initializeDefaultState() {
    // Hide all action button groups by default
    const allActions = this.form.querySelectorAll('.create-actions, .display-actions, .edit-actions');
    allActions.forEach(actions => {
      actions.style.display = 'none';
    });
    
    // Hide danger zone by default
    const dangerZone = this.form.querySelector('.danger-zone');
    if (dangerZone) {
      dangerZone.style.display = 'none';
    }
  }


  
  setupEventHandlers() {
    
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

    // Cancel and close buttons
    const cancelBtn = document.getElementById('cancel-contract-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const closeDisplayBtn = document.getElementById('close-display-btn');
    
    // Cancel buttons still need custom handling
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
    
    // Close display button (now in header)
    if (closeDisplayBtn) {
      closeDisplayBtn.addEventListener('click', () => {
        this.closeForm();
      });
      console.log('contract.js - ✅ Close display button handler attached');
    }
  }
  
  openCreateMode() {
    console.log('🆕 openCreateMode() called');
    console.log('🔍 Form element at start:', this.form);
    console.log('🔍 Form querySelector test:', document.getElementById('contract-form'));
    
    this.currentMode = 'edit'; // New contracts default to edit mode
    this.currentContract = null;
    this.clearForm();      // Clear all form fields for new contract
    this.setEditMode();    // Set form to edit mode for new contract creation
    this.openForm();
    console.log('🆕 openCreateMode() completed');
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
      const createdDate = contract.created_at ? new Date(contract.created_at).toISOString().replace('T', ' ').replace('.000Z', ' UTC') : '';
      createdEl.textContent = createdDate;
    }
    
    if (updatedEl) {
      const updatedDate = contract.updated_at ? new Date(contract.updated_at).toISOString().replace('T', ' ').replace('.000Z', ' UTC') : '';
      updatedEl.textContent = updatedDate;
    }
  }
  
  setDisplayMode() {
    console.log('👁️ setDisplayMode() called');
    
    // Hide all input fields, show display values
    const inputFields = this.form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]');
    inputFields.forEach(input => {
      input.style.display = 'none';
    });
    
    const displayValues = this.form.querySelectorAll('.display-value');
    displayValues.forEach(display => {
      display.style.display = 'block';
    });
    
    // Use centralized button visibility control
    this.setButtonVisibility('display');
    
    // Hide danger zone in display mode
    const dangerZone = this.form.querySelector('.danger-zone');
    if (dangerZone) {
      dangerZone.style.display = 'none';
    }
  }
  
  setCreateMode() {
    console.log('🆕 setCreateMode() called');
    
    // Show input fields, hide display values  
    const inputFields = this.form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]');
    inputFields.forEach(input => {
      input.style.display = 'block';
    });
    
    const displayValues = this.form.querySelectorAll('.display-value');
    displayValues.forEach(display => {
      display.style.display = 'none';
    });
    
    // Use centralized button visibility control
    this.setButtonVisibility('create');
    
    // Hide danger zone in create mode
    const dangerZone = this.form.querySelector('.danger-zone');
    if (dangerZone) {
      dangerZone.style.display = 'none';
    }
  }
  
  setEditMode() {
    console.log('🔧 setEditMode() called - currentContract:', this.currentContract?.id || 'new');
    
    if (!this.form) {
      console.error('❌ Form element not found in setEditMode()');
      return;
    }
    
    // Show input fields, hide display values
    const inputFields = this.form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]');
    inputFields.forEach(input => {
      input.style.display = 'block';
    });
    
    const displayValues = this.form.querySelectorAll('.display-value');
    displayValues.forEach(display => {
      display.style.display = 'none';
    });
    
    // Force correct button visibility with explicit control
    this.setButtonVisibility('edit');
    
    // Debug: Show current button visibility after a brief delay
    setTimeout(() => {
      const createVis = this.form.querySelector('.create-actions')?.style.display;
      const displayVis = this.form.querySelector('.display-actions')?.style.display;  
      const editVis = this.form.querySelector('.edit-actions')?.style.display;
      console.log('🔍 Final button visibility - Create:', createVis, 'Display:', displayVis, 'Edit:', editVis);
    }, 100);
    
    // Update the save button handler based on whether this is a new or existing contract
    const updateBtn = document.getElementById('update-contract-btn');
    if (updateBtn) {
      // Remove existing event listeners
      const newUpdateBtn = updateBtn.cloneNode(true);
      updateBtn.parentNode.replaceChild(newUpdateBtn, updateBtn);
      
      if (this.currentContract && this.currentContract.id) {
        // Existing contract - use update function
        newUpdateBtn.addEventListener('click', () => this.updateContract());
      } else {
        // New contract - use save function  
        newUpdateBtn.addEventListener('click', () => this.saveContract());
      }
    }
    
    // Show danger zone only for existing contracts (not new ones)
    const dangerZone = this.form.querySelector('.danger-zone');
    if (dangerZone) {
      if (this.currentContract && this.currentContract.id) {
        dangerZone.style.display = 'block'; // Existing contract - show delete
      } else {
        dangerZone.style.display = 'none';  // New contract - hide delete
      }
    }
    
    // Set appropriate title based on whether this is new or existing contract
    const titleEl = document.getElementById('contract-form-title');
    if (titleEl) {
      if (this.currentContract && this.currentContract.id) {
        titleEl.textContent = `Edit Contract: ${this.currentContract.hospital_name}`;
      } else {
        titleEl.textContent = 'New Contract';
      }
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
    console.log('✏️ openEditMode() called for contract:', this.currentContract?.id);
    if (!this.currentContract) {
      console.error('❌ openEditMode() called but no currentContract');
      return;
    }
    
    this.currentMode = 'edit';
    this.updateDebugInfo();
    this.populateFormBasic(this.currentContract);
    this.setEditMode();
    console.log('✏️ openEditMode() completed');
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