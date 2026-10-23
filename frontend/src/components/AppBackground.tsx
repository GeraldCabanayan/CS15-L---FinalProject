import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

function gradient(value: string): ViewStyle {
  return Platform.OS === 'web'
    ? ({ backgroundImage: value } as ViewStyle)
    : { experimental_backgroundImage: value };
}

export function AppBackground({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[style, styles.background]}>
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.decoration}
      >
        <View style={styles.egg}>
          <View style={styles.yolk}>
            <View style={styles.highlight} />
          </View>
        </View>
        <View style={styles.greenAccent} />
        <View style={styles.yellowAccent} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#fffefa',
    ...gradient('linear-gradient(160deg, #ffffff 0%, #ffffff 45%, #fcf9f2 100%)'),
  },
  decoration: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  egg: {
    position: 'absolute',
    top: 4,
    right: -85,
    width: 245,
    height: 140,
    borderRadius: 125,
    transform: [{ rotate: '-35deg' }],
    backgroundColor: 'rgba(255, 231, 163, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yolk: {
    width: 174,
    height: 88,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 196, 58, 0.38)',
    ...gradient('linear-gradient(150deg, rgba(255, 222, 132, 0.45), rgba(255, 184, 54, 0.4))'),
  },
  highlight: {
    position: 'absolute',
    top: 13,
    left: 25,
    width: 90,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 249, 219, 0.55)',
  },
  greenAccent: {
    position: 'absolute',
    left: -165,
    bottom: -25,
    width: 270,
    height: 300,
    borderRadius: 150,
    transform: [{ rotate: '-25deg' }],
    backgroundColor: 'rgba(191, 231, 171, 0.36)',
  },
  yellowAccent: {
    position: 'absolute',
    right: -155,
    bottom: -85,
    width: 240,
    height: 230,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 220, 153, 0.32)',
  },
});
