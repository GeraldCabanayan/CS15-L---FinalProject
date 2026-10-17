import { ScrollView, Text, View } from 'react-native';
import { AppNav } from '../components/AppNav';
import { DailyDiary, DateHeading, diaryStyles as styles } from '../components/DailyDiary';
export default function Home() {
  return (
  <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { fontSize: 30 }]}>CalTrack</Text>
      <Text style={styles.muted}>Your daily meal diary</Text>
      <DailyDiary />
    </ScrollView>
    <AppNav />
  </View>
  );
}
