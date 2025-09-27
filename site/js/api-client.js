/**
 * API Client for Travel Nurse Logbook Backend
 * Handles all HTTP communication with the secure backend API
 * Includes JWT token management, request/response handling, and error management
 */

class ApiClient {
    constructor() {
        this.baseURL = window.location.protocol === 'https:' ? 'https://localhost' : 'http://localhost';
        this.apiPath = '/api';
        this.token = this.getStoredToken();
        this.isRefreshing = false;
        this.refreshPromise = null;
    }

    // Token Management
    getStoredToken() {
        return localStorage.getItem('tnl_access_token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('tnl_access_token', token);
        } else {
            localStorage.removeItem('tnl_access_token');
        }
    }

    getRefreshToken() {
        return localStorage.getItem('tnl_refresh_token');
    }

    setRefreshToken(token) {
        if (token) {
            localStorage.setItem('tnl_refresh_token', token);
        } else {
            localStorage.removeItem('tnl_refresh_token');
        }
    }

    clearTokens() {
        this.token = null;
        localStorage.removeItem('tnl_access_token');
        localStorage.removeItem('tnl_refresh_token');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Build request headers
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Core request method with error handling and token refresh
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${this.apiPath}${endpoint}`;
        const config = {
            method: options.method || 'GET',
            headers: this.getHeaders(options.auth !== false),
            ...options
        };

        // Add body for non-GET requests
        if (options.body && config.method !== 'GET') {
            config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        }

        try {
            let response = await fetch(url, config);

            // Handle 401 unauthorized - try to refresh token
            if (response.status === 401 && this.token && !options.skipTokenRefresh) {
                const refreshResult = await this.refreshAccessToken();
                if (refreshResult.success) {
                    // Retry with new token
                    config.headers = this.getHeaders(options.auth !== false);
                    response = await fetch(url, config);
                } else {
                    // Refresh failed, clear tokens and redirect to login
                    this.clearTokens();
                    this.redirectToLogin();
                    throw new Error('Session expired. Please log in again.');
                }
            }

            // Parse response
            const contentType = response.headers.get('content-type');
            let responseData;
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            if (!response.ok) {
                const error = new Error(responseData.message || responseData.error || `HTTP ${response.status}`);
                error.status = response.status;
                error.response = responseData;
                throw error;
            }

            return {
                success: true,
                data: responseData,
                status: response.status
            };

        } catch (error) {
            console.error(`api-client.js - API Request failed: ${config.method} ${url}`, error);
            return {
                success: false,
                error: error.message || 'Network request failed',
                status: error.status || 0
            };
        }
    }

    // Refresh access token using refresh token
    async refreshAccessToken() {
        if (this.isRefreshing) {
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        this.refreshPromise = this._performTokenRefresh();
        
        const result = await this.refreshPromise;
        this.isRefreshing = false;
        this.refreshPromise = null;
        
        return result;
    }

    async _performTokenRefresh() {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return { success: false, error: 'No refresh token available' };
        }

        try {
            const response = await fetch(`${this.baseURL}${this.apiPath}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setToken(data.access_token);
                if (data.refresh_token) {
                    this.setRefreshToken(data.refresh_token);
                }
                return { success: true };
            } else {
                return { success: false, error: 'Token refresh failed' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Redirect to login page
    redirectToLogin() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (!['index.html', ''].includes(currentPage)) {
            window.location.href = 'index.html';
        }
    }

    // Authentication API methods
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: userData,
            auth: false
        });
    }

    async login(credentials) {
        const result = await this.request('/auth/login', {
            method: 'POST',
            body: credentials,
            auth: false
        });

        if (result.success && result.data.session) {
            this.setToken(result.data.session.access_token);
            if (result.data.session.refresh_token) {
                this.setRefreshToken(result.data.session.refresh_token);
            }
        }

        return result;
    }

    async logout() {
        const result = await this.request('/auth/logout', {
            method: 'POST'
        });

        // Clear tokens regardless of result
        this.clearTokens();
        return result;
    }

    async resetPassword(email) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: { email },
            auth: false
        });
    }

    async updatePassword(newPassword) {
        return this.request('/auth/update-password', {
            method: 'POST',
            body: { new_password: newPassword }
        });
    }

    // Profile API methods
    async getProfile() {
        return this.request('/profile');
    }

    async updateProfile(profileData) {
        return this.request('/profile', {
            method: 'PUT',
            body: profileData
        });
    }

    async createProfile(profileData) {
        return this.request('/profile', {
            method: 'POST',
            body: profileData
        });
    }

    async deleteProfile() {
        return this.request('/profile', {
            method: 'DELETE'
        });
    }

    // Contract API methods
    async getContracts(options = {}) {
        const params = new URLSearchParams();
        
        if (options.page) params.append('page', options.page);
        if (options.limit) params.append('limit', options.limit);
        if (options.status) params.append('status', options.status);
        if (options.search) params.append('search', options.search);

        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/contracts${query}`);
    }

    async getContract(contractId) {
        return this.request(`/contracts/${contractId}`);
    }

    async createContract(contractData) {
        return this.request('/contracts', {
            method: 'POST',
            body: contractData
        });
    }

    async updateContract(contractId, contractData) {
        return this.request(`/contracts/${contractId}`, {
            method: 'PUT',
            body: contractData
        });
    }

    async deleteContract(contractId) {
        return this.request(`/contracts/${contractId}`, {
            method: 'DELETE'
        });
    }

    async getContractStats() {
        return this.request('/contracts/stats');
    }

    // Utility method to get current user from token
    getCurrentUser() {
        if (!this.token) return null;

        try {
            // Decode JWT payload (simple base64 decode, not verification)
            const payload = JSON.parse(atob(this.token.split('.')[1]));
            return {
                id: payload.sub,
                email: payload.email,
                metadata: payload.user_metadata || {}
            };
        } catch (error) {
            console.error('api-client.js - Error decoding token:', error);
            return null;
        }
    }

    // Health check
    async healthCheck() {
        return this.request('/health', { auth: false });
    }
}

// Create global instance
window.apiClient = new ApiClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiClient;
}