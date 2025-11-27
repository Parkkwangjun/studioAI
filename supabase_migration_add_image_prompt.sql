-- Migration: Add image_prompt column to scenes table
-- Purpose: Move image prompts from localStorage to Supabase
-- Date: 2025-11-27

-- Add image_prompt column to scenes table
ALTER TABLE scenes 
ADD COLUMN IF NOT EXISTS image_prompt text;

-- Add comment for documentation
COMMENT ON COLUMN scenes.image_prompt IS 'Image generation prompt for this scene (moved from localStorage to resolve QuotaExceededError)';

-- Optional: Add index for faster queries if needed
-- CREATE INDEX IF NOT EXISTS idx_scenes_project_id_order ON scenes(project_id, scene_order);

