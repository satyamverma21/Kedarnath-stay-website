const Razorpay = require('razorpay');
require('dotenv').config();

function isPlaceholder(value) {
  const raw = String(value || '').trim().toLowerCase();
  return (
    !raw ||
    raw.includes('xxxxxxxx') ||
    raw.includes('your_razorpay_secret') ||
    raw.includes('your_') ||
    raw === 'rzp_test_xxxxxxxxxxxx'
  );
}

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (isPlaceholder(keyId) || isPlaceholder(keySecret)) {
    const err = new Error('Razorpay keys are not configured');
    err.code = 'RAZORPAY_CONFIG_MISSING';
    throw err;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

function createOrder(amountInRupees, receiptId) {
  const instance = getRazorpayClient();
  const options = {
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt: receiptId,
    payment_capture: 1
  };
  return instance.orders.create(options);
}

module.exports = {
  createOrder
};

