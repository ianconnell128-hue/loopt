export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  subscribersCount: number;
}

export interface ShortVideo {
  id: string;
  title: string;
  description: string;
  videoUri: string;
  creator: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  songTitle?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked?: boolean;
  createdAt?: string;
}

export interface CommentItem {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}
