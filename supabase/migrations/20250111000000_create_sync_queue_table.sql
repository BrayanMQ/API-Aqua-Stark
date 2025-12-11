CREATE TABLE IF NOT EXISTS sync_queue (
  id SERIAL PRIMARY KEY,
  tx_hash TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('player', 'fish', 'tank', 'decoration')),
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_tx_hash ON sync_queue(tx_hash);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);

CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id);

CREATE OR REPLACE FUNCTION update_sync_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sync_queue_updated_at
  BEFORE UPDATE ON sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_queue_updated_at();
