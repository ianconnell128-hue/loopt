import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface BottomNavProps {
  currentTab: 'shorts' | 'subscriptions' | 'upload' | 'inbox' | 'profile';
  onSelectTab: (tab: 'shorts' | 'subscriptions' | 'upload' | 'inbox' | 'profile') => void;
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
      {/* Feed / Loops Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => onSelectTab('shorts')}
      >
        <Ionicons
          name={currentTab === 'shorts' ? 'flame' : 'flame-outline'}
          size={24}
          color={currentTab === 'shorts' ? '#FF9F0A' : inactiveColor}
        />
        <Text
          style={[
            styles.navText,
            !isDarkMode && styles.navTextLight,
            currentTab === 'shorts' && { color: '#FF9F0A', fontWeight: '700' },
          ]}
        >
          Loops
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
        onPress={() => onSelectTab('upload')}
      >
        <View style={[styles.uploadBtnCircle, currentTab === 'upload' && { borderWidth: 2, borderColor: '#FFFFFF', transform: [{ scale: 1.08 }] }]}>
          <Ionicons name="add" size={28} color="#000000" />
        </View>
      </TouchableOpacity>

      {/* Messages Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => onSelectTab('inbox')}
      >
        <Ionicons
          name={currentTab === 'inbox' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
          size={22}
          color={currentTab === 'inbox' ? '#FF9F0A' : inactiveColor}
        />
        <Text
          style={[
            styles.navText,
            !isDarkMode && styles.navTextLight,
            currentTab === 'inbox' && { color: '#FF9F0A', fontWeight: '700' },
          ]}
        >
          Messages
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
          color={currentTab === 'profile' ? '#FF9F0A' : inactiveColor}
        />
        <Text
          style={[
            styles.navText,
            !isDarkMode && styles.navTextLight,
            currentTab === 'profile' && { color: '#FF9F0A', fontWeight: '700' },
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
    backgroundColor: '#FF9F0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnCircleLight: {
    backgroundColor: '#FF9F0A',
  },
});
