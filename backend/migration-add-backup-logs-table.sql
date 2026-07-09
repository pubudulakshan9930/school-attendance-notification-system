CREATE TABLE IF NOT EXISTS backup_logs (
  id SERIAL PRIMARY KEY,
  backup_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  restored_at TIMESTAMP
);
