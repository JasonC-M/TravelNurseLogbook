// Profile Management Module
// This module handles all user profile related functionality

class ProfileManager {
  constructor() {
    this.userProfile = null;
    this.userContracts = [];
    this.isProfileOpen = false;
    this.mapPreferencesLoaded = false;
    this.hasUnsavedMapChanges = false;
    this.originalMapPreferences = null;
    this.initializeEventHandlers();
  }

  // Initialize event handlers for profile form
  initializeEventHandlers() {
    // Setup close button after a delay to ensure components are loaded
    setTimeout(() => this.setupCloseButton(), 2000);
    
    // Setup navigation warning for unsaved changes
    this.setupNavigationWarning();
  }

  // Setup close button event handler
  setupCloseButton() {
    const closeBtn = document.getElementById('close-profile');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeProfile();
      });
      console.log('✅ Profile close button handler attached');
    } else {
      console.log('⚠️  Profile close button not found, will try again');
      // Try again after another delay
      setTimeout(() => this.setupCloseButton(), 1000);
    }

    // Setup nuclear delete button
    const nuclearBtn = document.getElementById('nuclear-delete-btn');
    if (nuclearBtn) {
      nuclearBtn.addEventListener('click', () => {
        this.nuclearDelete();
      });
      console.log('💣 Nuclear delete button handler attached');
    }
  }

  // Setup navigation warning for unsaved changes
  setupNavigationWarning() {
    window.addEventListener('beforeunload', (event) => {
      if (this.hasUnsavedMapChanges) {
        const message = 'You have unsaved map preference changes. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message; // Required for Chrome
        return message; // Required for other browsers
      }
    });
  }

  // Create initial profile for new users
  async createInitialProfile(user) {
    try {
      const metadata = user.user_metadata || {};
      const emailName = user.email.split('@')[0];
      
      const initialProfile = {
        email: user.email,
        first_name: metadata.first_name || '',
        last_name: metadata.last_name || '', 
        full_name: metadata.full_name || metadata.name || emailName,
        profile_complete: false,
        first_login: true
      };

      const result = await window.apiClient.createProfile(initialProfile);

      if (result.success) {
        return result.data.profile;
      }

      return null;
    } catch (error) {
      console.error('Error creating initial profile:', error);
      return null;
    }
  }

  // Check if profile needs completion
  isProfileComplete(profile) {
    if (!profile) {
      return false;
    }
    
    const firstName = profile.first_name && profile.first_name.trim();
    const lastName = profile.last_name && profile.last_name.trim();
    const fullName = profile.full_name && profile.full_name.trim();
    const notFirstLogin = profile.first_login === false;
    
    return firstName && lastName && fullName && notFirstLogin;
  }

  // Show profile completion prompt
  showProfileCompletionPrompt() {
    const slideout = document.getElementById('profile-slideout');
    slideout.classList.add('open');
    this.isProfileOpen = true;
    
    this.showProfileSuccess('Welcome! Please complete your profile to get started.');
  }

  // Load profile data at startup
  async loadProfileData() {
    console.log('📋 Loading profile data...');
    try {
      if (!window.auth || !window.auth.isAuthenticated()) {
        console.log('⏳ Auth not ready, retrying in 1s...');
        setTimeout(() => this.loadProfileData(), 1000);
        return;
      }

      if (!window.apiClient) {
        console.log('⏳ API client not ready, retrying in 1s...');
        setTimeout(() => this.loadProfileData(), 1000);
        return;
      }

      const user = window.auth.getCurrentUser();
      if (!user) {
        this.showProfileError('Please log in to view profile');
        return;
      }

      // Load profile data from API
      try {
        const result = await window.apiClient.getProfile();
        
        if (result.success && result.data.profile) {
          this.userProfile = result.data.profile;
        } else {
          // No profile exists, create initial profile
          this.userProfile = await this.createInitialProfile(user);
        }
      } catch (profileError) {
        console.error('Profile load error:', profileError);
        this.userProfile = null;
      }

      // Load contracts data
      try {
        const result = await window.apiClient.getContracts();
        
        if (result.success) {
          this.userContracts = result.data.contracts || [];
        } else {
          this.userContracts = [];
        }
      } catch (contractsError) {
        console.error('Contracts load error:', contractsError);
        this.userContracts = [];
      }
      
      // Update profile UI
      this.updateProfileUI(user);
      
      // Update profile button text in main app
      if (window.logbookApp && window.logbookApp.updateProfileButtonText) {
        window.logbookApp.updateProfileButtonText();
      }
      
      // Check if profile needs completion (only show prompt once per session)
      if (!this.isProfileComplete(this.userProfile) && !sessionStorage.getItem('profilePromptShown')) {
        sessionStorage.setItem('profilePromptShown', 'true');
        setTimeout(() => this.showProfileCompletionPrompt(), 1000);
      } else if (this.isProfileComplete(this.userProfile)) {
        sessionStorage.removeItem('profilePromptShown');
      }
    } catch (error) {
      this.showProfileError('Failed to load profile data: ' + error.message);
    }
  }

  // Update profile UI with loaded data
  updateProfileUI(user) {
    const loadingDiv = document.getElementById('profile-loading');
    const profileDataDiv = document.getElementById('profile-data');
    
    if (!loadingDiv || !profileDataDiv) {
      return;
    }
    
    // Hide loading, show data
    console.log('✅ Displaying profile data');
    loadingDiv.style.display = 'none';
    profileDataDiv.style.display = 'block';

    // Account information
    const userIdEl = document.getElementById('user-id');
    const emailEl = document.getElementById('email-display');
    const createdEl = document.getElementById('account-created');
    
    if (userIdEl) userIdEl.textContent = user.id;
    if (emailEl) emailEl.textContent = user.email;
    if (createdEl) createdEl.textContent = new Date(user.created_at).toLocaleDateString();

    // Personal information
    if (this.userProfile) {
      const firstNameEl = document.getElementById('first-name');
      const lastNameEl = document.getElementById('last-name');
      const fullNameEl = document.getElementById('full-name');
      
      if (firstNameEl) firstNameEl.value = this.userProfile.first_name || '';
      if (lastNameEl) lastNameEl.value = this.userProfile.last_name || '';
      if (fullNameEl) fullNameEl.value = this.userProfile.full_name || '';
    }

    // Map preferences (only load if not already loaded)
    if (!this.mapPreferencesLoaded) {
      this.loadMapPreferences();
      this.mapPreferencesLoaded = true;
    }

    // Statistics
    if (this.userContracts) {
      const activeContracts = this.userContracts.filter(c => c.status === 'active').length;
      const completedContracts = this.userContracts.filter(c => c.status === 'completed').length;
      
      const totalEl = document.getElementById('total-contracts');
      const activeEl = document.getElementById('active-contracts');
      const completedEl = document.getElementById('completed-contracts');
      
      if (totalEl) totalEl.textContent = this.userContracts.length;
      if (activeEl) activeEl.textContent = activeContracts;
      if (completedEl) completedEl.textContent = completedContracts;
    }
  }

  // Toggle Profile overlay menu
  toggleProfile() {
    const slideout = document.getElementById('profile-slideout');
    
    if (!slideout) {
      console.warn('⚠️ Profile slideout not found, components may not be loaded yet');
      return;
    }
    
    if (!this.isProfileOpen) {
      slideout.classList.add('open');
      this.isProfileOpen = true;
      console.log('✅ Profile opened');
    } else {
      slideout.classList.remove('open');
      this.isProfileOpen = false;
      console.log('✅ Profile closed');
    }
  }

  // Close profile menu
  closeProfile() {
    // Check for unsaved changes before closing
    if (this.hasUnsavedMapChanges) {
      const confirmClose = confirm('You have unsaved map preference changes. Are you sure you want to close without saving?');
      if (!confirmClose) {
        return; // Don't close if user cancels
      }
    }

    const slideout = document.getElementById('profile-slideout');
    if (!slideout) {
      console.warn('⚠️ Profile slideout not found during close');
      this.isProfileOpen = false;
      return;
    }
    slideout.classList.remove('open');
    this.isProfileOpen = false;
  }

  // Close all forms (profile and contract forms)
  closeAllForms() {
    this.closeProfile();
    if (window.contractFormController) {
      window.contractFormController.closeForm();
    }
  }

  // Nuclear delete - completely destroy user account and all data
  async nuclearDelete() {
    // Single warning with type confirmation
    const confirmation = prompt('⚠️ WARNING: This will permanently delete your ENTIRE account and ALL data!\n\nThis includes:\n• Your profile\n• All contract history\n• All uploaded files\n• Your user account\n\nThis CANNOT be undone!\n\nType "DELETE" (all caps) to confirm:');
    
    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.');
      }
      return;
    }

    try {
      const user = window.auth.getCurrentUser();
      if (!user) {
        alert('No user found to delete.');
        return;
      }

      // Show deletion progress
      const nuclearBtn = document.getElementById('nuclear-delete-btn');
      if (nuclearBtn) {
        nuclearBtn.textContent = '💥 DELETING...';
        nuclearBtn.disabled = true;
      }

      // Use backend API to completely delete everything including auth account
      console.log('🗑️ Calling backend complete deletion...');
      
      const result = await window.apiClient.deleteProfile();
      
      if (!result.success) {
        throw new Error(result.error || 'Profile deletion failed');
      }

      console.log('✅ Complete account deletion successful');

      // Clear local data and force logout
      sessionStorage.clear();
      localStorage.clear();
      
      // Force logout and redirect immediately
      await window.auth.signOut();
      window.location.href = 'index.html';

    } catch (error) {
      console.error('Nuclear delete error:', error);
      alert('Error during account deletion: ' + error.message + '\n\nPlease contact support if the problem persists.');
      
      // Re-enable button
      const nuclearBtn = document.getElementById('nuclear-delete-btn');
      if (nuclearBtn) {
        nuclearBtn.textContent = '🗑️ DELETE EVERYTHING';
        nuclearBtn.disabled = false;
      }
    }
  }

  // Edit profile field
  editField(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    
    if (field.disabled) {
      // Enable editing
      field.disabled = false;
      field.focus();
      button.textContent = 'Save';
      button.onclick = () => this.saveField(fieldId);
    }
  }

  // Save profile field
  async saveField(fieldId) {
    const field = document.getElementById(fieldId);
    const button = field.nextElementSibling;
    
    try {
      const user = window.auth.getCurrentUser();
      if (!user) {
        this.showProfileError('Please log in to save changes');
        return;
      }

      const dbFieldName = fieldId.replace('-', '_');
      const updateData = {};
      updateData[dbFieldName] = field.value;

      // Update cached profile data first
      if (!this.userProfile) {
        this.userProfile = { user_id: user.id };
      }
      this.userProfile[dbFieldName] = field.value;
      
      // Check if profile is now complete
      const profileComplete = this.isProfileComplete(this.userProfile);
      
      // Prepare complete profile update data
      const profileUpdateData = {
        first_name: this.userProfile.first_name || '',
        last_name: this.userProfile.last_name || '',
        full_name: this.userProfile.full_name || '',
        email: this.userProfile.email || user.email,
        [dbFieldName]: field.value.trim(),
        profile_complete: profileComplete,
        first_login: false
      };

      // Note: Map preferences are saved separately via their own save button
      
      // Try to update profile via API
      const result = await window.apiClient.updateProfile(profileUpdateData);

      if (!result.success) {
        this.showProfileError('Failed to save: ' + result.error);
        return;
      }

      // Update local cache with returned data
      if (result.data && result.data.profile) {
        this.userProfile = { ...this.userProfile, ...result.data.profile };
      }
      
      // Sync important fields with Supabase auth user metadata
      await this.syncWithAuthMetadata(fieldId, field.value);
      
      // Update profile button text if name was changed
      if (fieldId.includes('name') && window.logbookApp && window.logbookApp.updateProfileButtonText) {
        const profileBtn = document.getElementById('profile-btn');
        window.logbookApp.updateProfileButtonText(profileBtn);
      }
      
      // Show completion message if profile just became complete
      if (profileComplete && this.userProfile.first_login !== false) {
        setTimeout(() => {
          this.showProfileSuccess('🎉 Profile completed! Welcome to your Travel Nurse Logbook!');
        }, 500);
      }
      
      // Reset field to readonly
      field.disabled = true;
      button.textContent = 'Edit';
      button.onclick = () => this.editField(fieldId);
      
      this.showProfileSuccess('Profile updated successfully');
    } catch (error) {
      this.showProfileError('Failed to save changes: ' + error.message);
      
      // Reset field
      field.disabled = true;
      button.textContent = 'Edit';
      button.onclick = () => this.editField(fieldId);
    }
  }

  // Sync profile changes with Supabase auth user metadata
  async syncWithAuthMetadata(fieldId, value) {
    try {
      const user = window.auth.getCurrentUser();
      if (!user || !window.apiClient) return;

      // Determine what metadata to update based on the field
      let metadataUpdate = {};
      
      switch (fieldId) {
        case 'first-name':
          metadataUpdate.first_name = value;
          break;
        case 'last-name':
          metadataUpdate.last_name = value;
          break;
        case 'full-name':
          metadataUpdate.full_name = value;
          break;
        case 'email':
          // Email changes require special handling through Supabase auth
          // This will trigger an email confirmation
          const { error: emailError } = await window.supabaseClient.auth.updateUser({
            email: value
          });
          if (emailError) {
            console.error('Email update error:', emailError);
            this.showProfileError('Email update failed: ' + emailError.message);
          } else {
            this.showProfileSuccess('Email update initiated. Please check your new email for confirmation.');
          }
          return; // Don't update metadata for email changes
      }

      // Note: Metadata sync is now handled by the backend API
      // No direct Supabase auth metadata updates needed from frontend
      if (Object.keys(metadataUpdate).length > 0) {
        console.log(`✅ Profile field ${fieldId} will be synced by backend`);
      }
    } catch (error) {
      console.error('Auth metadata sync failed:', error);
    }
  }

  // Manual profile completion
  async markProfileComplete() {
    try {
      const user = window.auth.getCurrentUser();
      if (!user) {
        this.showProfileError('Please log in to update profile');
        return;
      }

      // Get current field values from the UI
      const firstNameField = document.getElementById('first-name');
      const lastNameField = document.getElementById('last-name');
      const fullNameField = document.getElementById('full-name');

      const firstName = firstNameField?.value?.trim() || '';
      const lastName = lastNameField?.value?.trim() || '';
      const fullName = fullNameField?.value?.trim() || '';

      // Validate that required fields are filled
      if (!firstName || !lastName || !fullName) {
        this.showProfileError('Please fill in all required fields (First Name, Last Name, Full Name) before marking complete.');
        return;
      }

      // Force update profile with completion status
      const profileUpdateData = {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: user.email,
        profile_complete: true,
        first_login: false
      };

      const result = await window.apiClient.updateProfile(profileUpdateData);

      if (!result.success) {
        this.showProfileError('Failed to update profile: ' + result.error);
        return;
      }

      // Update local cache
      if (result.data && result.data.profile) {
        this.userProfile = { ...this.userProfile, ...result.data.profile };
      }

      this.showProfileSuccess('✅ Profile marked as complete! The system will no longer prompt you to complete it.');
      
      // Close the profile after a delay
      setTimeout(() => {
        this.closeProfile();
      }, 2000);

    } catch (error) {
      this.showProfileError('An unexpected error occurred: ' + error.message);
    }
  }

  // Show profile error message
  showProfileError(message) {
    const errorDiv = document.getElementById('profile-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }

  // Show profile success message
  showProfileSuccess(message) {
    const successDiv = document.getElementById('profile-success');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
      successDiv.style.display = 'none';
    }, 3000);
  }

  // Get profile data for other modules
  getUserProfile() {
    return this.userProfile;
  }

  // Get contracts data for other modules
  getUserContracts() {
    return this.userContracts;
  }

  // Update contracts data (called by other modules)
  updateUserContracts(contracts) {
    this.userContracts = contracts;
    // Update UI statistics
    if (window.auth && window.auth.isAuthenticated()) {
      const user = window.auth.getCurrentUser();
      if (user) {
        this.updateProfileUI(user);
      }
    }
  }

  //==========================================================================
  // MAP PREFERENCES MANAGEMENT
  //==========================================================================

  // Load map preferences and set checkboxes
  loadMapPreferences() {
    console.log('🗺️ Loading map preferences...', this.userProfile?.map_preferences);
    
    // Default preferences (CONUS, AK, HI, PR, VI enabled by default)
    const defaultPrefs = {
      conus: true,
      alaska: true,
      hawaii: true,
      'puerto-rico': true,
      'us-virgin-islands': true,
      guam: false,
      'american-samoa': false,
      'northern-mariana': false,
      canada: false,
      mexico: false,
      caribbean: false,
      europe: false,
      'asia-pacific': false,
      'other-international': false
    };

    // Get preferences from user profile or use defaults
    let mapPrefs;
    if (this.userProfile && this.userProfile.map_preferences && typeof this.userProfile.map_preferences === 'object') {
      mapPrefs = this.userProfile.map_preferences;
      console.log('✅ Using saved preferences:', mapPrefs);
    } else {
      mapPrefs = defaultPrefs;
      console.log('⚠️ Using default preferences (no saved prefs found)');
    }

    // Store original preferences for change tracking
    this.originalMapPreferences = { ...mapPrefs };
    
    // Set checkbox states
    Object.keys(defaultPrefs).forEach(region => {
      const checkbox = document.getElementById(`pref-${region}`);
      if (checkbox) {
        // Use saved preference if available, otherwise use default
        checkbox.checked = mapPrefs.hasOwnProperty(region) ? mapPrefs[region] : defaultPrefs[region];
        console.log(`🔘 ${region}: ${checkbox.checked}`);
      }
    });

    // Reset unsaved changes flag
    this.hasUnsavedMapChanges = false;
    this.updateMapPreferencesStatus();

    // Setup event handlers for the buttons (one-time setup)
    this.setupMapPreferenceHandlers();
  }

  // Setup event handlers for map preference controls
  setupMapPreferenceHandlers() {
    // Avoid duplicate handlers
    if (this.mapHandlersSetup) return;
    this.mapHandlersSetup = true;

    const regions = [
      'conus', 'alaska', 'hawaii', 'puerto-rico', 'us-virgin-islands',
      'guam', 'american-samoa', 'northern-mariana', 'canada', 'mexico',
      'caribbean', 'europe', 'asia-pacific', 'other-international'
    ];

    // Add change event listeners to detect unsaved changes
    regions.forEach(region => {
      const checkbox = document.getElementById(`pref-${region}`);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          this.detectMapPreferenceChanges();
        });
      }
    });

    // Setup save and reset buttons
    const saveBtn = document.getElementById('save-map-preferences');
    const resetBtn = document.getElementById('reset-map-preferences');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveMapPreferences());
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetMapPreferences());
    }
  }

  // Save map preferences to user profile
  async saveMapPreferences() {
    const regions = [
      'conus', 'alaska', 'hawaii', 'puerto-rico', 'us-virgin-islands',
      'guam', 'american-samoa', 'northern-mariana', 'canada', 'mexico',
      'caribbean', 'europe', 'asia-pacific', 'other-international'
    ];

    const preferences = {};
    regions.forEach(region => {
      const checkbox = document.getElementById(`pref-${region}`);
      if (checkbox) {
        preferences[region] = checkbox.checked;
      }
    });

    try {
      console.log('💾 Saving map preferences:', preferences);

      // Save to backend first
      const result = await window.apiClient.updateProfile({
        map_preferences: preferences
      });

      if (result.success) {
        // Update local profile data only after successful backend save
        if (!this.userProfile) this.userProfile = {};
        this.userProfile.map_preferences = preferences;
        
        // Update original preferences to new saved state
        this.originalMapPreferences = { ...preferences };
        this.hasUnsavedMapChanges = false;
        
        console.log('✅ Map preferences saved successfully to backend and local cache');
        this.showProfileSuccess('Map preferences saved successfully!');
        this.updateMapPreferencesStatus();
        
        // Notify map to update its filtering
        if (window.MapController && window.MapController.updateUserPreferences) {
          window.MapController.updateUserPreferences(preferences);
        }
      } else {
        throw new Error(result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('❌ Error saving map preferences:', error);
      this.showProfileError('Failed to save map preferences: ' + error.message);
    }
  }



  // Detect if map preferences have changed from original
  detectMapPreferenceChanges() {
    const regions = [
      'conus', 'alaska', 'hawaii', 'puerto-rico', 'us-virgin-islands',
      'guam', 'american-samoa', 'northern-mariana', 'canada', 'mexico',
      'caribbean', 'europe', 'asia-pacific', 'other-international'
    ];

    let hasChanges = false;
    regions.forEach(region => {
      const checkbox = document.getElementById(`pref-${region}`);
      if (checkbox) {
        const currentValue = checkbox.checked;
        const originalValue = this.originalMapPreferences ? this.originalMapPreferences[region] : false;
        if (currentValue !== originalValue) {
          hasChanges = true;
        }
      }
    });

    this.hasUnsavedMapChanges = hasChanges;
    this.updateMapPreferencesStatus();
  }

  // Update the status display for map preferences
  updateMapPreferencesStatus() {
    const statusEl = document.getElementById('map-preferences-status');
    const saveBtn = document.getElementById('save-map-preferences');
    
    if (statusEl) {
      if (this.hasUnsavedMapChanges) {
        statusEl.innerHTML = '<span style="color: #dc3545;">⚠️ Unsaved changes</span>';
        if (saveBtn) saveBtn.style.background = '#dc3545'; // Red to indicate action needed
      } else {
        statusEl.innerHTML = '<span style="color: #28a745;">✅ All changes saved</span>';
        if (saveBtn) saveBtn.style.background = '#007bff'; // Blue normal state
      }
    }
  }

  // Reset map preferences to default or last saved state
  resetMapPreferences() {
    if (this.hasUnsavedMapChanges) {
      const confirmReset = confirm('This will discard your unsaved changes. Are you sure?');
      if (!confirmReset) return;
    }

    // Reset to original loaded preferences
    if (this.originalMapPreferences) {
      Object.keys(this.originalMapPreferences).forEach(region => {
        const checkbox = document.getElementById(`pref-${region}`);
        if (checkbox) {
          checkbox.checked = this.originalMapPreferences[region];
        }
      });
    }

    this.hasUnsavedMapChanges = false;
    this.updateMapPreferencesStatus();
  }

  // Get current map preferences for other modules
  getMapPreferences() {
    if (!this.userProfile || !this.userProfile.map_preferences) {
      // Return default preferences
      return {
        conus: true,
        alaska: true,
        hawaii: true,
        'puerto-rico': true,
        'us-virgin-islands': true,
        guam: false,
        'american-samoa': false,
        'northern-mariana': false,
        canada: false,
        mexico: false,
        caribbean: false,
        europe: false,
        'asia-pacific': false,
        'other-international': false
      };
    }
    return this.userProfile.map_preferences;
  }
}

// Create a global instance
window.profileManager = new ProfileManager();