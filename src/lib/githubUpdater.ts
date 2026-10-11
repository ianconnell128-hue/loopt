import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Alert } from 'react-native';

export const CURRENT_APP_VERSION = '1.1.6';
export const DEFAULT_GITHUB_REPO = 'ianconnell128-hue/loopt';
export const LOCAL_APK_SERVER = 'http://192.168.1.221:8888/Loopt.apk';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseTitle: string;
  releaseNotes: string;
  apkDownloadUrl: string;
  source: 'github' | 'local_server';
  publishedAt?: string;
}

/**
 * Checks GitHub for the latest release or code updates.
 * Guarantees a direct APK URL so that updates download & install purely inside the app.
 */
export async function checkForAppUpdates(repoIdentifier: string = DEFAULT_GITHUB_REPO): Promise<UpdateInfo> {
  const cleanRepo = repoIdentifier.replace('https://github.com/', '').trim();
  const [owner, repo] = cleanRepo.includes('/') ? cleanRepo.split('/') : ['ianconnell128-hue', cleanRepo || 'loopt'];

  try {
    // 1. Try GitHub Releases API
    const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Loopt-Updater',
      },
    });

    if (releaseRes.ok) {
      const data = await releaseRes.json();
      const tagName = (data.tag_name || 'v1.0.1').replace(/^v/, '');
      const releaseNotes = data.body || 'New code updates and performance improvements from GitHub.';

      // Look for direct .apk asset
      const apkAsset = data.assets?.find((a: any) => a.name?.endsWith('.apk'));
      const apkUrl = apkAsset?.browser_download_url || LOCAL_APK_SERVER;

      return {
        hasUpdate: tagName !== CURRENT_APP_VERSION,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: tagName,
        releaseTitle: data.name || `Release v${tagName}`,
        releaseNotes,
        apkDownloadUrl: apkUrl,
        source: 'github',
        publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString() : undefined,
      };
    }

    // 2. If no release tag, check latest commit on GitHub
    const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Loopt-Updater',
      },
    });

    if (commitsRes.ok) {
      const commits = await commitsRes.json();
      if (Array.isArray(commits) && commits.length > 0) {
        const latestCommit = commits[0];
        const commitMsg = latestCommit.commit?.message || 'Updated code on GitHub';
        const shortSha = latestCommit.sha?.slice(0, 7) || 'latest';

        return {
          hasUpdate: true,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: `git-${shortSha}`,
          releaseTitle: `Latest GitHub Commit (${shortSha})`,
          releaseNotes: commitMsg,
          apkDownloadUrl: LOCAL_APK_SERVER,
          source: 'github',
          publishedAt: latestCommit.commit?.author?.date
            ? new Date(latestCommit.commit.author.date).toLocaleDateString()
            : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('GitHub API check error:', err);
  }

  // 3. Fallback: Network build server
  return {
    hasUpdate: true,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: '1.0.1 (Network Build)',
    releaseTitle: 'Updated Loopt APK Ready',
    releaseNotes: 'Direct update ready to install from your local IP build server.',
    apkDownloadUrl: LOCAL_APK_SERVER,
    source: 'local_server',
  };
}

/**
 * Downloads the APK directly inside the app with a live progress bar,
 * and launches the Android Package Installer directly without opening any web browser.
 */
export async function downloadAndInstallUpdate(
  downloadUrl: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  // Always ensure we are downloading a direct APK file
  const apkUrl = downloadUrl.endsWith('.apk') ? downloadUrl : LOCAL_APK_SERVER;

  if (Platform.OS !== 'android' || !FileSystem.documentDirectory) {
    Alert.alert('In-App Installer', 'In-app installation is supported on Android devices.');
    return;
  }

  const destinationFile = `${FileSystem.documentDirectory}Loopt-update.apk`;

  try {
    // Delete old downloaded update if present
    const fileInfo = await FileSystem.getInfoAsync(destinationFile);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(destinationFile, { idempotent: true });
    }

    // Direct in-app download
    const downloadResumable = FileSystem.createDownloadResumable(
      apkUrl,
      destinationFile,
      {},
      (downloadProgress) => {
        if (downloadProgress.totalBytesExpectedToWrite > 0) {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          if (onProgress && !isNaN(progress)) {
            onProgress(Math.min(100, Math.max(0, Math.round(progress * 100))));
          }
        }
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (result && result.uri) {
      // Obtain FileProvider content URI (content://...)
      const contentUri = await FileSystem.getContentUriAsync(result.uri);

      // FLAG_GRANT_READ_URI_PERMISSION (1) | FLAG_ACTIVITY_NEW_TASK (268435456) | FLAG_ACTIVITY_CLEAR_TOP (67108864)
      try {
        await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
          data: contentUri,
          flags: 1 | 268435456,
        });
      } catch (e) {
        // Fallback to standard VIEW intent
        try {
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            type: 'application/vnd.android.package-archive',
            flags: 1 | 268435456,
          });
        } catch (innerErr: any) {
          // If Android security blocks it because "Install unknown apps" is disabled:
          Alert.alert(
            'Permission Required',
            'To install updates inside Loopt, please enable "Allow from this source" in your phone Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES');
                },
              },
            ]
          );
        }
      }
    } else {
      Alert.alert('Download Error', 'Download did not complete. Please try again.');
    }
  } catch (error: any) {
    console.error('In-app installer error:', error);
    Alert.alert(
      'Installation Notice',
      error?.message || 'Could not launch package installer.'
    );
  }
}
