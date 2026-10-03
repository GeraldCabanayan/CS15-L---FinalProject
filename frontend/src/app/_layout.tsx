import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CalTrackProvider } from "../caltrack/store";

export default function RootLayout() {
  return (
    <CalTrackProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </CalTrackProvider>
  );
}
