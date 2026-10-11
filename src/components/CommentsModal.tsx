import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentItem } from '../types';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  videoTitle: string;
}

const DEFAULT_COMMENTS: CommentItem[] = [
  {
    id: 'c1',
    username: 'alex_visuals',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    text: 'The color grading on this is unreal! 🔥',
    createdAt: '2h ago',
    likesCount: 142,
  },
  {
    id: 'c2',
    username: 'maya_codes',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    text: 'Watched this 5 times already 👏',
    createdAt: '4h ago',
    likesCount: 39,
  },
  {
    id: 'c3',
    username: 'sam_creatives',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    text: 'Need a tutorial on how you made this sound track!',
    createdAt: '1d ago',
    likesCount: 18,
  },
];

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  videoTitle,
}) => {
  const [comments, setComments] = useState<CommentItem[]>(DEFAULT_COMMENTS);
  const [input, setInput] = useState<string>('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newComment: CommentItem = {
      id: 'c-' + Date.now(),
      username: 'you',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      text: input.trim(),
      createdAt: 'Just now',
      likesCount: 0,
    };
    setComments([newComment, ...comments]);
    setInput('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheet}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <Text style={styles.title}>Comments ({comments.length})</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments List */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.commentItem}>
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                <View style={styles.commentBody}>
                  <View style={styles.commentUserRow}>
                    <Text style={styles.commentUser}>{item.username}</Text>
                    <Text style={styles.commentTime}>{item.createdAt}</Text>
                  </View>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
                <TouchableOpacity style={styles.commentLike}>
                  <Ionicons name="heart-outline" size={16} color="#888" />
                  <Text style={styles.commentLikeCount}>{item.likesCount}</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#888"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '65%',
    backgroundColor: '#181818',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    marginBottom: 8,
  },
  titleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  commentUser: {
    color: '#AAAAAA',
    fontSize: 12,
    fontWeight: '600',
  },
  commentTime: {
    color: '#666666',
    fontSize: 11,
  },
  commentText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
  },
  commentLike: {
    alignItems: 'center',
    marginLeft: 8,
    paddingTop: 4,
  },
  commentLikeCount: {
    color: '#888888',
    fontSize: 10,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#282828',
    backgroundColor: '#1E1E1E',
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sendBtn: {
    backgroundColor: '#FF0000',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendBtnDisabled: {
    backgroundColor: '#444',
  },
});
