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
  repostsCount?: number;
  isLiked?: boolean;
  isReposted?: boolean;
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

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface ChatConversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
}

