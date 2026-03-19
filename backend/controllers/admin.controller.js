const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/database');
const { MAX_IMAGES_PER_PROPERTY } = require('../middleware/upload.middleware');
const bcrypt = require('bcryptjs');
require('dotenv').config();

function getTodayDateString() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function getDashboard(req, res) {
  try {
    const db = getDb();

    const totalBookings = db.prepare('SELECT COUNT(*) as count FROM bookings').get().count;

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    const monthStartStr = thisMonthStart.toISOString().slice(0, 10);
    const thisMonthRevenue = db
      .prepare(
        `SELECT IFNULL(SUM(total_amount), 0) as revenue
         FROM bookings
         WHERE payment_status = 'paid' AND date(created_at) >= date(?)`
      )
      .get(monthStartStr).revenue;

    const today = getTodayDateString();
    const activeRooms = db.prepare("SELECT COUNT(*) as c FROM rooms WHERE status = 'active'").get()
      .c;
    const activeTents = db.prepare("SELECT COUNT(*) as c FROM tents WHERE status = 'active'").get()
      .c;
    const totalProperties = activeRooms + activeTents || 1;

    const todaysConfirmed = db
      .prepare(
        `SELECT COUNT(*) as c FROM bookings 
         WHERE status = 'confirmed' 
           AND date(check_in) <= date(?) 
           AND date(check_out) > date(?)`
      )
      .get(today, today).c;
    const occupancy = (todaysConfirmed / totalProperties) * 100;

    const pendingEnquiries = db
      .prepare(`SELECT COUNT(*) as c FROM enquiries WHERE status = 'new'`)
      .get().c;

    const recentBookings = db
      .prepare(
        `SELECT b.*, u.name as guest_name 
         FROM bookings b 
         LEFT JOIN users u ON u.id = b.user_id
         ORDER BY b.created_at DESC
         LIMIT 10`
      )
      .all();

    return res.json({
      totalBookings,
      thisMonthRevenue,
      occupancy: Number(occupancy.toFixed(2)),
      pendingEnquiries,
      recentBookings
    });
  } catch (err) {
    console.error('Get dashboard error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// HOTEL MASTER

async function listHotels(req, res) {
  try {
    const db = getDb();
    const hotels = db.prepare('SELECT * FROM hotels ORDER BY name').all();
    return res.json(hotels);
  } catch (err) {
    console.error('Admin list hotels error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createHotel(req, res) {
  try {
    const { name, city, status } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Hotel name is required' });
    }
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO hotels (name, city, status)
       VALUES (?, ?, ?)`
    );
    const info = stmt.run(name, city || null, status || 'active');
    const hotel = db.prepare('SELECT * FROM hotels WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(hotel);
  } catch (err) {
    console.error('Admin create hotel error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateHotel(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, city, status } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hotels WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    db.prepare(
      `UPDATE hotels
       SET name = ?, city = ?, status = ?
       WHERE id = ?`
    ).run(
      name || existing.name,
      city !== undefined ? city : existing.city,
      status || existing.status,
      id
    );
    const hotel = db.prepare('SELECT * FROM hotels WHERE id = ?').get(id);
    return res.json(hotel);
  } catch (err) {
    console.error('Admin update hotel error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteHotel(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const existing = db.prepare('SELECT * FROM hotels WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Hotel not found' });
    }

    // Optional safety: prevent deleting a hotel that still has users
    const userCount = db
      .prepare('SELECT COUNT(*) as c FROM users WHERE hotel_id = ?')
      .get(id).c;
    if (userCount > 0) {
      return res
        .status(400)
        .json({ message: 'Cannot delete hotel with associated users. Move or remove users first.' });
    }

    db.prepare('DELETE FROM hotels WHERE id = ?').run(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete hotel error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// USER MASTER (HOTEL-WISE)

async function listUsers(req, res) {
  try {
    const { hotelId, id } = req.query;
    const db = getDb();
    let query = `SELECT u.id, u.name, u.email, u.phone, u.role, u.hotel_id, h.name as hotel_name
                 FROM users u
                 LEFT JOIN hotels h ON h.id = u.hotel_id
                 WHERE 1 = 1`;
    const params = [];

    if (id) {
      query += ' AND u.id = ?';
      params.push(Number(id));
    }
    if (hotelId) {
      query += ' AND u.hotel_id = ?';
      params.push(Number(hotelId));
    }

    query += ' ORDER BY u.name';
    const users = db.prepare(query).all(...params);
    return res.json(users);
  } catch (err) {
    console.error('Admin list users error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createUser(req, res) {
  try {
    const { name, email, phone, password, role, hotelId } = req.body;
    if (!name || !phone || !password) {
      return res
        .status(400)
        .json({ message: 'Name, phone and password are required' });
    }

    const db = getDb();

    const existingByPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existingByPhone) {
      return res.status(400).json({ message: 'Phone is already registered' });
    }
    if (email) {
      const existingByEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingByEmail) {
        return res.status(400).json({ message: 'Email is already registered' });
      }
    }

    const storedEmail = email || `user_${phone}@auto.local`;
    const passwordHash = await bcrypt.hash(password, 10);

    const stmt = db.prepare(
      `INSERT INTO users (name, email, password_hash, phone, role, hotel_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    const finalRole = role || 'admin';
    let finalHotelId = null;
    if (finalRole === 'hotel-admin') {
      if (!hotelId) {
        return res
          .status(400)
          .json({ message: 'Hotel is required for hotel-admin users' });
      }
      finalHotelId = Number(hotelId);
    }

    const info = stmt.run(
      name,
      storedEmail,
      passwordHash,
      phone,
      finalRole,
      finalHotelId
    );

    const user = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.hotel_id, h.name as hotel_name
         FROM users u
         LEFT JOIN hotels h ON h.id = u.hotel_id
         WHERE u.id = ?`
      )
      .get(info.lastInsertRowid);

    return res.status(201).json(user);
  } catch (err) {
    console.error('Admin create user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, email, phone, password, role, hotelId } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update unique fields if they are changing
    if (phone && phone !== existing.phone) {
      const existingByPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
      if (existingByPhone) {
        return res.status(400).json({ message: 'Phone is already registered' });
      }
    }
    if (email && email !== existing.email) {
      const existingByEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingByEmail) {
        return res.status(400).json({ message: 'Email is already registered' });
      }
    }

    let passwordHash = existing.password_hash;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    db.prepare(
      `UPDATE users
       SET name = ?, email = ?, phone = ?, role = ?, hotel_id = ?, password_hash = ?
       WHERE id = ?`
    ).run(
      name || existing.name,
      email || existing.email,
      phone || existing.phone,
      role || existing.role,
      hotelId !== undefined ? Number(hotelId) : existing.hotel_id,
      passwordHash,
      id
    );

    const user = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.hotel_id, h.name as hotel_name
         FROM users u
         LEFT JOIN hotels h ON h.id = u.hotel_id
         WHERE u.id = ?`
      )
      .get(id);

    return res.json(user);
  } catch (err) {
    console.error('Admin update user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function listRooms(req, res) {
  try {
    const { hotelId } = req.query;
    const db = getDb();
    let query = `SELECT r.*, h.name as hotel_name
                 FROM rooms r
                 LEFT JOIN hotels h ON h.id = r.hotel_id
                 WHERE 1 = 1`;
    const params = [];

    // If caller is hotel-admin, force filter to their hotel
    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId) {
        return res.status(400).json({ message: 'Hotel not assigned to this user' });
      }
      query += ' AND r.hotel_id = ?';
      params.push(req.user.hotelId);
    } else if (hotelId) {
      query += ' AND r.hotel_id = ?';
      params.push(Number(hotelId));
    }

    const rooms = db.prepare(query).all(...params);
    return res.json(rooms);
  } catch (err) {
    console.error('Admin list rooms error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createRoom(req, res) {
  try {
    const { name, type, description, capacity, basePrice, amenities, status, hotelId } = req.body;
    if (!name || !type || !basePrice) {
      return res
        .status(400)
        .json({ message: 'Name, type and basePrice are required for a room' });
    }
    const db = getDb();

    let effectiveHotelId = null;
    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId) {
        return res.status(400).json({ message: 'Hotel not assigned to this user' });
      }
      effectiveHotelId = req.user.hotelId;
    } else {
      if (!hotelId) {
        return res.status(400).json({ message: 'hotelId is required for creating a room' });
      }
      effectiveHotelId = Number(hotelId);
    }

    const stmt = db.prepare(
      `INSERT INTO rooms (name, type, description, capacity, basePrice, amenities, status, hotel_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      name,
      type,
      description || null,
      capacity || 2,
      basePrice,
      amenities ? JSON.stringify(amenities) : null,
      status || 'active',
      effectiveHotelId
    );
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(room);
  } catch (err) {
    console.error('Admin create room error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateRoom(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, type, description, capacity, basePrice, amenities, status } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Hotel-admins may only modify rooms for their own hotel
    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId || existing.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ message: 'Not allowed to modify rooms of another hotel' });
      }
    }
    const stmt = db.prepare(
      `UPDATE rooms SET 
        name = ?, type = ?, description = ?, capacity = ?, 
        basePrice = ?, amenities = ?, status = ?
       WHERE id = ?`
    );
    stmt.run(
      name || existing.name,
      type || existing.type,
      description || existing.description,
      capacity || existing.capacity,
      basePrice != null ? basePrice : existing.basePrice,
      amenities ? JSON.stringify(amenities) : existing.amenities,
      status || existing.status,
      id
    );
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    return res.json(room);
  } catch (err) {
    console.error('Admin update room error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteRoom(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId || existing.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ message: 'Not allowed to delete rooms of another hotel' });
      }
    }
    db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete room error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function uploadRoomImages(req, res) {
  try {
    const roomId = Number(req.params.id);
    const db = getDb();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId || room.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ message: 'Not allowed to manage images of another hotel' });
      }
    }
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const currentCount = db.prepare('SELECT COUNT(*) as c FROM room_images WHERE room_id = ?').get(roomId).c;
    const slotsLeft = MAX_IMAGES_PER_PROPERTY - currentCount;
    if (slotsLeft <= 0) {
      return res.status(400).json({
        message: `Maximum ${MAX_IMAGES_PER_PROPERTY} images per room. Remove an image to add more.`
      });
    }
    
    const filesToAdd = req.files.slice(0, slotsLeft);
    console.log(req.files)
    const insert = db.prepare(
      'INSERT INTO room_images (room_id, image_path, is_primary) VALUES (?, ?, ?)'
    );
    const existingPrimary = db
      .prepare('SELECT 1 FROM room_images WHERE room_id = ? AND is_primary = 1')
      .get(roomId);

    const images = [];
    filesToAdd.forEach((file, index) => {
      const isPrimary = !existingPrimary && index === 0 ? 1 : 0;
      const info = insert.run(roomId, file.path, isPrimary);
      images.push({
        id: info.lastInsertRowid,
        room_id: roomId,
        image_path: file.path,
        is_primary: isPrimary
      });
    });

    return res.status(201).json(images);
  } catch (err) {
    console.error('Admin upload room images error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function resolveImagePath(imagePath) {
  if (!imagePath) return null;
  const normalized = path.normalize(imagePath);
  return path.isAbsolute(normalized) ? normalized : path.resolve(process.cwd(), normalized);
}

async function deleteRoomImage(req, res) {
  try {
    const roomId = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM room_images WHERE id = ? AND room_id = ?')
      .get(imageId, roomId);
    if (!existing) {
      return res.status(404).json({ message: 'Image not found' });
    }
    const filePath = resolveImagePath(existing.image_path);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn('Could not delete image file:', filePath, unlinkErr.message);
      }
    }
    db.prepare('DELETE FROM room_images WHERE id = ?').run(imageId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete room image error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function setPrimaryRoomImage(req, res) {
  try {
    const roomId = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM room_images WHERE id = ? AND room_id = ?')
      .get(imageId, roomId);
    if (!existing) {
      return res.status(404).json({ message: 'Image not found' });
    }
    db.prepare('UPDATE room_images SET is_primary = 0 WHERE room_id = ?').run(roomId);
    db.prepare('UPDATE room_images SET is_primary = 1 WHERE id = ?').run(imageId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin set primary room image error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function listTents(req, res) {
  try {
    const { hotelId } = req.query;
    const db = getDb();
    let query = `SELECT t.*, h.name as hotel_name
                 FROM tents t
                 LEFT JOIN hotels h ON h.id = t.hotel_id
                 WHERE 1 = 1`;
    const params = [];

    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId) {
        return res.status(400).json({ message: 'Hotel not assigned to this user' });
      }
      query += ' AND t.hotel_id = ?';
      params.push(req.user.hotelId);
    } else if (hotelId) {
      query += ' AND t.hotel_id = ?';
      params.push(Number(hotelId));
    }

    const tents = db.prepare(query).all(...params);
    return res.json(tents);
  } catch (err) {
    console.error('Admin list tents error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createTent(req, res) {
  try {
    const { name, type, description, capacity, basePrice, amenities, status, hotelId } = req.body;
    
    if (!name || !type || !basePrice) {
      return res
        .status(400)
        .json({ message: 'Name, type and basePrice are required for a tent' });
    }
    const db = getDb();

    let effectiveHotelId = null;
    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId) {
        return res.status(400).json({ message: 'Hotel not assigned to this user' });
      }
      effectiveHotelId = req.user.hotelId;
    } else {
      if (!hotelId) {
        return res.status(400).json({ message: 'hotelId is required for creating a tent' });
      }
      effectiveHotelId = Number(hotelId);
    }

    const stmt = db.prepare(
      `INSERT INTO tents (name, type, description, capacity, basePrice, amenities, status, hotel_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      name,
      type,
      description || null,
      capacity || 2,
      basePrice,
      amenities ? JSON.stringify(amenities) : null,
      status || 'active',
      effectiveHotelId
    );
    const tent = db.prepare('SELECT * FROM tents WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(tent);
  } catch (err) {
    console.error('Admin create tent error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateTent(req, res) {
  try {
    const id = Number(req.params.id);
    const { name, type, description, capacity, basePrice, amenities, status } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM tents WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Tent not found' });
    }

    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId || existing.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ message: 'Not allowed to modify tents of another hotel' });
      }
    }
    const stmt = db.prepare(
      `UPDATE tents SET 
        name = ?, type = ?, description = ?, capacity = ?, 
        basePrice = ?, amenities = ?, status = ?
       WHERE id = ?`
    );
    stmt.run(
      name || existing.name,
      type || existing.type,
      description || existing.description,
      capacity || existing.capacity,
      basePrice != null ? basePrice : existing.basePrice,
      amenities ? JSON.stringify(amenities) : existing.amenities,
      status || existing.status,
      id
    );
    const tent = db.prepare('SELECT * FROM tents WHERE id = ?').get(id);
    return res.json(tent);
  } catch (err) {
    console.error('Admin update tent error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteTent(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const existing = db.prepare('SELECT * FROM tents WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Tent not found' });
    }

    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId || existing.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ message: 'Not allowed to delete tents of another hotel' });
      }
    }
    db.prepare('DELETE FROM tents WHERE id = ?').run(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete tent error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function uploadTentImages(req, res) {
  try {
    const tentId = Number(req.params.id);
    const db = getDb();
    const tent = db.prepare('SELECT * FROM tents WHERE id = ?').get(tentId);
    if (!tent) {
      return res.status(404).json({ message: 'Tent not found' });
    }
    if (req.user.role === 'hotel-admin') {
      if (!req.user.hotelId || tent.hotel_id !== req.user.hotelId) {
        return res.status(403).json({ message: 'Not allowed to manage images of another hotel' });
      }
    }
    if (!req.files || !req.files.length) {
      return res.status(400).json({ message: 'No images uploaded' });
    }

    const currentCount = db.prepare('SELECT COUNT(*) as c FROM tent_images WHERE tent_id = ?').get(tentId).c;
    const slotsLeft = MAX_IMAGES_PER_PROPERTY - currentCount;
    if (slotsLeft <= 0) {
      return res.status(400).json({
        message: `Maximum ${MAX_IMAGES_PER_PROPERTY} images per tent. Remove an image to add more.`
      });
    }
    const filesToAdd = req.files.slice(0, slotsLeft);

    const insert = db.prepare(
      'INSERT INTO tent_images (tent_id, image_path, is_primary) VALUES (?, ?, ?)'
    );
    const existingPrimary = db
      .prepare('SELECT 1 FROM tent_images WHERE tent_id = ? AND is_primary = 1')
      .get(tentId);

    const images = [];
    filesToAdd.forEach((file, index) => {
      const isPrimary = !existingPrimary && index === 0 ? 1 : 0;
      const info = insert.run(tentId, file.path, isPrimary);
      images.push({
        id: info.lastInsertRowid,
        tent_id: tentId,
        image_path: file.path,
        is_primary: isPrimary
      });
    });

    return res.status(201).json(images);
  } catch (err) {
    console.error('Admin upload tent images error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteTentImage(req, res) {
  try {
    const tentId = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM tent_images WHERE id = ? AND tent_id = ?')
      .get(imageId, tentId);
    if (!existing) {
      return res.status(404).json({ message: 'Image not found' });
    }
    const filePath = resolveImagePath(existing.image_path);
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkErr) {
        console.warn('Could not delete image file:', filePath, unlinkErr.message);
      }
    }
    db.prepare('DELETE FROM tent_images WHERE id = ?').run(imageId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete tent image error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function setPrimaryTentImage(req, res) {
  try {
    const tentId = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    const db = getDb();
    const existing = db
      .prepare('SELECT * FROM tent_images WHERE id = ? AND tent_id = ?')
      .get(imageId, tentId);
    if (!existing) {
      return res.status(404).json({ message: 'Image not found' });
    }
    db.prepare('UPDATE tent_images SET is_primary = 0 WHERE tent_id = ?').run(tentId);
    db.prepare('UPDATE tent_images SET is_primary = 1 WHERE id = ?').run(imageId);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin set primary tent image error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function listAdminBookings(req, res) {
  try {
    const { status, propertyType, from, to } = req.query;
    const db = getDb();
    let query = `SELECT b.*, u.name as guest_name 
                 FROM bookings b
                 LEFT JOIN users u ON u.id = b.user_id
                 WHERE 1 = 1`;
    const params = [];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    if (propertyType) {
      query += ' AND b.property_type = ?';
      params.push(propertyType);
    }
    if (from) {
      query += ' AND date(b.created_at) >= date(?)';
      params.push(from);
    }
    if (to) {
      query += ' AND date(b.created_at) <= date(?)';
      params.push(to);
    }

    query += ' ORDER BY b.created_at DESC';

    const bookings = db.prepare(query).all(...params);
    return res.json(bookings);
  } catch (err) {
    console.error('Admin list bookings error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateBookingStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return res.json(booking);
  } catch (err) {
    console.error('Admin update booking status error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function listPriceSettings(req, res) {
  try {
    const db = getDb();
    const settings = db.prepare('SELECT * FROM price_settings').all();
    return res.json(settings);
  } catch (err) {
    console.error('Admin list price settings error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function createPriceSetting(req, res) {
  try {
    const { propertyType, propertyId, season, pricePerNight, weekendSurcharge, taxPercent } =
      req.body;
    if (!propertyType || !propertyId || !pricePerNight) {
      return res.status(400).json({
        message: 'propertyType, propertyId and pricePerNight are required'
      });
    }
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO price_settings (
        property_type, property_id, season, price_per_night, weekend_surcharge, tax_percent
      ) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      propertyType,
      propertyId,
      season || 'all',
      pricePerNight,
      weekendSurcharge || 0,
      taxPercent != null ? taxPercent : Number(process.env.TAX_PERCENT || 18)
    );
    const setting = db.prepare('SELECT * FROM price_settings WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(setting);
  } catch (err) {
    console.error('Admin create price setting error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updatePriceSetting(req, res) {
  try {
    const id = Number(req.params.id);
    const { season, pricePerNight, weekendSurcharge, taxPercent } = req.body;
    const db = getDb();
    const existing = db.prepare('SELECT * FROM price_settings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Price setting not found' });
    }
    db.prepare(
      `UPDATE price_settings SET 
        season = ?, price_per_night = ?, weekend_surcharge = ?, tax_percent = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      season || existing.season,
      pricePerNight != null ? pricePerNight : existing.price_per_night,
      weekendSurcharge != null ? weekendSurcharge : existing.weekend_surcharge,
      taxPercent != null ? taxPercent : existing.tax_percent,
      id
    );
    const setting = db.prepare('SELECT * FROM price_settings WHERE id = ?').get(id);
    return res.json(setting);
  } catch (err) {
    console.error('Admin update price setting error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deletePriceSetting(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const existing = db.prepare('SELECT * FROM price_settings WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Price setting not found' });
    }
    db.prepare('DELETE FROM price_settings WHERE id = ?').run(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete price setting error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function listEnquiries(req, res) {
  try {
    const { status } = req.query;
    const db = getDb();
    let query = 'SELECT * FROM enquiries WHERE 1 = 1';
    const params = [];
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const enquiries = db.prepare(query).all(...params);
    return res.json(enquiries);
  } catch (err) {
    console.error('Admin list enquiries error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateEnquiryStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    const validStatuses = ['new', 'read', 'replied'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const db = getDb();
    const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }
    db.prepare('UPDATE enquiries SET status = ? WHERE id = ?').run(status, id);
    const enquiry = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id);
    return res.json(enquiry);
  } catch (err) {
    console.error('Admin update enquiry status error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteEnquiry(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }
    db.prepare('DELETE FROM enquiries WHERE id = ?').run(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Admin delete enquiry error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getAgentStats(req, res) {
  try {
    const db = getDb();
    const agentStats = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        COUNT(DISTINCT ar.customer_id) as total_customers,
        COUNT(ar.id) as total_referrals,
        IFNULL(SUM(ar.discount_amount), 0) as total_discount_given,
        IFNULL(SUM(b.total_amount), 0) as total_revenue_generated,
        COUNT(DISTINCT b.id) as total_bookings
      FROM users u
      LEFT JOIN agent_referrals ar ON ar.agent_id = u.id
      LEFT JOIN bookings b ON b.id = ar.booking_id
      WHERE u.role = 'agent'
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY total_revenue_generated DESC
    `).all();

    res.json(agentStats);
  } catch (err) {
    console.error('Admin get agent stats error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getDashboard,
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  uploadRoomImages,
  deleteRoomImage,
  setPrimaryRoomImage,
  listTents,
  createTent,
  updateTent,
  deleteTent,
  uploadTentImages,
  deleteTentImage,
  setPrimaryTentImage,
  listHotels,
  createHotel,
  updateHotel,
  deleteHotel,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listAdminBookings,
  updateBookingStatus,
  listPriceSettings,
  createPriceSetting,
  updatePriceSetting,
  deletePriceSetting,
  listEnquiries,
  updateEnquiryStatus,
  deleteEnquiry,
  getAgentStats
};

