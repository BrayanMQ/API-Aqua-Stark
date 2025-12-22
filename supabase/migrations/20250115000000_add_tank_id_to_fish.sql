-- Add tank_id column to fish table for tank capacity validation
-- This migration enables tracking which tank each fish belongs to

-- Add tank_id column (nullable to allow existing data)
ALTER TABLE fish
  ADD COLUMN IF NOT EXISTS tank_id INTEGER;

-- Add foreign key constraint to tanks table
-- ON DELETE SET NULL: If tank is deleted, fish remain but tank_id becomes NULL
-- ON UPDATE CASCADE: If tank ID changes, update the reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_fish_tank'
  ) THEN
    ALTER TABLE fish
      ADD CONSTRAINT fk_fish_tank 
        FOREIGN KEY (tank_id) REFERENCES tanks(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
  END IF;
END $$;

-- Add index for efficient tank-based queries (fish count per tank)
CREATE INDEX IF NOT EXISTS idx_fish_tank_id ON fish(tank_id);

-- Migrate existing data: Assign fish to their owner's first tank
-- This handles cases where fish exist but tank_id is NULL
UPDATE fish f
SET tank_id = (
  SELECT t.id 
  FROM tanks t 
  WHERE t.owner = f.owner 
  ORDER BY t.id ASC 
  LIMIT 1
)
WHERE f.tank_id IS NULL;

-- Add comment documenting the column purpose
COMMENT ON COLUMN fish.tank_id IS 'Reference to the tank this fish belongs to. Used for capacity validation.';
