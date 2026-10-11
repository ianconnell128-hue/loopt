export interface ShortVideo {
  id: string;
  title: string;
  description: string;
  videoUri: string;
  creator: {
    id: string;
    username: string;
    avatarUrl: string;
    isFollowed?: boolean;
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
}
