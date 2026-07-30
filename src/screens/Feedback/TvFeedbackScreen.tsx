import React from 'react';
import {ScrollView, Text, TextInput, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {toast} from '../../components';
import {
  DS,
  FONT,
  GlassButton,
  GlassPanel,
  GoldButton,
  SERIF,
  TvPanelHeader,
  TvPressable,
  TvScreen,
} from '../../components/TvGlass';
import {useFeedbackViewModel} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {IS_WEB_BUILD} from '../../utils';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Feedback'>;

/**
 * Feedback (TV) — the ⋮ menu's "Share feedback" page, in the dashboard's glass.
 *
 * Same viewmodel and the same contract as the phone screen: a star, an optional
 * note, one POST, and (on webOS) a return to the dashboard afterwards so the
 * guest is never left staring at a blank form on a television.
 *
 * The difference is the input. Typing a paragraph with a remote is the worst
 * thing a ten-foot UI can ask for, so the note is built from one-press chips
 * (the same pattern as the service-request note pane) with the text field kept
 * for whatever the chips don't cover.
 */

const STAY_PRESETS = [
  'Spotless room',
  'Warm, courteous staff',
  'Delicious food',
  'Comfortable bed',
  'Quick service',
  'Great facilities',
  'Room was too noisy',
  'Needs maintenance',
  'Service was slow',
];

/** 1–5 in words — the score reads back at ten feet, the stars alone don't. */
const STAR_WORDS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
};

function splitNote(value: string): string[] {
  return value
    .split('·')
    .map(part => part.trim())
    .filter(Boolean);
}

/** The star row, in the TV palette (the themed `StarRating` is phone-side). */
function TvStars({value, onChange}: {value: number; onChange: (star: number) => void}) {
  return (
    <View style={{flexDirection: 'row'}}>
      {[1, 2, 3, 4, 5].map(star => (
        <Star key={star} star={star} filled={star <= value} onPress={() => onChange(star)} />
      ))}
    </View>
  );
}

function Star({star, filled, onPress}: {star: number; filled: boolean; onPress: () => void}) {
  return (
    <TvPressable
      onPress={onPress}
      label={`${star} star${star > 1 ? 's' : ''}`}
      restBorderColor={DS.borderSoft}
      hasTVPreferredFocus={star === 1}
      style={{
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: DS.radiusSm,
        marginRight: 8,
        backgroundColor: filled ? 'rgba(212,180,131,0.22)' : 'rgba(255,255,255,0.07)',
      }}>
      <Icon name={filled ? 'star' : 'star-outline'} size={28} color={filled ? DS.gold : DS.muted} />
    </TvPressable>
  );
}

export function TvFeedbackScreen({navigation}: Props) {
  const {star, setStar, notes, setNotes, submit, isSubmitting, error} = useFeedbackViewModel();
  const noteFocus = useTVFocus();
  const parts = splitNote(notes);

  // The reference surfaces API failures as toasts, not inline banners.
  React.useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const togglePreset = (preset: string) => {
    const next = parts.includes(preset)
      ? parts.filter(part => part !== preset)
      : [...parts, preset];
    setNotes(next.join(' · '));
  };

  const onSubmit = () =>
    submit(() => {
      toast.success('Thank you — your feedback has reached the front desk.');
      if (IS_WEB_BUILD) {
        // Feedback is always opened from the dashboard menu, so this returns
        // there rather than leaving a blank form on the TV.
        navigation.navigate('Dashboard');
      }
    });

  return (
    <TvScreen>
      <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
        {/* ── Left: the ask and the score ── */}
        <GlassPanel style={{width: 380, marginRight: DS.gap, padding: 16}}>
          <TvPanelHeader
            title="Feedback"
            subtitle="Tell us about your stay"
            onBack={() => navigation.goBack()}
          />

          <Text style={{color: DS.text, fontSize: 26, lineHeight: 34, fontFamily: SERIF, fontStyle: 'italic'}}>
            Rate your stay
          </Text>
          <Text
            style={{color: DS.text2, fontSize: 12, lineHeight: 18, marginTop: 8, fontFamily: FONT}}>
            Share your thoughts to help us improve your experience. Your rating
            goes straight to the hotel's management team.
          </Text>

          <Text
            style={{
              color: DS.muted,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1,
              marginTop: 22,
              marginBottom: 10,
              fontFamily: FONT,
            }}>
            YOUR RATING
          </Text>
          <TvStars value={star} onChange={setStar} />
          <Text
            style={{
              color: star > 0 ? DS.gold : DS.muted,
              fontSize: 13,
              fontWeight: '600',
              letterSpacing: 0.6,
              marginTop: 12,
              fontFamily: FONT,
            }}>
            {star > 0
              ? `${(STAR_WORDS[star] ?? '').toUpperCase()} · ${star}/5`
              : 'PRESS OK ON A STAR'}
          </Text>

          <View style={{flex: 1}} />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderRadius: DS.radiusSm,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
            <Icon name="heart-outline" size={15} color={DS.champagne} />
            <Text
              style={{
                flex: 1,
                color: DS.text2,
                fontSize: 10,
                lineHeight: 15,
                marginLeft: 8,
                fontFamily: FONT,
              }}>
              Something needs fixing right now? Reception answers in the Help Desk
              chat faster than a review can travel.
            </Text>
          </View>
        </GlassPanel>

        {/* ── Middle: the note, mostly without typing ── */}
        <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
          <Text
            style={{
              color: DS.text,
              fontSize: 16,
              fontWeight: '600',
              letterSpacing: 1,
              fontFamily: FONT,
            }}>
            SHARE YOUR EXPERIENCE
          </Text>
          <Text style={{color: DS.muted, fontSize: 10, marginTop: 4, fontFamily: FONT}}>
            Optional — pick what fits, or write your own below
          </Text>

          <ScrollView style={{flex: 1, marginTop: 14}} showsVerticalScrollIndicator={false}>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
              {STAY_PRESETS.map(preset => {
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
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: on ? 'rgba(212,180,131,0.16)' : 'rgba(255,255,255,0.06)',
                    }}>
                    {on ? (
                      <Icon name="checkmark" size={12} color={DS.gold} style={{marginRight: 5}} />
                    ) : null}
                    <Text
                      style={{
                        color: on ? DS.champagne : DS.text2,
                        fontSize: 11,
                        fontFamily: FONT,
                      }}>
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
                marginTop: 18,
                fontFamily: FONT,
              }}>
              YOUR MESSAGE
            </Text>
            <View
              style={{
                marginTop: 8,
                borderRadius: DS.radiusSm,
                borderWidth: 2,
                borderColor: noteFocus.focused ? DS.focus : DS.borderSoft,
                backgroundColor: 'rgba(255,255,255,0.06)',
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                onFocus={noteFocus.onFocus}
                onBlur={noteFocus.onBlur}
                placeholder="Write your message"
                placeholderTextColor={DS.muted}
                multiline
                textAlignVertical="top"
                accessibilityLabel="Your feedback message"
                style={{minHeight: 96, color: DS.text, fontSize: 13, fontFamily: FONT}}
              />
            </View>
          </ScrollView>
        </GlassPanel>

        {/* ── Right: send it ── */}
        <GlassPanel style={{width: 268, padding: 16}}>
          <Text
            style={{
              color: DS.text,
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: 1,
              marginBottom: 12,
              fontFamily: FONT,
            }}>
            SUMMARY
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 4,
            }}>
            <Text style={{color: DS.text2, fontSize: 12, fontFamily: FONT}}>Rating</Text>
            <Text style={{color: DS.gold, fontSize: 16, fontWeight: '700', fontFamily: FONT}}>
              {star > 0 ? `${star}/5` : '—'}
            </Text>
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 4,
            }}>
            <Text style={{color: DS.text2, fontSize: 12, fontFamily: FONT}}>Notes</Text>
            <Text style={{color: DS.text, fontSize: 13, fontWeight: '500', fontFamily: FONT}}>
              {parts.length > 0 ? `${parts.length} added` : notes.trim() ? 'Written' : 'None'}
            </Text>
          </View>

          <View style={{flex: 1}} />

          {/* The API accepts a note-only submission, so the button is not gated
              on a star — but the guest is told which one carries the weight. */}
          <Text
            style={{
              color: DS.muted,
              fontSize: 10,
              lineHeight: 15,
              marginBottom: 10,
              fontFamily: FONT,
            }}>
            {star > 0
              ? 'Thank you — press SUBMIT and we will pass this on.'
              : 'A star rating helps us the most, but you can send just a note.'}
          </Text>
          <GoldButton
            label={isSubmitting ? 'Submitting…' : 'Submit'}
            icon={isSubmitting ? null : 'send-outline'}
            disabled={isSubmitting}
            onPress={onSubmit}
            height={46}
          />
          <GlassButton
            label="Not Now"
            icon="arrow-back"
            onPress={() => navigation.goBack()}
            height={42}
            style={{marginTop: 8}}
          />
        </GlassPanel>
      </View>
    </TvScreen>
  );
}
