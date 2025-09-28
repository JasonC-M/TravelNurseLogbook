//=============================================================================
// MAP FUNCTIONALITY - Travel Nurse Logbook
// Rebuilding features step by step for reliable fu        if (shouldUseDefaultMapView()) {
            // DEFAULT BEHAVIOR: Show continental US view
            const defaultZoom = calculateDefaultUSZoom(containerSize);
            console.log(`map.js - 🗺️ [DEFAULT] Applying continental US view: zoom ${defaultZoom} for container ${containerSize.width}x${containerSize.height}`);
            contractMap.setView([39.8283, -98.5795], defaultZoom); // Center on continental US
        } else {
            // FUTURE BEHAVIOR: Contract-based smart view (Step 6)
            console.log('map.js - 📍 [SMART VIEW] Contract-based smart box view (Step 6 - not implemented yet)');
            // For now, fall back to default behavior
            const defaultZoom = calculateDefaultUSZoom(containerSize);
            contractMap.setView([39.8283, -98.5795], defaultZoom);
        }//=============================================================================

//=============================================================================
// STEP 1: BASIC MAP INITIALIZATION
//=============================================================================

let contractMap; // Main Leaflet map instance

//=============================================================================
// STEP 2: DATA STRUCTURE SETUP
//=============================================================================

// Contract data storage
let contractMarkers = [];       // Array to store all map markers
let contractCircles = [];       // Array to store all accuracy circles
let allContracts = [];          // Array to store contract data
let filteredContracts = [];     // Array to store currently filtered contracts
let contractsLoaded = false;    // Flag to track if contracts have been loaded

// Map icons and overlays
let customMapIcon = null;       // Custom icon for contract markers
let smartBoxOverlay = null;     // Debug overlay for smart box bounds
let debugCenterMarker = null;   // Debug marker for map center
let currentSmartBoxCenter = null; // Current calculated center point

// Map state tracking
let mapInitialized = false;     // Flag to track map initialization state
let lastKnownMapSize = { width: 0, height: 0 }; // For resize optimization

/**
 * Initialize the main Leaflet map with layers
 * STEP 1: Just creates a blank map centered on CONUS with layer controls
 */
function initializeMap() {
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
        // Get initial container size for default US view
        const mapContainer = document.getElementById('map');
        const containerSize = mapContainer ? {
            width: mapContainer.offsetWidth || 1200,
            height: mapContainer.offsetHeight || 600
        } : { width: 1200, height: 600 };
        
        const initialZoom = calculateDefaultUSZoom(containerSize);
        
        // Create map with fractional zoom enabled for precise control
        contractMap = L.map('map', {
            zoomSnap: 0.1,    // Allow zoom in 0.1 increments (more precise)
            zoomDelta: 0.25   // Zoom buttons/keyboard increment by 0.25
        }).setView([39.8283, -98.5795], initialZoom); // DEFAULT: Center on continental US with responsive zoom
        
        console.log('map.js - ✅ Leaflet map object created successfully');
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
        
        // Update initialization state (Step 2)
        setMapInitialized(true);
        
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
 * Setup basic resize handling for map container changes and browser window resizes
 * This fixes the issue where map shifts when left panel loads with contracts
 * and ensures zoom adjusts when browser window is resized
 */
function setupMapResizeHandling() {
    console.log('map.js - 📐 [STEP 1] Setting up resize handling...');
    
    // Get the map container
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
        console.warn('map.js - ⚠️ Map container not found');
        return;
    }

    // Helper function to apply default map view when no contracts are loaded
    function applyDefaultMapView() {
        if (!contractMap) return;
        
        const rect = mapContainer.getBoundingClientRect();
        const containerSize = { width: rect.width, height: rect.height };
        
        // Use default behavior unless contracts are loaded and visible
        if (!contractsLoaded || allContracts.length === 0) {
            const defaultZoom = calculateDefaultUSZoom(containerSize);
            console.log(`map.js - �️ [DEFAULT] Applying US view: zoom ${defaultZoom} for container ${containerSize.width}x${containerSize.height}`);
            contractMap.setView([39.8283, -98.5795], defaultZoom); // Center on continental US
        } else {
            // TODO: Step 6 - Apply smart box view based on visible contracts
            console.log('map.js - 📍 [FUTURE] Contract-based smart view will be implemented in Step 6');
            // For now, still use default behavior
            const defaultZoom = calculateDefaultUSZoom(containerSize);
            contractMap.setView([39.8283, -98.5795], defaultZoom);
        }
    }

    // Window resize listener for browser window changes
    let windowResizeTimeout = null;
    window.addEventListener('resize', () => {
        if (windowResizeTimeout) {
            clearTimeout(windowResizeTimeout);
        }
        
        windowResizeTimeout = setTimeout(() => {
            console.log('map.js - 📐 Browser window resized - applying appropriate map view');
            contractMap.invalidateSize();
            applyDefaultMapView();
        }, 250); // Debounced window resize
    });
    console.log('map.js - ✅ Window resize listener added for responsive zoom');

    // ResizeObserver for container size changes (when contracts load in left panel) - OPTIMIZED
    if (window.ResizeObserver) {
        let resizeTimeout = null;
        let lastSize = { width: 0, height: 0 };
        
        const resizeObserver = new ResizeObserver(entries => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            
            const entry = entries[0];
            const newSize = {
                width: entry.contentRect.width,
                height: entry.contentRect.height
            };
            
            // Only trigger if size actually changed significantly (more than 10px)
            const sizeChanged = Math.abs(newSize.width - lastSize.width) > 10 || 
                               Math.abs(newSize.height - lastSize.height) > 10;
            
            if (sizeChanged && contractMap) {
                resizeTimeout = setTimeout(() => {
                    console.log(`map.js - 📐 Map container resized (${newSize.width}x${newSize.height}) - applying appropriate view`);
                    
                    // Invalidate size first
                    contractMap.invalidateSize();
                    
                    // Apply appropriate view based on current state
                    applyDefaultMapView();
                    
                    lastSize = newSize;
                }, 200); // Debounced resize handling
            }
        });
        
        resizeObserver.observe(mapContainer);
        console.log('map.js - ✅ Optimized ResizeObserver with zoom adjustment attached to map container');
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
}

/**
 * Calculate default zoom level for US view based on container size
 * DEFAULT BEHAVIOR: Used when no contracts are loaded or displayed
 * STEP 2.5: Will be replaced by smart box calculations in Step 6
 */
function calculateDefaultUSZoom(containerSize) {
    const { width, height } = containerSize;
    
    // Default zoom levels for different container sizes
    // These values are tuned for showing the continental US properly
    // TODO: Step 6 will replace this with contract-based smart box calculations
    let zoom;
    
    if (width < 400 || height < 300) {
        zoom = 3; // Very small containers (mobile portrait)
    } else if (width < 600 || height < 400) {
        zoom = 3.5; // Small containers (mobile landscape, small desktop)
    } else if (width < 900 || height < 500) {
        zoom = 4; // Medium containers (tablet, small desktop)
    } else if (width < 1200 || height < 600) {
        zoom = 4.5; // Large containers (desktop)
    } else {
        zoom = 5; // Very large containers (full desktop)
    }
    
    console.log(`map.js - 🧮 [DEFAULT] Calculated US zoom ${zoom} for container ${width}x${height}`);
    return zoom;
}

/**
 * Determine if map should use default US view or contract-based smart view
 * DEFAULT BEHAVIOR: Show continental US when no contracts loaded/visible
 * FUTURE BEHAVIOR: Smart box view based on visible contracts (Step 6)
 */
function shouldUseDefaultMapView() {
    // Use default view when no contracts are loaded
    if (!contractsLoaded || allContracts.length === 0) {
        return true;
    }
    
    // Use default view when all contracts are filtered out
    if (filteredContracts.length === 0) {
        return true;
    }
    
    // TODO: Step 6 - Check if smart box view should be used
    // For now, always use default until smart box is implemented
    return true;
}

//=============================================================================
// STEP 2: DATA MANAGEMENT FUNCTIONS
//=============================================================================

/**
 * Clear all contract markers and circles from the map
 * STEP 2: Basic data structure management
 */
function clearContractMarkers() {
    console.log('map.js - 🧹 Clearing contract markers and circles');
    
    // Remove all markers from map
    contractMarkers.forEach(marker => {
        if (contractMap && marker) {
            contractMap.removeLayer(marker);
        }
    });
    
    // Remove all circles from map  
    contractCircles.forEach(circle => {
        if (contractMap && circle) {
            contractMap.removeLayer(circle);
        }
    });
    
    // Clear arrays
    contractMarkers = [];
    contractCircles = [];
    
    console.log('map.js - ✅ All markers and circles cleared');
}

/**
 * Store contract data and update filtered contracts
 * STEP 2: Contract data management
 */
function setContractData(contracts) {
    console.log(`map.js - 📋 Storing ${contracts?.length || 0} contracts`);
    
    allContracts = contracts || [];
    filteredContracts = [...allContracts]; // Initially show all contracts
    contractsLoaded = allContracts.length > 0;
    
    console.log(`map.js - ✅ Contract data stored: ${allContracts.length} total, ${filteredContracts.length} visible`);
    
    return contractsLoaded;
}

/**
 * Get current contract data
 * STEP 2: Data access functions  
 */
function getContractData() {
    return {
        all: allContracts,
        filtered: filteredContracts,
        loaded: contractsLoaded,
        markerCount: contractMarkers.length,
        circleCount: contractCircles.length
    };
}

/**
 * Update map initialization state
 * STEP 2: State management
 */
function setMapInitialized(initialized) {
    mapInitialized = initialized;
    console.log(`map.js - 🎮 Map initialization state: ${initialized ? 'READY' : 'NOT READY'}`);
}

//=============================================================================
// PUBLIC API - STEPS 1 & 2
//=============================================================================

// Export the basic initialization function
window.initializeMap = initializeMap;

// MapController interface expected by logbook.js
window.MapController = {
    initialize: initializeMap,
    initializePins: () => console.log('map.js - 📍 initializePins - not implemented yet (Step 4)'),
    refreshMarkers: () => console.log('map.js - 🔄 refreshMarkers - not implemented yet (Step 4)'),
    fitToContracts: () => console.log('map.js - 🎯 fitToContracts - not implemented yet (Step 6)'),
    zoomToLocation: () => console.log('map.js - 🔍 zoomToLocation - not implemented yet (Step 9)'),
    getMap: () => contractMap,
    
    // Step 2: Data management functions
    setContracts: setContractData,
    clearMarkers: clearContractMarkers,
    getContractData: getContractData,
    isReady: () => mapInitialized && contractsLoaded
};

// Temporary global function for backward compatibility
window.refreshContractMarkers = (contracts) => {
    console.log(`map.js - 🔄 refreshContractMarkers called with ${contracts?.length || 0} contracts - will display in Step 4`);
    
    // Store the contract data (Step 2 functionality)
    if (contracts) {
        setContractData(contracts);
    }
    
    // Clear existing markers (Step 2 functionality)
    clearContractMarkers();
    
    // TODO: Step 4 will add markers to map
    console.log('map.js - 📍 Contract markers will be displayed in Step 4');
};

// Map will be initialized by logbook.js calling MapController.initialize()

console.log('map.js - 🗺️ Steps 1-2: Map initialization and data structures loaded');

