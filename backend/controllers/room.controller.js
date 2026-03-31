const path = require('path');
const { getDb } = require('../db/database');
require('dotenv').config();

function buildImageUrl(req, relativePath) {
  if (!relativePath) return null;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return normalized;
  }
  return `${baseUrl}/${normalized.replace(/^\.?\//, '')}`;
}

async function listRooms(req, res) {
  try {
    const { type, minPrice, maxPrice, capacity } = req.query;
    const db = getDb();

    let query = "SELECT * FROM rooms WHERE status = 'active'";
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (minPrice) {
      query += ' AND totalPrice >= ?';
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      query += ' AND totalPrice <= ?';
      params.push(Number(maxPrice));
    }
    if (capacity) {
      query += ' AND capacity >= ?';
      params.push(Number(capacity));
    }

    const rooms = db.prepare(query).all(...params);

    const roomIds = rooms.map((r) => r.id);
    let imagesByRoom = {};
    if (roomIds.length) {
      const placeholders = roomIds.map(() => '?').join(',');
      const images = db
        .prepare(
          `SELECT * FROM room_images WHERE room_id IN (${placeholders}) ORDER BY is_primary DESC, id ASC`
        )
        .all(...roomIds);
      imagesByRoom = images.reduce((acc, img) => {
        if (!acc[img.room_id]) acc[img.room_id] = [];
        acc[img.room_id].push(img);
        return acc;
      }, {});
    }

    const result = rooms.map((room) => {
      const images = (imagesByRoom[room.id] || []).map((img) => ({
        id: img.id,
        isPrimary: !!img.is_primary,
        url: buildImageUrl(req, path.join('uploads', 'rooms', path.basename(img.image_path)))
      }));
      return {
        ...room,
        amenities: room.amenities ? JSON.parse(room.amenities) : [],
        images
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('List rooms error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function searchRooms(req, res) {
  try {
    const { checkin, checkout, guests, type } = req.query;
    if (!checkin || !checkout || !guests) {
      return res.status(400).json({ message: 'checkin, checkout and guests are required' });
    }

    const db = getDb();
    const params = [Number(guests)];
    let query = "SELECT * FROM rooms WHERE status = 'active' AND capacity >= ?";

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    const rooms = db.prepare(query).all(...params);

    const availableRooms = rooms.filter((room) => {
      const overlapping = db
        .prepare(
          `SELECT 1 FROM bookings 
           WHERE property_type = 'room'
             AND property_id = ?
             AND status != 'cancelled'
             AND NOT (date(check_out) <= date(?) OR date(check_in) >= date(?))`
        )
        .get(room.id, checkin, checkout);
      return !overlapping;
    });

    const roomIds = availableRooms.map((r) => r.id);
    let imagesByRoom = {};
    if (roomIds.length) {
      const placeholders = roomIds.map(() => '?').join(',');
      const images = db
        .prepare(
          `SELECT * FROM room_images WHERE room_id IN (${placeholders}) ORDER BY is_primary DESC, id ASC`
        )
        .all(...roomIds);
      imagesByRoom = images.reduce((acc, img) => {
        if (!acc[img.room_id]) acc[img.room_id] = [];
        acc[img.room_id].push(img);
        return acc;
      }, {});
    }

    const result = availableRooms.map((room) => {
      const images = (imagesByRoom[room.id] || []).map((img) => ({
        id: img.id,
        isPrimary: !!img.is_primary,
        url: buildImageUrl(req, path.join('uploads', 'rooms', path.basename(img.image_path)))
      }));
      return {
        ...room,
        amenities: room.amenities ? JSON.parse(room.amenities) : [],
        images
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('Search rooms error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getRoomById(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const images = db
      .prepare('SELECT * FROM room_images WHERE room_id = ? ORDER BY is_primary DESC, id ASC')
      .all(id)
      .map((img) => ({
        id: img.id,
        isPrimary: !!img.is_primary,
        url: buildImageUrl(req, path.join('uploads', 'rooms', path.basename(img.image_path)))
      }));

    return res.json({
      ...room,
      amenities: room.amenities ? JSON.parse(room.amenities) : [],
      images
    });
  } catch (err) {
    console.error('Get room by id error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getRoomImages(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const images = db
      .prepare('SELECT * FROM room_images WHERE room_id = ? ORDER BY is_primary DESC, id ASC')
      .all(id)
      .map((img) => ({
        id: img.id,
        isPrimary: !!img.is_primary,
        url: buildImageUrl(req, path.join('uploads', 'rooms', path.basename(img.image_path)))
      }));
    return res.json(images);
  } catch (err) {
    console.error('Get room images error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  listRooms,
  searchRooms,
  getRoomById,
  getRoomImages
};

