import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShortVideo, UserProfile, CommentItem } from '../types';
import { INITIAL_VIDEOS, USER_DEFAULT_PROFILE } from '../data/sampleVideos';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AppSettings } from '../components/SettingsModal';

const VIDEOS_STORAGE_KEY = '@shorts_user_videos_v3';
const PROFILE_STORAGE_KEY = '@shorts_user_profile_v3';
const COMMENTS_STORAGE_PREFIX = '@shorts_comments_v3_';
const SETTINGS_STORAGE_KEY = '@shorts_app_settings_v3';

const DEFAULT_SETTINGS: AppSettings = {
  isDarkMode: true,
  autoplaySound: true,
  defaultFitMode: 'cover',
};

export function useShorts() {
  const [profile, setProfile] = useState<UserProfile>(USER_DEFAULT_PROFILE);
  const [videos, setVideos] = useState<ShortVideo[]>(INITIAL_VIDEOS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  // Load Settings
  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (err) {
      console.warn('Error loading settings:', err);
    }
  }, []);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

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

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

  // Load Videos
  const loadVideos = useCallback(async () => {
    try {
      // 1. Check local persistent storage first
      const stored = await AsyncStorage.getItem(VIDEOS_STORAGE_KEY);
      let localList: ShortVideo[] = [];
      if (stored) {
        localList = JSON.parse(stored);
        // Clean out any legacy sample videos (short-1, short-2)
        localList = localList.filter((v) => v.id !== 'short-1' && v.id !== 'short-2');
        await AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(localList));
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

          const combined = [...localList];
          for (const rem of remoteList) {
            if (!combined.some((v) => v.id === rem.id)) {
              combined.push(rem);
            }
          }
          const baseList = combined.length > 0 ? combined : INITIAL_VIDEOS;
          setVideos(shuffleArray(baseList));
          return;
        }
      }

      // Fallback
      if (localList.length > 0) {
        setVideos(shuffleArray(localList));
      } else {
        setVideos(shuffleArray(INITIAL_VIDEOS));
        await AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(INITIAL_VIDEOS));
      }
    } catch (err) {
      console.warn('Error fetching videos:', err);
      setVideos(shuffleArray(INITIAL_VIDEOS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadProfile();
    loadVideos();
  }, [loadSettings, loadProfile, loadVideos]);


  // Toggle Like with REAL integers
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

  // Toggle real repost state & count
  const toggleRepost = useCallback(async (videoId: string) => {
    setVideos((prev) => {
      const updated = prev.map((v) => {
        if (v.id === videoId) {
          const isReposted = !v.isReposted;
          const currentCount = v.repostsCount ?? 0;
          const repostsCount = isReposted ? currentCount + 1 : Math.max(0, currentCount - 1);
          return { ...v, isReposted, repostsCount };
        }
        return v;
      });
      AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  // Toggle bookmark / saved video state
  const toggleBookmark = useCallback(async (videoId: string) => {
    setVideos((prev) => {
      const updated = prev.map((v) => {
        if (v.id === videoId) {
          return { ...v, isBookmarked: !v.isBookmarked };
        }
        return v;
      });
      AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);


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

  // Comments for a specific video - 100% REAL comments only
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

    setVideos((prev) => {
      const updated = [fullVideo, ...prev];
      AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  // Add multiple videos at once (e.g. from Snapchat batch import)
  const addBatchVideos = async (newVideos: ShortVideo[]) => {
    if (!newVideos || newVideos.length === 0) return;
    setVideos((prev) => {
      const updated = [...newVideos, ...prev];
      AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  // Reset all dummy/test data to clean slate
  const resetAllTestData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const purgeKeys = keys.filter(
        (k) => k.startsWith('@shorts_comments') || k.startsWith('@shorts_user_videos')
      );
      for (const k of purgeKeys) {
        await AsyncStorage.removeItem(k);
      }
      setVideos(INITIAL_VIDEOS);
      await AsyncStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(INITIAL_VIDEOS));
    } catch (err) {
      console.warn('Purge error:', err);
    }
  };

  // Infinite scroll generator: shuffles a new batch of videos with unique IDs and appends them
  const isAppendingRef = useRef(false);

  const appendMoreShuffledVideos = useCallback(() => {
    if (isAppendingRef.current) return;
    isAppendingRef.current = true;

    setVideos((prev) => {
      // Don't duplicate if less than 2 videos or already large list
      if (prev.length === 0 || prev.length > 50) {
        isAppendingRef.current = false;
        return prev;
      }
      // Extract unique base videos from existing list
      const uniqueMap = new Map<string, ShortVideo>();
      for (const v of prev) {
        const rawKey = v.videoUri || v.title;
        if (!uniqueMap.has(rawKey)) {
          uniqueMap.set(rawKey, v);
        }
      }
      const pool = Array.from(uniqueMap.values());
      const shuffledBatch = shuffleArray(pool).map((v) => ({
        ...v,
        id: `${v.id}_loop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      }));

      setTimeout(() => {
        isAppendingRef.current = false;
      }, 500);

      return [...prev, ...shuffledBatch];
    });
  }, []);


  return {
    profile,
    updateProfile,
    videos,
    loading,
    settings,
    updateSettings,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    incrementShare,
    getComments,
    addComment,
    addVideo,
    addBatchVideos,
    resetAllTestData,
    appendMoreShuffledVideos,

    refreshVideos: loadVideos,
  };
}

