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
        console.log('�️ Fitting to CONUS bounds');
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
    initializePins: () => console.log('map.js - 📍 initializePins - not implemented yet (Step 4)'),
    refreshMarkers: () => console.log('map.js - 🔄 refreshMarkers - not implemented yet (Step 4)'),
    fitToContracts: () => console.log('map.js - 🎯 fitToContracts - not implemented yet (Step 6)'),
    zoomToLocation: () => console.log('map.js - 🔍 zoomToLocation - not implemented yet (Step 9)'),
    getMap: () => contractMap
};

// Temporary global function for backward compatibility
window.refreshContractMarkers = async (contracts) => {
    console.log(`map.js - 🔄 refreshContractMarkers called with ${contracts ? contracts.length : 0} contracts`);
    
    // Force map resize after contracts load (fixes positioning when left panel expands)
    if (contractMap) {
        setTimeout(() => {
            console.log('map.js - 🔄 Contracts loaded, resizing map for panel changes');
            contractMap.invalidateSize();
            forceConsistentView();
        }, 250); // Allow time for DOM to update
    }
};

// Map will be initialized by logbook.js calling MapController.initialize()

console.log('map.js - 🗺️ Step 1: Basic map initialization loaded');

