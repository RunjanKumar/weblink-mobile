import React from 'react';
import {Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {DS, FONT, TvPressable} from './TvGlass';
import {GlassPanel} from './TvChrome';

/**
 * The small parts more than one ten-foot FRAME wears: a label/value line, a
 * footnote cell, a centred empty/error state, and the assistance card.
 *
 * They live here rather than in a feature folder because the client's frames
 * repeat them verbatim across services, facilities and everything after — and a
 * feature importing another feature's components is how a design system starts
 * to rot. Anything specific to one module (a status pill's vocabulary, a note
 * editor) stays with that module.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/** A label/value line — the detail panels' row. */
export function MetaRow({
  icon,
  label,
  value,
  valueColor = DS.text,
  children,
}: {
  icon: string;
  label: string;
  value?: string;
  valueColor?: string;
  /** Rendered instead of `value` — used for status pills. */
  children?: React.ReactNode;
}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 6}}>
      <Icon name={icon} size={15} color={DS.champagne} />
      <Text style={{flex: 1, color: DS.text2, fontSize: 11, marginLeft: 10, fontFamily: FONT}}>
        {label}
      </Text>
      {children ?? (
        <Text
          numberOfLines={2}
          style={{
            maxWidth: '52%',
            color: valueColor,
            fontSize: 11,
            fontWeight: '500',
            textAlign: 'right',
            fontFamily: FONT,
          }}>
          {value || '—'}
        </Text>
      )}
    </View>
  );
}

/** One cell of the footnote bar under a panel's content. */
export function FootNote({icon, children}: {icon: string; children: string}) {
  return (
    <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14}}>
      <Icon name={icon} size={19} color={DS.champagne} />
      <Text
        style={{flex: 1, color: DS.text2, fontSize: 10, lineHeight: 15, marginLeft: 10, fontFamily: FONT}}>
        {children}
      </Text>
    </View>
  );
}

/** Loading's opposite number: the empty, error and nothing-selected states. */
export function CenterState({
  icon,
  title,
  message,
  children,
}: {
  icon: string;
  title: string;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30}}>
      <Icon name={icon} size={34} color={DS.muted} />
      <Text
        style={{color: DS.text, fontSize: 15, marginTop: 12, textAlign: 'center', fontFamily: FONT}}>
        {title}
      </Text>
      {message ? (
        <Text
          style={{
            color: DS.text2,
            fontSize: 11,
            marginTop: 6,
            lineHeight: 17,
            textAlign: 'center',
            fontFamily: FONT,
          }}>
          {message}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/**
 * "Press OK to chat with Front Desk". Reception lives in a sibling TAB stack, so
 * this navigates through the ROOT navigator — a plain `navigate()` from inside
 * a feature stack is silently dropped.
 */
export function AssistanceCard({marginTop = DS.gap}: {marginTop?: number}) {
  const navigation = useNavigation();
  return (
    <GlassPanel style={{marginTop, padding: 12}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <View style={{flex: 1, paddingRight: 10}}>
          <Text
            style={{
              color: DS.text,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.6,
              fontFamily: FONT,
            }}>
            NEED ASSISTANCE?
          </Text>
          <Text style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
            Press OK to chat with Front Desk
          </Text>
        </View>
        <TvPressable
          onPress={() =>
            (navigation as unknown as {navigate: (n: string) => void}).navigate('ReceptionTab')
          }
          label="Chat with front desk"
          restBorderColor="rgba(212,180,131,0.55)"
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(212,180,131,0.16)',
          }}>
          <Icon name="headset-outline" size={20} color={DS.gold} />
        </TvPressable>
      </View>
    </GlassPanel>
  );
}
