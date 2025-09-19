const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'financial_advisor.db');

async function initDatabase() {
  return new Promise((resolve, reject) => {
    console.log("🔄 Initializing SQLite database...");
    
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("❌ SQLite connection failed:", err.message);
        reject(err);
        return;
      }
      console.log("✅ Connected to SQLite database");
    });

    // Create Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS Users (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        Email TEXT UNIQUE NOT NULL,
        PasswordHash TEXT NOT NULL,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error("❌ Users table creation failed:", err.message);
        reject(err);
        return;
      }
      console.log("✅ Users table ensured");
    });

    // Create Transactions table
    db.run(`
      CREATE TABLE IF NOT EXISTS Transactions (
        Id INTEGER PRIMARY KEY AUTOINCREMENT,
        UserId INTEGER NOT NULL,
        Amount REAL NOT NULL,
        Category TEXT,
        Merchant TEXT,
        Date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (UserId) REFERENCES Users(Id)
      )
    `, (err) => {
      if (err) {
        console.error("❌ Transactions table creation failed:", err.message);
        reject(err);
        return;
      }
      console.log("✅ Transactions table ensured");
      console.log("🎉 SQLite database initialization completed!");
      resolve(db);
    });
  });
}

module.exports = initDatabase;