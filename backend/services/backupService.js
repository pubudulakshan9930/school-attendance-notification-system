const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const pool = require("../db");

const BACKUPS_DIR = path.resolve(__dirname, "..", "..", "backups");
const DEFAULT_DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/sureki";

function getExecutableName(commandName) {
  return process.platform === "win32" ? `${commandName}.exe` : commandName;
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let value = size;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { env: process.env }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr?.trim() || error.message || "Command failed."));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function ensureBackupStorage() {
  await fs.mkdir(BACKUPS_DIR, { recursive: true });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS backup_logs (
      id SERIAL PRIMARY KEY,
      backup_name VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL UNIQUE,
      file_path TEXT NOT NULL,
      file_size_bytes BIGINT DEFAULT 0,
      status VARCHAR(30) NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      restored_at TIMESTAMP
    )
  `);

  return BACKUPS_DIR;
}

async function createDatabaseBackup() {
  const backupDir = await ensureBackupStorage();
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const fileName = `backup_${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}_${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}.sql`;
  const backupPath = path.join(backupDir, fileName);

  try {
    await runCommand(getExecutableName("pg_dump"), [
      "--dbname",
      DEFAULT_DATABASE_URL,
      "--file",
      backupPath,
    ]);

    const stats = await fs.stat(backupPath);
    const result = await pool.query(
      `
        INSERT INTO backup_logs (backup_name, file_name, file_path, file_size_bytes, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, backup_name, file_name, file_path, file_size_bytes, status, created_at, restored_at
      `,
      [fileName, fileName, backupPath, stats.size, "completed"],
    );

    return {
      backup: result.rows[0],
      file_size: formatFileSize(stats.size),
    };
  } catch (error) {
    await fs.unlink(backupPath).catch(() => {});
    throw new Error(`Backup failed: ${error.message}`);
  }
}

async function getBackupHistory() {
  await ensureBackupStorage();
  const result = await pool.query(
    `
      SELECT id, backup_name, file_name, file_path, file_size_bytes, status, created_at, restored_at
      FROM backup_logs
      ORDER BY created_at DESC
    `,
  );

  return result.rows.map((row) => ({
    ...row,
    file_size: formatFileSize(row.file_size_bytes),
  }));
}

async function getBackupSummary() {
  await ensureBackupStorage();
  const result = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total_backups,
        MAX(created_at) AS last_backup_at,
        COALESCE(SUM(file_size_bytes), 0)::bigint AS total_size_bytes
      FROM backup_logs
      WHERE status IN ('completed', 'restored')
    `,
  );

  const row = result.rows[0] || {};
  return {
    total_backups: Number(row.total_backups || 0),
    last_backup_at: row.last_backup_at || null,
    storage_used: formatFileSize(row.total_size_bytes || 0),
    total_size_bytes: Number(row.total_size_bytes || 0),
  };
}

async function getBackupForDownload(backupId) {
  const id = Number(backupId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid backup id.");
  }

  const result = await pool.query(
    `
      SELECT id, backup_name, file_name, file_path, file_size_bytes, status
      FROM backup_logs
      WHERE id = $1
    `,
    [id],
  );

  const backup = result.rows[0];
  if (!backup) {
    throw new Error("Backup not found.");
  }

  const resolvedPath = path.resolve(backup.file_path);
  const backupRoot = path.resolve(BACKUPS_DIR);
  if (!resolvedPath.startsWith(backupRoot + path.sep)) {
    throw new Error("Invalid backup file path.");
  }

  if (!fsSync.existsSync(resolvedPath)) {
    throw new Error("Backup file is missing.");
  }

  return {
    backup,
    file_path: resolvedPath,
  };
}

async function restoreDatabaseFromBackup(backupId) {
  const id = Number(backupId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid backup id.");
  }

  const result = await pool.query(
    `
      SELECT id, backup_name, file_path, status
      FROM backup_logs
      WHERE id = $1
    `,
    [id],
  );

  const backup = result.rows[0];
  if (!backup) {
    throw new Error("Backup not found.");
  }

  const resolvedPath = path.resolve(backup.file_path);
  const backupRoot = path.resolve(BACKUPS_DIR);
  if (!resolvedPath.startsWith(backupRoot + path.sep)) {
    throw new Error("Invalid backup file path.");
  }

  if (!fsSync.existsSync(resolvedPath)) {
    throw new Error("Backup file is missing.");
  }

  try {
    await runCommand(getExecutableName("psql"), [
      "--dbname",
      DEFAULT_DATABASE_URL,
      "--file",
      resolvedPath,
    ]);

    await pool.query(
      `
        UPDATE backup_logs
        SET status = $1, restored_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      ["restored", id],
    );

    return {
      success: true,
      backup_name: backup.backup_name,
    };
  } catch (error) {
    await pool.query(
      `
        UPDATE backup_logs
        SET status = $1
        WHERE id = $2
      `,
      ["failed", id],
    );

    throw new Error(`Restore failed: ${error.message}`);
  }
}

async function getBackupDashboardData() {
  const [summary, history] = await Promise.all([
    getBackupSummary(),
    getBackupHistory(),
  ]);

  return {
    summary,
    history,
  };
}

module.exports = {
  createDatabaseBackup,
  getBackupHistory,
  getBackupSummary,
  getBackupForDownload,
  restoreDatabaseFromBackup,
  getBackupDashboardData,
};
