import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { sellerColors } from '@/theme/seller';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: sellerColors.primary,
        tabBarInactiveTintColor: sellerColors.muted,
        tabBarStyle: {
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopColor: sellerColors.border,
          backgroundColor: sellerColors.card,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home-outline';

          if (route.name === 'orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          } else {
            iconName = focused ? 'storefront' : 'storefront-outline';
          }

          return <Ionicons name={iconName} size={size ?? 20} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: '工作台' }} />
      <Tabs.Screen name="orders" options={{ title: '订单' }} />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
    </Tabs>
  );
}
