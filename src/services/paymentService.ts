import RazorpayCheckout from 'react-native-razorpay';

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: {name: string; contact: string; email: string};
  theme?: {color: string};
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Opens the native Razorpay checkout. Resolves with the signed payment result,
 * or rejects when the user cancels / payment fails (error.code / error.description).
 * Replaces the web app's `window.Razorpay` global.
 */
export function openRazorpay(options: RazorpayOptions): Promise<RazorpaySuccess> {
  return RazorpayCheckout.open(options) as Promise<RazorpaySuccess>;
}
