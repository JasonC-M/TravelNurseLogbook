#!/bin/bash

# ============================================================================
# Database Migration Script for Map Preferences
# Run this script to add map_preferences column to your Supabase database
# ============================================================================

echo "🗄️  Adding map_preferences column to user_profiles table..."
echo "📋 This will:"
echo "   1. Add map_preferences JSONB column"
echo "   2. Set default preferences for existing users"
echo "   3. Add validation constraints"
echo "   4. Create performance index"
echo ""

# Check if we have database connection details
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "❌ Error: Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables"
    echo "Example:"
    echo "export SUPABASE_URL='https://your-project.supabase.co'"
    echo "export SUPABASE_SERVICE_KEY='your-service-key'"
    exit 1
fi

echo "🔗 Connecting to database: $SUPABASE_URL"

# Execute the migration using curl to Supabase REST API
curl -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "sql": "
    -- Add map_preferences column
    ALTER TABLE user_profiles 
    ADD COLUMN IF NOT EXISTS map_preferences JSONB DEFAULT NULL;
    
    -- Set defaults for existing users
    UPDATE user_profiles 
    SET map_preferences = '{
      \"conus\": true,
      \"alaska\": true,
      \"hawaii\": true,
      \"puerto-rico\": true,
      \"us-virgin-islands\": true,
      \"guam\": false,
      \"american-samoa\": false,
      \"northern-mariana\": false,
      \"canada\": false,
      \"mexico\": false,
      \"caribbean\": false,
      \"europe\": false,
      \"asia-pacific\": false,
      \"other-international\": false
    }'::jsonb
    WHERE map_preferences IS NULL;
    
    -- Add validation constraint
    ALTER TABLE user_profiles 
    ADD CONSTRAINT IF NOT EXISTS check_map_preferences_valid 
    CHECK (
      map_preferences IS NULL OR 
      (jsonb_typeof(map_preferences) = 'object')
    );
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_user_profiles_map_preferences 
    ON user_profiles USING GIN (map_preferences);
  "
}
EOF

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    echo "🎯 Next steps:"
    echo "   1. Test the profile form with map preferences"
    echo "   2. Verify existing users have default preferences"
    echo "   3. Test saving custom preferences"
else
    echo "❌ Migration failed. Check your database credentials and connection."
    exit 1
fi