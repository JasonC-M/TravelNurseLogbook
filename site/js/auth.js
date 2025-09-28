// Authentication functions for Travel Nurse Logbook Backend API
// Cache refresh: v3.0 - Updated for backend API integration

class Auth {
    constructor() {
        this.apiClient = window.apiClient;
        this.currentUser = null;
        this.hasRedirected = false; // Flag to prevent multiple redirects
        this.initializeAuth();
    }

    // Initialize authentication state
    async initializeAuth() {
        try {
            // Check if we have a stored token
            if (this.apiClient.isAuthenticated()) {
                // Try to get current user from token
                this.currentUser = this.apiClient.getCurrentUser();
                
                // Verify token is still valid by making an API call
                const result = await this.apiClient.getProfile();
                if (!result.success) {
                    // Token is invalid, clear it
                    this.apiClient.clearTokens();
                    this.currentUser = null;
                }
            }
            
            // Handle initial page routing
            this.handleInitialRouting();
            
        } catch (error) {
            console.error('auth.js - Auth initialization error:', error);
            // Clear potentially corrupted auth state
            this.apiClient.clearTokens();
            this.currentUser = null;
        }
    }

    // Handle initial page routing based on auth state
    handleInitialRouting() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        if (this.isAuthenticated()) {
            // User is authenticated - redirect to logbook if on login pages
            if (['index.html', ''].includes(currentPage) && !this.hasRedirected) {
                this.hasRedirected = true;
                window.location.href = 'logbook.html';
            }
        } else {
            // User is not authenticated - redirect to login if on protected pages
            if (currentPage === 'logbook.html' && !this.hasRedirected) {
                this.hasRedirected = true;
                window.location.href = 'index.html';
            }
        }
    }

    // Handle successful authentication
    handleAuthSuccess(userData) {
        this.currentUser = userData;
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Redirect to logbook if on login pages
        if (['index.html', ''].includes(currentPage) && !this.hasRedirected) {
            this.hasRedirected = true;
            window.location.href = 'logbook.html';
        }
    }

    // Handle sign out
    handleSignOut() {
        this.currentUser = null;
        this.hasRedirected = false;
        
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPage === 'logbook.html') {
            window.location.href = 'index.html';
        }
    }

    // Sign up new user
    async signUp(email, password, userData = {}) {
        try {
            const registrationData = {
                email,
                password,
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                full_name: userData.full_name || userData.name || ''
            };

            const result = await this.apiClient.register(registrationData);

            if (result.success) {
                // Registration successful - user is automatically logged in
                this.handleAuthSuccess(result.data.user);
                return { 
                    success: true, 
                    data: result.data, 
                    message: 'Registration successful! Welcome to Travel Nurse Logbook.' 
                };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            return { success: false, error: error.message || 'Registration failed. Please try again.' };
        }
    }

    // Sign in user
    async signIn(email, password) {
        try {
            const result = await this.apiClient.login({ email, password });

            if (result.success) {
                // Login successful
                this.handleAuthSuccess(result.data.user);
                return { success: true, data: result.data };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            return { success: false, error: error.message || 'Login failed. Please try again.' };
        }
    }

    // Sign out user
    async signOut() {
        try {
            // Call backend logout endpoint
            await this.apiClient.logout();
            
            // Handle local signout regardless of backend response
            this.handleSignOut();
            
            return { success: true };
        } catch (error) {
            // Even if backend logout fails, clear local state
            this.handleSignOut();
            return { success: false, error: error.message };
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            const result = await this.apiClient.resetPassword(email);

            if (result.success) {
                return { 
                    success: true, 
                    message: 'Password reset email sent. Please check your inbox.' 
                };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            return { success: false, error: error.message || 'Password reset failed. Please try again.' };
        }
    }

    // Update password (for logged-in users)
    async updatePassword(newPassword) {
        try {
            const result = await this.apiClient.updatePassword(newPassword);

            if (result.success) {
                return { success: true, message: 'Password updated successfully.' };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            return { success: false, error: error.message || 'Password update failed. Please try again.' };
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.apiClient.isAuthenticated() && this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get current session (JWT token info)
    async getCurrentSession() {
        if (!this.apiClient.isAuthenticated()) {
            return null;
        }

        try {
            // The API client manages the token, so we can return user info from token
            const user = this.apiClient.getCurrentUser();
            return {
                access_token: this.apiClient.token,
                user: user
            };
        } catch (error) {
            console.error('auth.js - Error getting session:', error);
            return null;
        }
    }

    // Get user ID
    getUserId() {
        return this.currentUser?.id || null;
    }

    // Protect pages - call this on pages that require authentication
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    // Refresh authentication state (useful after profile updates)
    async refreshAuth() {
        if (this.apiClient.isAuthenticated()) {
            try {
                const result = await this.apiClient.getProfile();
                if (result.success) {
                    // Update user data from profile
                    const user = this.apiClient.getCurrentUser();
                    this.currentUser = user;
                    return true;
                }
            } catch (error) {
                console.error('auth.js - Auth refresh error:', error);
            }
        }
        return false;
    }
}

// Initialize auth immediately (synchronously)
const auth = new Auth();
window.auth = auth; // Make available globally

// Utility functions for console logging only - no visual messages
// All errors and success messages now go to browser console for debugging