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
}

export const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  onClose,
  onUploadSuccess,
  onBatchImport,
  userProfile = { id: 'my-account', username: '@ian', avatarUrl: '' },
  isDarkMode = true,
}) => {
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [songTitle, setSongTitle] = useState<string>('Original Audio - You');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isImportingSnapchat, setIsImportingSnapchat] = useState<boolean>(false);

  const previewPlayer = useVideoPlayer(selectedUri || '', (player) => {
    player.loop = true;
  });

  const handlePickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'We need access to your gallery to select videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Picker error:', err);
      Alert.alert('Error', 'Could not open video picker.');
    }
  };

  const handlePublish = async () => {
    if (!selectedUri) {
      Alert.alert('Select a video', 'Please choose a video file first.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Add a title', 'Please add a short title for your video.');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Save permanently to device documentDirectory so it is never deleted
      const permanentUri = await saveVideoPermanently(selectedUri);
      let finalVideoUrl = permanentUri;

      // 2. If Supabase is connected, upload video file to Supabase Storage bucket
      if (isSupabaseConfigured && supabase) {
        try {
          const fileExt = selectedUri.split('.').pop() || 'mp4';
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `user_uploads/${fileName}`;

          const response = await fetch(permanentUri);
          const blob = await response.blob();

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('videos')
            .upload(filePath, blob, {
              contentType: 'video/mp4',
              upsert: false,
            });

          if (uploadError) {
            console.warn('Supabase storage upload failed, keeping permanent local file:', uploadError);
          } else if (uploadData) {
            const { data: publicUrlData } = supabase.storage
              .from('videos')
              .getPublicUrl(uploadData.path);
            if (publicUrlData?.publicUrl) {
              finalVideoUrl = publicUrlData.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('Remote upload failed, continuing with permanent local video:', storageErr);
        }
      }

      // 3. Create new short item
      onUploadSuccess({
        title: title.trim(),
        description: description.trim(),
        videoUri: finalVideoUrl,
        songTitle: songTitle.trim() || 'Original Audio - Ian',
      });

      // Reset & close
      setSelectedUri(null);
      setTitle('');
      setDescription('');
      setSongTitle('Original Audio - You');
      onClose();
      Alert.alert('Published!', 'Your video has been added to your feed.');
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
          'No Snapchat Videos Found',
          'Could not find any videos saved from Snapchat in your camera roll. Make sure you have exported or saved your Snapchat videos to your device.'
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
    setSelectedUri(null);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetModal}>
      <View style={[styles.container, !isDarkMode && styles.containerLight]}>
        {/* Header */}
        <View style={[styles.header, !isDarkMode && styles.headerLight]}>
          <TouchableOpacity onPress={resetModal}>
            <Ionicons name="close" size={26} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, !isDarkMode && styles.headerTitleLight]}>Create Loop</Text>
          <TouchableOpacity
            style={[styles.publishBtn, (!selectedUri || !title.trim() || isUploading) && styles.publishBtnDisabled]}
            disabled={!selectedUri || !title.trim() || isUploading}
            onPress={handlePublish}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <Text style={styles.publishBtnText}>Post</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Video Preview or Pick Zone */}
          {selectedUri ? (
            <View style={styles.previewContainer}>
              <VideoView
                style={styles.previewVideo}
                player={previewPlayer}
                nativeControls={true}
                contentFit="contain"
                surfaceType="textureView"
              />
              <TouchableOpacity style={styles.changeVideoBtn} onPress={handlePickVideo}>
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.changeVideoText}>Change Video</Text>
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

              {/* Manual Device Video Picker */}
              <TouchableOpacity
                style={[styles.uploadCard, !isDarkMode && styles.uploadCardLight]}
                activeOpacity={0.8}
                onPress={handlePickVideo}
              >
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="cloud-upload-outline" size={38} color="#FF9F0A" />
                </View>
                <Text style={[styles.uploadCardTitle, !isDarkMode && styles.uploadCardTitleLight]}>
                  Select Video from Gallery
                </Text>
                <Text style={styles.uploadCardSubtitle}>Choose vertical MP4 or videos from your device</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Form Fields */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title / Caption *</Text>
            <TextInput
              style={styles.input}
              placeholder="Give your short an engaging title..."
              placeholderTextColor="#777"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description / Tags</Text>
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
            <Text style={styles.label}>Sound / Music Name</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerLight: {
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitleLight: {
    color: '#000000',
  },
  publishBtn: {
    backgroundColor: '#FF9F0A',
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 18,
  },
  publishBtnDisabled: {
    backgroundColor: '#333333',
  },
  publishBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  snapchatBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1.5,
    borderColor: '#FFD60A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  snapchatBannerLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF9F0A',
  },
  snapchatIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFD60A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapchatTextBox: {
    flex: 1,
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
    backgroundColor: '#161616',
    borderWidth: 1.5,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  uploadCardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF9F0A',
  },
  uploadIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
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
    color: '#888888',
    fontSize: 13,
    textAlign: 'center',
  },
  previewContainer: {
    height: 260,
    backgroundColor: '#000',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  previewVideo: {
    width: '100%',
    height: '100%',
  },
  changeVideoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  label: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  labelLight: {
    color: '#333333',
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
  inputLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5EA',
    color: '#000000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
});
