// Razorpay client integration utility

export interface RazorpayConfig {
  configured: boolean;
  keyId: string | null;
  currency: string;
  planAmount: number;
}

export interface RazorpayOrderResponse {
  success: boolean;
  mode: 'live' | 'demo';
  keyId: string;
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  notice?: string;
  error?: string;
}

export interface RazorpayVerificationResult {
  success: boolean;
  verified: boolean;
  mode: 'live' | 'demo';
  orderId: string;
  paymentId: string;
  planName: string;
  planPrice: number;
  error?: string;
}

/**
 * Ensures checkout.js is loaded
 */
export async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if ((window as any).Razorpay) return true;

  return new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Fetches Razorpay configuration status from server
 */
export async function fetchRazorpayConfig(): Promise<RazorpayConfig> {
  try {
    const res = await fetch('/api/razorpay/config');
    if (!res.ok) throw new Error('Failed to fetch Razorpay config');
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch Razorpay config:', err);
    return {
      configured: false,
      keyId: null,
      currency: 'INR',
      planAmount: 10,
    };
  }
}

/**
 * Creates an order on the backend
 */
export async function createRazorpayOrder(amount: number = 10, userEmail?: string): Promise<RazorpayOrderResponse> {
  const res = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      receipt: `lp_${Date.now()}`,
      notes: {
        userEmail: userEmail || 'member',
        plan: 'Pro Monthly (₹10/mo)',
      },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Order creation failed' }));
    throw new Error(errorData.error || 'Failed to create payment order');
  }

  return await res.json();
}

/**
 * Verifies payment on the backend
 */
export async function verifyRazorpayPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
  planName: string;
  planPrice: number;
  userId?: string;
  userEmail?: string;
}): Promise<RazorpayVerificationResult> {
  const res = await fetch('/api/razorpay/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Payment verification failed' }));
    throw new Error(errorData.error || 'Payment signature verification failed');
  }

  return await res.json();
}
