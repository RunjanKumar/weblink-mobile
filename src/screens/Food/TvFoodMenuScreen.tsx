import React, {useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  DS,
  FONT,
  GLASS_BLUR,
  GlassPanel,
  GlassSheen,
  SHADOW,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useCartViewModel, useFoodMenuViewModel} from '../../viewmodels';
import {useFoodOrder} from '../../store/FoodOrderContext';
import {useTVFocus} from '../../hooks/useTVFocus';
import {getDiscountDisplayInfo} from '../../utils/discount';
import {formatRupees} from '../../utils';
import {
  AddCircle,
  BusyOverlay,
  FoodImage,
  FoodRail,
  GlassButton,
  GoldButton,
  MoneyRow,
  QtyStepper,
  placeTvOrder,
} from './components/TvFoodParts';
import {toCartItem} from './foodCart';
import type {Food} from '../../models/food.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Food'>;

/**
 * Food Order (TV) — the client's Figma frame 1, built 1:1.
 *
 * Three columns inside the shared chrome: category rail on the left, search +
 * filter + dish grid in the middle, live order panel on the right. The guest
 * never leaves this screen to add food — the right column IS the cart, so the
 * whole ordering loop is one page and one D-pad walk.
 *
 * Differences from the phone menu, all deliberate:
 *  - ONE category at a time (the rail selects it) instead of the phone's
 *    scroll-spy sections: at ten feet a long scrolling list is unusable, and
 *    the Figma's rail is the navigation;
 *  - tapping a card adds it straight to the order instead of opening the detail
 *    screen — the detail screen exists for add-ons the TV menu has no room for,
 *    and the client asked for one-press ordering.
 */

/**
 * Dish grid: 4 across on the panel (23% × 4 + three 13px gaps still fits), and
 * a percentage rather than a fixed width so an Android TV at a different dp
 * width re-flows to three per row instead of clipping the fourth card.
 */
const CARD_WIDTH = '23%';
const CARD_IMAGE_HEIGHT = 112;

type VegFilter = 'all' | 'veg' | 'nonveg';

const FILTER_LABEL: Record<VegFilter, string> = {
  all: 'FILTER',
  veg: 'VEG ONLY',
  nonveg: 'NON-VEG',
};

/* ── One dish ── */
function DishCard({food, onAdd}: {food: Food; onAdd: () => void}) {
  const available = food.isAvailable !== false;
  const info = getDiscountDisplayInfo({
    price: food.price ?? 0,
    priceAfterDiscount: food.priceAfterDiscount,
    couponData: food.couponData,
  });

  return (
    <TvPressable
      onPress={available ? onAdd : () => {}}
      label={available ? `Add ${food.name ?? 'dish'} to your order` : `${food.name} is unavailable`}
      restBorderColor={DS.borderSoft}
      style={{
        width: CARD_WIDTH,
        marginBottom: DS.gap,
        borderRadius: DS.radius,
        overflow: 'hidden',
        backgroundColor: DS.glass,
        opacity: available ? 1 : 0.45,
        ...SHADOW,
        ...(GLASS_BLUR ?? {}),
      }}>
      <FoodImage
        src={food.imageURL}
        radius={0}
        style={{width: '100%', height: CARD_IMAGE_HEIGHT, borderRadius: 0}}
      />
      {!available ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: 'rgba(0,0,0,0.65)',
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}>
          <Text style={{color: DS.text, fontSize: 8, fontWeight: '700', fontFamily: FONT}}>
            UNAVAILABLE
          </Text>
        </View>
      ) : null}

      <View style={{padding: 11}}>
        {/* Fixed two-line block like the description below: one line cut most
            dish names short ("CHOCOLATE LAVA C…"), and a fixed height keeps
            every card's price on the same baseline. */}
        <Text
          numberOfLines={2}
          style={{
            color: DS.text,
            fontSize: 12,
            lineHeight: 15,
            height: 30,
            fontWeight: '600',
            letterSpacing: 0.6,
            fontFamily: FONT,
          }}>
          {(food.name ?? 'Dish').toUpperCase()}
        </Text>
        {/* Fixed two-line block so every card in a row ends its price at the
            same baseline, whatever the description length. */}
        <Text
          numberOfLines={2}
          style={{color: DS.text2, fontSize: 9, lineHeight: 13, height: 26, marginTop: 4, fontFamily: FONT}}>
          {food.description ?? ''}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
          }}>
          <View style={{flex: 1, paddingRight: 6}}>
            <Text style={{color: DS.text, fontSize: 14, fontWeight: '600', fontFamily: FONT}}>
              {formatRupees(info.displayPrice)}
            </Text>
            {info.originalPrice != null ? (
              <Text
                style={{
                  color: DS.muted,
                  fontSize: 9,
                  textDecorationLine: 'line-through',
                  fontFamily: FONT,
                }}>
                {formatRupees(info.originalPrice)}
              </Text>
            ) : null}
          </View>
          {available ? <AddCircle onPress={onAdd} label={`Add ${food.name ?? 'dish'}`} /> : null}
        </View>
      </View>
      {/* One frosted pane over photo AND label together — painted last so it
          sits ON the photo (a card is opaque, unlike the see-through panels). */}
      <GlassSheen />
    </TvPressable>
  );
}

/* ── Search field ── */
function SearchField({value, onChange}: {value: string; onChange: (next: string) => void}) {
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <View
      style={{
        flex: 1,
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: DS.radius,
        borderWidth: 2,
        borderColor: focused ? DS.focus : DS.borderSoft,
        backgroundColor: DS.glass,
        ...(GLASS_BLUR ?? {}),
      }}>
      <TextInput
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Search for dishes..."
        placeholderTextColor={DS.muted}
        autoCorrect={false}
        accessibilityLabel="Search for dishes"
        style={{flex: 1, color: DS.text, fontSize: 13, fontFamily: FONT}}
      />
      <Icon name="search-outline" size={17} color={DS.text2} />
    </View>
  );
}

export function TvFoodMenuScreen({navigation, route}: Props) {
  const vm = useFoodMenuViewModel();
  const cart = useCartViewModel();
  const {addToFoodCart} = useFoodOrder();

  const [selectedId, setSelectedId] = useState<string | null>(route.params?.foodCategoryId ?? null);
  const [vegFilter, setVegFilter] = useState<VegFilter>('all');

  const sections = vm.categories; // already search-filtered, empties dropped
  const searchMode = vm.search.trim().length > 0;

  const railCategories = useMemo(
    () => sections.map(cat => ({id: cat._id, name: cat.name ?? 'Category'})),
    [sections],
  );

  // The rail's selection survives a search that hides it, and falls back to the
  // first category whenever the selected one disappears from the results.
  const activeCategory =
    sections.find(cat => cat._id === selectedId) ?? sections[0] ?? null;

  const dishes = useMemo(() => {
    const source = searchMode
      ? sections.flatMap(cat => cat.foodsInCategories ?? [])
      : activeCategory?.foodsInCategories ?? [];
    if (vegFilter === 'all') {
      return source;
    }
    // `type === 1` is veg (VegIndicator's rule); anything else is non-veg.
    return source.filter(food => (vegFilter === 'veg' ? food.type === 1 : food.type !== 1));
  }, [searchMode, sections, activeCategory, vegFilter]);

  const cycleFilter = () =>
    setVegFilter(prev => (prev === 'all' ? 'veg' : prev === 'veg' ? 'nonveg' : 'all'));

  const busy = cart.isPlacingOrder || cart.paymentProcessing;

  const heading = searchMode
    ? 'SEARCH RESULTS'
    : (activeCategory?.name ?? 'Menu').toUpperCase();

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: categories ── */}
          <FoodRail
            title="Food Order"
            subtitle="Order delicious meals"
            onBack={() => navigation.goBack()}
            categories={railCategories}
            // Search spans every category, so nothing in the rail is "the"
            // selection while it is running.
            activeId={searchMode ? null : activeCategory?._id ?? null}
            onSelect={id => {
              setSelectedId(id);
              vm.setSearch(''); // a category press leaves search mode
            }}
            onHistory={() => navigation.navigate('OrderHistory')}
          />

          {/* ── Middle: search + dishes ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 14}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <SearchField value={vm.search} onChange={vm.setSearch} />
              <GlassButton
                label={FILTER_LABEL[vegFilter]}
                icon="funnel-outline"
                onPress={cycleFilter}
                height={44}
                style={{
                  marginLeft: DS.gap,
                  width: 128,
                  borderRadius: DS.radius,
                  backgroundColor: vegFilter === 'all' ? 'rgba(255,255,255,0.10)' : 'rgba(212,180,131,0.28)',
                }}
              />
            </View>

            {vm.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
                <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                  Loading the menu…
                </Text>
              </View>
            ) : vm.error ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="cloud-offline-outline" size={34} color={DS.gold} />
                <Text
                  style={{
                    color: DS.text2,
                    fontSize: 13,
                    marginTop: 12,
                    textAlign: 'center',
                    fontFamily: FONT,
                  }}>
                  {vm.error}
                </Text>
                <GoldButton
                  label="Try again"
                  icon={null}
                  onPress={() => vm.refetch()}
                  style={{marginTop: 16, alignSelf: 'center'}}
                />
              </View>
            ) : (
              <>
                <Text
                  style={{
                    color: DS.champagne,
                    fontSize: 13,
                    fontWeight: '700',
                    letterSpacing: 1.2,
                    marginTop: 14,
                    marginBottom: 10,
                    fontFamily: FONT,
                  }}>
                  {heading}
                </Text>
                {dishes.length === 0 ? (
                  <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                    <Icon name="restaurant-outline" size={30} color={DS.muted} />
                    <Text style={{color: DS.text2, fontSize: 13, marginTop: 10, fontFamily: FONT}}>
                      {searchMode || vegFilter !== 'all'
                        ? 'No dishes match your search.'
                        : 'No dishes in this category yet.'}
                    </Text>
                  </View>
                ) : (
                  // flex: 1 — without it the grid grows to its content height
                  // and spills past the panel instead of scrolling inside it.
                  <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-start',
                        gap: DS.gap,
                      }}>
                      {dishes.map(food => (
                        <DishCard
                          key={food._id}
                          food={food}
                          onAdd={() => addToFoodCart(toCartItem(food))}
                        />
                      ))}
                    </View>
                  </ScrollView>
                )}
              </>
            )}
          </GlassPanel>

          {/* ── Right: live order ── */}
          <GlassPanel style={{width: 250, padding: 14}}>
            <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 1,
                  fontFamily: FONT,
                }}>
                YOUR ORDER
              </Text>
              <Text style={{color: DS.text2, fontSize: 10, marginLeft: 6, fontFamily: FONT}}>
                ({cart.itemCount} {cart.itemCount === 1 ? 'ITEM' : 'ITEMS'})
              </Text>
            </View>

            {cart.items.length === 0 ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="cart-outline" size={28} color={DS.muted} />
                <Text
                  style={{
                    color: DS.text2,
                    fontSize: 11,
                    marginTop: 10,
                    textAlign: 'center',
                    fontFamily: FONT,
                  }}>
                  Your order is empty.{'\n'}Pick a dish to get started.
                </Text>
              </View>
            ) : (
              <ScrollView style={{flex: 1, marginTop: 12}} showsVerticalScrollIndicator={false}>
                {cart.items.map(item => (
                  <View key={item.id} style={{flexDirection: 'row', marginBottom: 14}}>
                    <FoodImage src={item.imageURL} size={48} />
                    <View style={{flex: 1, marginLeft: 10}}>
                      <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
                        <Text
                          numberOfLines={2}
                          style={{
                            flex: 1,
                            color: DS.text,
                            fontSize: 11,
                            fontWeight: '500',
                            fontFamily: FONT,
                          }}>
                          {item.title ?? item.name ?? 'Item'}
                        </Text>
                        <TvPressable
                          onPress={() => cart.remove(item)}
                          label={`Remove ${item.title ?? 'item'}`}
                          style={{borderRadius: 8, padding: 3, marginLeft: 4}}>
                          <Icon name="trash-outline" size={13} color={DS.muted} />
                        </TvPressable>
                      </View>
                      <Text style={{color: DS.gold, fontSize: 11, marginTop: 2, fontFamily: FONT}}>
                        {formatRupees(item.lineTotal)}
                      </Text>
                      <View style={{marginTop: 6}}>
                        <QtyStepper
                          quantity={item.quantity}
                          size={22}
                          onIncrement={() => cart.increment(item)}
                          onDecrement={() => cart.decrement(item)}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Totals + CTAs */}
            <View style={{marginTop: 12, borderTopWidth: 1, borderTopColor: DS.divider, paddingTop: 10}}>
              <MoneyRow label="Subtotal" value={formatRupees(cart.itemsTotal)} />
              {cart.totalSavings > 0 ? (
                <MoneyRow label="You save" value={`-${formatRupees(cart.totalSavings)}`} positive />
              ) : null}
              <MoneyRow
                label={`Taxes & Charges${cart.taxRate ? ` (${cart.taxRate}%)` : ''}`}
                value={formatRupees(cart.taxAmount)}
              />
              <View style={{height: 1, backgroundColor: DS.divider, marginVertical: 8}} />
              <MoneyRow label="Total Amount" value={formatRupees(cart.payableAmount)} total />

              <GoldButton
                label="Place Order"
                onPress={() =>
                  placeTvOrder(cart.placeOrder, () => navigation.navigate('OrderHistory'))
                }
                disabled={busy || cart.items.length === 0}
                style={{marginTop: 12}}
              />
              <GlassButton
                label="View Cart"
                icon="cart-outline"
                badge={cart.itemCount}
                onPress={() => navigation.navigate('Cart')}
                style={{marginTop: 8}}
              />
            </View>
          </GlassPanel>
        </View>

        <TvFooter marginTop={12} />
      </View>

      {busy ? (
        <BusyOverlay label={cart.paymentProcessing ? 'Verifying payment…' : 'Placing your order…'} />
      ) : null}
    </SafeAreaView>
  );
}
