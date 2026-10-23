import { Stack } from 'expo-router';
import { CalTrackProvider } from '../../caltrack/store';

export default function MainLayout() {
  return (
    <CalTrackProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
    </CalTrackProvider>
  );
}
