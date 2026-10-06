/**
 * In-room TV pairing + room state (backend `/v1/tv/*`, see tvController).
 * A TV pairs once with a staff-entered code; afterwards `/v1/tv/state` tells it
 * whether the room is empty or hands it the checked-in guest's session token.
 */

export interface TvPairingStart {
  pairingId: string;
  /** Proves the status poll comes from this TV. Never shown on screen. */
  secret: string;
  /** 6 digits, shown on the TV for staff to type into the admin panel. */
  code: string;
  expiresAt: string;
}

export type TvPairingStatus = {status: 'PENDING'} | {status: 'PAIRED'; deviceToken: string};

interface TvRoomInfo {
  hotelName?: string;
  roomNumber?: string;
}

export type TvState =
  | (TvRoomInfo & {mode: 'idle'})
  | (TvRoomInfo & {mode: 'guest'; guestName?: string; guestToken: string});
