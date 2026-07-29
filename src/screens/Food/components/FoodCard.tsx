import React from 'react';
import {Platform, Pressable, Text, View} from 'react-native';
import {AppImage} from '../../../components';
import {useTheme} from '../../../theme';
import {useTVFocus} from '../../../hooks/useTVFocus';
import {IS_TV} from '../../../utils/responsive';
import {getDiscountDisplayInfo} from '../../../utils/discount';
import {AddButton} from './AddButton';
import {VegIndicator} from './VegIndicator';
import type {Food} from '../../../models/food.model';

export type FoodCardVariant = 'row' | 'grid';

/**
 * Reference `foodcard.jsx`, in two shapes:
 *  - `row` (phone): text column left, 130px image right — the web app 1:1;
 *  - `grid` (TV): image-top card for the 3-column layout the client chose
 *    (admin-panel look), same data and behaviors underneath.
 *
 * Unavailable: whole card at half opacity (+ grayscale on web), image dimmed
 * by a black/50 scrim, AddButton replaced by the "Unavailable" chip, BOGO
 * badges suppressed — and the card stays pressable (detail screen shows the
 * disabled state), exactly like the reference.
 */
export function FoodCard({
  food,
  variant,
  onOpen,
}: {
  food: Food;
  variant: FoodCardVariant;
  onOpen: () => void;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();

  const available = food.isAvailable !== false;
  const info = getDiscountDisplayInfo({
    price: food.price ?? 0,
    priceAfterDiscount: food.priceAfterDiscount,
    couponData: food.couponData,
  });

  const cardStyle = [
    {
      borderWidth: focused ? 2 : 1,
      borderColor: focused ? theme.colors.focusRing : theme.colors.border,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden' as const,
      opacity: available ? 1 : 0.5,
      transform: [{scale: focused ? (IS_TV ? 1.03 : 1.01) : 1}],
    },
    // RN has no grayscale filter; on web (the TV) we can have the real thing.
    !available && Platform.OS === 'web' ? ({filter: 'grayscale(1)'} as object) : null,
  ];

  const bogoRibbon =
    info.isBogo && available ? (
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: theme.colors.primary,
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderBottomLeftRadius: 10,
        }}>
        <Text
          style={{
            color: theme.colors.primaryForeground,
            fontSize: IS_TV ? 12 : 10,
            fontWeight: '700',
          }}>
          BUY 1 GET 1
        </Text>
      </View>
    ) : null;

  const imageScrim = !available ? (
    <View
      style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)'}}
    />
  ) : null;

  const priceRow = (
    <View className="flex-row items-center" style={{gap: 8, flexWrap: 'wrap'}}>
      <Text
        style={{
          color: theme.colors.primary,
          fontSize: IS_TV ? 22 : 18,
          fontWeight: '700',
        }}>
        ₹ {Math.round(info.displayPrice)}
      </Text>
      {info.originalPrice != null ? (
        <Text
          style={{
            color: theme.colors.muted,
            fontSize: IS_TV ? 15 : 13,
            textDecorationLine: 'line-through',
          }}>
          ₹{Math.round(info.originalPrice)}
        </Text>
      ) : null}
      {info.isBogo && available ? (
        <View
          style={{
            backgroundColor: `${theme.colors.primary}26`,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 6,
          }}>
          <Text
            style={{color: theme.colors.primary, fontSize: IS_TV ? 13 : 11, fontWeight: '700'}}>
            1+1 FREE
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (variant === 'grid') {
    return (
      <Pressable
        onPress={onOpen}
        onFocus={onFocus}
        onBlur={onBlur}
        focusable
        accessibilityRole="button"
        accessibilityLabel={food.name}
        style={[{flex: 1}, ...cardStyle]}>
        <View>
          <AppImage
            src={food.imageURL}
            fallbackIcon="fast-food-outline"
            fallbackIconSize={40}
            style={{width: '100%', height: IS_TV ? 180 : 140}}
            resizeMode="cover"
          />
          {imageScrim}
          {bogoRibbon}
          {/* kcal + veg badges over the image (admin-panel look) */}
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
            {food.kcal != null && food.kcal > 0 ? (
              <View
                style={{
                  backgroundColor: 'rgba(17,19,24,0.72)',
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}>
                <Text style={{color: '#ffffff', fontSize: IS_TV ? 13 : 11, fontWeight: '600'}}>
                  ⚡ {food.kcal} kcal
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{position: 'absolute', bottom: 8, left: 8}}>
            <VegIndicator type={food.type} size={IS_TV ? 20 : 16} />
          </View>
        </View>
        <View style={{padding: IS_TV ? 14 : 12, flex: 1, justifyContent: 'space-between'}}>
          <View>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.text,
                fontSize: IS_TV ? 19 : 16,
                fontWeight: '600',
              }}>
              {food.name}
            </Text>
            {food.description ? (
              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.textTertiary,
                  fontSize: IS_TV ? 14 : 12,
                  lineHeight: IS_TV ? 20 : 17,
                  marginTop: 4,
                }}>
                {food.description}
              </Text>
            ) : null}
          </View>
          <View
            className="flex-row items-center justify-between"
            style={{marginTop: 10, gap: 8}}>
            {priceRow}
            <AddButton item={food} />
          </View>
        </View>
      </Pressable>
    );
  }

  // ── row variant (reference web layout) ──
  return (
    <Pressable
      onPress={onOpen}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable
      accessibilityRole="button"
      accessibilityLabel={food.name}
      style={[{flexDirection: 'row'}, ...cardStyle]}>
      {/* Left column */}
      <View style={{flex: 1, paddingHorizontal: 16, paddingVertical: 16, justifyContent: 'space-between', minWidth: 0}}>
        <View>
          <View className="flex-row items-center" style={{gap: 8}}>
            <VegIndicator type={food.type} size={16} />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: theme.colors.text,
                fontSize: 17,
                fontWeight: '600',
                lineHeight: 22,
              }}>
              {food.name}
            </Text>
          </View>
          {food.description ? (
            <Text
              numberOfLines={2}
              style={{
                color: theme.colors.textTertiary,
                fontSize: 13,
                lineHeight: 19,
                marginTop: 6,
              }}>
              {food.description}
            </Text>
          ) : null}
          {food.kcal != null && food.kcal > 0 ? (
            <Text style={{color: theme.colors.muted, fontSize: 13, marginTop: 6}}>
              {food.kcal} Kcal
            </Text>
          ) : null}
        </View>
        <View className="mt-3 flex-row items-center justify-between" style={{gap: 8}}>
          {priceRow}
          <AddButton item={food} />
        </View>
      </View>
      {/* Right column: image. The image absolutely fills the column — a
          percentage height against this auto-height row resolves to the
          image's INTRINSIC pixel height in RN, which blew the card up to the
          source image's full size. Card height stays driven by the text. */}
      <View style={{width: 130, flexShrink: 0, alignSelf: 'stretch', minHeight: 130}}>
        <AppImage
          src={food.imageURL}
          fallbackIcon="fast-food-outline"
          fallbackIconSize={30}
          style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
          resizeMode="cover"
        />
        {imageScrim}
        {bogoRibbon}
      </View>
    </Pressable>
  );
}
