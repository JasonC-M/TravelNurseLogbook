/**
 * Authentication Debug Test
 * This script helps diagnose authentication issues
 */

console.log("=== Authentication Debug Test ===");

// Test API connectivity first
console.log("Testing API connectivity...");
fetch('/api/health')
  .then(response => {
    console.log("API Health Response Status:", response.status);
    return response.json();
  })
  .then(data => {
    console.log("API Health Data:", data);
  })
  .catch(error => {
    console.error("API Health Error:", error);
  });

// Test 1: Check if auth object exists
console.log("1. Auth object exists:", !!window.auth);

// Test 2: Check if user is authenticated
if (window.auth) {
    console.log("2. Is authenticated:", window.auth.isAuthenticated());
    
    // Test 3: Get current user
    const user = window.auth.getCurrentUser();
    console.log("3. Current user:", user);
    
    // Test 4: Check API client token
    if (window.auth.apiClient) {
        console.log("4. API client token exists:", !!window.auth.apiClient.token);
        console.log("5. Token preview:", window.auth.apiClient.token ? window.auth.apiClient.token.substring(0, 20) + "..." : "No token");
    }
    
    // Test 5: Try to get session
    window.auth.getCurrentSession().then(session => {
        console.log("6. Current session:", session ? "Valid" : "Invalid");
        if (session) {
            console.log("   - User ID:", session.user?.id);
            console.log("   - User Email:", session.user?.email);
        }
    }).catch(err => {
        console.log("6. Session error:", err);
    });
    
    // Test 6: Test API call
    if (window.database) {
        console.log("7. Testing API call...");
        window.database.getUserProfile().then(result => {
            console.log("   - Profile API call result:", result.success ? "Success" : "Failed");
            if (!result.success) {
                console.log("   - Error:", result.error);
            }
        }).catch(err => {
            console.log("   - Profile API error:", err);
        });
    }
} else {
    console.log("Auth system not available!");
}