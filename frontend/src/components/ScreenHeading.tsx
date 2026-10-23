import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { CalTrackLogo } from './CalTrackLogo';

export function ScreenHeading({ children }: { children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>{children}</View>
      <CalTrackLogo />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  text: { flex: 1 },
});
