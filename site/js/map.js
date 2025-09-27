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

//=============================================================================
// MAP INITIALIZATION
//=============================================================================

/**
 * Initialize the main Leaflet map with layers
 */
function initializeMap() {
    console.log('🗺️ Initializing map...');
    
    // Create map centered on US
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
    
    console.log('✅ Map initialized successfully');
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
 * Refresh all contract markers on the map
 */
function refreshContractMarkers(contracts) {
    console.log('🔄 Refreshing contract markers:', contracts?.length || 0, 'contracts');
    
    // Clear existing markers
    clearContractMarkers();
    
    // Invalidate map size to account for layout changes
    if (contractMap) {
        contractMap.invalidateSize();
    }
    
    // Add new markers
    if (contracts && contracts.length > 0) {
        contracts.forEach(contract => {
            addContractToMap(contract);
        });
        
        // Auto-fit map after brief delay
        setTimeout(() => {
            fitMapToAllContracts(contracts, true);
        }, 100);
    }
    
    console.log('✅ Contract markers refreshed');
}

//=============================================================================
// MAP VIEW UTILITIES
//=============================================================================

/**
 * Fit map view to show all contracts with simple bounds calculation
 */
function fitMapToAllContracts(contracts, animate = true) {
    console.log('🎯 Fitting map to contracts:', contracts?.length || 0);
    
    if (!contractMap) {
        console.error('❌ Map not initialized');
        return;
    }
    
    if (!contracts || contracts.length === 0) {
        // Default to US view
        contractMap.setView([39.8283, -98.5795], 4);
        return;
    }
    
    // Get valid coordinates with longitude correction
    const bounds = [];
    contracts.forEach(contract => {
        const lat = parseFloat(contract.latitude);
        let lng = parseFloat(contract.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
            lng = correctLongitudeForDisplay(lng);
            bounds.push([lat, lng]);
        }
    });
    
    if (bounds.length === 0) {
        contractMap.setView([39.8283, -98.5795], 4);
        return;
    }
    
    if (bounds.length === 1) {
        // Single contract - zoom to location
        contractMap.setView(bounds[0], 8);
    } else {
        // Multiple contracts - fit bounds
        const leafletBounds = L.latLngBounds(bounds);
        contractMap.fitBounds(leafletBounds, { 
            padding: [20, 20],
            animate: animate 
        });
    }
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