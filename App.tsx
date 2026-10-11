import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Dimensions,
  ViewToken,
  Share,
  TouchableOpacity,
  LayoutChangeEvent,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShorts } from './src/hooks/useShorts';
import { ShortCard } from './src/components/ShortCard';
import { BottomNav } from './src/components/BottomNav';
import { UploadModal } from './src/components/UploadModal';
import { CommentsModal } from './src/components/CommentsModal';
import { ProfileView } from './src/components/ProfileView';
import { SettingsModal } from './src/components/SettingsModal';
import { ShortVideo } from './src/types';

function MainScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const {
    profile,
    updateProfile,
    videos,
    loading,
    settings,
    updateSettings,
    toggleLike,
    incrementShare,
    getComments,
    addComment,
    addVideo,
    resetAllTestData,
  } = useShorts();

  const NAV_BAR_HEIGHT = 58;
  const [containerHeight, setContainerHeight] = useState<number>(windowHeight - NAV_BAR_HEIGHT);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<'shorts' | 'subscriptions' | 'inbox' | 'profile'>('shorts');

  const flatListRef = useRef<FlatList<ShortVideo>>(null);

  // Modals state
  const [isUploadVisible, setIsUploadVisible] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [commentVideo, setCommentVideo] = useState<ShortVideo | null>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const handleShare = async (video: ShortVideo) => {
    try {
      await incrementShare(video.id);
      await Share.share({
        message: `Watch "${video.title}" by ${profile.displayName} on Shorts! ${video.videoUri}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && Math.abs(height - containerHeight) > 2) {
      setContainerHeight(height);
    }
  };

  const handleSelectVideoFromProfile = (index: number) => {
    setCurrentTab('shorts');
    setActiveIndex(index);
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({ index, animated: true });
    }, 100);
  };

  const isDark = settings.isDarkMode;

  return (
    <View style={[styles.screen, !isDark && styles.screenLight]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Main Content Area */}
      <View style={[styles.feedWrapper, !isDark && styles.feedWrapperLight]} onLayout={onLayout}>
        {currentTab === 'shorts' ? (
          <>
            {/* Top Bar Floating Header */}
            <View style={[styles.topHeader, { top: insets.top + 6 }]}>
              <View style={styles.topHeaderLeft}>
                <Ionicons name="logo-youtube" size={26} color="#FF0000" />
                <Text style={styles.appTitle}>Shorts</Text>
                <View style={styles.userTagPill}>
                  <Text style={styles.userTagText}>{profile.username}</Text>
                </View>
              </View>
              <View style={styles.topHeaderRight}>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => setIsUploadVisible(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => setIsSettingsOpen(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF0000" />
                <Text style={styles.loadingText}>Loading Shorts...</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={videos}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <ShortCard
                    video={item}
                    isActive={index === activeIndex}
                    itemHeight={containerHeight}
                    onLike={() => toggleLike(item.id)}
                    onOpenComments={() => setCommentVideo(item)}
                    onShare={() => handleShare(item)}
                  />
                )}
                pagingEnabled={false}
                snapToInterval={containerHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum={true}
                showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                initialNumToRender={2}
                maxToRenderPerBatch={1}
                windowSize={2}
                getItemLayout={(_, index) => ({
                  length: containerHeight,
                  offset: containerHeight * index,
                  index,
                })}
              />
            )}
          </>
        ) : currentTab === 'profile' ? (
          <ProfileView
            profile={profile}
            videos={videos}
            onUpdateProfile={updateProfile}
            onSelectVideo={handleSelectVideoFromProfile}
            onOpenUpload={() => setIsUploadVisible(true)}
            isDarkMode={isDark}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        ) : (
          /* Placeholder Screens */
          <View style={[styles.tabPlaceholder, !isDark && styles.tabPlaceholderLight]}>
            <Ionicons
              name={currentTab === 'subscriptions' ? 'albums' : 'notifications'}
              size={64}
              color={isDark ? '#444' : '#BBB'}
            />
            <Text style={[styles.placeholderTitle, !isDark && styles.placeholderTitleLight]}>
              {currentTab.toUpperCase()}
            </Text>
            <Text style={styles.placeholderSubtitle}>
              All channel notifications and feeds will appear here. Tap Shorts below to return.
            </Text>
            <TouchableOpacity
              style={styles.backToFeedBtn}
              onPress={() => setCurrentTab('shorts')}
            >
              <Text style={styles.backToFeedText}>Back to Shorts</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenUpload={() => setIsUploadVisible(true)}
        isDarkMode={isDark}
      />

      {/* Upload Video Modal */}
      <UploadModal
        visible={isUploadVisible}
        onClose={() => setIsUploadVisible(false)}
        onUploadSuccess={(newVideo) => addVideo(newVideo)}
      />

      {/* Real Comments Bottom Sheet */}
      {commentVideo && (
        <CommentsModal
          visible={Boolean(commentVideo)}
          onClose={() => setCommentVideo(null)}
          videoId={commentVideo.id}
          videoTitle={commentVideo.title}
          getComments={getComments}
          onAddComment={addComment}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetData={resetAllTestData}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  screenLight: {
    backgroundColor: '#FFFFFF',
  },
  feedWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  feedWrapperLight: {
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  userTagPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  userTagText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconBtn: {
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  tabPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#0F0F0F',
  },
  tabPlaceholderLight: {
    backgroundColor: '#F2F2F7',
  },
  placeholderTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  placeholderTitleLight: {
    color: '#000',
  },
  placeholderSubtitle: {
    color: '#777',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  backToFeedBtn: {
    marginTop: 24,
    backgroundColor: '#FF0000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backToFeedText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
