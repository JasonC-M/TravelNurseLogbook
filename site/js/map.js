//=============================================================================
// MAP FUNCTIONALITY - Travel Nurse Logbook
// Production-ready map system with Smart View regional filtering
//=============================================================================

//=============================================================================
// 1. CONSTANTS & CONFIGURATION
//=============================================================================

// Main Leaflet map instance
let contractMap;

// Global variables for map markers and circles
let contractMarkers = [];
let contractCircles = [];
let customMapIcon = null;

// CONUS bounds for optimal map fitting - guarantees Maine visibility
const CONUS_BOUNDS = [
    [24.396308, -125.0], // Southwest corner (Southern California)
    [49.384358, -66.93]  // Northeast corner (Maine - ensures visibility)
];

// Regional bounds for Smart View functionality
const REGION_BOUNDS = {
    'conus': [[24.396308, -125.0], [49.384358, -66.93]],
    'alaska': [[51.0, -180.0], [71.5, -129.0]],
    'hawaii': [[18.9, -161.0], [22.25, -154.8]],
    'puerto-rico': [[17.9, -67.3], [18.52, -65.2]],
    'us-virgin-islands': [[17.7, -65.1], [18.4, -64.6]],
    'guam': [[13.2, 144.6], [13.7, 145.0]], 
    'american-samoa': [[-14.8, -171.5], [-11.0, -169.0]], 
    'northern-mariana': [[14.1, 144.9], [20.6, 146.1]]
};

//=============================================================================
// 2. CORE MAP FUNCTIONS (Order of Operations)
//=============================================================================

/**
 * Initialize the Leaflet map with CONUS bounds and layers
 * FIRST: Creates the base map instance
 */
async function initializeMap() {
    // Check if Leaflet is available
    if (typeof L === 'undefined') {
        console.error('map.js - ❌ Leaflet (L) is not available! Check if Leaflet CSS/JS are loaded.');
        return false;
    }
    
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.error('map.js - ❌ Map container with id="map" not found in DOM!');
        return false;
    }

    try {
        // Create map with explicit CONUS center and zoom
        contractMap = L.map('map', {
            center: [39.8283, -98.5795], // CONUS center coordinates
            zoom: 4,                      // Appropriate zoom for CONUS
            zoomSnap: 0.1,               // Allow zoom in 0.1 increments (more precise)
            zoomDelta: 0.25              // Zoom buttons/keyboard increment by 0.25
        });
        
        console.log('map.js - ✅ Map initialized with CONUS center view');
        
        // Initialize marker arrays
        contractMarkers = [];
        contractCircles = [];

    } catch (error) {
        console.error('map.js - ❌ Error creating Leaflet map:', error);
        return false;
    }

    // Define map layers
    const defaultLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri'
    });

    try {
        // Add default layer and layer control
        defaultLayer.addTo(contractMap);
        
        const baseMaps = {
            Default: defaultLayer,
            Satellite: satelliteLayer
        };
        L.control.layers(baseMaps).addTo(contractMap);
        
        // Add resize handling for when contracts load and change panel size
        setupMapResizeHandling();
        
        return true;
    } catch (error) {
        console.error('map.js - ❌ Error adding layers to map:', error);
        return false;
    }
}

/**
 * Setup responsive resize handling for map container changes
 * SECOND: Sets up responsive behavior after map creation
 */
function setupMapResizeHandling() {
    // Get the map container
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.warn('map.js - ⚠️ Map container not found');
        return;
    }

    // ResizeObserver for container size changes (when contracts load in left panel)
    if (window.ResizeObserver) {
        let resizeTimeout = null;
        let lastMapSize = { width: 0, height: 0 };
        let lastPanelSize = { width: 0, height: 0 };
        
        // Watch the map container itself
        const mapResizeObserver = new ResizeObserver(entries => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            const entry = entries[0];
            const newSize = {
                width: entry.contentRect.width,
                height: entry.contentRect.height
            };
            
            // Only trigger if size actually changed significantly (more than 10px)
            const sizeChanged = Math.abs(newSize.width - lastMapSize.width) > 10 || 
                               Math.abs(newSize.height - lastMapSize.height) > 10;
            
            if (sizeChanged && contractMap) {
                resizeTimeout = setTimeout(() => {
                    contractMap.invalidateSize();
                    recalculateSmartView();
                    lastMapSize = newSize;
                }, 200); // Debounced resize handling
            }
        });
        
        mapResizeObserver.observe(mapContainer);

        // Also watch the left panel for size changes
        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) {
            const panelResizeObserver = new ResizeObserver(entries => {
                const entry = entries[0];
                const newPanelSize = {
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                };
                
                // When left panel changes width, the map needs to resize
                const panelWidthChanged = Math.abs(newPanelSize.width - lastPanelSize.width) > 5;
                
                if (panelWidthChanged && contractMap) {
                    // Clear any existing timeout
                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                    }
                    
                    resizeTimeout = setTimeout(() => {
                        contractMap.invalidateSize();
                        recalculateSmartView();
                        lastPanelSize = newPanelSize;
                    }, 100); // Faster response for panel changes
                }
            });
            
            panelResizeObserver.observe(leftPanel);
        }
    }

    // MutationObserver for when left panel content changes (contracts loading)
    if (window.MutationObserver) {
        let mutationTimeout = null;
        let mutationCount = 0;
        
        const mutationObserver = new MutationObserver(mutations => {
            // Debounce multiple rapid mutations during page load
            if (mutationTimeout) {
                clearTimeout(mutationTimeout);
            }
            
            mutationCount++;
            
            const hasSignificantChanges = mutations.some(mutation => 
                mutation.type === 'childList' && mutation.addedNodes.length > 0
            );
            
            if (hasSignificantChanges && contractMap) {
                mutationTimeout = setTimeout(() => {
                    contractMap.invalidateSize();
                    recalculateSmartView();
                    mutationCount = 0; // Reset counter after handling
                }, 300); // Longer delay to batch changes
            }
        });

        // Watch only the contract list container, not entire page
        const contractList = document.querySelector('.contracts-container') || 
                           document.querySelector('.main-content') || 
                           document.body;
        mutationObserver.observe(contractList, {
            childList: true,
            subtree: false, // Don't watch deep changes
            attributes: false // Don't watch attribute changes
        });
    }

    // Window resize listener as backup
    window.addEventListener('resize', () => {
        if (contractMap) {
            contractMap.invalidateSize();
            recalculateSmartView();
        }
    });
}

//=============================================================================
// 3. COORDINATE NORMALIZATION
//=============================================================================

/**
 * Normalize Pacific territory coordinates for proper map display
 * Some Pacific territories use Eastern longitude (positive) but need to be 
 * displayed on the Western side of the International Date Line for proper visualization
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate 
 * @returns {Object} Normalized coordinates {lat, lng}
 */
function normalizeCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Western Pacific territories that need longitude conversion
    // These have positive Eastern longitude but should display west of date line
    const needsConversion = (
        // Guam area: ~13-14°N, 144-145°E
        (lat >= 13.0 && lat <= 14.0 && lng >= 144.0 && lng <= 146.0) ||
        // Northern Mariana Islands (Saipan): ~15-16°N, 145-146°E  
        (lat >= 14.5 && lat <= 16.0 && lng >= 145.0 && lng <= 147.0)
    );
    
    if (needsConversion && lng > 0) {
        // Convert Eastern longitude to display on Western side
        // 144°E becomes ~-216°W for proper Pacific visualization
        const normalizedLng = lng - 360;
        console.log(`🌏 Normalized Pacific coordinate: ${lat}, ${lng}°E → ${lat}, ${normalizedLng}°W`);
        return { lat, lng: normalizedLng };
    }
    
    // American Samoa and other territories with negative longitude are already correct
    return { lat, lng };
}

//=============================================================================
// 4. MARKER SYSTEM
//=============================================================================

/**
 * Create custom 32x32 map pin icon for contract locations
 */
function createCustomMapIcon() {
    if (!customMapIcon) {
        customMapIcon = L.icon({
            iconUrl: 'images/map_pin.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],  // Bottom center of the icon
            popupAnchor: [0, -32]  // Popup appears above the icon
        });
    }
    return customMapIcon;
}

/**
 * Determine tax compliance circle color based on contract end date
 * @param {string} endDate - Contract end date in YYYY-MM-DD format
 * @returns {string} Color code for the circle
 */
function getCircleColor(endDate) {
    if (!endDate) {
        return '#3498db'; // Blue for current/active contracts (no end date)
    }
    
    const today = new Date();
    const contractEndDate = new Date(endDate);
    const timeDiff = today - contractEndDate;
    const yearsDiff = timeDiff / (1000 * 60 * 60 * 24 * 365.25);
    
    if (contractEndDate > today) {
        return '#3498db'; // Blue for future end dates (current contracts)
    } else if (yearsDiff < 2) {
        return '#e74c3c'; // Red for contracts ended within 2 years (restricted)
    } else {
        return '#27ae60'; // Green for contracts ended over 2 years ago (available)
    }
}

/**
 * Add a contract to the map with marker and tax compliance circle
 * @param {Object} contract - Contract object with latitude, longitude, and details
 */
function addContractToMap(contract) {
    if (!contract || !contract.latitude || !contract.longitude) {
        return;
    }

    const lat = parseFloat(contract.latitude);
    const lng = parseFloat(contract.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        return;
    }

    // Normalize coordinates for proper Pacific territory display
    const normalized = normalizeCoordinates(lat, lng);
    
    // Create custom map pin
    const marker = L.marker([normalized.lat, normalized.lng], {
        icon: createCustomMapIcon()
    }).addTo(contractMap);

    // Create popup content
    const popupContent = `
        <div class="contract-popup">
            <h3>${contract.hospital_name || 'Unknown Hospital'}</h3>
            <p><strong>Address:</strong> ${contract.address || 'Unknown'}</p>
            <p><strong>Start:</strong> ${contract.start_date || 'Unknown'}</p>
            <p><strong>End:</strong> ${contract.end_date || 'Ongoing'}</p>
        </div>
    `;
    marker.bindPopup(popupContent);

    // Add 50-mile radius tax compliance circle
    const circleColor = getCircleColor(contract.end_date);
    const circle = L.circle([normalized.lat, normalized.lng], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.1,
        radius: 80467.2 // 50 miles in meters
    }).addTo(contractMap);

    // Store marker and circle for management
    contractMarkers.push({
        marker: marker,
        circle: circle,
        contractId: contract.id,
        latitude: normalized.lat,
        longitude: normalized.lng
    });
}

/**
 * Clear all contract markers and circles from the map
 */
function clearContractMarkers() {
    contractMarkers.forEach(item => {
        if (item.marker) {
            contractMap.removeLayer(item.marker);
        }
        if (item.circle) {
            contractMap.removeLayer(item.circle);
        }
    });
    
    contractMarkers = [];
}

//=============================================================================
// 5. ZOOM & NAVIGATION
//=============================================================================

/**
 * Force map to show optimal CONUS view using fitBounds
 * Automatically calculates best center and zoom for current container size
 */
function forceConsistentView() {
    if (contractMap) {
        console.log('🗺️ Fitting to CONUS bounds');
        contractMap.fitBounds(CONUS_BOUNDS, {
            padding: [10, 10],
            animate: true,
            duration: 0.5,
            maxZoom: 6.0
        });
    }
}

/**
 * Fit map to show all provided contracts with optimal zoom
 * @param {Array} contracts - Array of contract objects with latitude/longitude
 */
function fitMapToAllContracts(contracts) {
    if (!contractMap || !contracts || contracts.length === 0) {
        console.log('🚫 Cannot fit map to contracts - missing map or contracts');
        return;
    }

    // Extract valid coordinates from contracts
    const coordinates = contracts.map(contract => {
        const lat = parseFloat(contract.latitude);
        const lng = parseFloat(contract.longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
            return null;
        }
        
        // Normalize coordinates for proper map bounds calculation
        const normalized = normalizeCoordinates(lat, lng);
        return [normalized.lat, normalized.lng];
    }).filter(coord => coord !== null);

    if (coordinates.length === 0) {
        console.log('⚠️ No valid coordinates found in contracts - using CONUS view');
        forceConsistentView();
        return;
    }

    // Create bounds from coordinates and fit map
    const group = new L.featureGroup(coordinates.map(coord => L.marker(coord)));
    contractMap.fitBounds(group.getBounds(), {
        padding: [20, 20],
        animate: true,
        duration: 0.5,
        maxZoom: 10
    });
}

/**
 * Calculate optimal zoom level for contract circles based on latitude
 * Compensates for Mercator projection distortion
 * @param {number} latitude - Contract latitude
 * @param {number} longitude - Contract longitude (not used but kept for compatibility)
 * @returns {number} Optimal zoom level
 */
function calculateCircleZoomLevel(latitude, longitude) {
    // Define zoom levels based on latitude ranges (compensates for Mercator distortion)
    if (latitude >= 70) {
        return 8.1; // Extreme Arctic (Utqiagvik/Barrow area)
    } else if (latitude >= 60) {
        return 8.6; // Arctic (Most of Alaska)
    } else if (latitude >= 45) {
        return 9.0; // Northern tier (MT, ND, WA, MN, SE Alaska)
    } else if (latitude >= 35) {
        return 9.3; // Most of CONUS (Majority of continental US)
    } else if (latitude >= 25) {
        return 9.4; // Southern states (FL, TX, CA, AZ)
    } else {
        return 9.6; // Tropical (HI, Guam, PR, USVI, AS)
    }
}

/**
 * Zoom to specific contract location with optimal zoom level
 * @param {number} latitude - Contract latitude
 * @param {number} longitude - Contract longitude
 */
function zoomToContractLocation(latitude, longitude) {
    if (!contractMap || isNaN(latitude) || isNaN(longitude)) {
        return;
    }

    // Normalize coordinates for proper zoom targeting
    const normalized = normalizeCoordinates(latitude, longitude);
    
    // Calculate optimal zoom level for this latitude  
    const zoomLevel = calculateCircleZoomLevel(normalized.lat, normalized.lng);
    
    // Pan and zoom to the contract location
    contractMap.setView([normalized.lat, normalized.lng], zoomLevel, {
        animate: true,
        duration: 0.8
    });
    
    // Trigger blink animation after map movement
    setTimeout(() => {
        blinkContractCircleAfterMapReady(normalized.lat, normalized.lng);
    }, 900);
}

/**
 * Zoom to user's preferred regions
 * @param {Array} enabledRegions - Array of region names to zoom to
 */
function zoomToUserRegions(enabledRegions) {
    if (!contractMap || !enabledRegions || enabledRegions.length === 0) {
        forceConsistentView();
        return;
    }
    
    // Collect bounds from enabled regions
    const allBounds = [];
    enabledRegions.forEach(region => {
        if (REGION_BOUNDS[region]) {
            allBounds.push(REGION_BOUNDS[region]);
        }
    });
    
    if (allBounds.length === 0) {
        forceConsistentView();
        return;
    }
    
    // Create combined bounds
    let minLat = allBounds[0][0][0];
    let minLng = allBounds[0][0][1];
    let maxLat = allBounds[0][1][0];
    let maxLng = allBounds[0][1][1];
    
    allBounds.forEach(bounds => {
        minLat = Math.min(minLat, bounds[0][0]);
        minLng = Math.min(minLng, bounds[0][1]);
        maxLat = Math.max(maxLat, bounds[1][0]);
        maxLng = Math.max(maxLng, bounds[1][1]);
    });
    
    const combinedBounds = [[minLat, minLng], [maxLat, maxLng]];
    
    contractMap.fitBounds(combinedBounds, {
        padding: [20, 20],
        animate: true,
        duration: 0.8,
        maxZoom: 8
    });
}

/**
 * Zoom to user preferences - gets enabled regions from profile and zooms to them
 * This is the function called by logbook.js when resetting map with no contracts
 */
function zoomToUserPreferences() {
    if (!window.profileManager || typeof window.profileManager.getMapRegions !== 'function') {
        console.log('map.js - 🚫 ProfileManager not available, falling back to CONUS');
        forceConsistentView();
        return;
    }
    
    const enabledRegions = window.profileManager.getMapRegions();
    console.log('map.js - 🎯 Zooming to user preferences:', enabledRegions);
    
    if (enabledRegions && enabledRegions.length > 0) {
        // Filter to only regions that have bounds defined
        const regionsWithBounds = enabledRegions.filter(region => REGION_BOUNDS[region]);
        
        if (regionsWithBounds.length > 0) {
            zoomToUserRegions(regionsWithBounds);
        } else {
            console.log('map.js - 📍 No enabled regions have defined bounds, showing CONUS default');
            forceConsistentView();
        }
    } else {
        console.log('map.js - 📍 No enabled regions, showing CONUS default');
        forceConsistentView();
    }
}

//=============================================================================
// 6. SMART VIEW SYSTEM
//=============================================================================

/**
 * Check if a contract is within any of the user's enabled regions
 * @param {Object} contract - Contract object with latitude/longitude
 * @param {Array} enabledRegions - Array of enabled region names
 * @returns {boolean} True if contract is in an enabled region
 */
function isContractInEnabledRegion(contract, enabledRegions) {
    if (!enabledRegions || enabledRegions.length === 0) {
        return true; // If no regions specified, include all contracts
    }
    
    const lat = parseFloat(contract.latitude);
    const lng = parseFloat(contract.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        return false;
    }
    
    return enabledRegions.some(region => {
        const bounds = REGION_BOUNDS[region];
        if (!bounds) return false;
        
        const [[minLat, minLng], [maxLat, maxLng]] = bounds;
        
        // Check original coordinates against region bounds
        // (Region bounds are defined with original coordinate system)
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    });
}

/**
 * Recalculate Smart View with current contracts (for resize events)
 */
function recalculateSmartView() {
    console.log('🗺️ === SMART VIEW RECALCULATE DEBUG ===');
    
    // Log what preferences Smart View can see
    if (window.profileManager && typeof window.profileManager.getMapRegions === 'function') {
        const regions = window.profileManager.getMapRegions();
        console.log('🎯 Smart View sees preferences:', regions);
    } else {
        console.log('❌ Smart View cannot access profileManager.getMapRegions');
    }
    
    if (window.logbookApp && window.logbookApp.contracts && window.logbookApp.contracts.length > 0) {
        console.log('map.js - 🔄 Recalculating Smart View for', window.logbookApp.contracts.length, 'contracts');
        smartZoomToContracts(window.logbookApp.contracts);
    } else {
        console.log('map.js - 🔄 No contracts available, using user preferences for resize');
        zoomToUserPreferences();
    }
    
    console.log('🗺️ === END SMART VIEW RECALCULATE DEBUG ===');
}

/**
 * Apply Smart View intelligent zoom based on user's regional preferences
 * @param {Array} contracts - Array of contract objects
 */
function smartZoomToContracts(contracts) {
    if (!contractMap || !contracts || contracts.length === 0) {
        console.log('🚫 Cannot execute smart view - missing map or contracts');
        return;
    }
    
    // Trigger a complete refresh with Smart View zoom logic
    refreshContractMarkers(contracts);
}

/**
 * Main function to refresh all contract markers with Smart View filtering
 * @param {Array} contracts - Array of contract objects to display
 */
function refreshContractMarkers(contracts) {
    // Clear existing markers
    clearContractMarkers();
    
    // Invalidate map size to account for sidebar changes
    if (contractMap) {
        contractMap.invalidateSize();
    }
    
    // Add markers for all contracts (Smart View affects zoom, not marker visibility)
    if (contracts && contracts.length > 0) {
        // Get user's enabled regions for Smart View zoom targeting
        let enabledRegions = [];
        if (window.profileManager && typeof window.profileManager.getMapRegions === 'function') {
            enabledRegions = window.profileManager.getMapRegions();
        }
        
        // Filter contracts for Smart View zoom targeting (not marker filtering)
        const filteredContracts = contracts.filter(contract => 
            isContractInEnabledRegion(contract, enabledRegions)
        );
        
        // Add ALL contracts to the map (show everything)
        contracts.forEach(contract => {
            addContractToMap(contract);
        });
        
        // Smart View zoom logic - zoom to preferred regions if any
        console.log('map.js - 🎯 Smart View: enabledRegions:', enabledRegions);
        console.log('map.js - 🎯 Smart View: filteredContracts length:', filteredContracts.length);
        console.log('map.js - 🎯 Smart View: total contracts:', contracts.length);
        
        if (filteredContracts.length > 0) {
            // Zoom to show contracts in preferred regions
            console.log('map.js - 📍 Zooming to contracts in preferred regions');
            setTimeout(() => {
                fitMapToAllContracts(filteredContracts);
            }, 100);
        } else if (enabledRegions.length > 0) {
            // No contracts in enabled regions, show the regions themselves
            console.log('map.js - 🗺️ No contracts in enabled regions, zooming to regions themselves');
            setTimeout(() => {
                zoomToUserRegions(enabledRegions);
            }, 100);
        } else {
            // No preferences, show all contracts (traditional behavior)
            console.log('map.js - 📍 No preferences, showing all contracts');
            setTimeout(() => {
                fitMapToAllContracts(contracts);
            }, 100);
        }
    } else {
        // No contracts - check user preferences first, then default to CONUS
        if (contractMap) {
            let enabledRegions = [];
            if (window.profileManager && typeof window.profileManager.getMapRegions === 'function') {
                enabledRegions = window.profileManager.getMapRegions();
            }
            
            if (enabledRegions.length > 0) {
                console.log('map.js - 🎯 No contracts, but user has region preferences - showing preferred regions');
                setTimeout(() => {
                    zoomToUserRegions(enabledRegions);
                }, 100);
            } else {
                console.log('map.js - 🗺️ No contracts and no preferences - showing CONUS default');
                forceConsistentView();
            }
        }
    }
}

//=============================================================================
// 7. ANIMATION & INTERACTION
//=============================================================================

/**
 * Find contract circle by coordinates
 * @param {number} latitude - Target latitude
 * @param {number} longitude - Target longitude
 * @returns {Object|null} Contract marker object or null
 */
function findContractCircle(latitude, longitude) {
    console.log(`🎯 Searching for circle at coordinates: ${latitude}, ${longitude}`);
    
    return contractMarkers.find(item => 
        Math.abs(item.latitude - latitude) < 0.001 && 
        Math.abs(item.longitude - longitude) < 0.001
    );
}

/**
 * Blink contract circle for visual feedback
 * @param {number} latitude - Target latitude
 * @param {number} longitude - Target longitude
 */
function blinkContractCircle(latitude, longitude) {
    const targetItem = findContractCircle(latitude, longitude);
    
    if (targetItem) {
        console.log(`✅ Found target circle for contract ID: ${targetItem.contractId}`);
        
        // Blink the circle
        const circle = targetItem.circle;
        if (circle) {
            const originalOpacity = circle.options.fillOpacity;
            let blinkCount = 0;
            const blinkInterval = setInterval(() => {
                circle.setStyle({ fillOpacity: blinkCount % 2 === 0 ? 0.5 : originalOpacity });
                blinkCount++;
                if (blinkCount >= 6) {
                    clearInterval(blinkInterval);
                    circle.setStyle({ fillOpacity: originalOpacity });
                }
            }, 300);
            console.log('🔴 Circle blink animation started');
        } else {
            console.log('❌ Circle element not found in DOM');
        }
    } else {
        console.log('❌ No circle found matching coordinates');
    }
}

/**
 * Check if circle coordinates are in current map viewport
 * @param {number} latitude - Circle latitude
 * @param {number} longitude - Circle longitude
 * @returns {boolean} True if circle is visible in viewport
 */
function isCircleInViewport(latitude, longitude) {
    if (!contractMap) return false;
    
    const bounds = contractMap.getBounds();
    return bounds.contains([latitude, longitude]);
}

/**
 * Wait for map to be ready then blink contract circle
 * @param {number} latitude - Target latitude
 * @param {number} longitude - Target longitude
 */
function blinkContractCircleAfterMapReady(latitude, longitude) {
    console.log('🗺️ Starting map ready detection for circle blink');
    
    let mapMoveTimeout;
    let tileLoadTimeout;
    
    // Wait for map movement to complete
    const onMapMoveEnd = () => {
        clearTimeout(mapMoveTimeout);
        mapMoveTimeout = setTimeout(() => {
            console.log('✅ Map movement completed');
            contractMap.off('moveend', onMapMoveEnd);
            
            // Wait for tiles to load
            const onTileLoad = () => {
                clearTimeout(tileLoadTimeout);
                tileLoadTimeout = setTimeout(() => {
                    console.log('✅ Map tiles loaded');
                    
                    // Check if circle is in viewport before blinking
                    if (isCircleInViewport(latitude, longitude)) {
                        console.log('👁️ Circle is in viewport, starting blink');
                        blinkContractCircle(latitude, longitude);
                    } else {
                        console.log('❌ Circle not in viewport, skipping blink');
                    }
                }, 500);
            };
            
            // Set timeout for tile loading (fallback)
            tileLoadTimeout = setTimeout(() => {
                console.log('⏱️ Tile load timeout (tiles likely cached)');
                onTileLoad();
            }, 1000);
            
            // Listen for tile load events
            contractMap.on('load', onTileLoad);
        }, 200);
    };
    
    // Set timeout for map movement (fallback)
    mapMoveTimeout = setTimeout(() => {
        console.log('⏱️ Map movement timeout reached');
        onMapMoveEnd();
    }, 1500);
    
    contractMap.on('moveend', onMapMoveEnd);
}

//=============================================================================
// 8. PUBLIC API & EXPORTS
//=============================================================================

/**
 * Initialize map pins system (legacy compatibility)
 * Called after map is created and contracts are loaded
 */
function initializeMapPins() {
    // This function exists for backward compatibility
    // Actual marker initialization happens in refreshContractMarkers()
    return true;
}

/**
 * Console command to manually fit to CONUS bounds
 */
window.fitCONUS = function() {
    if (contractMap) {
        console.log('🗺️ Fitting to CONUS bounds');
        forceConsistentView();
    } else {
        console.log('Map not initialized yet');
    }
};

// Export the basic initialization function
window.initializeMap = initializeMap;

// Export zoom to user preferences function for logbook.js
window.zoomToUserPreferences = zoomToUserPreferences;

// Export Smart View recalculation for external triggers
window.recalculateSmartView = recalculateSmartView;

// Test function for preference optimization
window.testPreferenceCache = function() {
    console.log('🧪 Testing preference cache optimization:');
    
    if (window.profileManager) {
        console.log('📋 Cached preferences loaded:', window.profileManager.cachedPreferences.loaded);
        console.log('🗺️ Cached map regions:', window.profileManager.cachedPreferences.mapRegions);
        
        // Test multiple calls to getMapRegions - should return cached data instantly
        const start = performance.now();
        const regions1 = window.profileManager.getMapRegions();
        const time1 = performance.now() - start;
        
        const start2 = performance.now();
        const regions2 = window.profileManager.getMapRegions();
        const time2 = performance.now() - start2;
        
        console.log('🚀 First call time:', time1.toFixed(3), 'ms');
        console.log('🚀 Second call time:', time2.toFixed(3), 'ms (should be much faster)');
        console.log('✅ Both calls return same data:', JSON.stringify(regions1) === JSON.stringify(regions2));
    } else {
        console.log('❌ Profile manager not available');
    }
};

/**
 * MapController interface expected by logbook.js
 * This is the main public API for the map system
 */
window.MapController = {
    initialize: initializeMap,
    initializePins: initializeMapPins,
    refreshMarkers: refreshContractMarkers,
    fitToContracts: forceConsistentView,
    zoomToLocation: zoomToContractLocation,
    getMap: () => contractMap,
    updateSmartView: recalculateSmartView, // Updated to use the new recalculate function
    recalculateSmartView: recalculateSmartView // Also expose directly
};

// Map will be initialized by logbook.js calling MapController.initialize()