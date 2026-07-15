import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Coins, RefreshCw } from 'lucide-react-native';

export default function WalletScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const res = await apiClient.get('/api/wallet/transactions');
      setTransactions(res.data.transactions);
    } catch (e) {
      console.error('Error fetching transactions', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTransactions(), refreshUser()]);
  };

  const renderTransactionItem = ({ item }) => {
    const isIncome = item.amount > 0;
    
    // Format details based on transaction type
    let title = '';
    let subtitle = '';
    
    switch (item.type) {
      case 'INITIAL':
        title = 'Starting Gift';
        subtitle = 'Welcome balance credited';
        break;
      case 'UNLOCK_SPENT':
        title = 'Unlocked Media';
        subtitle = item.media_title ? `Purchased "${item.media_title}"` : 'Purchased locked content';
        break;
      case 'UPLOAD_EARNED':
        title = 'Sold Premium Content';
        subtitle = item.media_title ? `Earned from "${item.media_title}"` : 'Earned from content unlock';
        break;
      default:
        title = 'Coin Transaction';
        subtitle = 'Wallet adjustment';
    }

    // Format date
    const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.transactionCard}>
        <View style={styles.cardLeft}>
          <View style={[styles.iconCircle, isIncome ? styles.incomeCircle : styles.expenseCircle]}>
            {isIncome ? (
              <ArrowDownLeft color="#10b981" size={20} />
            ) : (
              <ArrowUpRight color="#ef4444" size={20} />
            )}
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.transactionTitle}>{title}</Text>
            <Text style={styles.transactionSubtitle}>{subtitle}</Text>
            <Text style={styles.transactionDate}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.amountText, isIncome ? styles.incomeText : styles.expenseText]}>
            {isIncome ? '+' : ''}{item.amount}
          </Text>
          <Coins color={isIncome ? '#10b981' : '#ef4444'} size={14} style={styles.coinIcon} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={refreshing}>
          <RefreshCw color="#ffffff" size={20} />
        </TouchableOpacity>
      </View>

      {/* Wallet Balance Gold Card */}
      <View style={styles.balanceContainer}>
        <View style={styles.goldCard}>
          <View style={styles.goldCardTop}>
            <Text style={styles.cardName}>COIN BALANCE</Text>
            <Coins color="#0f172a" size={32} />
          </View>
          <Text style={styles.balanceValue}>{user?.coins}</Text>
          <View style={styles.goldCardBottom}>
            <Text style={styles.usernameText}>@{user?.username}</Text>
            <Text style={styles.statusLabel}>Premium Member</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Transaction History</Text>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Fetching ledger...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Coins color="#4b5563" size={48} style={styles.emptyIcon} />
          <Text style={styles.emptyText}>No transactions logged yet</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
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
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#1e1e24',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  balanceContainer: {
    padding: 24,
  },
  goldCard: {
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    padding: 24,
    height: 170,
    justifyContent: 'space-between',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  goldCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
  balanceValue: {
    color: '#0f172a',
    fontSize: 42,
    fontWeight: '900',
    marginVertical: 4,
  },
  goldCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  usernameText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  statusLabel: {
    color: 'rgba(15, 23, 42, 0.65)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e24',
    borderWidth: 1,
    borderColor: '#2d2d34',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeCircle: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  expenseCircle: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  textContainer: {
    flex: 1,
  },
  transactionTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  transactionSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  transactionDate: {
    color: '#6b7280',
    fontSize: 10,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontWeight: '800',
    fontSize: 15,
  },
  incomeText: {
    color: '#10b981',
  },
  expenseText: {
    color: '#ef4444',
  },
  coinIcon: {
    marginLeft: 4,
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
    paddingTop: 40,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    color: '#9ca3af',
  },
});
