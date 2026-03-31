const crypto = require('crypto');
const { getDb } = require('../db/database');
const { createOrder } = require('../utils/razorpay');
const { normalizePhone, isValidPhone } = require('./guest.controller');
require('dotenv').config();

function hasBookingAccess(db, booking, req, phone) {
  if (req.user) {
    return booking.user_id === req.user.id || req.user.role === 'admin';
  }
  if (!isValidPhone(phone)) {
    return false;
  }
  const user = db.prepare('SELECT phone FROM users WHERE id = ?').get(booking.user_id);
  return !!user && user.phone === phone;
}

async function createPaymentOrder(req, res) {
  try {
    const { bookingId, phone } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const normalizedPhone = normalizePhone(phone);
    if (!hasBookingAccess(db, booking, req, normalizedPhone)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (booking.payment_status === 'paid') {
      return res.status(400).json({ message: 'Booking already paid' });
    }

    const order = await createOrder(booking.total_amount, booking.booking_ref);

    const existingPayment = db
      .prepare('SELECT * FROM payments WHERE booking_id = ? AND razorpay_order_id = ?')
      .get(bookingId, order.id);

    if (!existingPayment) {
      db.prepare(
        `INSERT INTO payments (booking_id, razorpay_order_id, amount, currency, status)
         VALUES (?, ?, ?, ?, 'pending')`
      ).run(bookingId, order.id, booking.total_amount, order.currency);
    }

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Create payment order error', err);
    if (err.code === 'RAZORPAY_CONFIG_MISSING') {
      return res.status(500).json({
        message: 'Payment gateway is not configured. Set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
      });
    }
    if (err.statusCode === 401) {
      return res.status(502).json({
        message: 'Payment gateway authentication failed. Verify Razorpay API keys on the server.'
      });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function verifyPayment(req, res) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId, phone } = req.body;
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !bookingId) {
      return res.status(400).json({ message: 'Missing Razorpay verification fields' });
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpaySignature;
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!hasBookingAccess(db, booking, req, normalizedPhone)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!isValid) {
      db.prepare(
        `UPDATE payments 
         SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'failed'
         WHERE booking_id = ? AND razorpay_order_id = ?`
      ).run(razorpayPaymentId, razorpaySignature, bookingId, razorpayOrderId);
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const now = new Date().toISOString();

    db.prepare(
      `UPDATE payments 
       SET razorpay_payment_id = ?, razorpay_signature = ?, status = 'success', paid_at = ?
       WHERE booking_id = ? AND razorpay_order_id = ?`
    ).run(razorpayPaymentId, razorpaySignature, now, bookingId, razorpayOrderId);

    db.prepare(
      `UPDATE bookings 
       SET payment_status = 'paid', status = 'confirmed'
       WHERE id = ?`
    ).run(bookingId);

    const updatedBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

    return res.json({ success: true, booking: updatedBooking });
  } catch (err) {
    console.error('Verify payment error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getPaymentByBooking(req, res) {
  try {
    const bookingId = Number(req.params.bookingId);
    const normalizedPhone = normalizePhone(req.query.phone);
    const db = getDb();
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (!hasBookingAccess(db, booking, req, normalizedPhone)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payment = db.prepare('SELECT * FROM payments WHERE booking_id = ?').get(bookingId);
    return res.json(payment || null);
  } catch (err) {
    console.error('Get payment by booking error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getPaymentByBooking
};

