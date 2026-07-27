// react-native-razorpay historically ships no TypeScript definitions.
// Remove this file if a future version bundles its own types.
declare module 'react-native-razorpay' {
  interface RazorpayCheckoutStatic {
    open(options: object): Promise<{
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }>;
  }
  const RazorpayCheckout: RazorpayCheckoutStatic;
  export default RazorpayCheckout;
}
