import React, {useEffect, useRef} from 'react';
import {ActivityIndicator, Animated, Platform, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {toast} from '../../../components';
import {
  DS,
  FONT,
  MainCurtainIcon,
  SheerCurtainIcon,
  TvPressable,
} from '../../../components/TvGlass';
import {getApiErrorMessage} from '../../../utils/errorHandler';
import {useCurtains, type Curtain} from '../../../viewmodels';
import type {CurtainState} from '../../../constants/roomControl';

/**
 * Curtain Control — the dashboard card the client's Figma puts where Climate
 * Control used to sit. Two curtains, three commands each.
 *
 * The motor rules (never energise open and close together; STOP drops both
 * lines) live in `useCurtains`, not here — this file is the Figma's geometry and
 * nothing else. What IS a UI decision: the button matching the curtain's current
 * state stays lit, so a guest glancing over sees what the curtain is doing
 * without watching it move.
 */

/**
 * Circle button + caption — the Figma's ‹ ‖ › row.
 *
 * THREE states, deliberately far apart. The old design separated on from off by
 * a 20%-gold tint behind a gold icon, which on a bright glass card at ten feet
 * was no separation at all — a guest could not tell which command was running:
 *
 *   off      faint glass fill, WHITE icon        — this line is not energised
 *   on       SOLID gold fill, DARK icon          — this line is energised
 *   moving   the on style, breathing             — the curtain is running
 *
 * On/off is carried by fill AND icon colour together, not by a tint alone, so it
 * survives both the light and dark backdrops. There is no spinner: the exec
 * returns in well under the ~15s the curtain takes to travel, so a loader would
 * flash and vanish while the real feedback — the button lighting up — is what
 * the guest is waiting for.
 */
function CurtainButton({
  icon,
  label,
  active,
  moving,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  /** This line is energised AND the motor is travelling — pulse it. */
  moving: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!moving) {
      pulse.setValue(0);
      return;
    }
    // Opacity only — no layout, no transform. Light Control taught us how little
    // headroom the webOS SoC has, and this can run for the ~15s of curtain travel.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 620,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 620,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [moving, pulse]);

  return (
    <View style={{alignItems: 'center', marginHorizontal: 7}}>
      <TvPressable
        onPress={onPress}
        disabled={disabled}
        label={`${label} curtain${active ? ' (active)' : ''}`}
        restBorderColor={active ? DS.champagne : DS.border}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: active ? DS.gold : 'rgba(255,255,255,0.10)',
          // The lit button never dims — it is the answer to "what is running?".
          opacity: disabled && !active ? 0.4 : 1,
        }}>
        {/* Breathing highlight — reads as "this is running right now". */}
        {moving ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#FFFFFF',
              opacity: pulse.interpolate({inputRange: [0, 1], outputRange: [0, 0.38]}),
            }}
          />
        ) : null}
        <Icon name={icon} size={15} color={active ? DS.dark : DS.text} />
      </TvPressable>
      <Text
        numberOfLines={1}
        style={{
          color: active ? DS.gold : DS.muted,
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.6,
          marginTop: 4,
          fontFamily: FONT,
        }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/** Which button reads as lit for a given curtain state. */
const activeFor = (state: CurtainState) => ({
  close: state === 'closed',
  stop: state === 'stopped',
  open: state === 'open',
});

/**
 * The heading doubles as the status line. There is no room in a 150px card for
 * a fourth row, and a guest who has just pressed a button wants the answer in
 * words, not only in colour — so the name yields to "MAIN · OPENING" for the
 * ~15s of travel, then reverts. The glyph underneath still says which curtain
 * this column is, so nothing is lost while the caption is borrowed.
 */
function headingFor(curtain: Curtain): {text: string; moving: boolean} {
  if (!curtain.travelling) {
    return {text: curtain.label.toUpperCase(), moving: false};
  }
  // `?? label` for noUncheckedIndexedAccess — split always yields one element,
  // but the compiler cannot know that.
  const short = (curtain.label.split(' ')[0] ?? curtain.label).toUpperCase();
  const verb = curtain.travelling === 'open' ? 'OPENING' : 'CLOSING';
  return {text: `${short} · ${verb}`, moving: true};
}

function CurtainColumn({curtain}: {curtain: Curtain}) {
  const lit = activeFor(curtain.state);
  const Glyph = curtain.kind === 'sheer' ? SheerCurtainIcon : MainCurtainIcon;
  const heading = headingFor(curtain);

  const send = (run: () => Promise<void>) => () => {
    run().catch(error =>
      toast.error(getApiErrorMessage(error, 'Could not move the curtain. Please try again.')),
    );
  };

  return (
    // space-between, not fixed margins: the card is 150 high and the title eats
    // ~22 of it, leaving ~102 for name + glyph + buttons + captions. Distributing
    // the remainder is what keeps the captions off the card's bottom edge.
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 1}}>
      <Text
        numberOfLines={1}
        style={{
          color: heading.moving ? DS.gold : DS.text,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.8,
          fontFamily: FONT,
        }}>
        {heading.text}
      </Text>
      <View style={{marginVertical: 3}}>
        <Glyph size={38} color={DS.gold} />
      </View>
      <View style={{flexDirection: 'row'}}>
        <CurtainButton
          icon="chevron-back"
          label="Close"
          active={lit.close}
          moving={curtain.travelling === 'closed'}
          disabled={curtain.isBusy}
          onPress={send(curtain.close)}
        />
        <CurtainButton
          icon="pause"
          label="Stop"
          active={lit.stop}
          // Stop is a parked curtain, never a travelling one — no pulse.
          moving={false}
          disabled={curtain.isBusy}
          onPress={send(curtain.stop)}
        />
        <CurtainButton
          icon="chevron-forward"
          label="Open"
          active={lit.open}
          moving={curtain.travelling === 'open'}
          disabled={curtain.isBusy}
          onPress={send(curtain.open)}
        />
      </View>
    </View>
  );
}

export function CurtainControl() {
  const curtains = useCurtains();

  if (curtains.isLoading) {
    return <ActivityIndicator color={DS.gold} />;
  }

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
      <CurtainColumn curtain={curtains.main} />
      <View style={{width: 1, alignSelf: 'stretch', backgroundColor: DS.divider}} />
      <CurtainColumn curtain={curtains.sheer} />
    </View>
  );
}
