//=============================================================================
// MAP FUNCTIONALITY - Travel Nurse Logbook
// Handles all map-related operations including markers, circles, and interactions
//=============================================================================

let contractMap;

// Get user map preferences for smart zoom filtering
function getUserMapPreferences() {
    // Try to get preferences from profile manager
    if (window.profileManager && window.profileManager.getMapPreferences) {
        return window.profileManager.getMapPreferences();
    }
    
    // Default preferences if profile manager not available
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

// Filter contracts based on user's regional preferences
function filterContractsByUserPreferences(contracts) {
    if (!contracts || contracts.length === 0) {
        return [];
    }

    const userPrefs = getUserMapPreferences();
    console.log('🔍 Filtering contracts with preferences:', userPrefs);
    console.log('🔍 Total contracts to filter:', contracts.length);

    const filteredContracts = contracts.filter(contract => {
        let lat = parseFloat(contract.latitude);
        let lng = parseFloat(contract.longitude);
        
        if (isNaN(lat) || isNaN(lng)) {
            return false; // Skip invalid coordinates
        }

        // Normalize Pacific coordinates consistently
        if (lng > 0 && lng <= 180) {
            lng = lng - 360;
        }

        // CONUS (Continental US): roughly 25-49°N, -125 to -66°W
        if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) {
            return userPrefs.conus;
        }
        
        // Alaska: roughly 55-72°N, -180 to -140°W
        if (lat >= 55 && lat <= 72 && lng >= -180 && lng <= -140) {
            return userPrefs.alaska;
        }
        
        // Hawaii: roughly 18-23°N, -162 to -154°W
        if (lat >= 18 && lat <= 23 && lng >= -162 && lng <= -154) {
            return userPrefs.hawaii;
        }
        
        // Puerto Rico: roughly 17.8-18.6°N, -67.3 to -65.2°W
        if (lat >= 17.8 && lat <= 18.6 && lng >= -67.3 && lng <= -65.2) {
            return userPrefs['puerto-rico'];
        }
        
        // US Virgin Islands: roughly 17.6-18.4°N, -65.1 to -64.5°W
        if (lat >= 17.6 && lat <= 18.4 && lng >= -65.1 && lng <= -64.5) {
            return userPrefs['us-virgin-islands'];
        }
        
        // Guam: roughly 13.2-13.7°N, 144.6-145.0°E (normalized to negative)
        if (lat >= 13.2 && lat <= 13.7 && lng >= -215.4 && lng <= -215.0) {
            return userPrefs.guam;
        }
        
        // American Samoa: roughly 14.1-14.4°S, -171.1 to -169.4°W
        if (lat >= -14.4 && lat <= -14.1 && lng >= -171.1 && lng <= -169.4) {
            return userPrefs['american-samoa'];
        }
        
        // Northern Mariana Islands: roughly 14.1-20.6°N, 144.9-146.1°E (normalized)
        if (lat >= 14.1 && lat <= 20.6 && lng >= -215.1 && lng <= -213.9) {
            return userPrefs['northern-mariana'];
        }
        
        // Canada: roughly 41.7-83.1°N, -141.0 to -52.6°W
        if (lat >= 41.7 && lat <= 83.1 && lng >= -141.0 && lng <= -52.6) {
            return userPrefs.canada;
        }
        
        // Mexico & Central America: roughly 14.5-32.7°N, -118.4 to -86.7°W
        if (lat >= 14.5 && lat <= 32.7 && lng >= -118.4 && lng <= -86.7) {
            return userPrefs.mexico;
        }
        
        // Caribbean (non-US): roughly 10.0-27.0°N, -85.0 to -59.0°W (excluding US territories)
        if (lat >= 10.0 && lat <= 27.0 && lng >= -85.0 && lng <= -59.0) {
            if ((lat >= 17.6 && lat <= 18.6 && lng >= -67.3 && lng <= -64.5)) return false;
            return userPrefs.caribbean;
        }
        
        // Europe: roughly 35.0-71.0°N, -25.0 to 45.0°E
        if (lat >= 35.0 && lat <= 71.0 && lng >= -25.0 && lng <= 45.0) {
            return userPrefs.europe;
        }
        
        // Asia & Pacific: roughly -50.0-80.0°N, 60.0-180.0°E (normalized to negative for Pacific)
        if ((lat >= -50.0 && lat <= 80.0 && lng >= 60.0 && lng <= 180.0) ||
            (lat >= -50.0 && lat <= 80.0 && lng >= -180.0 && lng <= -120.0)) {
            return userPrefs['asia-pacific'];
        }
        
        // Other International (catch-all for anywhere else)
        return userPrefs['other-international'];
    });

    console.log(`🎯 Filtered ${contracts.length} contracts down to ${filteredContracts.length} based on user preferences`);
    
    // Debug: Show which contracts are included vs excluded
    const includedContracts = filteredContracts.map(c => `${c.hospital_name} (${c.latitude}, ${c.longitude})`);
    const excludedContracts = contracts.filter(c => !filteredContracts.includes(c)).map(c => `${c.hospital_name} (${c.latitude}, ${c.longitude})`);
    console.log('✅ Included contracts:', includedContracts);
    console.log('❌ Excluded contracts:', excludedContracts);
    
    return filteredContracts;
}

// Initialize map with layer control
function initializeMap() {
    contractMap = L.map('map').setView([39.8283, -98.5795], 5); // Centered on US

    const defaultLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri'
    });

    // Add default layer to map
    defaultLayer.addTo(contractMap);

    // Create a layer control to switch between views
    const baseMaps = {
        Default: defaultLayer,
        Satellite: satelliteLayer
    };

    L.control.layers(baseMaps).addTo(contractMap);
    
    // Initialize marker arrays
    contractMarkers = [];
    contractCircles = [];
}

// Initialize map pin event listeners for contract cards
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

// Expose function globally for dynamic contract loading
window.initializeMapPins = initializeMapPins;

//=============================================================================
// MAP VISUALIZATION - CONTRACT MARKERS & TAX COMPLIANCE CIRCLES
//=============================================================================

// Global variables for map markers and circles
let contractMarkers = [];
let contractCircles = [];
let customMapIcon = null;

// Create custom map icon with bottom-point anchoring
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

// Calculate smart map bounds for all contract locations
function calculateSmartMapBounds(contracts) {
    if (!contracts || contracts.length === 0) {
        console.log('🗺️ No contracts provided - using default CONUS view');
        return {
            center: [39.8283, -98.5795],
            zoom: 4
        };
    }

    console.log('📍 Calculating smart bounds to fit actual contract circles');

    // Use filtering to only consider contracts from preferred regions for smart zoom
    const filteredContracts = filterContractsByUserPreferences(contracts);

    if (filteredContracts.length === 0) {
        console.log('🗺️ No contracts match user preferences - using default CONUS view');
        return {
            center: [39.8283, -98.5795],
            zoom: 4
        };
    }

    if (filteredContracts.length === 1) {
        const contract = filteredContracts[0];
        let lat = parseFloat(contract.latitude);
        let lng = parseFloat(contract.longitude);
        
        // Normalize Pacific coordinates
        if (lng > 0 && lng <= 180) {
            lng = lng - 360;
        }
        
        console.log(`🎯 Single contract zoom: ${lat}, ${lng}`);
        return {
            center: [lat, lng],
            zoom: 8
        };
    }

    // Extract valid coordinates with Pacific normalization from filtered contracts
    const validCoords = [];
    filteredContracts.forEach(contract => {
        let lat = parseFloat(contract.latitude);
        let lng = parseFloat(contract.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
            // Normalize Pacific coordinates to appear west of Americas
            if (lng > 0 && lng <= 180) {
                lng = lng - 360;
            }
            validCoords.push([lat, lng]);
        }
    });

    if (validCoords.length === 0) {
        console.log('🗺️ No valid coordinates in filtered contracts');
        return {
            center: [39.8283, -98.5795],
            zoom: 4
        };
    }

    // Calculate bounds for valid coordinates
    let minLat = Math.min(...validCoords.map(coord => coord[0]));
    let maxLat = Math.max(...validCoords.map(coord => coord[0]));
    let minLng = Math.min(...validCoords.map(coord => coord[1]));
    let maxLng = Math.max(...validCoords.map(coord => coord[1]));

    // Add tighter padding to bring contracts closer to panel edges
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const latPadding = Math.max(latSpan * 0.05, 0.2);  // 5% padding or 0.2 degree minimum
    const lngPadding = Math.max(lngSpan * 0.05, 0.3);  // 5% padding or 0.3 degree minimum

    minLat -= latPadding;
    maxLat += latPadding;
    minLng -= lngPadding;
    maxLng += lngPadding;

    // Create bounds for Leaflet
    const bounds = L.latLngBounds([
        [minLat, minLng],
        [maxLat, maxLng]
    ]);

    console.log(`🗺️ Smart bounds calculated to fit ${filteredContracts.length} contract circles:`, {
        minLat, maxLat, minLng, maxLng
    });
    console.log('📍 Contract locations included in bounds:', filteredContracts.map(c => `${c.hospital_name} (${c.latitude}, ${c.longitude})`));

    return { bounds }
}

// Detect and filter extreme geographic outliers to prevent world-spanning zooms
function detectAndFilterOutliers(coords) {
    if (coords.length <= 3) {
        return coords; // Don't filter with few points
    }

    // Calculate initial geographic span
    const lats = coords.map(coord => coord[0]);
    const lngs = coords.map(coord => coord[1]);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);

    // If longitude span > 180°, we likely have world-spanning outliers
    if (lngSpan > 180) {
        console.log('🗺️ Detected world-spanning coordinates, filtering outliers');
        
        // Separate into geographic regions
        const conus = coords.filter(coord => 
            coord[0] >= 20 && coord[0] <= 50 && coord[1] >= -130 && coord[1] <= -65
        );
        const alaska = coords.filter(coord => 
            coord[0] > 55 && coord[1] < -140
        );
        const hawaii = coords.filter(coord => 
            coord[0] >= 18 && coord[0] <= 23 && coord[1] >= -162 && coord[1] <= -154
        );
        const caribbean = coords.filter(coord => 
            coord[0] >= 17 && coord[0] <= 19 && coord[1] >= -68 && coord[1] <= -64
        );
        const pacificTerritories = coords.filter(coord => 
            coord[0] >= 10 && coord[0] <= 15 && coord[1] >= 140 && coord[1] <= 150
        );

        // Prioritize inclusion: CONUS + Caribbean + Alaska + Hawaii, exclude only Pacific territories
        let filtered = [...conus, ...caribbean, ...alaska, ...hawaii];
        
        // Only exclude Pacific territories (Guam, etc.) to prevent world-spanning view
        // Alaska and Hawaii are part of the US and should be included if contracts exist there
        
        // Only include Pacific territories if no other regions exist
        if (filtered.length === 0) {
            filtered = [...pacificTerritories];
        }

        console.log(`🗺️ Filtered from ${coords.length} to ${filtered.length} coordinates`);
        return filtered.length > 0 ? filtered : coords; // Fallback to original if filtering fails
    }

    // Don't exclude Alaska/Hawaii based on latitude span - they're legitimate US locations
    // Only exclude if we have extreme world-spanning longitudes (handled above)

    return coords; // No filtering needed
}

// Fit map view to show all contracts with smart bounds
function fitMapToAllContracts(contracts, animate = true) {
    if (!contractMap) return;
    
    // Handle empty or invalid contracts gracefully
    if (!contracts || contracts.length === 0) {
        console.log('🗺️ No contracts to fit - using default CONUS view');
        const options = animate ? { animate: true } : {};
        contractMap.setView([39.8283, -98.5795], 4, options);
        return;
    }

    const viewSettings = calculateSmartMapBounds(contracts);

    if (viewSettings.bounds) {
        // Use fitBounds for multiple contracts with dynamic zoom
        const options = {
            animate: animate,
            padding: [20, 20] // Smaller padding to bring contracts closer to panel edges
            // No maxZoom - let Leaflet calculate the optimal zoom dynamically
        };
        console.log('🗺️ Fitting bounds with padding for filtered contracts');
        contractMap.fitBounds(viewSettings.bounds, options);
    } else {
        // Use setView for single contract or default view
        const options = animate ? { animate: true } : {};
        contractMap.setView(viewSettings.center, viewSettings.zoom, options);
    }

    console.log(`🗺️ Map fitted to show ${contracts.length} contracts`);
}

// Calculate appropriate zoom level to show full 50-mile circle
function calculateCircleZoomLevel(latitude, longitude) {
    // 50 miles = approximately 80,467 meters
    const radiusMeters = 80467;
    
    // Rough approximation: zoom level to fit circle with some padding
    // This will be refined based on testing
    return 8;
}

// Get tax compliance circle color based on end date
function getCircleColor(endDate) {
    // Recreate the tax compliance logic here for map colors
    const today = new Date();
    
    if (!endDate) {
        return '#2196F3'; // Blue for current (no end date)
    }
    
    const contractEndDate = new Date(endDate);
    
    if (contractEndDate > today) {
        return '#2196F3'; // Blue for current contracts (matches card theme)
    }
    
    const timeDifference = today - contractEndDate;
    const twoYearsInMs = 2 * 365.25 * 24 * 60 * 60 * 1000;
    
    if (timeDifference < twoYearsInMs) {
        return '#F44336'; // Red for restricted areas (matches card theme)
    } else {
        return '#4CAF50'; // Green for available areas (matches card theme)
    }
    
    switch (statusClass) {
        case 'contract-current':
            return '#4A90E2'; // Blue for current contracts
        case 'contract-restricted':
            return '#FF6B6B'; // Red for restricted areas
        case 'contract-available':
            return '#4CAF50'; // Green for available areas
        default:
            return '#4A90E2';
    }
}

// Add a contract to the map with marker and circle
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
    
    // Add click handler to zoom to circle view with blink
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

// Remove all contract markers and circles from map
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

// Refresh all contract markers on the map
function refreshContractMarkers(contracts) {
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
        
        // Wait for profile manager to be available before smart zoom
        const attemptSmartZoom = () => {
            if (window.profileManager && window.profileManager.getMapPreferences) {
                console.log('✅ Profile manager available - proceeding with smart zoom');
                fitMapToAllContracts(contracts, true);
            } else {
                console.log('⏳ Profile manager not ready yet - retrying...');
                setTimeout(attemptSmartZoom, 100);
            }
        };
        
        // Start trying after a brief delay
        setTimeout(attemptSmartZoom, 100);
    } else {
        // No contracts - show default CONUS view
        if (contractMap) {
            contractMap.setView([39.8283, -98.5795], 4);
        }
    }
}

// Check if circle is visible in current viewport
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

// Find contract circle by coordinates
function findContractCircle(latitude, longitude) {
    return contractMarkers.find(item => 
        item.circle && 
        Math.abs(item.latitude - latitude) < 0.0001 &&
        Math.abs(item.longitude - longitude) < 0.0001
    );
}

// Blink a specific contract circle
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
        console.log(`Available circles:`, contractMarkers.map(item => ({
            id: item.contractId,
            lat: item.latitude,
            lng: item.longitude
        })));
    }
}

// Robust function to blink circle after map is ready
function blinkContractCircleAfterMapReady(latitude, longitude) {
    if (!contractMap) return;
    
    console.log('🗺️ Starting map ready detection for circle blink');
    
    // Step 1: Zoom to location
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

// Update zoom level for card button clicks with blink
function zoomToContractLocation(latitude, longitude) {
    if (contractMap) {
        blinkContractCircleAfterMapReady(latitude, longitude);
    }
}

//=============================================================================
// MAP CONTROLLER API - Public Interface for External Access
//=============================================================================

// Create a clean API interface for external modules
window.MapController = {
    // Core initialization
    initialize: initializeMap,
    initializePins: initializeMapPins,
    
    // Contract visualization
    refreshMarkers: refreshContractMarkers,
    fitToContracts: fitMapToAllContracts,
    
    // Individual contract interaction
    zoomToLocation: zoomToContractLocation,
    
    // Direct access to map instance (for advanced operations)
    getMap: () => contractMap
};

// Expose individual functions for backward compatibility
window.initializeMap = initializeMap;
window.initializeMapPins = initializeMapPins;
window.refreshContractMarkers = refreshContractMarkers;
window.fitMapToAllContracts = fitMapToAllContracts;
window.zoomToContractLocation = zoomToContractLocation;