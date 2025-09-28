//=============================================================================
// MAP FUNCTIONALITY - Travel Nurse Logbook
// Rebuilding features step by step for reliable functionality
//=============================================================================

//=============================================================================
// STEP 1: BASIC MAP INITIALIZATION
//=============================================================================

let contractMap; // Main Leaflet map instance

// CONUS bounds for optimal map fitting - guarantees Maine visibility
const CONUS_BOUNDS = [
    [24.396308, -125.0], // Southwest corner (Southern California)
    [49.384358, -66.93]  // Northeast corner (Maine - ensures visibility)
];

// Regional bounds for smart zoom functionality
const REGION_BOUNDS = {
    'conus': [[24.396308, -125.0], [49.384358, -66.93]],
    'alaska': [[51.0, -180.0], [71.5, -129.0]],
    'hawaii': [[18.9, -161.0], [22.25, -154.8]],
    'puerto-rico': [[17.9, -67.3], [18.52, -65.2]],
    'us-virgin-islands': [[17.7, -65.1], [18.4, -64.6]],
    'guam': [[13.2, 144.6], [13.7, 145.0]], // Slightly expanded for contract at 144.8430
    'american-samoa': [[-14.8, -171.5], [-11.0, -169.0]], // Fixed to include -170.7025
    'northern-mariana': [[14.1, 144.9], [20.6, 146.1]]
};

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



/**
 * Force map to show optimal CONUS view using fitBounds
 * Automatically calculates best center and zoom for current container size
 */
function forceConsistentView() {
    if (contractMap) {
        console.log('🗺️ Fitting to CONUS bounds');
        contractMap.fitBounds(CONUS_BOUNDS, {
            padding: [10, 10], // Small padding for aesthetics
            animate: false,    // No animation during resize operations
            maxZoom: 6.0       // Prevent over-zooming
        });
    }
}

/**
 * Fit map to show all provided contracts
 */
function fitMapToAllContracts(contracts) {
    if (!contractMap || !contracts || contracts.length === 0) {
        console.log('🚫 Cannot fit map to contracts - missing map or contracts');
        forceConsistentView(); // Fallback to CONUS view
        return;
    }
    
    // Create bounds from all contract coordinates
    const bounds = new L.LatLngBounds();
    let hasValidCoordinates = false;
    
    contracts.forEach(contract => {
        const lat = parseFloat(contract.latitude);
        const lng = parseFloat(contract.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
            // Handle Pacific coordinate normalization
            const normalizedLng = lng > 0 ? -lng : lng;
            bounds.extend([lat, normalizedLng]);
            hasValidCoordinates = true;
        }
    });
    
    if (hasValidCoordinates) {

        contractMap.fitBounds(bounds, {
            padding: [20, 20], // More padding for contract groups
            animate: true,     // Smooth animation for user-initiated actions
            maxZoom: 10        // Allow closer zoom for contract groups
        });
    } else {
        console.log('⚠️ No valid coordinates found in contracts - using CONUS view');
        forceConsistentView();
    }
}

/**
 * Simple dimension logging for debugging when needed
 */
function logMapDimensions() {
    if (contractMap) {
        const mapContainer = document.getElementById('map');
        const mapRect = mapContainer ? mapContainer.getBoundingClientRect() : null;
        const leafletSize = contractMap.getSize();
        const center = contractMap.getCenter();
        const bounds = contractMap.getBounds();
        

    }
}

//=============================================================================
// STEP 2: CONTRACT MARKERS SYSTEM (from reference)
//=============================================================================

// Global variables for map markers and circles
let contractMarkers = [];
let contractCircles = [];
let customMapIcon = null;

/**
 * Create custom map icon with bottom-point anchoring (from reference)
 */
function createCustomMapIcon() {
    if (!customMapIcon) {
        customMapIcon = L.icon({
            iconUrl: 'images/map_pin.png',
            iconSize: [32, 32],        // Size of the icon
            iconAnchor: [16, 32],      // Anchor point (bottom center of icon)
            popupAnchor: [0, -32],     // Popup appears above the icon
            tooltipAnchor: [0, -32]    // Tooltip appears above the icon
        });
    }
    return customMapIcon;
}

/**
 * Get tax compliance circle color based on end date (from reference)
 */
function getCircleColor(endDate) {
    const today = new Date();
    
    if (!endDate) {
        return '#2196F3'; // Blue for current (no end date)
    }
    
    const contractEndDate = new Date(endDate);
    
    if (contractEndDate > today) {
        return '#2196F3'; // Blue for current contracts
    }
    
    const timeDifference = today - contractEndDate;
    const twoYearsInMs = 2 * 365.25 * 24 * 60 * 60 * 1000;
    
    if (timeDifference < twoYearsInMs) {
        return '#F44336'; // Red for restricted areas
    } else {
        return '#4CAF50'; // Green for available areas
    }
}

/**
 * Add a contract to the map with marker and circle (from reference)
 */
function addContractToMap(contract) {
    if (!contract.latitude || !contract.longitude || !contractMap) {
        return;
    }
    
    const lat = parseFloat(contract.latitude);
    let lng = parseFloat(contract.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        return;
    }
    
    // Normalize Pacific coordinates for consistent display
    if (lng > 0 && lng <= 180) {
        lng = lng - 360; // Convert positive longitude to negative equivalent
    }
    
    // Create marker with custom icon
    const marker = L.marker([lat, lng], {
        icon: createCustomMapIcon()
    }).addTo(contractMap);
    
    // Create tooltip content matching card format
    const tooltipContent = `
        <strong>${contract.hospital_name}</strong><br>
        ${contract.address || 'Address not provided'}<br>
        ${contract.start_date} → ${contract.end_date || 'Ongoing'}
    `;
    
    // Bind tooltip to marker
    marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top'
    });
    
    // Add click handler to zoom to circle view with blink (from reference)
    marker.on('click', function() {
        blinkContractCircleAfterMapReady(lat, lng);
    });
    
    // Create 50-mile radius circle
    const circleColor = getCircleColor(contract.end_date);
    const circle = L.circle([lat, lng], {
        radius: 80467, // 50 miles in meters
        color: circleColor,
        weight: 2,
        opacity: 0.8,
        fillColor: circleColor,
        fillOpacity: 0.2
    }).addTo(contractMap);
    
    // Store references for later management
    contractMarkers.push({
        marker: marker,
        circle: circle,
        contractId: contract.id,
        latitude: lat,
        longitude: lng
    });
}

/**
 * Remove all contract markers and circles from map (from reference)
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

/**
 * Calculate appropriate zoom level using regional blocks for Mercator compensation
 * Optimized based on user testing across all 20 contracts
 */
function calculateCircleZoomLevel(latitude, longitude) {
    const absLat = Math.abs(latitude);
    let zoom, region;
    
    // Regional zoom levels based on user testing results
    if (absLat >= 70) {
        zoom = 8.1;  // Extreme Arctic: 71.29°→8.1 (Utqiagvik/Barrow area)
        region = "Extreme Arctic (70°+ Alaska)";
    } else if (absLat >= 60) {
        zoom = 8.6;  // Arctic: 60.49°→8.6, 61.19°→8.6, 61.58°→8.6, 64.84°→8.4
        region = "Arctic (Alaska & far north)";
    } else if (absLat >= 45) {
        zoom = 9.0;  // Northern tier: 47.66°→9.0, 58.25°→8.8 (average ~8.9, rounded to 9.0)
        region = "Northern tier (MT, ND, WA, MN, etc.)";
    } else if (absLat >= 35) {
        zoom = 9.3;  // Most CONUS: 39.30°→9.3, 40.78°→9.3, 41.66°→9.3, 42.36°→9.3
        region = "Most of CONUS (majority of US)";
    } else if (absLat >= 25) {
        zoom = 9.4;  // Southern states: 27.94°→9.6, 32.24°→9.3, 33.62°→9.4
        region = "Southern states (FL, TX, CA, etc.)";
    } else {
        zoom = 9.6;  // Tropical: All tested at 9.6 (Hawaii, Guam, Saipan, Am.Samoa, VI)
        region = "Tropical (HI, Guam, PR, USVI)";
    }
    

    
    return zoom;
}

/**
 * Find contract circle by coordinates (from reference)
 */
function findContractCircle(latitude, longitude) {
    return contractMarkers.find(item => 
        item.circle && 
        Math.abs(item.latitude - latitude) < 0.0001 &&
        Math.abs(item.longitude - longitude) < 0.0001
    );
}

/**
 * Blink a specific contract circle (from reference)
 */
function blinkContractCircle(latitude, longitude) {
    console.log(`🎯 Searching for circle at coordinates: ${latitude}, ${longitude}`);
    const targetItem = findContractCircle(latitude, longitude);
    
    if (targetItem && targetItem.circle) {
        console.log(`✅ Found target circle for contract ID: ${targetItem.contractId}`);
        const circleElement = targetItem.circle.getElement();
        
        if (circleElement) {
            // Add blink animation class
            circleElement.classList.add('circle-blink');
            
            // Remove animation class after completion (3 blinks × 0.3s = 0.9s)
            setTimeout(() => {
                circleElement.classList.remove('circle-blink');
            }, 900);
            
            console.log('🔴 Circle blink animation started');
        } else {
            console.log('❌ Circle element not found in DOM');
        }
    } else {
        console.log('❌ No circle found matching coordinates');
    }
}

/**
 * Check if circle is visible in current viewport (from reference)
 */
function isCircleInViewport(latitude, longitude) {
    if (!contractMap) return false;
    
    const bounds = contractMap.getBounds();
    const circleRadius = 80467; // 50 miles in meters
    
    // Create rough bounds for 50-mile circle (approximate)
    const latOffset = circleRadius / 111000; // Rough conversion: 1 degree ≈ 111km
    const lngOffset = circleRadius / (111000 * Math.cos(latitude * Math.PI / 180));
    
    const circleBounds = L.latLngBounds([
        [latitude - latOffset, longitude - lngOffset],
        [latitude + latOffset, longitude + lngOffset]
    ]);
    
    return bounds.intersects(circleBounds);
}

/**
 * Robust function to blink circle after map is ready (from reference)
 */
function blinkContractCircleAfterMapReady(latitude, longitude) {
    if (!contractMap) return;
    
    console.log('🗺️ Starting map ready detection for circle blink');
    
    // Step 1: Zoom to location to show full circle
    const zoomLevel = calculateCircleZoomLevel(latitude, longitude);
    contractMap.setView([latitude, longitude], zoomLevel);
    
    // Step 2: Wait for map movement to complete
    const waitForMapMovement = new Promise(resolve => {
        const onMoveEnd = () => {
            contractMap.off('moveend', onMoveEnd);
            console.log('✅ Map movement completed');
            resolve();
        };
        
        contractMap.once('moveend', onMoveEnd);
        
        // Fallback timeout in case moveend doesn't fire
        setTimeout(() => {
            contractMap.off('moveend', onMoveEnd);
            console.log('⏱️ Map movement timeout reached');
            resolve();
        }, 2000);
    });
    
    // Step 3: Wait for tiles to load (if needed)
    const waitForTileLoad = new Promise(resolve => {
        const onLoad = () => {
            contractMap.off('load', onLoad);
            console.log('✅ Map tiles loaded');
            resolve();
        };
        
        contractMap.once('load', onLoad);
        
        // Fallback - tiles might already be loaded
        setTimeout(() => {
            contractMap.off('load', onLoad);
            console.log('⏱️ Tile load timeout (tiles likely cached)');
            resolve();
        }, 1000);
    });
    
    // Step 4: Execute after both conditions are met
    Promise.all([waitForMapMovement, waitForTileLoad]).then(() => {
        // Step 5: Check viewport visibility
        setTimeout(() => {
            if (isCircleInViewport(latitude, longitude)) {
                console.log('👁️ Circle is in viewport, starting blink');
                blinkContractCircle(latitude, longitude);
            } else {
                console.log('❌ Circle not in viewport, skipping blink');
            }
        }, 100); // Quick buffer for visual stability
    });
}

/**
 * Zoom to contract location and blink circle (from reference)
 */
function zoomToContractLocation(latitude, longitude) {
    if (contractMap) {
        // Apply Pacific normalization for consistent display
        let normalizedLng = longitude;
        if (longitude > 0 && longitude <= 180) {
            normalizedLng = longitude - 360; // Convert positive longitude to negative equivalent
            console.log(`🌏 Normalized Pacific coordinate: ${latitude}, ${longitude}°E → ${latitude}, ${normalizedLng}°W`);
        }
        blinkContractCircleAfterMapReady(latitude, normalizedLng);
    }
}

/**
 * Initialize map pin event listeners for contract cards (from reference)
 */
function initializeMapPins() {
    document.querySelectorAll('.map-pin').forEach(button => {
        button.addEventListener('click', () => {
            const lat = parseFloat(button.getAttribute('data-lat'));
            const lng = parseFloat(button.getAttribute('data-lng'));
            
            if (!isNaN(lat) && !isNaN(lng)) {
                // Close all forms before zooming to location
                if (window.profileManager) {
                    window.profileManager.closeAllForms();
                }
                zoomToContractLocation(lat, lng);
            }
        });
    });
}

/**
 * Initialize the main Leaflet map with layers
 * STEP 1: Just creates a blank map centered on CONUS with layer controls
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
        // Create map with fractional zoom enabled for precise control
        contractMap = L.map('map', {
            zoomSnap: 0.1,    // Allow zoom in 0.1 increments (more precise)
            zoomDelta: 0.25   // Zoom buttons/keyboard increment by 0.25
        });
        
        // Use fitBounds instead of setView - Leaflet automatically calculates optimal center and zoom!
        contractMap.fitBounds(CONUS_BOUNDS, {
            padding: [10, 10], // Small padding
            animate: false,
            maxZoom: 6.0
        });
        
        // Initialize marker arrays (from reference)
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
        
        // Add zoom level debug label on top left
        addZoomLevelLabel();
        
        // Add resize handling for when contracts load and change panel size
        setupMapResizeHandling();
        
        return true;
    } catch (error) {
        console.error('map.js - ❌ Error adding layers to map:', error);
        return false;
    }
}

/**
 * Add a zoom level debug label on the top left of the map
 */
function addZoomLevelLabel() {
    // Create zoom level control
    const zoomLevelControl = L.control({position: 'topleft'});
    
    zoomLevelControl.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'zoom-level-label');
        div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        div.style.border = '2px solid #333';
        div.style.borderRadius = '4px';
        div.style.padding = '6px 10px';
        div.style.fontSize = '14px';
        div.style.fontWeight = 'bold';
        div.style.color = '#333';
        div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        div.style.fontFamily = 'Arial, sans-serif';
        
        // Initial zoom display
        const currentZoom = map.getZoom();
        div.innerHTML = `Zoom: ${currentZoom.toFixed(1)}`;
        
        // Update on zoom change
        map.on('zoomend', function() {
            const newZoom = map.getZoom();
            div.innerHTML = `Zoom: ${newZoom.toFixed(1)}`;
        });
        
        return div;
    };
    
    zoomLevelControl.addTo(contractMap);
}

/**
 * Setup basic resize handling for map container changes
 * This fixes the issue where map shifts when left panel loads with contracts
 */
function setupMapResizeHandling() {
    // Get the map container
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.warn('map.js - ⚠️ Map container not found');
        return;
    }

    // ResizeObserver for container size changes (when contracts load in left panel) - OPTIMIZED
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
                    forceConsistentView();
                    lastMapSize = newSize;
                }, 200); // Debounced resize handling
            }
        });
        
        mapResizeObserver.observe(mapContainer);

        // CRITICAL: Also watch the left panel for size changes
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
                        forceConsistentView();
                        lastPanelSize = newPanelSize;
                    }, 100); // Faster response for panel changes
                }
            });
            
            panelResizeObserver.observe(leftPanel);
        }
    }

    // MutationObserver for when left panel content changes (contracts loading) - OPTIMIZED
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
            forceConsistentView();
        }
    });
}

//=============================================================================
// PUBLIC API - STEP 1 ONLY
//=============================================================================

// Export the basic initialization function
window.initializeMap = initializeMap;

/**
 * Check if a contract is within any of the user's enabled regions
 * Handles Pacific coordinate normalization for accurate region matching
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
        
        // For Pacific regions (positive longitude bounds), we need to handle both
        // positive and negative coordinate representations
        if (minLng > 0) {
            // Pacific region with positive bounds (Guam, Northern Mariana)
            // Check both raw coordinates and normalized versions
            const normalizedLng = lng > 0 ? lng : lng + 360; // Convert negative to positive
            const matchesRaw = lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
            const matchesNormalized = lat >= minLat && lat <= maxLat && normalizedLng >= minLng && normalizedLng <= maxLng;
            return matchesRaw || matchesNormalized;
        } else {
            // Standard negative longitude bounds (CONUS, Alaska, Hawaii, etc.)
            // Check both raw coordinates and normalized versions  
            const normalizedLng = lng > 0 ? -lng : lng; // Convert positive to negative
            const matchesRaw = lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
            const matchesNormalized = lat >= minLat && lat <= maxLat && normalizedLng >= minLng && normalizedLng <= maxLng;
            return matchesRaw || matchesNormalized;
        }
    });
}

/**
 * Smart View - Intelligent zoom/pan based on user's regional preferences
 * - ALL contracts remain visible on map (users can manually pan/zoom/click)
 * - Only affects default zoom level to show preferred regions
 * - Used by reset button and profile preference changes
 */
function smartZoomToContracts(contracts) {
    if (!contractMap || !contracts || contracts.length === 0) {
        return;
    }
    
    // Trigger a complete refresh with Smart View zoom logic
    refreshContractMarkers(contracts);
}

/**
 * Zoom to user's preferred regions
 */
function zoomToUserRegions(enabledRegions) {
    if (!contractMap || !enabledRegions || enabledRegions.length === 0) {
        forceConsistentView();
        return;
    }
    
    const bounds = new L.LatLngBounds();
    let hasValidBounds = false;
    
    enabledRegions.forEach(region => {
        const regionBounds = REGION_BOUNDS[region];
        if (regionBounds) {
            bounds.extend(regionBounds[0]);
            bounds.extend(regionBounds[1]);
            hasValidBounds = true;
        }
    });
    
    if (hasValidBounds) {
        contractMap.fitBounds(bounds, { padding: [20, 20] });
    } else {
        forceConsistentView();
    }
}

/**
 * Get user's enabled regions and zoom to them
 */
function zoomToUserPreferences() {
    let enabledRegions = [];
    if (window.profileManager && typeof window.profileManager.getMapRegions === 'function') {
        enabledRegions = window.profileManager.getMapRegions();
    }
    
    if (enabledRegions.length > 0) {
        zoomToUserRegions(enabledRegions);
    } else {
        forceConsistentView();
    }
}

/**
 * Test function to analyze and execute smart view
 */
window.testSmartView = function() {
    console.log('🧪 TESTING SMART VIEW ANALYSIS & EXECUTION');
    
    // Get current enabled regions
    let enabled = [];
    if (window.profileManager && typeof window.profileManager.getMapRegions === 'function') {
        enabled = window.profileManager.getMapRegions();

    } else {
        console.log('⚠️ No profile manager available');
    }
    
    // Simulate and execute the smart zoom
    if (window.logbookApp && window.logbookApp.contracts) {
        const contracts = window.logbookApp.contracts;

        
        // Show which contracts would be included
        const included = contracts.filter(contract => 
            isContractInEnabledRegion(contract, enabled)
        );
        console.log(`✅ Contracts that would be shown: ${included.length}`);
        included.forEach(c => console.log(`   - ${c.hospital_name} (${c.latitude}, ${c.longitude})`));
        
        // Actually execute the smart view
        smartZoomToContracts(contracts);
    }
};

/**
 * Manual trigger for smart view
 */
window.triggerSmartView = function() {
    if (window.logbookApp && window.logbookApp.contracts) {
        refreshContractMarkers(window.logbookApp.contracts);
    }
};

/**
 * Quick fix - Force Smart View refresh with current preferences
 */
window.forceSmartViewRefresh = function() {
    console.log('🔧 FORCING SMART VIEW REFRESH');
    if (window.logbookApp && window.logbookApp.contracts) {
        console.log('🔄 Clearing all markers and re-applying Smart View filtering...');

        refreshContractMarkers(window.logbookApp.contracts);
        console.log('✅ Smart View refresh complete!');
    } else {
        console.log('⚠️ No contracts available');
    }
};

/**
 * Check if Guam contract specifically exists in the dataset
 */
window.findGuamContract = function() {
    console.log('🔍 SEARCHING FOR GUAM CONTRACT');
    console.log('=====================================');
    
    if (!window.logbookApp || !window.logbookApp.contracts) {
        console.log('⚠️ No contracts loaded');
        return;
    }
    
    const contracts = window.logbookApp.contracts;

    
    // Find Guam contract specifically
    const guamContract = contracts.find(c => 
        c.hospital_name && c.hospital_name.toLowerCase().includes('guam')
    );
    
    if (guamContract) {
        console.log('✅ FOUND GUAM CONTRACT:');
        console.log('   Hospital:', guamContract.hospital_name);
        console.log('   Address:', guamContract.address);
        console.log('   Coordinates:', guamContract.latitude, guamContract.longitude);
        console.log('   Start:', guamContract.start_date);
        console.log('   End:', guamContract.end_date);
        
        // Test if it matches region bounds
        const matches = isContractInEnabledRegion(guamContract, ['guam']);
        console.log('   Matches Guam region:', matches ? '✅' : '❌');
        
        return guamContract;
    } else {
        console.log('❌ GUAM CONTRACT NOT FOUND IN DATABASE!');
        console.log('   This explains why Guam is not showing in Smart View');
        console.log('   Available contracts:');
        contracts.forEach((c, i) => {
            console.log(`   ${i+1}. ${c.hospital_name}`);
        });
        return null;
    }
};











// MapController interface expected by logbook.js
window.MapController = {
    initialize: initializeMap,
    initializePins: initializeMapPins,
    refreshMarkers: refreshContractMarkers,
    fitToContracts: forceConsistentView, // Use our clean CONUS fitting
    zoomToLocation: zoomToContractLocation,
    getMap: () => contractMap,
    updateSmartView: function() {
        // Trigger smart view when map preferences change
        if (window.logbookApp && window.logbookApp.contracts) {
            smartZoomToContracts(window.logbookApp.contracts);
        }
    }
};

/**
 * Refresh all contract markers on the map (from reference)
 */
function refreshContractMarkers(contracts) {
    // Clear existing markers
    clearContractMarkers();
    
    // Invalidate map size to account for sidebar changes
    if (contractMap) {
        contractMap.invalidateSize();
    }
    
    // Add markers only for contracts in user's preferred regions (Smart View filtering)
    if (contracts && contracts.length > 0) {
        // Get user's enabled regions
        let enabledRegions = [];
        if (window.profileManager && typeof window.profileManager.getMapRegions === 'function') {
            enabledRegions = window.profileManager.getMapRegions();
        }
        
        // Filter contracts to only those in enabled regions (Smart View filtering)
        const filteredContracts = contracts.filter(contract => 
            isContractInEnabledRegion(contract, enabledRegions)
        );
        

        
        // Add only the filtered contracts to the map (Smart View filtering)
        if (filteredContracts.length > 0) {
            filteredContracts.forEach(contract => {
                addContractToMap(contract);
            });
            
            // Zoom to show the filtered contracts
            setTimeout(() => {
                fitMapToAllContracts(filteredContracts);
            }, 100);
        } else if (enabledRegions.length > 0) {
            // No contracts in enabled regions, show the regions themselves
            setTimeout(() => {
                zoomToUserRegions(enabledRegions);
            }, 100);
        } else {
            // No preferences, show all contracts (traditional behavior)
            contracts.forEach(contract => {
                addContractToMap(contract);
            });
            setTimeout(() => {
                fitMapToAllContracts(contracts);
            }, 100);
        }
    } else {
        // No contracts - show default CONUS view
        if (contractMap) {
            forceConsistentView();
        }
    }
}

// Expose functions globally for backward compatibility (from reference)
window.refreshContractMarkers = refreshContractMarkers;
window.initializeMapPins = initializeMapPins;
window.zoomToContractLocation = zoomToContractLocation;
window.isContractInEnabledRegion = isContractInEnabledRegion;
window.fitMapToAllContracts = fitMapToAllContracts;
window.smartZoomToContracts = smartZoomToContracts;

// Map will be initialized by logbook.js calling MapController.initialize()



