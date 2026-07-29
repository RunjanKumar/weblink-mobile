import React from 'react';
import {Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTheme} from '../../../theme';
import {useTVFocus} from '../../../hooks/useTVFocus';

/** Reference `OverlayBackButton.jsx`: floating round back button over the hero. */
export function OverlayBackButton({onPress}: {onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
      }}>
      <Icon name="arrow-back" size={22} color="#ffffff" />
    </Pressable>
  );
}
