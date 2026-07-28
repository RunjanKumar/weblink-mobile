/**
 * Web build of Razorpay checkout (LG webOS / browser).
 *
 * `react-native-razorpay` wraps the native SDK; on the web the equivalent is
 * Razorpay's `checkout.js` global, which is exactly what the original web app
 * loaded via a <script> tag in index.html (see WEBLINK_ISSUES.md item 6). Here
 * it is injected on first use instead, so the app still boots offline and only
 * pays the network cost when a guest actually checks out.
 *
 * Mirrors `paymentService.ts` — same signature, same reject-on-cancel contract.
 */
const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

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

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (payload: {error?: {description?: string}}) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loader: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (window.Razorpay) {
    return Promise.resolve();
  }
  // Cache the promise so concurrent checkouts share one <script> tag.
  if (!loader) {
    loader = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loader = null; // allow a retry on the next attempt
        reject(new Error('Could not load the payment gateway. Check the TV network.'));
      };
      document.body.appendChild(script);
    });
  }
  return loader;
}

export async function openRazorpay(options: RazorpayOptions): Promise<RazorpaySuccess> {
  await loadCheckout();
  const Razorpay = window.Razorpay;
  if (!Razorpay) {
    throw new Error('Payment gateway unavailable.');
  }

  return new Promise<RazorpaySuccess>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    const checkout = new Razorpay({
      ...options,
      handler: (response: RazorpaySuccess) => finish(() => resolve(response)),
      modal: {
        // Native `RazorpayCheckout.open` rejects when the sheet is dismissed;
        // the callers' COD fallback depends on that, so mirror it here.
        ondismiss: () => finish(() => reject(new Error('Payment cancelled.'))),
      },
    });

    checkout.on('payment.failed', payload =>
      finish(() => reject(new Error(payload.error?.description ?? 'Payment failed.'))),
    );

    checkout.open();
  });
}
