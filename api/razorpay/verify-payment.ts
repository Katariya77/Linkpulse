import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planName = 'Pro Monthly',
      planPrice = 10,
      userId,
      userEmail,
    } = body || {};

    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    // Verify HMAC SHA256 if live keySecret and signature are provided
    if (keySecret && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        const mismatchData = {
          success: false,
          verified: false,
          error: 'Razorpay payment signature verification failed.',
        };
        if (typeof res.status === 'function' && typeof res.json === 'function') {
          return res.status(400).json(mismatchData);
        }
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(mismatchData));
        return;
      }

      const verifiedData = {
        success: true,
        verified: true,
        mode: 'live',
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        planName,
        planPrice,
        userId,
        userEmail,
        verifiedAt: new Date().toISOString(),
      };

      if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(200).json(verifiedData);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(verifiedData));
      return;
    }

    // Demo / Sandbox verification
    const simData = {
      success: true,
      verified: true,
      mode: 'demo',
      orderId: razorpay_order_id || `order_sim_${Date.now()}`,
      paymentId: razorpay_payment_id || `pay_sim_${Date.now()}`,
      planName,
      planPrice,
      userId,
      userEmail,
      verifiedAt: new Date().toISOString(),
    };

    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(200).json(simData);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(simData));
  } catch (err: any) {
    console.error('Error verifying Razorpay payment on Vercel:', err);
    const errData = {
      success: false,
      error: err.message || 'Failed to verify Razorpay payment',
    };
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(500).json(errData);
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(errData));
  }
}
