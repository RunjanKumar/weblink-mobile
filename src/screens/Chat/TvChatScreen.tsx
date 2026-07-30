import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Image, Linking, ScrollView, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {toast} from '../../components';
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
  toSource,
} from '../../components/TvGlass';
import {useChatViewModel} from '../../viewmodels/ChatViewModel';
import {useServiceCatalogViewModel} from '../../viewmodels';
import {useAuth} from '../../store/AuthContext';
import {MESSAGE_STATUS} from '../../constants/socket';
import {logger} from '../../services/logger';
import type {ChatMessage} from '../../models/chat.model';
import type {ServiceSubCategory} from '../../models/service.model';
import type {HomeStackParamList} from '../../navigation/types';

import frontDeskImg from '../../assets/tv/helpdesk.jpg';

type Props = NativeStackScreenProps<HomeStackParamList, 'Chat'>;

/**
 * Reception (TV) — the client's Figma frame, built 1:1.
 *
 * The live front-desk conversation on the left, the front-desk card and Quick
 * Services on the right. Everything underneath is the SAME `useChatViewModel`
 * the phone uses — REST history, socket realtime, optimistic send with tempId
 * reconciliation, offline queue — so a guest who starts on their phone and
 * looks up at the TV sees one conversation, not two.
 *
 * This screen IS the Reception tab on TV (see AppNavigator): the phone's
 * intro/"Continue" page has no ten-foot equivalent — a remote should land the
 * guest in the chat, not on a splash they have to click through.
 *
 * Sizes follow the TvGlass unit rule: Figma px ÷ 1.5 (global `zoom: 1.5`).
 */

/** Quick Services rows the Figma shows; six fits the column without scrolling. */
const QUICK_SERVICE_LIMIT = 6;

/* ── Front-desk bell mark (the Figma's avatar glyph) ── */
function BellAvatar({size = 34}: {size?: number}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: 'rgba(212,180,131,0.65)',
        backgroundColor: 'rgba(212,180,131,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name="notifications-outline" size={Math.round(size * 0.5)} color={DS.gold} />
    </View>
  );
}

/** "Today, 18 Jun" · "Yesterday, 17 Jun" · "12 Jun 2024". */
function dateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const short = `${date.getDate()} ${date.toLocaleDateString('en-US', {month: 'short'})}`;
  if (day(date) === day(today)) {
    return `Today, ${short}`;
  }
  if (day(date) === day(yesterday)) {
    return `Yesterday, ${short}`;
  }
  return date.getFullYear() === today.getFullYear() ? short : `${short} ${date.getFullYear()}`;
}

function messageTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true});
}

/* ── Delivery ticks on the guest's own bubbles ── */
function StatusTicks({message}: {message: ChatMessage}) {
  if (message.isFailed) {
    return <Icon name="close-circle" size={12} color={DS.danger} />;
  }
  if (message.isSending) {
    return <Icon name="time-outline" size={12} color={DS.muted} />;
  }
  if (message.messageStatus >= MESSAGE_STATUS.SEEN) {
    return <Icon name="checkmark-done" size={13} color="#9CC7E8" />;
  }
  if (message.messageStatus === MESSAGE_STATUS.DELIVERED) {
    return <Icon name="checkmark-done" size={13} color={DS.muted} />;
  }
  return <Icon name="checkmark" size={13} color={DS.muted} />;
}

/**
 * One message. Focusable even though there is nothing to press: the D-pad
 * cannot scroll a list with no focus targets in it, so walking the bubbles is
 * how a guest reaches older messages (same trick as the bill rows).
 */
function Bubble({message, onRetry}: {message: ChatMessage; onRetry: () => void}) {
  const own = message.isOwn;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: own ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}>
      {!own ? <BellAvatar size={28} /> : null}
      <View style={{maxWidth: '62%', marginLeft: own ? 0 : 10, marginRight: own ? 0 : 10}}>
        <TvPressable
          onPress={message.isFailed ? onRetry : () => {}}
          label={`${own ? 'You' : 'Front desk'}: ${message.text}`}
          restBorderColor={message.isFailed ? 'rgba(242,139,130,0.6)' : DS.borderSoft}
          style={{
            borderRadius: DS.radius,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: message.isFailed
              ? 'rgba(242,139,130,0.16)'
              : own
                ? 'rgba(212,180,131,0.22)'
                : 'rgba(255,255,255,0.10)',
            opacity: message.isSending ? 0.75 : 1,
            ...(GLASS_BLUR ?? {}),
          }}>
          <Text style={{color: DS.text, fontSize: 13, lineHeight: 19, fontFamily: FONT}}>
            {message.text}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: 4,
            }}>
            <Text style={{color: DS.muted, fontSize: 9, marginRight: own ? 5 : 0, fontFamily: FONT}}>
              {messageTime(message.timestamp)}
            </Text>
            {own ? <StatusTicks message={message} /> : null}
          </View>
        </TvPressable>
        {message.isFailed ? (
          <Text
            style={{
              color: DS.danger,
              fontSize: 9,
              marginTop: 3,
              textAlign: 'right',
              fontFamily: FONT,
            }}>
            Not sent — press to retry
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** The centred "Today, 18 Jun" chip between days. */
function DateChip({label}: {label: string}) {
  return (
    <View style={{alignItems: 'center', marginVertical: 10}}>
      <View
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: DS.borderSoft,
          backgroundColor: 'rgba(255,255,255,0.08)',
          paddingHorizontal: 14,
          paddingVertical: 5,
        }}>
        <Text style={{color: DS.text2, fontSize: 10, fontFamily: FONT}}>{label}</Text>
      </View>
    </View>
  );
}

/* ── Right column rows ── */
function SidePanelRow({
  icon,
  title,
  subtitle,
  onPress,
  chevron = true,
  disabled = false,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  chevron?: boolean;
  disabled?: boolean;
}) {
  return (
    <TvPressable
      onPress={disabled ? () => {} : onPress}
      label={subtitle ? `${title}. ${subtitle}` : title}
      restBorderColor={DS.borderSoft}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: DS.radiusSm,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.07)',
        opacity: disabled ? 0.55 : 1,
      }}>
      <Icon name={icon} size={18} color={DS.champagne} />
      <View style={{flex: 1, marginLeft: 12}}>
        <Text numberOfLines={1} style={{color: DS.text, fontSize: 12, fontFamily: FONT}}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{color: DS.muted, fontSize: 9, marginTop: 2, fontFamily: FONT}}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {chevron ? <Icon name="chevron-forward" size={15} color={DS.muted} /> : null}
    </TvPressable>
  );
}

/** Service name → Ionicons glyph, so the live catalog still reads at a glance. */
function serviceIcon(name?: string): string {
  const key = (name ?? '').toLowerCase();
  if (key.includes('housekeep') || key.includes('clean')) return 'sparkles-outline';
  if (key.includes('room service') || key.includes('dining') || key.includes('food'))
    return 'restaurant-outline';
  if (key.includes('maintenance') || key.includes('repair') || key.includes('engineer'))
    return 'construct-outline';
  if (key.includes('laundry') || key.includes('press') || key.includes('iron')) return 'shirt-outline';
  if (key.includes('wake')) return 'alarm-outline';
  if (key.includes('taxi') || key.includes('cab') || key.includes('transport')) return 'car-outline';
  if (key.includes('doctor') || key.includes('medical')) return 'medkit-outline';
  if (key.includes('luggage') || key.includes('bell')) return 'bag-handle-outline';
  if (key.includes('towel') || key.includes('linen')) return 'layers-outline';
  if (key.includes('water') || key.includes('bottle')) return 'water-outline';
  return 'ellipse-outline';
}

export function TvChatScreen({navigation}: Props) {
  // Reception is a TAB ROOT when the guest arrives from the dashboard tile, but
  // a pushed screen when they arrive from the Home stack — only the second case
  // has anywhere to go back to.
  const canGoBack = navigation.canGoBack();
  const vm = useChatViewModel();
  const services = useServiceCatalogViewModel();
  const {hotel} = useAuth();
  const rootNavigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);
  const [atBottom, setAtBottom] = useState(true);

  const rootNavigate = (name: string, params?: object) =>
    (rootNavigation as unknown as {navigate: (n: string, p?: object) => void}).navigate(
      name,
      params,
    );

  /* ── Messages, with a date chip whenever the calendar day changes ── */
  const rows = useMemo(() => {
    const items: ({kind: 'date'; key: string; label: string} | {kind: 'msg'; key: string; message: ChatMessage})[] = [];
    let lastDay: string | null = null;
    vm.messages.forEach(message => {
      const day = message.timestamp ? new Date(message.timestamp).toDateString() : null;
      if (day && day !== lastDay) {
        items.push({kind: 'date', key: `date-${day}`, label: dateLabel(message.timestamp)});
        lastDay = day;
      }
      items.push({
        kind: 'msg',
        key: message.id || message.tempId || `${message.timestamp}-${items.length}`,
        message,
      });
    });
    return items;
  }, [vm.messages]);

  /**
   * Mark incoming messages read as soon as they land.
   *
   * The phone tracks per-row viewability; on a TV the whole conversation panel
   * is on screen with nothing else competing for the guest's attention, so an
   * arriving message IS seen. `markedRef` keeps the socket emit to once per id.
   */
  const markedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    vm.messages.forEach(message => {
      if (
        !message.isOwn &&
        message.id &&
        message.messageStatus < MESSAGE_STATUS.SEEN &&
        !markedRef.current.has(message.id)
      ) {
        markedRef.current.add(message.id);
        vm.markAsRead(message.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.messages, vm.markAsRead]);

  // Follow the conversation only while the guest is already at the bottom —
  // otherwise a reply would yank them away from the history they scrolled to.
  const onContentSizeChange = useCallback(() => {
    if (atBottom) {
      scrollRef.current?.scrollToEnd({animated: false});
    }
  }, [atBottom]);

  const connected = vm.connectionStatus === 'connected';
  const hasText = vm.inputText.trim().length > 0;

  /* ── Quick services: the live catalog, not a hard-coded list ── */
  const quickServices = useMemo(() => {
    const flat: {sub: ServiceSubCategory; categoryName?: string}[] = [];
    for (const category of services.categories) {
      for (const sub of category.subCategoriesIds ?? []) {
        flat.push({sub, categoryName: category.name});
      }
    }
    return flat.slice(0, QUICK_SERVICE_LIMIT);
  }, [services.categories]);

  /**
   * A quick service drops the item into the shared request cart and jumps to
   * Review, where the guest confirms and it is actually booked. It does NOT
   * book silently — a press on a remote is too easy to make by accident.
   */
  const onQuickService = (sub: ServiceSubCategory) => {
    if (services.isAlreadyBooked(sub._id)) {
      toast.info(`${sub.name ?? 'That service'} is already on its way.`);
      return;
    }
    if (!services.isRequested(sub._id)) {
      services.toggleRequest(sub._id);
    }
    // `initial: false` keeps the Services catalog underneath, so Back from the
    // review lands somewhere sensible instead of on an empty stack root.
    rootNavigate('ServicesTab', {screen: 'ServiceReview', initial: false});
  };

  /**
   * "Press to call" — a webOS TV has no dialer, so this only dials where a
   * dialer exists (an Android TV box paired with a phone profile, and the phone
   * build sharing this code path). Everywhere else it surfaces the number so
   * the guest can use the room phone, which is what the row is really for.
   */
  const onCallFrontDesk = async () => {
    const number = hotel?.phoneNumber;
    if (!number) {
      toast.info('No front desk number is listed — send a message instead.');
      return;
    }
    try {
      const url = `tel:${number}`;
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    } catch (error) {
      logger.warn('reception', 'Failed to open dialer', error);
    }
    toast.info(`Dial ${number} from your room phone.`, {duration: 5000});
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: DS.pageBg}} edges={['top']}>
      <TvBackdrop />

      <View style={{flex: 1, paddingHorizontal: DS.margin, paddingTop: DS.margin, paddingBottom: 14}}>
        <TvTopBar />

        <View style={{flex: 1, flexDirection: 'row', marginTop: 16}}>
          {/* ── Left: the conversation ── */}
          <GlassPanel style={{flex: 1, marginRight: DS.gap, padding: 16}}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: DS.divider,
              }}>
              {canGoBack ? (
                <View style={{marginRight: 12}}>
                  <TvBackButton onPress={() => navigation.goBack()} size={38} />
                </View>
              ) : null}
              <BellAvatar size={38} />
              <View style={{marginLeft: 12, flex: 1}}>
                <Text style={{color: DS.text, fontSize: 17, fontWeight: '500', fontFamily: FONT}}>
                  Front Desk
                </Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 3}}>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: connected ? '#8FD9A8' : DS.muted,
                    }}
                  />
                  <Text
                    style={{
                      color: connected ? '#8FD9A8' : DS.muted,
                      fontSize: 10,
                      marginLeft: 6,
                      fontFamily: FONT,
                    }}>
                    {connected
                      ? 'Online'
                      : vm.connectionStatus === 'reconnecting'
                        ? 'Reconnecting…'
                        : vm.connectionStatus === 'offline'
                          ? 'You are offline'
                          : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Conversation */}
            {vm.isLoading ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <ActivityIndicator size="large" color={DS.gold} />
                <Text style={{color: DS.text2, fontSize: 13, marginTop: 12, fontFamily: FONT}}>
                  Opening your conversation…
                </Text>
              </View>
            ) : rows.length === 0 ? (
              <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <BellAvatar size={56} />
                <Text style={{color: DS.text, fontSize: 15, marginTop: 14, fontFamily: FONT}}>
                  No messages yet
                </Text>
                <Text
                  style={{
                    color: DS.text2,
                    fontSize: 11,
                    marginTop: 6,
                    textAlign: 'center',
                    maxWidth: 300,
                    lineHeight: 17,
                    fontFamily: FONT,
                  }}>
                  Send a message to the front desk — they're here to help with anything you need,
                  around the clock.
                </Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                style={{flex: 1, marginTop: 10}}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onContentSizeChange={onContentSizeChange}
                onScroll={e => {
                  const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
                  const fromBottom =
                    contentSize.height - contentOffset.y - layoutMeasurement.height;
                  setAtBottom(fromBottom < 80);
                  if (contentOffset.y <= 10 && vm.hasMoreMessages && !vm.isLoadingMore) {
                    vm.loadMoreMessages();
                  }
                }}>
                {vm.hasMoreMessages ? (
                  <View style={{alignItems: 'center', marginBottom: 8}}>
                    <TvPressable
                      onPress={() => vm.loadMoreMessages()}
                      label="Load older messages"
                      restBorderColor={DS.borderSoft}
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 5,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      }}>
                      {vm.isLoadingMore ? (
                        <ActivityIndicator size="small" color={DS.gold} />
                      ) : (
                        <Text style={{color: DS.text2, fontSize: 10, fontFamily: FONT}}>
                          Load older messages
                        </Text>
                      )}
                    </TvPressable>
                  </View>
                ) : null}

                {rows.map(row =>
                  row.kind === 'date' ? (
                    <DateChip key={row.key} label={row.label} />
                  ) : (
                    <Bubble
                      key={row.key}
                      message={row.message}
                      onRetry={() => row.message.tempId && vm.retryMessage(row.message.tempId)}
                    />
                  ),
                )}
              </ScrollView>
            )}

            {/* Composer */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: 52,
                marginTop: 12,
                paddingLeft: 18,
                paddingRight: 6,
                borderRadius: DS.radius,
                borderWidth: 1,
                borderColor: hasText ? 'rgba(212,180,131,0.55)' : DS.borderSoft,
                backgroundColor: 'rgba(255,255,255,0.08)',
                ...(GLASS_BLUR ?? {}),
              }}>
              <TextInput
                value={vm.inputText}
                onChangeText={vm.setInputText}
                onSubmitEditing={vm.sendMessage}
                blurOnSubmit={false}
                returnKeyType="send"
                placeholder={connected ? 'Type your message...' : 'Waiting for connection...'}
                placeholderTextColor={DS.muted}
                accessibilityLabel="Type your message"
                style={{flex: 1, color: DS.text, fontSize: 13, fontFamily: FONT}}
              />
              <TvPressable
                onPress={vm.sendMessage}
                label="Send message"
                restBorderColor={hasText ? '#E5CFA5' : 'transparent'}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: hasText ? DS.gold : 'rgba(255,255,255,0.12)',
                  opacity: vm.isSending ? 0.6 : 1,
                }}>
                {vm.isSending ? (
                  <ActivityIndicator size="small" color={DS.text} />
                ) : (
                  <Icon name="send" size={17} color={hasText ? DS.text : DS.muted} />
                )}
              </TvPressable>
            </View>
          </GlassPanel>

          {/* ── Right: front desk + quick services ── */}
          <View style={{width: 330}}>
            <GlassPanel style={{padding: 14, marginBottom: DS.gap}}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 1,
                  marginBottom: 10,
                  fontFamily: FONT,
                }}>
                FRONT DESK
              </Text>
              <Image
                source={toSource(frontDeskImg)}
                resizeMode="cover"
                style={{width: '100%', height: 108, borderRadius: DS.radiusSm}}
              />
              <Text
                style={{color: DS.text2, fontSize: 11, lineHeight: 17, marginTop: 10, marginBottom: 12, fontFamily: FONT}}>
                We are available 24/7 to assist you with anything you need during your stay.
              </Text>

              <SidePanelRow
                icon="call-outline"
                title="Call Front Desk"
                subtitle={hotel?.phoneNumber ? hotel.phoneNumber : 'Press to call'}
                chevron={false}
                onPress={onCallFrontDesk}
              />
              <SidePanelRow
                icon="time-outline"
                title="Request History"
                subtitle="View your past requests"
                onPress={() =>
                  rootNavigate('ServicesTab', {screen: 'ServiceBooked', initial: false})
                }
              />
            </GlassPanel>

            <GlassPanel style={{flex: 1, padding: 14}}>
              <Text
                style={{
                  color: DS.text,
                  fontSize: 13,
                  fontWeight: '700',
                  letterSpacing: 1,
                  marginBottom: 10,
                  fontFamily: FONT,
                }}>
                QUICK SERVICES
              </Text>

              {services.isLoading ? (
                <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                  <ActivityIndicator color={DS.gold} />
                </View>
              ) : quickServices.length === 0 ? (
                <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                  <Icon name="sparkles-outline" size={26} color={DS.muted} />
                  <Text
                    style={{
                      color: DS.text2,
                      fontSize: 11,
                      marginTop: 10,
                      textAlign: 'center',
                      fontFamily: FONT,
                    }}>
                    {services.error ?? 'No services listed yet — ask the front desk directly.'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                  {quickServices.map(({sub, categoryName}) => {
                    const booked = services.isAlreadyBooked(sub._id);
                    return (
                      <SidePanelRow
                        key={sub._id}
                        icon={serviceIcon(sub.name)}
                        title={sub.name ?? 'Service'}
                        subtitle={booked ? 'Already requested' : categoryName}
                        disabled={booked}
                        onPress={() => onQuickService(sub)}
                      />
                    );
                  })}
                </ScrollView>
              )}

              <TvPressable
                onPress={() => rootNavigate('ServicesTab', {screen: 'Services'})}
                label="View all services"
                restBorderColor={DS.border}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 38,
                  marginTop: 4,
                  borderRadius: DS.radiusSm,
                  backgroundColor: 'rgba(255,255,255,0.10)',
                }}>
                <Text
                  style={{
                    color: DS.text,
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                    fontFamily: FONT,
                  }}>
                  VIEW ALL SERVICES
                </Text>
                <Icon name="chevron-forward" size={13} color={DS.text} style={{marginLeft: 6}} />
              </TvPressable>
            </GlassPanel>
          </View>
        </View>

        <TvFooter marginTop={12} />
      </View>
    </SafeAreaView>
  );
}
