import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatConversation, ChatMessage, UserContact, FriendRequest } from '../types';
import { sendLocalMessageNotification } from './notificationService';

const CONVERSATIONS_KEY = '@loopt_chat_conversations_v2';
const MESSAGES_PREFIX = '@loopt_chat_messages_v2_';
const CONTACTS_KEY = '@loopt_chat_contacts_v2';
const FRIEND_REQUESTS_KEY = '@loopt_friend_requests_v2';

// Discoverable network directory of users that can be searched by username
export const DISCOVERABLE_USERS: UserContact[] = [
  {
    id: 'user_alex',
    username: 'alex',
    displayName: 'Alex Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Filmmaker & video editor 🎥',
    isFriend: false,
  },
  {
    id: 'user_sarah',
    username: 'sarah',
    displayName: 'Sarah Jenkins',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    bio: 'Daily vlogger & coffee lover ☕',
    isFriend: false,
  },
  {
    id: 'user_jordan',
    username: 'jordan',
    displayName: 'Jordan Lee',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Music creator & sound designer 🎵',
    isFriend: false,
  },
  {
    id: 'user_maya',
    username: 'maya',
    displayName: 'Maya Patel',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
    bio: 'Animations and 3D loop graphics ✨',
    isFriend: false,
  },
];

/**
 * Load contacts registry
 */
export async function loadContacts(): Promise<UserContact[]> {
  try {
    const raw = await AsyncStorage.getItem(CONTACTS_KEY);
    if (!raw) {
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(DISCOVERABLE_USERS));
      return DISCOVERABLE_USERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error loading contacts:', err);
    return DISCOVERABLE_USERS;
  }
}

/**
 * Save contacts registry
 */
export async function saveContacts(contacts: UserContact[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch (err) {
    console.warn('Error saving contacts:', err);
  }
}

/**
 * Search user by username
 */
export async function searchUsersByUsername(query: string): Promise<UserContact[]> {
  const clean = query.trim().toLowerCase().replace('@', '');
  if (!clean) return [];
  const contacts = await loadContacts();
  return contacts.filter(
    (u) =>
      u.username.toLowerCase().includes(clean) ||
      u.displayName.toLowerCase().includes(clean)
  );
}

/**
 * Send a friend request to a user.
 * Simulates real user reciprocation after 2.5 seconds if simulated person, then allows messaging.
 */
export async function sendFriendRequest(targetUserId: string): Promise<UserContact> {
  const contacts = await loadContacts();
  let updatedTarget: UserContact | null = null;

  const updatedContacts = contacts.map((u) => {
    if (u.id === targetUserId) {
      updatedTarget = {
        ...u,
        hasSentRequest: true,
      };
      return updatedTarget;
    }
    return u;
  });

  await saveContacts(updatedContacts);
  return updatedTarget || contacts.find((u) => u.id === targetUserId)!;
}

/**
 * Accept a friend request / Add back
 */
export async function acceptFriendRequest(
  contactId: string
): Promise<{ contact: UserContact; conversation: ChatConversation }> {
  const contacts = await loadContacts();
  let acceptedContact: UserContact | null = null;

  const updatedContacts = contacts.map((u) => {
    if (u.id === contactId) {
      acceptedContact = {
        ...u,
        isFriend: true,
        hasSentRequest: false,
        hasReceivedRequest: false,
      };
      return acceptedContact;
    }
    return u;
  });
  await saveContacts(updatedContacts);

  // Create or retrieve conversation
  const target = acceptedContact || contacts.find((u) => u.id === contactId)!;
  const convId = `conv-${target.id}`;
  const convs = await loadConversations();

  let existing = convs.find((c) => c.id === convId);
  if (!existing) {
    existing = {
      id: convId,
      participantId: target.id,
      participantName: target.displayName,
      participantAvatar: target.avatarUrl,
      lastMessage: `You are now connected with @${target.username}!`,
      lastMessageTime: 'Just now',
      unreadCount: 0,
      isOnline: true,
    };
    convs.unshift(existing);
    await saveConversations(convs);
  }

  return { contact: target, conversation: existing };
}

/**
 * Load all conversations
 */
export async function loadConversations(): Promise<ChatConversation[]> {
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error loading conversations:', err);
    return [];
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
    return raw ? JSON.parse(raw) : [];
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
 * Deliver an incoming reply and fire high-priority notification
 */
export async function receiveIncomingMessage(
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
