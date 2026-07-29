import {useCallback, useEffect, useRef, useState} from 'react';
import {useSocket} from '../store/SocketContext';
import {useAuth} from '../store/AuthContext';
import {chatRepository} from '../repositories/chat.repository';
import {CLIENT_EVENTS, MESSAGE_STATUS, SERVER_EVENTS, USER_TYPES} from '../constants/socket';
import {logger} from '../services/logger';
import type {ChatMessage, RawChatMessage} from '../models/chat.model';

const PAGE_SIZE = 20;

let tempCounter = 0;
function generateTempId(): string {
  tempCounter += 1;
  return `temp_${Date.now()}_${tempCounter}`;
}

function normalizeMessage(raw: RawChatMessage, currentUserId: string): ChatMessage {
  const rawSenderId =
    (typeof raw.senderId === 'object' ? raw.senderId?._id : raw.senderId) || '';
  const senderType = raw.senderData?.userType ?? raw.senderType;
  const isOwn = rawSenderId === currentUserId || senderType === USER_TYPES.CUSTOMER;

  let messageStatus: number = MESSAGE_STATUS.SENT;
  if (Array.isArray(raw.receivedBy)) {
    const entry = raw.receivedBy.find(r =>
      isOwn ? r.userId !== currentUserId : r.userId === currentUserId,
    );
    if (entry) {
      messageStatus = entry.status ?? MESSAGE_STATUS.SENT;
    }
  }
  if (typeof raw.status === 'number') {
    messageStatus = raw.status;
  }

  return {
    id: raw._id || raw.id || '',
    text: raw.message || raw.text || '',
    senderId: rawSenderId,
    senderName: raw.senderData?.name || raw.senderName || (isOwn ? 'You' : 'Reception'),
    senderType: senderType ?? (isOwn ? USER_TYPES.CUSTOMER : USER_TYPES.STAFF),
    isOwn,
    timestamp: raw.createdAt || raw.timestamp || new Date().toISOString(),
    messageStatus,
    tempId: raw.tempId ?? null,
    isSending: false,
    isFailed: false,
  };
}

/**
 * Chat ViewModel — ported from the web app. REST for history, socket for realtime,
 * optimistic send with tempId reconciliation, offline queue + reconnect flush,
 * dedup Set, and skip/limit pagination.
 */
export function useChatViewModel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pendingMessages, setPendingMessages] = useState<{tempId: string; text: string}[]>([]);

  const messageIdsRef = useRef<Set<string>>(new Set());
  const skipRef = useRef(0);

  const {socketService, isConnected, connectionStatus} = useSocket();
  const {user} = useAuth();
  const userId = user?._id ?? '';

  const addMessageIfNew = useCallback((msg: ChatMessage) => {
    const key = msg.id || msg.tempId;
    // No id from the server: it cannot be de-duplicated, but DROPPING it would
    // lose a real incoming message — which is exactly how admin replies went
    // missing. The web app shows it; so do we.
    if (!key) {
      return true;
    }
    if (messageIdsRef.current.has(key)) {
      return false;
    }
    messageIdsRef.current.add(key);
    return true;
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const {messages: rawMessages, totalCount: total} = await chatRepository.getMessages(0, PAGE_SIZE);
      const normalized = rawMessages.map(raw => normalizeMessage(raw, userId)).reverse();

      messageIdsRef.current.clear();
      normalized.forEach(m => {
        // Never seed '' — one id-less history message would otherwise make the
        // set treat every future id-less message as already seen.
        if (m.id) {
          messageIdsRef.current.add(m.id);
        }
        if (m.tempId) {
          messageIdsRef.current.add(m.tempId);
        }
      });

      setMessages(normalized);
      setTotalCount(total);
      setHasMoreMessages(rawMessages.length < total);
      skipRef.current = rawMessages.length;
    } catch (error) {
      logger.error('chat', 'loadMessages failed', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore) {
      return;
    }
    try {
      setIsLoadingMore(true);
      const {messages: rawMessages} = await chatRepository.getMessages(skipRef.current, PAGE_SIZE);
      if (rawMessages.length === 0) {
        setHasMoreMessages(false);
        return;
      }
      const normalized = rawMessages.map(raw => normalizeMessage(raw, userId)).reverse();
      const fresh = normalized.filter(m => addMessageIfNew(m));
      if (fresh.length > 0) {
        setMessages(prev => [...fresh, ...prev]);
        skipRef.current += rawMessages.length;
      }
      setHasMoreMessages(skipRef.current < totalCount);
    } catch (error) {
      logger.error('chat', 'loadMoreMessages failed', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreMessages, isLoadingMore, totalCount, userId, addMessageIfNew]);

  const sendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      return;
    }
    const tempId = generateTempId();
    const optimistic: ChatMessage = {
      id: tempId,
      text: trimmed,
      senderId: userId,
      senderName: 'You',
      senderType: USER_TYPES.CUSTOMER,
      isOwn: true,
      timestamp: new Date().toISOString(),
      messageStatus: MESSAGE_STATUS.SENT,
      tempId,
      isSending: true,
      isFailed: false,
    };

    messageIdsRef.current.add(tempId);
    setMessages(prev => [...prev, optimistic]);
    setInputText('');
    setIsSending(true);

    if (!isConnected) {
      setMessages(prev =>
        prev.map(m => (m.tempId === tempId ? {...m, isSending: false, isFailed: true} : m)),
      );
      setPendingMessages(prev => [...prev, {tempId, text: trimmed}]);
      setIsSending(false);
      return;
    }

    socketService.emit(CLIENT_EVENTS.SEND_MESSAGE, {message: trimmed, tempId});

    setTimeout(() => {
      setMessages(prev =>
        prev.map(m =>
          m.tempId === tempId && m.isSending
            ? {...m, isSending: false, messageStatus: MESSAGE_STATUS.SENT}
            : m,
        ),
      );
      setIsSending(false);
    }, 2000);
  }, [inputText, userId, isConnected, socketService]);

  const retryMessage = useCallback(
    (tempId: string) => {
      const msg = messages.find(m => m.tempId === tempId);
      if (!msg || !isConnected) {
        return;
      }
      setMessages(prev =>
        prev.map(m => (m.tempId === tempId ? {...m, isSending: true, isFailed: false} : m)),
      );
      socketService.emit(CLIENT_EVENTS.SEND_MESSAGE, {message: msg.text, tempId});
      setPendingMessages(prev => prev.filter(p => p.tempId !== tempId));
    },
    [messages, isConnected, socketService],
  );

  const markAsRead = useCallback(
    (messageId: string) => {
      if (!isConnected || !messageId) {
        return;
      }
      socketService.emit(CLIENT_EVENTS.READ_MESSAGE, {messageId});
    },
    [isConnected, socketService],
  );

  // Realtime listeners
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const onNewMessage = (data: RawChatMessage) => {
      const msg = normalizeMessage(data, userId);

      if (data.tempId && messageIdsRef.current.has(data.tempId)) {
        messageIdsRef.current.add(msg.id);
        setMessages(prev =>
          prev.map(m =>
            m.tempId === data.tempId
              ? {...msg, isSending: false, messageStatus: MESSAGE_STATUS.SENT}
              : m,
          ),
        );
        return;
      }

      if (msg.isOwn) {
        setMessages(prev => {
          const idx = prev.findIndex(
            m =>
              m.tempId && m.isOwn && m.text === msg.text && (m.isSending || !m.id || m.id === m.tempId),
          );
          if (idx !== -1) {
            messageIdsRef.current.add(msg.id);
            const updated = [...prev];
            updated[idx] = {
              ...msg,
              isSending: false,
              messageStatus: msg.messageStatus || MESSAGE_STATUS.SENT,
            };
            return updated;
          }
          if (msg.id && messageIdsRef.current.has(msg.id)) {
            return prev;
          }
          if (msg.id) {
            messageIdsRef.current.add(msg.id);
          }
          return [...prev, msg];
        });
        return;
      }

      if (addMessageIfNew(msg)) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const onReadMessage = (data: {messageId?: string; _id?: string}) => {
      const msgId = data?.messageId || data?._id;
      if (!msgId) {
        return;
      }
      setMessages(prev =>
        prev.map(m => (m.id === msgId ? {...m, messageStatus: MESSAGE_STATUS.SEEN} : m)),
      );
    };

    socketService.on(SERVER_EVENTS.NEW_MESSAGE, onNewMessage);
    socketService.on(SERVER_EVENTS.READ_MESSAGE, onReadMessage);

    return () => {
      socketService.off(SERVER_EVENTS.NEW_MESSAGE, onNewMessage);
      socketService.off(SERVER_EVENTS.READ_MESSAGE, onReadMessage);
    };
  }, [isConnected, socketService, userId, addMessageIfNew]);

  // Flush queued messages on reconnect
  useEffect(() => {
    if (isConnected && pendingMessages.length > 0) {
      pendingMessages.forEach(pending => {
        socketService.emit(CLIENT_EVENTS.SEND_MESSAGE, {
          message: pending.text,
          tempId: pending.tempId,
        });
        setMessages(prev =>
          prev.map(m => (m.tempId === pending.tempId ? {...m, isSending: true, isFailed: false} : m)),
        );
      });
      setPendingMessages([]);
    }
  }, [isConnected, pendingMessages, socketService]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  return {
    messages,
    inputText,
    isLoading,
    isLoadingMore,
    isSending,
    hasMoreMessages,
    connectionStatus,
    isConnected,
    setInputText,
    sendMessage,
    loadMoreMessages,
    markAsRead,
    retryMessage,
  };
}
