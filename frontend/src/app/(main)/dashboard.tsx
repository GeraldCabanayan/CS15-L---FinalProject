import { useFonts } from 'expo-font';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppNav } from '../../components/AppNav';
import { DailyDiary, diaryStyles as styles } from '../../components/DailyDiary';
export default function Home() {
  const [fontsLoaded] = useFonts({
    'CalTrack-Black': require('../../assets/fonts/CabinetGrotesk-Black.otf'),
  });

  return (
<AppBackground style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={headerStyles.brand}>
        <View style={headerStyles.logoFrame}>
          <Image
            source={require('../../assets/images/caltrack-logo.webp')}
            accessibilityLabel="CalTrack logo"
            style={headerStyles.logo}
          />
        </View>
        <Text
          accessibilityRole="header"
          style={[
            headerStyles.wordmark,
            fontsLoaded && { fontFamily: 'CalTrack-Black' },
          ]}
        >
          <Text style={headerStyles.cal}>Cal</Text><Text style={headerStyles.track}>Track</Text>
        </Text>
      </View>
      <Text style={styles.muted}>Your daily meal diary</Text>
      <DailyDiary />
    </ScrollView>
    <AppNav />
  </AppBackground>
  );
}

const headerStyles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoFrame: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
  },
  logo: {
    position: 'absolute',
    width: 42 * 1280 / 944,
    height: 42 * 1280 / 944,
    left: -42 * 156 / 944,
    top: -42 * 152 / 944,
  },
  wordmark: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
    flexShrink: 1,
  },
  cal: { color: '#08a92d' },
  track: { color: '#ff9f00' },
});
import { AppBackground } from '../../components/AppBackground';
