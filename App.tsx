import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  Linking,
  ScrollView,
  PanResponder,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useShorts } from './src/hooks/useShorts';
import { ShortCard } from './src/components/ShortCard';
import { BottomNav } from './src/components/BottomNav';
import { UploadModal } from './src/components/UploadModal';
import { CommentsModal } from './src/components/CommentsModal';
import { ProfileView } from './src/components/ProfileView';
import { SettingsModal } from './src/components/SettingsModal';
import { UpdateModal } from './src/components/UpdateModal';
import { MessagesModal } from './src/components/MessagesModal';
import { AuthModal } from './src/components/AuthModal';
import { ShortVideo } from './src/types';



function MainScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const {
    profile,
    updateProfile,
    videos,
    loading,
    settings,
    updateSettings,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    incrementShare,
    getComments,
    addComment,
    addVideo,
    addBatchVideos,
    resetAllTestData,
    appendMoreShuffledVideos,
    subscribedCreatorIds,
    toggleSubscribe,
  } = useShorts();



  const NAV_BAR_HEIGHT = 58;
  const [containerHeight, setContainerHeight] = useState<number>(windowHeight - NAV_BAR_HEIGHT);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<'shorts' | 'subscriptions' | 'upload' | 'inbox' | 'profile'>('shorts');

  const flatListRef = useRef<FlatList<ShortVideo>>(null);

  // Modals state
  const [isUploadVisible, setIsUploadVisible] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [isMessagesOpen, setIsMessagesOpen] = useState<boolean>(false);
  const [commentVideo, setCommentVideo] = useState<ShortVideo | null>(null);
  const [selectedSound, setSelectedSound] = useState<{ title: string; videoUri?: string } | null>(null);

  const TABS_ORDER: Array<'shorts' | 'subscriptions' | 'upload' | 'inbox' | 'profile'> = [
    'shorts',
    'subscriptions',
    'upload',
    'inbox',
    'profile',
  ];

  const goToNextTab = () => {
    const currentIndex = TABS_ORDER.indexOf(currentTab);
    if (currentIndex < TABS_ORDER.length - 1) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setCurrentTab(TABS_ORDER[currentIndex + 1]);
    }
  };

  const goToPrevTab = () => {
    const currentIndex = TABS_ORDER.indexOf(currentTab);
    if (currentIndex > 0) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      setCurrentTab(TABS_ORDER[currentIndex - 1]);
    }
  };

  // PanResponder for screens that don't have video/card responders (Subs, Upload screen, etc.)
  const tabScreenPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 25 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        return Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -35 || gesture.vx < -0.3) {
          // Swipe Left -> Next tab
          goToNextTab();
        } else if (gesture.dx > 35 || gesture.vx > 0.3) {
          // Swipe Right -> Prev tab
          goToPrevTab();
        }
      },
    })
  ).current;


  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  // Handle deep link (e.g. loopt://video/<id> or https://ianconnell128-hue.github.io/loopt/?video=<id>)
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      try {
        let videoId: string | null = null;
        if (url.includes('video=')) {
          const match = url.match(/[?&]video=([^&#]+)/);
          if (match && match[1]) videoId = decodeURIComponent(match[1]);
        } else if (url.includes('loopt://video/')) {
          videoId = url.replace('loopt://video/', '').split('?')[0].split('#')[0];
        } else if (url.includes('loopt://v/')) {
          videoId = url.replace('loopt://v/', '').split('?')[0].split('#')[0];
        }

        if (videoId && videos.length > 0) {
          const targetIndex = videos.findIndex(v => v.id === videoId);
          if (targetIndex !== -1) {
            setCurrentTab('shorts');
            setActiveIndex(targetIndex);
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true });
            }, 300);
          }
        }
      } catch (e) {
        console.warn('Error handling deep link URL:', e);
      }
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const subscription = Linking.addEventListener('url', event => handleUrl(event.url));
    return () => {
      subscription.remove();
    };
  }, [videos]);

  const handleShare = async (video: ShortVideo) => {
    try {
      await incrementShare(video.id);
      const shareUrl = `https://ianconnell128-hue.github.io/loopt/?video=${encodeURIComponent(video.id)}`;
      const creatorName = video.creator?.username || profile.displayName;
      await Share.share({
        message: `Watch "${video.title}" by @${creatorName} on Loopt!\n\nOpen or install Loopt: ${shareUrl}`,
        url: shareUrl,
        title: `Loopt: ${video.title}`,
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
            <View style={[styles.topHeader, { top: Math.max(8, insets.top) }]}>
              <View style={styles.topHeaderLeft}>
                <Image
                  source={require('./assets/icon.png')}
                  style={styles.headerLogoIcon}
                />
                <Text style={styles.appTitle}>Loopt</Text>
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
            ) : videos.length === 0 ? (
              <View style={[styles.tabPlaceholder, !isDark && styles.tabPlaceholderLight, { flex: 1, justifyContent: 'center' }]}>
                <Ionicons name="film-outline" size={68} color="#FF9F0A" />
                <Text style={[styles.placeholderTitle, !isDark && styles.placeholderTitleLight, { marginTop: 16 }]}>
                  No Videos Yet
                </Text>
                <Text style={[styles.placeholderSubtitle, { maxWidth: 280, textAlign: 'center', marginTop: 8 }]}>
                  Your feed is clean and ready. Tap the + button to upload or import your Snapchat videos.
                </Text>
                <TouchableOpacity
                  style={[styles.backToFeedBtn, { backgroundColor: '#FF9F0A', marginTop: 20 }]}
                  onPress={() => setIsUploadVisible(true)}
                >
                  <Text style={[styles.backToFeedText, { color: '#000000', fontWeight: '800' }]}>
                    Upload / Import Videos
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={videos}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <ShortCard
                    video={item}
                    isActive={index === activeIndex && currentTab === 'shorts'}
                    itemHeight={containerHeight}
                    onLike={() => toggleLike(item.id)}
                    onRepost={() => toggleRepost(item.id)}
                    onBookmark={() => toggleBookmark(item.id)}
                    onOpenComments={() => setCommentVideo(item)}
                    onShare={() => handleShare(item)}
                    onSwipeLeft={goToNextTab}
                    onSwipeRight={goToPrevTab}
                    isSubscribed={
                      item.isSubscribed ||
                      subscribedCreatorIds.has(item.creator?.id) ||
                      subscribedCreatorIds.has(item.creator?.username)
                    }
                    onToggleSubscribe={() =>
                      toggleSubscribe(item.creator?.id || item.creator?.username)
                    }
                    isOwnVideo={
                      (Boolean(profile?.id) && item.creator?.id === profile.id) ||
                      (Boolean(profile?.username) && item.creator?.username === profile.username)
                    }
                    onUseSound={(sound) => {
                      setSelectedSound(sound);
                      setCurrentTab('upload');
                    }}
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
                onEndReached={appendMoreShuffledVideos}
                onEndReachedThreshold={0.6}
                getItemLayout={(_, index) => ({
                  length: containerHeight,
                  offset: containerHeight * index,
                  index,
                })}
              />
            )}
          </>
        ) : currentTab === 'subscriptions' ? (
          /* Subscriptions Screen with Left/Right Swipe & Clickable Accounts */
          <View
            style={[styles.subsContainer, !isDark && styles.subsContainerLight]}
            {...tabScreenPanResponder.panHandlers}
          >
            {/* Header */}
            <View style={[styles.subsHeader, !isDark && styles.subsHeaderLight]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="albums" size={22} color="#FF9F0A" />
                <Text style={[styles.subsHeaderTitle, !isDark && styles.subsHeaderTitleLight]}>
                  Subscriptions
                </Text>
              </View>
              <Text style={styles.subsCountBadge}>
                {subscribedCreatorIds.size} {subscribedCreatorIds.size === 1 ? 'creator' : 'creators'}
              </Text>
            </View>

            {subscribedCreatorIds.size === 0 ? (
              <View style={[styles.tabPlaceholder, !isDark && styles.tabPlaceholderLight]}>
                <Ionicons name="albums-outline" size={68} color="#FF9F0A" />
                <Text style={[styles.placeholderTitle, !isDark && styles.placeholderTitleLight]}>
                  No Subscriptions Yet
                </Text>
                <Text style={styles.placeholderSubtitle}>
                  Tap the red "Subscribe" button next to any creator in the Loops feed to follow their channel and see their loops here!
                </Text>
                <TouchableOpacity
                  style={[styles.backToFeedBtn, { backgroundColor: '#FF9F0A', marginTop: 20 }]}
                  onPress={() => setCurrentTab('shorts')}
                >
                  <Text style={[styles.backToFeedText, { color: '#000000', fontWeight: '800' }]}>
                    Discover Creators
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                {Array.from(subscribedCreatorIds).map((creatorIdOrUsername) => {
                  const creatorVideos = videos.filter(
                    (v) =>
                      v.creator?.id === creatorIdOrUsername ||
                      v.creator?.username === creatorIdOrUsername
                  );
                  const firstVideo = creatorVideos[0];
                  const avatarUrl =
                    firstVideo?.creator?.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';
                  const username = firstVideo?.creator?.username || creatorIdOrUsername;

                  return (
                    <View
                      key={creatorIdOrUsername}
                      style={[styles.creatorCard, !isDark && styles.creatorCardLight]}
                    >
                      {/* Creator Banner Row */}
                      <View style={styles.creatorCardHeader}>
                        <Image source={{ uri: avatarUrl }} style={styles.creatorCardAvatar} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.creatorCardName, !isDark && styles.creatorCardNameLight]}>
                            {username}
                          </Text>
                          <Text style={styles.creatorCardSubtext}>
                            {creatorVideos.length} {creatorVideos.length === 1 ? 'loop posted' : 'loops posted'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.unsubscribeSmallBtn}
                          onPress={() => toggleSubscribe(creatorIdOrUsername)}
                        >
                          <Text style={styles.unsubscribeSmallText}>Subscribed ✓</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Video Thumbnails row */}
                      {creatorVideos.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 10, marginTop: 12 }}
                        >
                          {creatorVideos.map((vid) => {
                            const originalIdx = videos.findIndex((v) => v.id === vid.id);
                            return (
                              <TouchableOpacity
                                key={vid.id}
                                style={styles.subVideoThumb}
                                activeOpacity={0.8}
                                onPress={() => {
                                  if (originalIdx !== -1) {
                                    handleSelectVideoFromProfile(originalIdx);
                                  }
                                }}
                              >
                                <View style={styles.subVideoThumbPlaceholder}>
                                  <Ionicons name="play-circle" size={28} color="#FF9F0A" />
                                </View>
                                <Text
                                  numberOfLines={1}
                                  style={[styles.subVideoThumbTitle, !isDark && styles.subVideoThumbTitleLight]}
                                >
                                  {vid.title || 'Untitled Loop'}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <Text style={[styles.creatorNoVideos, !isDark && styles.creatorNoVideosLight]}>
                          No public loops uploaded yet.
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : currentTab === 'upload' ? (
          /* Post New Video Screen with Left/Right Swipe */
          <View
            style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}
            {...tabScreenPanResponder.panHandlers}
          >
            <UploadModal
              visible={true}
              isEmbedded={true}
              availableVideos={videos}
              initialSelectedSound={selectedSound}
              onClearInitialSound={() => setSelectedSound(null)}
              onClose={() => setCurrentTab('shorts')}
              onUploadSuccess={(newVideo) => {
                addVideo(newVideo);
                setSelectedSound(null);
                setCurrentTab('shorts');
              }}
              onBatchImport={(newVideos) => {
                addBatchVideos(newVideos);
                setSelectedSound(null);
                setCurrentTab('shorts');
              }}
              userProfile={{ id: profile.id, username: profile.username, avatarUrl: profile.avatarUrl }}
              isDarkMode={isDark}
            />
          </View>
        ) : currentTab === 'inbox' ? (
          /* Messages Screen with Left/Right Swipe */
          <View
            style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}
            {...tabScreenPanResponder.panHandlers}
          >
            <MessagesModal
              visible={true}
              isEmbedded={true}
              onClose={() => setCurrentTab('shorts')}
              isDarkMode={isDark}
              currentProfile={{
                id: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
              }}
            />
          </View>
        ) : (
          /* Profile Screen with Left/Right Swipe */
          <ProfileView
            profile={profile}
            videos={videos}
            onUpdateProfile={updateProfile}
            onSelectVideo={handleSelectVideoFromProfile}
            onOpenUpload={() => setCurrentTab('upload')}
            isDarkMode={isDark}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSwipeRight={goToPrevTab}
            onSwipeLeft={() => {}}
          />
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch {}
          setCurrentTab(tab);
        }}
        onOpenUpload={() => setCurrentTab('upload')}
        isDarkMode={isDark}
      />

      {/* Messages Modal */}
      <MessagesModal
        visible={isMessagesOpen}
        onClose={() => setIsMessagesOpen(false)}
        isDarkMode={isDark}
        currentProfile={{
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        }}
      />

      {/* Account Creation Modal */}
      <AuthModal
        visible={!loading && !profile.isCreated}
        onComplete={(newProfile) => updateProfile(newProfile)}
        isDarkMode={isDark}
      />



      {/* Upload Video Modal */}
      <UploadModal
        visible={isUploadVisible}
        onClose={() => setIsUploadVisible(false)}
        availableVideos={videos}
        initialSelectedSound={selectedSound}
        onClearInitialSound={() => setSelectedSound(null)}
        onUploadSuccess={(newVideo) => {
          addVideo(newVideo);
          setSelectedSound(null);
        }}
        onBatchImport={(newVideos) => {
          addBatchVideos(newVideos);
          setSelectedSound(null);
        }}
        userProfile={{ id: profile.id, username: profile.username, avatarUrl: profile.avatarUrl }}
        isDarkMode={isDark}
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
          isDarkMode={isDark}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetData={resetAllTestData}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
      />

      {/* GitHub Update & Re-download Modal */}
      <UpdateModal
        visible={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        isDarkMode={isDark}
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
  headerLogoIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
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
  subsContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  subsContainerLight: {
    backgroundColor: '#FFFFFF',
  },
  subsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222222',
  },
  subsHeaderLight: {
    borderBottomColor: '#E5E5EA',
  },
  subsHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  subsHeaderTitleLight: {
    color: '#000000',
  },
  subsCountBadge: {
    color: '#FF9F0A',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  creatorCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  creatorCardLight: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E5E7EB',
  },
  creatorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorCardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FF9F0A',
  },
  creatorCardName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  creatorCardNameLight: {
    color: '#000000',
  },
  creatorCardSubtext: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  unsubscribeSmallBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  unsubscribeSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  subVideoThumb: {
    width: 100,
    backgroundColor: '#1F1F1F',
    borderRadius: 10,
    overflow: 'hidden',
  },
  subVideoThumbPlaceholder: {
    width: 100,
    height: 130,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subVideoThumbTitle: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '600',
    padding: 6,
  },
  subVideoThumbTitleLight: {
    color: '#333333',
  },
  creatorNoVideos: {
    color: '#777777',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  creatorNoVideosLight: {
    color: '#999999',
  },
});
