import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppBackground } from '../components/AppBackground';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppBackground>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        </SafeAreaView>
      </AppBackground>
    </SafeAreaProvider>
  );
}
