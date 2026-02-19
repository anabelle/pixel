import Database from 'better-sqlite3';
const db = new Database('/home/pixel/lnpixels/api/pixels.db');
const stmt = db.prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT 20');
const rows = stmt.all();
console.log(JSON.stringify(rows, null, 2));
db.close();