import { useFonts } from 'expo-font';
import { router } from 'expo-router';
import { Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AppBackground } from '../components/AppBackground';

function gradient(value: string): ViewStyle {
  return Platform.OS === 'web'
    ? ({ backgroundImage: value } as ViewStyle)
    : { experimental_backgroundImage: value };
}

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({
    'CalTrack-Black': require('../assets/fonts/CabinetGrotesk-Black.otf'),
  });
  const scale = Math.min((width - 48) / 312, height / 763, 1.2);
  const logoSize = 260 * scale;

  return (
    <AppBackground>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      <View style={styles.brand}>
        <View style={[styles.logoFrame, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.23 }]}>
          <Image
            source={require('../assets/images/caltrack-logo.webp')}
            accessibilityLabel="CalTrack logo"
            style={{
              position: 'absolute',
              width: logoSize * 1280 / 944,
              height: logoSize * 1280 / 944,
              left: -logoSize * 156 / 944,
              top: -logoSize * 152 / 944,
            }}
          />
        </View>
        <Text
          accessibilityRole="header"
          style={[
            styles.wordmark,
            { fontSize: 80 * scale, lineHeight: 90 * scale },
            fontsLoaded && { fontFamily: 'CalTrack-Black' },
          ]}
        >
          <Text style={styles.cal}>Cal</Text><Text style={styles.track}>Track</Text>
        </Text>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Start App"
          accessibilityHint="Opens your daily meal dashboard"
          pressedScale={0.97}
          onPress={() => router.replace('/dashboard')}
          style={[
            styles.startButton,
            { width: 270 * scale, minHeight: 66 * scale, marginTop: 48 * scale },
          ]}
        >
          <View accessible={false} style={styles.playIcon} />
          <Text style={[styles.buttonText, { fontSize: 25 * scale }]}>Start App</Text>
        </AnimatedPressable>
      </View>
    </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brand: {
    alignItems: 'center',
  },
  logoFrame: {
    overflow: 'hidden',
  },
  wordmark: {
    marginTop: 8,
    fontWeight: '900',
    letterSpacing: -3,
    textAlign: 'center',
  },
  cal: { color: '#08a92d' },
  track: { color: '#ff9f00' },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#009c35',
    ...gradient('linear-gradient(150deg, #61d51a 0%, #0bb73b 45%, #00652e 100%)'),
    boxShadow: '0px 10px 22px rgba(25, 181, 65, 0.22)',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderLeftWidth: 22,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
