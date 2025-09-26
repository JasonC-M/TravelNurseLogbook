// Database utility functions for Travel Nurse Logbook

class Database {
    constructor() {
        this.client = window.supabaseClient;
    }

    // User Profile Functions
    async getUserProfile(userId) {
        try {
            const { data, error } = await this.client
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateUserProfile(userId, profileData) {
        try {
            const { data, error } = await this.client
                .from('user_profiles')
                .upsert({
                    user_id: userId,
                    ...profileData,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Contract Functions
    async getContracts(userId) {
        try {
            const { data, error } = await this.client
                .from('contracts')
                .select('*')
                .eq('user_id', userId)
                .order('start_date', { ascending: false });

            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getContract(contractId, userId) {
        try {
            const { data, error } = await this.client
                .from('contracts')
                .select('*')
                .eq('id', contractId)
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async createContract(userId, contractData) {
        try {
            const { data, error } = await this.client
                .from('contracts')
                .insert({
                    user_id: userId,
                    ...contractData
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateContract(contractId, userId, contractData) {
        try {
            const { data, error } = await this.client
                .from('contracts')
                .update({
                    ...contractData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', contractId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteContract(contractId, userId) {
        try {
            const { error } = await this.client
                .from('contracts')
                .delete()
                .eq('id', contractId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteAllContracts(userId) {
        try {
            const { error } = await this.client
                .from('contracts')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

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
            // Generate unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `contracts/${contractId}/${fileName}`;

            // Upload file to Supabase Storage
            const { data: uploadData, error: uploadError } = await this.client.storage
                .from('documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            // Save document metadata to database
            const { data, error } = await this.client
                .from('contract_documents')
                .insert({
                    contract_id: contractId,
                    user_id: userId,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type,
                    file_size: file.size,
                    document_type: documentType
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteContractDocument(documentId, userId) {
        try {
            // First get the document to find the file path
            const { data: document, error: fetchError } = await this.client
                .from('contract_documents')
                .select('file_path')
                .eq('id', documentId)
                .eq('user_id', userId)
                .single();

            if (fetchError) throw fetchError;

            // Delete file from storage
            const { error: storageError } = await this.client.storage
                .from('documents')
                .remove([document.file_path]);

            if (storageError) {
                // Continue with database deletion even if storage deletion fails
            }

            // Delete document record from database
            const { error } = await this.client
                .from('contract_documents')
                .delete()
                .eq('id', documentId)
                .eq('user_id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getDocumentUrl(filePath) {
        try {
            const { data, error } = await this.client.storage
                .from('documents')
                .createSignedUrl(filePath, 3600); // 1 hour expiry

            if (error) throw error;

            return { success: true, url: data.signedUrl };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Initialize database when DOM is loaded
let database;
document.addEventListener('DOMContentLoaded', () => {
    database = new Database();
    window.database = database; // Make available globally
});