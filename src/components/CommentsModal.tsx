import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommentItem } from '../types';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
  getComments: (videoId: string) => Promise<CommentItem[]>;
  onAddComment: (videoId: string, text: string) => Promise<CommentItem>;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  onClose,
  videoId,
  videoTitle,
  getComments,
  onAddComment,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (visible && videoId) {
      setLoading(true);
      getComments(videoId)
        .then((items) => setComments(items))
        .finally(() => setLoading(false));
    }
  }, [visible, videoId, getComments]);

  const handleSend = async () => {
    if (!input.trim() || !videoId) return;
    const trimmed = input.trim();
    setInput('');
    try {
      const added = await onAddComment(videoId, trimmed);
      setComments((prev) => [added, ...prev]);
    } catch (err) {
      console.warn('Comment error:', err);
    }
  };

  const toggleCommentLike = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const isLiked = !c.isLiked;
          const likesCount = isLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1);
          return { ...c, isLiked, likesCount };
        }
        return c;
      })
    );
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
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#FF9F0A" />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={44} color="#555" />
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptySubtitle}>Be the first to share your thoughts!</Text>
            </View>
          ) : (
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
                  <TouchableOpacity
                    style={styles.commentLike}
                    onPress={() => toggleCommentLike(item.id)}
                  >
                    <Ionicons
                      name={item.isLiked ? 'heart' : 'heart-outline'}
                      size={16}
                      color={item.isLiked ? '#FF2D55' : '#888'}
                    />
                    <Text style={styles.commentLikeCount}>{item.likesCount}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add a real comment..."
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    color: '#DDD',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    color: '#777',
    fontSize: 13,
    marginTop: 4,
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
    backgroundColor: '#FF9F0A',
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
