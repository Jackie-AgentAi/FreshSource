import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { BuyerNotificationItem } from '@/types/notification';
import { colors, lineHeight, radius, spacing, typography } from '@/theme/tokens';

type NotificationCardProps = {
  item: BuyerNotificationItem;
  timeLabel: string;
  iconName: 'cube-outline' | 'checkmark-circle-outline' | 'notifications-outline' | 'alert-circle-outline';
  iconColor: string;
  iconBackground: string;
  highlighted: boolean;
  onPress: () => void;
};

export function NotificationCard({
  item,
  timeLabel,
  iconName,
  iconColor,
  iconBackground,
  highlighted,
  onPress,
}: NotificationCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, highlighted && styles.cardHighlighted]}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
          <Ionicons color={iconColor} name={iconName} size={28} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.content}>{item.content}</Text>
          <Text style={styles.time}>{timeLabel}</Text>
        </View>
        {item.is_read === 0 ? <View style={styles.dot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#E5EAE4',
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  cardHighlighted: {
    borderColor: '#18A84A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  body: {
    flex: 1,
    paddingRight: spacing.md,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
    color: colors.textStrong,
    fontWeight: '700',
  },
  content: {
    marginTop: spacing.sm,
    fontSize: 18,
    lineHeight: 30,
    color: '#6B7280',
  },
  time: {
    marginTop: spacing.xl,
    fontSize: 18,
    lineHeight: 24,
    color: '#6B7280',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF2D2D',
    marginTop: spacing.xs,
  },
});
