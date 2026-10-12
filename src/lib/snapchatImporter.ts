import * as MediaLibrary from 'expo-media-library/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShortVideo } from '../types';
import { saveVideoPermanently } from './videoStorage';

const IMPORTED_SNAPCHAT_IDS_KEY = '@loopt_imported_snapchat_video_ids_v1';

export interface SnapchatScanResult {
  totalScanned: number;
  newImportedCount: number;
  importedVideos: ShortVideo[];
  skippedCount: number;
}

/**
 * Checks for already imported Snapchat asset IDs so the app NEVER posts duplicates.
 */
async function getImportedAssetIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(IMPORTED_SNAPCHAT_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    }
  } catch (err) {
    console.warn('Could not read imported snapchat ids:', err);
  }
  return new Set();
}

async function markAssetsImported(newIds: string[]): Promise<void> {
  try {
    const current = await getImportedAssetIds();
    for (const id of newIds) {
      current.add(id);
    }
    await AsyncStorage.setItem(
      IMPORTED_SNAPCHAT_IDS_KEY,
      JSON.stringify(Array.from(current))
    );
  } catch (err) {
    console.error('Failed to save imported snapchat ids:', err);
  }
}

/**
 * Asks for permission to access camera roll, scans for Snapchat videos
 * (from the Snapchat album or matching snapchat filenames/watermarks),
 * deduplicates against already posted videos, permanently saves them to Loopt media storage,
 * and adds them to the feed.
 */
export async function importSnapchatVideos(
  userProfile: { id: string; username: string; avatarUrl: string }
): Promise<SnapchatScanResult> {
  // 1. Request camera roll permission
  let perm = await MediaLibrary.getPermissionsAsync();
  if (!perm.granted) {
    perm = await MediaLibrary.requestPermissionsAsync();
  }
  if (!perm.granted) {
    throw new Error('Permission to access photos and videos was denied. Tap "Open Settings" below to allow access in Android App Permissions.');
  }

  const alreadyImported = await getImportedAssetIds();

  // 2. Look for Snapchat albums (Android stores in "Snapchat", "Snapchat Export", "Movies/Snapchat", "Pictures/Snapchat", "DCIM/Snapchat")
  const targetAlbumIds: string[] = [];
  try {
    const albums = await MediaLibrary.getAlbumsAsync();
    if (Array.isArray(albums)) {
      for (const a of albums) {
        if (!a?.title) continue;
        const lowerTitle = a.title.toLowerCase();
        if (
          lowerTitle.includes('snapchat') ||
          lowerTitle.includes('snap') ||
          lowerTitle === 'memories' ||
          lowerTitle.includes('stories')
        ) {
          targetAlbumIds.push(a.id);
        }
      }
    }
  } catch (err) {
    console.warn('Album scan warning:', err);
  }

  // 3. Query videos from all matching Snapchat albums first
  const candidates: MediaLibrary.Asset[] = [];
  for (const albumId of targetAlbumIds) {
    try {
      const snapResult = await MediaLibrary.getAssetsAsync({
        album: albumId,
        mediaType: 'video',
        first: 200,
        sortBy: ['creationTime', false],
      });
      if (snapResult?.assets) {
        for (const asset of snapResult.assets) {
          if (!candidates.some((c) => c.id === asset.id)) {
            candidates.push(asset);
          }
        }
      }
    } catch (e) {
      console.warn('Album asset query error:', e);
    }
  }

  // 4. Query recent videos across the device (first 250) and inspect filename/uri/metadata
  try {
    const generalResult = await MediaLibrary.getAssetsAsync({
      mediaType: 'video',
      first: 250,
      sortBy: ['creationTime', false],
    });

    if (generalResult?.assets) {
      for (const asset of generalResult.assets) {
        if (candidates.some((c) => c.id === asset.id)) continue;

        const name = (asset.filename || '').toLowerCase();
        const uri = (asset.uri || '').toLowerCase();

        // Android Snapchat filename patterns:
        // Snapchat-xxxx.mp4, snap_xxxx.mp4, Snap-xxxx.mp4, VID_xxxx_snapchat.mp4, or contained in Snapchat folder
        const isSnapchatNamed =
          name.includes('snapchat') ||
          name.includes('snap') ||
          uri.includes('snapchat') ||
          uri.includes('/snap') ||
          uri.includes('memories');

        // Also check if duration is typical Snapchat clip (between 1 and 65 seconds)
        // and has portrait orientation (height > width)
        const isPortraitShort =
          asset.duration &&
          asset.duration > 0 &&
          asset.duration <= 65 &&
          asset.height &&
          asset.width &&
          asset.height > asset.width;

        if (isSnapchatNamed || (targetAlbumIds.length === 0 && isPortraitShort)) {
          candidates.push(asset);
        }
      }
    }
  } catch (queryErr) {
    console.warn('General asset query error:', queryErr);
  }


  // 4. Filter duplicates
  const toImport = candidates.filter((asset) => !alreadyImported.has(asset.id));
  const newImportedVideos: ShortVideo[] = [];
  const newlyImportedIds: string[] = [];

  for (const asset of toImport) {
    try {
      // Get complete asset info for local uri
      let videoSourceUri = asset.uri;
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset.id);
        if (info?.localUri) {
          videoSourceUri = info.localUri;
        }
      } catch (infoErr) {
        console.warn('getAssetInfoAsync warning, falling back to asset.uri:', infoErr);
      }

      // Copy permanently into Loopt's private documentDirectory/shorts_media/ so it stays forever
      const permanentUri = await saveVideoPermanently(videoSourceUri);


      // Clean title from asset filename or date
      const cleanTitle = asset.filename
        ? asset.filename.replace(/\.[^/.]+$/, '').replace(/snapchat[_-]?/i, 'Snap ')
        : 'Snapchat Loop';

      const shortItem: ShortVideo = {
        id: 'snap_' + asset.id + '_' + Date.now(),
        title: cleanTitle,
        description: 'Imported from Snapchat Memories #snapchat #loop',
        videoUri: permanentUri,
        creator: {
          id: userProfile.id,
          username: userProfile.username,
          avatarUrl: userProfile.avatarUrl,
        },
        songTitle: 'Original Audio - Snapchat',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        repostsCount: 0,
        isLiked: false,
        isReposted: false,
        createdAt: new Date(asset.creationTime || Date.now()).toISOString(),
      };

      newImportedVideos.push(shortItem);
      newlyImportedIds.push(asset.id);
    } catch (importErr) {
      console.warn('Failed to import video asset:', asset.id, importErr);
    }
  }

  // Save new imported IDs so they are never posted again
  if (newlyImportedIds.length > 0) {
    await markAssetsImported(newlyImportedIds);
  }

  return {
    totalScanned: candidates.length,
    newImportedCount: newImportedVideos.length,
    importedVideos: newImportedVideos,
    skippedCount: candidates.length - newImportedVideos.length,
  };
}
