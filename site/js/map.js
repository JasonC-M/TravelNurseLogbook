//=============================================================================
// MAP FUNCTIONALITY - Travel Nurse Logbook
// Rebuilding features step by step for reliable functionality
//=============================================================================

//=============================================================================
// STEP 1: BASIC MAP INITIALIZATION
//=============================================================================

let contractMap; // Main Leaflet map instance

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
        // Create map with fractional zoom enabled for precise control
        contractMap = L.map('map', {
            zoomSnap: 0.1,    // Allow zoom in 0.1 increments (more precise)
            zoomDelta: 0.25   // Zoom buttons/keyboard increment by 0.25
        }).setView([39.8283, -98.5795], 5); // Center on CONUS with zoom level 5
        
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

    // ResizeObserver for container size changes (when contracts load in left panel)
    if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(entries => {
            console.log('map.js - 📐 Map container size changed - invalidating map size');
            if (contractMap) {
                // Small delay to ensure DOM has settled
                setTimeout(() => {
                    contractMap.invalidateSize();
                }, 100);
            }
        });
        
        resizeObserver.observe(mapContainer);
        console.log('map.js - ✅ ResizeObserver attached to map container');
    }

    // MutationObserver for when left panel content changes (contracts loading)
    if (window.MutationObserver) {
        const mutationObserver = new MutationObserver(mutations => {
            const hasContentChanges = mutations.some(mutation => 
                mutation.type === 'childList' || 
                (mutation.type === 'attributes' && mutation.attributeName === 'style')
            );
            
            if (hasContentChanges && contractMap) {
                console.log('map.js - 📐 Page content changed - invalidating map size');
                setTimeout(() => {
                    contractMap.invalidateSize();
                }, 150);
            }
        });

        // Watch the main content area for changes
        const mainContent = document.querySelector('.main-content') || document.body;
        mutationObserver.observe(mainContent, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        
        console.log('map.js - ✅ MutationObserver attached to main content');
    }
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

// Map will be initialized by logbook.js calling MapController.initialize()

console.log('map.js - 🗺️ Step 1: Basic map initialization loaded');

