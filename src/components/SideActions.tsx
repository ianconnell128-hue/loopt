import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ShortVideo } from '../types';

interface SideActionsProps {
  video: ShortVideo;
  onLike: () => void;
  onRepost: () => void;
  onBookmark: () => void;
  onOpenComments: () => void;
  onShare: () => void;
}


function formatCount(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

export const SideActions: React.FC<SideActionsProps> = ({
  video,
  onLike,
  onRepost,
  onBookmark,
  onOpenComments,
  onShare,
}) => {

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const repostAnim = useRef(new Animated.Value(1)).current;
  const bookmarkAnim = useRef(new Animated.Value(1)).current;

  const handleLikePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.4,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
    onLike();
  };

  const handleRepostPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    Animated.sequence([
      Animated.timing(repostAnim, {
        toValue: 1.35,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(repostAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
    onRepost();
  };

  const handleBookmarkPress = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Animated.sequence([
      Animated.timing(bookmarkAnim, {
        toValue: 1.35,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(bookmarkAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
    onBookmark();
  };

  return (
    <View style={styles.container}>
      {/* Like Button */}
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleLikePress}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons
            name={video.isLiked ? 'heart' : 'heart-outline'}
            size={36}
            color={video.isLiked ? '#FF2D55' : '#FFFFFF'}
          />
        </Animated.View>
        <Text style={styles.actionText}>{formatCount(video.likesCount)}</Text>
      </TouchableOpacity>

      {/* Repost Button */}
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleRepostPress}>
        <Animated.View style={{ transform: [{ scale: repostAnim }] }}>
          <MaterialCommunityIcons
            name="repeat-variant"
            size={34}
            color={video.isReposted ? '#FFD60A' : '#FFFFFF'}
          />
        </Animated.View>
        <Text style={[styles.actionText, video.isReposted && { color: '#FFD60A' }]}>
          {formatCount(video.repostsCount ?? 0)}
        </Text>
      </TouchableOpacity>

      {/* Bookmark / Saved Button */}
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleBookmarkPress}>
        <Animated.View style={{ transform: [{ scale: bookmarkAnim }] }}>
          <Ionicons
            name={video.isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={32}
            color={video.isBookmarked ? '#FF9F0A' : '#FFFFFF'}
          />
        </Animated.View>
        <Text style={[styles.actionText, video.isBookmarked && { color: '#FF9F0A' }]}>
          {video.isBookmarked ? 'Saved' : 'Save'}
        </Text>
      </TouchableOpacity>

      {/* Comments Button */}
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={onOpenComments}>
        <MaterialCommunityIcons name="comment-processing" size={34} color="#FFFFFF" />
        <Text style={styles.actionText}>{formatCount(video.commentsCount)}</Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={onShare}>
        <Ionicons name="share-social" size={32} color="#FFFFFF" />
        <Text style={styles.actionText}>{formatCount(video.sharesCount)}</Text>
      </TouchableOpacity>


      {/* Remix / Audio Disc */}
      <TouchableOpacity style={styles.discBtn} activeOpacity={0.8}>
        <View style={styles.discRing}>
          <FontAwesome name="music" size={14} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
    bottom: 40,
    alignItems: 'center',
    gap: 18,
    zIndex: 10,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  discBtn: {
    marginTop: 6,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF0050',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
