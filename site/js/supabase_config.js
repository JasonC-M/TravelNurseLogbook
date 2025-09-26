// Supabase Configuration
// Replace these with your actual Supabase project details
// You can find these in your Supabase dashboard under Settings > API

const SUPABASE_CONFIG = {
    url: 'https://kcyrtbkecctthqkqrhkc.supabase.co', // e.g., 'https://your-project-id.supabase.co'
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjeXJ0YmtlY2N0dGhxa3FyaGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2NjU5MjgsImV4cCI6MjA3NDI0MTkyOH0.8I78SkFvvxZ8wUXyvbSpvvwYndTFgA9ky-s09FhpDS8' // Your public anon key from Supabase dashboard
};

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Export for use in other files
window.supabaseClient = supabaseClient;