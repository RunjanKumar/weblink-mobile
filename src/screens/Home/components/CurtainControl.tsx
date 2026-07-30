import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
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

/** Circle button + caption — the Figma's ‹ ‖ › row. */
function CurtainButton({
  icon,
  label,
  active,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{alignItems: 'center', marginHorizontal: 7}}>
      <TvPressable
        onPress={onPress}
        disabled={disabled}
        label={`${label} curtain`}
        restBorderColor={active ? DS.gold : DS.border}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? DS.glassGold : 'rgba(255,255,255,0.10)',
          opacity: disabled ? 0.45 : 1,
        }}>
        <Icon name={icon} size={15} color={active ? DS.gold : DS.text} />
      </TvPressable>
      <Text
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

function CurtainColumn({curtain}: {curtain: Curtain}) {
  const lit = activeFor(curtain.state);
  const Glyph = curtain.kind === 'sheer' ? SheerCurtainIcon : MainCurtainIcon;

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
          color: DS.text,
          fontSize: 12,
          fontWeight: '600',
          letterSpacing: 0.8,
          fontFamily: FONT,
        }}>
        {curtain.label.toUpperCase()}
      </Text>
      <View style={{marginVertical: 3}}>
        <Glyph size={38} color={DS.gold} />
      </View>
      <View style={{flexDirection: 'row'}}>
        <CurtainButton
          icon="chevron-back"
          label="Close"
          active={lit.close}
          disabled={curtain.isBusy}
          onPress={send(curtain.close)}
        />
        <CurtainButton
          icon="pause"
          label="Stop"
          active={lit.stop}
          disabled={curtain.isBusy}
          onPress={send(curtain.stop)}
        />
        <CurtainButton
          icon="chevron-forward"
          label="Open"
          active={lit.open}
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
