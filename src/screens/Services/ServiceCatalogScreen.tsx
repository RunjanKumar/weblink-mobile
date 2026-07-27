import React, {useEffect, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Button, Card, ErrorState, Header, Loader} from '../../components';
import {useServiceCatalogViewModel} from '../../viewmodels';
import {useTVFocus} from '../../hooks/useTVFocus';
import {useTheme} from '../../theme';
import {formatTime12h} from '../../utils/format';
import type {ServiceCategory, ServiceSubCategory} from '../../models/service.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Services'>;

/** Compact request/requested/unavailable pill (D-pad focusable). */
function RequestPill({
  state,
  onPress,
}: {
  state: 'request' | 'requested' | 'booked' | 'unavailable';
  onPress?: () => void;
}) {
  const {theme} = useTheme();
  const {focused, onFocus, onBlur} = useTVFocus();
  const disabled = state === 'booked' || state === 'unavailable';
  const label =
    state === 'requested' ? 'Requested' : state === 'booked' ? 'Requested' : state === 'unavailable' ? 'Unavailable' : 'Request';
  const bg =
    state === 'requested'
      ? theme.colors.primary
      : state === 'booked'
        ? 'rgba(34,197,94,0.15)'
        : 'transparent';
  const fg =
    state === 'requested'
      ? theme.colors.primaryForeground
      : state === 'booked'
        ? theme.colors.success
        : state === 'unavailable'
          ? theme.colors.muted
          : theme.colors.primary;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      focusable={!disabled}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: focused ? theme.colors.focusRing : bg === 'transparent' ? theme.colors.primary : 'transparent',
        opacity: disabled ? 0.6 : 1,
      }}>
      <Text style={{color: fg, fontSize: 13, fontWeight: '600'}}>{label}</Text>
    </Pressable>
  );
}

function SubCategoryRow({
  sub,
  available,
  requested,
  booked,
  onToggle,
}: {
  sub: ServiceSubCategory;
  available: boolean;
  requested: boolean;
  booked: boolean;
  onToggle: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between border-t border-border py-3">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-medium text-content">{sub.name}</Text>
        {sub.description ? (
          <Text className="mt-0.5 text-xs text-content-tertiary" numberOfLines={2}>
            {sub.description}
          </Text>
        ) : null}
        {sub.price != null && sub.price > 0 ? (
          <Text className="mt-1 text-xs font-semibold text-primary">₹ {sub.price}</Text>
        ) : null}
      </View>
      <RequestPill
        state={booked ? 'booked' : !available ? 'unavailable' : requested ? 'requested' : 'request'}
        onPress={onToggle}
      />
    </View>
  );
}

function CategoryAccordion({
  category,
  open,
  onToggleOpen,
  isRequested,
  isAlreadyBooked,
  onToggleRequest,
}: {
  category: ServiceCategory;
  open: boolean;
  onToggleOpen: () => void;
  isRequested: (id: string) => boolean;
  isAlreadyBooked: (id: string) => boolean;
  onToggleRequest: (id: string) => void;
}) {
  const {theme} = useTheme();
  const available = category.isAvailable !== false;
  const window = category.from && category.to
    ? `${formatTime12h(category.from)} – ${formatTime12h(category.to)}`
    : null;
  return (
    <Card className="mb-3">
      <Pressable
        onPress={onToggleOpen}
        focusable
        accessibilityRole="button"
        className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-base font-bold text-content">{category.name}</Text>
          {window ? <Text className="mt-0.5 text-xs text-content-tertiary">{window}</Text> : null}
        </View>
        <Icon
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.textTertiary}
        />
      </Pressable>

      {open
        ? (category.subCategoriesIds ?? []).map(sub => (
            <SubCategoryRow
              key={sub._id}
              sub={sub}
              available={available}
              requested={isRequested(sub._id)}
              booked={isAlreadyBooked(sub._id)}
              onToggle={() => onToggleRequest(sub._id)}
            />
          ))
        : null}
    </Card>
  );
}

export function ServiceCatalogScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useServiceCatalogViewModel();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Open the first category once categories load.
  useEffect(() => {
    if (vm.categories.length > 0) {
      setOpen(prev => (Object.keys(prev).length === 0 ? {[vm.categories[0]!._id]: true} : prev));
    }
  }, [vm.categories]);

  const headerRight = (
    <Pressable
      onPress={() => navigation.navigate('ServiceBooked')}
      focusable
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Request history"
      className="h-10 w-10 items-center justify-center rounded-full">
      <Icon name="time-outline" size={22} color={theme.colors.text} />
    </Pressable>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top']}>
      <Header title="Services" onBack={() => navigation.goBack()} right={headerRight} />

      {vm.isLoading ? (
        <Loader label="Loading services…" />
      ) : vm.error ? (
        <ErrorState message={vm.error} onRetry={vm.refetch} />
      ) : (
        <>
          <ScrollView contentContainerStyle={{paddingHorizontal: 20, paddingBottom: 24}}>
            {vm.categories.length === 0 ? (
              <Text className="mt-10 text-center text-sm text-content-tertiary">
                No services available right now.
              </Text>
            ) : (
              vm.categories.map(cat => (
                <CategoryAccordion
                  key={cat._id}
                  category={cat}
                  open={Boolean(open[cat._id])}
                  onToggleOpen={() => setOpen(prev => ({...prev, [cat._id]: !prev[cat._id]}))}
                  isRequested={vm.isRequested}
                  isAlreadyBooked={vm.isAlreadyBooked}
                  onToggleRequest={vm.toggleRequest}
                />
              ))
            )}
          </ScrollView>

          {vm.hasRequested ? (
            <View
              className="border-t border-border bg-background px-5 pb-6 pt-3"
              style={{backgroundColor: theme.colors.background}}>
              <Button
                label={`Review Request (${vm.count})`}
                onPress={() => navigation.navigate('ServiceReview')}
                fullWidth
              />
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}
