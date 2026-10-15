import React, {useState} from 'react';
import {Image, Platform, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {DS, FONT, GLASS_BLUR, GlassSheen, TvPressable} from '../../../components/TvGlass';
import {FACILITY_BOOKING_STATUS} from '../../../constants/status';
import {formatDays, formatTime12h} from '../../../utils/format';
import {resolveImageUrl} from '../../../utils/imageUrl';
import {FacilityIcon} from './FacilityIcons';
import type {FacilityCategory, FacilityType} from '../../../models/facility.model';

/**
 * The pieces the three facility frames wear — the photo card the client's frame
 * is built from, the category cell, the reservation-status vocabulary, and the
 * timing helpers that turn a facility's raw window into the frame's captions.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/* ── Photo card ─────────────────────────────────────────────────────────────
   The frame's facility tile: the photograph IS the card, with the name and its
   caption sitting on a scrim across the bottom. */

/**
 * A real gradient on web (which is what the TV runs) so the photo fades into the
 * caption instead of ending at a hard band; native TV gets a flat scrim, which
 * is the same idea one step cruder.
 */
const SCRIM =
  Platform.OS === 'web'
    ? ({
        backgroundImage:
          'linear-gradient(to top, rgba(18,12,6,0.94) 0%, rgba(18,12,6,0.80) 42%, rgba(18,12,6,0.28) 78%, rgba(18,12,6,0) 100%)',
      } as object)
    : {backgroundColor: 'rgba(18,12,6,0.80)'};

/**
 * The facility's photograph, falling back to its own drawn sign on the glass.
 *
 * NOT `components/AppImage`: its fallback block is painted with the THEME's
 * surface colour, a near-white slab on this dark glass. (Same reasoning as
 * `TvFoodParts.FoodImage`.)
 */
export function FacilityPhoto({
  src,
  name,
  category,
  radius = DS.radiusSm,
  glyphSize = 34,
  style,
}: {
  src?: string | null;
  name?: string;
  category?: string;
  radius?: number;
  glyphSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const uri = resolveImageUrl(src);
  const box: StyleProp<ViewStyle> = [
    {borderRadius: radius, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.10)'},
    style,
  ];

  if (!uri || failed) {
    return (
      <View style={[box, {alignItems: 'center', justifyContent: 'center'}]}>
        <FacilityIcon name={name} secondary={category} size={glyphSize} color={DS.champagne} />
      </View>
    );
  }
  return (
    <View style={box}>
      <Image
        source={{uri}}
        resizeMode="cover"
        onError={() => setFailed(true)}
        // Slightly translucent so the golden backdrop tints every photograph —
        // the shared glow is what makes the cards read as one glass sheet.
        style={{width: '100%', height: '100%', opacity: 0.92}}
      />
    </View>
  );
}

/** The frame's facility tile: photo, scrim caption, circled chevron. */
export function FacilityCard({
  facility,
  categoryName,
  height,
  onPress,
}: {
  facility: FacilityType;
  categoryName?: string;
  height: number;
  onPress: () => void;
}) {
  const available = facility.isAvailable !== false;
  const caption = facilityCaption(facility);

  return (
    <TvPressable
      onPress={onPress}
      label={`${facility.name ?? 'Facility'}${caption ? `, ${caption}` : ''}`}
      restBorderColor={DS.borderSoft}
      style={{
        flex: 1,
        height,
        borderRadius: DS.radius,
        overflow: 'hidden',
        backgroundColor: DS.glassSoft,
        opacity: available ? 1 : 0.55,
        ...(GLASS_BLUR ?? {}),
      }}>
      <FacilityPhoto
        src={facility.image}
        name={facility.name}
        category={categoryName}
        radius={0}
        style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
      />

      {/* Caption band — the photo's own bottom third, darkened */}
      <View style={{position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 26, ...SCRIM}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingBottom: 10,
          }}>
          {/* Two lines each: the spa row fits five narrow cards, where one line
              left "BODY …" and "12:00 PM – …". The band is bottom-anchored, so
              it grows up over the photo instead of changing the card's size. */}
          <View style={{flex: 1, paddingRight: 8}}>
            <Text
              numberOfLines={2}
              style={{
                color: DS.text,
                fontSize: 13,
                lineHeight: 16,
                fontWeight: '600',
                letterSpacing: 0.8,
                fontFamily: FONT,
              }}>
              {(facility.name ?? 'Facility').toUpperCase()}
            </Text>
            {caption ? (
              <Text
                numberOfLines={2}
                style={{color: DS.text2, fontSize: 10, lineHeight: 13, marginTop: 3, fontFamily: FONT}}>
                {caption}
              </Text>
            ) : null}
          </View>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: 'rgba(212,180,131,0.55)',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(212,180,131,0.18)',
            }}>
            <Icon name="chevron-forward" size={13} color={DS.gold} />
          </View>
        </View>
      </View>

      {!available ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            borderRadius: 6,
            paddingHorizontal: 7,
            paddingVertical: 3,
            backgroundColor: 'rgba(242,139,130,0.9)',
          }}>
          <Text style={{color: DS.dark, fontSize: 8, fontWeight: '800', letterSpacing: 0.5, fontFamily: FONT}}>
            CLOSED
          </Text>
        </View>
      ) : null}

      <GlassSheen strength={0.4} />
    </TvPressable>
  );
}

/* ── Category cell ─────────────────────────────────────────────────────────── */

/**
 * The line under a category's name.
 *
 * PRESENTATION COPY, not data: `GET /v1/hotelFacility` returns a category's id,
 * name, image and types — there is no tagline field. The client's frame writes
 * one for each of its three sections, so those are reproduced verbatim and the
 * common others follow the same voice. An unrecognised category gets a neutral
 * line rather than a wrong promise.
 */
export function categoryTagline(name?: string): string {
  const key = (name ?? '').toLowerCase();
  if (/fitness|gym|health\s*club/.test(key)) return 'Stay active and energized';
  if (/wellness|yoga|meditat|mind/.test(key)) return 'Balance your body and mind';
  if (/spa|massage|therap/.test(key)) return 'Indulge in pure relaxation';
  if (/swim|pool|aqua/.test(key)) return 'Cool off and unwind';
  if (/salon|beauty|groom/.test(key)) return 'Look and feel your best';
  if (/dining|restaurant|food|cafe/.test(key)) return 'Savour every moment';
  if (/bar|lounge/.test(key)) return 'Unwind with something special';
  if (/banquet|event|hall|conference|meeting/.test(key)) return 'Space for every occasion';
  if (/business|office|work/.test(key)) return 'Stay productive on the road';
  if (/kid|child|family/.test(key)) return 'Made for younger guests';
  if (/game|recreation|sport|tennis/.test(key)) return 'Play, compete, enjoy';
  if (/garden|terrace|outdoor|rooftop/.test(key)) return 'Fresh air, open skies';
  return 'Explore what the hotel offers';
}

/**
 * The frame's left cell: icon ring, category name, tagline, gold rule.
 *
 * FIXED HEIGHT, matched to the photo cards beside it: a two-line category name
 * ("HEALTH & WELLNESS") would otherwise make its row taller than the others, and
 * the frame's rows read as a set. The `numberOfLines` caps keep an unusually
 * long name from overflowing the box it is now pinned to.
 */
export function CategoryCell({
  category,
  height,
  width = 172,
}: {
  category: FacilityCategory;
  height: number;
  width?: number;
}) {
  return (
    <View style={{width, height, paddingRight: 12, justifyContent: 'center'}}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(212,180,131,0.55)',
          backgroundColor: 'rgba(212,180,131,0.14)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <FacilityIcon name={category.name} size={24} color={DS.gold} />
      </View>
      <Text
        numberOfLines={2}
        style={{
          color: DS.text,
          fontSize: 14,
          fontWeight: '500',
          letterSpacing: 1,
          lineHeight: 18,
          marginTop: 7,
          fontFamily: FONT,
        }}>
        {(category.name ?? 'Facilities').toUpperCase()}
      </Text>
      <Text
        numberOfLines={2}
        style={{color: DS.text2, fontSize: 10, lineHeight: 14, marginTop: 3, fontFamily: FONT}}>
        {categoryTagline(category.name)}
      </Text>
      <View
        style={{
          width: 26,
          height: 2,
          borderRadius: 1,
          marginTop: 5,
          backgroundColor: DS.gold,
        }}
      />
    </View>
  );
}

/* ── Timings ───────────────────────────────────────────────────────────────── */

function minutesOf(hhmm?: string): number | null {
  if (!hhmm) {
    return null;
  }
  const [h, m] = hhmm.split(':');
  const hours = Number(h);
  if (Number.isNaN(hours)) {
    return null;
  }
  return hours * 60 + (Number(m) || 0);
}

/**
 * "6:00 AM – 10:00 PM" · "Open 24 Hours" · null when the hotel gave no window.
 * A window whose ends meet (or that spans the whole clock) is round-the-clock —
 * which is how the frame's GYM card reads.
 */
export function facilityWindow(facility?: FacilityType): string | null {
  const open = minutesOf(facility?.startTime);
  const close = minutesOf(facility?.endTime);
  if (open == null || close == null) {
    return null;
  }
  if (open === close || (open === 0 && (close >= 1439 || close === 0))) {
    return 'Open 24 Hours';
  }
  return `${formatTime12h(facility?.startTime)} – ${formatTime12h(facility?.endTime)}`;
}

/**
 * The caption under a facility's name on its card: its hours if the hotel set
 * them, else whatever else it actually told us — the marketing line, the days,
 * the type. Never a placeholder.
 */
export function facilityCaption(facility?: FacilityType): string {
  const window = facilityWindow(facility);
  if (window) {
    return window;
  }
  const description = facility?.description?.trim();
  if (description) {
    return description.length > 44 ? `${description.slice(0, 43)}…` : description;
  }
  const days = formatDays(facility?.days);
  return days || facility?.type || facility?.cuisine || '';
}

/**
 * Hourly slots inside the facility's own window.
 *
 * There is no per-slot availability anywhere in the API — `POST
 * /v1/hotelFacility/book` takes a date-time and comes back Pending until the
 * desk approves it. So these are the times a guest can ASK for, never times
 * known to be free, which is exactly what the pane says out loud.
 *
 * With no window the hotel has told us nothing about, so the list falls back to
 * a plain daytime span rather than pretending to quote opening hours.
 */
export function facilitySlots(facility?: FacilityType): string[] {
  const open = minutesOf(facility?.startTime);
  const close = minutesOf(facility?.endTime);
  const roundTheClock = facilityWindow(facility) === 'Open 24 Hours';

  let from = 9 * 60;
  let to = 21 * 60;
  if (!roundTheClock && open != null && close != null) {
    from = open;
    // A window that runs past midnight (18:00 → 02:00) stops at 23:00: the
    // booking carries one date, and a 1 AM slot belongs to the next one.
    to = close > open ? close - 60 : 23 * 60;
  }

  const slots: string[] = [];
  for (let m = from; m <= to && slots.length < 24; m += 60) {
    const h = Math.floor(m / 60) % 24;
    slots.push(`${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return slots;
}

/**
 * The next `count` dates the facility is actually open, as local YYYY-MM-DD.
 * `days` is [0..6] Sun..Sat; a facility that named no days is treated as open
 * every day, which is how the phone screen reads it too.
 */
export function openDates(facility?: FacilityType, count = 7): Date[] {
  const days = facility?.days ?? [];
  const out: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 21 && out.length < count; i += 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() + i);
    if (days.length === 0 || days.includes(day.getDay())) {
      out.push(day);
    }
  }
  return out;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Today" · "Tomorrow" · "Wed 20" — the date chip's two lines. */
export function dateChipLabel(d: Date): {top: string; bottom: string} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) {
    return {top: 'Today', bottom: d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})};
  }
  if (diff === 1) {
    return {top: 'Tomorrow', bottom: d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})};
  }
  return {
    top: d.toLocaleDateString('en-US', {weekday: 'short'}),
    bottom: d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}),
  };
}

/* ── Reservation status ─────────────────────────────────────────────────────
   The TV palette is fixed (the glass never follows the light/dark theme), so
   these are literal colours. The LABELS are shortened from the reference's
   "Booking Confirm" / "Booking Disapproved": a pill at ten feet has room for one
   word, and the column it sits in is already headed by the reservation. */
export interface FacilityTone {
  color: string;
  icon: string;
  label: string;
}

const UNKNOWN_TONE: FacilityTone = {color: DS.muted, icon: 'ellipse-outline', label: 'Requested'};

export const FACILITY_TONE: Record<number, FacilityTone> = {
  [FACILITY_BOOKING_STATUS.PENDING]: {color: '#E7C77A', icon: 'hourglass-outline', label: 'Pending'},
  [FACILITY_BOOKING_STATUS.APPROVED]: {color: '#8FD9A8', icon: 'checkmark', label: 'Confirmed'},
  [FACILITY_BOOKING_STATUS.DISAPPROVED]: {color: '#F28B82', icon: 'close', label: 'Declined'},
  [FACILITY_BOOKING_STATUS.CANCELLED]: {color: DS.muted, icon: 'remove-circle-outline', label: 'Cancelled'},
};

export function facilityTone(status?: number): FacilityTone {
  return (status != null ? FACILITY_TONE[status] : undefined) ?? UNKNOWN_TONE;
}

export function FacilityStatusPill({status, compact = false}: {status?: number; compact?: boolean}) {
  const tone = facilityTone(status);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: `${tone.color}66`,
        backgroundColor: `${tone.color}26`,
        paddingHorizontal: compact ? 9 : 12,
        paddingVertical: compact ? 3 : 5,
      }}>
      <Text
        style={{
          color: tone.color,
          fontSize: compact ? 9 : 11,
          fontWeight: '700',
          letterSpacing: 0.4,
          fontFamily: FONT,
        }}>
        {tone.label}
      </Text>
      <Icon name={tone.icon} size={compact ? 10 : 12} color={tone.color} style={{marginLeft: 5}} />
    </View>
  );
}

/**
 * The reference the guest can quote at the desk, derived from the reservation's
 * own `_id` — the backend returns no booking number of its own.
 */
export function reservationRef(id?: string): string {
  return id ? `FB-${id.slice(-6).toUpperCase()}` : '—';
}

/* ── Chips ──────────────────────────────────────────────────────────────────
   One shape for every choice on the availability pane, so date, time and guest
   count all focus and select identically under the D-pad. */
export function Chip({
  label,
  sublabel,
  selected,
  onPress,
  accessibilityLabel,
  minWidth = 64,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  minWidth?: number;
}) {
  return (
    <TvPressable
      onPress={onPress}
      label={accessibilityLabel}
      restBorderColor={selected ? '#E5CFA5' : DS.borderSoft}
      style={{
        minWidth,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: sublabel ? 6 : 8,
        borderRadius: 10,
        backgroundColor: selected ? DS.gold : 'rgba(255,255,255,0.07)',
      }}>
      <Text
        style={{
          color: selected ? DS.text : DS.text2,
          fontSize: 11,
          fontWeight: selected ? '700' : '500',
          fontFamily: FONT,
        }}>
        {label}
      </Text>
      {sublabel ? (
        <Text
          style={{
            color: selected ? DS.text : DS.muted,
            fontSize: 9,
            marginTop: 2,
            fontFamily: FONT,
          }}>
          {sublabel}
        </Text>
      ) : null}
    </TvPressable>
  );
}

/** The small tracked-out heading above a group of chips. */
export function FieldLabel({children, marginTop = 14}: {children: string; marginTop?: number}) {
  return (
    <Text
      style={{
        color: DS.muted,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginTop,
        marginBottom: 8,
        fontFamily: FONT,
      }}>
      {children}
    </Text>
  );
}
