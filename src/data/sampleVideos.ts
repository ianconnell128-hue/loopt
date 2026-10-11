import { ShortVideo } from '../types';

export const USER_DEFAULT_PROFILE = {
  id: 'my-account',
  username: '@ian',
  displayName: 'Ian',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  bio: 'Welcome to my Shorts channel! 🎬 Uploading daily videos.',
  subscribersCount: 0,
};

export const INITIAL_VIDEOS: ShortVideo[] = [
  {
    id: 'short-1',
    title: 'Glowing emerald streaks & neon clover ✨🍀',
    description: 'Particle animation test in full motion. #glow #particles #vibes',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    creator: {
      id: USER_DEFAULT_PROFILE.id,
      username: USER_DEFAULT_PROFILE.username,
      avatarUrl: USER_DEFAULT_PROFILE.avatarUrl,
    },
    songTitle: 'Original Audio - Ian',
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isLiked: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'short-2',
    title: 'City sunset cruise 🏎️💨',
    description: 'High speed cruise with the evening skyline.',
    videoUri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    creator: {
      id: USER_DEFAULT_PROFILE.id,
      username: USER_DEFAULT_PROFILE.username,
      avatarUrl: USER_DEFAULT_PROFILE.avatarUrl,
    },
    songTitle: 'Original Audio - Ian',
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    isLiked: false,
    createdAt: new Date().toISOString(),
  },
];
