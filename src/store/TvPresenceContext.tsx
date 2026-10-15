import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {AppState} from 'react-native';
import axios from 'axios';
import {io} from 'socket.io-client';
import {tvApi} from '../api/tv.api';
import {APP_VERSION, config} from '../constants/config';
import {STORAGE_KEYS} from '../constants/storageKeys';
import {logger} from '../services/logger';
import {storage} from '../services/storage.service';
import {deviceId, platformLabel} from '../services/tvPlatform';
import {IS_TV} from '../utils/responsive';
import {useAuth} from './AuthContext';

/**
 * In-room TV presence — every TV build (Samsung Tizen, LG webOS, Android TV);
 * phones keep the normal Login.
 *
 * The TV never shows a login screen. Instead:
 *   1. Unpaired → it asks the backend for a 6-digit code and shows it; staff
 *      pair it to a room in the admin panel; the TV receives a device token.
 *   2. Paired → it asks `/v1/tv/state` who is in the room:
 *        idle  → Welcome screen (no guest data on this device)
 *        guest → signs in with the guest token the backend hands over
 *      and re-asks whenever the backend says so (socket `tv:refresh` on
 *      check-in / checkout / room move), every minute, and on wake.
 * Checkout deletes the guest session server-side; whichever arrives first —
 * the socket event or a 401 — brings the TV back to the Welcome screen.
 */

export type TvPhase = 'starting' | 'pairing' | 'idle' | 'guest' | 'offline';

interface TvPresenceValue {
  /** False on phones; then nothing below applies. */
  enabled: boolean;
  phase: TvPhase;
  /** The code to show while pairing. */
  pairingCode: string | null;
  hotelName?: string;
  roomNumber?: string;
}

const PAIR_POLL_MS = 3_000;
const STATE_POLL_MS = 60_000;
const RETRY_MS = 10_000;

const DISABLED: TvPresenceValue = {enabled: false, phase: 'starting', pairingCode: null};

const TvPresenceContext = createContext<TvPresenceValue>(DISABLED);

const httpStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

export function TvPresenceProvider({children}: {children: React.ReactNode}) {
  // IS_TV never changes while the app runs, so the hooks inside never change order.
  if (!IS_TV) {
    return <TvPresenceContext.Provider value={DISABLED}>{children}</TvPresenceContext.Provider>;
  }
  return <RoomTvPresence>{children}</RoomTvPresence>;
}

function RoomTvPresence({children}: {children: React.ReactNode}) {
  const {status, session, signInWithToken, resetLocal} = useAuth();
  const [deviceToken, setDeviceToken] = useState<string | null>(
    () => storage.getString(STORAGE_KEYS.TV_DEVICE_TOKEN) ?? null,
  );
  const [phase, setPhase] = useState<TvPhase>('starting');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [room, setRoom] = useState<{hotelName?: string; roomNumber?: string}>({});

  // Async callbacks read the latest auth state through a ref, not a stale closure.
  const authRef = useRef({status, token: session?.token});
  authRef.current = {status, token: session?.token};

  /** Unpaired (or the token was revoked): drop everything and pair again. */
  const forgetDevice = useCallback(async () => {
    storage.remove(STORAGE_KEYS.TV_DEVICE_TOKEN);
    setDeviceToken(null);
    setRoom({});
    if (authRef.current.status === 'authenticated') {
      await resetLocal();
    }
  }, [resetLocal]);

  // ── 1. Pairing: show a code until staff pair this TV ──
  useEffect(() => {
    if (deviceToken) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const begin = async (): Promise<void> => {
      try {
        const res = await tvApi.startPairing({
          duid: deviceId() ?? undefined,
          model: platformLabel(),
          appVersion: APP_VERSION,
        });
        if (cancelled || !res.data) {
          return;
        }
        const {pairingId, secret, code, expiresAt} = res.data;
        const expires = new Date(expiresAt).getTime();
        setPairingCode(code);
        setPhase('pairing');

        const poll = async (): Promise<void> => {
          if (cancelled) {
            return;
          }
          if (Date.now() >= expires) {
            void begin(); // the code ran out: show a fresh one
            return;
          }
          try {
            const pairing = (await tvApi.pairingStatus(pairingId, secret)).data;
            if (cancelled) {
              return;
            }
            if (pairing?.status === 'PAIRED') {
              storage.setString(STORAGE_KEYS.TV_DEVICE_TOKEN, pairing.deviceToken);
              setPairingCode(null);
              setPhase('starting');
              setDeviceToken(pairing.deviceToken);
              return;
            }
          } catch (error) {
            if (httpStatus(error) === 404) {
              void begin(); // expired or already used: show a fresh code
              return;
            }
            // Network blip: keep polling with the same code.
          }
          timer = setTimeout(poll, PAIR_POLL_MS);
        };
        timer = setTimeout(poll, PAIR_POLL_MS);
      } catch (error) {
        if (cancelled) {
          return;
        }
        logger.warn('tvPresence', 'Could not start pairing', error);
        setPhase('offline');
        timer = setTimeout(begin, RETRY_MS);
      }
    };

    void begin();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [deviceToken]);

  // ── 2. Room state: who should this TV show? ──
  const inFlight = useRef(false);
  const again = useRef(false);
  // Socket handlers and timers call the latest `refresh` through this ref, so
  // a new callback identity never tears the socket down.
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async (): Promise<void> => {
    if (!deviceToken) {
      return;
    }
    // One check at a time; a request that arrives mid-check runs right after,
    // so an event (e.g. checkout) can never be answered with older data.
    if (inFlight.current) {
      again.current = true;
      return;
    }
    inFlight.current = true;
    try {
      const state = (await tvApi.getState(deviceToken, APP_VERSION)).data;
      if (!state) {
        throw new Error('Empty TV state');
      }
      setRoom({hotelName: state.hotelName, roomNumber: state.roomNumber});

      if (state.mode === 'idle') {
        setPhase('idle');
        if (authRef.current.status === 'authenticated') {
          await resetLocal();
        }
        return;
      }

      if (authRef.current.status === 'authenticated') {
        if (authRef.current.token === state.guestToken) {
          setPhase('guest');
          return;
        }
        // A different guest (new check-in, room move): clear the previous one
        // first so every per-guest cache resets before the next sign-in.
        await resetLocal();
      }
      try {
        await signInWithToken(state.guestToken);
        setPhase('guest');
      } catch (error) {
        // e.g. the booking is still settling; the next check retries.
        logger.warn('tvPresence', 'Guest sign-in failed', error);
        setPhase('idle');
      }
    } catch (error) {
      if (httpStatus(error) === 401) {
        await forgetDevice();
        return;
      }
      logger.warn('tvPresence', 'State check failed', error);
      // Keep a signed-in guest on their screens through a network blip.
      if (authRef.current.status !== 'authenticated') {
        setPhase('offline');
      }
    } finally {
      inFlight.current = false;
      if (again.current) {
        again.current = false;
        void refreshRef.current();
      }
    }
  }, [deviceToken, resetLocal, signInWithToken, forgetDevice]);
  refreshRef.current = refresh;

  // Socket push (check-in / checkout / move / unpair), a minute-by-minute
  // safety net, and a check whenever the app comes back to the foreground.
  useEffect(() => {
    if (!deviceToken) {
      return;
    }
    void refreshRef.current();

    const socket = io(config.apiBaseUrl, {
      query: {tvToken: deviceToken},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelayMax: 30_000,
    });
    // Re-check on every (re)connect: events sent while offline were missed.
    socket.on('connect', () => void refreshRef.current());
    socket.on('tv:refresh', () => void refreshRef.current());
    socket.on('tv:unpaired', () => void forgetDevice());
    socket.on('connect_error', error => logger.warn('tvPresence', 'Socket connect error', error));

    const interval = setInterval(() => void refreshRef.current(), STATE_POLL_MS);
    const appState = AppState.addEventListener('change', next => {
      if (next === 'active') {
        void refreshRef.current();
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      clearInterval(interval);
      appState.remove();
    };
  }, [deviceToken, forgetDevice]);

  // A guest session ended from elsewhere (checkout → 401): ask what's next.
  useEffect(() => {
    if (status === 'unauthenticated') {
      void refreshRef.current();
    }
  }, [status]);

  const value = useMemo<TvPresenceValue>(
    () => ({enabled: true, phase, pairingCode, ...room}),
    [phase, pairingCode, room],
  );

  return <TvPresenceContext.Provider value={value}>{children}</TvPresenceContext.Provider>;
}

export function useTvPresence(): TvPresenceValue {
  return useContext(TvPresenceContext);
}
