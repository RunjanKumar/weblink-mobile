import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Header, Skeleton} from '../../components';
import {useChatViewModel} from '../../viewmodels/ChatViewModel';
import {useTheme, useStatusTones} from '../../theme';
import {MESSAGE_STATUS} from '../../constants/socket';
import type {ChatMessage} from '../../models/chat.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Chat'>;

/** Reference ChatBubble truncation threshold. */
const MAX_TEXT_LENGTH = 400;
/** px from the bottom that still counts as "at bottom" (reference: 100). */
const AT_BOTTOM_THRESHOLD = 100;

type DisplayItem =
  | {type: 'date'; key: string; date: string | number}
  | {type: 'message'; key: string; data: ChatMessage};

/** Reference DateDivider label: Today / Yesterday / "Jul 29" (+year if not current). */
function dateLabel(date: string | number): string {
  const msgDate = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (day(msgDate) === day(today)) {
    return 'Today';
  }
  if (day(msgDate) === day(yesterday)) {
    return 'Yesterday';
  }
  return msgDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function DateDivider({date}: {date: string | number}) {
  return (
    <View className="my-4 flex-row items-center" style={{gap: 12}}>
      <View className="h-px flex-1 bg-border" />
      <Text className="px-2 text-[11px] font-medium uppercase tracking-wider text-content-tertiary">
        {dateLabel(date)}
      </Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}

function StatusTicks({message}: {message: ChatMessage}) {
  const {theme, scheme} = useTheme();
  // Drawn ON the own-message bubble, whose fill is theme primary: bright amber
  // with near-black content on dark, deep gold with white content on light.
  const meta = scheme === 'dark' ? 'rgba(13,13,13,0.5)' : 'rgba(255,255,255,0.8)';
  const seen = scheme === 'dark' ? '#2563eb' : '#bfdbfe';
  if (message.isFailed) {
    return <Icon name="close-circle" size={13} color={theme.colors.danger} />;
  }
  if (message.isSending) {
    return <Icon name="time-outline" size={13} color={meta} />;
  }
  if (message.messageStatus >= MESSAGE_STATUS.SEEN) {
    return <Icon name="checkmark-done" size={14} color={seen} />;
  }
  if (message.messageStatus === MESSAGE_STATUS.DELIVERED) {
    return <Icon name="checkmark-done" size={14} color={meta} />;
  }
  return <Icon name="checkmark" size={14} color={meta} />;
}

/**
 * Reference ChatBubble: guest right / staff left, Show more past 400 chars,
 * time + ticks row, Retry link under failed messages.
 */
function Bubble({message, onRetry}: {message: ChatMessage; onRetry: () => void}) {
  const {theme, scheme} = useTheme();
  const [expanded, setExpanded] = useState(false);
  const own = message.isOwn;
  const ownMeta = scheme === 'dark' ? 'rgba(13,13,13,0.55)' : 'rgba(255,255,255,0.8)';

  const text = message.text ?? '';
  const isLong = text.length > MAX_TEXT_LENGTH;
  const displayText = isLong && !expanded ? `${text.slice(0, MAX_TEXT_LENGTH)}...` : text;
  const time = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
    : '';

  return (
    <View className={`mb-2 max-w-[80%] ${own ? 'self-end' : 'self-start'}`}>
      <View
        className="rounded-2xl px-4 py-3"
        style={{
          backgroundColor: message.isFailed
            ? `${theme.colors.danger}26`
            : own
              ? theme.colors.primary
              : theme.colors.surfaceElevated,
          opacity: message.isSending ? 0.7 : 1,
          borderWidth: message.isFailed ? 1 : 0,
          borderColor: `${theme.colors.danger}80`,
        }}>
        <Text
          style={{
            color: own && !message.isFailed ? theme.colors.primaryForeground : theme.colors.text,
            fontSize: 14,
            lineHeight: 20,
          }}>
          {displayText}
        </Text>

        {isLong ? (
          <Pressable
            onPress={() => setExpanded(v => !v)}
            focusable
            accessibilityRole="button"
            className="mt-1 self-start">
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: own && !message.isFailed ? ownMeta : theme.colors.primary,
              }}>
              {expanded ? 'Show less' : 'Show more'}
            </Text>
          </Pressable>
        ) : null}

        <View
          className={`mt-1.5 flex-row items-center ${own ? 'justify-end' : 'justify-start'}`}
          style={{gap: 6}}>
          {time ? (
            <Text
              style={{
                color: own && !message.isFailed ? ownMeta : theme.colors.textTertiary,
                fontSize: 10,
              }}>
              {time}
            </Text>
          ) : null}
          {own ? <StatusTicks message={message} /> : null}
        </View>
      </View>

      {message.isFailed ? (
        <Pressable
          onPress={onRetry}
          focusable
          accessibilityRole="button"
          className="mt-1 flex-row items-center self-end"
          style={{gap: 4}}>
          <Icon name="refresh" size={11} color={theme.colors.danger} />
          <Text className="text-[10px] font-semibold text-danger">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Reference ConnectionBanner: severity-tinted pill (offline/reconnecting/disconnected). */
function ConnectionBanner({status}: {status: string}) {
  const {theme} = useTheme();
  const tones = useStatusTones();
  if (status === 'connected') {
    return null;
  }
  const config =
    status === 'offline'
      ? {text: 'You are offline', icon: 'cloud-offline-outline', color: theme.colors.textTertiary, bg: theme.colors.surfaceElevated}
      : status === 'reconnecting'
        ? {text: 'Reconnecting...', icon: 'sync-outline', color: tones.warning, bg: `${tones.warning}1f`}
        : {text: 'Disconnected', icon: 'alert-circle-outline', color: tones.danger, bg: `${tones.danger}1f`};
  return (
    <View
      className="mx-5 mb-2 flex-row items-center justify-center rounded-lg px-3 py-2"
      style={{gap: 8, backgroundColor: config.bg}}>
      <Icon name={config.icon} size={14} color={config.color} />
      <Text style={{color: config.color, fontSize: 12, fontWeight: '500'}}>{config.text}</Text>
    </View>
  );
}

/** Reference LoadingChat: six alternating pulsing bubbles. */
function LoadingChat() {
  const rows: {right: boolean; width: `${number}%`}[] = [
    {right: false, width: '60%'},
    {right: true, width: '70%'},
    {right: false, width: '45%'},
    {right: true, width: '55%'},
    {right: false, width: '65%'},
    {right: true, width: '50%'},
  ];
  return (
    <View className="flex-1 px-4 py-3" style={{gap: 16}}>
      {rows.map((row, i) => (
        <View key={i} className={`flex-row ${row.right ? 'justify-end' : 'justify-start'}`}>
          <Skeleton width={row.width} height={52} radius={16} />
        </View>
      ))}
    </View>
  );
}

/** Reference EmptyChat: amber chat glyph in a circle + copy. */
function EmptyChat() {
  const {theme} = useTheme();
  return (
    <View className="flex-1 items-center justify-center px-8" style={{gap: 16}}>
      <View
        className="h-16 w-16 items-center justify-center rounded-full bg-surface-elevated"
        style={{borderWidth: 1, borderColor: theme.colors.border}}>
        <Icon name="chatbubble-outline" size={28} color={theme.colors.primary} />
      </View>
      <Text className="text-sm font-semibold text-content">No messages yet</Text>
      <Text className="max-w-[240px] text-center text-xs leading-5 text-content-tertiary">
        Send a message to the hotel reception. They're here to help with anything you need.
      </Text>
    </View>
  );
}

export function ChatScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useChatViewModel();
  const listRef = useRef<FlatList<DisplayItem>>(null);
  const atBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Reference buildMessageList: date divider whenever the calendar day changes.
  const displayItems = useMemo<DisplayItem[]>(() => {
    const items: DisplayItem[] = [];
    let lastDate: string | null = null;
    vm.messages.forEach(msg => {
      const msgDate = msg.timestamp ? new Date(msg.timestamp).toDateString() : null;
      if (msgDate && msgDate !== lastDate) {
        items.push({type: 'date', key: `date-${msgDate}`, date: msg.timestamp});
        lastDate = msgDate;
      }
      items.push({
        type: 'message',
        key: msg.id || msg.tempId || String(msg.timestamp),
        data: msg,
      });
    });
    return items;
  }, [vm.messages]);

  // Keep a stable onViewableItemsChanged (RN requirement) that reads the latest markAsRead.
  const markReadRef = useRef(vm.markAsRead);
  markReadRef.current = vm.markAsRead;
  const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: ViewToken[]}) => {
    viewableItems.forEach(({item}) => {
      const entry = item as DisplayItem;
      if (entry?.type !== 'message') {
        return;
      }
      const msg = entry.data;
      if (!msg.isOwn && msg.messageStatus < MESSAGE_STATUS.SEEN && msg.id) {
        markReadRef.current(msg.id);
      }
    });
  }).current;
  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 60}).current;

  const scrollToBottom = useCallback((animated: boolean) => {
    listRef.current?.scrollToEnd({animated});
  }, []);

  // Reference: auto load-more near the top; FAB + auto-scroll gate near the bottom.
  const loadMoreRef = useRef({loadMore: vm.loadMoreMessages, has: vm.hasMoreMessages, busy: vm.isLoadingMore});
  loadMoreRef.current = {loadMore: vm.loadMoreMessages, has: vm.hasMoreMessages, busy: vm.isLoadingMore};
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
    const fromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const atBottom = fromBottom < AT_BOTTOM_THRESHOLD;
    atBottomRef.current = atBottom;
    setShowScrollBtn(prev => (prev === !atBottom ? prev : !atBottom));
    const {loadMore, has, busy} = loadMoreRef.current;
    if (contentOffset.y <= 10 && has && !busy) {
      loadMore();
    }
  }, []);

  const connected = vm.connectionStatus === 'connected';
  const hasText = vm.inputText.trim().length > 0;

  // Reference ChatHeader: online dot + label under the title.
  const headerRight = (
    <View className="flex-row items-center">
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: connected ? theme.colors.success : theme.colors.muted,
        }}
      />
      <Text
        className="ml-1.5 text-xs"
        style={{color: connected ? theme.colors.success : theme.colors.muted}}>
        {connected ? 'Online' : 'Offline'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      {/* Also the Reception TAB root, where there is nothing to go back to. */}
      <Header
        title="Reception"
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        right={headerRight}
      />
      <ConnectionBanner status={vm.connectionStatus} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {vm.isLoading ? (
          <LoadingChat />
        ) : vm.messages.length === 0 ? (
          <EmptyChat />
        ) : (
          <View className="flex-1">
            <FlatList
              ref={listRef}
              data={displayItems}
              keyExtractor={item => item.key}
              renderItem={({item}) =>
                item.type === 'date' ? (
                  <DateDivider date={item.date} />
                ) : (
                  <Bubble
                    message={item.data}
                    onRetry={() => item.data.tempId && vm.retryMessage(item.data.tempId)}
                  />
                )
              }
              contentContainerStyle={{padding: 16}}
              onScroll={onScroll}
              scrollEventThrottle={16}
              // Reference: only follow new messages while the user is at the bottom.
              onContentSizeChange={() => {
                if (atBottomRef.current) {
                  scrollToBottom(false);
                }
              }}
              maintainVisibleContentPosition={{minIndexForVisible: 0}}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              ListHeaderComponent={
                vm.hasMoreMessages ? (
                  <View className="mb-2 items-center">
                    <Pressable
                      onPress={vm.loadMoreMessages}
                      disabled={vm.isLoadingMore}
                      focusable
                      accessibilityRole="button"
                      className="rounded-full bg-surface-elevated px-4 py-1.5"
                      style={{opacity: vm.isLoadingMore ? 0.5 : 1}}>
                      {vm.isLoadingMore ? (
                        <View className="flex-row items-center" style={{gap: 8}}>
                          <ActivityIndicator size="small" color={theme.colors.primary} />
                          <Text className="text-[11px] text-content-tertiary">Loading...</Text>
                        </View>
                      ) : (
                        <Text className="text-[11px] text-content-tertiary">
                          Load older messages
                        </Text>
                      )}
                    </Pressable>
                  </View>
                ) : null
              }
            />

            {/* Reference ScrollToBottom FAB. */}
            {showScrollBtn ? (
              <Pressable
                onPress={() => scrollToBottom(true)}
                focusable
                accessibilityRole="button"
                accessibilityLabel="Scroll to bottom"
                className="absolute bottom-4 right-5 h-10 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: theme.colors.primary,
                  elevation: 4,
                  shadowColor: theme.colors.primary,
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  shadowOffset: {width: 0, height: 2},
                }}>
                <Icon name="chevron-down" size={18} color={theme.colors.primaryForeground} />
              </Pressable>
            ) : null}
          </View>
        )}

        {/* Reference ChatInput: pill bar, amber border once text is typed, Enter sends. */}
        <View className="px-3 pb-2 pt-2">
          <View
            className="flex-row items-center rounded-full bg-surface-elevated px-4 py-1.5"
            style={{
              gap: 8,
              borderWidth: 1.5,
              borderColor: hasText ? `${theme.colors.primary}66` : theme.colors.border,
            }}>
            <TextInput
              value={vm.inputText}
              onChangeText={vm.setInputText}
              placeholder={connected ? 'Write your message...' : 'Waiting for connection...'}
              placeholderTextColor={theme.colors.muted}
              onSubmitEditing={vm.sendMessage}
              blurOnSubmit={false}
              returnKeyType="send"
              className="flex-1 py-2 text-base text-content"
              style={{maxHeight: 96}}
            />
            <Pressable
              onPress={vm.sendMessage}
              disabled={!hasText || vm.isSending}
              focusable={hasText}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{
                backgroundColor: hasText ? theme.colors.primary : 'transparent',
                opacity: vm.isSending ? 0.5 : 1,
              }}>
              {vm.isSending ? (
                <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
              ) : (
                <Icon
                  name="send"
                  size={17}
                  color={hasText ? theme.colors.primaryForeground : theme.colors.muted}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
