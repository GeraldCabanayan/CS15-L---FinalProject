import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CalTrackProvider } from "../caltrack/store";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fafafa' }}>
        <CalTrackProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </CalTrackProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
