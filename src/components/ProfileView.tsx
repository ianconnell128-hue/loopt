import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { UserProfile, ShortVideo } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 36) / 3;

interface ProfileViewProps {
  profile: UserProfile;
  videos: ShortVideo[];
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onSelectVideo: (index: number) => void;
  onOpenUpload: () => void;
  isDarkMode?: boolean;
  onOpenSettings?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  videos,
  onUpdateProfile,
  onSelectVideo,
  onOpenUpload,
  isDarkMode = true,
  onOpenSettings,
}) => {
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>(profile.displayName);
  const [username, setUsername] = useState<string>(profile.username);
  const [bio, setBio] = useState<string>(profile.bio);

  const totalLikes = videos.reduce((acc, v) => acc + (v.likesCount || 0), 0);

  const handleSaveProfile = async () => {
    if (!username.trim() || !displayName.trim()) {
      Alert.alert('Required', 'Username and Display Name cannot be empty.');
      return;
    }
    await onUpdateProfile({
      displayName: displayName.trim(),
      username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
      bio: bio.trim(),
    });
    setIsEditOpen(false);
  };

  return (
    <View style={[styles.container, !isDarkMode && styles.containerLight]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, !isDarkMode && styles.headerTitleLight]}>
          {profile.username}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.editBtn, !isDarkMode && styles.editBtnLight]}
            onPress={() => setIsEditOpen(true)}
          >
            <Feather name="edit-3" size={16} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            <Text style={[styles.editBtnText, !isDarkMode && styles.editBtnTextLight]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
          {onOpenSettings && (
            <TouchableOpacity
              style={[styles.settingsBtn, !isDarkMode && styles.editBtnLight]}
              onPress={onOpenSettings}
            >
              <Feather name="settings" size={18} color={isDarkMode ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Profile Header Details */}
      <View style={styles.profileCard}>
        <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        <View style={styles.infoCol}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          <Text style={styles.usernameText}>{profile.username}</Text>
          <Text style={styles.statsText}>
            {profile.subscribersCount} subscribers • {videos.length} videos
          </Text>
          <Text style={styles.statsSubText}>{totalLikes} total likes received</Text>
        </View>
      </View>

      {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}

      {/* Upload Action Banner */}
      <TouchableOpacity style={styles.uploadBanner} activeOpacity={0.8} onPress={onOpenUpload}>
        <Ionicons name="cloud-upload" size={20} color="#FF0000" />
        <Text style={styles.uploadBannerText}>Upload New Short</Text>
      </TouchableOpacity>

      {/* Video Gallery Header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="film-outline" size={18} color="#FFF" />
        <Text style={styles.sectionTitle}>Your Shorts ({videos.length})</Text>
      </View>

      {/* Video Gallery Grid */}
      {videos.length === 0 ? (
        <View style={styles.emptyGrid}>
          <Ionicons name="videocam-outline" size={48} color="#444" />
          <Text style={styles.emptyGridTitle}>No videos posted yet</Text>
          <Text style={styles.emptyGridSubtitle}>Tap Upload to add your first Short</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.8}
              onPress={() => onSelectVideo(index)}
            >
              <View style={styles.gridItemThumb}>
                <Ionicons name="play" size={22} color="#FFFFFF" />
              </View>
              <View style={styles.gridItemStats}>
                <Ionicons name="heart" size={11} color="#FF2D55" />
                <Text style={styles.gridItemLikes}>{item.likesCount}</Text>
              </View>
              <Text style={styles.gridItemTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Edit Profile Modal */}
      <Modal visible={isEditOpen} animationType="slide" transparent onRequestClose={() => setIsEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Channel Profile</Text>
              <TouchableOpacity onPress={() => setIsEditOpen(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Display Name</Text>
              <TextInput
                style={styles.formInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your Name"
                placeholderTextColor="#777"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Handle / Username</Text>
              <TextInput
                style={styles.formInput}
                value={username}
                onChangeText={setUsername}
                placeholder="@username"
                placeholderTextColor="#777"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bio</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Channel description"
                placeholderTextColor="#777"
                multiline
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  headerTitleLight: {
    color: '#000000',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  editBtnLight: {
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  editBtnTextLight: {
    color: '#000000',
  },
  settingsBtn: {
    backgroundColor: '#262626',
    padding: 7,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#FF0000',
  },
  infoCol: {
    flex: 1,
  },
  displayName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  usernameText: {
    color: '#8E8E8E',
    fontSize: 13,
    marginBottom: 4,
  },
  statsText: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '600',
  },
  statsSubText: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  bioText: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  uploadBannerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  gridContent: {
    gap: 6,
    paddingBottom: 20,
  },
  gridItem: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 1.5,
    backgroundColor: '#1C1C1C',
    borderRadius: 8,
    marginRight: 6,
    padding: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  gridItemThumb: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignSelf: 'flex-start',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridItemLikes: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  gridItemTitle: {
    color: '#E0E0E0',
    fontSize: 10,
    marginTop: 4,
  },
  emptyGrid: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  emptyGridTitle: {
    color: '#AAA',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  emptyGridSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    color: '#8E8E8E',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFF',
    fontSize: 14,
  },
  formTextArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#FF0000',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
