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
  PanResponder,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ShortVideo } from '../types';

import { SideActions } from './SideActions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShortCardProps {
  video: ShortVideo;
  isActive: boolean;
  itemHeight: number;
  onLike: () => void;
  onRepost: () => void;
  onBookmark: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  onSwipeLeftToProfile?: () => void;
  onSwipeRightToPrevious?: () => void;
}

export const ShortCard: React.FC<ShortCardProps> = ({
  video,
  isActive,
  itemHeight,
  onLike,
  onRepost,
  onBookmark,
  onOpenComments,
  onShare,
  onSwipeLeftToProfile,
  onSwipeRightToPrevious,
}) => {

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showPlayIcon, setShowPlayIcon] = useState<boolean>(false);
  const [contentFitMode, setContentFitMode] = useState<'cover' | 'contain'>('contain');
  const [isVideoLandscape, setIsVideoLandscape] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  // Double-tap heart animation
  const lastTapRef = useRef<number>(0);
  const heartAnim = useRef(new Animated.Value(0)).current;

  // Initialize expo-video player
  const player = useVideoPlayer(video.videoUri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  // Listen to video track & source metadata to detect aspect ratio
  useEffect(() => {
    const handleTracks = (tracks: any[]) => {
      if (tracks && tracks.length > 0) {
        const primary = tracks[0];
        if (primary?.size?.width && primary?.size?.height) {
          const isLandscape = primary.size.width > primary.size.height;
          setIsVideoLandscape(isLandscape);
          setContentFitMode(isLandscape ? 'contain' : 'cover');
        }
      }
    };

    const sub1 = player.addListener('sourceLoad', (payload: any) => {
      if (payload?.availableVideoTracks) {
        handleTracks(payload.availableVideoTracks);
      }
    });

    const sub2 = player.addListener('videoTrackChange', (payload: any) => {
      if (payload?.videoTrack?.size) {
        const { width, height } = payload.videoTrack.size;
        if (width && height) {
          const isLandscape = width > height;
          setIsVideoLandscape(isLandscape);
          setContentFitMode(isLandscape ? 'contain' : 'cover');
        }
      }
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [player]);

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

  // Dedicated single tap timer to cleanly separate single-tap pause from double-tap like
  const tapTimerRef = useRef<any>(null);


  const togglePlayPause = () => {
    try {
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
        setShowPlayIcon(true);
      } else {
        player.play();
        setIsPlaying(true);
        setShowPlayIcon(false);
      }
    } catch (err) {
      console.warn('Error toggling play/pause:', err);
    }
  };


  // PanResponder handling both taps (single/double) and horizontal swipes
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: (evt) => {
        touchStartRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY,
          time: Date.now(),
        };
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        const now = Date.now();
        const duration = now - touchStartRef.current.time;
        const distance = Math.sqrt(dx * dx + gestureState.dy * gestureState.dy);

        // Check horizontal swipe
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(gestureState.dy) * 1.2) {
          if (dx < -40 || vx < -0.4) {
            // Swipe Left -> Profile
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch {}
            onSwipeLeftToProfile?.();
            return;
          } else if (dx > 40 || vx > 0.4) {
            // Swipe Right -> Previous
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
            onSwipeRightToPrevious?.();
            return;
          }
        }

        // Tap handling if no major drag occurred
        if (distance < 20 && duration < 350) {
          const DOUBLE_TAP_GAP = 280;
          const touchX = evt.nativeEvent.locationX;

          if (now - lastTapRef.current < DOUBLE_TAP_GAP) {
            if (tapTimerRef.current) {
              clearTimeout(tapTimerRef.current);
              tapTimerRef.current = null;
            }

            if (touchX < SCREEN_WIDTH * 0.3) {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                player.seekBy(-5);
              } catch {}
            } else if (touchX > SCREEN_WIDTH * 0.7) {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                player.seekBy(5);
              } catch {}
            } else {
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {}
              if (!video.isLiked) {
                onLike();
              }
              triggerHeartAnimation();
            }
            lastTapRef.current = 0;
          } else {
            lastTapRef.current = now;
            if (tapTimerRef.current) {
              clearTimeout(tapTimerRef.current);
            }
            tapTimerRef.current = setTimeout(() => {
              togglePlayPause();
              tapTimerRef.current = null;
            }, 200);
          }
        }
      },
    })
  ).current;

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
    <View
      style={[styles.container, { height: itemHeight }]}
      {...panResponder.panHandlers}
    >
        {/* Fullscreen Video View */}
        <VideoView
          style={styles.videoView}
          player={player}
          contentFit={contentFitMode}
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

        {/* Right Side Buttons (Like, Repost, Bookmark, Comments, Share, Disc) */}
        <SideActions
          video={video}
          onLike={onLike}
          onRepost={onRepost}
          onBookmark={onBookmark}
          onOpenComments={onOpenComments}
          onShare={onShare}
        />


        {/* Bottom Overlay Info (Creator, Title, Caption, Audio) */}
        <View style={styles.bottomInfoContainer}>
          {/* Creator handle */}
          <View style={styles.creatorRow}>
            <Image source={{ uri: video.creator.avatarUrl }} style={styles.avatar} />
            <Text style={styles.username}>{video.creator.username}</Text>
            <View style={styles.creatorBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#FFD60A" />
              <Text style={styles.creatorBadgeText}>Channel Owner</Text>
            </View>
          </View>

          {/* Title & Caption */}
          {video.title ? <Text style={styles.titleText}>{video.title}</Text> : null}
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
  fitToggleBtn: {
    position: 'absolute',
    top: 60,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 15,
  },
  fitToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  creatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(62, 166, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(62, 166, 255, 0.3)',
  },
  creatorBadgeText: {
    color: '#FFD60A',
    fontSize: 11,
    fontWeight: '700',
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
