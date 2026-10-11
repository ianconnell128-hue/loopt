import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  isDarkMode: boolean;
  autoplaySound: boolean;
  defaultFitMode: 'cover' | 'contain';
}

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetData: () => void;
  onOpenUpdateModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  settings,
  onUpdateSettings,
  onResetData,
  onOpenUpdateModal,
}) => {
  const isDark = settings.isDarkMode;

  const handleClearDataConfirm = () => {
    Alert.alert(
      'Reset App Data',
      'This will clear cached test comments and reset metrics. Your account profile will remain. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: onResetData,
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, !isDark && styles.sheetLight]}>
          {/* Header */}
          <View style={[styles.header, !isDark && styles.headerLight]}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <View style={styles.titleWithIcon}>
                <Feather name="settings" size={20} color={isDark ? '#FFF' : '#111'} />
                <Text style={[styles.title, !isDark && styles.titleLight]}>Settings</Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={isDark ? '#FFF' : '#111'} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Theme Section */}
            <Text style={styles.sectionHeading}>APPEARANCE</Text>
            <View style={[styles.settingRow, !isDark && styles.settingRowLight]}>
              <View style={styles.settingInfo}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color={isDark ? '#3EA6FF' : '#FF9500'}
                />
                <View>
                  <Text style={[styles.settingLabel, !isDark && styles.settingLabelLight]}>
                    Dark Mode
                  </Text>
                  <Text style={styles.settingDesc}>
                    {isDark ? 'Pitch black theme enabled' : 'Clean light theme enabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={(val) => onUpdateSettings({ isDarkMode: val })}
                trackColor={{ false: '#767577', true: '#FF0000' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Playback Section */}
            <Text style={styles.sectionHeading}>PLAYBACK & VIDEO</Text>
            <View style={[styles.settingRow, !isDark && styles.settingRowLight]}>
              <View style={styles.settingInfo}>
                <Ionicons
                  name={settings.autoplaySound ? 'volume-high' : 'volume-mute'}
                  size={20}
                  color={isDark ? '#FFF' : '#111'}
                />
                <View>
                  <Text style={[styles.settingLabel, !isDark && styles.settingLabelLight]}>
                    Sound On by Default
                  </Text>
                  <Text style={styles.settingDesc}>
                    Videos play with audio unmuted on launch
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.autoplaySound}
                onValueChange={(val) => onUpdateSettings({ autoplaySound: val })}
                trackColor={{ false: '#767577', true: '#FF0000' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Default Screen Fit */}
            <View style={[styles.settingRow, !isDark && styles.settingRowLight]}>
              <View style={styles.settingInfo}>
                <Ionicons name="scan-outline" size={20} color={isDark ? '#FFF' : '#111'} />
                <View>
                  <Text style={[styles.settingLabel, !isDark && styles.settingLabelLight]}>
                    Default Video Fit
                  </Text>
                  <Text style={styles.settingDesc}>
                    {settings.defaultFitMode === 'cover' ? 'Fill screen (Cover)' : 'Fit entire frame (Letterbox)'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.pillToggle}
                onPress={() =>
                  onUpdateSettings({
                    defaultFitMode: settings.defaultFitMode === 'cover' ? 'contain' : 'cover',
                  })
                }
              >
                <Text style={styles.pillToggleText}>
                  {settings.defaultFitMode === 'cover' ? 'FILL' : 'FIT'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Data & Storage */}
            <Text style={styles.sectionHeading}>DATA & STORAGE</Text>
            <TouchableOpacity
              style={[styles.dangerRow, !isDark && styles.dangerRowLight]}
              onPress={handleClearDataConfirm}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              <Text style={styles.dangerRowText}>Purge Old Test Comments & Cache</Text>
            </TouchableOpacity>

            {/* Updates Section */}
            <Text style={styles.sectionHeading}>UPDATES & GITHUB SYNC</Text>
            <TouchableOpacity
              style={[styles.settingRow, !isDark && styles.settingRowLight]}
              onPress={() => {
                onClose();
                onOpenUpdateModal?.();
              }}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="cloud-download-outline" size={20} color="#FF0000" />
                <View>
                  <Text style={[styles.settingLabel, !isDark && styles.settingLabelLight]}>
                    Check for Updates & Re-download
                  </Text>
                  <Text style={styles.settingDesc}>
                    Read new code from GitHub & install latest APK
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#888' : '#AAA'} />
            </TouchableOpacity>

            {/* About */}
            <Text style={styles.sectionHeading}>ABOUT</Text>
            <View style={[styles.infoCard, !isDark && styles.infoCardLight]}>
              <Text style={[styles.infoCardText, !isDark && styles.infoCardTextLight]}>
                Loopt v1.0 • Single Creator Edition
              </Text>
              <Text style={styles.infoCardSubText}>Channel Owner: @ian</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '75%',
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
    fontSize: 18,
    fontWeight: '700',
  },
  titleLight: {
    color: '#000000',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2C2C2E',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingRowLight: {
    backgroundColor: '#F2F2F7',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  settingLabelLight: {
    color: '#000000',
  },
  settingDesc: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  pillToggle: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pillToggleText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  dangerRowLight: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
  },
  dangerRowText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#2C2C2E',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  infoCardLight: {
    backgroundColor: '#F2F2F7',
  },
  infoCardText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  infoCardTextLight: {
    color: '#000000',
  },
  infoCardSubText: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
});
