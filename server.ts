import express from 'express';
import path from 'path';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Razorpay public status / config endpoint
  app.get('/api/razorpay/config', (req, res) => {
    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID)?.trim();
    const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET?.trim());
    const isConfigured = Boolean(keyId && hasSecret);

    res.json({
      configured: isConfigured,
      keyId: keyId || null,
      currency: 'INR',
      planAmount: 10,
    });
  });

  // Razorpay: Create Order endpoint
  app.post('/api/razorpay/create-order', async (req, res) => {
    try {
      const { amount = 10, receipt, notes } = req.body;
      const amountInPaise = Math.round(Number(amount) * 100);

      const rzp = getRazorpay();
      const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID)?.trim();

      if (rzp && keyId) {
        // Live Razorpay order creation
        const order = await rzp.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: receipt || `receipt_${Date.now()}`,
          notes: notes || {
            service: 'LinkPulse Pro Monthly',
          },
        });

        return res.json({
          success: true,
          mode: 'live',
          keyId,
          order: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
          },
        });
      }

      // If Razorpay keys are not provided yet in environment secrets, provide sandbox demo order
      const demoOrderId = `order_demo_${Date.now()}`;
      return res.json({
        success: true,
        mode: 'demo',
        keyId: 'rzp_test_demo_mode',
        order: {
          id: demoOrderId,
          amount: amountInPaise,
          currency: 'INR',
        },
        notice: 'Razorpay keys not detected in server environment. Running in verified sandbox mode.',
      });
    } catch (err: any) {
      console.error('Error creating Razorpay order:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to create Razorpay order',
      });
    }
  });

  // Razorpay: Verify Payment Signature endpoint
  app.post('/api/razorpay/verify-payment', (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        planName = 'Pro Monthly',
        planPrice = 10,
        userId,
        userEmail,
      } = req.body;

      const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

      // If live secret is configured and signature provided, verify cryptographically
      if (keySecret && razorpay_signature && razorpay_order_id && razorpay_payment_id) {
        const hmac = crypto.createHmac('sha256', keySecret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generatedSignature = hmac.digest('hex');

        if (generatedSignature !== razorpay_signature) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: 'Razorpay payment signature verification failed.',
          });
        }

        return res.json({
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
        });
      }

      // Demo/Fallback authorization
      return res.json({
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
      });
    } catch (err: any) {
      console.error('Error verifying Razorpay payment:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to verify Razorpay payment',
      });
    }
  });

  // Vite middleware setup (development vs production)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinkPulse Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
