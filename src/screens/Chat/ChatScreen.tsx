import React, {useRef} from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type ViewToken,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Header, Loader} from '../../components';
import {useChatViewModel} from '../../viewmodels/ChatViewModel';
import {useTheme} from '../../theme';
import {MESSAGE_STATUS} from '../../constants/socket';
import {formatTime12h} from '../../utils/format';
import type {ChatMessage} from '../../models/chat.model';
import type {HomeStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Chat'>;

function StatusTicks({message}: {message: ChatMessage}) {
  const {theme} = useTheme();
  if (message.isFailed) {
    return <Icon name="alert-circle" size={13} color={theme.colors.danger} />;
  }
  if (message.isSending) {
    return <Icon name="time-outline" size={13} color="rgba(13,13,13,0.5)" />;
  }
  if (message.messageStatus >= MESSAGE_STATUS.SEEN) {
    return <Icon name="checkmark-done" size={14} color="#2563eb" />;
  }
  if (message.messageStatus === MESSAGE_STATUS.DELIVERED) {
    return <Icon name="checkmark-done" size={14} color="rgba(13,13,13,0.5)" />;
  }
  return <Icon name="checkmark" size={14} color="rgba(13,13,13,0.5)" />;
}

function Bubble({message, onRetry}: {message: ChatMessage; onRetry: () => void}) {
  const {theme} = useTheme();
  const own = message.isOwn;
  return (
    <View className={`mb-2 max-w-[82%] ${own ? 'self-end' : 'self-start'}`}>
      <View
        className="rounded-2xl px-3.5 py-2.5"
        style={{
          backgroundColor: message.isFailed
            ? 'rgba(239,68,68,0.15)'
            : own
              ? theme.colors.primary
              : theme.colors.surfaceElevated,
          opacity: message.isSending ? 0.75 : 1,
          borderWidth: message.isFailed ? 1 : 0,
          borderColor: 'rgba(239,68,68,0.5)',
        }}>
        <Text
          style={{
            color: own && !message.isFailed ? theme.colors.primaryForeground : theme.colors.text,
            fontSize: 14,
          }}>
          {message.text}
        </Text>
        <View className="mt-1 flex-row items-center justify-end" style={{gap: 4}}>
          <Text
            style={{
              color:
                own && !message.isFailed ? 'rgba(13,13,13,0.55)' : theme.colors.textTertiary,
              fontSize: 10,
            }}>
            {formatTime12h(
              `${new Date(message.timestamp).getHours()}:${new Date(message.timestamp).getMinutes()}`,
            )}
          </Text>
          {own ? <StatusTicks message={message} /> : null}
        </View>
      </View>
      {message.isFailed ? (
        <Pressable onPress={onRetry} focusable accessibilityRole="button" className="mt-0.5 self-end">
          <Text className="text-[11px] font-semibold text-danger">Tap to retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ConnectionBanner({status}: {status: string}) {
  if (status === 'connected') {
    return null;
  }
  const text =
    status === 'offline'
      ? 'You are offline'
      : status === 'reconnecting'
        ? 'Reconnecting…'
        : 'Disconnected';
  return (
    <View className="items-center bg-surface-elevated py-1.5">
      <Text className="text-xs text-content-tertiary">{text}</Text>
    </View>
  );
}

export function ChatScreen({navigation}: Props) {
  const {theme} = useTheme();
  const vm = useChatViewModel();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Keep a stable onViewableItemsChanged (RN requirement) that reads the latest markAsRead.
  const markReadRef = useRef(vm.markAsRead);
  markReadRef.current = vm.markAsRead;
  const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: ViewToken[]}) => {
    viewableItems.forEach(({item}) => {
      const msg = item as ChatMessage;
      if (msg && !msg.isOwn && msg.messageStatus < MESSAGE_STATUS.SEEN && msg.id) {
        markReadRef.current(msg.id);
      }
    });
  }).current;
  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 60}).current;

  const connected = vm.connectionStatus === 'connected';
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
      <Text className="ml-1.5 text-xs text-content-tertiary">
        {connected ? 'Online' : 'Offline'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: theme.colors.background}} edges={['top', 'bottom']}>
      <Header title="Reception" onBack={() => navigation.goBack()} right={headerRight} />
      <ConnectionBanner status={vm.connectionStatus} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {vm.isLoading ? (
          <Loader label="Loading conversation…" />
        ) : vm.messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Icon name="chatbubbles-outline" size={48} color={theme.colors.muted} />
            <Text className="mt-3 text-center text-sm text-content-tertiary">
              No messages yet. Say hello to reception!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={vm.messages}
            keyExtractor={item => item.id || item.tempId || String(item.timestamp)}
            renderItem={({item}) => (
              <Bubble message={item} onRetry={() => item.tempId && vm.retryMessage(item.tempId)} />
            )}
            contentContainerStyle={{padding: 16}}
            onContentSizeChange={() => listRef.current?.scrollToEnd({animated: false})}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            ListHeaderComponent={
              vm.hasMoreMessages ? (
                <Pressable
                  onPress={vm.loadMoreMessages}
                  focusable
                  accessibilityRole="button"
                  className="mb-2 items-center py-2">
                  {vm.isLoadingMore ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <Text className="text-xs font-semibold text-primary">Load older messages</Text>
                  )}
                </Pressable>
              ) : null
            }
          />
        )}

        {/* Input bar */}
        <View className="flex-row items-end border-t border-border px-3 py-2" style={{gap: 8}}>
          <TextInput
            value={vm.inputText}
            onChangeText={vm.setInputText}
            placeholder={connected ? 'Type a message…' : 'Waiting for connection…'}
            placeholderTextColor={theme.colors.muted}
            multiline
            className="flex-1 rounded-2xl bg-surface-elevated px-4 py-2.5 text-base text-content"
            style={{maxHeight: 120}}
          />
          <Pressable
            onPress={vm.sendMessage}
            disabled={!vm.inputText.trim() || vm.isSending}
            focusable={Boolean(vm.inputText.trim())}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            className="h-11 w-11 items-center justify-center rounded-full"
            style={{
              backgroundColor: theme.colors.primary,
              opacity: !vm.inputText.trim() || vm.isSending ? 0.5 : 1,
            }}>
            {vm.isSending ? (
              <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
            ) : (
              <Icon name="send" size={18} color={theme.colors.primaryForeground} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
