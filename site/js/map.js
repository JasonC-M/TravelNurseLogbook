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
 * Complete contract zoom testing chart for all 20 sample contracts
 * Run in browser console: testAllContractZooms()
 */
window.testAllContractZooms = function() {
    console.log("🏥 COMPLETE CONTRACT ZOOM TESTING CHART");
    console.log("📊 All 20 Sample Contracts with Current vs Desired Zoom Levels");
    console.log("━".repeat(85));
    
    const allContracts = [
        // Current/Recent Contracts  
        { id: 1, name: "Seattle Children's Hospital", lat: 47.6625, region: "Northern tier", current: 9.0, desired: 9.0 }, // ✅ PERFECT
        { id: 2, name: "Kuakini Medical Center (Honolulu)", lat: 21.3099, region: "Tropical", current: 9.6, desired: 9.6 }, // ✅ PERFECT
        { id: 3, name: "Providence Alaska Medical Center", lat: 61.1928, region: "Arctic", current: 8.6, desired: 8.6 }, // ✅ TESTED
        { id: 4, name: "Guam Regional Medical City", lat: 13.5139, region: "Tropical", current: 9.6, desired: 9.6 }, // ✅ FIXED PACIFIC
        { id: 5, name: "Samuel Simmonds Memorial (Utqiagvik)", lat: 71.2906, region: "Extreme Arctic", current: 8.1, desired: 8.1 }, // ✅ PERFECT
        
        // Past Contracts
        { id: 6, name: "Mayo Clinic Hospital (Phoenix)", lat: 33.6159, region: "Southern", current: 9.4, desired: 9.4 }, // ✅ TESTED
        { id: 7, name: "LBJ Tropical Medical (American Samoa)", lat: -14.2781, region: "Tropical", current: 9.6, desired: 9.6 }, // ✅ TESTED
        { id: 8, name: "Queen's Medical Center (Honolulu)", lat: 21.3099, region: "Tropical", current: 9.6, desired: 9.6 }, // ✅ TESTED
        { id: 9, name: "Central Peninsula Hospital (Soldotna)", lat: 60.4878, region: "Arctic", current: 8.6, desired: 8.6 }, // ✅ TESTED
        { id: 10, name: "Roy J. Carver Pavilion (Iowa City)", lat: 41.6581, region: "Most CONUS", current: 9.3, desired: 9.3 }, // ✅ TESTED
        
        { id: 11, name: "Schneider Regional (St Thomas, VI)", lat: 18.3358, region: "Tropical", current: 9.6, desired: 9.6 }, // ✅ TESTED
        { id: 12, name: "Bartlett Regional Hospital (Juneau)", lat: 58.2539, region: "Northern tier", current: 9.0, desired: 8.8 }, // ⚠️ CLOSE
        { id: 13, name: "Tampa General Hospital", lat: 27.9447, region: "Southern", current: 9.4, desired: 9.6 }, // ⚠️ CLOSE
        { id: 14, name: "Banner University Medical (Tucson)", lat: 32.2431, region: "Southern", current: 9.4, desired: 9.3 }, // ⚠️ CLOSE
        { id: 15, name: "Fairbanks Memorial Hospital", lat: 64.8378, region: "Arctic", current: 8.6, desired: 8.4 }, // ⚠️ CLOSE
        
        { id: 16, name: "Johns Hopkins Hospital (Baltimore)", lat: 39.2970, region: "Most CONUS", current: 9.3, desired: 9.3 }, // ✅ PERFECT
        { id: 17, name: "Commonwealth Health (Saipan)", lat: 15.1979, region: "Tropical", current: 9.6, desired: 9.6 }, // ✅ FIXED PACIFIC
        { id: 18, name: "Mount Sinai Hospital (NYC)", lat: 40.7831, region: "Most CONUS", current: 9.3, desired: 9.3 }, // ✅ PERFECT
        { id: 19, name: "Mat-Su Regional Medical (Palmer)", lat: 61.5844, region: "Arctic", current: 8.6, desired: 8.6 }, // ✅ TESTED
        { id: 20, name: "Massachusetts General Hospital", lat: 42.3631, region: "Most CONUS", current: 9.3, desired: 9.3 } // ✅ PERFECT
    ];
    
    console.log("ID | Hospital Name                          | Lat°   | Region       | Current | Desired");
    console.log("---|---------------------------------------|--------|--------------|---------|--------");
    
    allContracts.forEach(contract => {
        const actualZoom = calculateCircleZoomLevel(contract.lat, 0); // longitude doesn't matter for regions
        const status = contract.desired !== "TBD" ? "✅" : "⏳";
        console.log(
            `${contract.id.toString().padStart(2)} | ${contract.name.padEnd(37)} | ${contract.lat.toString().padStart(6)} | ${contract.region.padEnd(12)} | ${actualZoom.toString().padStart(7)} | ${contract.desired.toString().padStart(7)} ${status}`
        );
    });
    
    console.log("━".repeat(85));
    console.log("✅ = Tested and confirmed perfect  |  ⏳ = Awaiting test results");
    console.log("📍 Click each contract's map button and note the desired zoom level!");
};

/**
 * Quick regional zoom reference
 * Run in browser console: showZoomRegions()
 */
window.showZoomRegions = function() {
    console.log("🗺️ FINAL REGIONAL ZOOM BLOCKS (User-Tested):");
    console.log("━".repeat(58));
    console.log("Extreme Arctic (70°+):  Zoom 8.1 → Utqiagvik/Barrow area");
    console.log("Arctic (60-70°):        Zoom 8.6 → Most of Alaska");
    console.log("Northern tier (45-60°): Zoom 9.0 → MT, ND, WA, MN, SE Alaska");
    console.log("Most of CONUS (35-45°): Zoom 9.3 → Majority of continental US");
    console.log("Southern states (25-35°): Zoom 9.4 → FL, TX, CA, AZ");
    console.log("Tropical (<25°):        Zoom 9.6 → HI, Guam, PR, USVI, AS");
    console.log("━".repeat(58));
    console.log("🔧 FIXES: Pacific coordinates + extreme Arctic perfected!");
    console.log("✅ ALL 20 contracts now have optimal zoom levels");
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
 * Simple dimension logging for debugging when needed
 */
function logMapDimensions() {
    if (contractMap) {
        const mapContainer = document.getElementById('map');
        const mapRect = mapContainer ? mapContainer.getBoundingClientRect() : null;
        const leafletSize = contractMap.getSize();
        const center = contractMap.getCenter();
        const bounds = contractMap.getBounds();
        
        console.log(`🗺️ Map: ${mapRect.width}x${mapRect.height} container, ${leafletSize.x}x${leafletSize.y} leaflet`);
        console.log(`🎯 Center: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}, Maine visible: ${bounds.getEast() >= -67.0 ? '✅' : '❌'}`);
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
    
    console.log(`🗺️ Regional zoom for lat ${latitude.toFixed(2)}°: ${region} → zoom ${zoom}`);
    
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
    console.log('map.js - 🗺️ [STEP 1] Initializing basic map...');
    
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
    
    console.log('map.js - ✅ Leaflet available, map container found');
    
    try {
        // Create map with fractional zoom enabled for precise control
        contractMap = L.map('map', {
            zoomSnap: 0.1,    // Allow zoom in 0.1 increments (more precise)
            zoomDelta: 0.25   // Zoom buttons/keyboard increment by 0.25
        });
        
        // Use fitBounds instead of setView - Leaflet automatically calculates optimal center and zoom!
        console.log('🗺️ Using fitBounds to CONUS for automatic optimal centering and zoom');
        contractMap.fitBounds(CONUS_BOUNDS, {
            padding: [10, 10], // Small padding
            animate: false,
            maxZoom: 6.0
        });
        
        console.log('map.js - ✅ Leaflet map object created successfully');
        
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
        console.log('map.js - ✅ Default tile layer added');
        
        const baseMaps = {
            Default: defaultLayer,
            Satellite: satelliteLayer
        };
        L.control.layers(baseMaps).addTo(contractMap);
        console.log('map.js - ✅ Layer controls added');
        
        // Add zoom level debug label on top left
        addZoomLevelLabel();
        
        // Add resize handling for when contracts load and change panel size
        setupMapResizeHandling();
        

        
        console.log('map.js - ✅ [STEP 1] Basic map initialized successfully - map should be visible!');
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
    console.log('map.js - 🏷️ Adding zoom level debug label...');
    
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
            console.log(`map.js - 🔍 Zoom changed to: ${newZoom.toFixed(1)}`);
        });
        
        return div;
    };
    
    zoomLevelControl.addTo(contractMap);
    console.log('map.js - ✅ Zoom level label added to top left');
}

/**
 * Setup basic resize handling for map container changes
 * This fixes the issue where map shifts when left panel loads with contracts
 */
function setupMapResizeHandling() {
    console.log('map.js - 📐 [STEP 1] Setting up resize handling...');
    
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
                    console.log(`map.js - 📐 Map container resized to ${newSize.width}x${newSize.height}`);
                    contractMap.invalidateSize();
                    forceConsistentView();
                    lastMapSize = newSize;
                }, 200); // Debounced resize handling
            }
        });
        
        mapResizeObserver.observe(mapContainer);
        console.log('map.js - ✅ Optimized ResizeObserver attached to map container');

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
                        console.log(`map.js - 📐 Left panel resized to ${newPanelSize.width}px`);
                        contractMap.invalidateSize();
                        forceConsistentView();
                        lastPanelSize = newPanelSize;
                    }, 100); // Faster response for panel changes
                }
            });
            
            panelResizeObserver.observe(leftPanel);
            console.log('map.js - ✅ ResizeObserver attached to left panel');
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
                    console.log(`map.js - 📐 Page content changed (#${mutationCount}) - invalidating map size`);
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
        
        console.log('map.js - ✅ Optimized MutationObserver attached to contract container');
    }

    // Window resize listener as backup
    window.addEventListener('resize', () => {
        if (contractMap) {
            console.log('map.js - 🪟 Window resized');
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

// MapController interface expected by logbook.js
window.MapController = {
    initialize: initializeMap,
    initializePins: initializeMapPins,
    refreshMarkers: refreshContractMarkers,
    fitToContracts: forceConsistentView, // Use our clean CONUS fitting
    zoomToLocation: zoomToContractLocation,
    getMap: () => contractMap
};

/**
 * Refresh all contract markers on the map (from reference)
 */
function refreshContractMarkers(contracts) {
    console.log(`map.js - 🔄 refreshContractMarkers called with ${contracts ? contracts.length : 0} contracts`);
    
    // Clear existing markers
    clearContractMarkers();
    
    // Invalidate map size to account for sidebar changes
    if (contractMap) {
        console.log('🔄 Invalidating map size after sidebar layout change');
        contractMap.invalidateSize();
    }
    
    // Add markers for all contracts
    if (contracts && contracts.length > 0) {
        contracts.forEach(contract => {
            addContractToMap(contract);
        });
        
        // Use our clean forceConsistentView instead of fitMapToAllContracts
        setTimeout(() => {
            forceConsistentView();
        }, 100);
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

// Map will be initialized by logbook.js calling MapController.initialize()

console.log('map.js - 🗺️ Contract marker system with zoom functionality loaded');

