import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Card, EmptyState, ErrorState, Header, Loader, RefreshButton} from '../../components';
import {useFolioViewModel} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {IS_TV} from '../../utils/responsive';
import {formatDate, formatRupees} from '../../utils';
import {CHARGE_TYPE} from '../../models/folio.model';
import type {FolioCharge, FolioPayment} from '../../models/folio.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'ViewBill'>;

/**
 * View Bill — read-only guest folio for the CURRENT stay (spec: "must match
 * web app"). Summary first (Total Charges / Total Paid / BALANCE DUE, plus
 * Overpaid only when > 0), then charges, then payments.
 *
 * Sign convention: refunds (charge type 4 — detected by NUMBER, never label)
 * and payments render green with a minus; their amounts arrive positive.
 * No pay button — settlement happens at reception.
 *
 * Rows are focusable no-ops so the D-pad can walk (and thereby scroll) a long
 * bill on TV; on the phone they're inert.
 */

function BillRow({
  title,
  subtitle,
  amount,
  negative = false,
}: {
  title: string;
  subtitle: string;
  amount: number;
  negative?: boolean;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  return (
    <Pressable
      focusable
      onFocus={onFocus}
      onBlur={onBlur}
      accessibilityLabel={`${title}, ${negative ? 'minus ' : ''}${formatRupees(amount)}`}
      className="flex-row items-center justify-between"
      style={{
        paddingVertical: IS_TV ? 12 : 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : 'transparent',
      }}>
      <View style={{flex: 1, paddingRight: 10}}>
        <Text
          numberOfLines={1}
          className="font-medium text-content"
          style={{fontSize: IS_TV ? 16 : 14}}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            className="text-content-tertiary"
            style={{fontSize: IS_TV ? 12 : 11, marginTop: 2}}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text
        className="font-semibold"
        style={{
          fontSize: IS_TV ? 16 : 14,
          color: negative ? theme.colors.success : theme.colors.text,
        }}>
        {negative ? '-' : ''}
        {formatRupees(amount)}
      </Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  negative = false,
  bold = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  bold?: boolean;
}) {
  const {theme} = useTheme();
  return (
    <View className="flex-row items-center justify-between" style={{paddingVertical: 6}}>
      <Text
        className={bold ? 'font-bold text-content' : 'text-content-secondary'}
        style={{fontSize: bold ? (IS_TV ? 18 : 15) : IS_TV ? 15 : 13}}>
        {label}
      </Text>
      <Text
        className="font-semibold"
        style={{
          fontSize: bold ? (IS_TV ? 24 : 20) : IS_TV ? 15 : 13,
          color: negative ? theme.colors.success : bold ? theme.colors.primary : theme.colors.text,
        }}>
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({children}: {children: string}) {
  return (
    <Text
      className="font-bold text-content"
      style={{fontSize: IS_TV ? 17 : 15, marginTop: 18, marginBottom: 8}}>
      {children}
    </Text>
  );
}

export function ViewBillScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useFolioViewModel();

  const headerRight =
    !vm.isLoading && !vm.error ? (
      <RefreshButton
        onPress={() => vm.refetch()}
        busy={vm.isRefetching}
        accessibilityLabel="Refresh bill"
      />
    ) : undefined;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Your Bill" onBack={() => navigation.goBack()} right={headerRight} />

      {vm.isLoading ? (
        <Loader label="Loading your bill…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={() => vm.refetch()} />
      ) : vm.isEmpty ? (
        <EmptyState
          icon="receipt-outline"
          title="No bill yet"
          message="Charges from your stay will appear here."
        />
      ) : (
        <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 28}}>
          {/* ── Summary ── */}
          <Card>
            <SummaryRow label="Total Charges" value={formatRupees(vm.folio!.totalCharges)} />
            <SummaryRow
              label="Total Paid"
              value={`-${formatRupees(vm.folio!.totalPaid)}`}
              negative
            />
            <View className="my-2 h-px bg-border" />
            <SummaryRow label="Balance Due" value={formatRupees(vm.folio!.balanceDue)} bold />
            {vm.folio!.overpaidAmount > 0 ? (
              <SummaryRow
                label="Overpaid"
                value={formatRupees(vm.folio!.overpaidAmount)}
                negative
              />
            ) : null}
          </Card>

          {/* ── Charges ── */}
          {vm.charges.length > 0 ? (
            <>
              <SectionTitle>Charges</SectionTitle>
              <Card>
                {vm.charges.map((charge: FolioCharge, index) => (
                  <View key={charge._id}>
                    {index > 0 ? <View className="h-px bg-border" /> : null}
                    <BillRow
                      title={charge.label}
                      subtitle={[
                        charge.quantity > 1 ? `Qty ${charge.quantity}` : null,
                        formatDate(charge.createdAt),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      amount={charge.total}
                      negative={charge.type === CHARGE_TYPE.REFUND}
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {/* ── Payments ── */}
          {vm.payments.length > 0 ? (
            <>
              <SectionTitle>Payments</SectionTitle>
              <Card>
                {vm.payments.map((payment: FolioPayment, index) => (
                  <View key={payment._id}>
                    {index > 0 ? <View className="h-px bg-border" /> : null}
                    <BillRow
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
                    />
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          {/* ── Footer ── */}
          <View className="mt-6 flex-row items-center justify-center" style={{gap: 6}}>
            <Icon name="information-circle-outline" size={14} color={theme.colors.muted} />
            <Text
              className="text-content-tertiary"
              style={{fontSize: IS_TV ? 13 : 11, textAlign: 'center'}}>
              Please settle your bill at the reception desk during checkout.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
