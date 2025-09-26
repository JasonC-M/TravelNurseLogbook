// Authentication functions for Supabase
// Cache refresh: v2.1

class Auth {
    constructor() {
        this.client = window.supabaseClient;
        this.currentUser = null;
        this.hasRedirected = false; // Flag to prevent multiple redirects
        this.initializeAuth();
    }

    // Initialize authentication state
    async initializeAuth() {
        try {
            // Get current session
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error) {
                return;
            }
            
            this.currentUser = session?.user || null;
            
            // Listen for auth state changes
            this.client.auth.onAuthStateChange((event, session) => {
                this.currentUser = session?.user || null;
                this.handleAuthStateChange(event, session);
            });
            
        } catch (error) {
            // Auth initialization failed
        }
    }

    // Handle authentication state changes
    handleAuthStateChange(event, session) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Only handle specific events and prevent multiple redirects
        if (event === 'SIGNED_IN' && !this.hasRedirected) {
            // User signed in - redirect to logbook if on login pages
            if (['index.html', ''].includes(currentPage)) {
                this.hasRedirected = true;
                window.location.href = 'logbook.html';
            }
        } else if (event === 'SIGNED_OUT') {
            // User signed out - redirect to login if on protected pages
            this.hasRedirected = false; // Reset flag when signing out
            if (currentPage === 'logbook.html') {
                window.location.href = 'index.html';
            }
        }
        
        // Don't redirect on INITIAL_SESSION to avoid redirect loops
        if (event === 'INITIAL_SESSION' && session && currentPage === 'logbook.html') {
            // User is already on the right page, no need to redirect
            return;
        }
    }

    // Sign up new user
    async signUp(email, password, userData = {}) {
        try {
            const { data, error } = await this.client.auth.signUp({
                email,
                password,
                options: {
                    data: userData // Additional user metadata
                }
            });

            if (error) {
                throw error;
            }

            return { success: true, data, message: 'Please check your email to confirm your account.' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Sign in user
    async signIn(email, password) {
        try {
            const { data, error } = await this.client.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Sign out user
    async signOut() {
        try {
            const { error } = await this.client.auth.signOut();
            if (error) {
                throw error;
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            const { data, error } = await this.client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) {
                throw error;
            }

            return { success: true, message: 'Password reset email sent. Please check your inbox.' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Update password (for logged-in users)
    async updatePassword(newPassword) {
        try {
            const { data, error } = await this.client.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            return { success: true, message: 'Password updated successfully.' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Get current session
    async getCurrentSession() {
        try {
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return null;
            }
            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    // Protect pages - call this on pages that require authentication
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }
}

// Initialize auth immediately (synchronously)
const auth = new Auth();
window.auth = auth; // Make available globally

// Utility functions for form handling
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
}

function hideSuccess(elementId) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.style.display = 'none';
    }
}