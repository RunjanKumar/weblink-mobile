import React, {useEffect, useRef, useState} from 'react';
import {useTheme} from '../theme';
import {registerModal} from '../services/modalRegistry';

const PICKER_ROOT_ID = 'datetime-picker-root';

/**
 * Web build of `@react-native-community/datetimepicker` (LG webOS / browser).
 *
 * The native module renders an imperative OS dialog that appears as soon as it
 * mounts and reports back through `onChange`. This reproduces that contract with
 * an overlay around a native `<input type="date">` / `<input type="time">` —
 * webOS runs Chromium, so both are supported and the remote drives them.
 *
 * Contract kept identical to the native module, because
 * `FacilityReserveScreen` relies on it:
 *   - mounting opens the picker
 *   - confirming  -> onChange({type: 'set'}, date)
 *   - cancelling  -> onChange({type: 'dismissed'}, undefined)
 */
export interface DateTimePickerProps {
  value: Date;
  /**
   * `datetime` renders ONE combined `<input type="datetime-local">` — matching
   * the reference web app's reserve flow (a single field, not date→time steps).
   * The native Android module has no datetime mode; callers branch on platform.
   */
  mode?: 'date' | 'time' | 'datetime';
  onChange?: (event: {type?: string}, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

/** `YYYY-MM-DD` / `HH:mm` in LOCAL time — `toISOString()` would shift the day. */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeValue(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateTimeValue(d: Date): string {
  return `${toDateValue(d)}T${toTimeValue(d)}`;
}

function draftFor(mode: string, value: Date): string {
  if (mode === 'time') {
    return toTimeValue(value);
  }
  if (mode === 'datetime') {
    return toDateTimeValue(value);
  }
  return toDateValue(value);
}

export default function DateTimePicker({
  value,
  mode = 'date',
  onChange,
  minimumDate,
  maximumDate,
}: DateTimePickerProps) {
  const {theme, scheme} = useTheme();
  const c = theme.colors;
  const [draft, setDraft] = useState(() => draftFor(mode, value));
  const inputRef = useRef<HTMLInputElement>(null);

  // The reserve screen reuses ONE mounted picker and flips `mode` date→time.
  // The lazy initializer above runs only on first mount, so without this
  // resync the time step keeps a DATE string, the input rejects it, and
  // confirm() built an Invalid Date (the "date picker does not work" bug).
  useEffect(() => {
    setDraft(draftFor(mode, value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Focus on mount so the remote's OK button drives the picker straight away.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const cancel = () => onChange?.({type: 'dismissed'}, undefined);

  // Modal-layer integration: the TV Back key must close the picker (not pop
  // the screen under it), and spatial nav must stay inside the overlay.
  useEffect(() => {
    return registerModal({rootId: PICKER_ROOT_ID, close: cancel});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = () => {
    if (!draft) {
      cancel();
      return;
    }
    const next = new Date(value);
    if (mode === 'datetime') {
      // "YYYY-MM-DDTHH:mm"
      const [datePart, timePart] = draft.split('T');
      const [y, m, d] = (datePart ?? '').split('-').map(Number);
      const [h, min] = (timePart ?? '').split(':').map(Number);
      if (!y || !m || !d || Number.isNaN(h)) {
        cancel();
        return;
      }
      next.setFullYear(y, m - 1, d);
      next.setHours(h ?? 0, min ?? 0, 0, 0);
    } else if (mode === 'time') {
      const [h, min] = draft.split(':').map(Number);
      if (Number.isNaN(h)) {
        cancel();
        return;
      }
      next.setHours(h ?? 0, min ?? 0, 0, 0);
    } else {
      const [y, m, d] = draft.split('-').map(Number);
      if (!y || !m || !d) {
        cancel();
        return;
      }
      next.setFullYear(y, m - 1, d);
    }
    onChange?.({type: 'set'}, next);
  };

  const inputType =
    mode === 'datetime' ? 'datetime-local' : mode === 'time' ? 'time' : 'date';
  const title =
    mode === 'datetime' ? 'Select date and time' : mode === 'time' ? 'Select time' : 'Select date';
  const minValue =
    minimumDate == null
      ? undefined
      : mode === 'datetime'
        ? toDateTimeValue(minimumDate)
        : mode === 'date'
          ? toDateValue(minimumDate)
          : undefined;
  const maxValue =
    maximumDate == null
      ? undefined
      : mode === 'datetime'
        ? toDateTimeValue(maximumDate)
        : mode === 'date'
          ? toDateValue(maximumDate)
          : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: c.overlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={cancel}>
      <div
        id={PICKER_ROOT_ID}
        onClick={e => e.stopPropagation()}
        style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          borderRadius: 20,
          padding: 24,
          minWidth: 320,
        }}>
        <p style={{color: c.text, fontWeight: 700, fontSize: 16, margin: '0 0 16px'}}>
          {title}
        </p>
        <input
          ref={inputRef}
          type={inputType}
          value={draft}
          min={minValue}
          max={maxValue}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              confirm();
            }
            if (e.key === 'Escape') {
              cancel();
            }
          }}
          style={{
            width: '100%',
            background: c.surfaceElevated,
            color: c.text,
            border: `1px solid ${c.border}`,
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 16,
            // Tells the UA's native picker chrome which scheme to render in.
            colorScheme: scheme,
          }}
        />
        <div style={{display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end'}}>
          <button
            onClick={cancel}
            style={{
              background: 'transparent',
              color: c.textTertiary,
              border: `1px solid ${c.border}`,
              borderRadius: 999,
              padding: '10px 20px',
              fontSize: 14,
              cursor: 'pointer',
            }}>
            Cancel
          </button>
          <button
            onClick={confirm}
            style={{
              background: c.primary,
              color: c.primaryForeground,
              border: 'none',
              borderRadius: 999,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
