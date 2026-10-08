/**
 * Central registry of REST endpoint paths (relative to config.apiBaseUrl).
 * Mirrors the web app's `endpoint.js` plus the auth routes the mobile app adds.
 */
export const ENDPOINTS = {
  // ── Auth ──
  LOGIN_EMAIL: '/v1/customer/login/email',
  LOGIN_PHONE: '/v1/customer/login',
  VERIFY_OTP: '/customers/verify-otp',
  FORGOT_PASSWORD: '/v1/customer/forgot-password',
  RESET_PASSWORD: '/v1/customer/reset-password',
  CUSTOMER_PROFILE: '/v1/customer/login/profile',
  LOGOUT: '/user/logout',

  // ── Dashboard / room controls (Phase 2) ──
  QUICK_CALL: '/v1/quickCall',
  ROOM_DEVICES: '/api/rooms/devices',
  DEVICE_EXEC: '/api/rooms/device/exec',

  // ── Feature areas (Phase 2) ──
  SERVICE: '/v1/hotelServices',
  SERVICE_BOOK: '/v1/hotelServices/book',
  SERVICE_BOOK_CUSTOMER: '/v1/hotelServices/book/customer',
  FACILITIES: '/v1/hotelFacility',
  FACILITY_BOOK: '/v1/hotelFacility/book',
  FOOD_MENU: '/v1/food/menu',
  FOOD_CATEGORY: '/v1/foodCategory',
  FOOD_ORDER: '/v1/foodOrder',
  INITIATE_PAYMENT: '/v1/foodOrder/initiatePayment',
  VERIFY_PAYMENT: '/v1/foodOrder/verifyPayment',
  COUPON: '/v1/coupon',
  COUPON_VALIDATE: '/v1/coupon/validate',
  FEEDBACK: '/v1/feedback',
  CONVERSATION_LIST: '/conversation/list',
  LAUNDRY_RATE_LIST: '/v1/laundry/guest/rate-list',
  LAUNDRY_ORDER: '/v1/laundry/guest/order',
  FOLIO_GUEST: '/v1/folio/guest',
  DINCHARYA_GUEST: '/v1/dincharya/guest',

  // ── In-room TV (Samsung) ──
  TV_PAIR_START: '/v1/tv/pair/start',
  TV_PAIR_STATUS: '/v1/tv/pair/status',
  TV_STATE: '/v1/tv/state',
} as const;

export type EndpointKey = keyof typeof ENDPOINTS;
