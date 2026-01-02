const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

// Configuration
const PIXELS_FILE = process.argv[2] || 'pixels.json';
const DB_PATH = process.argv[3] || 'pixels.db';

// Schema Definition (Mirrors existing api/src/database.ts)
const CREATE_PIXELS_TABLE = `
  CREATE TABLE IF NOT EXISTS pixels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    color TEXT NOT NULL,
    letter TEXT,
    sats INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(x, y)
  )
`;

const CREATE_ACTIVITY_TABLE = `
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    color TEXT NOT NULL,
    letter TEXT,
    sats INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    payment_hash TEXT NOT NULL,
    event_id TEXT,
    type TEXT DEFAULT 'purchase'
  )
`;

const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_pixels_position ON pixels(x, y);
  CREATE INDEX IF NOT EXISTS idx_pixels_created_at ON pixels(created_at);
  CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity(created_at DESC);
`;

function main() {
    console.log(`Starting restoration...`);
    console.log(`Source: ${PIXELS_FILE}`);
    console.log(`Target: ${DB_PATH}`);

    if (!fs.existsSync(PIXELS_FILE)) {
        console.error(`Error: File ${PIXELS_FILE} not found.`);
        process.exit(1);
    }

    // Initialize Database
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir) && dbDir !== '.') {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    console.log('Initializing schema...');
    db.exec(CREATE_PIXELS_TABLE);
    db.exec(CREATE_ACTIVITY_TABLE);
    db.exec(CREATE_INDEXES);

    // Read Data
    console.log('Reading pixel data...');
    const rawData = fs.readFileSync(PIXELS_FILE, 'utf-8');
    const pixels = JSON.parse(rawData);

    console.log(`Found ${pixels.length} pixels to restore.`);

    // Prepare Statement
    const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO pixels (x, y, color, letter, sats, created_at, updated_at)
        VALUES (@x, @y, @color, @letter, @sats, @created_at, @updated_at)
    `);

    // Execute Transaction
    const transaction = db.transaction((pixels) => {
        let count = 0;
        for (const pixel of pixels) {
            insertStmt.run({
                x: pixel.x,
                y: pixel.y,
                color: pixel.color,
                letter: pixel.letter || null,
                sats: pixel.sats,
                created_at: pixel.created_at || Date.now(),
                updated_at: pixel.updated_at || Date.now()
            });
            count++;
            if (count % 1000 === 0) {
                process.stdout.write(`Restored ${count} pixels...\r`);
            }
        }
        return count;
    });

    console.log('Beginning database insertion...');
    const startTime = Date.now();
    const count = transaction(pixels);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`\nSuccess! Restored ${count} pixels in ${duration.toFixed(2)}s.`);
    db.close();
}

main();
