import {useCallback, useEffect, useRef, useState} from 'react';
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
 *  1. Open and close must NEVER be energised together — on a real motor that is
 *     a stall, both windings driven against each other. The CONTROLLER enforces
 *     this: energising one line drops the other in hardware. So a direction
 *     command sends exactly one exec, for the line being driven, and the
 *     opposite line is only corrected in the UI. An earlier version sent its own
 *     TurnOff first and awaited it, which cost a redundant round trip against a
 *     relay the board had already opened, and made every press feel slow.
 *  2. STOP is not "the other state". It de-energises BOTH lines, parking the
 *     curtain wherever it happens to be, which is the whole point of a stop
 *     button on a curtain that takes ~15s end to end. It is also the one command
 *     that must reach both lines, since no interlock produces "neither line on".
 *
 * Pressing the direction that is ALREADY running turns that line off — the
 * button is a toggle, not a one-way latch, so Open/Open parks the curtain the
 * same way Stop would.
 *
 * When the room has no curtain channels the card still works — state is kept
 * locally so the client presentation has something to drive. That fallback is
 * module-level, not component state, for the same reason DEMO_SCENES is: a
 * guest who closes the curtain and walks to Light Control and back must not
 * find it open again. Nothing is persisted and nothing is sent to the backend.
 */

/**
 * How long the curtain takes to run end to end. Nothing reports travel back to
 * us — the controller does not push, and we do not poll — so the screen shows
 * "OPENING" for this long and then falls back to the curtain's name. It is a
 * presentation timer only: it never sends anything and never changes which
 * button is lit, so if it is wrong the worst case is a caption that clears early
 * or late, not a curtain in the wrong state.
 */
const TRAVEL_MS = 15000;

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
  /**
   * Which way the curtain is travelling right now, or null once the ~15s run has
   * elapsed. Drives the "MAIN · OPENING" caption and the button's pulse.
   *
   * This is a TIMER, not a reading off the hardware: the relay stays latched
   * after the curtain has finished its run, so "the open line is on" keeps being
   * true long after anything is actually moving. Lit-ness still follows the
   * relay; only the sense of motion expires.
   */
  travelling: 'open' | 'closed' | null;
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
  const [, rerender] = useState(0);
  // Which command each curtain is currently running, keyed by kind.
  const [pending, setPending] = useState<Partial<Record<CurtainKind, CurtainState>>>({});
  // Which way each curtain is travelling, cleared by the TRAVEL_MS timer.
  const [travelling, setTravelling] = useState<Partial<Record<CurtainKind, 'open' | 'closed'>>>(
    {},
  );
  const travelTimers = useRef<Partial<Record<CurtainKind, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    const bump = () => rerender(n => n + 1);
    localListeners.add(bump);
    return () => {
      localListeners.delete(bump);
    };
  }, []);

  // A curtain card that unmounts mid-run must not leave a timer behind to fire
  // setState into a dead component.
  useEffect(() => {
    const timers = travelTimers.current;
    return () => {
      Object.values(timers).forEach(t => t && clearTimeout(t));
    };
  }, []);

  const stopTravel = useCallback((kind: CurtainKind) => {
    const timer = travelTimers.current[kind];
    if (timer) {
      clearTimeout(timer);
      delete travelTimers.current[kind];
    }
    setTravelling(prev => {
      if (!prev[kind]) {
        return prev;
      }
      const next = {...prev};
      delete next[kind];
      return next;
    });
  }, []);

  const startTravel = useCallback(
    (kind: CurtainKind, direction: 'open' | 'closed') => {
      const existing = travelTimers.current[kind];
      if (existing) {
        clearTimeout(existing);
      }
      setTravelling(prev => ({...prev, [kind]: direction}));
      travelTimers.current[kind] = setTimeout(() => {
        delete travelTimers.current[kind];
        setTravelling(prev => {
          const next = {...prev};
          delete next[kind];
          return next;
        });
      }, TRAVEL_MS);
    },
    [],
  );

  const {setDevice, markDevice} = room;

  const build = useCallback(
    (kind: CurtainKind, label: string): Curtain => {
      const {open, close} = pair(room.curtains, kind);
      const isLive = Boolean(open || close);

      // A line that is still energised IS the current motion. Once the motor
      // finishes and the relay drops, both read off — which is `stopped`, and
      // is why the fallback below keeps the last COMMANDED state instead.
      const live: CurtainState = open?.isOn ? 'open' : close?.isOn ? 'closed' : 'stopped';
      const state = isLive ? live : localState[kind];

      /**
       * Drive our line and let the controller retire the other one.
       *
       * The board interlocks the pair in hardware: energising `main open` drops
       * `main close` on its own. So a direction command sends exactly ONE exec,
       * for the line being driven, and the opposite line is corrected in the UI
       * only — press Close then Open and Close goes dark with no second call.
       *
       * Pressing the direction that is already running sends OFF for that line
       * instead, so the same button both starts and parks the curtain.
       *
       * EVERY failure path puts the UI back exactly as it was before the press:
       * the driven line rolls back inside `setDevice`, the opposite line is
       * re-marked here, and the travel caption is cleared. A curtain that did not
       * move must not be left looking like one that did.
       */
      const run = async (want: CurtainState) => {
        if (!isLive) {
          setLocal(kind, want);
          return;
        }
        setPending(prev => ({...prev, [kind]: want}));
        try {
          if (want === 'stopped') {
            // STOP is the one command that must reach both lines: it is the only
            // way to park a curtain mid-travel, and there is no interlock to
            // lean on when the intent is "neither line energised". Sequential,
            // not Promise.all: two ESP32 writes racing on one board is how a
            // stop ends up only half-applied.
            stopTravel(kind);
            if (open) {
              await setDevice(open, false);
            }
            if (close) {
              await setDevice(close, false);
            }
            return;
          }

          const drive = want === 'open' ? open : close;
          const kill = want === 'open' ? close : open;

          // Same direction pressed again → park this line.
          if (drive?.isOn) {
            stopTravel(kind);
            await setDevice(drive, false);
            return;
          }

          const killWasOn = kill ? markDevice(kill, false) : false;
          startTravel(kind, want);
          if (drive) {
            try {
              await setDevice(drive, true);
            } catch (error) {
              if (kill) {
                markDevice(kill, killWasOn);
              }
              stopTravel(kind);
              throw error;
            }
          }
        } finally {
          setPending(prev => {
            const next = {...prev};
            delete next[kind];
            return next;
          });
        }
      };

      return {
        kind,
        label,
        state,
        isLive,
        isBusy: Boolean(pending[kind]),
        // Local-fallback curtains never claim travel: nothing is wired to a
        // motor there, so `state` is a settled position rather than motion.
        travelling: isLive ? travelling[kind] ?? null : null,
        open: () => run('open'),
        close: () => run('closed'),
        stop: () => run('stopped'),
      };
    },
    [room.curtains, setDevice, markDevice, pending, travelling, startTravel, stopTravel],
  );

  return {
    main: build('main', 'Main Curtain'),
    sheer: build('sheer', 'Sheer Curtain'),
    isLoading: room.isLoading,
  };
}
