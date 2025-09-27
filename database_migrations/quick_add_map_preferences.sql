-- Quick Database Fix: Add map_preferences column
-- Run this single command in your Supabase SQL Editor

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS map_preferences JSONB DEFAULT '{
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
}'::jsonb;