// Supabase Configuration - DEPRECATED
// This file is no longer used in the application.
// All database operations now go through the secure backend API.
// 
// The frontend no longer connects directly to Supabase.
// Authentication, profile management, and contract operations
// are handled by the backend Express.js API with proper security.
//
// This file is kept for reference only.

console.warn('supabase_config.js is deprecated. Remove references to this file.');

// Legacy configuration (no longer used):
// const SUPABASE_CONFIG = {
//     url: 'https://kcyrtbkecctthqkqrhkc.supabase.co',
//     anonKey: '[REMOVED FOR SECURITY]'
// };
//
// window.supabaseClient = null; // No longer initialized