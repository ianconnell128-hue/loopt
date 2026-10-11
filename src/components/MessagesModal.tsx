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
} from 'react-native';
import { ChatConversation, ChatMessage } from '../types';
import {
  loadConversations,
  loadMessages,
  sendMessage,
  simulateIncomingReply,
} from '../lib/chatStore';
import { requestNotificationPermissions } from '../lib/notificationService';

interface MessagesModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const MessagesModal: React.FC<MessagesModalProps> = ({
  visible,
  onClose,
  isDarkMode,
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulatingTyping, setSimulatingTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Colors
  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const headerBg = isDarkMode ? '#121212' : '#F9F9F9';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subtextColor = isDarkMode ? '#A0A0A0' : '#666666';
  const cardBg = isDarkMode ? '#1A1A1A' : '#F3F4F6';
  const bubbleSentBg = '#FF9F0A'; // Amber
  const bubbleReceivedBg = isDarkMode ? '#262626' : '#E5E7EB';
  const textSentColor = '#000000'; // black on amber
  const textReceivedColor = isDarkMode ? '#FFFFFF' : '#000000';

  useEffect(() => {
    if (visible) {
      requestNotificationPermissions();
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    const convs = await loadConversations();
    setConversations(convs);
    setLoading(false);
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

    // Auto scroll down
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Trigger simulated reply test to demonstrate live push notification receiving
    if (activeConversation.id === 'conv-creator-1' || activeConversation.id === 'conv-loopt-support') {
      setSimulatingTyping(true);
      setTimeout(async () => {
        setSimulatingTyping(false);
        const replyText =
          activeConversation.id === 'conv-creator-1'
            ? 'That looks awesome! Catch you on Loopt feed! 🔥'
            : 'Got your message! Loopt notification engine verified & active. ⚡';

        const reply = await simulateIncomingReply(
          activeConversation.id,
          activeConversation.participantName,
          activeConversation.participantAvatar,
          replyText
        );

        setMessages((prev) => [...prev, reply]);
        const refreshed = await loadConversations();
        setConversations(refreshed);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }, 3500);
    }
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
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
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
              <Text
                style={[
                  styles.bubbleStatus,
                  { color: item.status === 'read' ? '#000000' : 'rgba(0,0,0,0.5)' },
                ]}
              >
                ✓✓
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (activeConversation) {
          setActiveConversation(null);
        } else {
          onClose();
        }
      }}
    >
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
                  {simulatingTyping ? 'typing...' : activeConversation.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.inboxHeader}>
              <View>
                <Text style={[styles.headerTitle, { color: textColor }]}>Messages</Text>
                <Text style={[styles.headerSubtitle, { color: subtextColor }]}>
                  Loopt Direct Texting & Notifications
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeText, { color: textColor }]}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Content */}
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
                placeholder="Message..."
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
            {loading ? (
              <ActivityIndicator color="#FF9F0A" size="large" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderConversationItem}
                contentContainerStyle={styles.convList}
              />
            )}
          </View>
        )}
      </SafeAreaView>
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
  closeBtn: {
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
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
  convHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '700',
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
