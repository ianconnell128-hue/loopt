import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

export const CURRENT_APP_VERSION = '1.0.0';
export const DEFAULT_GITHUB_REPO = 'thundergeek/shorts-app';
export const LOCAL_APK_SERVER = 'http://192.168.1.221:8888/ShortsApp.apk';

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
 * Checks GitHub for the latest release or code updates
 */
export async function checkForAppUpdates(repoIdentifier: string = DEFAULT_GITHUB_REPO): Promise<UpdateInfo> {
  const cleanRepo = repoIdentifier.replace('https://github.com/', '').trim();
  const [owner, repo] = cleanRepo.includes('/') ? cleanRepo.split('/') : ['thundergeek', cleanRepo || 'shorts-app'];

  try {
    // 1. Try GitHub Releases API first
    const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ShortsApp-Updater',
      },
    });

    if (releaseRes.ok) {
      const data = await releaseRes.json();
      const tagName = (data.tag_name || 'v1.0.1').replace(/^v/, '');
      const releaseNotes = data.body || 'New code updates and performance improvements from GitHub.';
      
      // Look for .apk asset
      const apkAsset = data.assets?.find((a: any) => a.name?.endsWith('.apk'));
      const apkUrl = apkAsset?.browser_download_url || `${data.html_url || `https://github.com/${owner}/${repo}/releases`}`;

      return {
        hasUpdate: tagName !== CURRENT_APP_VERSION,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: tagName,
        releaseTitle: data.name || `Release v${tagName}`,
        releaseNotes,
        apkDownloadUrl: apkUrl || LOCAL_APK_SERVER,
        source: 'github',
        publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString() : undefined,
      };
    }

    // 2. If no official release tag yet, check latest commit on GitHub
    const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ShortsApp-Updater',
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
    console.warn('GitHub API check failed, falling back to local server check:', err);
  }

  // 3. Fallback: Local Server check
  return {
    hasUpdate: true,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: '1.0.1 (Network Build)',
    releaseTitle: 'Updated APK on Network Server',
    releaseNotes: 'Direct update ready to install from your local IP build server.',
    apkDownloadUrl: LOCAL_APK_SERVER,
    source: 'local_server',
  };
}

/**
 * Downloads the APK and prompts Android to install the update
 */
export async function downloadAndInstallUpdate(
  downloadUrl: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  // If download URL is an HTML webpage, open directly in system browser
  if (!downloadUrl.endsWith('.apk') && !downloadUrl.includes('/ShortsApp.apk')) {
    await Linking.openURL(downloadUrl);
    return;
  }

  // If on non-Android (e.g. web/iOS), open download link directly
  if (Platform.OS !== 'android' || !FileSystem.documentDirectory) {
    await Linking.openURL(downloadUrl);
    return;
  }

  const destinationFile = `${FileSystem.documentDirectory}ShortsApp-update.apk`;

  try {
    // Delete previous downloaded update if exists
    const fileInfo = await FileSystem.getInfoAsync(destinationFile);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(destinationFile, { idempotent: true });
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      destinationFile,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress && !isNaN(progress)) {
          onProgress(Math.min(100, Math.max(0, Math.round(progress * 100))));
        }
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (result && result.uri) {
      // Get content URI from FileSystem for Android package installer
      const contentUri = await FileSystem.getContentUriAsync(result.uri);

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });
    } else {
      // Fallback
      await Linking.openURL(downloadUrl);
    }
  } catch (error) {
    console.warn('In-app installer error, launching browser download fallback:', error);
    await Linking.openURL(downloadUrl);
  }
}
