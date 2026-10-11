import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { ShortVideo } from '../types';
import { SideActions } from './SideActions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShortCardProps {
  video: ShortVideo;
  isActive: boolean;
  itemHeight: number;
  onLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
}

export const ShortCard: React.FC<ShortCardProps> = ({
  video,
  isActive,
  itemHeight,
  onLike,
  onOpenComments,
  onShare,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showPlayIcon, setShowPlayIcon] = useState<boolean>(false);
  const [isFollowed, setIsFollowed] = useState<boolean>(video.creator.isFollowed || false);
  const [expanded, setExpanded] = useState<boolean>(false);

  // Double-tap heart animation
  const lastTapRef = useRef<number>(0);
  const heartAnim = useRef(new Animated.Value(0)).current;

  // Initialize expo-video player
  const player = useVideoPlayer(video.videoUri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  // Play / pause automatically based on viewport presence
  useEffect(() => {
    if (isActive) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [isActive, player]);

  // Handle tap / double tap
  const handleCardPress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap triggered
      if (!video.isLiked) {
        onLike();
      }
      triggerHeartAnimation();
    } else {
      // Single tap -> toggle play/pause
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
        setShowPlayIcon(true);
      } else {
        player.play();
        setIsPlaying(true);
        setShowPlayIcon(false);
      }
    }
    lastTapRef.current = now;
  };

  const triggerHeartAnimation = () => {
    heartAnim.setValue(0);
    Animated.sequence([
      Animated.spring(heartAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnim, {
        toValue: 0,
        duration: 350,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableWithoutFeedback onPress={handleCardPress}>
      <View style={[styles.container, { height: itemHeight }]}>
        {/* Fullscreen Video View */}
        <VideoView
          style={styles.videoView}
          player={player}
          contentFit="cover"
          nativeControls={false}
          surfaceType="textureView"
        />

        {/* Play / Pause indicator icon */}
        {showPlayIcon && (
          <View style={styles.centerIconOverlay} pointerEvents="none">
            <Ionicons name="play" size={72} color="rgba(255, 255, 255, 0.75)" />
          </View>
        )}

        {/* Double Tap Heart Pop */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.centerHeart,
            {
              opacity: heartAnim,
              transform: [
                {
                  scale: heartAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1.3],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="heart" size={110} color="#FF2D55" />
        </Animated.View>

        {/* Right Side Buttons (Like, Comments, Share, Disc) */}
        <SideActions
          video={video}
          onLike={onLike}
          onOpenComments={onOpenComments}
          onShare={onShare}
        />

        {/* Bottom Overlay Info (Creator, Title, Caption, Audio) */}
        <View style={styles.bottomInfoContainer}>
          {/* Creator handle & Follow button */}
          <View style={styles.creatorRow}>
            <Image source={{ uri: video.creator.avatarUrl }} style={styles.avatar} />
            <Text style={styles.username}>{video.creator.username}</Text>
            <TouchableOpacity
              style={[styles.followBtn, isFollowed && styles.followedBtn]}
              onPress={() => setIsFollowed(!isFollowed)}
            >
              <Text style={[styles.followText, isFollowed && styles.followedText]}>
                {isFollowed ? 'Following' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Title & Caption */}
          <Text style={styles.titleText}>{video.title}</Text>
          {video.description ? (
            <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.9}>
              <Text
                style={styles.descriptionText}
                numberOfLines={expanded ? undefined : 2}
              >
                {video.description}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* Audio Tag */}
          <View style={styles.audioRow}>
            <Ionicons name="musical-notes" size={15} color="#fff" />
            <Text style={styles.audioText} numberOfLines={1}>
              {video.songTitle || 'Original Audio'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  videoView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  centerIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  centerHeart: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  bottomInfoContainer: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 24,
    zIndex: 9,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    marginRight: 10,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  followBtn: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  followedBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  followText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  followedText: {
    color: '#E0E0E0',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  descriptionText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  audioText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.9,
  },
});
