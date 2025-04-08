// quickqr-menu/backend/database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt'); // bcrypt'i dosyanın başına taşıyalım

// Determine the database path relative to the backend directory
const dbPath = path.resolve(__dirname, 'quickqr_menu.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Foreign key desteğini etkinleştir
  db.run("PRAGMA foreign_keys = ON;", (err) => {
    if (err) console.error("Error enabling foreign keys:", err.message);
  });

  db.serialize(() => {
    // 1. Create Businesses table
    db.run(`
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL, -- URL için benzersiz kimlik (örn: meshur-kebapci)
        logo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error("Error creating businesses table:", err.message);
      else {
        // Add a default business if none exists
        db.get("SELECT * FROM businesses WHERE slug = ?", ['default-business'], (err, row) => {
          if (err) console.error("Error checking for default business:", err.message);
          else if (!row) {
            db.run("INSERT INTO businesses (name, slug) VALUES (?, ?)", ['Varsayılan İşletme', 'default-business'], function(insertErr) { // Use function() to get this.lastID
              if (insertErr) console.error("Error inserting default business:", insertErr.message);
              else {
                console.log("Default business created.");
                const defaultBusinessId = this.lastID; // Get the ID of the inserted business
                // Proceed to update other tables after default business is created
                addBusinessIdColumnsAndMigrate(defaultBusinessId);
              }
            });
          } else {
             // If default business already exists, still run the column adding/migration logic
             // in case it hasn't run before (e.g., due to previous errors)
             addBusinessIdColumnsAndMigrate(row.id);
          }
        });
      }
    });

    // Drop the old restaurant_settings table (now handled by businesses)
    db.run(`DROP TABLE IF EXISTS restaurant_settings`, (err) => {
        if (err) console.error("Error dropping restaurant_settings table:", err.message);
        else console.log("Dropped restaurant_settings table (if it existed).");
    });

  }); // End of initial db.serialize

  // Function to add columns and migrate data (called after default business exists)
  function addBusinessIdColumnsAndMigrate(defaultBusinessId) {
    db.serialize(() => {
      // 2. Update Users table
      db.run(`ALTER TABLE users ADD COLUMN business_id INTEGER REFERENCES businesses(id)`, (err) => {
        if (err && !err.message.includes('duplicate column name')) { // Ignore error if column already exists
            console.error("Error adding business_id to users:", err.message);
        } else {
            console.log("Column business_id added to users (or already exists).");
            // Associate existing admin user with the default business
            db.run(`UPDATE users SET business_id = ? WHERE username = 'admin' AND business_id IS NULL`, [defaultBusinessId], (updateErr) => {
                if (updateErr) console.error("Error updating admin user's business_id:", updateErr.message);
                else console.log("Default admin user associated with default business.");
            });
            // Make business_id NOT NULL after associating existing users
            // Note: SQLite doesn't directly support adding NOT NULL constraint with default easily via ALTER.
            // For simplicity, we'll skip enforcing NOT NULL here, but new users should require it.
        }
      });

      // Create Users table (if it doesn't exist - slightly modified)
      // Ensure business_id is part of the creation for new setups
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'admin' NOT NULL,
          business_id INTEGER NOT NULL REFERENCES businesses(id) -- Added business_id
        )
      `, (err) => {
        if (err) console.error("Error creating users table:", err.message);
        else {
          // Add default admin user logic (only if table was newly created)
          db.get("SELECT COUNT(*) as count FROM users", (countErr, result) => {
            if (!countErr && result.count === 0) {
                const defaultPassword = 'password123';
                const saltRounds = 10;
                bcrypt.hash(defaultPassword, saltRounds, (hashErr, hashedPassword) => {
                  if (hashErr) {
                    console.error("Error hashing default password:", hashErr.message);
                    return;
                  }
                  // Insert admin associated with the default business
                  db.run("INSERT INTO users (username, password, business_id) VALUES (?, ?, ?)",
                    ['admin', hashedPassword, defaultBusinessId], // Use the passed defaultBusinessId
                    (insertErr) => {
                      if (insertErr) console.error("Error inserting default admin:", insertErr.message);
                      else console.log("Default admin user created and associated with default business.");
                    }
                  );
                });
            }
          });
        }
      });


      // 3. Update Categories table
      db.run(`ALTER TABLE categories ADD COLUMN business_id INTEGER REFERENCES businesses(id)`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding business_id to categories:", err.message);
        } else {
            console.log("Column business_id added to categories (or already exists).");
            // Migrate existing categories to the default business
            db.run(`UPDATE categories SET business_id = ? WHERE business_id IS NULL`, [defaultBusinessId], (updateErr) => {
                if (updateErr) console.error("Error migrating categories:", updateErr.message);
                else console.log("Existing categories migrated to default business.");
            });
        }
      });
       // Create Categories table (if it doesn't exist - slightly modified)
       db.run(`
         CREATE TABLE IF NOT EXISTS categories (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           name TEXT NOT NULL,
           description TEXT,
           business_id INTEGER NOT NULL REFERENCES businesses(id) -- Added business_id
         )
       `, (err) => {
         if (err) console.error("Error creating categories table:", err.message);
       });


      // 4. Update Menu Items table
      db.run(`ALTER TABLE menu_items ADD COLUMN business_id INTEGER REFERENCES businesses(id)`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Error adding business_id to menu_items:", err.message);
        } else {
            console.log("Column business_id added to menu_items (or already exists).");
            // Migrate existing menu items to the default business
            db.run(`UPDATE menu_items SET business_id = ? WHERE business_id IS NULL`, [defaultBusinessId], (updateErr) => {
                if (updateErr) console.error("Error migrating menu items:", updateErr.message);
                else console.log("Existing menu items migrated to default business.");
            });
        }
      });
      // Create Menu Items table (if it doesn't exist - slightly modified)
      db.run(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          image_url TEXT,
          status TEXT DEFAULT 'available' NOT NULL,
          business_id INTEGER NOT NULL REFERENCES businesses(id), -- Added business_id
          FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) console.error("Error creating menu_items table:", err.message);
      });

    }); // End of second db.serialize
  } // <<< EKLENEN KAPANAN PARANTEZ for addBusinessIdColumnsAndMigrate
    // --- Original table creation logic is now integrated into the migration function ---
    // --- or modified to include business_id if the table is created anew ---

    // --- Original Categories table creation moved/modified ---

    // --- Original Menu Items table creation moved/modified ---

    // --- restaurant_settings table creation removed, handled by businesses table ---

  } // End of initializeDatabase

module.exports = db;