import type {BookedRoom, CustomerUser, Hotel} from './user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

/** Shape of `data` returned by POST /v1/customer/login/email. */
export interface LoginResponseData {
  user: CustomerUser;
  bookRoomData: BookedRoom[];
  hotelData?: Hotel;
  locks?: unknown[];
  token: string;
}

/** The authenticated session held in app state. */
export interface Session {
  token: string;
  user: CustomerUser;
  hotel: Hotel | null;
  booking: BookedRoom | null;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
