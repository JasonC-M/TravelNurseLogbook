//=============================================================================
// MAP FUNCTIONALITY - Travel Nurse Logbook
// Clean, organized map operations for contract visualization
//=============================================================================

//=============================================================================
// GLOBAL VARIABLES
//=============================================================================
let contractMap;
let contractMarkers = [];
let contractCircles = [];
let customMapIcon = null;
let smartBoxOverlay = null;

//=============================================================================
// MAP INITIALIZATION
//=============================================================================

/**
 * Initialize the main Leaflet map with layers
 */
function initializeMap() {
    console.log('🗺️ [STEP 1] Initializing blank map...');
    
    // Create map centered on CONUS as initial state
    contractMap = L.map('map').setView([39.8283, -98.5795], 4);

    // Define map layers
    const defaultLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri'
    });

    // Add default layer and layer control
    defaultLayer.addTo(contractMap);
    
    const baseMaps = {
        Default: defaultLayer,
        Satellite: satelliteLayer
    };
    L.control.layers(baseMaps).addTo(contractMap);
    
    // Initialize smart box system
    initializeSmartBoxSystem();
    
    console.log('✅ [STEP 1] Map initialized - centered on CONUS, waiting for contracts...');
}

/**
 * Initialize event handlers for map pin buttons (uses event delegation)
 * Called from logbook.js initializeSortButtons()
 */
function initializeMapPins() {
    console.log('📍 Map pins initialized via event delegation in logbook.js');
    // Event delegation is handled in logbook.js for dynamically created buttons
}

//=============================================================================
// MARKER AND CIRCLE MANAGEMENT
//=============================================================================

/**
 * Correct longitude for West Pacific locations to display on correct side of map
 * Converts West Pacific longitudes (140°E to 180°E) to negative values for US-centered view
 */
function correctLongitudeForDisplay(lng, logCorrection = false) {
    // Convert West Pacific longitudes to display on the west side when US-centered
    if (lng > 140) {
        const corrected = lng - 360;
        if (logCorrection) {
            console.log('🌏 West Pacific longitude correction:', { original: lng, corrected });
        }
        return corrected;
    }
    return lng;
}

/**
 * Create custom map icon for contract markers
 */
function createCustomMapIcon() {
    if (!customMapIcon) {
        customMapIcon = L.icon({
            iconUrl: 'images/map_pin.png',
            iconSize: [25, 25],
            iconAnchor: [12, 25],
            popupAnchor: [0, -25]
        });
    }
    return customMapIcon;
}

/**
 * Determine circle color based on contract end date
 */
function getCircleColor(endDate) {
    if (!endDate) return '#3498db'; // Default blue
    
    const end = new Date(endDate);
    const now = new Date();
    const diffMonths = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    
    if (end < now) return '#95a5a6';        // Past contracts: gray
    if (diffMonths <= 1) return '#e74c3c';  // Ending soon: red
    if (diffMonths <= 3) return '#f39c12';  // Ending in 3 months: orange
    return '#27ae60';                        // Future contracts: green
}

/**
 * Add a single contract to the map with marker and circle
 */
function addContractToMap(contract) {
    console.log('📍 Adding contract to map:', contract.facility);
    
    if (!contract.latitude || !contract.longitude) {
        console.warn('⚠️ Contract missing coordinates:', contract.facility);
        return;
    }

    const lat = parseFloat(contract.latitude);
    let lng = parseFloat(contract.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        console.error('❌ Invalid coordinates for contract:', contract.facility);
        return;
    }

    // Correct West Pacific longitude for proper display
    lng = correctLongitudeForDisplay(lng, true); // Log corrections during marker creation

    // Create marker
    const marker = L.marker([lat, lng], { icon: createCustomMapIcon() })
        .addTo(contractMap)
        .bindPopup(`
            <div class="contract-popup">
                <h4>${contract.facility}</h4>
                <p><strong>Location:</strong> ${contract.city}, ${contract.state}</p>
                <p><strong>Dates:</strong> ${contract.start_date} → ${contract.end_date}</p>
                <p><strong>Specialty:</strong> ${contract.specialty}</p>
            </div>
        `);

    // Create 50-mile radius circle
    const circleColor = getCircleColor(contract.end_date);
    const circle = L.circle([lat, lng], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.1,
        radius: 80467.2 // 50 miles in meters
    }).addTo(contractMap);

    // Store references
    contractMarkers.push(marker);
    contractCircles.push(circle);
}

/**
 * Clear all contract markers and circles from map
 */
function clearContractMarkers() {
    console.log('🧹 Clearing contract markers and circles');
    
    contractMarkers.forEach(marker => contractMap.removeLayer(marker));
    contractCircles.forEach(circle => contractMap.removeLayer(circle));
    
    contractMarkers = [];
    contractCircles = [];
}

/**
 * Main orchestrator function - follows proper order of operations
 */
function refreshContractMarkers(contracts) {
    console.log('🔄 [STEP 2] Contract refresh started - following proper sequence');
    executeMapUpdateSequence(contracts, 'contract-refresh');
}

/**
 * Execute the proper map update sequence for any trigger
 */
function executeMapUpdateSequence(contracts, trigger) {
    console.log(`🎯 [SEQUENCE] Starting map update sequence for: ${trigger}`, {
        contractCount: contracts?.length || 0,
        mapReady: !!contractMap
    });
    
    if (!contractMap) {
        console.error('❌ Map not ready for sequence');
        return;
    }
    
    // STEP 2: Clear existing state
    console.log('🧹 [STEP 2] Clearing existing markers and overlays...');
    clearContractMarkers();
    hideSmartBoxOverlay();
    
    // STEP 3: Place all contract pins (always visible regardless of filters)
    if (contracts && contracts.length > 0) {
        console.log('📍 [STEP 3] Placing all contract pins on map...');
        contracts.forEach((contract, index) => {
            addContractToMap(contract);
        });
        console.log(`✅ [STEP 3] ${contracts.length} contract pins placed`);
        
        // STEP 4: Apply regional filtering and calculate smart box
        console.log('🎯 [STEP 4] Applying regional filters and calculating smart box...');
        const filteredContracts = filterContractsByPreferences(contracts);
        
        if (filteredContracts.length > 0) {
            // STEP 5: Draw smart box based on filtered contracts
            console.log('📦 [STEP 5] Drawing smart box around filtered contracts...');
            const smartBox = calculateSmartBox(filteredContracts);
            showSmartBoxOverlay(smartBox);
            
            // STEP 6: Center and zoom to smart box (with delay to ensure rendering)
            setTimeout(() => {
                console.log('🎯 [STEP 6] Centering and zooming to smart box...');
                fitMapToSmartBox(smartBox, trigger !== 'resize');
            }, 100);
        } else {
            // No filtered contracts - fall back to CONUS
            console.log('🏠 [FALLBACK] No filtered contracts - centering on CONUS');
            setTimeout(() => {
                contractMap.setView([39.8283, -98.5795], 4, { animate: trigger !== 'resize' });
            }, 100);
        }
    } else {
        // No contracts at all - fall back to CONUS
        console.log('🏠 [FALLBACK] No contracts loaded - centering on CONUS');
        contractMap.setView([39.8283, -98.5795], 4, { animate: trigger !== 'resize' });
    }
}

/**
 * Fit map to smart box with custom zoom calculation to fill screen
 */
function fitMapToSmartBox(smartBox, animate = true) {
    // Get map dimensions in pixels
    const mapSize = contractMap.getSize();
    const mapWidthPx = mapSize.x;
    const mapHeightPx = mapSize.y;
    
    // Calculate GPS spans and geographic center (for debugging)
    const latSpan = smartBox.latMax - smartBox.latMin;
    const lngSpan = smartBox.lngMax - smartBox.lngMin;
    const geographicCenterLat = (smartBox.latMax + smartBox.latMin) / 2;
    const geographicCenterLng = (smartBox.lngMax + smartBox.lngMin) / 2;
    
    // Calculate VISUAL center by converting to pixels, finding center, then back to coords
    // This accounts for Mercator projection distortion
    const bounds = L.latLngBounds([
        [smartBox.latMin, smartBox.lngMin],
        [smartBox.latMax, smartBox.lngMax]
    ]);
    
    // Get pixel bounds of the smart box
    const topLeftPoint = contractMap.latLngToContainerPoint([smartBox.latMax, smartBox.lngMin]);
    const bottomRightPoint = contractMap.latLngToContainerPoint([smartBox.latMin, smartBox.lngMax]);
    
    // Calculate pixel center
    const centerPixelX = (topLeftPoint.x + bottomRightPoint.x) / 2;
    const centerPixelY = (topLeftPoint.y + bottomRightPoint.y) / 2;
    
    // Convert pixel center back to coordinates - this is the TRUE visual center
    const visualCenter = contractMap.containerPointToLatLng([centerPixelX, centerPixelY]);
    const centerLat = visualCenter.lat;
    const centerLng = visualCenter.lng;
    
    console.log('🎯 [CENTER] Geographic vs Visual center comparison:', {
        mapSize: { width: mapWidthPx, height: mapHeightPx },
        gpsSpan: { lat: latSpan.toFixed(4), lng: lngSpan.toFixed(4) },
        geographicCenter: { lat: geographicCenterLat.toFixed(6), lng: geographicCenterLng.toFixed(6) },
        visualCenter: { lat: centerLat.toFixed(6), lng: centerLng.toFixed(6) },
        difference: { 
            lat: (centerLat - geographicCenterLat).toFixed(6), 
            lng: (centerLng - geographicCenterLng).toFixed(6) 
        }
    });
    
    // Add debugging marker to show where we're centering (remove this after testing)
    if (window.debugCenterMarker) {
        contractMap.removeLayer(window.debugCenterMarker);
    }
    window.debugCenterMarker = L.marker([centerLat, centerLng], {
        icon: L.divIcon({
            html: '🎯',
            className: 'center-debug-marker',
            iconSize: [20, 20]
        })
    }).addTo(contractMap);
    
    // Calculate zoom level to fit the box with proper padding for contracts
    // The smart box includes a buffer, so we need to zoom out slightly to ensure
    // the actual contracts (which are inside the buffer) are fully visible
    
    const degreesPerPixelLat = latSpan / mapHeightPx;
    const degreesPerPixelLng = lngSpan / mapWidthPx;
    
    // Use the larger degrees-per-pixel value (more restrictive) to ensure both dimensions fit
    const requiredDegreesPerPixel = Math.max(degreesPerPixelLat, degreesPerPixelLng);
    
    // Calculate zoom: At zoom 0, whole world (360°) = 256px
    // At zoom z: degrees per pixel = 360 / (256 * 2^z)
    const calculatedZoom = Math.log2(360 / (256 * requiredDegreesPerPixel));
    
    // Add padding by reducing zoom level for two reasons:
    // 1. Ensure contracts inside the buffered box are visible (0.3 zoom reduction)
    // 2. Add small buffer between box edges and panel edges (additional 0.1 zoom reduction)
    const finalZoom = Math.max(2, calculatedZoom - 0.4);
    
    console.log('🔍 [ZOOM] Box-to-screen calculation:', {
        mapSize: `${mapWidthPx}×${mapHeightPx}px`,
        boxSpan: `${latSpan.toFixed(4)}° × ${lngSpan.toFixed(4)}°`,
        degreesPerPixel: { lat: degreesPerPixelLat.toFixed(6), lng: degreesPerPixelLng.toFixed(6) },
        requiredDPP: requiredDegreesPerPixel.toFixed(6),
        calculatedZoom: calculatedZoom.toFixed(2),
        finalZoom: finalZoom.toFixed(2),
        strategy: 'Zoom with padding: contracts visible + box-to-panel buffer'
    });
    
    // Set view to center of box with calculated zoom
    contractMap.setView([centerLat, centerLng], finalZoom, {
        animate: animate
    });
    
    // Log final result after animation completes
    setTimeout(() => {
        const finalBounds = contractMap.getBounds();
        console.log('✅ [ZOOM] Final map state:', {
            zoom: contractMap.getZoom().toFixed(2),
            center: contractMap.getCenter(),
            actualBounds: finalBounds.toBBoxString(),
            paddedFit: 'Box centered with 20px padding on all sides'
        });
    }, animate ? 500 : 100);
}

//=============================================================================
// SMART BOX AND FILTERING
//=============================================================================

// Region coordinate boundaries for contract filtering
const REGION_BOUNDARIES = {
    'conus': { latMin: 24.396308, latMax: 49.384358, lngMin: -125.0, lngMax: -66.93457 },
    'alaska': { latMin: 54.0, latMax: 72.0, lngMin: -180.0, lngMax: -129.0 },
    'hawaii': { latMin: 18.9, latMax: 22.2, lngMin: -161.0, lngMax: -154.0 },
    'puerto-rico': { latMin: 17.8, latMax: 18.6, lngMin: -67.3, lngMax: -65.2 },
    'us-virgin-islands': { latMin: 17.6, latMax: 18.4, lngMin: -65.1, lngMax: -64.5 },
    'guam': { latMin: 13.2, latMax: 13.7, lngMin: 144.6, lngMax: 145.0 },
    'american-samoa': { latMin: -14.4, latMax: -14.1, lngMin: -171.1, lngMax: -169.4 },
    'northern-mariana': { latMin: 14.1, latMax: 20.6, lngMin: 144.9, lngMax: 146.1 },
    'canada': { latMin: 41.7, latMax: 83.1, lngMin: -141.0, lngMax: -52.6 },
    'mexico': { latMin: 14.5, latMax: 32.7, lngMin: -118.4, lngMax: -86.7 },
    'caribbean': { latMin: 10.0, latMax: 27.0, lngMin: -85.0, lngMax: -59.0 },
    'europe': { latMin: 35.0, latMax: 71.0, lngMin: -25.0, lngMax: 45.0 },
    'asia-pacific': { latMin: -50.0, latMax: 50.0, lngMin: 95.0, lngMax: 180.0 },
    'other-international': null // Catch-all for contracts not in other regions
};

/**
 * Get current user preferences for map regions
 */
function getUserMapPreferences() {
    const preferences = {};
    const regions = [
        'conus', 'alaska', 'hawaii', 'puerto-rico', 'us-virgin-islands',
        'guam', 'american-samoa', 'northern-mariana', 'canada', 'mexico',
        'caribbean', 'europe', 'asia-pacific', 'other-international'
    ];
    
    regions.forEach(region => {
        const checkbox = document.getElementById(`pref-${region}`);
        preferences[region] = checkbox ? checkbox.checked : false;
    });
    
    console.log('🗺️ Current user map preferences:', preferences);
    return preferences;
}

/**
 * Determine which region a contract belongs to based on coordinates
 */
function getContractRegion(contract) {
    const lat = parseFloat(contract.latitude);
    const lng = parseFloat(contract.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        return 'other-international';
    }
    
    // Check each region boundary
    for (const [regionName, bounds] of Object.entries(REGION_BOUNDARIES)) {
        if (bounds === null) continue; // Skip other-international
        
        if (lat >= bounds.latMin && lat <= bounds.latMax && 
            lng >= bounds.lngMin && lng <= bounds.lngMax) {
            return regionName;
        }
    }
    
    return 'other-international';
}

/**
 * Filter contracts based on user region preferences
 */
function filterContractsByPreferences(contracts) {
    if (!contracts || contracts.length === 0) {
        return [];
    }
    
    const preferences = getUserMapPreferences();
    const filtered = contracts.filter(contract => {
        const region = getContractRegion(contract);
        const isIncluded = preferences[region] === true;
        
        console.log(`📍 Contract ${contract.facility}: region=${region}, included=${isIncluded}`);
        return isIncluded;
    });
    
    console.log(`🎯 Filtered ${contracts.length} contracts → ${filtered.length} contracts`);
    return filtered;
}

/**
 * Calculate smart box bounds around filtered contracts with buffer
 */
function calculateSmartBox(contracts) {
    if (!contracts || contracts.length === 0) {
        console.log('📦 No contracts for smart box - using CONUS default');
        return REGION_BOUNDARIES.conus;
    }
    
    // Get valid coordinates with longitude correction
    const coords = [];
    contracts.forEach(contract => {
        const lat = parseFloat(contract.latitude);
        let lng = parseFloat(contract.longitude);
        const originalLng = lng;
        
        if (!isNaN(lat) && !isNaN(lng)) {
            lng = correctLongitudeForDisplay(lng);
            coords.push({ 
                lat, 
                lng, 
                originalLng,
                facility: contract.facility,
                city: contract.city,
                state: contract.state
            });
        }
    });
    
    console.log('🌍 [DEBUG] All contract GPS coordinates:', coords.map(c => ({
        location: `${c.facility} (${c.city}, ${c.state})`,
        lat: c.lat.toFixed(4),
        lng: c.lng.toFixed(4),
        originalLng: c.originalLng.toFixed(4)
    })));
    
    if (coords.length === 0) {
        console.log('📦 No valid coordinates for smart box');
        return REGION_BOUNDARIES.conus;
    }
    
    // Calculate initial bounds from GPS coordinates
    const lats = coords.map(c => c.lat);
    const lngs = coords.map(c => c.lng);
    
    const rawBox = {
        latMin: Math.min(...lats),
        latMax: Math.max(...lats),
        lngMin: Math.min(...lngs),
        lngMax: Math.max(...lngs)
    };
    
    console.log('📐 [DEBUG] Raw GPS bounds calculation:', {
        northernmost: `${Math.max(...lats).toFixed(4)}° (${coords.find(c => c.lat === Math.max(...lats))?.facility})`,
        southernmost: `${Math.min(...lats).toFixed(4)}° (${coords.find(c => c.lat === Math.min(...lats))?.facility})`,
        easternmost: `${Math.max(...lngs).toFixed(4)}° (${coords.find(c => c.lng === Math.max(...lngs))?.facility})`,
        westernmost: `${Math.min(...lngs).toFixed(4)}° (${coords.find(c => c.lng === Math.min(...lngs))?.facility})`,
        gpsSpan: {
            latDegrees: (rawBox.latMax - rawBox.latMin).toFixed(4),
            lngDegrees: (rawBox.lngMax - rawBox.lngMin).toFixed(4)
        }
    });
    
    // Calculate buffer based on pixel distance to avoid Mercator distortion issues
    // At higher latitudes, degrees appear more stretched, so we need pixel-based buffer
    const latSpan = rawBox.latMax - rawBox.latMin;
    const lngSpan = rawBox.lngMax - rawBox.lngMin;
    const centerLat = (rawBox.latMax + rawBox.latMin) / 2;
    
    // Get map size in pixels for buffer calculation
    const mapSize = contractMap ? contractMap.getSize() : { x: 1000, y: 600 };
    const targetBufferPixels = 50; // 50px buffer on all sides
    
    // Calculate degrees per pixel at the center latitude
    // This accounts for Mercator distortion
    const degreesPerPixelLat = latSpan / mapSize.y;
    const degreesPerPixelLng = lngSpan / mapSize.x;
    
    // Calculate buffer in degrees based on target pixel buffer
    const latBuffer = Math.min(Math.max(degreesPerPixelLat * targetBufferPixels, 0.1), 2.0);
    const lngBuffer = Math.min(Math.max(degreesPerPixelLng * targetBufferPixels, 0.1), 2.0);
    
    console.log('📐 [DEBUG] Pixel-based buffer calculation:', {
        rawSpan: { lat: latSpan.toFixed(4), lng: lngSpan.toFixed(4) },
        centerLat: centerLat.toFixed(4),
        mapSize: `${mapSize.x}×${mapSize.y}px`,
        degreesPerPixel: { lat: degreesPerPixelLat.toFixed(6), lng: degreesPerPixelLng.toFixed(6) },
        targetPixelBuffer: `${targetBufferPixels}px`,
        finalBuffer: { lat: latBuffer.toFixed(4), lng: lngBuffer.toFixed(4) },
        mercatorCorrected: 'Buffer accounts for projection distortion'
    });
    
    const smartBox = {
        latMin: rawBox.latMin - latBuffer,
        latMax: rawBox.latMax + latBuffer,
        lngMin: rawBox.lngMin - lngBuffer,
        lngMax: rawBox.lngMax + lngBuffer
    };
    
    console.log('📦 Smart box calculated:', { 
        rawBox, 
        smartBox, 
        buffer: { lat: latBuffer, lng: lngBuffer },
        contracts: coords.length,
        contractFacilities: coords.map(c => c.facility)
    });
    
    return smartBox;
}

/**
 * Calculate precise fractional zoom level so smart box edges touch map panel edges
 */
function calculatePreciseZoomForSmartBox(smartBox) {
    if (!contractMap) {
        console.warn('⚠️ Map not available for zoom calculation');
        return 4;
    }
    
    // Get map container dimensions in pixels (excluding any UI padding)
    const mapSize = contractMap.getSize();
    const mapWidth = mapSize.x;
    const mapHeight = mapSize.y;
    
    // Calculate smart box dimensions in degrees
    const boxLatSpan = smartBox.latMax - smartBox.latMin;
    const boxLngSpan = smartBox.lngMax - smartBox.lngMin;
    
    console.log('📦 Smart box dimensions:', {
        latSpan: boxLatSpan.toFixed(4),
        lngSpan: boxLngSpan.toFixed(4),
        bounds: smartBox
    });
    
    // Calculate center point
    const centerLat = (smartBox.latMin + smartBox.latMax) / 2;
    const centerLng = (smartBox.lngMin + smartBox.lngMax) / 2;
    
    // Use Leaflet's built-in projection methods for accurate calculations
    const southWest = L.latLng(smartBox.latMin, smartBox.lngMin);
    const northEast = L.latLng(smartBox.latMax, smartBox.lngMax);
    const bounds = L.latLngBounds(southWest, northEast);
    
    // Calculate zoom level that fits the bounds exactly to the map size
    const zoom = contractMap.getBoundsZoom(bounds, false); // false = no padding
    
    console.log('🔍 Precise zoom calculation:', {
        mapSize: { width: mapWidth, height: mapHeight },
        center: { lat: centerLat.toFixed(4), lng: centerLng.toFixed(4) },
        calculatedZoom: zoom.toFixed(2)
    });
    
    // Clamp to reasonable bounds
    const finalZoom = Math.max(2, Math.min(18, zoom));
    
    return finalZoom;
}

/**
 * Add or update the orange smart box overlay for debugging
 */
function showSmartBoxOverlay(bounds) {
    // Remove existing overlay
    if (smartBoxOverlay && contractMap) {
        contractMap.removeLayer(smartBoxOverlay);
    }
    
    if (!bounds || !contractMap) return;
    
    // Create orange rectangle overlay
    const rectangle = L.rectangle([
        [bounds.latMin, bounds.lngMin],
        [bounds.latMax, bounds.lngMax]
    ], {
        color: '#ff7800',
        weight: 3,
        fillColor: '#ff7800',
        fillOpacity: 0.1
    });
    
    smartBoxOverlay = rectangle.addTo(contractMap);
    console.log('🟠 Smart box overlay added:', bounds);
}

/**
 * Remove the smart box overlay
 */
function hideSmartBoxOverlay() {
    if (smartBoxOverlay && contractMap) {
        contractMap.removeLayer(smartBoxOverlay);
        smartBoxOverlay = null;
        console.log('🟠 Smart box overlay removed');
    }
}

//=============================================================================
// MAP VIEW UTILITIES
//=============================================================================

/**
 * Legacy function - redirects to new orchestrated sequence
 */
function fitMapToAllContracts(contracts, animate = true) {
    console.log('� [LEGACY] fitMapToAllContracts called - redirecting to orchestrated sequence');
    executeMapUpdateSequence(contracts, 'legacy-call');
}

/**
 * Debounced function for handling map updates on resize
 */
let resizeTimeout;
function handleMapResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (contractMap) {
            console.log('🔄 [TRIGGER] Window resize detected');
            contractMap.invalidateSize();
            
            const contracts = window.logbookApp ? window.logbookApp.contracts : [];
            if (contracts && contracts.length > 0) {
                executeMapUpdateSequence(contracts, 'resize');
            }
        }
    }, 300);
}

/**
 * Initialize smart box system with resize handling
 */
function initializeSmartBoxSystem() {
    // Add resize event listener
    window.addEventListener('resize', handleMapResize);
    console.log('📦 Smart box system initialized with resize handling');
}

/**
 * Update smart box when preferences change
 */
function updateSmartBoxOnPreferenceChange() {
    console.log('🔄 [TRIGGER] Regional preferences changed');
    const contracts = window.logbookApp ? window.logbookApp.contracts : [];
    if (contracts && contracts.length > 0) {
        executeMapUpdateSequence(contracts, 'preference-change');
    }
}

/**
 * Update smart box when contracts are added/edited/deleted
 */
function updateSmartBoxOnContractChange() {
    console.log('🔄 [TRIGGER] Contract data changed');
    const contracts = window.logbookApp ? window.logbookApp.contracts : [];
    executeMapUpdateSequence(contracts, 'contract-change');
}

/**
 * Zoom to a specific contract location
 */
function zoomToContractLocation(latitude, longitude) {
    console.log('📍 Zooming to location:', { latitude, longitude });
    
    if (!contractMap) {
        console.error('❌ Map not initialized');
        return;
    }
    
    const lat = parseFloat(latitude);
    let lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
        console.error('❌ Invalid coordinates:', { latitude, longitude });
        return;
    }
    
    // Correct West Pacific longitude for proper zoom location
    lng = correctLongitudeForDisplay(lng);
    
    contractMap.setView([lat, lng], 8);
    
    // Blink the circle after zooming (using corrected coordinates)
    setTimeout(() => {
        blinkContractCircle(lat, lng);
    }, 500);
}

//=============================================================================
// VISUAL EFFECTS
//=============================================================================

/**
 * Find contract circle at specific coordinates
 */
function findContractCircle(latitude, longitude) {
    const targetLat = parseFloat(latitude);
    let targetLng = parseFloat(longitude);
    
    // Apply same longitude correction for matching
    targetLng = correctLongitudeForDisplay(targetLng);
    
    return contractCircles.find(circle => {
        const circleLatLng = circle.getLatLng();
        const latDiff = Math.abs(circleLatLng.lat - targetLat);
        const lngDiff = Math.abs(circleLatLng.lng - targetLng);
        return latDiff < 0.001 && lngDiff < 0.001; // Close enough match
    });
}

/**
 * Create blinking effect for contract circle
 */
function blinkContractCircle(latitude, longitude) {
    console.log('✨ Blinking circle at:', { latitude, longitude });
    
    const circle = findContractCircle(latitude, longitude);
    if (!circle) {
        console.warn('⚠️ Circle not found for blinking');
        return;
    }
    
    const originalColor = circle.options.color;
    const originalFillColor = circle.options.fillColor;
    let blinkCount = 0;
    
    const blinkInterval = setInterval(() => {
        if (blinkCount % 2 === 0) {
            circle.setStyle({ color: '#ff0000', fillColor: '#ff0000' });
        } else {
            circle.setStyle({ color: originalColor, fillColor: originalFillColor });
        }
        
        blinkCount++;
        if (blinkCount >= 6) { // 3 blinks
            clearInterval(blinkInterval);
            circle.setStyle({ color: originalColor, fillColor: originalFillColor });
        }
    }, 300);
}

//=============================================================================
// PUBLIC API
//=============================================================================

// MapController interface for external modules
window.MapController = {
    initialize: initializeMap,
    initializePins: initializeMapPins,
    refreshMarkers: refreshContractMarkers,
    fitToContracts: fitMapToAllContracts,
    zoomToLocation: zoomToContractLocation,
    updateSmartBox: updateSmartBoxOnPreferenceChange,
    updateOnContractChange: updateSmartBoxOnContractChange,
    getMap: () => contractMap
};

// Individual function exports for backward compatibility
window.initializeMap = initializeMap;
window.initializeMapPins = initializeMapPins;
window.refreshContractMarkers = refreshContractMarkers;
window.setContracts = refreshContractMarkers; // Alias for backward compatibility
window.fitMapToAllContracts = fitMapToAllContracts;
window.zoomToContractLocation = zoomToContractLocation;

console.log('🗺️ Map module loaded successfully');