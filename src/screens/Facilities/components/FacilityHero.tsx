import React from 'react';
import {Text, View} from 'react-native';
import {AppImage} from '../../../components';
import {useTheme} from '../../../theme';
import {IS_TV} from '../../../utils/responsive';
import {OverlayBackButton} from './OverlayBackButton';

/**
 * Reference hero block (FacilityDetail/ReserveTable): large image with the
 * floating back button and a "No image available" fallback box.
 */
export function FacilityHero({image, onBack}: {image?: string; onBack: () => void}) {
  const {theme} = useTheme();
  const height = IS_TV ? 340 : 280;
  return (
    <View>
      {image ? (
        <AppImage
          src={image}
          fallbackIcon="image-outline"
          fallbackIconSize={44}
          style={{width: '100%', height}}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surfaceElevated,
          }}>
          <Text style={{color: theme.colors.muted, fontSize: 15}}>No image available</Text>
        </View>
      )}
      <OverlayBackButton onPress={onBack} />
    </View>
  );
}
