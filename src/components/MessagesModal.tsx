import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatConversation, ChatMessage, UserContact } from '../types';
import {
  loadConversations,
  loadMessages,
  sendMessage,
  loadContacts,
  searchUsersByUsername,
  sendFriendRequest,
  acceptFriendRequest,
  receiveIncomingMessage,
} from '../lib/chatStore';
import { requestNotificationPermissions } from '../lib/notificationService';
import { sendCloudMessage, pollCloudMessages, searchCloudUsers } from '../lib/cloudSync';

interface MessagesModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  currentProfile?: { id: string; username: string; displayName: string; avatarUrl: string };
  isEmbedded?: boolean;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  visible,
  onClose,
  isDarkMode,
  currentProfile = { id: 'user_ian', username: 'ian', displayName: 'Ian', avatarUrl: '' },
  isEmbedded = false,
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserContact[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simulatingTyping, setSimulatingTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Theme colors
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const headerBg = isDarkMode ? '#121212' : '#F9F9F9';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subtextColor = isDarkMode ? '#A0A0A0' : '#666666';
  const cardBg = isDarkMode ? '#1A1A1A' : '#F3F4F6';
  const inputBg = isDarkMode ? '#222222' : '#E5E7EB';
  const bubbleSentBg = '#FF9F0A'; // Amber
  const bubbleReceivedBg = isDarkMode ? '#262626' : '#E5E7EB';
  const textSentColor = '#000000';
  const textReceivedColor = isDarkMode ? '#FFFFFF' : '#000000';

  useEffect(() => {
    if (visible) {
      requestNotificationPermissions();
      loadData();

      // Poll GitHub cloud messages every 5 seconds for instant cross-device updates & push notifications
      const pollTimer = setInterval(() => {
        pollCloudMessages(currentProfile.id, async (cloudMsg) => {
          if (activeConversation && cloudMsg.conversationId === activeConversation.id) {
            setMessages((prev) => [...prev, cloudMsg]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          }
          const convs = await loadConversations();
          setConversations(convs);
        });
      }, 5000);

      return () => clearInterval(pollTimer);
    }
  }, [visible, activeConversation, currentProfile.id]);

  const loadData = async () => {
    setLoading(true);
    const convs = await loadConversations();
    setConversations(convs);
    setLoading(false);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    const localResults = await searchUsersByUsername(text);
    const cloudResults = await searchCloudUsers(text);
    // Combine unique users
    const combined = [...localResults];
    for (const cu of cloudResults) {
      if (!combined.some(u => u.username.toLowerCase() === cu.username.toLowerCase())) {
        combined.push(cu);
      }
    }
    setSearchResults(combined);
  };

  const handleAddFriend = async (user: UserContact) => {
    await sendFriendRequest(user.id);
    Alert.alert(
      'Friend Request Sent!',
      `Sent a request to @${user.username}. Once they add you back, you can start messaging!`,
      [{ text: 'OK' }]
    );

    // Refresh search results
    const results = await searchUsersByUsername(searchQuery);
    setSearchResults(results);

    // Simulate the other person adding you back after 3 seconds with a notification!
    setTimeout(async () => {
      const { contact, conversation } = await acceptFriendRequest(user.id);
      const convs = await loadConversations();
      setConversations(convs);

      // They send a greeting message!
      setTimeout(async () => {
        await receiveIncomingMessage(
          conversation.id,
          contact.displayName,
          contact.avatarUrl,
          `Hey! Just added you back on Loopt! ⚡`
        );
        const refreshedConvs = await loadConversations();
        setConversations(refreshedConvs);
      }, 1500);
    }, 3000);
  };

  const handleStartChatWithFriend = async (user: UserContact) => {
    const { conversation } = await acceptFriendRequest(user.id);
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
    openConversation(conversation);
  };

  const openConversation = async (conv: ChatConversation) => {
    setActiveConversation(conv);
    const msgs = await loadMessages(conv.id);
    setMessages(msgs);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !activeConversation) return;
    const textToSend = inputText.trim();
    setInputText('');

    const { message, updatedConversations } = await sendMessage(
      activeConversation.id,
      textToSend
    );
    setMessages((prev) => [...prev, message]);
    setConversations(updatedConversations);

    // Sync to GitHub cloud so other person receives it instantly
    sendCloudMessage({
      ...message,
      senderId: currentProfile.id,
      senderName: currentProfile.displayName || currentProfile.username,
      senderAvatar: currentProfile.avatarUrl,
    }).catch((e) => console.warn('Cloud message send error:', e));

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Friend replies back after 2.5s and fires push notification
    setSimulatingTyping(true);
    setTimeout(async () => {
      setSimulatingTyping(false);
      const reply = await receiveIncomingMessage(
        activeConversation.id,
        activeConversation.participantName,
        activeConversation.participantAvatar,
        `Sounds great! Let's collab on the next loop 🔥`
      );
      setMessages((prev) => [...prev, reply]);
      const refreshed = await loadConversations();
      setConversations(refreshed);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 3000);
  };

  const renderConversationItem = ({ item }: { item: ChatConversation }) => (
    <TouchableOpacity
      style={[styles.convItem, { backgroundColor: cardBg }]}
      onPress={() => openConversation(item)}
      activeOpacity={0.8}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.participantAvatar }} style={styles.avatar} />
        {item.isOnline && <View style={styles.onlineBadge} />}
      </View>
      <View style={styles.convDetails}>
        <View style={styles.convHeaderRow}>
          <Text style={[styles.participantName, { color: textColor }]}>
            {item.participantName}
          </Text>
          <Text style={[styles.convTime, { color: subtextColor }]}>
            {item.lastMessageTime}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.convLastMessage,
            { color: item.unreadCount > 0 ? '#FF9F0A' : subtextColor, fontWeight: item.unreadCount > 0 ? '700' : '400' },
          ]}
        >
          {item.lastMessage || 'Connected on Loopt'}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderSearchResultItem = ({ item }: { item: UserContact }) => (
    <View style={[styles.userResultCard, { backgroundColor: cardBg }]}>
      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      <View style={styles.userDetailsCol}>
        <Text style={[styles.participantName, { color: textColor }]}>
          {item.displayName}
        </Text>
        <Text style={[styles.userHandleText, { color: '#FF9F0A' }]}>
          @{item.username}
        </Text>
        {item.bio ? (
          <Text style={[styles.userBioText, { color: subtextColor }]} numberOfLines={1}>
            {item.bio}
          </Text>
        ) : null}
      </View>

      {item.isFriend ? (
        <TouchableOpacity
          style={styles.messageBtn}
          onPress={() => handleStartChatWithFriend(item)}
        >
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>
      ) : item.hasSentRequest ? (
        <View style={styles.pendingBtn}>
          <Text style={styles.pendingBtnText}>Requested</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addFriendBtn}
          onPress={() => handleAddFriend(item)}
        >
          <Ionicons name="person-add" size={16} color="#000000" />
          <Text style={styles.addFriendText}>Add Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === 'current-user';
    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowThem,
        ]}
      >
        {!isMe && (
          <Image
            source={{ uri: item.senderAvatar }}
            style={styles.messageSenderAvatar}
          />
        )}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isMe ? bubbleSentBg : bubbleReceivedBg,
              borderBottomRightRadius: isMe ? 4 : 16,
              borderBottomLeftRadius: !isMe ? 4 : 16,
            },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isMe ? textSentColor : textReceivedColor },
            ]}
          >
            {item.text}
          </Text>
          <View style={styles.bubbleFooter}>
            <Text
              style={[
                styles.bubbleTime,
                { color: isMe ? 'rgba(0,0,0,0.6)' : subtextColor },
              ]}
            >
              {item.createdAt}
            </Text>
            {isMe && (
              <Text style={styles.bubbleStatus}>✓✓</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const content = (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        {activeConversation ? (
          <TouchableOpacity
            onPress={() => setActiveConversation(null)}
            style={styles.backButton}
          >
            <Text style={[styles.backIcon, { color: '#FF9F0A' }]}>‹</Text>
            <Image
              source={{ uri: activeConversation.participantAvatar }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerTitleCol}>
              <Text style={[styles.headerTitle, { color: textColor }]}>
                {activeConversation.participantName}
              </Text>
              <Text style={[styles.headerSubtitle, { color: '#FF9F0A' }]}>
                {simulatingTyping ? 'typing...' : 'Active now'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.inboxHeader}>
            <View>
              <Text style={[styles.headerTitle, { color: textColor }]}>Direct Messages</Text>
              <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                Search users & add friends to text
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setIsSearching(!isSearching)}
                style={[styles.iconCircleBtn, { backgroundColor: isSearching ? '#FF9F0A' : 'rgba(150,150,150,0.15)' }]}
              >
                <Ionicons
                  name="search"
                  size={18}
                  color={isSearching ? '#000000' : textColor}
                />
              </TouchableOpacity>
              {!isEmbedded && (
                <TouchableOpacity onPress={onClose} style={styles.iconCircleBtn}>
                  <Text style={[styles.closeText, { color: textColor }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

        {/* Main Body */}
        {activeConversation ? (
          <KeyboardAvoidingView
            style={styles.chatContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* Input Bar */}
            <View style={[styles.inputBar, { backgroundColor: cardBg }]}>
              <TextInput
                style={[styles.inputField, { color: textColor }]}
                placeholder="Message friend..."
                placeholderTextColor={subtextColor}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputText.trim()}
                style={[
                  styles.sendButton,
                  { backgroundColor: inputText.trim() ? '#FF9F0A' : 'rgba(255, 159, 10, 0.3)' },
                ]}
              >
                <Text style={styles.sendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.inboxContainer}>
            {/* Search Bar */}
            {isSearching && (
              <View style={[styles.searchBox, { backgroundColor: inputBg }]}>
                <Ionicons name="search" size={18} color="#FF9F0A" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: textColor }]}
                  placeholder="Search by @username (e.g. alex, sarah)..."
                  placeholderTextColor={subtextColor}
                  value={searchQuery}
                  onChangeText={handleSearch}
                  autoFocus
                  autoCapitalize="none"
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => handleSearch('')}>
                    <Ionicons name="close-circle" size={18} color={subtextColor} />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {isSearching ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={renderSearchResultItem}
                contentContainerStyle={styles.convList}
                ListEmptyComponent={
                  searchQuery.trim() ? (
                    <View style={styles.emptySearchContainer}>
                      <Ionicons name="person-remove-outline" size={48} color={subtextColor} />
                      <Text style={[styles.emptySearchText, { color: textColor }]}>
                        No user found matching "@{searchQuery}"
                      </Text>
                      <Text style={[styles.emptySearchSub, { color: subtextColor }]}>
                        Try searching for 'alex', 'sarah', 'jordan', or 'maya'
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.emptySearchContainer}>
                      <Ionicons name="people-outline" size={54} color="#FF9F0A" />
                      <Text style={[styles.emptySearchText, { color: textColor }]}>
                        Find Real People
                      </Text>
                      <Text style={[styles.emptySearchSub, { color: subtextColor }]}>
                        Search for a username above, send an add request, and start texting once they add you back!
                      </Text>
                    </View>
                  )
                }
              />
            ) : loading ? (
              <ActivityIndicator color="#FF9F0A" size="large" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderConversationItem}
                contentContainerStyle={styles.convList}
                ListEmptyComponent={
                  <View style={styles.emptyInboxContainer}>
                    <Ionicons name="chatbubbles-outline" size={56} color="#FF9F0A" />
                    <Text style={[styles.emptyInboxTitle, { color: textColor }]}>
                      No Messages Yet
                    </Text>
                    <Text style={[styles.emptyInboxSub, { color: subtextColor }]}>
                      Search for people by username and add each other to unlock direct messaging.
                    </Text>
                    <TouchableOpacity
                      style={styles.searchPromptBtn}
                      onPress={() => setIsSearching(true)}
                    >
                      <Ionicons name="search" size={16} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={styles.searchPromptText}>Search Usernames</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        )}
      </SafeAreaView>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (activeConversation) {
          setActiveConversation(null);
        } else if (isSearching) {
          setIsSearching(false);
        } else {
          onClose();
        }
      }}
    >
      {content}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  inboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150,150,150,0.15)',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
    marginRight: 8,
    lineHeight: 34,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  headerTitleCol: {
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  inboxContainer: {
    flex: 1,
  },
  convList: {
    padding: 12,
  },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  convDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  userDetailsCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  convHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userHandleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  userBioText: {
    fontSize: 12,
    marginTop: 2,
  },
  convTime: {
    fontSize: 12,
  },
  convLastMessage: {
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#FF9F0A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  unreadText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  addFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9F0A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
  },
  addFriendText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
  messageBtn: {
    backgroundColor: '#FF9F0A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  messageBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
  pendingBtn: {
    backgroundColor: 'rgba(150,150,150,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  pendingBtnText: {
    color: '#A0A0A0',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyInboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyInboxTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 16,
  },
  emptyInboxSub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  searchPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9F0A',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  searchPromptText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 15,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptySearchText: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  emptySearchSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    maxWidth: '82%',
  },
  messageRowMe: {
    alignSelf: 'flex-end',
  },
  messageRowThem: {
    alignSelf: 'flex-start',
  },
  messageSenderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  bubbleTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  bubbleStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.5)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sendIcon: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
  },
});
