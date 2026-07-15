import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient, { BASE_URL } from '../api/client';
import { Coins, LogOut, Plus, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react-native';

export default function FeedScreen({ navigation }) {
  const { user, token, logout, refreshUser } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async () => {
    try {
      const res = await apiClient.get('/api/media/feed');
      setFeed(res.data.feed);
    } catch (e) {
      console.error('Error fetching feed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  // Refresh feed and user wallet details
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFeed(), refreshUser()]);
  };

  // Re-fetch feed when screen is focused (e.g. after uploading or unlocking)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchFeed();
      refreshUser();
    });
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('MediaDetails', { mediaId: item.id })}
      >
        <Image
          source={{
            uri: `${BASE_URL}/api/media/${item.id}/preview?token=${token}`,
          }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        
        {/* Status Badge overlay */}
        <View style={styles.badgeContainer}>
          {item.isOwner ? (
            <View style={[styles.badge, styles.ownerBadge]}>
              <ShieldCheck color="#ffffff" size={14} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>My Content</Text>
            </View>
          ) : item.isLocked ? (
            <View style={[styles.badge, styles.lockedBadge]}>
              <ShieldAlert color="#ffffff" size={14} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>Locked</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.unlockedBadge]}>
              <ShieldCheck color="#ffffff" size={14} style={styles.badgeIcon} />
              <Text style={styles.badgeText}>Unlocked</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardAuthor}>by @{item.ownerUsername}</Text>
          </View>
          
          <View style={styles.footerRight}>
            <Coins color="#f59e0b" size={16} style={styles.coinIcon} />
            <Text style={styles.cardPrice}>{item.price} coins</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.username}>@{user?.username}</Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.walletButton}
            onPress={() => navigation.navigate('Wallet')}
          >
            <Wallet color="#f59e0b" size={20} />
            <Text style={styles.walletBalance}>{user?.coins} coins</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LogOut color="#ef4444" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Media Feed List */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Fetching feed...</Text>
        </View>
      ) : feed.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShieldAlert color="#4b5563" size={64} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Media Available</Text>
          <Text style={styles.emptySubtitle}>Be the first to upload and monetize your content!</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Text style={styles.refreshBtnText}>Refresh Feed</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={feed}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#f59e0b"
              colors={['#f59e0b']}
              progressBackgroundColor="#1e1e24"
            />
          }
        />
      )}

      {/* Floating Action Button for Upload */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('UploadMedia')}
      >
        <Plus color="#0f172a" size={28} strokeWidth={3} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#1e1e24',
  },
  userInfo: {
    flexDirection: 'column',
  },
  greeting: {
    fontSize: 14,
    color: '#9ca3af',
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e24',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
    marginRight: 12,
  },
  walletBalance: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#1e1e24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100, // Extra padding for FAB
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshBtn: {
    backgroundColor: '#1e1e24',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  refreshBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1e1e24',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2d2d34',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#2d2d34',
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ownerBadge: {
    backgroundColor: '#4f46e5', // purple/indigo
  },
  lockedBadge: {
    backgroundColor: '#ef4444', // red
  },
  unlockedBadge: {
    backgroundColor: '#10b981', // green
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  footerLeft: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 12,
    color: '#9ca3af',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d34',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  coinIcon: {
    marginRight: 4,
  },
  cardPrice: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#f59e0b',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
});
