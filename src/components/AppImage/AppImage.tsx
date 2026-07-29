import React, {useState} from 'react';
import {
  Image,
  View,
  type ImageProps,
  type StyleProp,
  type ImageStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {resolveImageUrl} from '../../utils/imageUrl';
import {useTheme} from '../../theme';

export interface AppImageProps extends Omit<ImageProps, 'source' | 'style' | 'src'> {
  /** API image reference — relative CDN path or absolute URL. */
  src?: string | null;
  /** Ionicons glyph shown when there is no image or it fails to load. */
  fallbackIcon?: string;
  fallbackIconSize?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * Image with CDN resolution + graceful fallback — the React Native port of the
 * admin panel's `AppImage.jsx`, sharing its rules:
 *  - absolute `http(s)`/`data:` sources pass through untouched;
 *  - anything else is a relative CDN path and gets `IMAGE_BASE_URL`
 *    (CloudFront) prefixed — the backend stores paths like
 *    `<hotelId>/food/x.jpg`, never full URLs;
 *  - a load error swaps in a placeholder (an icon block here — RN has no
 *    `/placeholder.svg` — sized by the same `style` the image would have used).
 *
 * The error flag is keyed to the resolved URI, so a changed `src` retries
 * instead of staying stuck on the fallback.
 */
export function AppImage({
  src,
  fallbackIcon = 'image-outline',
  fallbackIconSize = 26,
  style,
  ...rest
}: AppImageProps) {
  const {theme} = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const uri = resolveImageUrl(src);

  if (!uri || failedUri === uri) {
    return (
      <View
        style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surfaceElevated,
          },
          style,
        ]}>
        <Icon name={fallbackIcon} size={fallbackIconSize} color={theme.colors.muted} />
      </View>
    );
  }

  return <Image source={{uri}} style={style} onError={() => setFailedUri(uri)} {...rest} />;
}
