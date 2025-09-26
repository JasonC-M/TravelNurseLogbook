/**
 * Simple client-side HTML component loader
 * Loads HTML components and inserts them into the DOM
 */

class ComponentLoader {
  static async loadComponent(componentPath, targetSelector) {
    try {
      const response = await fetch(componentPath);
      if (!response.ok) {
        throw new Error(`Failed to load component: ${componentPath}`);
      }
      
      const html = await response.text();
      const targetElement = document.querySelector(targetSelector);
      
      if (!targetElement) {
        throw new Error(`Target element not found: ${targetSelector}`);
      }
      
      targetElement.insertAdjacentHTML('beforeend', html);
      console.log(`✅ Loaded component: ${componentPath}`);
    } catch (error) {
      console.error(`❌ Error loading component ${componentPath}:`, error);
    }
  }
  
  static async loadComponents(components) {
    const loadPromises = components.map(({ path, target }) => 
      this.loadComponent(path, target)
    );
    
    try {
      await Promise.all(loadPromises);
      console.log('✅ All components loaded successfully');
    } catch (error) {
      console.error('❌ Error loading some components:', error);
    }
  }
}

// Make it globally available
window.ComponentLoader = ComponentLoader;