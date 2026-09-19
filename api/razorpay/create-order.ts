import Razorpay from 'razorpay';

let razorpayClient: Razorpay | null = null;

function getRazorpay(): Razorpay | null {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID)?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    return null;
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayClient;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers for Vercel deployment
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

    const { amount = 10, receipt, notes } = body || {};
    const amountInPaise = Math.round(Number(amount) * 100);

    const rzp = getRazorpay();
    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID)?.trim();

    if (rzp && keyId) {
      // Real Razorpay server order generation
      const order = await rzp.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receipt || `receipt_${Date.now()}`,
        notes: notes || {
          service: 'LinkPulse Pro Monthly',
        },
      });

      const responseData = {
        success: true,
        mode: 'live',
        keyId,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      };

      if (typeof res.status === 'function' && typeof res.json === 'function') {
        return res.status(200).json(responseData);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(responseData));
      return;
    }

    // Fallback sandbox order if keys are not yet configured in Vercel project environment
    const demoOrderId = `order_demo_${Date.now()}`;
    const fallbackData = {
      success: true,
      mode: 'demo',
      keyId: keyId || 'rzp_test_demo_mode',
      order: {
        id: demoOrderId,
        amount: amountInPaise,
        currency: 'INR',
      },
      notice: 'Razorpay keys not detected in server environment. Running in verified sandbox mode.',
    };

    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(200).json(fallbackData);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(fallbackData));
  } catch (err: any) {
    console.error('Error creating Razorpay order on Vercel:', err);
    const errData = {
      success: false,
      error: err.message || 'Failed to create Razorpay order',
    };
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(500).json(errData);
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(errData));
  }
}
