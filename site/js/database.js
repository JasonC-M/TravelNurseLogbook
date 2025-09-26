// Database utility functions for Travel Nurse Logbook
// Updated to use backend API instead of direct Supabase calls

class Database {
    constructor() {
        this.apiClient = window.apiClient;
    }

    // User Profile Functions
    async getUserProfile(userId) {
        try {
            const result = await this.apiClient.getProfile();
            return { 
                success: result.success, 
                data: result.success ? result.data.profile : null,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateUserProfile(userId, profileData) {
        try {
            const result = await this.apiClient.updateProfile(profileData);
            return { 
                success: result.success, 
                data: result.success ? result.data.profile : null,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Contract Functions
    async getContracts(userId, options = {}) {
        try {
            const result = await this.apiClient.getContracts(options);
            return { 
                success: result.success, 
                data: result.success ? result.data.contracts : [],
                pagination: result.success ? result.data.pagination : null,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message, data: [] };
        }
    }

    async getContract(contractId, userId) {
        try {
            const result = await this.apiClient.getContract(contractId);
            return { 
                success: result.success, 
                data: result.success ? result.data.contract : null,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async createContract(userId, contractData) {
        try {
            const result = await this.apiClient.createContract(contractData);
            return { 
                success: result.success, 
                data: result.success ? result.data.contract : null,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateContract(contractId, userId, contractData) {
        try {
            const result = await this.apiClient.updateContract(contractId, contractData);
            return { 
                success: result.success, 
                data: result.success ? result.data.contract : null,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteContract(contractId, userId) {
        try {
            const result = await this.apiClient.deleteContract(contractId);
            return { 
                success: result.success, 
                data: result.success ? result.data : null,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteAllContracts(userId) {
        try {
            // Note: This would need to be implemented as a bulk delete endpoint
            // For now, we'll get all contracts and delete them individually
            const contractsResult = await this.getContracts(userId);
            if (!contractsResult.success) {
                return contractsResult;
            }

            const contracts = contractsResult.data;
            for (const contract of contracts) {
                const deleteResult = await this.deleteContract(contract.id, userId);
                if (!deleteResult.success) {
                    console.error('Failed to delete contract:', contract.id, deleteResult.error);
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Contract Document Functions  
    async getContractDocuments(contractId, userId) {
        try {
            const { data, error } = await this.client
                .from('contract_documents')
                .select('*')
                .eq('contract_id', contractId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async uploadContractDocument(contractId, userId, file, documentType = 'other') {
        try {
            // Document upload functionality would need to be implemented in the backend API
            // This is a placeholder for future implementation
            console.warn('Document upload not yet implemented in backend API');
            return { success: false, error: 'Document upload feature not yet available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteContractDocument(documentId, userId) {
        try {
            // Document management functionality would need to be implemented in the backend API
            // This is a placeholder for future implementation
            console.warn('Document deletion not yet implemented in backend API');
            return { success: false, error: 'Document deletion feature not yet available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getDocumentUrl(filePath) {
        try {
            // Document URL generation would need to be implemented in the backend API
            // This is a placeholder for future implementation
            console.warn('Document URL generation not yet implemented in backend API');
            return { success: false, error: 'Document URL feature not yet available' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Contract Statistics
    async getContractStats(userId) {
        try {
            const result = await this.apiClient.getContractStats();
            return { 
                success: result.success, 
                data: result.success ? result.data : null,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Health check
    async healthCheck() {
        try {
            const result = await this.apiClient.healthCheck();
            return { 
                success: result.success, 
                data: result.data,
                error: result.error
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Utility methods
    isAuthenticated() {
        return this.apiClient.isAuthenticated();
    }

    getCurrentUser() {
        return this.apiClient.getCurrentUser();
    }
}

// Create global instance for backward compatibility
const database = new Database();
window.database = database;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Database;
}