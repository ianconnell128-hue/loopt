import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ShortVideo } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { saveVideoPermanently } from '../lib/videoStorage';
import { importSnapchatVideos } from '../lib/snapchatImporter';
import { uploadVideoFileToGitHub, syncVideosToCloud } from '../lib/cloudSync';

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (video: {
    title: string;
    description: string;
    videoUri: string;
    songTitle?: string;
  }) => void;
  onBatchImport?: (videos: ShortVideo[]) => void;
  userProfile?: { id: string; username: string; avatarUrl: string };
  isDarkMode?: boolean;
  isEmbedded?: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  onClose,
  onUploadSuccess,
  onBatchImport,
  userProfile = { id: 'my-account', username: '@ian', avatarUrl: '' },
  isDarkMode = true,
  isEmbedded = false,
}) => {
  const [selectedUris, setSelectedUris] = useState<string[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [songTitle, setSongTitle] = useState<string>('Original Audio - You');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isImportingSnapchat, setIsImportingSnapchat] = useState<boolean>(false);

  const currentPreviewUri = selectedUris[activePreviewIndex] || '';
  const previewPlayer = useVideoPlayer(currentPreviewUri, (player) => {
    player.loop = true;
  });

  const handlePickVideos = async () => {
    try {
      // Modern Android Photo Picker does not require runtime permissions.
      // We attempt to open the system picker directly.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map(a => a.uri);
        setSelectedUris(uris);
        setActivePreviewIndex(0);
      }
    } catch (err) {
      console.warn('Direct picker attempted, checking permissions fallback:', err);
      // Fallback: Check permissions and provide direct 1-tap Settings button
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Permission Required',
            'Loopt needs access to your videos. Tap "Open Settings" to enable Photos & Videos in App Permissions.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings().catch(() => {});
                },
              },
            ]
          );
          return;
        }

        const retryResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['videos'],
          allowsMultipleSelection: true,
          allowsEditing: false,
          quality: 1,
        });

        if (!retryResult.canceled && retryResult.assets && retryResult.assets.length > 0) {
          const uris = retryResult.assets.map(a => a.uri);
          setSelectedUris(uris);
          setActivePreviewIndex(0);
        }
      } catch (fallbackErr) {
        console.error('Picker error:', fallbackErr);
        Alert.alert(
          'Permission Required',
          'Please allow video access in your device Settings > Apps > Loopt > Permissions.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
          ]
        );
      }
    }
  };

  const handleRecordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in App Permissions to record loops.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
          ]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedUris([result.assets[0].uri]);
        setActivePreviewIndex(0);
      }
    } catch (err) {
      console.error('Camera recording error:', err);
      Alert.alert('Camera Error', 'Could not open video camera.');
    }
  };

  const removeSelectedUri = (indexToRemove: number) => {
    const updated = selectedUris.filter((_, idx) => idx !== indexToRemove);
    setSelectedUris(updated);
    if (activePreviewIndex >= updated.length) {
      setActivePreviewIndex(Math.max(0, updated.length - 1));
    }
  };

  const handlePublish = async () => {
    if (selectedUris.length === 0) {
      Alert.alert('Select Videos', 'Please choose at least one video to post.');
      return;
    }

    setIsUploading(true);
    try {
      const createdVideos: ShortVideo[] = [];

      for (let i = 0; i < selectedUris.length; i++) {
        const rawUri = selectedUris[i];
        // 1. Save permanently to device documentDirectory
        const permanentUri = await saveVideoPermanently(rawUri);
        let finalVideoUrl = permanentUri;
        const videoId = `short_${Date.now()}_${i}`;

        // 2. Upload video file to GitHub repository (loopt-cloud/videos/) so anyone can stream it
        try {
          const cloudVideoUrl = await uploadVideoFileToGitHub(permanentUri, videoId);
          if (cloudVideoUrl && cloudVideoUrl.startsWith('http')) {
            finalVideoUrl = cloudVideoUrl;
          }
        } catch (gitErr) {
          console.warn('GitHub video sync warning:', gitErr);
        }

        const videoItem: ShortVideo = {
          id: videoId,
          title: title.trim(), // Optional! If empty, title is empty
          description: description.trim(),
          videoUri: finalVideoUrl,
          creator: {
            id: userProfile.id,
            username: userProfile.username,
            avatarUrl: userProfile.avatarUrl,
          },
          songTitle: songTitle.trim() || 'Original Audio - You',
          likesCount: 0,
          commentsCount: 0,
          sharesCount: 0,
          isLiked: false,
          createdAt: new Date().toISOString(),
        };

        createdVideos.push(videoItem);
      }

      // Sync to GitHub cloud feed.json so other users' apps receive it automatically
      syncVideosToCloud(createdVideos).catch((e) => console.warn('Cloud feed sync:', e));

      if (createdVideos.length === 1) {
        onUploadSuccess({
          title: createdVideos[0].title,
          description: createdVideos[0].description,
          videoUri: createdVideos[0].videoUri,
          songTitle: createdVideos[0].songTitle,
        });
      } else if (createdVideos.length > 1 && onBatchImport) {
        onBatchImport(createdVideos);
      }

      // Reset & close
      setSelectedUris([]);
      setActivePreviewIndex(0);
      setTitle('');
      setDescription('');
      setSongTitle('Original Audio - You');
      onClose();

      Alert.alert(
        'Published!',
        createdVideos.length > 1
          ? `Successfully posted all ${createdVideos.length} loops to your feed!`
          : 'Your loop has been added to your feed.'
      );
    } catch (err) {
      console.error('Publish error:', err);
      Alert.alert('Publish Failed', 'Something went wrong while publishing.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSnapchatImport = async () => {
    setIsImportingSnapchat(true);
    try {
      const res = await importSnapchatVideos(userProfile);
      if (res.newImportedCount > 0) {
        onBatchImport?.(res.importedVideos);
        Alert.alert(
          'Snapchat Videos Imported!',
          `Found ${res.totalScanned} Snapchat video(s).\nSuccessfully imported ${res.newImportedCount} new video(s) to your feed without duplicates.`
        );
        onClose();
      } else if (res.totalScanned > 0) {
        Alert.alert(
          'Already Up to Date',
          `Scanned ${res.totalScanned} Snapchat video(s) in your camera roll. All of them have already been posted! No duplicate videos were added.`
        );
      } else {
        Alert.alert(
          'No Snapchat Videos Auto-Detected',
          'Could not auto-detect videos in a Snapchat folder. Would you like to pick them directly from your gallery?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Pick From Gallery',
              onPress: handlePickVideos,
            },
          ]
        );
      }
    } catch (err: any) {
      console.error('Snapchat scan failed:', err);
      Alert.alert(
        'Media Permission Required',
        err?.message || 'Loopt needs access to your photos and videos to find and import Snapchat clips.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings().catch(() => {
                Alert.alert('Settings', 'Please manually open your device Settings > Apps > Loopt > Permissions and enable Photos & Videos.');
              });
            },
          },
        ]
      );
    } finally {
      setIsImportingSnapchat(false);
    }
  };

  const resetModal = () => {
    setSelectedUris([]);
    setActivePreviewIndex(0);
    setTitle('');
    setDescription('');
    onClose();
  };

  const body = (
    <View style={[styles.container, !isDarkMode && styles.containerLight, isEmbedded && { paddingTop: 0 }]}>
      {/* Header */}
      <View style={[styles.header, !isDarkMode && styles.headerLight]}>
        {!isEmbedded ? (
          <TouchableOpacity onPress={resetModal}>
            <Ionicons name="close" size={26} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="add-circle" size={24} color="#FF9F0A" />
        )}
        <Text style={[styles.headerTitle, !isDarkMode && styles.headerTitleLight]}>
          {selectedUris.length > 1 ? `Create ${selectedUris.length} Loops` : 'Create Loop'}
        </Text>
          <TouchableOpacity
            style={[styles.publishBtn, (selectedUris.length === 0 || isUploading) && styles.publishBtnDisabled]}
            disabled={selectedUris.length === 0 || isUploading}
            onPress={handlePublish}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.publishBtnText}>
                {selectedUris.length > 1 ? `Post All (${selectedUris.length})` : 'Post'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Video Preview or Pick Zone */}
          {selectedUris.length > 0 ? (
            <View style={styles.previewContainer}>
              <VideoView
                style={styles.previewVideo}
                player={previewPlayer}
                nativeControls={true}
                contentFit="contain"
                surfaceType="textureView"
              />

              {/* Multi-video pill carousel if multiple videos selected */}
              {selectedUris.length > 1 && (
                <View style={styles.multiVideoBar}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.multiVideoScroll}>
                    {selectedUris.map((uri, idx) => (
                      <View key={uri + idx} style={[styles.thumbnailPill, activePreviewIndex === idx && styles.thumbnailPillActive]}>
                        <TouchableOpacity
                          onPress={() => setActivePreviewIndex(idx)}
                          style={styles.thumbnailPillBtn}
                        >
                          <Ionicons
                            name="videocam"
                            size={14}
                            color={activePreviewIndex === idx ? '#000000' : '#FFFFFF'}
                          />
                          <Text
                            style={[
                              styles.thumbnailPillText,
                              activePreviewIndex === idx && styles.thumbnailPillTextActive,
                            ]}
                          >
                            Loop {idx + 1}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeSelectedUri(idx)}
                          style={styles.removePillBtn}
                        >
                          <Ionicons name="close-circle" size={16} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity style={styles.changeVideoBtn} onPress={handlePickVideos}>
                <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                <Text style={styles.changeVideoText}>Select More</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Snapchat Auto-Scan & Import Card */}
              <TouchableOpacity
                style={[styles.snapchatBanner, !isDarkMode && styles.snapchatBannerLight]}
                activeOpacity={0.8}
                onPress={handleSnapchatImport}
                disabled={isImportingSnapchat}
              >
                <View style={styles.snapchatIconBox}>
                  {isImportingSnapchat ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <MaterialCommunityIcons name="snapchat" size={26} color="#000000" />
                  )}
                </View>
                <View style={styles.snapchatTextBox}>
                  <Text style={[styles.snapchatTitle, !isDarkMode && styles.snapchatTitleLight]}>
                    {isImportingSnapchat ? 'Scanning Camera Roll...' : 'Scan & Post Snapchat Videos'}
                  </Text>
                  <Text style={styles.snapchatSubtitle}>
                    Auto-detects videos with watermark & prevents duplicate posts
                  </Text>
                </View>
                <Ionicons name="sparkles" size={18} color="#FF9F0A" />
              </TouchableOpacity>

              {/* In-App Camera Loop Recorder */}
              <TouchableOpacity
                style={[styles.uploadCard, { marginBottom: 12, borderColor: '#FF9F0A' }, !isDarkMode && styles.uploadCardLight]}
                activeOpacity={0.8}
                onPress={handleRecordVideo}
              >
                <View style={[styles.uploadIconCircle, { backgroundColor: 'rgba(255, 159, 10, 0.15)' }]}>
                  <Ionicons name="videocam" size={34} color="#FF9F0A" />
                </View>
                <Text style={[styles.uploadCardTitle, !isDarkMode && styles.uploadCardTitleLight]}>
                  Record Loop with Camera
                </Text>
                <Text style={styles.uploadCardSubtitle}>Record up to 60s video directly using your camera</Text>
              </TouchableOpacity>

              {/* Multi-Video Gallery Picker */}
              <TouchableOpacity
                style={[styles.uploadCard, !isDarkMode && styles.uploadCardLight]}
                activeOpacity={0.8}
                onPress={handlePickVideos}
              >
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="images-outline" size={34} color="#FF9F0A" />
                </View>
                <Text style={[styles.uploadCardTitle, !isDarkMode && styles.uploadCardTitleLight]}>
                  Select Videos from Gallery
                </Text>
                <Text style={styles.uploadCardSubtitle}>Choose 1 or multiple videos at once from your device</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Form Fields - Titles are now completely optional! */}
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Title / Caption</Text>
              <Text style={styles.optionalBadge}>Optional</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Leave blank or give your loop a title..."
              placeholderTextColor="#777"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description / Tags (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add details, hashtags like #shorts #trending..."
              placeholderTextColor="#777"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Sound / Music Name (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Audio track title"
              placeholderTextColor="#777"
              value={songTitle}
              onChangeText={setSongTitle}
            />
          </View>
        </ScrollView>
      </View>
  );

  if (isEmbedded) {
    return body;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetModal}>
      {body}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 44,
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222222',
  },
  headerLight: {
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  headerTitleLight: {
    color: '#000000',
  },
  publishBtn: {
    backgroundColor: '#FF9F0A',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnDisabled: {
    backgroundColor: '#333333',
    opacity: 0.6,
  },
  publishBtnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  snapchatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFFC00',
  },
  snapchatBannerLight: {
    backgroundColor: '#F2F2F7',
  },
  snapchatIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFC00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  snapchatTextBox: {
    flex: 1,
    paddingRight: 8,
  },
  snapchatTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  snapchatTitleLight: {
    color: '#000000',
  },
  snapchatSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 16,
  },
  uploadCard: {
    backgroundColor: '#121212',
    borderWidth: 1.5,
    borderColor: '#262626',
    borderStyle: 'dashed',
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  uploadCardLight: {
    backgroundColor: '#F8F9FA',
    borderColor: '#D1D5DB',
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadCardTitleLight: {
    color: '#000000',
  },
  uploadCardSubtitle: {
    color: '#777777',
    fontSize: 13,
    textAlign: 'center',
  },
  previewContainer: {
    width: '100%',
    height: 280,
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#333333',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  multiVideoBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  multiVideoScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbnailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: 14,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  thumbnailPillActive: {
    backgroundColor: '#FF9F0A',
    borderColor: '#FF9F0A',
  },
  thumbnailPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  thumbnailPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  thumbnailPillTextActive: {
    color: '#000000',
  },
  removePillBtn: {
    marginLeft: 2,
  },
  changeVideoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  changeVideoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '600',
  },
  optionalBadge: {
    color: '#777777',
    fontSize: 11,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#161616',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
