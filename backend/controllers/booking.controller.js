const { getDb } = require('../db/database');
require('dotenv').config();

function calculateNights(checkIn, checkOut) {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);
  const diffMs = outDate.getTime() - inDate.getTime();
  const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
}

function getPriceForProperty(db, propertyType, propertyId, nights) {
  const setting = db
    .prepare(
      'SELECT price_per_night, weekend_surcharge, tax_percent FROM price_settings WHERE property_type = ? AND property_id = ? LIMIT 1'
    )
    .get(propertyType, propertyId);

  let basePricePerNight = 0;
  if (setting) {
    basePricePerNight = setting.price_per_night;
  } else if (propertyType === 'room') {
    const room = db.prepare('SELECT basePrice FROM rooms WHERE id = ?').get(propertyId);
    basePricePerNight = room ? room.basePrice : 0;
  } else if (propertyType === 'tent') {
    const tent = db.prepare('SELECT basePrice FROM tents WHERE id = ?').get(propertyId);
    basePricePerNight = tent ? tent.basePrice : 0;
  }

  const baseAmount = basePricePerNight * nights;
  const taxPercent = (setting && setting.tax_percent) || Number(process.env.TAX_PERCENT || 18);
  const taxAmount = (baseAmount * taxPercent) / 100;
  const totalAmount = baseAmount + taxAmount;

  return { baseAmount, taxAmount, totalAmount };
}

function generateBookingRef(db, id) {
  const year = new Date().getFullYear();
  const padded = String(id).padStart(5, '0');
  return `BK-${year}-${padded}`;
}

async function createBooking(req, res) {
  try {
    const { propertyType, propertyId, checkIn, checkOut, guests, specialRequests, promoCode } = req.body;

    if (!propertyType || !propertyId || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }
    if (!['room', 'tent'].includes(propertyType)) {
      return res.status(400).json({ message: 'Invalid property type' });
    }

    const db = getDb();
    const nights = calculateNights(checkIn, checkOut);
    if (nights <= 0) {
      return res.status(400).json({ message: 'Checkout must be after checkin' });
    }

    const overlapping = db
      .prepare(
        `SELECT 1 FROM bookings
         WHERE property_type = ?
           AND property_id = ?
           AND status != 'cancelled'
           AND NOT (date(check_out) <= date(?) OR date(check_in) >= date(?))`
      )
      .get(propertyType, propertyId, checkIn, checkOut);

    if (overlapping) {
      return res.status(400).json({ message: 'Selected dates are not available' });
    }

    let { baseAmount, taxAmount, totalAmount } = getPriceForProperty(
      db,
      propertyType,
      propertyId,
      nights
    );

    let promoCodeData = null;
    let discountAmount = 0;

    // Handle promo code if provided
    if (promoCode) {
      promoCodeData = db.prepare(`
        SELECT pc.*, u.name as agent_name
        FROM promo_codes pc
        LEFT JOIN users u ON u.id = pc.agent_id
        WHERE pc.code = ? AND pc.status = 'active'
      `).get(promoCode);

      if (!promoCodeData) {
        return res.status(400).json({ message: 'Invalid promo code' });
      }

      // Check if promo code is still valid
      if (promoCodeData.valid_until && new Date(promoCodeData.valid_until) < new Date()) {
        return res.status(400).json({ message: 'Promo code has expired' });
      }

      // Check if max uses reached
      if (promoCodeData.max_uses > 0 && promoCodeData.used_count >= promoCodeData.max_uses) {
        return res.status(400).json({ message: 'Promo code usage limit reached' });
      }

      // Calculate discount
      discountAmount = (baseAmount * promoCodeData.discount_percent) / 100;
      totalAmount = baseAmount + taxAmount - discountAmount;

      // Ensure total amount doesn't go below 0
      if (totalAmount < 0) totalAmount = 0;
    }

    const insertStmt = db.prepare(
      `INSERT INTO bookings (
        booking_ref, user_id, property_type, property_id,
        check_in, check_out, guests, nights,
        base_amount, tax_amount, total_amount, discount_amount,
        special_requests, status, payment_status, promo_code_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?)`
    );

    const tempRef = `TEMP-${Date.now()}`;
    const info = insertStmt.run(
      tempRef,
      req.user.id,
      propertyType,
      propertyId,
      checkIn,
      checkOut,
      guests || 1,
      nights,
      baseAmount,
      taxAmount,
      totalAmount,
      discountAmount,
      specialRequests || null,
      promoCodeData ? promoCodeData.id : null
    );

    const bookingId = info.lastInsertRowid;
    const bookingRef = generateBookingRef(db, bookingId);
    db.prepare('UPDATE bookings SET booking_ref = ? WHERE id = ?').run(bookingRef, bookingId);

    // Update promo code usage count
    if (promoCodeData) {
      db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?').run(promoCodeData.id);

      // Create agent referral record
      db.prepare(`
        INSERT INTO agent_referrals (agent_id, customer_id, booking_id, promo_code_id, discount_amount)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        promoCodeData.agent_id,
        req.user.id,
        bookingId,
        promoCodeData.id,
        discountAmount
      );
    }

    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    return res.status(201).json(booking);
  } catch (err) {
    console.error('Create booking error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getMyBookings(req, res) {
  try {
    const db = getDb();
    const bookings = db
      .prepare(
        `SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(req.user.id);
    return res.json(bookings);
  } catch (err) {
    console.error('Get my bookings error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getBookingById(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    return res.json(booking);
  } catch (err) {
    console.error('Get booking by id error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function cancelBooking(req, res) {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('cancelled', id);
    const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err) {
    console.error('Cancel booking error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking
};

