import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient, { BASE_URL } from '../api/client';
import { Coins, Lock, Unlock, ArrowLeft, ShieldCheck, User } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function MediaDetailsScreen({ route, navigation }) {
  const { mediaId } = route.params;
  const { token, user, refreshUser } = useAuth();
  
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  const fetchMediaDetails = async () => {
    try {
      // Find media from feed or request a single item
      // In this setup, we can request the feed and filter or fetch fresh details
      const res = await apiClient.get('/api/media/feed');
      const item = res.data.feed.find(m => m.id === mediaId);
      if (item) {
        setMedia(item);
      } else {
        Alert.alert('Error', 'Content not found', [
          { text: 'Back', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) {
      console.error('Error fetching media details', e);
      Alert.alert('Error', 'Failed to fetch content details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaDetails();
  }, [mediaId]);

  const handleUnlock = async () => {
    if (!media) return;

    // Check balance
    if (user.coins < media.price) {
      Alert.alert(
        'Insufficient Coins',
        `This content costs ${media.price} coins, but you only have ${user.coins} coins. Upload content to earn coins, or create a new user to start with 100 free coins.`
      );
      return;
    }

    Alert.alert(
      'Unlock Content',
      `Unlock this image for ${media.price} coins?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            setUnlocking(true);
            try {
              const res = await apiClient.post(`/api/media/${mediaId}/unlock`);
              
              // Success!
              Alert.alert('Success 🎉', res.data.message || 'Content unlocked!');
              
              // Sync user wallet balance and re-fetch page data
              await Promise.all([refreshUser(), fetchMediaDetails()]);
            } catch (err) {
              console.error('Unlock failed', err.response?.data || err.message);
              const errMsg = err.response?.data?.error || 'Failed to unlock content.';
              Alert.alert('Error', errMsg);
            } finally {
              setUnlocking(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  if (!media) return null;

  // Compute Image URI dynamically:
  // If locked, request the preview endpoint. If unlocked/owned, request the original endpoint.
  const imageUri = media.isLocked
    ? `${BASE_URL}/api/media/${media.id}/preview`
    : `${BASE_URL}/api/media/${media.id}/original`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{media.title}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main media image display */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: `${imageUri}?token=${token}`,
            }}
            style={styles.image}
            resizeMode="contain"
          />
          
          {media.isLocked && (
            <View style={styles.lockOverlay}>
              <View style={styles.lockCircle}>
                <Lock color="#ef4444" size={32} />
              </View>
              <Text style={styles.lockOverlayText}>Premium Monetized Content</Text>
              <Text style={styles.lockOverlaySub}>This original image is encrypted and locked.</Text>
            </View>
          )}
        </View>

        {/* Details Container */}
        <View style={styles.detailsCard}>
          <View style={styles.metaRow}>
            <View style={styles.authorBadge}>
              <User color="#9ca3af" size={16} />
              <Text style={styles.authorText}>@{media.ownerUsername}</Text>
            </View>
            
            {!media.isLocked ? (
              <View style={[styles.statusBadge, styles.statusUnlocked]}>
                <ShieldCheck color="#ffffff" size={14} style={styles.badgeIcon} />
                <Text style={styles.statusText}>Unlocked</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.statusLocked]}>
                <Lock color="#ffffff" size={14} style={styles.badgeIcon} />
                <Text style={styles.statusText}>Locked</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{media.title}</Text>
          <Text style={styles.description}>
            {media.description || 'No description provided.'}
          </Text>

          {/* Pricing and Unlock Action Area */}
          {media.isLocked ? (
            <View style={styles.unlockActionBox}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Price to Unlock</Text>
                <View style={styles.priceValueRow}>
                  <Coins color="#f59e0b" size={24} style={styles.coinIcon} />
                  <Text style={styles.priceText}>{media.price}</Text>
                  <Text style={styles.currencyText}> coins</Text>
                </View>
              </View>

              <View style={styles.walletStateRow}>
                <Text style={styles.walletLabel}>Your Balance:</Text>
                <Text style={styles.walletCoins}>{user.coins} coins</Text>
              </View>

              <TouchableOpacity
                style={styles.unlockBtn}
                onPress={handleUnlock}
                disabled={unlocking}
              >
                {unlocking ? (
                  <ActivityIndicator color="#0f172a" />
                ) : (
                  <View style={styles.btnContent}>
                    <Unlock color="#0f172a" size={20} style={styles.btnIcon} />
                    <Text style={styles.unlockBtnText}>Unlock Content</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.unlockedBox}>
              <ShieldCheck color="#10b981" size={24} />
              <Text style={styles.unlockedText}>
                {media.isOwner 
                  ? "You own this content. Serving original file." 
                  : "Purchased! You now have access to the original file."
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#121214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#1e1e24',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#1e1e24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    width: '100%',
    height: 350,
    backgroundColor: '#0a0a0c',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: '100%',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 12, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(30, 30, 36, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  lockOverlayText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  lockOverlaySub: {
    color: '#d1d5db',
    fontSize: 13,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  detailsCard: {
    padding: 24,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  authorText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusLocked: {
    backgroundColor: '#ef4444',
  },
  statusUnlocked: {
    backgroundColor: '#10b981',
  },
  badgeIcon: {
    marginRight: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '850',
    color: '#ffffff',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#9ca3af',
    lineHeight: 22,
    marginBottom: 24,
  },
  unlockActionBox: {
    backgroundColor: '#1e1e24',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2d2d34',
  },
  priceContainer: {
    marginBottom: 16,
  },
  priceLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  coinIcon: {
    alignSelf: 'center',
    marginRight: 6,
  },
  priceText: {
    color: '#f59e0b',
    fontSize: 32,
    fontWeight: '800',
  },
  currencyText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
  },
  walletStateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
  },
  walletLabel: {
    color: '#9ca3af',
    fontSize: 14,
  },
  walletCoins: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  unlockBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnIcon: {
    marginRight: 8,
  },
  unlockBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  unlockedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 16,
    padding: 16,
  },
  unlockedText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
});
