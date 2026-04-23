import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  fetchSellerNotificationUnreadCount,
  fetchSellerNotifications,
  markAllSellerNotificationsRead,
  markSellerNotificationRead,
} from '@/api/notification';
import { SellerScreenHeader } from '@/components/SellerScreenHeader';
import { sellerColors, sellerRadius } from '@/theme/seller';
import type { SellerNotificationItem, SellerNotificationType } from '@/types/notification';

type MessageTab = 'all' | SellerNotificationType;

const TABS: Array<{ key: MessageTab; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'order', label: '订单' },
  { key: 'product', label: '商品' },
  { key: 'system', label: '系统' },
];

export default function MessagesPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<MessageTab>('all');
  const [messages, setMessages] = useState<SellerNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (tab: MessageTab = activeTab, nextPage = 1, append = false) => {
    const [data, nextUnreadCount] = await Promise.all([
      fetchSellerNotifications({
      type: tab === 'all' ? undefined : tab,
        page: nextPage,
        page_size: 20,
      }),
      fetchSellerNotificationUnreadCount(),
    ]);
    setMessages((prev) => (append ? [...prev, ...data.list] : data.list));
    setUnreadCount(nextUnreadCount);
    setPage(data.pagination.page);
    setTotalPages(data.pagination.total_pages || 1);
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const markAllRead = async () => {
    try {
      await markAllSellerNotificationsRead();
      await load(activeTab);
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const markRead = async (message: SellerNotificationItem) => {
    if (message.is_read === 1) {
      return;
    }
    try {
      await markSellerNotificationRead(message.id);
      setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, is_read: 1 } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      Alert.alert('操作失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const loadMore = async () => {
    if (loadingMore || page >= totalPages) {
      return;
    }
    try {
      setLoadingMore(true);
      await load(activeTab, page + 1, true);
    } catch (error) {
      Alert.alert('加载失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setLoadingMore(false);
    }
  };

  const openMessage = async (message: SellerNotificationItem) => {
    await markRead(message);
    if (message.biz_type === 'seller_low_stock' && message.biz_id) {
      router.push(`/products/${message.biz_id}`);
      return;
    }
    if (message.biz_type === 'seller_pending_products') {
      router.push('/products');
      return;
    }
    if (message.type === 'order') {
      router.push('/orders');
      return;
    }
    if (message.biz_type === 'seller_shop_audit_pending' || message.biz_type === 'seller_shop_audit_rejected' || message.biz_type === 'seller_shop_closed') {
      router.push('/shop-settings');
    }
  };

  return (
    <View style={styles.page}>
      <SellerScreenHeader
        title="消息中心"
        onBack={() => router.back()}
        right={
          unreadCount > 0 ? (
            <Text style={styles.headerAction} onPress={() => void markAllRead()}>
              全部已读
            </Text>
          ) : undefined
        }
      />

      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        {unreadCount > 0 ? (
          <View style={styles.unreadBanner}>
            <Ionicons name="notifications-outline" size={16} color={sellerColors.primary} />
            <Text style={styles.unreadText}>你有 {unreadCount} 条未读消息</Text>
          </View>
        ) : null}

        <View style={styles.tabsRow}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={({ pressed }) => [styles.tabChip, active ? styles.tabChipActive : null, pressed ? styles.pressed : null]}
                onPress={() => {
                  setActiveTab(tab.key);
                  void load(tab.key);
                }}
              >
                <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {messages.length > 0 ? (
          messages.map((message) => {
            const unread = message.is_read === 0;
            return (
              <Pressable key={message.id} style={[styles.messageCard, unread ? styles.messageUnread : null]} onPress={() => void openMessage(message)}>
                <View style={styles.messageTop}>
                  <View style={styles.messageTitleRow}>
                    <Text style={styles.messageTitle}>{message.title}</Text>
                    {isUrgentMessage(message) ? <Text style={styles.urgentBadge}>紧急</Text> : null}
                  </View>
                  {unread ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.messageContent}>{message.content}</Text>
                <View style={styles.messageFooter}>
                  <Text style={styles.messageTime}>{formatMessageTime(message.created_at)}</Text>
                  <Text style={styles.messageLink}>查看处理</Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="mail-open-outline" size={28} color={sellerColors.muted} />
            <Text style={styles.emptyTitle}>暂无消息</Text>
            <Text style={styles.emptyText}>当前分类下没有需要关注的提醒。</Text>
          </View>
        )}

        {messages.length > 0 && page < totalPages ? (
          <Pressable style={({ pressed }) => [styles.loadMoreBtn, pressed ? styles.pressed : null]} onPress={() => void loadMore()}>
            <Text style={styles.loadMoreText}>{loadingMore ? '加载中...' : '加载更多'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function isUrgentMessage(message: SellerNotificationItem): boolean {
  return message.biz_type === 'seller_pending_orders' || message.biz_type === 'seller_low_stock';
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: sellerColors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  headerAction: {
    color: sellerColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  unreadBanner: {
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: '#B7EBD6',
    backgroundColor: sellerColors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  unreadText: {
    fontSize: 13,
    fontWeight: '700',
    color: sellerColors.primary,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabChip: {
    flex: 1,
    borderRadius: sellerRadius.md,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: sellerColors.card,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabChipActive: {
    borderColor: sellerColors.primary,
    backgroundColor: sellerColors.primary,
  },
  pressed: {
    opacity: 0.94,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: sellerColors.muted,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  messageCard: {
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: sellerColors.card,
    padding: 16,
    marginBottom: 12,
  },
  messageUnread: {
    backgroundColor: '#F7FFFB',
    borderColor: '#B7EBD6',
  },
  messageTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 10,
  },
  messageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  messageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  urgentBadge: {
    overflow: 'hidden',
    borderRadius: sellerRadius.pill,
    backgroundColor: sellerColors.orange,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: sellerColors.primary,
    marginTop: 4,
  },
  messageContent: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666666',
  },
  messageTime: {
    fontSize: 11,
    color: sellerColors.muted,
  },
  messageFooter: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageLink: {
    fontSize: 12,
    color: sellerColors.primary,
    fontWeight: '700',
  },
  loadMoreBtn: {
    marginTop: 4,
    borderRadius: sellerRadius.lg,
    borderWidth: 1,
    borderColor: sellerColors.border,
    backgroundColor: sellerColors.card,
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreText: {
    color: sellerColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: sellerColors.foreground,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: sellerColors.muted,
  },
});
