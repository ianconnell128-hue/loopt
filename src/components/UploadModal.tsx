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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { ShortVideo } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: (video: Omit<ShortVideo, 'id' | 'likesCount' | 'commentsCount' | 'sharesCount' | 'isLiked'>) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [songTitle, setSongTitle] = useState<string>('Original Audio - You');
  const [isUploading, setIsUploading] = useState<boolean>(false);

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
    let finalVideoUrl = selectedUri;

    try {
      // If Supabase is connected, upload video file to Supabase Storage bucket
      if (isSupabaseConfigured && supabase) {
        const fileExt = selectedUri.split('.').pop() || 'mp4';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `user_uploads/${fileName}`;

        const response = await fetch(selectedUri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(filePath, blob, {
            contentType: 'video/mp4',
            upsert: false,
          });

        if (uploadError) {
          console.warn('Supabase storage upload failed, falling back to local URI:', uploadError);
        } else if (uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from('videos')
            .getPublicUrl(uploadData.path);
          if (publicUrlData?.publicUrl) {
            finalVideoUrl = publicUrlData.publicUrl;
          }
        }
      }

      // Create new short item
      onUploadSuccess({
        title: title.trim(),
        description: description.trim(),
        videoUri: finalVideoUrl,
        songTitle: songTitle.trim() || 'Original Audio',
        creator: {
          id: 'me',
          username: '@creator',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
          isFollowed: false,
        },
      });

      // Reset & close
      setSelectedUri(null);
      setTitle('');
      setDescription('');
      setSongTitle('Original Audio - You');
      onClose();
      Alert.alert('Published!', 'Your video has been added to your Shorts feed.');
    } catch (err) {
      console.error('Publish error:', err);
      Alert.alert('Publish Failed', 'Something went wrong while publishing.');
    } finally {
      setIsUploading(false);
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={resetModal}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Short</Text>
          <TouchableOpacity
            style={[styles.publishBtn, (!selectedUri || !title.trim() || isUploading) && styles.publishBtnDisabled]}
            disabled={!selectedUri || !title.trim() || isUploading}
            onPress={handlePublish}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
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
            <TouchableOpacity style={styles.uploadCard} activeOpacity={0.8} onPress={handlePickVideo}>
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload-outline" size={42} color="#FF0000" />
              </View>
              <Text style={styles.uploadCardTitle}>Select Video to Upload</Text>
              <Text style={styles.uploadCardSubtitle}>Choose vertical MP4 or videos from your device</Text>
            </TouchableOpacity>
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
    backgroundColor: '#0F0F0F',
    paddingTop: 44,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  publishBtn: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
  },
  publishBtnDisabled: {
    backgroundColor: '#333333',
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  uploadCard: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1.5,
    borderColor: '#333',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  uploadIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
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
  input: {
    backgroundColor: '#1E1E1E',
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
