import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

type PageContainerProps = {
  children: ReactNode;
  header?: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function PageContainer({
  children,
  header,
  scroll = false,
  contentContainerStyle,
}: PageContainerProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.inner}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.inner, contentContainerStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
