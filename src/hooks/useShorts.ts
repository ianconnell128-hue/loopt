import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShortVideo, CommentItem } from '../types';
import { INITIAL_VIDEOS } from '../data/sampleVideos';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEY = '@shorts_user_videos';

export function useShorts() {
  const [videos, setVideos] = useState<ShortVideo[]>(INITIAL_VIDEOS);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Load videos
  const loadVideos = useCallback(async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: ShortVideo[] = data.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description || '',
            videoUri: item.video_url,
            creator: {
              id: item.user_id || 'creator-anon',
              username: item.username || '@anonymous',
              avatarUrl: item.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            },
            songTitle: item.song_title || 'Original Sound',
            likesCount: item.likes_count || 0,
            commentsCount: item.comments_count || 0,
            sharesCount: item.shares_count || 0,
            isLiked: false,
          }));
          setVideos([...mapped, ...INITIAL_VIDEOS]);
          return;
        }
      }

      // Fallback: Local persistent storage
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setVideos([...parsed, ...INITIAL_VIDEOS]);
      } else {
        setVideos(INITIAL_VIDEOS);
      }
    } catch (err) {
      console.warn('Error fetching videos:', err);
      setVideos(INITIAL_VIDEOS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  // Toggle Like
  const toggleLike = useCallback((videoId: string) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId) {
          const isLiked = !v.isLiked;
          const likesCount = isLiked ? v.likesCount + 1 : Math.max(0, v.likesCount - 1);
          return { ...v, isLiked, likesCount };
        }
        return v;
      })
    );
  }, []);

  // Upload/Add new video
  const addVideo = async (newVideo: Omit<ShortVideo, 'id' | 'likesCount' | 'commentsCount' | 'sharesCount' | 'isLiked'>) => {
    const fullVideo: ShortVideo = {
      ...newVideo,
      id: 'short-' + Date.now(),
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    };

    // If Supabase configured, upload to DB
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('videos').insert({
          title: fullVideo.title,
          description: fullVideo.description,
          video_url: fullVideo.videoUri,
          username: fullVideo.creator.username,
          avatar_url: fullVideo.creator.avatarUrl,
          song_title: fullVideo.songTitle,
        });
      } catch (err) {
        console.error('Failed to save to Supabase:', err);
      }
    }

    // Save locally to AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing: ShortVideo[] = stored ? JSON.parse(stored) : [];
      const updated = [fullVideo, ...existing];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('AsyncStorage error:', err);
    }

    // Prepend to current feed immediately
    setVideos((prev) => [fullVideo, ...prev]);
  };

  return {
    videos,
    loading,
    refreshing,
    onRefresh,
    toggleLike,
    addVideo,
  };
}
