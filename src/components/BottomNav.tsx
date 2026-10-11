import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface BottomNavProps {
  currentTab: 'shorts' | 'subscriptions' | 'inbox' | 'profile';
  onSelectTab: (tab: 'shorts' | 'subscriptions' | 'inbox' | 'profile') => void;
  onOpenUpload: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenUpload,
}) => {
  return (
    <View style={styles.container}>
      {/* Shorts Tab */}
      <TouchableOpacity
        style={styles.navItem}
        activeOpacity={0.7}
        onPress={() => onSelectTab('shorts')}
      >
        <MaterialCommunityIcons
          name="youtube-subscription"
          size={24}
          color={currentTab === 'shorts' ? '#FFFFFF' : '#8E8E8E'}
        />
        <Text style={[styles.navText, currentTab === 'shorts' && styles.navTextActive]}>
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
          color={currentTab === 'subscriptions' ? '#FFFFFF' : '#8E8E8E'}
        />
        <Text style={[styles.navText, currentTab === 'subscriptions' && styles.navTextActive]}>
          Subs
        </Text>
      </TouchableOpacity>

      {/* Upload Button (+) */}
      <TouchableOpacity
        style={styles.uploadBtnWrapper}
        activeOpacity={0.8}
        onPress={onOpenUpload}
      >
        <View style={styles.uploadBtnCircle}>
          <Ionicons name="add" size={28} color="#000000" />
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
          color={currentTab === 'inbox' ? '#FFFFFF' : '#8E8E8E'}
        />
        <Text style={[styles.navText, currentTab === 'inbox' && styles.navTextActive]}>
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
          color={currentTab === 'profile' ? '#FFFFFF' : '#8E8E8E'}
        />
        <Text style={[styles.navText, currentTab === 'profile' && styles.navTextActive]}>
          You
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 58,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#222',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
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
  navTextActive: {
    color: '#FFFFFF',
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
});
