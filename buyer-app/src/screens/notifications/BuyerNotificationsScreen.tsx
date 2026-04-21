import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  fetchBuyerNotifications,
  markBuyerNotificationAllRead,
  markBuyerNotificationRead,
} from '@/api/notification';
import { EmptyState } from '@/components/EmptyState';
import { ErrorRetryView } from '@/components/ErrorRetryView';
import { LoadingView } from '@/components/LoadingView';
import { PageContainer } from '@/components/PageContainer';
import type { BuyerNotificationItem } from '@/types/notification';
import { colors, lineHeight, spacing, typography } from '@/theme/tokens';

import { NotificationCard } from './components/NotificationCard';

type NotificationFilter = 'all' | 'order' | 'system';

const FILTERS: Array<{ key: NotificationFilter; label: string }> = [
  { key: 'all', label: '全部消息' },
  { key: 'order', label: '订单消息' },
  { key: 'system', label: '系统通知' },
];

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const timeLabel = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  const diffMinutes = Math.max(1, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}小时前`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return `昨天 ${timeLabel}`;
  }
  return `${diffDays}天前`;
}

function notificationType(item: BuyerNotificationItem): NotificationFilter {
  const bucket = `${item.type} ${item.biz_type} ${item.title}`.toLowerCase();
  if (bucket.includes('order') || bucket.includes('订单')) {
    return 'order';
  }
  return 'system';
}

function notificationVisual(item: BuyerNotificationItem) {
  const bucket = `${item.type} ${item.biz_type} ${item.title}`.toLowerCase();
  if (bucket.includes('配送') || bucket.includes('deliver')) {
    return { iconName: 'cube-outline' as const, iconColor: '#18A84A', iconBackground: '#E8F7ED' };
  }
  if (bucket.includes('完成') || bucket.includes('送达') || bucket.includes('收货')) {
    return { iconName: 'checkmark-circle-outline' as const, iconColor: '#18A84A', iconBackground: '#E8F7ED' };
  }
  if (bucket.includes('取消') || bucket.includes('alert')) {
    return { iconName: 'alert-circle-outline' as const, iconColor: '#EF4444', iconBackground: '#FDECEC' };
  }
  return { iconName: 'notifications-outline' as const, iconColor: '#F59E0B', iconBackground: '#FFF5E8' };
}

export function BuyerNotificationsScreen() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');
  const [notifications, setNotifications] = useState<BuyerNotificationItem[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const result = await fetchBuyerNotifications({ page: 1, page_size: 50 });
      setNotifications(result.list);
    } catch (error) {
      setNotifications([]);
      setErrorMessage(error instanceof Error ? error.message : '消息加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => activeFilter === 'all' || notificationType(item) === activeFilter);
  }, [activeFilter, notifications]);

  const unreadCounts = useMemo(() => {
    return FILTERS.reduce<Record<NotificationFilter, number>>(
      (acc, filter) => {
        acc[filter.key] = notifications.filter(
          (item) => item.is_read === 0 && (filter.key === 'all' || notificationType(item) === filter.key),
        ).length;
        return acc;
      },
      { all: 0, order: 0, system: 0 },
    );
  }, [notifications]);

  const markAllRead = async () => {
    try {
      await markBuyerNotificationAllRead();
      await load();
    } catch (error) {
      Alert.alert('失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const openNotification = async (item: BuyerNotificationItem) => {
    try {
      if (item.is_read === 0) {
        await markBuyerNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((entry) => (entry.id === item.id ? { ...entry, is_read: 1 } : entry)),
        );
      }
      if (notificationType(item) === 'order' && item.biz_id) {
        router.push(`/orders/${item.biz_id}`);
      }
    } catch (error) {
      Alert.alert('失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <PageContainer>
        <LoadingView />
      </PageContainer>
    );
  }

  if (errorMessage && notifications.length === 0) {
    return (
      <PageContainer>
        <ErrorRetryView message={errorMessage} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.headerIcon}>
          <Ionicons color={colors.textStrong} name="chevron-back" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>消息中心</Text>
        <Pressable accessibilityRole="button" onPress={() => void markAllRead()} style={styles.headerAction}>
          <Text style={styles.headerActionText}>全部已读</Text>
        </Pressable>
      </View>

      <View style={styles.tabsRow}>
        {FILTERS.map((filter) => {
          const active = filter.key === activeFilter;
          const unread = unreadCounts[filter.key];
          return (
            <Pressable
              accessibilityRole="button"
              key={filter.key}
              onPress={() => setActiveFilter(filter.key)}
              style={styles.tabItem}
            >
              <View style={styles.tabLabelWrap}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{filter.label}</Text>
                {unread > 0 ? <View style={styles.tabDot} /> : null}
              </View>
              {active ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredNotifications.length === 0 ? (
          <EmptyState title="暂无消息" description="新消息会出现在这里" />
        ) : (
          filteredNotifications.map((item) => {
            const visual = notificationVisual(item);
            return (
              <NotificationCard
                highlighted={item.is_read === 0}
                iconBackground={visual.iconBackground}
                iconColor={visual.iconColor}
                iconName={visual.iconName}
                item={item}
                key={item.id}
                onPress={() => void openNotification(item)}
                timeLabel={formatRelativeTime(item.created_at)}
              />
            );
          })
        )}
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 88,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDE8',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 32,
    color: colors.textStrong,
    fontWeight: '700',
  },
  headerAction: {
    minWidth: 88,
    alignItems: 'flex-end',
  },
  headerActionText: {
    fontSize: typography.title,
    lineHeight: lineHeight.title,
    color: '#18A84A',
    fontWeight: '600',
  },
  tabsRow: {
    minHeight: 88,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDE8',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  tabItem: {
    flex: 1,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabelWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tabText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#18A84A',
  },
  tabDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF2D2D',
    marginLeft: 4,
    marginTop: -4,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 120,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#18A84A',
  },
  content: {
    padding: spacing.lg,
    backgroundColor: '#F3F6F3',
    paddingBottom: 120,
  },
});
