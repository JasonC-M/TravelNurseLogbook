-- ============================================================================
-- Migration: Add map_preferences to user_profiles table
-- Purpose: Store user preferences for map smart zoom regions
-- Date: September 26, 2025
-- ============================================================================

-- Step 1: Add the map_preferences column as JSONB for efficient queries
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS map_preferences JSONB DEFAULT NULL;

-- Step 2: Set default map preferences for existing users
-- Default: CONUS, Alaska, Hawaii, Puerto Rico, US Virgin Islands enabled
UPDATE user_profiles 
SET map_preferences = '{
  "conus": true,
  "alaska": true,
  "hawaii": true,
  "puerto-rico": true,
  "us-virgin-islands": true,
  "guam": false,
  "american-samoa": false,
  "northern-mariana": false,
  "canada": false,
  "mexico": false,
  "caribbean": false,
  "europe": false,
  "asia-pacific": false,
  "other-international": false
}'::jsonb
WHERE map_preferences IS NULL;

-- Step 3: Add a check constraint to ensure map_preferences is valid JSON when present
ALTER TABLE user_profiles 
ADD CONSTRAINT check_map_preferences_valid 
CHECK (
  map_preferences IS NULL OR 
  (jsonb_typeof(map_preferences) = 'object')
);

-- Step 4: Create an index for efficient queries on map preferences
CREATE INDEX IF NOT EXISTS idx_user_profiles_map_preferences 
ON user_profiles USING GIN (map_preferences);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN user_profiles.map_preferences IS 'JSON object storing user preferences for map smart zoom regions. Keys are region names, values are boolean flags indicating whether to include that region in automatic map bounds calculation.';

-- ============================================================================
-- Verification queries (run these after migration to verify)
-- ============================================================================

-- Check that all existing users now have default map preferences
-- SELECT user_id, email, map_preferences FROM user_profiles WHERE map_preferences IS NOT NULL LIMIT 5;

-- Verify the structure of default preferences
-- SELECT 
--   user_id, 
--   map_preferences->>'conus' as conus_enabled,
--   map_preferences->>'alaska' as alaska_enabled,
--   map_preferences->>'guam' as guam_enabled
-- FROM user_profiles 
-- WHERE map_preferences IS NOT NULL 
-- LIMIT 3;

-- Check constraint works (this should fail if uncommented)
-- INSERT INTO user_profiles (user_id, email, map_preferences) 
-- VALUES ('test-user-id', 'test@example.com', '"invalid_json_string"'::jsonb);