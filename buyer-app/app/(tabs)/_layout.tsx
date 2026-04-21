import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '@/theme/tokens';

function tabIcon(route: 'home' | 'grid' | 'cart' | 'person', focused: boolean) {
  const active = focused ? colors.primary : colors.textMuted;
  const size = 22;
  const map = {
    home: focused ? 'home' : 'home-outline',
    grid: focused ? 'grid' : 'grid-outline',
    cart: focused ? 'cart' : 'cart-outline',
    person: focused ? 'person' : 'person-outline',
  } as const;
  return <Ionicons name={map[route]} size={size} color={active} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#7B8597',
        tabBarStyle: {
          height: 68,
          paddingTop: 6,
          paddingBottom: 10,
          borderTopColor: '#E8EDE8',
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ focused }) => tabIcon('home', focused),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: '分类',
          tabBarIcon: ({ focused }) => tabIcon('grid', focused),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: '购物车',
          tabBarIcon: ({ focused }) => tabIcon('cart', focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ focused }) => tabIcon('person', focused),
        }}
      />
    </Tabs>
  );
}
