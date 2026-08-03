// Imported explicitly rather than relying on jest's globals — the repo has no
// @types/jest and does not list "jest" in tsconfig `types`, so bare `describe`
// fails `npm run typecheck`. Same reason as errorHandler.test.ts.
import {describe, expect, it} from '@jest/globals';
import {
  curtainDirection,
  curtainKind,
  isCurtainChannel,
  isHiddenChannel,
} from './roomControl';

/**
 * The room controller has no curtain type and no "internal channel" flag, so
 * these rules classify purely by `friendlyname` — which means an installer
 * renaming a channel can silently break the curtain card or leak a timer
 * channel into the lights grid.
 *
 * EVERY name below is real, captured from GET /api/rooms/devices on the dev
 * backend. Keep it that way: if the room changes, re-capture rather than
 * inventing names, or this test stops being evidence of anything.
 */
const ROOM_CHANNELS = [
  'DND',
  'MMR',
  'sheer open',
  'sheer close',
  'main open',
  'main close',
  'Vestibule2way',
  'Ceiling lamp',
  'Hospitality2way',
  'Vestibule',
  'Study lamp',
  'washroom',
  'Hospitality light',
  'Master Scene',
  'Sleep Scene',
  'MMR 6m5s',
  'DND 6m5s',
  'Relax Scene',
  'Spotlight',
  'Wall light',
  'COB',
  'PRofile light',
  'Ceiling Light',
];

describe('isHiddenChannel', () => {
  it('hides the controller hold-timer channels and nothing else', () => {
    const hidden = ROOM_CHANNELS.filter(isHiddenChannel);
    expect(hidden).toEqual(['MMR 6m5s', 'DND 6m5s']);
  });

  it('does not hide the real DND / MMR signs', () => {
    expect(isHiddenChannel('DND')).toBe(false);
    expect(isHiddenChannel('MMR')).toBe(false);
  });
});

describe('isCurtainChannel', () => {
  it('matches exactly the four motor lines in this room', () => {
    const curtains = ROOM_CHANNELS.filter(isCurtainChannel);
    expect(curtains).toEqual(['sheer open', 'sheer close', 'main open', 'main close']);
  });

  it('still matches installs that spell out "curtain"', () => {
    expect(isCurtainChannel('Main Curtain Open')).toBe(true);
    expect(isCurtainChannel('Sheer curtain opening')).toBe(true);
    expect(isCurtainChannel('Blind close')).toBe(true);
  });

  it('does not swallow a light that merely says main/open/close', () => {
    // The side word alone is not enough — it needs a direction too, and vice
    // versa. This is what keeps "Main light" out of the curtain card.
    expect(isCurtainChannel('Main light')).toBe(false);
    expect(isCurtainChannel('Open plan lamp')).toBe(false);
    expect(isCurtainChannel('Ceiling Light')).toBe(false);
  });
});

describe('curtain channel routing', () => {
  it('routes each line to the right curtain and direction', () => {
    // These four rows ARE the client's spec: pressing Main Open must energise
    // the channel named "main open", and so on.
    const routed = ROOM_CHANNELS.filter(isCurtainChannel).map(name => ({
      name,
      kind: curtainKind(name),
      direction: curtainDirection(name),
    }));
    expect(routed).toEqual([
      {name: 'sheer open', kind: 'sheer', direction: 'open'},
      {name: 'sheer close', kind: 'sheer', direction: 'close'},
      {name: 'main open', kind: 'main', direction: 'open'},
      {name: 'main close', kind: 'main', direction: 'close'},
    ]);
  });
});
