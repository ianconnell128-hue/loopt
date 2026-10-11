import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatConversation, ChatMessage } from '../types';
import { sendLocalMessageNotification } from './notificationService';

const CONVERSATIONS_KEY = '@loopt_chat_conversations_v1';
const MESSAGES_PREFIX = '@loopt_chat_messages_v1_';

export const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'conv-creator-1',
    participantId: 'creator-alex',
    participantName: 'Alex Rivera',
    participantAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    lastMessage: 'Yo! Did you see the new Loopt clip?',
    lastMessageTime: '10:45 AM',
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: 'conv-creator-2',
    participantId: 'creator-sarah',
    participantName: 'Sarah Jenkins',
    participantAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    lastMessage: 'Loved your latest edit! 🔥',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 'conv-loopt-support',
    participantId: 'loopt-official',
    participantName: 'Loopt Team ✨',
    participantAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    lastMessage: 'Welcome to Loopt Messages! Realtime cross-platform texting is live.',
    lastMessageTime: 'Just now',
    unreadCount: 0,
    isOnline: true,
  },
];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  'conv-creator-1': [
    {
      id: 'm1',
      conversationId: 'conv-creator-1',
      senderId: 'creator-alex',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      text: 'Hey! Are you editing your next short right now?',
      createdAt: '10:40 AM',
      isRead: true,
      status: 'read',
    },
    {
      id: 'm2',
      conversationId: 'conv-creator-1',
      senderId: 'current-user',
      senderName: 'You',
      senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      text: 'Just finished rendering, about to upload to Loopt!',
      createdAt: '10:42 AM',
      isRead: true,
      status: 'read',
    },
    {
      id: 'm3',
      conversationId: 'conv-creator-1',
      senderId: 'creator-alex',
      senderName: 'Alex Rivera',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      text: 'Yo! Did you see the new Loopt clip?',
      createdAt: '10:45 AM',
      isRead: false,
      status: 'delivered',
    },
  ],
};

/**
 * Load all conversations from persistent storage
 */
export async function loadConversations(): Promise<ChatConversation[]> {
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(INITIAL_CONVERSATIONS));
      return INITIAL_CONVERSATIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error loading conversations:', err);
    return INITIAL_CONVERSATIONS;
  }
}

/**
 * Save conversations list
 */
export async function saveConversations(convs: ChatConversation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch (err) {
    console.warn('Error saving conversations:', err);
  }
}

/**
 * Load messages for a specific conversation
 */
export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(`${MESSAGES_PREFIX}${conversationId}`);
    if (!raw) {
      const initial = INITIAL_MESSAGES[conversationId] || [];
      if (initial.length > 0) {
        await AsyncStorage.setItem(`${MESSAGES_PREFIX}${conversationId}`, JSON.stringify(initial));
      }
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Error loading messages for ${conversationId}:`, err);
    return [];
  }
}

/**
 * Save messages for a conversation
 */
export async function saveMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${MESSAGES_PREFIX}${conversationId}`, JSON.stringify(messages));
  } catch (err) {
    console.warn('Error saving messages:', err);
  }
}

/**
 * Send a new outgoing message
 */
export async function sendMessage(
  conversationId: string,
  text: string
): Promise<{ message: ChatMessage; updatedConversations: ChatConversation[] }> {
  const currentMessages = await loadMessages(conversationId);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    senderId: 'current-user',
    senderName: 'You',
    senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    text: text.trim(),
    createdAt: timeStr,
    isRead: true,
    status: 'sent',
  };

  const updatedMessages = [...currentMessages, newMessage];
  await saveMessages(conversationId, updatedMessages);

  // Update conversation header
  const convs = await loadConversations();
  const updatedConvs = convs.map((c) => {
    if (c.id === conversationId) {
      return {
        ...c,
        lastMessage: text.trim(),
        lastMessageTime: timeStr,
      };
    }
    return c;
  });
  await saveConversations(updatedConvs);

  return { message: newMessage, updatedConversations: updatedConvs };
}

/**
 * Simulate an incoming simulated or remote message and trigger notification
 */
export async function simulateIncomingReply(
  conversationId: string,
  senderName: string,
  senderAvatar: string,
  replyText: string
): Promise<ChatMessage> {
  const currentMessages = await loadMessages(conversationId);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const incoming: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    senderId: `sender-${conversationId}`,
    senderName,
    senderAvatar,
    text: replyText,
    createdAt: timeStr,
    isRead: false,
    status: 'delivered',
  };

  const updatedMessages = [...currentMessages, incoming];
  await saveMessages(conversationId, updatedMessages);

  const convs = await loadConversations();
  const updatedConvs = convs.map((c) => {
    if (c.id === conversationId) {
      return {
        ...c,
        lastMessage: replyText,
        lastMessageTime: timeStr,
        unreadCount: (c.unreadCount || 0) + 1,
      };
    }
    return c;
  });
  await saveConversations(updatedConvs);

  // Fire high-priority push/local notification with sound and vibration
  await sendLocalMessageNotification(senderName, replyText, conversationId);

  return incoming;
}
