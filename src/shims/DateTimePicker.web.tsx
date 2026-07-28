import React, {useEffect, useRef, useState} from 'react';

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
  mode?: 'date' | 'time';
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

export default function DateTimePicker({
  value,
  mode = 'date',
  onChange,
  minimumDate,
  maximumDate,
}: DateTimePickerProps) {
  const isDate = mode !== 'time';
  const [draft, setDraft] = useState(() => (isDate ? toDateValue(value) : toTimeValue(value)));
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount so the remote's OK button drives the picker straight away.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const cancel = () => onChange?.({type: 'dismissed'}, undefined);

  const confirm = () => {
    if (!draft) {
      cancel();
      return;
    }
    const next = new Date(value);
    if (isDate) {
      const [y, m, d] = draft.split('-').map(Number);
      if (!y || !m || !d) {
        cancel();
        return;
      }
      next.setFullYear(y, m - 1, d);
    } else {
      const [h, min] = draft.split(':').map(Number);
      next.setHours(h ?? 0, min ?? 0, 0, 0);
    }
    onChange?.({type: 'set'}, next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={cancel}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: 20,
          padding: 24,
          minWidth: 320,
        }}>
        <p style={{color: '#ffffff', fontWeight: 700, fontSize: 16, margin: '0 0 16px'}}>
          {isDate ? 'Select date' : 'Select time'}
        </p>
        <input
          ref={inputRef}
          type={isDate ? 'date' : 'time'}
          value={draft}
          min={isDate && minimumDate ? toDateValue(minimumDate) : undefined}
          max={isDate && maximumDate ? toDateValue(maximumDate) : undefined}
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
            background: '#0d0d0d',
            color: '#ffffff',
            border: '1px solid #2a2a2a',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: 16,
            colorScheme: 'dark',
          }}
        />
        <div style={{display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end'}}>
          <button
            onClick={cancel}
            style={{
              background: 'transparent',
              color: '#9ca3af',
              border: '1px solid #2a2a2a',
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
              background: '#facc15',
              color: '#0d0d0d',
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
