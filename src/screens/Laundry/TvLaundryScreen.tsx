import React, {useMemo, useState} from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {dialog} from '../../components';
import {
  DS,
  FONT,
  GLASS_BLUR,
  GlassPanel,
  GlassSheen,
  SHADOW,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useLaundryViewModel} from '../../viewmodels';
import {formatRupees} from '../../utils';
import {serviceTypeDescription, serviceTypeLabel} from '../../constants/laundry';
import {ServiceGlyph, laundryServiceIcon} from './components/GarmentIcons';
import {GarmentPhoto} from './components/GarmentImages';
import type {LaundryBasketLine, LaundryItem} from '../../models/laundry.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Laundry'>;

/**
 * Laundry (TV) — the client's Figma frame, built 1:1.
 *
 * Garment grid on the left; the right column is a single slot that shows the
 * basket, the CUSTOMIZE panel for one garment, or the pickup schedule. Same
 * `useLaundryViewModel` as the phone — one rate list, one basket, one submit.
 *
 * HOW IT MAPS TO THE BACKEND: the rate list prices a garment PER SERVICE
 * (shirt+wash ₹150, shirt+iron ₹180 …). So a tile quotes the garment's cheapest
 * rate — the service it will be given by default — and "Select services for
 * this item" offers that same garment's remaining rates. Ticking one adds a
 * SECOND order line for the same garment, which the order payload
 * (a list of `{itemId, serviceType, qty}`) carries natively. Nothing here is
 * priced or sent that the rate list did not define.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/** Garment grid: 5 across, as the Figma. */
const CARD_WIDTH = '18.4%';
/** Which pane the right column is showing. */
type RightPane = {kind: 'basket'} | {kind: 'schedule'} | {kind: 'customize'; itemId: string};

/* ── Service mark, drawn or Ionicons ── */
function ServiceMark({
  serviceType,
  size = 22,
  color,
}: {
  serviceType: string;
  size?: number;
  color: string;
}) {
  const mark = laundryServiceIcon(serviceType, serviceTypeLabel(serviceType));
  return mark.drawn ? (
    <ServiceGlyph name={mark.drawn} size={size + 4} color={color} />
  ) : (
    <Icon name={mark.ionicon ?? 'sparkles-outline'} size={size} color={color} />
  );
}

/* ── One garment ── */
function GarmentCard({
  item,
  rate,
  line,
  onAdd,
  onIncrement,
  onDecrement,
  onCustomize,
}: {
  item: LaundryItem;
  rate: number;
  /** `undefined` when the garment is not in the basket. */
  line: LaundryBasketLine | undefined;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onCustomize: () => void;
}) {
  const qty = line?.qty ?? 0;
  const extras = line?.extras ?? [];
  const inBasket = qty > 0;

  return (
    <View
      style={{
        width: CARD_WIDTH,
        marginBottom: DS.gap,
        borderRadius: DS.radius,
        borderWidth: 1,
        borderColor: inBasket ? 'rgba(212,180,131,0.55)' : DS.borderSoft,
        backgroundColor: inBasket ? 'rgba(212,180,131,0.12)' : 'rgba(255,255,255,0.055)',
        overflow: 'hidden',
        paddingTop: 14,
        paddingHorizontal: 9,
        paddingBottom: 10,
        alignItems: 'center',
        ...SHADOW,
        ...(GLASS_BLUR ?? {}),
      }}>
      <GlassSheen strength={0.5} />

      {/* The Figma's tile is mostly PHOTOGRAPH — the garment is the tile, the
          label and price sit under it. `GarmentPhoto` keeps this box the same
          height whether it lands a photo or the drawn silhouette, so a grid of
          mixed ones does not step.
          72, not the ~92 the Figma's proportions suggest: the grid's scroll
          viewport is only ~192 CSS tall, so every pixel added here costs the
          guest part of a row (measured: 92 dropped it from 1.07 rows to 0.91).
          A photo is wider than the drawn sign it replaces, so it still reads
          bigger at the same height. */}
      <GarmentPhoto
        name={item.name}
        size={72}
        stretch
        glyphColor={inBasket ? DS.gold : 'rgba(255,255,255,0.62)'}
      />

      <Text
        numberOfLines={1}
        style={{color: DS.text, fontSize: 13, fontWeight: '500', marginTop: 8, fontFamily: FONT}}>
        {item.name ?? 'Item'}
      </Text>
      <Text style={{color: DS.text2, fontSize: 11, marginTop: 3, fontFamily: FONT}}>
        {formatRupees(rate)}
        <Text style={{color: DS.muted, fontSize: 10}}> / {item.unit || 'item'}</Text>
      </Text>

      {!inBasket ? (
        // "+ ADD" both adds the garment AND opens Customize — the frame's own
        // instruction ("Tap '+ Add' on any item to customize").
        <TvPressable
          onPress={onAdd}
          label={`Add and customize ${item.name ?? 'item'}`}
          restBorderColor="rgba(212,180,131,0.55)"
          style={{
            alignSelf: 'stretch',
            height: 32,
            marginTop: 9,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.06)',
          }}>
          <Text
            style={{
              color: DS.champagne,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.6,
              fontFamily: FONT,
            }}>
            + ADD
          </Text>
        </TvPressable>
      ) : (
        <>
          <View
            style={{
              alignSelf: 'stretch',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 9,
            }}>
            <TvPressable
              onPress={onDecrement}
              label={qty === 1 ? `Remove ${item.name ?? 'item'}` : `One less ${item.name ?? 'item'}`}
              restBorderColor={DS.border}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.14)',
              }}>
              <Icon name={qty === 1 ? 'trash-outline' : 'remove'} size={13} color={DS.text} />
            </TvPressable>
            <Text style={{color: DS.gold, fontSize: 15, fontWeight: '700', fontFamily: FONT}}>
              {qty}
            </Text>
            <TvPressable
              onPress={onIncrement}
              label={`One more ${item.name ?? 'item'}`}
              restBorderColor={DS.border}
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.14)',
              }}>
              <Icon name="add" size={13} color={DS.text} />
            </TvPressable>
          </View>

          {/* Service chip — the Figma's "1 Service" pill with its live dot. It
              is the way back into Customize once the garment is in the basket. */}
          <TvPressable
            onPress={onCustomize}
            label={`Customize ${item.name ?? 'item'}, ${extras.length} extra services`}
            restBorderColor={DS.borderSoft}
            style={{
              alignSelf: 'stretch',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              height: 28,
              marginTop: 8,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
            {extras.length > 0 ? (
              <ServiceMark serviceType={extras[0] as string} size={13} color={DS.champagne} />
            ) : (
              <Icon name="options-outline" size={13} color={DS.champagne} />
            )}
            <Text style={{color: DS.text, fontSize: 10, marginLeft: 6, fontFamily: FONT}}>
              {extras.length === 0
                ? 'Add service'
                : `${extras.length} Service${extras.length === 1 ? '' : 's'}`}
            </Text>
            {extras.length > 0 ? (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#8FD9A8',
                  marginLeft: 6,
                }}
              />
            ) : null}
          </TvPressable>
        </>
      )}
    </View>
  );
}

/* ── Right column: CUSTOMIZE <ITEM> ── */
function CustomizePane({
  item,
  vm,
  onDone,
  onCancel,
}: {
  item: LaundryItem;
  vm: ReturnType<typeof useLaundryViewModel>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const line = vm.basket[item._id];
  const qty = line?.qty ?? 0;
  const base = vm.baseRateFor(item);
  const services = vm.servicesFor(item);
  const selected = vm.servicesOf(item._id);
  const totals = vm.itemTotal(item._id);

  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      {/* Header */}
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <TvBackButton onPress={onDone} size={36} />
        <View style={{flex: 1, marginLeft: 12}}>
          <Text
            numberOfLines={1}
            style={{
              color: DS.text,
              fontSize: 15,
              fontWeight: '600',
              letterSpacing: 0.8,
              fontFamily: FONT,
            }}>
            {`CUSTOMIZE ${(item.name ?? 'ITEM').toUpperCase()}`}
          </Text>
          <Text numberOfLines={1} style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
            {qty} × {item.name ?? 'Item'}
          </Text>
        </View>
        <Text style={{color: DS.text, fontSize: 11, fontFamily: FONT}}>
          {formatRupees(base?.rate)}
          <Text style={{color: DS.muted, fontSize: 10}}> / {item.unit || 'item'}</Text>
        </Text>
      </View>

      {/* Quantity */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 14,
          paddingVertical: 8,
          borderTopWidth: 1,
          borderTopColor: DS.divider,
        }}>
        <Text
          style={{
            flex: 1,
            color: DS.muted,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1,
            fontFamily: FONT,
          }}>
          QUANTITY
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 9,
            borderWidth: 1,
            borderColor: DS.borderSoft,
            backgroundColor: 'rgba(255,255,255,0.06)',
            paddingHorizontal: 4,
            paddingVertical: 3,
          }}>
          <TvPressable
            onPress={() => vm.setQty(item._id, qty - 1)}
            // At qty 1 this button IS the delete — a screen reader must not
            // announce it as "one less".
            label={
              qty === 1 ? `Remove ${item.name ?? 'item'}` : `One less ${item.name ?? 'item'}`
            }
            restBorderColor={DS.border}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}>
            <Icon name={qty === 1 ? 'trash-outline' : 'remove'} size={13} color={DS.text} />
          </TvPressable>
          <Text
            style={{
              color: DS.text,
              fontSize: 15,
              fontWeight: '700',
              minWidth: 38,
              textAlign: 'center',
              fontFamily: FONT,
            }}>
            {qty}
          </Text>
          <TvPressable
            onPress={() => vm.setQty(item._id, qty + 1)}
            label={`One more ${item.name ?? 'item'}`}
            restBorderColor={DS.border}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}>
            <Icon name="add" size={13} color={DS.text} />
          </TvPressable>
        </View>
      </View>

      {/* Services */}
      <View style={{marginTop: 6, marginBottom: 8}}>
        <Text
          style={{
            color: DS.muted,
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1,
            fontFamily: FONT,
          }}>
          SELECT SERVICES FOR THIS ITEM
        </Text>
        <Text style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
          Choose one or more services
        </Text>
      </View>

      {services.length === 0 ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Icon name="information-circle-outline" size={24} color={DS.muted} />
          <Text
            style={{
              color: DS.text2,
              fontSize: 11,
              marginTop: 8,
              textAlign: 'center',
              lineHeight: 16,
              fontFamily: FONT,
            }}>
            {item.name ?? 'This item'} is offered with one service only.{'\n'}
            No extras to choose.
          </Text>
        </View>
      ) : (
        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
          {services.map(service => {
            const on = selected.includes(service.serviceType);
            const description = serviceTypeDescription(service.serviceType);
            return (
              <TvPressable
                key={service.serviceType}
                onPress={() => vm.toggleItemService(item._id, service.serviceType)}
                label={`${serviceTypeLabel(service.serviceType)}, ${on ? 'selected' : 'not selected'}`}
                restBorderColor={on ? 'rgba(212,180,131,0.55)' : DS.borderSoft}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderRadius: DS.radiusSm,
                  paddingHorizontal: 10,
                  paddingVertical: 9,
                  marginBottom: 7,
                  backgroundColor: on ? 'rgba(212,180,131,0.14)' : 'rgba(255,255,255,0.055)',
                }}>
                <View style={{width: 30, alignItems: 'center'}}>
                  <ServiceMark
                    serviceType={service.serviceType}
                    color={on ? DS.gold : 'rgba(255,255,255,0.62)'}
                  />
                </View>
                <View style={{flex: 1, marginLeft: 8}}>
                  <Text numberOfLines={1} style={{color: DS.text, fontSize: 12, fontFamily: FONT}}>
                    {serviceTypeLabel(service.serviceType)}
                  </Text>
                  {description ? (
                    <Text
                      numberOfLines={1}
                      style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
                      {description}
                    </Text>
                  ) : null}
                </View>
                <Text style={{color: DS.text, fontSize: 11, marginHorizontal: 10, fontFamily: FONT}}>
                  {formatRupees(service.rate)}
                  <Text style={{color: DS.muted, fontSize: 9}}> / item</Text>
                </Text>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    borderWidth: 1.5,
                    borderColor: on ? DS.gold : 'rgba(255,255,255,0.45)',
                    backgroundColor: on ? DS.gold : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {on ? <Icon name="checkmark" size={14} color={DS.dark} /> : null}
                </View>
              </TvPressable>
            );
          })}
        </ScrollView>
      )}

      {/* Running total for this garment only */}
      <View
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: DS.divider,
        }}>
        {totals.base ? (
          <BreakdownRow
            label={`${item.name ?? 'Item'} (${totals.base.qty} × ${formatRupees(totals.base.unitRate)})`}
            value={formatRupees(totals.base.amount)}
          />
        ) : null}
        {totals.extras.map(extra => (
          <BreakdownRow
            key={extra.serviceType}
            label={`${serviceTypeLabel(extra.serviceType)} (${extra.qty} × ${formatRupees(extra.unitRate)})`}
            value={formatRupees(extra.amount)}
          />
        ))}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 6,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: DS.divider,
          }}>
          <Text
            style={{
              color: DS.text,
              fontSize: 12,
              fontWeight: '700',
              letterSpacing: 0.6,
              fontFamily: FONT,
            }}>
            ITEM TOTAL
          </Text>
          <Text style={{color: DS.gold, fontSize: 18, fontWeight: '700', fontFamily: FONT}}>
            {formatRupees(totals.total)}
          </Text>
        </View>
      </View>

      {/* Done / Cancel */}
      <View style={{flexDirection: 'row', gap: DS.gap, marginTop: 12}}>
        <TvPressable
          onPress={onDone}
          label="Done"
          restBorderColor="#E5CFA5"
          style={{
            flex: 1,
            height: 44,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: DS.gold,
          }}>
          <Text
            style={{
              color: DS.text,
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 1,
              fontFamily: FONT,
            }}>
            DONE
          </Text>
        </TvPressable>
        <TvPressable
          onPress={onCancel}
          label="Cancel"
          restBorderColor={DS.border}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}>
          <Text
            style={{
              color: DS.text,
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 1,
              fontFamily: FONT,
            }}>
            CANCEL
          </Text>
        </TvPressable>
      </View>
    </GlassPanel>
  );
}

function BreakdownRow({label, value}: {label: string; value: string}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 3,
      }}>
      <Text numberOfLines={1} style={{flex: 1, color: DS.text2, fontSize: 11, fontFamily: FONT}}>
        {label}
      </Text>
      <Text style={{color: DS.text, fontSize: 12, fontWeight: '500', marginLeft: 8, fontFamily: FONT}}>
        {value}
      </Text>
    </View>
  );
}

/* ── Right column: basket preview ── */
function BasketPane({
  vm,
  onCustomize,
  onClearAll,
}: {
  vm: ReturnType<typeof useLaundryViewModel>;
  onCustomize: (itemId: string) => void;
  onClearAll: () => void;
}) {
  const {summary} = vm;
  const hasItems = summary.lines.length > 0;

  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
        <Text
          style={{
            flex: 1,
            color: DS.text,
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1,
            fontFamily: FONT,
          }}>
          YOUR BASKET{hasItems ? ` (${summary.pieceCount})` : ''}
        </Text>
        {hasItems ? (
          // Confirmed, not immediate: this link sits directly above the basket
          // rows, so a D-pad walking up lands on it — and one OK press would
          // otherwise wipe a basket the guest spent minutes building.
          <TvPressable
            onPress={onClearAll}
            label="Clear all"
            style={{borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3}}>
            <Text
              style={{
                color: DS.champagne,
                fontSize: 10,
                textDecorationLine: 'underline',
                fontFamily: FONT,
              }}>
              Clear All
            </Text>
          </TvPressable>
        ) : null}
      </View>

      {!hasItems ? (
        <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
          <Icon name="shirt-outline" size={28} color={DS.muted} />
          <Text
            style={{
              color: DS.text2,
              fontSize: 11,
              marginTop: 10,
              textAlign: 'center',
              lineHeight: 16,
              fontFamily: FONT,
            }}>
            Your basket is empty.{'\n'}Tap "+ Add" on a garment to start.
          </Text>
        </View>
      ) : (
        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
          {summary.lines.map(line => {
            const extras = summary.extraLines.filter(e => e.itemId === line.itemId);
            return (
              <TvPressable
                key={line.itemId}
                onPress={() => onCustomize(line.itemId)}
                label={`Customize ${line.name ?? 'item'}`}
                restBorderColor={DS.borderSoft}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 8,
                  marginBottom: 7,
                  borderRadius: DS.radiusSm,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <GarmentPhoto name={line.name} size={34} glyphColor={DS.champagne} />
                  <View style={{flex: 1, marginLeft: 10}}>
                    <Text numberOfLines={1} style={{color: DS.text, fontSize: 12, fontFamily: FONT}}>
                      {line.name ?? 'Item'}
                    </Text>
                    <Text style={{color: DS.muted, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                      {line.qty} × {formatRupees(line.unitRate)} ·{' '}
                      {serviceTypeLabel(line.serviceType)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 12,
                      fontWeight: '600',
                      marginRight: 8,
                      fontFamily: FONT,
                    }}>
                    {formatRupees(line.amount)}
                  </Text>
                  <TvPressable
                    onPress={() => vm.removeItem(line.itemId)}
                    label={`Remove ${line.name ?? 'item'}`}
                    style={{borderRadius: 8, padding: 3}}>
                    <Icon name="close" size={14} color={DS.muted} />
                  </TvPressable>
                </View>

                {extras.map(extra => (
                  <View
                    key={extra.serviceType}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 4,
                      paddingLeft: 40,
                    }}>
                    <ServiceMark serviceType={extra.serviceType} size={11} color={DS.muted} />
                    <Text style={{flex: 1, color: DS.muted, fontSize: 10, marginLeft: 6, fontFamily: FONT}}>
                      {serviceTypeLabel(extra.serviceType)} ({extra.qty} ×{' '}
                      {formatRupees(extra.unitRate)})
                    </Text>
                    <Text style={{color: DS.text2, fontSize: 10, marginRight: 25, fontFamily: FONT}}>
                      {formatRupees(extra.amount)}
                    </Text>
                  </View>
                ))}
              </TvPressable>
            );
          })}
        </ScrollView>
      )}

      {hasItems ? (
        <View style={{marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: DS.divider}}>
          <BreakdownRow label="Subtotal" value={formatRupees(summary.subTotal)} />
          {summary.extrasTotal > 0 ? (
            <BreakdownRow label="Additional Services" value={formatRupees(summary.extrasTotal)} />
          ) : null}
          {summary.taxPercentage > 0 ? (
            <BreakdownRow
              label={`Taxes & Charges (${summary.taxPercentage}%)`}
              value={formatRupees(summary.taxAmount)}
            />
          ) : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: DS.divider,
            }}>
            <Text
              style={{
                color: DS.text,
                fontSize: 12,
                fontWeight: '700',
                letterSpacing: 0.6,
                fontFamily: FONT,
              }}>
              TOTAL
            </Text>
            <Text style={{color: DS.gold, fontSize: 18, fontWeight: '700', fontFamily: FONT}}>
              {formatRupees(summary.totalAmount)}
            </Text>
          </View>
        </View>
      ) : null}
    </GlassPanel>
  );
}

/* ── Right column: pickup & delivery ── */
function SchedulePane({
  vm,
  onClose,
}: {
  vm: ReturnType<typeof useLaundryViewModel>;
  onClose: () => void;
}) {
  const schedule = pickupSchedule(vm.isExpress);
  return (
    <GlassPanel style={{flex: 1, padding: 14}}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <TvBackButton onPress={onClose} size={36} />
        <Text
          style={{
            flex: 1,
            color: DS.text,
            fontSize: 13,
            fontWeight: '700',
            letterSpacing: 1,
            marginLeft: 12,
            fontFamily: FONT,
          }}>
          PICKUP & DELIVERY
        </Text>
      </View>

      <ScheduleRow icon="basket-outline" label="Pickup Time" value={schedule.pickup} />
      <ScheduleRow icon="cube-outline" label="Delivery Time" value={schedule.delivery} />

      {/* Express is a real field on the order — the one thing on this panel the
          guest can actually change. */}
      <TvPressable
        onPress={() => vm.setIsExpress(!vm.isExpress)}
        label={vm.isExpress ? 'Turn express service off' : 'Turn express service on'}
        restBorderColor={vm.isExpress ? 'rgba(212,180,131,0.55)' : DS.borderSoft}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 14,
          paddingHorizontal: 12,
          paddingVertical: 11,
          borderRadius: DS.radiusSm,
          backgroundColor: vm.isExpress ? 'rgba(212,180,131,0.14)' : 'rgba(255,255,255,0.06)',
        }}>
        <Icon name="flash-outline" size={18} color={vm.isExpress ? DS.gold : DS.champagne} />
        <View style={{flex: 1, marginLeft: 10}}>
          <Text style={{color: DS.text, fontSize: 12, fontFamily: FONT}}>Express service</Text>
          <Text style={{color: DS.muted, fontSize: 9, marginTop: 1, fontFamily: FONT}}>
            Ask housekeeping to prioritise this order
          </Text>
        </View>
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 1.5,
            borderColor: vm.isExpress ? DS.gold : 'rgba(255,255,255,0.45)',
            backgroundColor: vm.isExpress ? DS.gold : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {vm.isExpress ? <Icon name="checkmark" size={14} color={DS.dark} /> : null}
        </View>
      </TvPressable>

      <Text style={{color: DS.text2, fontSize: 10, lineHeight: 15, marginTop: 14, fontFamily: FONT}}>
        Housekeeping collects on the next round. You will be notified once your laundry is collected
        and delivered.
      </Text>

      <View style={{flex: 1}} />

      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 12}}>
        <Icon name="receipt-outline" size={16} color={DS.champagne} />
        <Text style={{flex: 1, color: DS.muted, fontSize: 10, marginLeft: 10, lineHeight: 15, fontFamily: FONT}}>
          Charges are added to your room bill and settled at checkout.
        </Text>
      </View>
    </GlassPanel>
  );
}

function ScheduleRow({icon, label, value}: {icon: string; label: string; value: string}) {
  return (
    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 14}}>
      <Icon name={icon} size={18} color={DS.champagne} />
      <Text style={{flex: 1, color: DS.text2, fontSize: 11, marginLeft: 10, fontFamily: FONT}}>
        {label}
      </Text>
      <Text style={{color: DS.text, fontSize: 11, fontWeight: '500', fontFamily: FONT}}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The standard housekeeping window, stated as policy rather than fetched: the
 * order payload carries no schedule, only `isExpress`. Collection is the next
 * 10:00 AM round; standard laundry returns the following morning, express the
 * same evening. Nothing is presented as a confirmed slot — the panel's own note
 * says the guest is told when it is actually collected.
 */
export function pickupSchedule(isExpress: boolean): {pickup: string; delivery: string} {
  const now = new Date();
  const beforeRound = now.getHours() < 10;
  const pickup = `${beforeRound ? 'Today' : 'Tomorrow'}, 10:00 AM`;
  if (isExpress) {
    return {pickup, delivery: beforeRound ? 'Today, 8:00 PM' : 'Tomorrow, 8:00 PM'};
  }
  return {pickup, delivery: beforeRound ? 'Tomorrow, 10:00 AM' : 'In two days, 10:00 AM'};
}

function FootNote({icon, children}: {icon: string; children: string}) {
  return (
    <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14}}>
      <Icon name={icon} size={19} color={DS.champagne} />
      <Text style={{flex: 1, color: DS.text2, fontSize: 10, lineHeight: 15, marginLeft: 10, fontFamily: FONT}}>
        {children}
      </Text>
    </View>
  );
}

export function TvLaundryScreen({navigation}: Props) {
  const vm = useLaundryViewModel();
  const rootNavigation = useNavigation();
  const [pane, setPane] = useState<RightPane>({kind: 'basket'});
  /**
   * Garments the hotel actually prices. A rate list can come back full of
   * items whose rates are empty or still unpriced (a price list mid-setup),
   * and those cannot be quoted or ordered — so they drive the empty state too,
   * not just the grid, or the screen renders an blank shelf under a heading.
   */
  const {items, baseRateFor} = vm;
  const priceable = useMemo(
    () => items.filter(item => baseRateFor(item)),
    [items, baseRateFor],
  );
  /**
   * The garment's line as it was when Customize opened, so CANCEL can put it
   * back — including removing a garment that "+ ADD" had just created.
   */
  const [snapshot, setSnapshot] = useState<LaundryBasketLine | undefined>(undefined);

  const customizing = useMemo(
    () => (pane.kind === 'customize' ? vm.items.find(i => i._id === pane.itemId) : undefined),
    [pane, vm.items],
  );

  const openCustomize = (item: LaundryItem) => {
    setSnapshot(vm.basket[item._id]);
    setPane({kind: 'customize', itemId: item._id});
  };

  const onAdd = (item: LaundryItem) => {
    setSnapshot(undefined); // nothing to restore: CANCEL should undo the add
    vm.addItem(item);
    setPane({kind: 'customize', itemId: item._id});
  };

  const closeCustomize = () => {
    setSnapshot(undefined);
    setPane({kind: 'basket'});
  };

  const cancelCustomize = () => {
    if (pane.kind === 'customize') {
      vm.restoreLine(pane.itemId, snapshot);
    }
    closeCustomize();
  };

  const onClearAll = async () => {
    const confirmed = await dialog.confirm({
      title: 'Clear your laundry basket?',
      message: 'Every garment and treatment you picked will be removed.',
      confirmLabel: 'Clear All',
      cancelLabel: 'Keep Items',
      destructive: true,
    });
    if (confirmed) {
      vm.clearBasket();
    }
  };

  // A garment removed while its panel is open (qty stepped to 0) has nothing
  // left to customise — fall back to the basket instead of an empty panel.
  const rightPane =
    pane.kind === 'customize' && customizing && vm.basket[customizing._id] ? (
      <CustomizePane
        item={customizing}
        vm={vm}
        onDone={closeCustomize}
        onCancel={cancelCustomize}
      />
    ) : pane.kind === 'schedule' ? (
      <SchedulePane vm={vm} onClose={() => setPane({kind: 'basket'})} />
    ) : (
      <BasketPane
        vm={vm}
        onClearAll={onClearAll}
        onCustomize={itemId => {
          const item = vm.items.find(i => i._id === itemId);
          if (item) {
            openCustomize(item);
          }
        }}
      />
    );

  const pieceCount = vm.summary.pieceCount;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: the rate list ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            {/* Header */}
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TvBackButton onPress={() => navigation.goBack()} size={40} />
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  marginLeft: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(212,180,131,0.55)',
                  backgroundColor: 'rgba(212,180,131,0.14)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {/* The drawn washer, not Ionicons' droplet — the droplet is
                    already this feature's mark for the Wash SERVICE, and both
                    are on screen at once in this split layout. */}
                <ServiceGlyph name="washer" size={26} color={DS.gold} />
              </View>
              <View style={{marginLeft: 14, flex: 1}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 19,
                    fontWeight: '500',
                    letterSpacing: 1.2,
                    fontFamily: FONT,
                  }}>
                  LAUNDRY
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 2, fontFamily: FONT}}>
                  Professional care for your clothes
                </Text>
              </View>
              <TvPressable
                onPress={() => navigation.navigate('LaundryOrders')}
                label="Order history"
                restBorderColor={DS.border}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  height: 36,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}>
                <Icon name="time-outline" size={15} color={DS.text} />
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.6,
                    marginLeft: 8,
                    fontFamily: FONT,
                  }}>
                  ORDER HISTORY
                </Text>
              </TvPressable>
            </View>

            {vm.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
                <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                  Loading the rate list…
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
                <TvPressable
                  onPress={() => vm.refetch()}
                  label="Try again"
                  restBorderColor="#E5CFA5"
                  style={{
                    height: 38,
                    justifyContent: 'center',
                    borderRadius: 11,
                    paddingHorizontal: 22,
                    backgroundColor: DS.gold,
                    marginTop: 16,
                  }}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    TRY AGAIN
                  </Text>
                </TvPressable>
              </View>
            ) : priceable.length === 0 ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="shirt-outline" size={32} color={DS.muted} />
                <Text style={{color: DS.text, fontSize: 14, marginTop: 12, fontFamily: FONT}}>
                  Laundry service is not available right now
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 4, fontFamily: FONT}}>
                  Please ask the front desk for assistance.
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={{flex: 1, marginTop: 16}} showsVerticalScrollIndicator={false}>
                  {/* Section tab — the Figma's gold-underlined label */}
                  <View style={{alignSelf: 'flex-start', marginBottom: 12}}>
                    <Text
                      style={{
                        color: DS.text,
                        fontSize: 12,
                        fontWeight: '600',
                        letterSpacing: 1.2,
                        paddingBottom: 6,
                        fontFamily: FONT,
                      }}>
                      CLOTHING ITEMS
                    </Text>
                    <View style={{height: 2, borderRadius: 1, backgroundColor: DS.gold}} />
                  </View>

                  <View style={{flexDirection: 'row', flexWrap: 'wrap', columnGap: DS.gap}}>
                    {priceable.map(item => {
                      // Non-null by construction: `priceable` is exactly the
                      // items `baseRateFor` can quote.
                      const base = vm.baseRateFor(item)!;
                      const line = vm.basket[item._id];
                      return (
                        <GarmentCard
                          key={item._id}
                          item={item}
                          rate={base.rate}
                          line={line}
                          onAdd={() => onAdd(item)}
                          onIncrement={() => vm.setQty(item._id, (line?.qty ?? 0) + 1)}
                          onDecrement={() => vm.setQty(item._id, (line?.qty ?? 0) - 1)}
                          onCustomize={() => openCustomize(item)}
                        />
                      );
                    })}
                  </View>

                  {/* ── Footnotes ── */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginTop: 6,
                      paddingVertical: 12,
                      borderRadius: DS.radius,
                      borderWidth: 1,
                      borderColor: DS.borderSoft,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}>
                    <FootNote icon="information-circle-outline">
                      Each item can have different services. Tap "+ Add" on any item to customize.
                    </FootNote>
                    <View style={{width: 1, alignSelf: 'stretch', backgroundColor: DS.divider}} />
                    <FootNote icon="receipt-outline">
                      Charges are added to your room bill and settled at checkout.
                    </FootNote>
                  </View>
                </ScrollView>

                {/* ── Bottom bar ── */}
                <View style={{flexDirection: 'row', gap: DS.gap, marginTop: 12}}>
                  <TvPressable
                    onPress={() =>
                      setPane(prev => (prev.kind === 'schedule' ? {kind: 'basket'} : {kind: 'schedule'}))
                    }
                    label="Pickup and delivery"
                    restBorderColor={pane.kind === 'schedule' ? 'rgba(212,180,131,0.55)' : DS.border}
                    style={{
                      width: 260,
                      height: 48,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 11,
                      backgroundColor:
                        pane.kind === 'schedule'
                          ? 'rgba(212,180,131,0.16)'
                          : 'rgba(255,255,255,0.08)',
                    }}>
                    <Icon name="cube-outline" size={17} color={DS.text} />
                    <Text
                      style={{
                        color: DS.text,
                        fontSize: 12,
                        fontWeight: '600',
                        letterSpacing: 0.8,
                        marginLeft: 10,
                        fontFamily: FONT,
                      }}>
                      PICKUP & DELIVERY
                    </Text>
                  </TvPressable>

                  <TvPressable
                    onPress={() => (pieceCount > 0 ? navigation.navigate('LaundryCart') : undefined)}
                    label={
                      pieceCount > 0
                        ? `Proceed to cart, ${pieceCount} pieces`
                        : 'Add a garment first'
                    }
                    restBorderColor="#E5CFA5"
                    style={{
                      flex: 1,
                      height: 48,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 11,
                      backgroundColor: DS.gold,
                      opacity: pieceCount > 0 ? 1 : 0.45,
                    }}>
                    <Text
                      style={{
                        color: DS.text,
                        fontSize: 13,
                        fontWeight: '700',
                        letterSpacing: 1,
                        fontFamily: FONT,
                      }}>
                      PROCEED TO CART{pieceCount > 0 ? ` (${pieceCount})` : ''}
                    </Text>
                    <Icon name="arrow-forward" size={16} color={DS.text} style={{marginLeft: 10}} />
                  </TvPressable>
                </View>
              </>
            )}
          </GlassPanel>

          {/* ── Right: basket / customize / schedule, then assistance ── */}
          <View style={{width: 336}}>
            {rightPane}

            <GlassPanel style={{marginTop: DS.gap, padding: 12}}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={{flex: 1, paddingRight: 10}}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 11,
                      fontWeight: '600',
                      letterSpacing: 0.6,
                      fontFamily: FONT,
                    }}>
                    NEED ASSISTANCE?
                  </Text>
                  <Text style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
                    Press OK to chat with Front Desk
                  </Text>
                </View>
                <TvPressable
                  onPress={() =>
                    (rootNavigation as unknown as {navigate: (n: string) => void}).navigate(
                      'ReceptionTab',
                    )
                  }
                  label="Chat with front desk"
                  restBorderColor="rgba(212,180,131,0.55)"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(212,180,131,0.16)',
                  }}>
                  <Icon name="headset-outline" size={20} color={DS.gold} />
                </TvPressable>
              </View>
            </GlassPanel>
          </View>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
