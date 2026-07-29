import React from 'react';
import {View} from 'react-native';
import {useTheme} from '../../../theme';

/**
 * Veg / non-veg marker — square outline with a filled dot (reference
 * `VegIndicator.jsx`): `type === 1` veg (green), anything else non-veg (red),
 * nothing when type is missing. 700-weights on the light theme (the reference's
 * 500s are ~2:1 on white).
 */
export function VegIndicator({type, size = 16}: {type?: number; size?: number}) {
  const {scheme} = useTheme();
  if (!type) {
    return null;
  }
  const veg = type === 1;
  const color =
    scheme === 'dark' ? (veg ? '#22c55e' : '#ef4444') : veg ? '#15803d' : '#dc2626';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: 2,
        borderColor: color,
        borderRadius: 3,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderRadius: size * 0.25,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
