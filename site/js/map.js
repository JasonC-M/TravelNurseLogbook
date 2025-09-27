//=============================================================================
// MAP FUNCTIONALITY - Travel Nurse Logbook
// Handles all map-related operations including markers, circles, and interactions
//=============================================================================

let contractMap;

// Initialize map with layer control
function initializeMap() {
    contractMap = L.map('map').setView([39.8283, -98.5795], 4); // Centered on US

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
        // Default CONUS view
        return {
            center: [39.8283, -98.5795],
            zoom: 4
        };
    }

    // Extract valid coordinates with Pacific normalization
    const validCoords = [];
    contracts.forEach(contract => {
        let lat = parseFloat(contract.latitude);
        let lng = parseFloat(contract.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
            // Normalize Pacific coordinates to appear west of Americas
            // Convert positive Pacific longitudes to negative equivalent
            if (lng > 0 && lng <= 180) {
                lng = lng - 360; // e.g., Guam 144.8°E becomes -215.2°W
                console.log(`🌏 Normalized Pacific coordinate: ${contract.hospital_name || 'Unknown'} ${lat}, ${lng + 360}°E → ${lat}, ${lng}°W`);
            }
            validCoords.push([lat, lng]);
        }
    });

    if (validCoords.length === 0) {
        // Default CONUS view if no valid coordinates
        return {
            center: [39.8283, -98.5795],
            zoom: 4
        };
    }

    if (validCoords.length === 1) {
        // Single contract - center on it with regional zoom
        return {
            center: validCoords[0],
            zoom: 6
        };
    }

    // Filter to include US territories: CONUS, Alaska, Hawaii, Puerto Rico, Virgin Islands
    // Exclude distant Pacific territories like Guam that create world-spanning views
    const usCoords = validCoords.filter(coord => {
        const lat = coord[0];
        const lng = coord[1];
        
        // Include CONUS (Continental US): roughly 25-49°N, -125 to -66°W
        if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) return true;
        
        // Include Alaska: roughly 55-72°N, -180 to -140°W
        if (lat >= 55 && lat <= 72 && lng >= -180 && lng <= -140) return true;
        
        // Include Hawaii: roughly 18-23°N, -162 to -154°W
        if (lat >= 18 && lat <= 23 && lng >= -162 && lng <= -154) return true;
        
        // Include Puerto Rico and US Virgin Islands (Caribbean): roughly 17-19°N, -68 to -64°W
        if (lat >= 17 && lat <= 19 && lng >= -68 && lng <= -64) return true;
        
        // Exclude everything else (Guam, other Pacific territories)
        return false;
    });

    console.log(`�🇸 Using ${usCoords.length} US territory contracts out of ${validCoords.length} total for map centering`);

    // If no US territory contracts, fall back to all contracts
    const coordsToUse = usCoords.length > 0 ? usCoords : validCoords;

    // Determine geographic extent based on CONUS contracts only
    let minLat = Math.min(...coordsToUse.map(coord => coord[0]));
    let maxLat = Math.max(...coordsToUse.map(coord => coord[0]));
    let minLng = Math.min(...coordsToUse.map(coord => coord[1]));
    let maxLng = Math.max(...coordsToUse.map(coord => coord[1]));

    // Add padding for CONUS-focused view
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;
    const latPadding = Math.max(latSpan * 0.05, 1); // Smaller padding: 5% or 1 degree minimum
    const lngPadding = Math.max(lngSpan * 0.05, 1.5); // Smaller padding: 5% or 1.5 degrees minimum

    minLat -= latPadding;
    maxLat += latPadding;
    minLng -= lngPadding;
    maxLng += lngPadding;

    // Create bounds for Leaflet
    const bounds = L.latLngBounds([
        [minLat, minLng],
        [maxLat, maxLng]
    ]);

    return { bounds };
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
        // Use fitBounds for multiple contracts with tighter zoom
        const options = {
            animate: animate,
            padding: [10, 10], // Smaller padding for tighter zoom
            maxZoom: 7 // Allow closer zoom for better detail
        };
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
        
        // Auto-fit map to show all contracts after a brief delay
        setTimeout(() => {
            fitMapToAllContracts(contracts, true);
        }, 100);
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
window.setContracts = refreshContractMarkers; // Alias for backward compatibility
window.fitMapToAllContracts = fitMapToAllContracts;
window.zoomToContractLocation = zoomToContractLocation;