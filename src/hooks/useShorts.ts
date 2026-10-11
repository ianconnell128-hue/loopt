import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShortVideo, UserProfile, CommentItem } from '../types';
import { INITIAL_VIDEOS, USER_DEFAULT_PROFILE } from '../data/sampleVideos';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const VIDEOS_STORAGE_KEY = '@shorts_user_videos_v2';
const PROFILE_STORAGE_KEY = '@shorts_user_profile_v2';
const COMMENTS_STORAGE_PREFIX = '@shorts_comments_v2_';

export function useShorts() {
  const [profile, setProfile] = useState<UserProfile>(USER_DEFAULT_PROFILE);
  const [videos, setVideos] = useState<ShortVideo[]>(INITIAL_VIDEOS);
  const [loading, setLoading] = useState<boolean>(true);

  // Load Profile
  const loadProfile = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Error loading profile:', err);
    }
  }, []);

  // Update Profile
  const updateProfile = async (updated: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updated };
    setProfile(newProfile);
    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
    } catch (err) {
      console.error('Failed to save profile:', err);
    }
  };

  // Load Videos
  const loadVideos = useCallback(async () => {
    try {
      // 1. Check local persistent storage first
      const stored = await AsyncStorage.getItem(VIDEOS_STORAGE_KEY);
      let localList: ShortVideo[] = [];
      if (stored) {
        localList = JSON.parse(stored);
      }

      // 2. If Supabase configured, sync from DB
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const remoteList: ShortVideo[] = data.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description || '',
            videoUri: item.video_url,
            creator: {
              id: profile.id,
              username: profile.username,
              avatarUrl: profile.avatarUrl,
            },
            songTitle: item.song_title || `Original Audio - ${profile.displayName}`,
            likesCount: item.likes_count || 0,
            commentsCount: item.comments_count || 0,
            sharesCount: item.shares_count || 0,
            isLiked: false,
            createdAt: item.created_at,
          }));

          // Merge without duplicates
          const combined = [...localList];
          for (const rem of remoteList) {
            if (!combined.some((v) => v.id === rem.id)) {
              combined.push(rem);
            }
          }
          setVideos(combined.length > 0 ? combined : INITIAL_VIDEOS);
          return;
        }
      }

      // Fallback: If user uploaded videos exist, show them; otherwise show initial
      if (localList.length > 0) {
        setVideos(localList);
      } else {
        setVideos(INITIAL_VIDEOS);
        await AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(INITIAL_VIDEOS));
      }
    } catch (err) {
      console.warn('Error fetching videos:', err);
      setVideos(INITIAL_VIDEOS);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadProfile();
    loadVideos();
  }, [loadProfile, loadVideos]);

  // Persist video list helper
  const saveVideos = async (updatedVideos: ShortVideo[]) => {
    setVideos(updatedVideos);
    try {
      await AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updatedVideos));
    } catch (err) {
      console.error('AsyncStorage saveVideos error:', err);
    }
  };

  // Toggle Like with REAL integers (0 or 1, or exact count)
  const toggleLike = useCallback(
    async (videoId: string) => {
      setVideos((prev) => {
        const updated = prev.map((v) => {
          if (v.id === videoId) {
            const isLiked = !v.isLiked;
            const likesCount = isLiked ? v.likesCount + 1 : Math.max(0, v.likesCount - 1);
            return { ...v, isLiked, likesCount };
          }
          return v;
        });
        AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
        return updated;
      });
    },
    []
  );

  // Increment real share count
  const incrementShare = useCallback(async (videoId: string) => {
    setVideos((prev) => {
      const updated = prev.map((v) => {
        if (v.id === videoId) {
          return { ...v, sharesCount: v.sharesCount + 1 };
        }
        return v;
      });
      AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  // Comments for a specific video
  const getComments = useCallback(async (videoId: string): Promise<CommentItem[]> => {
    try {
      const stored = await AsyncStorage.getItem(COMMENTS_STORAGE_PREFIX + videoId);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const addComment = useCallback(
    async (videoId: string, text: string): Promise<CommentItem> => {
      const currentComments = await getComments(videoId);
      const newComment: CommentItem = {
        id: 'c_' + Date.now(),
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        text: text.trim(),
        createdAt: 'Just now',
        likesCount: 0,
      };
      const updatedComments = [newComment, ...currentComments];
      await AsyncStorage.setItem(
        COMMENTS_STORAGE_PREFIX + videoId,
        JSON.stringify(updatedComments)
      );

      // Update comments count on the video
      setVideos((prev) => {
        const updated = prev.map((v) => {
          if (v.id === videoId) {
            return { ...v, commentsCount: updatedComments.length };
          }
          return v;
        });
        AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
        return updated;
      });

      return newComment;
    },
    [profile, getComments]
  );

  // Upload/Add new video permanently
  const addVideo = async (
    newVideo: Omit<ShortVideo, 'id' | 'likesCount' | 'commentsCount' | 'sharesCount' | 'isLiked' | 'creator'>
  ) => {
    const fullVideo: ShortVideo = {
      ...newVideo,
      id: 'short_' + Date.now(),
      creator: {
        id: profile.id,
        username: profile.username,
        avatarUrl: profile.avatarUrl,
      },
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLiked: false,
      createdAt: new Date().toISOString(),
    };

    // If Supabase configured, upload record to database
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('videos').insert({
          title: fullVideo.title,
          description: fullVideo.description,
          video_url: fullVideo.videoUri,
          username: profile.username,
          avatar_url: profile.avatarUrl,
          song_title: fullVideo.songTitle,
          likes_count: 0,
          comments_count: 0,
          shares_count: 0,
        });
      } catch (err) {
        console.error('Failed to save to Supabase:', err);
      }
    }

    // Save permanently in local state & AsyncStorage
    setVideos((prev) => {
      const updated = [fullVideo, ...prev];
      AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  return {
    profile,
    updateProfile,
    videos,
    loading,
    toggleLike,
    incrementShare,
    getComments,
    addComment,
    addVideo,
    refreshVideos: loadVideos,
  };
}
