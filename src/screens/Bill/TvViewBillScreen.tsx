import React from 'react';
import {ActivityIndicator, ScrollView, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  CenterState,
  DS,
  FONT,
  GlassButton,
  GlassPanel,
  GoldButton,
  MetaRow,
  MoneyRow,
  TvPanelHeader,
  TvPressable,
  TvScreen,
} from '../../components/TvGlass';
import {useFolioViewModel} from '../../viewmodels';
import {useAuth} from '../../store/AuthContext';
import {formatDate, formatRupees} from '../../utils';
import {CHARGE_TYPE, FOLIO_STATUS} from '../../models/folio.model';
import {getDisplayName} from '../../models/user.model';
import type {FolioCharge, FolioPayment} from '../../models/folio.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ViewBill'>;

/**
 * View Bill (TV) — the ten-foot folio, in the dashboard's glass.
 *
 * Same data and the same sign convention as the phone screen
 * (`ViewBillScreen`): refunds are detected by NUMERIC charge type, payments and
 * refunds read green with a minus, and there is no pay button — settlement
 * happens at reception.
 *
 * The layout is the frame every other TV page uses: stay facts on the left,
 * the ledger in the middle (charges then payments, scrolling INSIDE its panel
 * so the top bar and footer never move), the summary on the right. The guest
 * reaches this from the top bar's VIEW BILL chip on any page.
 */

/* ── Charge vocabulary ──────────────────────────────────────────────────────
   By NUMBER, never by label text — the backend lets the hotel rename a charge,
   so a "Refund" label can sit on a normal charge and vice versa. */
const CHARGE_ICON: Record<number, string> = {
  [CHARGE_TYPE.ROOM]: 'bed-outline',
  [CHARGE_TYPE.FACILITY]: 'barbell-outline',
  [CHARGE_TYPE.FOOD]: 'restaurant-outline',
  [CHARGE_TYPE.REFUND]: 'return-down-back-outline',
  [CHARGE_TYPE.BUFFET]: 'cafe-outline',
  [CHARGE_TYPE.MISC]: 'pricetag-outline',
};

function chargeIcon(type?: number): string {
  return (type != null ? CHARGE_ICON[type] : undefined) ?? 'pricetag-outline';
}

interface FolioTone {
  color: string;
  icon: string;
  label: string;
}

const UNPAID_TONE: FolioTone = {color: DS.gold, icon: 'time-outline', label: 'Payment Pending'};

const FOLIO_TONE: Record<number, FolioTone> = {
  [FOLIO_STATUS.UNPAID]: UNPAID_TONE,
  [FOLIO_STATUS.PARTIALLY_PAID]: {
    color: '#E7C77A',
    icon: 'hourglass-outline',
    label: 'Partially Paid',
  },
  [FOLIO_STATUS.PAID]: {color: DS.good, icon: 'checkmark-circle-outline', label: 'Fully Paid'},
};

/** An unknown status still has to render, so it reads as not yet settled. */
function folioTone(status?: number): FolioTone {
  return (status != null ? FOLIO_TONE[status] : undefined) ?? UNPAID_TONE;
}

/* ── Ledger pieces ── */

function LedgerHead({label, count}: {label: string; count: number}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: DS.divider,
      }}>
      <Text
        style={{
          flex: 1,
          color: DS.muted,
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 1,
          fontFamily: FONT,
        }}>
        {label} ({count})
      </Text>
      <Text
        style={{
          width: 110,
          color: DS.muted,
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 1,
          textAlign: 'right',
          fontFamily: FONT,
        }}>
        AMOUNT
      </Text>
    </View>
  );
}

/**
 * One ledger line. Focusable no-op so the D-pad can walk (and thereby scroll) a
 * long bill — exactly why the phone rows are focusable too.
 */
function LedgerRow({
  icon,
  title,
  subtitle,
  amount,
  negative = false,
  first = false,
}: {
  icon: string;
  title: string;
  subtitle: string;
  amount: number;
  negative?: boolean;
  first?: boolean;
}) {
  return (
    <View
      style={{
        borderTopWidth: first ? 0 : 1,
        borderTopColor: DS.divider,
      }}>
      <TvPressable
        onPress={() => {}}
        label={`${title}, ${negative ? 'minus ' : ''}${formatRupees(amount)}`}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 9,
          paddingHorizontal: 6,
          borderRadius: DS.radiusSm,
        }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: DS.radiusSm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: negative ? 'rgba(143,217,168,0.16)' : 'rgba(255,255,255,0.12)',
          }}>
          <Icon name={icon} size={16} color={negative ? DS.good : DS.text2} />
        </View>
        <View style={{flex: 1, marginLeft: 12, paddingRight: 10}}>
          <Text numberOfLines={1} style={{color: DS.text, fontSize: 13, fontFamily: FONT}}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{color: DS.muted, fontSize: 10, marginTop: 2, fontFamily: FONT}}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Text
          style={{
            width: 110,
            color: negative ? DS.good : DS.text,
            fontSize: 14,
            fontWeight: '600',
            textAlign: 'right',
            fontFamily: FONT,
          }}>
          {negative ? '-' : ''}
          {formatRupees(amount)}
        </Text>
      </TvPressable>
    </View>
  );
}

export function TvViewBillScreen({navigation}: Props) {
  const vm = useFolioViewModel();
  const {user, hotel, session} = useAuth();
  const rootNavigation = useNavigation();
  const toReception = () =>
    (rootNavigation as unknown as {navigate: (n: string) => void}).navigate('ReceptionTab');

  const booking = session?.booking ?? null;
  const tone = folioTone(vm.folio?.folioStatus);
  const hasLedger = !vm.isLoading && !vm.error && !vm.isEmpty;

  return (
    <TvScreen>
      <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
        {/* ── Left: the stay this bill belongs to ── */}
        <View style={{width: 258, marginRight: DS.gap}}>
          <GlassPanel style={{flex: 1, padding: 12}}>
            <TvPanelHeader
              title="Your Bill"
              subtitle="Charges for this stay"
              onBack={() => navigation.goBack()}
            />

            <MetaRow icon="person-outline" label="Guest" value={getDisplayName(user)} />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow
              icon="bed-outline"
              label="Room"
              value={
                booking?.roomData?.roomNumber != null
                  ? String(booking.roomData.roomNumber)
                  : undefined
              }
            />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow
              icon="log-in-outline"
              label="Check-in"
              value={formatDate(booking?.checkInDate)}
            />
            <View style={{height: 1, backgroundColor: DS.divider}} />
            <MetaRow
              icon="log-out-outline"
              label="Check-out"
              value={formatDate(booking?.checkOutDate)}
            />

            <View style={{flex: 1}} />

            {/* Status of the folio as a whole — the one thing a guest glancing
                at the TV from the bed actually wants to know. */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: DS.radiusSm,
                borderWidth: 1,
                borderColor: `${tone.color}55`,
                backgroundColor: `${tone.color}1a`,
              }}>
              <Icon name={tone.icon} size={16} color={tone.color} />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: tone.color,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.8,
                  marginLeft: 8,
                  fontFamily: FONT,
                }}>
                {tone.label.toUpperCase()}
              </Text>
            </View>
          </GlassPanel>

          <GlassButton
            label={vm.isRefetching ? 'Refreshing…' : 'Refresh Bill'}
            icon="refresh"
            onPress={() => void vm.refetch()}
            height={44}
            style={{marginTop: DS.gap, borderRadius: DS.radius}}
          />
        </View>

        {/* ── Middle: the ledger ── */}
        <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
          {vm.isLoading ? (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
              <ActivityIndicator size="large" color={DS.gold} />
              <Text style={{color: DS.text2, fontSize: 12, marginTop: 14, fontFamily: FONT}}>
                Loading your bill…
              </Text>
            </View>
          ) : vm.error ? (
            <CenterState
              icon="alert-circle-outline"
              title="Could not load your bill"
              message={vm.error}>
              <GoldButton
                label="Try Again"
                icon="refresh"
                onPress={() => void vm.refetch()}
                hasTVPreferredFocus
                style={{marginTop: 18, paddingHorizontal: 24}}
              />
            </CenterState>
          ) : vm.isEmpty ? (
            <CenterState
              icon="receipt-outline"
              title="No bill yet"
              message="Charges from your stay will appear here as you use the hotel's services."
            />
          ) : (
            <>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                <Text
                  style={{
                    flex: 1,
                    color: DS.text,
                    fontSize: 16,
                    fontWeight: '600',
                    letterSpacing: 1,
                    fontFamily: FONT,
                  }}>
                  BILL DETAILS
                </Text>
                <Text style={{color: DS.muted, fontSize: 9, letterSpacing: 1, fontFamily: FONT}}>
                  {hotel?.name ? hotel.name.toUpperCase() : 'YOUR STAY'}
                </Text>
              </View>

              <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                {vm.charges.length > 0 ? (
                  <>
                    <LedgerHead label="CHARGES" count={vm.charges.length} />
                    {vm.charges.map((charge: FolioCharge, index) => (
                      <LedgerRow
                        key={charge._id}
                        icon={chargeIcon(charge.type)}
                        title={charge.label}
                        subtitle={[
                          charge.quantity > 1 ? `Qty ${charge.quantity}` : null,
                          formatDate(charge.createdAt),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        amount={charge.total}
                        negative={charge.type === CHARGE_TYPE.REFUND}
                        first={index === 0}
                      />
                    ))}
                  </>
                ) : null}

                {vm.payments.length > 0 ? (
                  <View style={{marginTop: vm.charges.length > 0 ? 20 : 0}}>
                    <LedgerHead label="PAYMENTS" count={vm.payments.length} />
                    {vm.payments.map((payment: FolioPayment, index) => (
                      <LedgerRow
                        key={payment._id}
                        icon="card-outline"
                        title={payment.methodLabel || 'Payment'}
                        subtitle={[
                          payment.channelLabel,
                          payment.invoiceNumber,
                          formatDate(payment.paidAt),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                        amount={payment.amount}
                        negative
                        first={index === 0}
                      />
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            </>
          )}
        </GlassPanel>

        {/* ── Right: what it comes to ── */}
        <GlassPanel style={{width: 300, padding: 16}}>
          <Text
            style={{
              color: DS.text,
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: 1,
              marginBottom: 12,
              fontFamily: FONT,
            }}>
            BILL SUMMARY
          </Text>

          <MoneyRow label="Total Charges" value={formatRupees(vm.folio?.totalCharges)} />
          <MoneyRow
            label="Total Paid"
            value={`-${formatRupees(vm.folio?.totalPaid)}`}
            positive
          />
          <View style={{height: 1, backgroundColor: DS.divider, marginVertical: 10}} />
          <MoneyRow label="Balance Due" value={formatRupees(vm.folio?.balanceDue)} total />
          {(vm.folio?.overpaidAmount ?? 0) > 0 ? (
            <MoneyRow
              label="Overpaid"
              value={formatRupees(vm.folio?.overpaidAmount)}
              positive
            />
          ) : null}

          {hasLedger ? (
            <Text
              style={{
                color: DS.muted,
                fontSize: 10,
                lineHeight: 15,
                marginTop: 14,
                fontFamily: FONT,
              }}>
              {vm.charges.length} charge{vm.charges.length === 1 ? '' : 's'} ·{' '}
              {vm.payments.length} payment{vm.payments.length === 1 ? '' : 's'} on this folio.
            </Text>
          ) : null}

          <View style={{flex: 1}} />

          {/* No pay button on purpose: the folio is settled at the desk, and a
              card form cannot be filled in with a remote. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 11,
              borderRadius: DS.radiusSm,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}>
            <Icon name="information-circle-outline" size={15} color={DS.gold} />
            <Text
              style={{
                flex: 1,
                color: DS.text2,
                fontSize: 10,
                lineHeight: 15,
                marginLeft: 8,
                fontFamily: FONT,
              }}>
              Please settle your bill at the reception desk during checkout.
            </Text>
          </View>

          <GlassButton
            label="Ask Reception"
            icon="headset-outline"
            onPress={toReception}
            height={42}
            style={{marginTop: DS.gap}}
          />
        </GlassPanel>
      </View>
    </TvScreen>
  );
}
