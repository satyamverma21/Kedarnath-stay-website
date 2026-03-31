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

async function listTents(req, res) {
  try {
    const { type, minPrice, maxPrice, capacity } = req.query;
    const db = getDb();

    let query = "SELECT * FROM tents WHERE status = 'active'";
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

    const tents = db.prepare(query).all(...params);

    const tentIds = tents.map((t) => t.id);
    let imagesByTent = {};
    if (tentIds.length) {
      const placeholders = tentIds.map(() => '?').join(',');
      const images = db
        .prepare(
          `SELECT * FROM tent_images WHERE tent_id IN (${placeholders}) ORDER BY is_primary DESC, id ASC`
        )
        .all(...tentIds);
      imagesByTent = images.reduce((acc, img) => {
        if (!acc[img.tent_id]) acc[img.tent_id] = [];
        acc[img.tent_id].push(img);
        return acc;
      }, {});
    }

    const result = tents.map((tent) => {
      const images = (imagesByTent[tent.id] || []).map((img) => ({
        id: img.id,
        isPrimary: !!img.is_primary,
        url: buildImageUrl(req, path.join('uploads', 'tents', path.basename(img.image_path)))
      }));
      return {
        ...tent,
        amenities: tent.amenities ? JSON.parse(tent.amenities) : [],
        images
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('List tents error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function searchTents(req, res) {
  try {
    const { checkin, checkout, guests, type } = req.query;
    if (!checkin || !checkout || !guests) {
      return res.status(400).json({ message: 'checkin, checkout and guests are required' });
    }

    const db = getDb();
    const params = [Number(guests)];
    let query = "SELECT * FROM tents WHERE status = 'active' AND capacity >= ?";

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    const tents = db.prepare(query).all(...params);

    const availableTents = tents.filter((tent) => {
      const overlapping = db
        .prepare(
          `SELECT 1 FROM bookings 
           WHERE property_type = 'tent'
             AND property_id = ?
             AND status != 'cancelled'
             AND NOT (date(check_out) <= date(?) OR date(check_in) >= date(?))`
        )
        .get(tent.id, checkin, checkout);
      return !overlapping;
    });

    const tentIds = availableTents.map((t) => t.id);
    let imagesByTent = {};
    if (tentIds.length) {
      const placeholders = tentIds.map(() => '?').join(',');
      const images = db
        .prepare(
          `SELECT * FROM tent_images WHERE tent_id IN (${placeholders}) ORDER BY is_primary DESC, id ASC`
        )
        .all(...tentIds);
      imagesByTent = images.reduce((acc, img) => {
        if (!acc[img.tent_id]) acc[img.tent_id] = [];
        acc[img.tent_id].push(img);
        return acc;
      }, {});
    }

    const result = availableTents.map((tent) => {
      const images = (imagesByTent[tent.id] || []).map((img) => ({
        id: img.id,
        isPrimary: !!img.is_primary,
        url: buildImageUrl(req, path.join('uploads', 'tents', path.basename(img.image_path)))
      }));
      return {
        ...tent,
        amenities: tent.amenities ? JSON.parse(tent.amenities) : [],
        images
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('Search tents error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getTentById(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const tent = db.prepare('SELECT * FROM tents WHERE id = ?').get(id);
    if (!tent) {
      return res.status(404).json({ message: 'Tent not found' });
    }

    const images = db
      .prepare('SELECT * FROM tent_images WHERE tent_id = ? ORDER BY is_primary DESC, id ASC')
      .all(id)
      .map((img) => ({
        id: img.id,
        isPrimary: !!img.is_primary,
        url: buildImageUrl(req, path.join('uploads', 'tents', path.basename(img.image_path)))
      }));

    return res.json({
      ...tent,
      amenities: tent.amenities ? JSON.parse(tent.amenities) : [],
      images
    });
  } catch (err) {
    console.error('Get tent by id error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getTentImages(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const images = db
      .prepare('SELECT * FROM tent_images WHERE tent_id = ? ORDER BY is_primary DESC, id ASC')
      .all(id)
      .map((img) => ({
        id: img.id,
        isPrimary: !!img.is_primary,
        url: buildImageUrl(req, path.join('uploads', 'tents', path.basename(img.image_path)))
      }));
    return res.json(images);
  } catch (err) {
    console.error('Get tent images error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  listTents,
  searchTents,
  getTentById,
  getTentImages
};

