import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense } from "react";
import { ActivityIndicator, View } from "react-native";
import { CalTrackProvider } from "../caltrack/store";
import { DATABASE_NAME, migrateDb } from "../db/database";

// Shown by expo-router if the database fails to open.
export { ErrorBoundary } from "expo-router";

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fafafa" }}>
      <ActivityIndicator size="large" color="#00c100" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<Loading />}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDb} useSuspense>
        <CalTrackProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </CalTrackProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
