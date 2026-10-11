import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface BottomNavProps {
  currentTab: 'shorts' | 'subscriptions' | 'inbox' | 'profile';
  onSelectTab: (tab: 'shorts' | 'subscriptions' | 'inbox' | 'profile') => void;
  onOpenUpload: () => void;
  isDarkMode?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenUpload,
  isDarkMode = true,
}) => {
  const activeColor = isDarkMode ? '#FFFFFF' : '#000000';
  const inactiveColor = isDarkMode ? '#8E8E8E' : '#71717A';

  return (
    <View style={[styles.container, !isDarkMode && styles.containerLight]}>
      {/* Shorts Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => onSelectTab('shorts')}
      >
        <MaterialCommunityIcons
          name="youtube-subscription"
          size={24}
          color={currentTab === 'shorts' ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.navText,
            !isDarkMode && styles.navTextLight,
            currentTab === 'shorts' && (isDarkMode ? styles.navTextActive : styles.navTextActiveLight),
          ]}
        >
          Shorts
        </Text>
      </TouchableOpacity>

      {/* Subscriptions Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => onSelectTab('subscriptions')}
      >
        <Ionicons
          name={currentTab === 'subscriptions' ? 'albums' : 'albums-outline'}
          size={22}
          color={currentTab === 'subscriptions' ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.navText,
            !isDarkMode && styles.navTextLight,
            currentTab === 'subscriptions' && (isDarkMode ? styles.navTextActive : styles.navTextActiveLight),
          ]}
        >
          Subs
        </Text>
      </TouchableOpacity>

      {/* Upload Button (+) */}
      <TouchableOpacity
        style={styles.uploadBtnWrapper}
        activeOpacity={0.8}
        onPress={onOpenUpload}
      >
        <View style={[styles.uploadBtnCircle, !isDarkMode && styles.uploadBtnCircleLight]}>
          <Ionicons name="add" size={28} color={isDarkMode ? '#000000' : '#FFFFFF'} />
        </View>
      </TouchableOpacity>

      {/* Inbox / Activity */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => onSelectTab('inbox')}
      >
        <Ionicons
          name={currentTab === 'inbox' ? 'notifications' : 'notifications-outline'}
          size={22}
          color={currentTab === 'inbox' ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.navText,
            !isDarkMode && styles.navTextLight,
            currentTab === 'inbox' && (isDarkMode ? styles.navTextActive : styles.navTextActiveLight),
          ]}
        >
          Activity
        </Text>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => onSelectTab('profile')}
      >
        <Ionicons
          name={currentTab === 'profile' ? 'person-circle' : 'person-circle-outline'}
          size={23}
          color={currentTab === 'profile' ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.navText,
            !isDarkMode && styles.navTextLight,
            currentTab === 'profile' && (isDarkMode ? styles.navTextActive : styles.navTextActiveLight),
          ]}
        >
          You
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 58,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  containerLight: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E5EA',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 10,
    color: '#8E8E8E',
    marginTop: 2,
    fontWeight: '500',
  },
  navTextLight: {
    color: '#71717A',
  },
  navTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navTextActiveLight: {
    color: '#000000',
    fontWeight: '700',
  },
  uploadBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  uploadBtnCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnCircleLight: {
    backgroundColor: '#000000',
  },
});
