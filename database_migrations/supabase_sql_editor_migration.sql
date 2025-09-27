-- ============================================================================
-- SUPABASE SQL EDITOR MIGRATION
-- Copy and paste this entire script into your Supabase SQL editor and run it
-- ============================================================================

-- Step 1: Add the map_preferences column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS map_preferences JSONB;

-- Step 2: Set default map preferences for existing users
UPDATE user_profiles 
SET map_preferences = jsonb_build_object(
  'conus', true,
  'alaska', true,
  'hawaii', true,
  'puerto-rico', true,
  'us-virgin-islands', true,
  'guam', false,
  'american-samoa', false,
  'northern-mariana', false,
  'canada', false,
  'mexico', false,
  'caribbean', false,
  'europe', false,
  'asia-pacific', false,
  'other-international', false
)
WHERE map_preferences IS NULL;

-- Step 3: Add validation constraint
ALTER TABLE user_profiles 
ADD CONSTRAINT IF NOT EXISTS check_map_preferences_valid 
CHECK (
  map_preferences IS NULL OR 
  jsonb_typeof(map_preferences) = 'object'
);

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_map_preferences 
ON user_profiles USING GIN (map_preferences);

-- Step 5: Add column comment
COMMENT ON COLUMN user_profiles.map_preferences IS 
'User preferences for map smart zoom regions. Boolean flags for each geographic region.';

-- Verification: Check that migration worked
SELECT 
  user_id,
  email,
  map_preferences->'conus' as conus_enabled,
  map_preferences->'guam' as guam_enabled,
  jsonb_typeof(map_preferences) as preferences_type
FROM user_profiles 
WHERE map_preferences IS NOT NULL
LIMIT 3;