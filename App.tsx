import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useShorts } from './src/hooks/useShorts';
import { ShortCard } from './src/components/ShortCard';
import { BottomNav } from './src/components/BottomNav';
import { UploadModal } from './src/components/UploadModal';
import { CommentsModal } from './src/components/CommentsModal';
import { ShortVideo } from './src/types';

function MainScreen() {
  const insets = useSafeAreaInsets();
  const { videos, loading, toggleLike, addVideo } = useShorts();

  const [containerHeight, setContainerHeight] = useState<number>(Dimensions.get('window').height - 58);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<'shorts' | 'subscriptions' | 'inbox' | 'profile'>('shorts');

  // Modals state
  const [isUploadVisible, setIsUploadVisible] = useState<boolean>(false);
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
      await Share.share({
        message: `Watch "${video.title}" on Shorts! ${video.videoUri}`,
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

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Main Content Area */}
      <View style={styles.feedWrapper} onLayout={onLayout}>
        {currentTab === 'shorts' ? (
          <>
            {/* Top Bar Floating Header */}
            <View style={[styles.topHeader, { top: insets.top + 6 }]}>
              <View style={styles.topHeaderLeft}>
                <Ionicons name="logo-youtube" size={26} color="#FF0000" />
                <Text style={styles.appTitle}>Shorts</Text>
              </View>
              <View style={styles.topHeaderRight}>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => setIsUploadVisible(true)}
                >
                  <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn}>
                  <Ionicons name="search-outline" size={24} color="#FFFFFF" />
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
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={containerHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={3}
              />
            )}
          </>
        ) : (
          /* Placeholder Screens for Tabs */
          <View style={styles.tabPlaceholder}>
            <Ionicons
              name={
                currentTab === 'subscriptions'
                  ? 'albums'
                  : currentTab === 'inbox'
                  ? 'notifications'
                  : 'person'
              }
              size={64}
              color="#444"
            />
            <Text style={styles.placeholderTitle}>
              {currentTab.toUpperCase()}
            </Text>
            <Text style={styles.placeholderSubtitle}>
              Feed and content will appear here. Tap Shorts below to return.
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
      />

      {/* Upload Video Modal */}
      <UploadModal
        visible={isUploadVisible}
        onClose={() => setIsUploadVisible(false)}
        onUploadSuccess={(newVideo) => addVideo(newVideo)}
      />

      {/* Comments Bottom Sheet */}
      {commentVideo && (
        <CommentsModal
          visible={Boolean(commentVideo)}
          onClose={() => setCommentVideo(null)}
          videoTitle={commentVideo.title}
        />
      )}
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
  feedWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
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
    gap: 6,
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
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBtn: {
    padding: 4,
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
  },
  placeholderTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
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
