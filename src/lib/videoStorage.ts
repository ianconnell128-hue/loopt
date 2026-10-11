import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const PERMANENT_MEDIA_FOLDER = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}shorts_media/`
  : null;

/**
 * Saves a picked video to permanent app storage so it is never deleted by OS cache cleanup.
 */
export async function saveVideoPermanently(sourceUri: string): Promise<string> {
  // On Web, documentDirectory is not used
  if (Platform.OS === 'web' || !PERMANENT_MEDIA_FOLDER) {
    return sourceUri;
  }

  try {
    // 1. Ensure permanent directory exists
    const dirInfo = await FileSystem.getInfoAsync(PERMANENT_MEDIA_FOLDER);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PERMANENT_MEDIA_FOLDER, { intermediates: true });
    }

    // 2. Generate permanent unique filename
    const extension = sourceUri.split('.').pop()?.split('?')[0] || 'mp4';
    const permanentFileName = `short_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const destinationUri = `${PERMANENT_MEDIA_FOLDER}${permanentFileName}`;

    // 3. Copy from temporary picker cache to permanent documentDirectory
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });

    // 4. Verify file exists
    const verifyInfo = await FileSystem.getInfoAsync(destinationUri);
    if (verifyInfo.exists) {
      console.log('Video saved permanently to:', destinationUri);
      return destinationUri;
    }

    return sourceUri;
  } catch (error) {
    console.warn('Failed to copy video permanently, using original URI:', error);
    return sourceUri;
  }
}
