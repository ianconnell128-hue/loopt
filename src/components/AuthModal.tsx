import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types';

interface AuthModalProps {
  visible: boolean;
  onComplete: (profile: UserProfile) => void;
  isDarkMode?: boolean;
}

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onComplete,
  isDarkMode = true,
}) => {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);

  const bgColor = isDarkMode ? '#000000' : '#FFFFFF';
  const textColor = isDarkMode ? '#FFFFFF' : '#000000';
  const subtextColor = isDarkMode ? '#A0A0A0' : '#666666';
  const inputBg = isDarkMode ? '#1A1A1A' : '#F3F4F6';
  const borderColor = isDarkMode ? '#333333' : '#E5E7EB';

  const handleCreateAccount = () => {
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanDisplay = displayName.trim();

    if (!cleanUsername) {
      Alert.alert('Username Required', 'Please enter a valid unique username.');
      return;
    }

    if (!cleanDisplay) {
      Alert.alert('Display Name Required', 'Please enter your creator display name.');
      return;
    }

    const newProfile: UserProfile = {
      id: `user_${Date.now()}_${cleanUsername}`,
      username: `@${cleanUsername}`,
      displayName: cleanDisplay,
      avatarUrl: selectedAvatar,
      bio: bio.trim() || 'Loopt Creator 🎬',
      subscribersCount: 0,
      isCreated: true,
    };

    onComplete(newProfile);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.inner}
        >
          {/* Logo & Welcome */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="repeat" size={36} color="#000000" />
            </View>
            <Text style={[styles.title, { color: textColor }]}>Join Loopt</Text>
            <Text style={[styles.subtitle, { color: subtextColor }]}>
              Create your creator profile to post videos, unlock messaging, and comment on the feed.
            </Text>
          </View>

          {/* Avatar Selector */}
          <Text style={[styles.label, { color: textColor }]}>Choose Profile Avatar</Text>
          <View style={styles.avatarRow}>
            {AVATAR_OPTIONS.map((uri, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedAvatar(uri)}
                style={[
                  styles.avatarChoiceWrapper,
                  selectedAvatar === uri && styles.avatarSelected,
                ]}
              >
                <Image source={{ uri }} style={styles.avatarImg} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            <Text style={[styles.label, { color: textColor }]}>Username (Handles)</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
              <Text style={styles.atSign}>@</Text>
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="ian_creates"
                placeholderTextColor={subtextColor}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Text style={[styles.label, { color: textColor }]}>Creator Display Name</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
              <TextInput
                style={[styles.input, { color: textColor, paddingLeft: 4 }]}
                placeholder="Ian Connell"
                placeholderTextColor={subtextColor}
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>

            <Text style={[styles.label, { color: textColor }]}>Bio (Optional)</Text>
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor }]}>
              <TextInput
                style={[styles.input, { color: textColor, paddingLeft: 4 }]}
                placeholder="Making daily visual loops & edits 🔥"
                placeholderTextColor={subtextColor}
                value={bio}
                onChangeText={setBio}
                maxLength={80}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleCreateAccount}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Create Loopt Creator Account</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF9F0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    maxWidth: 290,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  avatarChoiceWrapper: {
    padding: 3,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarSelected: {
    borderColor: '#FF9F0A',
  },
  avatarImg: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  form: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 6,
  },
  atSign: {
    color: '#FF9F0A',
    fontSize: 17,
    fontWeight: '800',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: '#FF9F0A',
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#FF9F0A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
  },
});
