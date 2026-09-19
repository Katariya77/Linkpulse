export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID)?.trim();
  const hasSecret = Boolean(process.env.RAZORPAY_KEY_SECRET?.trim());
  const isConfigured = Boolean(keyId && hasSecret);

  const configData = {
    configured: isConfigured,
    keyId: keyId || null,
    currency: 'INR',
    planAmount: 10,
  };

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json(configData);
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(configData));
}
