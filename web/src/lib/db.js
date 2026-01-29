import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'thriven.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS uploads (
    id TEXT PRIMARY KEY,
    folder_path TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    file_count INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS analysis_results (
    id TEXT PRIMARY KEY,
    upload_id TEXT NOT NULL,
    raw_index_json TEXT,
    analysis_index_json TEXT,
    duplicates_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES uploads(id)
  );

  CREATE TABLE IF NOT EXISTS stemmaps (
    id TEXT PRIMARY KEY,
    upload_id TEXT NOT NULL,
    stemmap_yaml TEXT,
    pack_title TEXT,
    bpm INTEGER,
    key_signature TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES uploads(id)
  );

  CREATE TABLE IF NOT EXISTS exports (
    id TEXT PRIMARY KEY,
    upload_id TEXT,
    export_type TEXT,
    output_path TEXT,
    manifest_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export function createUpload(data) {
  const stmt = db.prepare(`
    INSERT INTO uploads (id, folder_path, folder_name, file_count, total_size_bytes, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(data.id, data.folder_path, data.folder_name, data.file_count, data.total_size_bytes, data.status);
  return data;
}

export function getUpload(id) {
  const stmt = db.prepare('SELECT * FROM uploads WHERE id = ?');
  return stmt.get(id);
}

export function getAllUploads() {
  const stmt = db.prepare('SELECT * FROM uploads ORDER BY created_at DESC');
  return stmt.all();
}

export function updateUploadStatus(id, status) {
  const stmt = db.prepare('UPDATE uploads SET status = ? WHERE id = ?');
  stmt.run(status, id);
}

export function saveAnalysisResult(data) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO analysis_results (id, upload_id, raw_index_json, analysis_index_json, duplicates_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(data.id, data.upload_id, data.raw_index_json, data.analysis_index_json, data.duplicates_json);
  return data;
}

export function getAnalysisResult(uploadId) {
  const stmt = db.prepare('SELECT * FROM analysis_results WHERE upload_id = ?');
  return stmt.get(uploadId);
}

export function saveStemmap(data) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO stemmaps (id, upload_id, stemmap_yaml, pack_title, bpm, key_signature)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(data.id, data.upload_id, data.stemmap_yaml, data.pack_title, data.bpm, data.key_signature);
  return data;
}

export function getStemmap(uploadId) {
  const stmt = db.prepare('SELECT * FROM stemmaps WHERE upload_id = ?');
  return stmt.get(uploadId);
}

export function saveExport(data) {
  const stmt = db.prepare(`
    INSERT INTO exports (id, upload_id, export_type, output_path, manifest_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(data.id, data.upload_id, data.export_type, data.output_path, data.manifest_json);
  return data;
}

export function getExports(uploadId) {
  const stmt = db.prepare('SELECT * FROM exports WHERE upload_id = ? ORDER BY created_at DESC');
  return stmt.all(uploadId);
}

export default db;
