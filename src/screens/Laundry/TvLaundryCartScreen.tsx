import React from 'react';
import {ActivityIndicator, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {dialog, toast} from '../../components';
import {
  DS,
  FONT,
  GLASS_BLUR,
  GlassPanel,
  TvBackButton,
  TvBackdrop,
  TvFooter,
  TvPressable,
  TvTopBar,
} from '../../components/TvGlass';
import {useLaundryViewModel} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {formatRupees} from '../../utils';
import {serviceTypeLabel} from '../../constants/laundry';
import {getApiErrorMessage} from '../../utils/errorHandler';
import {ServiceGlyph, laundryServiceIcon} from './components/GarmentIcons';
import {GarmentPhoto} from './components/GarmentImages';
import {pickupSchedule} from './TvLaundryScreen';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'LaundryCart'>;

/**
 * Laundry cart (TV) — where "PROCEED TO CART" lands.
 *
 * The rate-list frame is for choosing; this is for confirming: every garment
 * with the treatments picked for it, the note to housekeeping, express, the
 * collection window, and the one button that actually places the request.
 *
 * It exists because the client's frame promises a cart. Submitting straight
 * from the grid would mean a remote's OK button placing a real order one press
 * after a guest wandered onto the CTA — the ten-foot equivalent of a misclick.
 */

function ServiceMark({serviceType, size = 12, color}: {serviceType: string; size?: number; color: string}) {
  const mark = laundryServiceIcon(serviceType, serviceTypeLabel(serviceType));
  return mark.drawn ? (
    <ServiceGlyph name={mark.drawn} size={size + 3} color={color} />
  ) : (
    <Icon name={mark.ionicon ?? 'sparkles-outline'} size={size} color={color} />
  );
}

function SummaryRow({label, value, total = false}: {label: string; value: string; total?: boolean}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: total ? 2 : 4,
      }}>
      <Text
        style={{
          color: total ? DS.text : DS.text2,
          fontSize: total ? 13 : 11,
          fontWeight: total ? '700' : '400',
          letterSpacing: total ? 0.6 : 0,
          fontFamily: FONT,
        }}>
        {label}
      </Text>
      <Text
        style={{
          color: total ? DS.gold : DS.text,
          fontSize: total ? 20 : 12,
          fontWeight: total ? '700' : '500',
          fontFamily: FONT,
        }}>
        {value}
      </Text>
    </View>
  );
}

export function TvLaundryCartScreen({navigation}: Props) {
  const vm = useLaundryViewModel();
  const notesFocus = useTVFocus();
  const schedule = pickupSchedule(vm.isExpress);
  const {summary} = vm;
  const hasItems = summary.lines.length > 0;

  const goBackToList = () =>
    navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Laundry');

  const onSubmit = () => {
    vm.submit()
      .then(() => {
        toast.success('Your laundry pickup has been requested.');
        /**
         * The basket is empty by now, so Back must not return to this screen —
         * but Dashboard has to stay underneath. This is the HOME stack, whose
         * root is Dashboard; dropping it leaves the guest one Back press from
         * exiting the app with no way back to the room controls. (The food cart
         * does the same reset safely because ITS stack is rooted at Food.)
         */
        navigation.reset({
          index: 2,
          routes: [{name: 'Dashboard'}, {name: 'Laundry'}, {name: 'LaundryOrders'}],
        });
      })
      .catch(error =>
        toast.error(getApiErrorMessage(error, 'Could not place your laundry request.')),
      );
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
      goBackToList();
    }
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: every garment, with its treatments ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 14}}>
              <TvBackButton onPress={goBackToList} size={40} />
              <View style={{flex: 1, marginLeft: 14}}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 17,
                    fontWeight: '600',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  YOUR LAUNDRY
                </Text>
                <Text style={{color: DS.text2, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                  Review your items before requesting a pickup
                </Text>
              </View>
              {hasItems ? (
                <TvPressable
                  onPress={onClearAll}
                  label="Clear all"
                  restBorderColor={DS.border}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 34,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  }}>
                  <Icon name="trash-outline" size={14} color={DS.text} />
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 10,
                      fontWeight: '600',
                      letterSpacing: 0.6,
                      marginLeft: 7,
                      fontFamily: FONT,
                    }}>
                    CLEAR ALL
                  </Text>
                </TvPressable>
              ) : null}
            </View>

            {!hasItems ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Icon name="shirt-outline" size={36} color={DS.muted} />
                <Text style={{color: DS.text, fontSize: 15, marginTop: 12, fontFamily: FONT}}>
                  Your laundry basket is empty
                </Text>
                <Text style={{color: DS.text2, fontSize: 11, marginTop: 4, fontFamily: FONT}}>
                  Pick a garment from the rate list to get started.
                </Text>
                <TvPressable
                  onPress={goBackToList}
                  label="Browse the rate list"
                  restBorderColor="#E5CFA5"
                  style={{
                    height: 42,
                    justifyContent: 'center',
                    borderRadius: 11,
                    paddingHorizontal: 24,
                    backgroundColor: DS.gold,
                    marginTop: 18,
                  }}>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 12,
                      fontWeight: '700',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    BROWSE GARMENTS
                  </Text>
                </TvPressable>
              </View>
            ) : (
              <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                {summary.lines.map(line => {
                  const extras = summary.extraLines.filter(e => e.itemId === line.itemId);
                  const lineTotal =
                    line.amount + extras.reduce((sum, extra) => sum + extra.amount, 0);
                  return (
                    <View
                      key={line.itemId}
                      style={{
                        borderRadius: DS.radius,
                        borderWidth: 1,
                        borderColor: DS.borderSoft,
                        backgroundColor: 'rgba(255,255,255,0.055)',
                        padding: 12,
                        marginBottom: DS.gap,
                        ...(GLASS_BLUR ?? {}),
                      }}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <GarmentPhoto name={line.name} size={48} glyphColor={DS.champagne} />
                        <View style={{flex: 1, marginLeft: 12}}>
                          <Text style={{color: DS.text, fontSize: 14, fontWeight: '500', fontFamily: FONT}}>
                            {line.name ?? 'Item'}
                          </Text>
                          <Text style={{color: DS.muted, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
                            {serviceTypeLabel(line.serviceType)} · {line.qty} ×{' '}
                            {formatRupees(line.unitRate)}
                          </Text>
                        </View>

                        {/* Qty stepper, so a last-minute change needs no trip back */}
                        <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 14}}>
                          <TvPressable
                            onPress={() => vm.setQty(line.itemId, line.qty - 1)}
                            label={`One less ${line.name ?? 'item'}`}
                            restBorderColor={DS.border}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(255,255,255,0.14)',
                            }}>
                            <Icon
                              name={line.qty === 1 ? 'trash-outline' : 'remove'}
                              size={13}
                              color={DS.text}
                            />
                          </TvPressable>
                          <Text
                            style={{
                              color: DS.text,
                              fontSize: 14,
                              fontWeight: '600',
                              minWidth: 32,
                              textAlign: 'center',
                              fontFamily: FONT,
                            }}>
                            {line.qty}
                          </Text>
                          <TvPressable
                            onPress={() => vm.setQty(line.itemId, line.qty + 1)}
                            label={`One more ${line.name ?? 'item'}`}
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

                        <Text
                          style={{
                            color: DS.gold,
                            fontSize: 15,
                            fontWeight: '700',
                            minWidth: 84,
                            textAlign: 'right',
                            fontFamily: FONT,
                          }}>
                          {formatRupees(lineTotal)}
                        </Text>
                      </View>

                      {/* Treatments chosen for THIS garment */}
                      {extras.length > 0 ? (
                        <View
                          style={{
                            marginTop: 10,
                            paddingTop: 9,
                            borderTopWidth: 1,
                            borderTopColor: DS.divider,
                          }}>
                          {extras.map(extra => (
                            <View
                              key={extra.serviceType}
                              style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 2}}>
                              <ServiceMark serviceType={extra.serviceType} color={DS.champagne} />
                              <Text
                                style={{
                                  flex: 1,
                                  color: DS.text2,
                                  fontSize: 11,
                                  marginLeft: 8,
                                  fontFamily: FONT,
                                }}>
                                {serviceTypeLabel(extra.serviceType)}
                              </Text>
                              <Text style={{color: DS.muted, fontSize: 10, marginRight: 12, fontFamily: FONT}}>
                                {extra.qty} × {formatRupees(extra.unitRate)}
                              </Text>
                              <Text
                                style={{
                                  color: DS.text,
                                  fontSize: 11,
                                  minWidth: 84,
                                  textAlign: 'right',
                                  fontFamily: FONT,
                                }}>
                                {formatRupees(extra.amount)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                {/* Note to housekeeping — a real field on the order payload */}
                <Text
                  style={{
                    color: DS.muted,
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 1,
                    marginTop: 4,
                    marginBottom: 8,
                    fontFamily: FONT,
                  }}>
                  INSTRUCTIONS FOR HOUSEKEEPING (OPTIONAL)
                </Text>
                <View
                  style={{
                    borderRadius: DS.radiusSm,
                    borderWidth: 2,
                    borderColor: notesFocus.focused ? DS.focus : DS.borderSoft,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}>
                  <TextInput
                    value={vm.notes}
                    onChangeText={vm.setNotes}
                    onFocus={notesFocus.onFocus}
                    onBlur={notesFocus.onBlur}
                    placeholder="e.g. no starch on the shirts, please"
                    placeholderTextColor={DS.muted}
                    multiline
                    textAlignVertical="top"
                    accessibilityLabel="Instructions for housekeeping"
                    style={{minHeight: 54, color: DS.text, fontSize: 12, fontFamily: FONT}}
                  />
                </View>
              </ScrollView>
            )}
          </GlassPanel>

          {/* ── Right: summary + schedule + submit ── */}
          <GlassPanel style={{width: 336, padding: 16}}>
            <Text
              style={{
                color: DS.text,
                fontSize: 14,
                fontWeight: '700',
                letterSpacing: 1,
                marginBottom: 12,
                fontFamily: FONT,
              }}>
              ORDER SUMMARY
            </Text>

            <SummaryRow
              label={`Garments (${summary.pieceCount} ${summary.pieceCount === 1 ? 'piece' : 'pieces'})`}
              value={formatRupees(summary.subTotal)}
            />
            {summary.extrasTotal > 0 ? (
              <SummaryRow label="Additional Services" value={formatRupees(summary.extrasTotal)} />
            ) : null}
            {summary.taxPercentage > 0 ? (
              <SummaryRow
                label={`Taxes & Charges (${summary.taxPercentage}%)`}
                value={formatRupees(summary.taxAmount)}
              />
            ) : null}
            <View style={{height: 1, backgroundColor: DS.divider, marginVertical: 10}} />
            <SummaryRow label="TOTAL" value={formatRupees(summary.totalAmount)} total />
            <Text style={{color: DS.muted, fontSize: 9, marginTop: 4, fontFamily: FONT}}>
              Estimate — the final amount is confirmed when your laundry is counted.
            </Text>

            {/* Express */}
            <TvPressable
              onPress={() => vm.setIsExpress(!vm.isExpress)}
              label={vm.isExpress ? 'Turn express service off' : 'Turn express service on'}
              restBorderColor={vm.isExpress ? 'rgba(212,180,131,0.55)' : DS.borderSoft}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 16,
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

            {/* Collection window */}
            <View
              style={{
                marginTop: 12,
                paddingHorizontal: 12,
                paddingVertical: 11,
                borderRadius: DS.radiusSm,
                borderWidth: 1,
                borderColor: DS.borderSoft,
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon name="basket-outline" size={15} color={DS.champagne} />
                <Text style={{flex: 1, color: DS.text2, fontSize: 11, marginLeft: 9, fontFamily: FONT}}>
                  Pickup
                </Text>
                <Text style={{color: DS.text, fontSize: 11, fontWeight: '500', fontFamily: FONT}}>
                  {schedule.pickup}
                </Text>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 8}}>
                <Icon name="cube-outline" size={15} color={DS.champagne} />
                <Text style={{flex: 1, color: DS.text2, fontSize: 11, marginLeft: 9, fontFamily: FONT}}>
                  Delivery
                </Text>
                <Text style={{color: DS.text, fontSize: 11, fontWeight: '500', fontFamily: FONT}}>
                  {schedule.delivery}
                </Text>
              </View>
            </View>

            <View style={{flex: 1}} />

            <TvPressable
              onPress={hasItems && !vm.isSubmitting ? onSubmit : () => {}}
              label="Request pickup"
              restBorderColor="#E5CFA5"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 50,
                marginTop: 14,
                borderRadius: 11,
                backgroundColor: DS.gold,
                opacity: hasItems && !vm.isSubmitting ? 1 : 0.45,
              }}>
              {vm.isSubmitting ? (
                <ActivityIndicator size="small" color={DS.text} />
              ) : (
                <>
                  <Text
                    style={{
                      color: DS.text,
                      fontSize: 13,
                      fontWeight: '700',
                      letterSpacing: 1,
                      fontFamily: FONT,
                    }}>
                    REQUEST PICKUP
                  </Text>
                  <Icon name="arrow-forward" size={16} color={DS.text} style={{marginLeft: 10}} />
                </>
              )}
            </TvPressable>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              }}>
              <Icon name="receipt-outline" size={11} color={DS.muted} />
              <Text style={{color: DS.muted, fontSize: 10, marginLeft: 6, fontFamily: FONT}}>
                Billed to your room · settled at checkout
              </Text>
            </View>
          </GlassPanel>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
