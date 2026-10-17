import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { calendarMonth } from '../caltrack/calendar';
import { useCalTrack } from '../caltrack/store';
import { AppNav } from '../components/AppNav';
import { DailyDiary, DateHeading, diaryStyles as styles, perform } from '../components/DailyDiary';

export default function Calendar() {
  const { date, selectDate, recordedDates, isSaving } = useCalTrack();
  const [month, setMonth] = useState(date);
  useEffect(() => { setMonth(date); }, [date]);
  const calendar = calendarMonth(month);
  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Meal calendar</Text>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
        <Pressable accessibilityLabel="Previous month" style={styles.button} onPress={() => setMonth(calendarMonth(month, -1).key)}><Text>‹</Text></Pressable>
        <Text style={styles.title}>{calendar.label}</Text>
        <Pressable accessibilityLabel="Next month" style={styles.button} onPress={() => setMonth(calendarMonth(month, 1).key)}><Text>›</Text></Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <Text key={day} style={{ width: '14.2857%', textAlign: 'center' }}>{day}</Text>)}
        {calendar.days.map((key, index) => <Pressable key={key ?? `empty-${index}`} disabled={!key || isSaving}
          accessibilityRole="button" accessibilityLabel={key ? `${key}${recordedDates.includes(key) ? ', meals recorded' : ''}` : 'Empty day'}
          accessibilityState={{ selected: key === date }}
          style={{ width: '14.2857%', minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: key === date ? '#dff6df' : 'transparent', borderRadius: 10 }}
          onPress={() => key && perform(() => selectDate(key))}>
          <Text>{key ? Number(key.slice(-2)) : ''}</Text>
          <Text style={{ color: '#007d00', fontSize: 10 }}>{key && recordedDates.includes(key) ? '●' : ' '}</Text>
        </Pressable>)}
      </View>
      <Text style={styles.muted}>● Days with recorded meals</Text>
      <DateHeading />
      <DailyDiary />
    </ScrollView>
    <AppNav />
  </View>;
}
