import React, {useState} from 'react';
import {Platform, Pressable, ScrollView, Text, View} from 'react-native';
import {AppImage} from '../../../components';
import {useTheme} from '../../../theme';
import {useTVFocus} from '../../../hooks/useTVFocus';
import {IS_TV} from '../../../utils/responsive';
import type {Coupon} from '../../../models/food.model';

const CARD_WIDTH = 300;
const CARD_GAP = 20;
const PAGE = CARD_WIDTH + CARD_GAP;

function OfferCard({coupon, onPress}: {coupon: Coupon; onPress: () => void}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={coupon.name ?? coupon.title ?? 'Offer'}
      style={{
        width: CARD_WIDTH,
        height: 130,
        borderRadius: 22,
        overflow: 'hidden',
        marginRight: CARD_GAP,
        ...(Platform.OS === 'web' ? ({scrollSnapAlign: 'start'} as object) : null),
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? theme.colors.focusRing : theme.colors.border,
        transform: [{scale: focused ? 1.03 : 1}],
      }}>
      <AppImage
        src={coupon.image}
        fallbackIcon="pricetags-outline"
        fallbackIconSize={32}
        style={{width: '100%', height: '100%'}}
        resizeMode="cover"
      />
    </Pressable>
  );
}

/**
 * Reference `offerSlider.jsx`: "Special Offers" heading, 300×130 image cards
 * with snap paging and dots (active 24×8, inactive 8×8).
 */
export function OfferSlider({
  coupons,
  onOpen,
}: {
  coupons: Coupon[];
  onOpen: (coupon: Coupon) => void;
}) {
  const {theme} = useTheme();
  const [page, setPage] = useState(0);

  if (coupons.length === 0) {
    return null;
  }

  return (
    <View style={{marginTop: 24}}>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: IS_TV ? 26 : 22,
          fontWeight: '600',
          marginBottom: 16,
        }}>
        Special Offers
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={PAGE}
        decelerationRate="fast"
        onScroll={e => setPage(Math.round(e.nativeEvent.contentOffset.x / PAGE))}
        scrollEventThrottle={64}
        // react-native-web ignores snapToInterval — use CSS scroll-snap there.
        style={Platform.OS === 'web' ? ({scrollSnapType: 'x mandatory'} as object) : undefined}>
        {coupons.map(coupon => (
          <OfferCard key={coupon._id} coupon={coupon} onPress={() => onOpen(coupon)} />
        ))}
      </ScrollView>
      {coupons.length > 1 ? (
        <View className="flex-row justify-center" style={{gap: 8, marginTop: 16}}>
          {coupons.map((coupon, index) => (
            <View
              key={coupon._id}
              style={{
                width: index === page ? 24 : 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: index === page ? theme.colors.primary : theme.colors.border,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
