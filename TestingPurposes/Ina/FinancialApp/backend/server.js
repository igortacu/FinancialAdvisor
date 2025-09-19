const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const initDatabase = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let db;

// Initialize DB on startup
(async () => {
  try {
    db = await initDatabase();
    console.log("🚀 Database initialized successfully");
  } catch (err) {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  }
})();

// Middleware to ensure database is initialized
const ensureDbInitialized = (req, res, next) => {
  if (!db) {
    return res.status(503).json({ error: "Database not initialized" });
  }
  next();
};

// Register
app.post("/register", ensureDbInitialized, async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  
  try {
    const hashed = await bcrypt.hash(password, 10);
    
    db.run(
      "INSERT INTO Users (Email, PasswordHash) VALUES (?, ?)",
      [email, hashed],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: "User with this email already exists" });
          }
          console.error("Registration error:", err);
          return res.status(500).json({ error: "Registration failed" });
        }
        
        res.json({ 
          message: "✅ User registered successfully",
          userId: this.lastID
        });
      }
    );
    
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/login", ensureDbInitialized, async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  
  try {
    db.get(
      "SELECT * FROM Users WHERE Email = ?",
      [email],
      async (err, user) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ error: "Login failed" });
        }
        
        if (!user) {
          return res.status(400).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        
        if (!isMatch) {
          return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ userId: user.Id }, "your_secret_key", { expiresIn: "1h" });
        res.json({ 
          message: "✅ Login successful", 
          token,
          user: {
            id: user.Id,
            email: user.Email
          }
        });
      }
    );
    
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Add Transaction endpoint
app.post("/transactions", ensureDbInitialized, async (req, res) => {
  const { userId, amount, category, merchant } = req.body;
  
  if (!userId || !amount) {
    return res.status(400).json({ error: "UserId and amount are required" });
  }
  
  try {
    db.run(
      "INSERT INTO Transactions (UserId, Amount, Category, Merchant) VALUES (?, ?, ?, ?)",
      [userId, amount, category || null, merchant || null],
      function(err) {
        if (err) {
          console.error("Transaction error:", err);
          return res.status(500).json({ error: "Failed to add transaction" });
        }
        
        res.json({ 
          message: "✅ Transaction added successfully",
          transactionId: this.lastID
        });
      }
    );
    
  } catch (err) {
    console.error("Transaction error:", err);
    res.status(500).json({ error: "Failed to add transaction" });
  }
});

// Get Transactions endpoint
app.get("/transactions/:userId", ensureDbInitialized, (req, res) => {
  const { userId } = req.params;
  
  db.all(
    "SELECT * FROM Transactions WHERE UserId = ? ORDER BY Date DESC",
    [userId],
    (err, transactions) => {
      if (err) {
        console.error("Get transactions error:", err);
        return res.status(500).json({ error: "Failed to get transactions" });
      }
      
      res.json({ transactions });
    }
  );
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    database: db ? "Connected" : "Not initialized",
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('✅ Database connection closed');
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API server running on http://0.0.0.0:${PORT}`);
  console.log(`📋 Health check: http://192.168.1.33:${PORT}/health`);
});