// Profile Management Module
// This module handles all user profile related functionality

class ProfileManager {
  constructor() {
    this.userProfile = null;
    this.editedFields = {};
    this.hasUnsavedMapChanges = false;
    this.originalMapPreferences = null;
    this.isInitialized = false;
    this.contractStats = { total: 0, active: 0, completed: 0 };
    this.currentMode = 'display'; // 'display' or 'edit'
    
    // Cached preferences - loaded once at startup
    this.cachedPreferences = {
      mapRegions: [],
      loaded: false
    };
    
    // Initialize event handlers
    this.initializeEventHandlers();
  }

  // Initialize event handlers for profile form
  initializeEventHandlers() {
    // Setup navigation warning for unsaved changes
    this.setupNavigationWarning();
  }

  // Setup additional profile-specific event handlers
  setupProfileSpecificHandlers() {
    // Setup profile delete button (not handled by universal system)
    const profileDeleteBtn = document.getElementById('profile-delete-btn');
    if (profileDeleteBtn) {
      profileDeleteBtn.addEventListener('click', () => {
        this.deleteProfile();
      });
      console.log('profile.js - �️ Profile delete button handler attached');
    }
  }

    // Setup navigation warning for unsaved changes (disabled)
  setupNavigationWarning() {
    // Navigation warnings removed for simpler UX
  }

  // Setup danger zone handlers
  setupDangerZoneHandlers() {
    const deleteBtn = document.getElementById('profile-delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.deleteProfile();
      });
      console.log('profile.js - 🗑️ Profile delete button handler attached');
    }
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
      console.error('profile.js - Error creating initial profile:', error);
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

  // Show profile completion prompt - auto-open in edit mode for new users
  showProfileCompletionPrompt() {
    const slideout = document.getElementById('profile-slideout');
    slideout.classList.add('open');
    this.isProfileOpen = true;
    
    // Check if this is the user's first profile visit ever
    const hasVisitedProfile = localStorage.getItem('hasVisitedProfile');
    
    if (!hasVisitedProfile) {
      // First time visiting profile - open in edit mode automatically
      console.log('profile.js - 🆕 First-time user - opening profile in edit mode');
      localStorage.setItem('hasVisitedProfile', 'true');
      
      // Small delay to ensure DOM is ready, then switch to edit mode
      setTimeout(() => {
        this.switchToEditMode();
        console.log('profile.js - ✏️ Profile auto-opened in edit mode for first-time user');
      }, 200);
    } else {
      // Returning user - show in display mode (default)
      console.log('profile.js - 👋 Returning user - profile opened in display mode');
    }
    
    this.showProfileSuccess('Welcome! Please complete your profile to get started.');
  }

  // Load only user preferences (lightweight startup method)
  async loadPreferencesOnly() {
    console.log('profile.js - 🎯 Loading user preferences only...');
    try {
      if (!window.auth || !window.auth.isAuthenticated()) {
        console.log('profile.js - ⏳ Auth not ready for preferences load');
        return false;
      }

      if (!window.apiClient) {
        console.log('profile.js - ⏳ API client not ready for preferences load');
        return false;
      }

      const user = window.auth.getCurrentUser();
      if (!user) {
        console.log('profile.js - ❌ No user for preferences load');
        return false;
      }

      // Load minimal profile data (just preferences)
      try {
        const result = await window.apiClient.getProfile();
        
        if (result.success && result.data.profile) {
          this.userProfile = result.data.profile;
          // Load preferences into cache
          this.loadMapRegionsToCache();
          console.log('profile.js - ✅ Preferences loaded and cached');
          return true;
        } else {
          // No profile exists, use defaults
          console.log('profile.js - 📋 No saved profile, using default preferences');
          this.cachedPreferences.mapRegions = ['conus']; // Default to CONUS only for first-time users
          this.cachedPreferences.loaded = true;
          return true;
        }
      } catch (error) {
        console.error('profile.js - Preferences load error:', error);
        // Use defaults on error
        this.cachedPreferences.mapRegions = ['conus'];
        this.cachedPreferences.loaded = true;
        return true;
      }
    } catch (error) {
      console.error('profile.js - Preferences load failed:', error);
      return false;
    }
  }

  // Load profile data at startup
  async loadProfileData() {
    console.log('profile.js - 📋 Loading profile data...');
    try {
      if (!window.auth || !window.auth.isAuthenticated()) {
        console.log('profile.js - ⏳ Auth not ready, retrying in 1s...');
        setTimeout(() => this.loadProfileData(), 1000);
        return;
      }

      if (!window.apiClient) {
        console.log('profile.js - ⏳ API client not ready, retrying in 1s...');
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
        console.error('profile.js - Profile load error:', profileError);
        this.userProfile = null;
      }

      // Load contracts data (only if not already loaded by logbook.js)
      if (!window.logbookApp || !window.logbookApp.contracts || window.logbookApp.contracts.length === 0) {
        try {
          console.log('profile.js - 📋 Loading contracts (logbook.js hasn\'t loaded them yet)');
          const result = await window.apiClient.getContracts();
          
          if (result.success) {
            this.userContracts = result.data.contracts || [];
          } else {
            this.userContracts = [];
          }
        } catch (contractsError) {
          console.error('profile.js - Contracts load error:', contractsError);
          this.userContracts = [];
        }
      } else {
        console.log('profile.js - 📋 Using contracts already loaded by logbook.js');
        this.userContracts = window.logbookApp.contracts;
      }
      
      // Update profile UI
      this.updateProfileUI(user);
      
      // Update profile button text in main app
      if (window.logbookApp && window.logbookApp.updateProfileButtonText) {
        window.logbookApp.updateProfileButtonText();
      }
      
      // Check if this is the very first visit ever - only auto-open once
      const hasVisitedProfile = localStorage.getItem('hasVisitedProfile');
      
      if (!hasVisitedProfile) {
        // First-ever visit - auto-open profile in edit mode
        console.log('profile.js - 🆕 First-ever visit detected - auto-opening profile in edit mode');
        setTimeout(() => this.showProfileCompletionPrompt(), 1000);
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
    console.log('profile.js - ✅ Displaying profile data');
    loadingDiv.style.display = 'none';
    profileDataDiv.style.display = 'block';

    // Account information
    const userIdEl = document.getElementById('user-id');
    const emailEl = document.getElementById('email-display');
    const createdEl = document.getElementById('account-created');
    
    if (userIdEl) userIdEl.textContent = user.id;
    if (emailEl) emailEl.textContent = user.email;
    if (createdEl) createdEl.textContent = new Date(user.created_at).toLocaleDateString();

    // Personal information - populate both input fields and display values
    if (this.userProfile) {
      // Input fields
      const firstNameEl = document.getElementById('first-name');
      const lastNameEl = document.getElementById('last-name');
      const fullNameEl = document.getElementById('full-name');
      
      // Display values
      const firstNameDisplay = document.getElementById('first-name-display');
      const lastNameDisplay = document.getElementById('last-name-display');
      const fullNameDisplay = document.getElementById('full-name-display');
      
      const firstName = this.userProfile.first_name || '';
      const lastName = this.userProfile.last_name || '';
      const fullName = this.userProfile.full_name || '';
      
      // Populate inputs
      if (firstNameEl) firstNameEl.value = firstName;
      if (lastNameEl) lastNameEl.value = lastName;
      if (fullNameEl) fullNameEl.value = fullName;
      
      // Populate display values
      if (firstNameDisplay) firstNameDisplay.textContent = firstName || '(Not set)';
      if (lastNameDisplay) lastNameDisplay.textContent = lastName || '(Not set)';
      if (fullNameDisplay) fullNameDisplay.textContent = fullName || '(Not set)';
    }

    // Map preferences (load to UI if not already loaded)
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
      console.warn('profile.js - ⚠️ Profile slideout not found, components may not be loaded yet');
      return;
    }
    
    if (!this.isProfileOpen) {
      slideout.classList.add('open');
      this.isProfileOpen = true;
      console.log('profile.js - ✅ Profile opened');
      
      // Check if this is the user's first profile visit ever
      const hasVisitedProfile = localStorage.getItem('hasVisitedProfile');
      
      if (!hasVisitedProfile) {
        // First time visiting profile - open in edit mode automatically
        console.log('profile.js - 🆕 First-time user manually opened profile - switching to edit mode');
        localStorage.setItem('hasVisitedProfile', 'true');
        
        // Small delay to ensure DOM is ready, then switch to edit mode
        setTimeout(() => {
          this.switchToEditMode();
          console.log('profile.js - ✏️ Manual profile opening - auto-switched to edit mode for first-time user');
        }, 200);
      }
    } else {
      slideout.classList.remove('open');
      this.isProfileOpen = false;
      console.log('profile.js - ✅ Profile closed');
    }
  }

  // Close profile menu
  closeProfile() {
    // Close without confirmation (simplified UX)

    const slideout = document.getElementById('profile-slideout');
    if (!slideout) {
      console.warn('profile.js - ⚠️ Profile slideout not found during close');
      this.isProfileOpen = false;
      return;
    }
    slideout.classList.remove('open');
    this.isProfileOpen = false;
    
    // Trigger Smart View update in case preferences changed
    console.log('profile.js - 🚪 Profile form closed, updating Smart View');
    this.updateCachedMapRegions();
  }

  // Close all forms (profile and contract forms)
  closeAllForms() {
    this.closeProfile();
    if (window.contractFormController) {
      window.contractFormController.closeForm();
    }
  }

    // Complete profile and account deletion
  async deleteProfile() {
    // Single warning with type confirmation
    const confirmation = prompt('⚠️ WARNING: This will permanently delete your ENTIRE account and ALL data!\n\nThis includes:\n• Your profile\n• All contract history\n• All uploaded files\n• Your user account\n\nThis CANNOT be undone!\n\nType "DELETE" (all caps) to confirm:');
    
    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        console.log('profile.js - ❌ Account deletion cancelled. User must type "DELETE" exactly to confirm.');
      }
      return;
    }

    try {
      const user = window.auth.getCurrentUser();
      if (!user) {
        console.error('profile.js - ❌ No user found to delete.');
        return;
      }

      // Show deletion progress
      const deleteBtn = document.getElementById('profile-delete-btn');
      if (deleteBtn) {
        deleteBtn.textContent = '�️ DELETING...';
        deleteBtn.disabled = true;
      }

      // Use backend API to completely delete everything including auth account
      console.log('profile.js - 🗑️ Calling backend complete deletion...');
      
      const result = await window.apiClient.deleteProfile();
      
      if (!result.success) {
        throw new Error(result.error || 'Profile deletion failed');
      }

      console.log('profile.js - ✅ Complete account deletion successful');

      // Clear local data and force logout
      sessionStorage.clear();
      localStorage.clear();
      
      // Force logout and redirect immediately
      await window.auth.signOut();
      window.location.href = 'index.html';

    } catch (error) {
      console.error('profile.js - Profile delete error:', error);
      console.error('profile.js - ❌ Error during account deletion:', error.message, '- Please contact support if the problem persists.');
      
      // Re-enable button
      const deleteBtn = document.getElementById('profile-delete-btn');
      if (deleteBtn) {
        deleteBtn.textContent = '🗑️ DELETE EVERYTHING';
        deleteBtn.disabled = false;
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
            console.error('profile.js - Email update error:', emailError);
            this.showProfileError('Email update failed: ' + emailError.message);
          } else {
            this.showProfileSuccess('Email update initiated. Please check your new email for confirmation.');
          }
          return; // Don't update metadata for email changes
      }

      // Note: Metadata sync is now handled by the backend API
      // No direct Supabase auth metadata updates needed from frontend
      if (Object.keys(metadataUpdate).length > 0) {
        console.log(`profile.js - ✅ Profile field ${fieldId} will be synced by backend`);
      }
    } catch (error) {
      console.error('profile.js - Auth metadata sync failed:', error);
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

  // Log profile error to console
  showProfileError(message) {
    console.error('Profile error:', message);
  }

  // Log profile success to console
  showProfileSuccess(message) {
    console.log('Profile success:', message);
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
    console.log('profile.js - 🗺️ Loading map preferences...', this.userProfile?.map_preferences);
    
    // Default preferences (CONUS only for initial map centering)
    const defaultPrefs = {
      conus: true,
      alaska: false,
      hawaii: false,
      'puerto-rico': false,
      'us-virgin-islands': false,
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
      console.log('profile.js - ✅ Using saved preferences:', mapPrefs);
    } else {
      mapPrefs = defaultPrefs;
      console.log('profile.js - ⚠️ Using default preferences (no saved prefs found)');
    }

    // Store original preferences for change tracking
    this.originalMapPreferences = { ...mapPrefs };
    
    // Set checkbox states
    const enabledRegions = [];
    const disabledRegions = [];
    
    Object.keys(defaultPrefs).forEach(region => {
      const checkbox = document.getElementById(`pref-${region}`);
      if (checkbox) {
        // Use saved preference if available, otherwise use default
        checkbox.checked = mapPrefs.hasOwnProperty(region) ? mapPrefs[region] : defaultPrefs[region];
        if (checkbox.checked) {
          enabledRegions.push(region);
        } else {
          disabledRegions.push(region);
        }
      }
    });
    
    // Consolidated logging
    console.log(`profile.js - 🔘 Map regions enabled: [${enabledRegions.join(', ')}]`);
    if (disabledRegions.length > 0) {
      console.log(`profile.js - 🔘 Map regions disabled: [${disabledRegions.join(', ')}]`);
    }

    // Reset unsaved changes flag
    this.hasUnsavedMapChanges = false;
    this.updateMapPreferencesStatus();

    // Setup event handlers for the buttons (one-time setup)
    this.setupMapPreferenceHandlers();
  }

  // Get currently enabled map regions (for Smart View filtering)
  getMapRegions() {
    // If preferences are already cached, return them immediately
    if (this.cachedPreferences.loaded) {
      return this.cachedPreferences.mapRegions;
    }
    
    // Load preferences for the first time
    this.loadMapRegionsToCache();
    return this.cachedPreferences.mapRegions;
  }
  
  // Load map regions to cache (called once at startup)
  loadMapRegionsToCache() {
    const enabledRegions = [];
    
    console.log('profile.js - 🎯 Loading preferences to cache...');
    
    // Always use saved profile data for consistency (checkboxes might not be loaded yet)
    if (this.userProfile && this.userProfile.map_preferences) {
      console.log('profile.js - � Using saved profile data for cache:', this.userProfile.map_preferences);
      Object.keys(this.userProfile.map_preferences).forEach(region => {
        if (this.userProfile.map_preferences[region] === true) {
          enabledRegions.push(region);
        }
      });
    } else {
      // Default preferences if no saved profile
      console.log('profile.js - 📋 No saved preferences, using defaults for cache');
      enabledRegions.push('conus'); // Default to CONUS only for first-time users
    }
    
    // Cache the results
    this.cachedPreferences.mapRegions = enabledRegions;
    this.cachedPreferences.loaded = true;
    
    console.log('profile.js - 🎯 Cached map regions:', enabledRegions);
  }
  
  // Log current preference state for debugging
  logPreferenceState(context) {
    console.log(`🔍 === PREFERENCE STATE DEBUG (${context}) ===`);
    
    // Cached preferences
    console.log('📋 Cached preferences loaded:', this.cachedPreferences.loaded);
    console.log('📋 Cached map regions:', this.cachedPreferences.mapRegions);
    
    // Saved profile preferences
    if (this.userProfile && this.userProfile.map_preferences) {
      const savedEnabled = Object.keys(this.userProfile.map_preferences)
        .filter(key => this.userProfile.map_preferences[key] === true);
      console.log('💾 Saved profile regions:', savedEnabled);
    } else {
      console.log('💾 No saved profile preferences found');
    }
    
    // Current checkbox states
    const currentEnabled = [];
    const allRegions = ['conus', 'alaska', 'hawaii', 'puerto-rico', 'us-virgin-islands', 'guam', 'american-samoa', 'northern-mariana'];
    allRegions.forEach(region => {
      const checkbox = document.getElementById(`pref-${region}`);
      if (checkbox && checkbox.checked) {
        currentEnabled.push(region);
      }
    });
    console.log('☑️ Current checkbox regions:', currentEnabled);
    
    // What getMapRegions() returns
    const mapRegionsResult = this.getMapRegions();
    console.log('🎯 getMapRegions() returns:', mapRegionsResult);
    
    console.log('🔍 === END PREFERENCE STATE DEBUG ===');
  }

  // Update cached preferences when user changes settings
  updateCachedMapRegions() {
    this.logPreferenceState('BEFORE updateCachedMapRegions');
    
    console.log('profile.js - 🔄 Updating cached map preferences...');
    this.cachedPreferences.loaded = false; // Force reload
    this.loadMapRegionsToCache();
    
    this.logPreferenceState('AFTER updateCachedMapRegions');
    
    // Notify map to update with new preferences
    if (window.MapController && window.MapController.updateSmartView) {
      console.log('profile.js - 🗺️ Triggering map Smart View update');
      window.MapController.updateSmartView();
    }
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

    // Add change event listeners to detect unsaved changes (no auto-save)
    regions.forEach(region => {
      const checkbox = document.getElementById(`pref-${region}`);
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          // Mark that preferences have changed but don't auto-save
          this.hasUnsavedMapChanges = true;
          console.log('profile.js - 📍 Map preference changed, will save when form is saved');
          
          // Update cached preferences immediately for live preview
          this.updateCachedMapRegions();
        });
      }
    });

    // Setup unified profile save button
    this.setupProfileSaveButton();
  }





  // Detect if map preferences have changed from original (simplified - no unsaved state UI)
  detectMapPreferenceChanges() {
    // No longer needed since preferences auto-save, but keeping method for compatibility
    this.hasUnsavedMapChanges = false;
    this.updateMapPreferencesStatus();
  }

  // Update the status display for profile changes
  updateMapPreferencesStatus() {
    const statusEl = document.getElementById('map-preferences-status');
    const profileSaveBtn = document.getElementById('save-profile-btn');
    const profileStatusEl = document.getElementById('profile-save-status');
    
    // Remove all status messages
    if (statusEl) {
      statusEl.innerHTML = '';
    }

    // Keep button styling simple like contract form - using location-based class
    if (profileSaveBtn) {
      profileSaveBtn.className = 'slideout-header-grey-compact';
      profileSaveBtn.style.minWidth = '200px';
      profileSaveBtn.style.fontSize = '16px';
      profileSaveBtn.style.padding = '12px 30px';
      profileSaveBtn.textContent = 'Save Profile';
    }
    
    // Remove status messages
    if (profileStatusEl) {
      profileStatusEl.innerHTML = '';
    }
  }

  // Reset map preferences to default or last saved state
  resetMapPreferences() {
    // Reset without confirmation (simplified UX)

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

  // Save only map preferences (called automatically when checkboxes change)
  async saveMapPreferencesOnly() {
    try {
      console.log('profile.js - 📍 Auto-saving map preferences...');

      const user = window.auth.getCurrentUser();
      if (!user) {
        console.log('profile.js - ❌ User not logged in, skipping map preferences save');
        return;
      }

      // Gather current map preferences
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

      // Save just the map preferences
      const profileData = {
        map_preferences: preferences
      };

      console.log('profile.js - 📍 Saving map preferences:', preferences);
      const result = await window.apiClient.updateProfile(profileData);

      if (result.success) {
        console.log('profile.js - ✅ Map preferences saved successfully');
        // Update the stored original preferences
        this.originalMapPreferences = { ...preferences };
        this.hasUnsavedMapChanges = false;
        
        // Update userProfile with new preferences
        if (!this.userProfile) {
          this.userProfile = {};
        }
        this.userProfile.map_preferences = preferences;
        
        // Update cached preferences and trigger Smart View
        console.log('profile.js - � Map preferences saved, updating cached preferences and Smart View');
        this.updateCachedMapRegions();
      } else {
        console.error('profile.js - ❌ Failed to save map preferences:', result.error);
      }
    } catch (error) {
      console.error('profile.js - ❌ Error saving map preferences:', error);
    }
  }

  // Save complete profile including map preferences
  async saveCompleteProfile() {
    try {
      console.log('profile.js - 💾 Saving complete profile...');

      const user = window.auth.getCurrentUser();
      if (!user) {
        this.showProfileError('Please log in to save changes');
        return;
      }

      // Gather current map preferences from form
      const regions = [
        'conus', 'alaska', 'hawaii', 'puerto-rico', 'us-virgin-islands',
        'guam', 'american-samoa', 'northern-mariana', 'canada', 'mexico',
        'caribbean', 'europe', 'asia-pacific', 'other-international'
      ];

      const mapPreferences = {};
      regions.forEach(region => {
        const checkbox = document.getElementById(`pref-${region}`);
        if (checkbox) {
          mapPreferences[region] = checkbox.checked;
        }
      });

      // Gather profile form fields
      const firstName = document.getElementById('first-name')?.value?.trim() || this.userProfile?.first_name || '';
      const lastName = document.getElementById('last-name')?.value?.trim() || this.userProfile?.last_name || '';
      const fullName = document.getElementById('full-name')?.value?.trim() || this.userProfile?.full_name || '';

      // Prepare profile data with all fields that exist in the database schema
      const profileData = {
        map_preferences: mapPreferences
      };

      // Add personal info fields if they have values (matching database schema)
      if (firstName) profileData.first_name = firstName;
      if (lastName) profileData.last_name = lastName;
      if (fullName) profileData.full_name = fullName;
      
      // Ensure full_name is included for profile completion calculation
      if (!fullName && (firstName || lastName)) {
        profileData.full_name = `${firstName} ${lastName}`.trim();
      }
      
      // Add email (always include if available)
      if (this.userProfile?.email || user.email) {
        profileData.email = this.userProfile?.email || user.email;
      }
      
      // Calculate profile completion based on updated data
      const updatedProfile = { ...this.userProfile, ...profileData };
      const isComplete = this.isProfileComplete(updatedProfile);
      profileData.profile_complete = Boolean(isComplete); // Ensure it's always a boolean
      profileData.first_login = false;

      console.log('profile.js - 🔍 Sending profile data with all schema-matching fields');

      console.log('profile.js - 📍 Saving profile with map preferences:', mapPreferences);
      console.log('profile.js - 📋 Complete profile data being saved:', profileData);

      // Save to backend
      const result = await window.apiClient.updateProfile(profileData);

      if (result.success) {
        // Update local cache
        if (!this.userProfile) this.userProfile = {};
        Object.assign(this.userProfile, profileData);
        
        // Update map preferences state if they were saved
        if (profileData.map_preferences) {
          this.originalMapPreferences = { ...profileData.map_preferences };
          this.hasUnsavedMapChanges = false;
        }

        console.log('profile.js - ✅ Profile saved successfully');
        this.showProfileSuccess('Profile saved successfully!');
        this.updateMapPreferencesStatus();

        // Update profile button text if name changed
        if (window.logbookApp && window.logbookApp.updateProfileButtonText) {
          const profileBtn = document.getElementById('profile-btn');
          window.logbookApp.updateProfileButtonText(profileBtn);
        }

        // Update cached preferences and trigger Smart View if preferences changed
        if (profileData.map_preferences) {
          console.log('profile.js - � Updating cached preferences after successful save');
          this.logPreferenceState('BEFORE CACHE UPDATE AFTER SAVE');
          this.updateCachedMapRegions();
        }

        // Switch back to display mode after successful save
        setTimeout(() => {
          this.switchToDisplayMode();
        }, 1000); // Brief delay to show success message
        
        // Auto-close the profile form after successful save
        setTimeout(() => {
          console.log('profile.js - 🚪 Auto-closing profile form after successful save');
          this.logPreferenceState('AUTO-CLOSE AFTER SAVE');
          this.closeProfile();
        }, 2000); // Close after showing success message

      } else {
        console.error('profile.js - ❌ Profile save failed:', result);
        throw new Error(result.error || result.message || 'Failed to save profile');
      }

    } catch (error) {
      console.error('profile.js - ❌ Error saving profile:', error);
      console.error('profile.js - ❌ Full error details:', error);
      this.showProfileError('Failed to save profile: ' + error.message);
    }
  }

  // Setup unified profile save button and mode switching
  setupProfileSaveButton() {
    // Avoid duplicate handlers
    if (this.profileSaveHandlerSetup) return;
    this.profileSaveHandlerSetup = true;

    // Display mode buttons
    const editBtn = document.getElementById('edit-profile-btn');
    const closeDisplayBtn = document.getElementById('close-profile-display-btn');
    
    // Edit mode buttons
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-profile-edit-btn');

    console.log('profile.js - 🔧 Setting up profile buttons...');
    console.log('profile.js - 🔧 editBtn found:', !!editBtn);
    console.log('profile.js - 🔧 closeDisplayBtn found:', !!closeDisplayBtn);
    console.log('profile.js - 🔧 saveBtn found:', !!saveBtn);
    console.log('profile.js - 🔧 cancelEditBtn found:', !!cancelEditBtn);

    if (editBtn) {
      editBtn.addEventListener('click', () => this.switchToEditMode());
    }

    if (closeDisplayBtn) {
      closeDisplayBtn.addEventListener('click', () => {
        console.log('profile.js - 🔄 Display close button clicked');
        this.closeProfile();
      });
      console.log('profile.js - ✅ Display close button handler attached');
    } else {
      console.log('profile.js - ⚠️ Display close button (close-profile-display-btn) not found!');
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveCompleteProfile());
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => this.cancelEdit());
      console.log('profile.js - ✅ Cancel edit button handler attached');
    }

    // Setup delete button (in danger zone) - will be handled when mode switches
    setTimeout(() => this.setupDangerZoneHandlers(), 100);

    // Set initial mode
    this.switchToDisplayMode();
  }

  // Cancel edit and discard changes
  cancelEdit() {
    console.log('profile.js - ❌ Cancelling profile edit, discarding changes');
    
    // Reset any unsaved map preference changes
    if (this.originalMapPreferences) {
      const regions = Object.keys(this.originalMapPreferences);
      regions.forEach(region => {
        const checkbox = document.getElementById(`pref-${region}`);
        if (checkbox) {
          checkbox.checked = this.originalMapPreferences[region];
        }
      });
      
      // Update map smart view to reflect reverted preferences
      if (window.MapController && window.MapController.updateSmartView) {
        console.log('profile.js - 🔄 [CANCEL] Reverting map smart view to saved preferences');
        window.MapController.updateSmartView();
      }
    }
    
    // Reset form fields to original values
    if (this.userProfile) {
      const firstNameField = document.getElementById('first-name');
      const lastNameField = document.getElementById('last-name');
      const fullNameField = document.getElementById('full-name');
      
      if (firstNameField) firstNameField.value = this.userProfile.first_name || '';
      if (lastNameField) lastNameField.value = this.userProfile.last_name || '';
      if (fullNameField) fullNameField.value = this.userProfile.full_name || '';
    }
    
    // Clear any unsaved changes flags
    this.hasUnsavedMapChanges = false;
    
    // Switch back to display mode
    this.switchToDisplayMode();
  }

  // Switch to display mode
  switchToDisplayMode() {
    this.currentMode = 'display';
    
    // Show/hide mode-specific elements
    const displayActions = document.querySelector('.display-actions');
    const editActions = document.querySelector('.edit-actions');
    const editOnlyElements = document.querySelectorAll('.edit-only');
    
    if (displayActions) displayActions.style.display = 'flex';
    if (editActions) editActions.style.display = 'none';
    
    // Hide edit-only elements (Danger Zone, Profile Status)
    editOnlyElements.forEach(el => el.style.display = 'none');
    
    // Disable form inputs and show display values
    this.setFormFieldsMode('display');
    
    console.log('profile.js - 📋 Profile switched to display mode');
  }

  // Switch to edit mode
  switchToEditMode() {
    this.currentMode = 'edit';
    
    // Show/hide mode-specific elements
    const displayActions = document.querySelector('.display-actions');
    const editActions = document.querySelector('.edit-actions');
    const editOnlyElements = document.querySelectorAll('.edit-only');
    
    if (displayActions) displayActions.style.display = 'none';
    if (editActions) editActions.style.display = 'flex';
    
    // Show edit-only elements (Danger Zone, Profile Status)
    editOnlyElements.forEach(el => el.style.display = 'block');
    
    // Enable form inputs and hide display values
    this.setFormFieldsMode('edit');
    
    console.log('profile.js - ✏️ Profile switched to edit mode');
  }

  // Set form fields to display or edit mode
  setFormFieldsMode(mode) {
    const inputs = document.querySelectorAll('#profile-data input[type="text"]');
    const displayValues = document.querySelectorAll('.display-value');
    const checkboxes = document.querySelectorAll('#profile-data input[type="checkbox"]');
    
    inputs.forEach(input => {
      if (mode === 'edit') {
        input.disabled = false;
        input.style.display = 'block';
      } else {
        input.disabled = true;
        input.style.display = 'none';
      }
    });
    
    displayValues.forEach(displayValue => {
      if (mode === 'display') {
        displayValue.style.display = 'block';
      } else {
        displayValue.style.display = 'none';
      }
    });

    // Handle map preference checkboxes
    checkboxes.forEach(checkbox => {
      if (mode === 'edit') {
        checkbox.disabled = false;
      } else {
        checkbox.disabled = true;
      }
    });
  }

  // Get current map preferences for other modules
  getMapPreferences() {
    if (!this.userProfile || !this.userProfile.map_preferences) {
      // Return default preferences - only CONUS enabled by default
      return {
        conus: true,
        alaska: false,
        hawaii: false,
        'puerto-rico': false,
        'us-virgin-islands': false,
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