import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { CalTrackProvider } from "../caltrack/store";
// Shown by expo-router if the database fails to open.
export { ErrorBoundary } from "expo-router";

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa" }}>
      <ActivityIndicator size="large" color="#00c100" />
    </View>
  );
}

// CalTrackProvider opens the SQLite database, loads the saved recipes, and
// shows a loading / retry screen until they are ready.
export default function RootLayout() {
  return (
    <CalTrackProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </CalTrackProvider>
  );
}


