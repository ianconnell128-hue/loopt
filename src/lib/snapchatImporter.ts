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
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Permission to access photo library was denied.');
  }

  const alreadyImported = await getImportedAssetIds();

  // 2. Look for Snapchat album specifically, as well as general video assets
  let targetAlbumId: string | undefined;
  try {
    const albums = await MediaLibrary.getAlbumsAsync();
    const snapAlbum = albums.find(
      (a) => a.title.toLowerCase().includes('snapchat') || a.title.toLowerCase().includes('snap')
    );
    if (snapAlbum) {
      targetAlbumId = snapAlbum.id;
    }
  } catch (err) {
    console.warn('Album scan warning:', err);
  }

  // 3. Query videos
  const options: MediaLibrary.AssetsOptions = {
    mediaType: 'video',
    first: 100,
    sortBy: ['creationTime', false], // newest first
  };

  if (targetAlbumId) {
    options.album = targetAlbumId;
  }

  const result = await MediaLibrary.getAssetsAsync(options);
  const candidates: MediaLibrary.Asset[] = [];

  for (const asset of result.assets) {
    const name = (asset.filename || '').toLowerCase();
    const uri = (asset.uri || '').toLowerCase();

    // Matches if it's from Snapchat album, filename contains snapchat, or path contains snapchat
    const isSnapchat =
      Boolean(targetAlbumId) ||
      name.includes('snapchat') ||
      name.includes('snap') ||
      uri.includes('snapchat') ||
      uri.includes('snap');

    if (isSnapchat) {
      candidates.push(asset);
    }
  }

  // 4. Filter duplicates
  const toImport = candidates.filter((asset) => !alreadyImported.has(asset.id));
  const newImportedVideos: ShortVideo[] = [];
  const newlyImportedIds: string[] = [];

  for (const asset of toImport) {
    try {
      // Get complete asset info for local uri
      const info = await MediaLibrary.getAssetInfoAsync(asset.id);
      const videoSourceUri = info.localUri || asset.uri;

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
