import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  checkForAppUpdates,
  downloadAndInstallUpdate,
  UpdateInfo,
  CURRENT_APP_VERSION,
  DEFAULT_GITHUB_REPO,
} from '../lib/githubUpdater';

interface UpdateModalProps {
  visible: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  onClose,
  isDarkMode = true,
}) => {
  const [repoInput, setRepoInput] = useState<string>(DEFAULT_GITHUB_REPO);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const performCheck = async (repoName: string) => {
    setIsChecking(true);
    try {
      const info = await checkForAppUpdates(repoName);
      setUpdateInfo(info);
    } catch (err) {
      console.warn('Update check failed:', err);
      Alert.alert('Update Check', 'Could not check for updates. Make sure you are connected to the network.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (visible) {
      performCheck(repoInput);
    } else {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [visible]);

  const handleStartUpdate = async () => {
    if (!updateInfo?.apkDownloadUrl) {
      Alert.alert('No Download URL', 'Could not find a valid download link for this update.');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      await downloadAndInstallUpdate(updateInfo.apkDownloadUrl, (percent) => {
        setDownloadProgress(percent);
      });
    } catch (err) {
      console.error('Download update failed:', err);
      Alert.alert('Download Error', 'Could not download or install update. Try opening in browser.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, !isDarkMode && styles.sheetLight]}>
          {/* Header */}
          <View style={[styles.header, !isDarkMode && styles.headerLight]}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <View style={styles.titleWithIcon}>
                <Ionicons name="cloud-download-outline" size={22} color="#FF9F0A" />
                <Text style={[styles.title, !isDarkMode && styles.titleLight]}>
                  Loopt Updates & GitHub Sync
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#FFF' : '#111'} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Version Badge Bar */}
            <View style={[styles.versionBar, !isDarkMode && styles.versionBarLight]}>
              <View>
                <Text style={styles.versionLabel}>INSTALLED VERSION</Text>
                <Text style={[styles.versionVal, !isDarkMode && styles.versionValLight]}>
                  v{CURRENT_APP_VERSION}
                </Text>
              </View>
              <View style={styles.divider} />
              <View>
                <Text style={styles.versionLabel}>LATEST ON GITHUB</Text>
                <Text style={[styles.versionVal, { color: '#FFD60A' }]}>
                  {updateInfo?.latestVersion || 'Checking...'}
                </Text>
              </View>
            </View>

            {/* GitHub Repo Input */}
            <Text style={styles.sectionHeading}>GITHUB REPOSITORY</Text>
            <View style={[styles.repoInputRow, !isDarkMode && styles.repoInputRowLight]}>
              <Feather name="github" size={18} color={isDarkMode ? '#AAA' : '#555'} />
              <TextInput
                style={[styles.repoInput, !isDarkMode && styles.repoInputLight]}
                value={repoInput}
                onChangeText={setRepoInput}
                placeholder="owner/repo-name"
                placeholderTextColor="#777"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => performCheck(repoInput)}
                disabled={isChecking}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="sync" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>

            {/* What's New / Release Info Card */}
            {updateInfo && (
              <View style={[styles.infoCard, !isDarkMode && styles.infoCardLight]}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="git-commit-outline" size={18} color="#FF9F0A" />
                  <Text style={[styles.releaseTitle, !isDarkMode && styles.releaseTitleLight]}>
                    {updateInfo.releaseTitle}
                  </Text>
                </View>
                {updateInfo.publishedAt ? (
                  <Text style={styles.releaseDate}>Updated: {updateInfo.publishedAt}</Text>
                ) : null}
                <Text style={[styles.releaseNotes, !isDarkMode && styles.releaseNotesLight]}>
                  {updateInfo.releaseNotes}
                </Text>
              </View>
            )}

            {/* Download Progress Bar */}
            {isDownloading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>Downloading APK...</Text>
                  <Text style={styles.progressPercent}>{downloadProgress}%</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (isChecking || isDownloading) && styles.primaryBtnDisabled,
              ]}
              disabled={isChecking || isDownloading}
              onPress={handleStartUpdate}
            >
              {isDownloading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.btnText}>Downloading APK ({downloadProgress}%)...</Text>
                </View>
              ) : isChecking ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.btnText}>Checking GitHub...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons name="arrow-down-circle" size={20} color="#FFF" />
                  <Text style={styles.btnText}>Download & Install Update</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, !isDarkMode && styles.secondaryBtnLight]}
              onPress={() => performCheck(repoInput)}
            >
              <Text style={[styles.secondaryBtnText, !isDarkMode && styles.secondaryBtnTextLight]}>
                Re-check GitHub Code
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetLight: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    alignItems: 'center',
  },
  headerLight: {
    borderBottomColor: '#E5E5EA',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    marginBottom: 10,
  },
  titleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  titleLight: {
    color: '#000000',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  versionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#2C2C2E',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  versionBarLight: {
    backgroundColor: '#F2F2F7',
  },
  versionLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  versionVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  versionValLight: {
    color: '#000000',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#444',
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  repoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  repoInputRowLight: {
    backgroundColor: '#F2F2F7',
  },
  repoInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  repoInputLight: {
    color: '#000',
  },
  refreshBtn: {
    backgroundColor: '#FF9F0A',
    padding: 8,
    borderRadius: 8,
  },
  infoCard: {
    backgroundColor: '#2C2C2E',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoCardLight: {
    backgroundColor: '#F2F2F7',
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  releaseTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  releaseTitleLight: {
    color: '#000000',
  },
  releaseDate: {
    color: '#8E8E93',
    fontSize: 11,
    marginBottom: 8,
  },
  releaseNotes: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
  },
  releaseNotesLight: {
    color: '#333333',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  progressPercent: {
    color: '#FFD60A',
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF9F0A',
    borderRadius: 4,
  },
  primaryBtn: {
    backgroundColor: '#FF9F0A',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnDisabled: {
    backgroundColor: '#555',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#2C2C2E',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryBtnLight: {
    backgroundColor: '#F2F2F7',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryBtnTextLight: {
    color: '#000000',
  },
});
