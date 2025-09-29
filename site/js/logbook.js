//=============================================================================
// CONTRACT SORTING FUNCTIONALITY
//=============================================================================

let isNameSortAscending = true;
let isDateSortAscending = true;

// Sort contracts alphabetically by hospital name
function sortContractsByName() {
    const contractsContainer = document.querySelector('.contract-cell');
    const contractCards = Array.from(contractsContainer.querySelectorAll('.card'));
    
    contractCards.sort((a, b) => {
        const nameA = a.querySelector('.hospital-name').textContent;
        const nameB = b.querySelector('.hospital-name').textContent;
        return isNameSortAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    
    isNameSortAscending = !isNameSortAscending;
    contractsContainer.innerHTML = '';
    contractCards.forEach(card => contractsContainer.appendChild(card));
    
    // Reinitialize map pins for newly sorted cards (handled automatically by map.js)
    // Note: Sorting only changes contract order - does NOT change map view
    console.log('logbook.js - ✅ Sorted contracts by name - map view preserved');
}

// Sort contracts chronologically by start date
function sortContractsByDate() {
    const contractsContainer = document.querySelector('.contract-cell');
    const contractCards = Array.from(contractsContainer.querySelectorAll('.card'));
    
    contractCards.sort((a, b) => {
        const dateA = new Date(a.querySelector('.dates').textContent.split(' → ')[0]);
        const dateB = new Date(b.querySelector('.dates').textContent.split(' → ')[0]);
        return isDateSortAscending ? dateA - dateB : dateB - dateA;
    });
    
    isDateSortAscending = !isDateSortAscending;
    contractsContainer.innerHTML = '';
    contractCards.forEach(card => contractsContainer.appendChild(card));
    
    // Reinitialize map pins for newly sorted cards (handled automatically by map.js)
    // Note: Sorting only changes contract order - does NOT change map view
    console.log('logbook.js - ✅ Sorted contracts by date - map view preserved');
}

//=============================================================================
// SAMPLE CONTRACTS MODULE
//=============================================================================

class SampleContractsLoader {
  constructor() {
    // Sample contracts data is maintained in sql/sample_contracts.sql
    // This class loads the data dynamically from that source
    this.sampleContracts = null; // Will be loaded async
  }

  // Load sample contracts data from SQL file
  async loadSampleContractsData() {
    if (this.sampleContracts) {
      return this.sampleContracts; // Return cached data
    }

    try {
      const response = await fetch('./sql/sample_contracts.sql');
      
      if (!response.ok) {
        throw new Error(`Failed to load SQL file: ${response.status} ${response.statusText}`);
      }
      
      const sqlContent = await response.text();
      
      // Parse SQL INSERT statements to extract contract data
      this.sampleContracts = this.parseSQLToContracts(sqlContent);
      
      return this.sampleContracts;
      
    } catch (error) {
      // Fallback to a minimal sample contract to prevent complete failure
      this.sampleContracts = [{
        hospital_name: 'Demo Hospital',
        address: '123 Demo St, Demo City, ST 12345',
        latitude: 39.8283,
        longitude: -98.5795,
        start_date: '2025-01-01',
        end_date: '2025-03-31'
      }];
      return this.sampleContracts;
    }
  }

  // Parse SQL INSERT statements to extract contract objects
  parseSQLToContracts(sqlContent) {
    const contracts = [];
    
    // Match individual VALUES entries - handle {USER_ID} placeholder and escaped quotes
    const valuesRegex = /\('\{USER_ID\}',\s*'([^']*(?:''[^']*)*)',\s*'([^']*(?:''[^']*)*)',\s*([0-9.-]+),\s*([0-9.-]+),\s*'([^']*)',\s*'([^']*)',\s*NOW\(\),\s*NOW\(\)\)/g;
    let match;
    
    while ((match = valuesRegex.exec(sqlContent)) !== null) {
      contracts.push({
        hospital_name: match[1].replace(/''/g, "'"), // Convert SQL escaped quotes back to normal quotes
        address: match[2].replace(/''/g, "'"),
        latitude: parseFloat(match[3]),
        longitude: parseFloat(match[4]),
        start_date: match[5],
        end_date: match[6]
      });
    }
    
    return contracts;
  }

  // Update button state with current text and disable/enable
  updateButtonState(button, text, disabled = false) {
    if (button) {
      button.textContent = text;
      button.disabled = disabled;
    }
  }

  // Reset button to original state
  resetButton(button, originalText) {
    setTimeout(() => {
      this.updateButtonState(button, originalText, false);
    }, 2000);
  }

  // Load all sample contracts into the database
  async loadAll() {
    const loadButton = document.getElementById('add-sample-contracts');
    if (!loadButton) {
      return { success: false, error: 'Button not found' };
    }

    const originalText = loadButton.textContent;
    
    try {
      this.updateButtonState(loadButton, 'Loading Contracts...', true);
      
      // Verify user authentication
      const session = await window.auth.getCurrentSession();
      if (!session || !session.user) {
        throw new Error('No authenticated user found');
      }
      const user = session.user;
      
      // Load contracts with progress tracking
      const result = await this.insertContracts(user.id, loadButton);
      
      if (result.success) {
        // Hide button and refresh UI
        loadButton.style.display = 'none';
        await this.refreshUI();
        return { success: true, ...result };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      this.updateButtonState(loadButton, 'Error Loading', true);
      this.resetButton(loadButton, originalText);
      return { success: false, error: error.message };
    }
  }

  // Insert contracts with progress updates
  async insertContracts(userId, progressButton) {
    // Load sample contracts data from SQL file
    const contracts = await this.loadSampleContractsData();
    
    const db = new Database();
    let successCount = 0;
    let failCount = 0;
    const total = contracts.length;
    
    for (const [index, contract] of contracts.entries()) {
      const current = index + 1;
      
      // Update progress
      this.updateButtonState(progressButton, `Loading... ${current}/${total}`, true);
      
      const result = await db.createContract(userId, contract);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    return { 
      success: failCount === 0, 
      successCount, 
      failCount, 
      total,
      error: failCount > 0 ? `${failCount} contracts failed to load` : null
    };
  }

  // Refresh the UI after loading contracts
  async refreshUI() {
    if (window.logbookApp) {
      await window.logbookApp.loadContracts();
    }
  }
}

// Global sample contracts loader instance
const sampleContractsLoader = new SampleContractsLoader();

// Global function for backwards compatibility
async function loadSampleContracts() {
  return await sampleContractsLoader.loadAll();
}

// Function to remove all contracts for the current user
async function removeAllContracts() {
  const removeButton = document.getElementById('remove-all-contracts');
  if (!removeButton) {
    return { success: false, error: 'Button not found' };
  }

  const originalText = removeButton.textContent;
  
  try {
    // Show confirmation dialog
    const confirmed = confirm('Are you sure you want to remove ALL contracts from your logbook? This action cannot be undone.');
    if (!confirmed) {
      return { success: false, error: 'User cancelled' };
    }

    removeButton.textContent = 'Removing Contracts...';
    removeButton.disabled = true;
    
    // Verify user authentication
    const session = await window.auth.getCurrentSession();
    if (!session || !session.user) {
      throw new Error('No authenticated user found');
    }
    
    // Remove all contracts from database
    const db = new Database();
    const result = await db.deleteAllContracts(session.user.id);
    
    if (result.success) {
      // Refresh the UI
      if (window.logbookApp) {
        await window.logbookApp.loadContracts();
      }
      
      removeButton.textContent = 'All Removed';
      setTimeout(() => {
        // After successful removal, the loadContracts call will handle button toggle
        removeButton.textContent = originalText;
        removeButton.disabled = false;
      }, 2000);
      
      return { success: true };
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    removeButton.textContent = 'Error Removing';
    removeButton.disabled = true;
    setTimeout(() => {
      removeButton.textContent = originalText;
      removeButton.disabled = false;
    }, 2000);
    return { success: false, error: error.message };
  }
}



//=============================================================================
// UTILITY FUNCTIONS
//=============================================================================

// Escape HTML to prevent XSS attacks
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Profile function wrappers for compatibility with components
function toggleProfile() {
    return window.profileManager.toggleProfile();
}

function closeProfile() {
    return window.profileManager.closeProfile();
}

function editField(fieldId) {
    return window.profileManager.editField(fieldId);
}

function saveField(fieldId) {
    return window.profileManager.saveField(fieldId);
}

function markProfileComplete() {
    return window.profileManager.markProfileComplete();
}

//=============================================================================
// MAIN APPLICATION CLASS
//=============================================================================

class LogbookApp {
  constructor() {
    this.authCheckAttempts = 0;
    this.maxAttempts = 50; // Maximum attempts (5 seconds)
    this.currentUser = null;
    this.contracts = []; // Store contract data for dynamic operations
  }

  //===========================================================================
  // APPLICATION INITIALIZATION
  //===========================================================================

  // Initialize the application
  init() {
    document.addEventListener('DOMContentLoaded', () => {
      // Initialize contract count
      this.updateContractCount(0);
      
      // Initialize map first
      if (window.MapController) {
        window.MapController.initialize();
        window.MapController.initializePins();
      }
      
      // Then initialize authentication and UI
      this.initializeAuth();
      this.initializeSortButtons();
    });
  }

  // Initialize sort button event listeners
  initializeSortButtons() {
    const sortNameBtn = document.querySelector('#sort-name');
    const sortDateBtn = document.querySelector('#sort-date');
    const resetMapBtn = document.querySelector('#reset-map-view');
    
    if (sortNameBtn) sortNameBtn.addEventListener('click', sortContractsByName);
    if (sortDateBtn) sortDateBtn.addEventListener('click', sortContractsByDate);
    if (resetMapBtn) resetMapBtn.addEventListener('click', () => {
      
      // Check if contract form is open and close it
      const contractSlideout = document.querySelector('#contract-slideout');
      const isContractFormOpen = contractSlideout && contractSlideout.classList.contains('open');
      
      if (isContractFormOpen) {
        if (window.contractFormController) {
          window.contractFormController.closeForm();
        }
      }
      
      // Check if profile form is open and close it
      const profileSlideout = document.querySelector('#profile-slideout');
      const isProfileFormOpen = profileSlideout && profileSlideout.classList.contains('open');
      
      if (isProfileFormOpen) {
        if (window.profileManager) {
          window.profileManager.closeForm();
        }
      }
      
      // Smart View - use updated recalculateSmartView for most reliable results
      if (window.recalculateSmartView) {
        console.log('🔄 === MAP RESET BUTTON PRESSED ===');
        
        // Log preference state before reset
        if (window.profileManager && typeof window.profileManager.logPreferenceState === 'function') {
          window.profileManager.logPreferenceState('MAP RESET BUTTON');
        }
        
        console.log('logbook.js - 🎯 Reset map button: Recalculating Smart View with current preferences');
        window.recalculateSmartView();
      } else if (window.smartZoomToContracts && this.contracts) {
        console.log('logbook.js - 🎯 Reset map button: Using smart view with user preferences');
        window.smartZoomToContracts(this.contracts);
      } else if (window.MapController && this.contracts) {
        console.log('logbook.js - 🗺️ Reset map button: Fallback to traditional contract fitting');
        window.MapController.fitToContracts(this.contracts, true);
      } else {
        // Fallback to user preferred regions or CONUS
        if (window.zoomToUserPreferences) {
          console.log('logbook.js - 🌍 Reset map button: No contracts, showing user preferred regions');
          window.zoomToUserPreferences();
        } else {
          console.log('logbook.js - 🗺️ Reset map button: Fallback to CONUS view');
          const map = window.MapController ? window.MapController.getMap() : null;
          if (map) {
            map.setView([39.8283, -98.5795], 4);
          }
        }
      }
    });
    
    // Initialize sample contracts button
    const addSampleContractsBtn = document.querySelector('#add-sample-contracts');
    if (addSampleContractsBtn) {
      addSampleContractsBtn.addEventListener('click', async () => {
        await loadSampleContracts();
      });
    }

    // Initialize remove all contracts button
    const removeAllContractsBtn = document.querySelector('#remove-all-contracts');
    if (removeAllContractsBtn) {
      removeAllContractsBtn.addEventListener('click', async () => {
        await removeAllContracts();
      });
    }

    // Initialize map pin click handlers using event delegation
    const contractsContainer = document.querySelector('.contract-cell');
    if (contractsContainer) {
      contractsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.map-pin')) {
          const mapPin = e.target.closest('.map-pin');
          const lat = parseFloat(mapPin.dataset.lat);
          const lng = parseFloat(mapPin.dataset.lng);
          
          console.log('logbook.js - 📍 Map pin clicked:', { lat, lng });
          
          if (window.MapController && !isNaN(lat) && !isNaN(lng)) {
            window.MapController.zoomToLocation(lat, lng);
          } else {
            console.error('logbook.js - ❌ Invalid coordinates or MapController not available', { lat, lng });
          }
        }
      });
    }
  }

  //===========================================================================
  // AUTHENTICATION MANAGEMENT
  //===========================================================================

  // Authentication initialization and checking
  initializeAuth() {
    const checkAuth = async () => {
      this.authCheckAttempts++;
      
      // Check authentication using auth.js
      if (!window.auth) {
        setTimeout(checkAuth, 100);
        return;
      }
      
      const session = await window.auth.getCurrentSession();
      
      if (session && session.user) {
        // User is authenticated
        this.currentUser = session.user;
        this.setupAuthenticatedUI();
      } else if (this.authCheckAttempts > 20) {
        // No session after wait period
        window.location.href = 'index.html';
        return;
      } else {
        // Still checking for authentication
        setTimeout(checkAuth, 100);
      }
    };
    
    checkAuth();
  }

  //===========================================================================
  // UI SETUP AND COMPONENT MANAGEMENT
  //===========================================================================

  // Setup UI after authentication is confirmed
  setupAuthenticatedUI() {
    
    // Setup header buttons first
    this.setupHeaderButtons();
    
    // Load components first, then setup event handlers
    this.loadComponents().then(() => {
      
      // Small delay to ensure DOM elements are available
      setTimeout(() => {
        // ProfileManager will initialize automatically with timeout
        
        // Use existing contract form controller instance
        if (window.contractForm) {
          window.contractFormController = window.contractForm;
          // Reinitialize to ensure DOM elements are found
          window.contractFormController.initialize();
        } else if (window.ContractFormController) {
          window.contractFormController = new window.ContractFormController();
        } else {
        }
        
        // Setup unified contract form handlers
        this.setupUnifiedContractForm();
      }, 100);

      // Load user preferences FIRST (lightweight), then contracts (ensures Smart View has preferences)
      setTimeout(async () => {
        if (window.profileManager) {
          console.log('logbook.js - 🎯 Loading user preferences FIRST (lightweight)...');
          
          // Load only preferences (fast)
          const preferencesLoaded = await window.profileManager.loadPreferencesOnly();
          
          if (preferencesLoaded) {
            console.log('logbook.js - ✅ Preferences loaded, now loading contracts with Smart View support');
          } else {
            console.log('logbook.js - ⚠️ Preferences load failed, using defaults');
          }
          
          // Load contracts (preferences are now cached and available)
          this.loadContractsFromDatabase();
          
          // Load full profile data in background (for profile UI) - don't wait for this
          setTimeout(() => {
            if (window.profileManager.loadProfileData) {
              console.log('logbook.js - 📋 Loading full profile data in background...');
              window.profileManager.loadProfileData().then(() => {
                const profileBtn = document.getElementById('profile-btn');
                this.updateProfileButtonText(profileBtn);
              }).catch(error => {
                console.log('logbook.js - ❌ Background profile load failed');
              });
            }
          }, 1000);
        } else {
          console.log('logbook.js - ⚠️ No profile manager, loading contracts directly');
          this.loadContractsFromDatabase();
        }
      }, 500);
    }).catch(error => {
    });
  }

  // Load HTML components
  async loadComponents() {
    const components = [
      { path: 'components/profile-form.html', target: '#profile-slideout' },
      { path: 'components/contract-form.html', target: '#contract-slideout' }
    ];
    
    try {
      await ComponentLoader.loadComponents(components);
    } catch (error) {
    }
  }

  // Setup event handlers for the unified contract form
  setupUnifiedContractForm() {
    // Setup handlers for Add New Contract button
    const addContractBtn = document.querySelector('.add-contract-button button');
    if (addContractBtn) {
      addContractBtn.addEventListener('click', () => {
        if (window.contractFormController) {
          // Check if contract form is already open
          const contractSlideout = document.getElementById('contract-slideout');
          const isContractFormOpen = contractSlideout && contractSlideout.classList.contains('open');
          
          if (isContractFormOpen) {
            // If contract form is open, close it
            window.contractFormController.closeForm();
          } else {
            // Close profile form if open, then open contract form
            if (window.profileManager) {
              window.profileManager.closeProfile();
            }
            window.contractFormController.openCreateMode();
          }
        } else {
        }
      });
    } else {
    }

    // Setup handlers for profile button  
    const profileBtn = document.getElementById('profile-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        // Close contract form if open, then toggle profile
        if (window.contractFormController) {
          window.contractFormController.closeForm();
        }
        window.profileManager.toggleProfile();
      });
    } else {
    }

    // Setup logout button functionality here too
    this.setupLogoutButton();
  }

  // Setup logout button functionality
  setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        if (!window.auth) {
          // Force redirect if auth system not available
          window.location.href = 'index.html';
          return;
        }
        
        const result = await window.auth.signOut();
        if (result.success || result.error) {
          // Redirect regardless of success/failure for security
          window.location.href = 'index.html';
        }
      });
    } else {
    }
  }

  //===========================================================================
  // CONTRACT MANAGEMENT
  //===========================================================================

  // Update contract count in the title
  updateContractCount(count) {
    const contractCountElement = document.getElementById('contract-count');
    if (contractCountElement) {
      contractCountElement.textContent = `(${count})`;
    }
  }

  // Load contracts from database
  async loadContractsFromDatabase() {
    try {
      const user = this.currentUser;
      
      if (!user) {
        return;
      }

      const db = new Database();
      
      const result = await db.getContracts(user.id);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      // Clear existing contract cards (from previous loads)
      const contractCell = document.querySelector('.contract-cell');
      if (!contractCell) {
        return;
      }

      // Remove only the contract cards, keep the title and sorting buttons
      const existingCards = contractCell.querySelectorAll('.card');
      existingCards.forEach(card => card.remove());

      // Add new contract cards
      result.data.forEach((contract, index) => {
        const contractCard = this.createContractCard(contract);
        contractCell.appendChild(contractCard);
      });

      // Initialize map pin functionality for new cards
      // Note: Pin functionality now handled automatically by map.js

      // Store contracts for future operations
      this.contracts = result.data;

      // Update contract count in the title
      this.updateContractCount(result.data.length);

      // Toggle between sample contracts buttons based on whether user has contracts
      const addSampleContractsBtn = document.querySelector('#add-sample-contracts');
      const removeAllContractsBtn = document.querySelector('#remove-all-contracts');
      
      if (result.data.length === 0) {
        // Show add sample contracts button if no contracts exist
        if (addSampleContractsBtn) addSampleContractsBtn.style.display = 'inline-block';
        if (removeAllContractsBtn) removeAllContractsBtn.style.display = 'none';
      } else {
        // Show remove button if contracts exist
        if (addSampleContractsBtn) addSampleContractsBtn.style.display = 'none';
        if (removeAllContractsBtn) removeAllContractsBtn.style.display = 'inline-block';
      }

      // Refresh contract markers on map
      if (window.refreshContractMarkers) {
        console.log('logbook.js - 📞 Calling refreshContractMarkers with', result.data.length, 'contracts');
        window.refreshContractMarkers(result.data);
      } else {
        console.log('logbook.js - ❌ window.refreshContractMarkers not available');
      }
      
      // Map will default to CONUS and Smart View will adjust based on contracts


    } catch (error) {
    }
  }

  // Public method to reload contracts (can be called from external functions)
  async loadContracts() {
    await this.loadContractsFromDatabase();
  }

  // Calculate tax compliance status based on contract end date
  calculateTaxComplianceStatus(endDate) {
    const today = new Date();
    
    // Handle missing or invalid end dates
    if (!endDate) {
      return {
        statusClass: 'contract-current',
        tooltipText: 'Currently Working'
      };
    }
    
    const contractEndDate = new Date(endDate);
    
    // Check if end date is in the future (currently working)
    if (contractEndDate > today) {
      return {
        statusClass: 'contract-current',
        tooltipText: 'Currently Working'
      };
    }
    
    // Calculate time difference in milliseconds
    const timeDifference = today - contractEndDate;
    const twoYearsInMs = 2 * 365.25 * 24 * 60 * 60 * 1000; // Account for leap years
    
    if (timeDifference < twoYearsInMs) {
      // Ended within 2 years - tax restriction active
      return {
        statusClass: 'contract-restricted',
        tooltipText: 'Cannot Return Yet'
      };
    } else {
      // Ended 2+ years ago - clear to return
      return {
        statusClass: 'contract-available',
        tooltipText: 'Can Return Now'
      };
    }
  }

  // Create contract card HTML element
  createContractCard(contract) {
    const card = document.createElement('div');
    
    // Calculate tax compliance status based on end date
    const { statusClass, tooltipText } = this.calculateTaxComplianceStatus(contract.end_date);
    
    card.className = `card ${statusClass}`;
    card.title = tooltipText;
    card.innerHTML = `
      <div class="card-content">
        <div class="hospital-name">${escapeHtml(contract.hospital_name)}</div>
        <div class="address">${escapeHtml(contract.address || 'Not provided')}</div>
        <div class="dates">${contract.start_date} → ${contract.end_date || 'Ongoing'}</div>
      </div>
      ${contract.latitude && contract.longitude ? 
        `<button class="map-pin" data-lat="${contract.latitude}" data-lng="${contract.longitude}"><img src="images/map_pin.png" alt="View on map"></button>` : 
        ''
      }
    `;
    
    // Add click handler for the card (excluding map pin clicks)
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('map-pin')) {
        return;
      }
      
      if (window.contractFormController) {
        // Check if contract form is already open with this same contract
        const contractSlideout = document.getElementById('contract-slideout');
        const isContractFormOpen = contractSlideout && contractSlideout.classList.contains('open');
        const isSameContract = window.contractFormController.currentContract && 
                              window.contractFormController.currentContract.id === contract.id;
        
        if (isContractFormOpen && isSameContract) {
          // If same contract form is open, close it
          window.contractFormController.closeForm();
        } else {
          // Close profile form if open, then open this contract form
          if (window.profileManager) {
            window.profileManager.closeProfile();
          }
          window.contractFormController.openDisplayMode(contract);
        }
      } else {
      }
    });
    
    return card;
  }

  // Setup header buttons (Profile and Logout)
  setupHeaderButtons() {
    const profileBtn = document.getElementById('profile-btn');
    
    // Set dynamic profile button text with user's full name
    this.updateProfileButtonText(profileBtn);
  }

  // Update profile button text with user's first and last name
  updateProfileButtonText(profileBtn) {
    if (!profileBtn) {
      profileBtn = document.getElementById('profile-btn');
      if (!profileBtn) return;
    }
    
    // Try to get name from profile data first
    if (window.profileManager && window.profileManager.userProfile) {
      const profile = window.profileManager.userProfile;
      if (profile.first_name && profile.last_name) {
        profileBtn.textContent = `${profile.first_name} ${profile.last_name}`;
        return;
      } else if (profile.first_name) {
        profileBtn.textContent = profile.first_name;
        return;
      } else if (profile.full_name && profile.full_name.trim()) {
        profileBtn.textContent = profile.full_name.trim();
        return;
      }
    }
    
    // Fallback to auth metadata
    if (this.currentUser) {
      const user = this.currentUser;
      const metadata = user.user_metadata || {};
      
      if (metadata.first_name && metadata.last_name) {
        profileBtn.textContent = `${metadata.first_name} ${metadata.last_name}`;
      } else if (metadata.first_name) {
        profileBtn.textContent = metadata.first_name;
      } else if (metadata.full_name) {
        profileBtn.textContent = metadata.full_name;
      } else {
        // Fallback to "Profile" if no name is available
        profileBtn.textContent = 'Profile';
      }
    } else {
      // No user data available
      profileBtn.textContent = 'Profile';
    }
  }
}

//=============================================================================
// APPLICATION STARTUP
//=============================================================================

// Initialize the application
const logbookApp = new LogbookApp();
window.logbookApp = logbookApp; // Make globally accessible
logbookApp.init();