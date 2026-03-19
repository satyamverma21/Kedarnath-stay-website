const { getDb } = require('./database');

function runMigrations() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS hotels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      capacity INTEGER DEFAULT 2,
      basePrice REAL NOT NULL,
      amenities TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS room_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
      image_path TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      capacity INTEGER DEFAULT 2,
      basePrice REAL NOT NULL,
      amenities TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tent_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tent_id INTEGER REFERENCES tents(id) ON DELETE CASCADE,
      image_path TEXT NOT NULL,
      is_primary INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id),
      property_type TEXT NOT NULL,
      property_id INTEGER NOT NULL,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      guests INTEGER DEFAULT 1,
      nights INTEGER NOT NULL,
      base_amount REAL NOT NULL,
      tax_amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      special_requests TEXT,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER REFERENCES bookings(id),
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'pending',
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS price_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_type TEXT NOT NULL,
      property_id INTEGER NOT NULL,
      season TEXT DEFAULT 'all',
      price_per_night REAL NOT NULL,
      weekend_surcharge REAL DEFAULT 0,
      tax_percent REAL DEFAULT 18,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      interested_in TEXT,
      approx_guests INTEGER,
      message TEXT,
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS phone_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      agent_id INTEGER REFERENCES users(id),
      discount_percent REAL NOT NULL,
      max_uses INTEGER DEFAULT 0,
      used_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
      valid_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agent_referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER REFERENCES users(id),
      customer_id INTEGER REFERENCES users(id),
      booking_id INTEGER REFERENCES bookings(id),
      promo_code_id INTEGER REFERENCES promo_codes(id),
      discount_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add hotel_id column to users table if it doesn't exist yet
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  const hasHotelId = userColumns.some((col) => col.name === 'hotel_id');
  if (!hasHotelId) {
    db.exec('ALTER TABLE users ADD COLUMN hotel_id INTEGER REFERENCES hotels(id);');
  }

  // Add hotel_id column to rooms table if it doesn't exist yet
  const roomColumns = db.prepare('PRAGMA table_info(rooms)').all();
  const roomHasHotelId = roomColumns.some((col) => col.name === 'hotel_id');
  if (!roomHasHotelId) {
    db.exec('ALTER TABLE rooms ADD COLUMN hotel_id INTEGER REFERENCES hotels(id);');
  }

  // Add hotel_id column to tents table if it doesn't exist yet
  const tentColumns = db.prepare('PRAGMA table_info(tents)').all();
  const tentHasHotelId = tentColumns.some((col) => col.name === 'hotel_id');
  if (!tentHasHotelId) {
    db.exec('ALTER TABLE tents ADD COLUMN hotel_id INTEGER REFERENCES hotels(id);');
  }

  // Add promo_code_id column to bookings table if it doesn't exist yet
  const bookingColumns = db.prepare('PRAGMA table_info(bookings)').all();
  const bookingHasPromoCodeId = bookingColumns.some((col) => col.name === 'promo_code_id');
  if (!bookingHasPromoCodeId) {
    db.exec('ALTER TABLE bookings ADD COLUMN promo_code_id INTEGER REFERENCES promo_codes(id);');
    db.exec('ALTER TABLE bookings ADD COLUMN discount_amount REAL DEFAULT 0;');
  }

  seedInitialData(db);
}

function seedInitialData(db) {
  // Ensure at least one hotel exists so we can attach the initial admin
  let defaultHotelId = null;
  const hotelCount = db.prepare('SELECT COUNT(*) as count FROM hotels').get().count;
  if (hotelCount === 0) {
    const info = db
      .prepare('INSERT INTO hotels (name, city, status) VALUES (?, ?, ?)')
      .run('Main Hotel', null, 'active');
    defaultHotelId = info.lastInsertRowid;
  } else {
    const row = db.prepare('SELECT id FROM hotels ORDER BY id LIMIT 1').get();
    defaultHotelId = row ? row.id : null;
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    const bcrypt = require('bcryptjs');
    const passwordHash = bcrypt.hashSync('admin', 10);
    db.prepare(
      'INSERT INTO users (name, email, phone, password_hash, role, hotel_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('Admin', 'admin@admin.com','9999999999', passwordHash, 'admin', defaultHotelId);
  }

  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomCount === 0) {
    const insertRoom = db.prepare(
      'INSERT INTO rooms (name, type, description, capacity, basePrice, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    insertRoom.run(
      'Forest View Standard Room',
      'standard',
      'Cozy room with forest view and all basic amenities.',
      2,
      2500,
      JSON.stringify(['Free WiFi', 'Breakfast Included', 'Air Conditioning']),
      'active'
    );
    insertRoom.run(
      'Lakefront Deluxe Room',
      'deluxe',
      'Spacious room facing the lake with balcony.',
      3,
      4000,
      JSON.stringify(['Free WiFi', 'Lake View', 'Balcony', 'King Bed']),
      'active'
    );
    insertRoom.run(
      'Family Suite',
      'family',
      'Two-bedroom suite ideal for families.',
      5,
      6000,
      JSON.stringify(['Living Area', 'Two Bedrooms', 'Mini Fridge']),
      'active'
    );
  }

  const tentCount = db.prepare('SELECT COUNT(*) as count FROM tents').get().count;
  if (tentCount === 0) {
    const insertTent = db.prepare(
      'INSERT INTO tents (name, type, description, capacity, basePrice, amenities, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    insertTent.run(
      'Standard Camp Tent',
      'standard',
      'Comfortable camping tent with basic facilities.',
      2,
      1800,
      JSON.stringify(['Shared Bonfire', 'Sleeping Bags']),
      'active'
    );
    insertTent.run(
      'Luxury Safari Tent',
      'luxury',
      'Luxury safari tent with attached washroom.',
      3,
      3500,
      JSON.stringify(['Attached Washroom', 'Private Bonfire', 'Breakfast']),
      'active'
    );
    insertTent.run(
      'Honeymoon Glamping Tent',
      'honeymoon',
      'Romantic glamping tent with decor and amenities.',
      2,
      5000,
      JSON.stringify(['Decor Lighting', 'Private Bonfire', 'Candle Light Dinner']),
      'active'
    );
  }
}

module.exports = { runMigrations };

