import {useCallback, useEffect, useReducer, useState} from 'react';
import {useRoomControl} from './RoomControlViewModel';
import {
  curtainDirection,
  curtainKind,
  type CurtainKind,
  type CurtainState,
} from '../constants/roomControl';
import type {RoomDevice} from '../models/device.model';

/**
 * Curtain ViewModel — turns the four unrelated switch channels the room-devices
 * API returns ("main curtain open", "main curtain close", and the sheer pair)
 * into two curtains with OPEN / STOP / CLOSE.
 *
 * TWO RULES drive everything here:
 *
 *  1. Open and close must NEVER be energised together. On a real motor that is
 *     a stall — both windings driven against each other — so every command kills
 *     the opposite line FIRST and only energises after that call has come back.
 *     If the kill fails, the command aborts rather than pressing on.
 *  2. STOP is not "the other state". It de-energises BOTH lines, parking the
 *     curtain wherever it happens to be, which is the whole point of a stop
 *     button on a curtain that takes ~15s end to end.
 *
 * When the room has no curtain channels the card still works — state is kept
 * locally so the client presentation has something to drive. That fallback is
 * module-level, not component state, for the same reason DEMO_SCENES is: a
 * guest who closes the curtain and walks to Light Control and back must not
 * find it open again. Nothing is persisted and nothing is sent to the backend.
 */

const localState: Record<CurtainKind, CurtainState> = {main: 'open', sheer: 'open'};
const localListeners = new Set<() => void>();

function setLocal(kind: CurtainKind, state: CurtainState) {
  localState[kind] = state;
  localListeners.forEach(notify => notify());
}

export interface Curtain {
  kind: CurtainKind;
  label: string;
  /** What the curtain is doing — drives which button reads as active. */
  state: CurtainState;
  /** True when real channels back this curtain (false = local fallback). */
  isLive: boolean;
  /** A command is in flight; the buttons disable so a guest cannot stack them. */
  isBusy: boolean;
  open: () => Promise<void>;
  close: () => Promise<void>;
  stop: () => Promise<void>;
}

/** Pick the open/close channel pair for one curtain out of the flat list. */
function pair(devices: RoomDevice[], kind: CurtainKind) {
  const mine = devices.filter(d => curtainKind(d.friendlyname) === kind);
  return {
    open: mine.find(d => curtainDirection(d.friendlyname) === 'open'),
    close: mine.find(d => curtainDirection(d.friendlyname) === 'close'),
  };
}

export function useCurtains() {
  const room = useRoomControl();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    localListeners.add(rerender);
    return () => {
      localListeners.delete(rerender);
    };
  }, []);

  const {setDevice} = room;

  const build = useCallback(
    (kind: CurtainKind, label: string): Curtain => {
      const {open, close} = pair(room.curtains, kind);
      const isLive = Boolean(open || close);

      // A line that is still energised IS the current motion. Once the motor
      // finishes and the relay drops, both read off — which is `stopped`, and
      // is why the fallback below keeps the last COMMANDED state instead.
      const live: CurtainState = open?.isOn ? 'open' : close?.isOn ? 'closed' : 'stopped';
      const state = isLive ? live : localState[kind];

      /** Kill the opposite line, then drive ours. Order is the safety rule. */
      const run = async (want: CurtainState) => {
        if (!isLive) {
          setLocal(kind, want);
          return;
        }
        const drive = want === 'open' ? open : want === 'closed' ? close : undefined;
        const kill = want === 'open' ? close : want === 'closed' ? open : undefined;
        setBusy(prev => ({...prev, [kind]: true}));
        try {
          if (want === 'stopped') {
            // Both down. Sequential, not Promise.all: two ESP32 writes racing on
            // one board is how a stop ends up only half-applied.
            if (open) {
              await setDevice(open, false);
            }
            if (close) {
              await setDevice(close, false);
            }
            return;
          }
          if (kill) {
            await setDevice(kill, false);
          }
          if (drive) {
            await setDevice(drive, true);
          }
        } finally {
          setBusy(prev => ({...prev, [kind]: false}));
        }
      };

      return {
        kind,
        label,
        state,
        isLive,
        isBusy: Boolean(busy[kind]),
        open: () => run('open'),
        close: () => run('closed'),
        stop: () => run('stopped'),
      };
    },
    [room.curtains, setDevice, busy],
  );

  return {
    main: build('main', 'Main Curtain'),
    sheer: build('sheer', 'Sheer Curtain'),
    isLoading: room.isLoading,
  };
}
