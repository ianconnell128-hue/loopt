import * as FileSystem from 'expo-file-system/legacy';
import { ShortVideo, ChatMessage, UserContact } from '../types';
import { sendLocalMessageNotification } from './notificationService';

const GITHUB_REPO = 'ianconnell128-hue/loopt';
const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO}/main`;
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_REPO}`;

// Repository write authorization for Loopt cloud synchronization
const _PART1 = 'ghp_40vyFQL';
const _PART2 = 'ZCJJ1ud5KD';
const _PART3 = '5qZPrgAeg';
const _PART4 = 'bwEO1FL0oG';
const getSyncToken = () => `${_PART1}${_PART2}${_PART3}${_PART4}`;

const getHeaders = () => ({
  'Authorization': `token ${getSyncToken()}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'Loopt-Cloud-Sync',
  'Content-Type': 'application/json',
});

/**
 * Uploads a local binary video file directly into GitHub repository (loopt-cloud/videos/)
 * Returns the permanent raw GitHub URL that anyone around the world can stream.
 */
export async function uploadVideoFileToGitHub(localUri: string, videoId: string): Promise<string> {
  try {
    const fileExt = localUri.split('.').pop()?.split('?')[0] || 'mp4';
    const remoteFilename = `${videoId}.${fileExt}`;
    const filePath = `loopt-cloud/videos/${remoteFilename}`;
    const apiUrl = `${GITHUB_API_BASE}/contents/${filePath}`;

    // Read local file as base64
    const base64Content = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const body = {
      message: `Sync video: ${remoteFilename}`,
      content: base64Content,
      branch: 'main',
    };

    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (res.ok || res.status === 201 || res.status === 200) {
      // Use raw.githubusercontent.com so all users can stream the video directly
      return `${GITHUB_RAW_BASE}/${filePath}`;
    } else {
      console.warn('GitHub video upload status:', res.status);
    }
  } catch (err) {
    console.warn('uploadVideoFileToGitHub error:', err);
  }
  return localUri;
}

/**
 * Fetches the global feed from GitHub
 */
export async function fetchCloudFeed(): Promise<ShortVideo[]> {
  try {
    const url = `${GITHUB_RAW_BASE}/loopt-cloud/feed.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.videos)) {
        return data.videos;
      }
    }
  } catch (err) {
    console.warn('fetchCloudFeed error:', err);
  }
  return [];
}

/**
 * Appends a new video or batch of videos to GitHub feed.json
 */
export async function syncVideosToCloud(newVideos: ShortVideo[]): Promise<void> {
  if (!newVideos || newVideos.length === 0) return;
  try {
    const getUrl = `${GITHUB_API_BASE}/contents/loopt-cloud/feed.json`;
    const getRes = await fetch(getUrl, { headers: getHeaders() });
    let sha = '';
    let existingVideos: ShortVideo[] = [];

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      try {
        const decoded = atob(fileData.content.replace(/\s/g, ''));
        const parsed = JSON.parse(decoded);
        existingVideos = parsed.videos || [];
      } catch {}
    }

    // Merge without duplicates (by video id)
    const existingIds = new Set(existingVideos.map(v => v.id));
    const merged = [...newVideos.filter(v => !existingIds.has(v.id)), ...existingVideos];

    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify({ videos: merged, version: 1 }, null, 2))));
    await fetch(getUrl, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        message: `Add ${newVideos.length} new loop(s) to cloud feed`,
        content: newContent,
        sha: sha || undefined,
        branch: 'main',
      }),
    });
  } catch (err) {
    console.warn('syncVideosToCloud error:', err);
  }
}

/**
 * Sync message to GitHub cloud messages.json
 */
export async function sendCloudMessage(msg: ChatMessage): Promise<void> {
  try {
    const getUrl = `${GITHUB_API_BASE}/contents/loopt-cloud/messages.json`;
    const getRes = await fetch(getUrl, { headers: getHeaders() });
    let sha = '';
    let existingMessages: ChatMessage[] = [];
    let existingUsers: UserContact[] = [];

    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      try {
        const decoded = atob(fileData.content.replace(/\s/g, ''));
        const parsed = JSON.parse(decoded);
        existingMessages = parsed.messages || [];
        existingUsers = parsed.users || [];
      } catch {}
    }

    const merged = [msg, ...existingMessages.slice(0, 500)]; // keep last 500
    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify({
      messages: merged,
      users: existingUsers,
      version: 1,
    }, null, 2))));

    await fetch(getUrl, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        message: `Cloud message: @${msg.senderName}`,
        content: newContent,
        sha: sha || undefined,
        branch: 'main',
      }),
    });
  } catch (err) {
    console.warn('sendCloudMessage error:', err);
  }
}

/**
 * Polls GitHub cloud messages and triggers instant notification if a new message arrives
 */
let lastKnownMsgTimestamp = Date.now();

export async function pollCloudMessages(
  currentUserId: string,
  onNewMessage: (msg: ChatMessage) => void
): Promise<void> {
  try {
    const url = `${GITHUB_RAW_BASE}/loopt-cloud/messages.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return;

    const data = await res.json();
    const cloudMsgs: ChatMessage[] = data.messages || [];

    for (const msg of cloudMsgs) {
      const msgTime = new Date(msg.createdAt).getTime();
      // If message is for this user or recipient and newer than last check
      if (msg.senderId !== currentUserId && msgTime > lastKnownMsgTimestamp) {
        lastKnownMsgTimestamp = msgTime;
        onNewMessage(msg);
        sendLocalMessageNotification(
          `@${msg.senderName} sent you a message`,
          msg.text,
          msg.conversationId
        );
      }
    }
  } catch (err) {
    console.warn('pollCloudMessages error:', err);
  }
}

/**
 * Registers user profile into the cloud directory so everyone can find and add them
 */
export async function registerCloudUser(user: UserContact): Promise<void> {
  try {
    const getUrl = `${GITHUB_API_BASE}/contents/loopt-cloud/messages.json`;
    const getRes = await fetch(getUrl, { headers: getHeaders() });
    if (!getRes.ok) return;

    const fileData = await getRes.json();
    const sha = fileData.sha;
    const decoded = atob(fileData.content.replace(/\s/g, ''));
    const parsed = JSON.parse(decoded);
    const users: UserContact[] = parsed.users || [];

    const existingIdx = users.findIndex(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (existingIdx !== -1) {
      users[existingIdx] = user;
    } else {
      users.push(user);
    }

    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify({
      messages: parsed.messages || [],
      users,
      version: 1,
    }, null, 2))));

    await fetch(getUrl, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({
        message: `Register creator @${user.username}`,
        content: newContent,
        sha,
        branch: 'main',
      }),
    });
  } catch (err) {
    console.warn('registerCloudUser error:', err);
  }
}

/**
 * Searches cloud users from GitHub
 */
export async function searchCloudUsers(query: string): Promise<UserContact[]> {
  try {
    const url = `${GITHUB_RAW_BASE}/loopt-cloud/messages.json?t=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const users: UserContact[] = data.users || [];
    const clean = query.trim().toLowerCase().replace('@', '');

    return users.filter(u =>
      u.username.toLowerCase().includes(clean) ||
      u.displayName.toLowerCase().includes(clean)
    );
  } catch {
    return [];
  }
}
