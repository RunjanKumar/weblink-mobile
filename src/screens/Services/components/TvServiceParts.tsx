import React, {useMemo} from 'react';
import {ScrollView, Text, TextInput, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useQuery} from '@tanstack/react-query';
import {DS, FONT, GlassPanel, TvBackButton, TvPressable} from '../../../components/TvGlass';
import {serviceRepository} from '../../../repositories/service.repository';
import {BOOKING_STATUS, BOOKING_STATUS_LABELS} from '../../../constants/status';
import {formatTime12h} from '../../../utils/format';
import {ServiceGlyph, ServiceIcon} from './ServiceIcons';
import type {ServiceCategory, ServiceSubCategory} from '../../../models/service.model';

/**
 * The pieces both service frames wear — status vocabulary, the bell badge, the
 * meta rows, the note editor and the assistance card.
 *
 * Shared rather than duplicated because the client's two frames are one surface
 * the guest walks between: the catalog's cards and the tracker's rows carry the
 * same icons, the same pills and the same right-hand column, and the moment one
 * screen hand-rolls a pill the two pages stop looking like the same product.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/* ── Status vocabulary ──────────────────────────────────────────────────────
   The TV palette is fixed — the glass never follows the light/dark theme — so
   these are literal colours rather than `useStatusTones()` keys. Tones match
   the Figma's pills: amber waiting, blue working, green done, rose cancelled. */
export interface StatusTone {
  color: string;
  icon: string;
}

const UNKNOWN_TONE: StatusTone = {color: DS.muted, icon: 'ellipse-outline'};

export const SERVICE_TONE: Record<number, StatusTone> = {
  [BOOKING_STATUS.PENDING]: {color: '#E7C77A', icon: 'hourglass-outline'},
  [BOOKING_STATUS.IN_PROGRESS]: {color: '#E5A863', icon: 'time-outline'},
  [BOOKING_STATUS.COMPLETED]: {color: '#8FD9A8', icon: 'checkmark'},
  [BOOKING_STATUS.CANCEL]: {color: '#F28B82', icon: 'close'},
};

export function serviceTone(status?: number): StatusTone {
  return (status != null ? SERVICE_TONE[status] : undefined) ?? UNKNOWN_TONE;
}

export function serviceStatusLabel(status?: number): string {
  return (status != null ? BOOKING_STATUS_LABELS[status] : undefined) ?? 'Requested';
}

export function StatusPill({status, compact = false}: {status?: number; compact?: boolean}) {
  const tone = serviceTone(status);
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
        {serviceStatusLabel(status)}
      </Text>
      <Icon name={tone.icon} size={compact ? 10 : 12} color={tone.color} style={{marginLeft: 5}} />
    </View>
  );
}

/* ── The module's mark: a service bell in a gold ring ── */
export function ServiceBadge({
  size = 44,
  name,
  description,
}: {
  size?: number;
  /** A service's own sign; the bell when nothing is named (screen headers). */
  name?: string;
  description?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: 'rgba(212,180,131,0.55)',
        backgroundColor: 'rgba(212,180,131,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {name ? (
        <ServiceIcon name={name} description={description} size={Math.round(size * 0.6)} color={DS.gold} />
      ) : (
        <ServiceGlyph name="bell" size={Math.round(size * 0.6)} color={DS.gold} />
      )}
    </View>
  );
}

/** The Figma's gold-underlined section heading. */
export function SectionTab({label, note}: {label: string; note?: string}) {
  return (
    <View style={{marginBottom: 12}}>
      <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
        <View style={{alignSelf: 'flex-start'}}>
          <Text
            style={{
              color: DS.text,
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 1.2,
              paddingBottom: 6,
              fontFamily: FONT,
            }}>
            {label.toUpperCase()}
          </Text>
          <View style={{height: 2, borderRadius: 1, backgroundColor: DS.gold}} />
        </View>
        {note ? (
          <Text style={{color: DS.muted, fontSize: 10, marginLeft: 12, paddingBottom: 6, fontFamily: FONT}}>
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* ── Availability ───────────────────────────────────────────────────────────
   Reference behaviour (web + phone): `disabled={!category.isAvailable}` — an
   ABSENT flag means closed, not open. The window is display-only; the backend
   owns the decision. */
export function serviceWindow(category?: {from?: string; to?: string}): string | null {
  if (!category?.from || !category?.to) {
    return null;
  }
  return `${formatTime12h(category.from)} – ${formatTime12h(category.to)}`;
}

export function isCategoryAvailable(category?: {isAvailable?: boolean}): boolean {
  return Boolean(category?.isAvailable);
}

/**
 * A booked request carries only `subCategoryId`, so the tracker has no icon, no
 * description and no category name to show. The catalog holds all three and is
 * already in the React Query cache under the key the catalog screen uses — this
 * reads it (no extra request on a warm cache) and joins by id.
 */
export interface ServiceLookupHit {
  sub: ServiceSubCategory;
  category: ServiceCategory;
}

export function useServiceCatalogLookup() {
  const query = useQuery({
    queryKey: ['services', 'categories'],
    queryFn: () => serviceRepository.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const byId = new Map<string, ServiceLookupHit>();
    for (const category of query.data ?? []) {
      for (const sub of category.subCategoriesIds ?? []) {
        byId.set(sub._id, {sub, category});
      }
    }
    return {
      /** The catalog entry behind a booked request, when it still exists. */
      find: (subCategoryId?: string): ServiceLookupHit | undefined =>
        subCategoryId ? byId.get(subCategoryId) : undefined,
    };
  }, [query.data]);
}

/**
 * The reference the guest can quote to the front desk. Derived from the
 * request's own `_id` — the backend returns no separate request number, and a
 * made-up sequence would not match anything the hotel can look up.
 */
export function requestRef(id?: string): string {
  return id ? `SR-${id.slice(-6).toUpperCase()}` : '—';
}

/* ── Note editor ────────────────────────────────────────────────────────────
   Typing on a remote is the worst thing a ten-foot UI can ask for, so the
   presets carry the common cases in one press each and the text field is there
   for the rest. They round-trip through the same string the field holds (' · '
   separated), which is why a chip can be un-pressed. */
export const DETAIL_PRESETS = [
  'As soon as possible',
  'Within the next hour',
  'While I am out of the room',
  'Please call before entering',
  'Leave outside the door',
  'Extra one, please',
];

export const FEEDBACK_PRESETS = [
  'Quick and courteous',
  'Exactly what I asked for',
  'Took longer than expected',
  'Please follow this up',
];

function splitNote(value: string): string[] {
  return value
    .split('·')
    .map(part => part.trim())
    .filter(Boolean);
}

export function NotePane({
  title,
  subtitle,
  value,
  onChangeText,
  onDone,
  onCancel,
  presets,
  placeholder = 'Anything we should know? (optional)',
  doneLabel = 'SAVE',
}: {
  title: string;
  subtitle: string;
  value: string;
  onChangeText: (text: string) => void;
  onDone: () => void;
  onCancel: () => void;
  presets: string[];
  placeholder?: string;
  doneLabel?: string;
}) {
  const parts = splitNote(value);
  const togglePreset = (preset: string) => {
    const next = parts.includes(preset)
      ? parts.filter(part => part !== preset)
      : [...parts, preset];
    onChangeText(next.join(' · '));
  };

  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <TvBackButton onPress={onCancel} size={36} />
        <View style={{flex: 1, marginLeft: 12}}>
          <Text
            numberOfLines={1}
            style={{
              color: DS.text,
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 0.8,
              fontFamily: FONT,
            }}>
            {title.toUpperCase()}
          </Text>
          <Text numberOfLines={1} style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
            {subtitle}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: DS.muted,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          marginTop: 14,
          fontFamily: FONT,
        }}>
        QUICK NOTES
      </Text>

      <ScrollView style={{flex: 1, marginTop: 8}} showsVerticalScrollIndicator={false}>
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
          {presets.map(preset => {
            const on = parts.includes(preset);
            return (
              <TvPressable
                key={preset}
                onPress={() => togglePreset(preset)}
                label={`${preset}, ${on ? 'selected' : 'not selected'}`}
                restBorderColor={on ? 'rgba(212,180,131,0.55)' : DS.borderSoft}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: on ? 'rgba(212,180,131,0.16)' : 'rgba(255,255,255,0.06)',
                }}>
                {on ? (
                  <Icon name="checkmark" size={11} color={DS.gold} style={{marginRight: 4}} />
                ) : null}
                <Text style={{color: on ? DS.champagne : DS.text2, fontSize: 10, fontFamily: FONT}}>
                  {preset}
                </Text>
              </TvPressable>
            );
          })}
        </View>

        <Text
          style={{
            color: DS.muted,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1,
            marginTop: 14,
            fontFamily: FONT,
          }}>
          YOUR NOTE
        </Text>
        <View
          style={{
            marginTop: 8,
            borderRadius: DS.radiusSm,
            borderWidth: 1,
            borderColor: DS.borderSoft,
            backgroundColor: 'rgba(255,255,255,0.06)',
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={DS.muted}
            multiline
            textAlignVertical="top"
            accessibilityLabel={title}
            style={{minHeight: 76, color: DS.text, fontSize: 12, lineHeight: 18, fontFamily: FONT}}
          />
        </View>
      </ScrollView>

      <View style={{flexDirection: 'row', gap: DS.gap, marginTop: 12}}>
        <TvPressable
          onPress={onDone}
          label={doneLabel}
          restBorderColor="#E5CFA5"
          style={{
            flex: 1,
            height: 44,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: DS.gold,
          }}>
          <Text
            style={{
              color: DS.text,
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 1,
              fontFamily: FONT,
            }}>
            {doneLabel}
          </Text>
        </TvPressable>
        <TvPressable
          onPress={onCancel}
          label="Cancel"
          restBorderColor={DS.border}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}>
          <Text
            style={{
              color: DS.text,
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 1,
              fontFamily: FONT,
            }}>
            CANCEL
          </Text>
        </TvPressable>
      </View>
    </GlassPanel>
  );
}

