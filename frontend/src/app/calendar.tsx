import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
  LinearTransition,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { calendarDateKey, calendarMonth } from '../caltrack/calendar';
import { localDate } from '../caltrack/repository';
import { errorMessage, useCalTrack } from '../caltrack/store';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AppNav } from '../components/AppNav';
import { DailyDiary, diaryStyles as styles, perform } from '../components/DailyDiary';

const panelEntering = FadeInDown.duration(180);
const panelExiting = FadeOutUp.duration(140);
const monthFromLeft = FadeInLeft.duration(180);
const monthFromRight = FadeInRight.duration(180);
const monthToLeft = FadeOutLeft.duration(140);
const monthToRight = FadeOutRight.duration(140);
const monthFadeIn = FadeIn.duration(160);
const monthFadeOut = FadeOut.duration(120);
const calendarLayout = LinearTransition.duration(180);

const months = Array.from({ length: 12 }, (_, index) => ({
  number: index + 1,
  label: new Date(2024, index, 1, 12).toLocaleDateString(undefined, {
    month: 'short',
  }),
}));

export default function Calendar() {
  const { date, selectDate, recordedDates, isSaving } = useCalTrack();
  const [month, setMonth] = useState(date);
  const [showDateSearch, setShowDateSearch] = useState(false);
  const [searchMonth, setSearchMonth] = useState(Number(date.slice(5, 7)));
  const [searchYear, setSearchYear] = useState(date.slice(0, 4));
  const [searchDay, setSearchDay] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [monthDirection, setMonthDirection] = useState<-1 | 0 | 1>(0);

  useEffect(() => {
    setMonthDirection(0);
    setMonth(date);
  }, [date]);

  const calendar = calendarMonth(month);

  const toggleDateSearch = () => {
    if (!showDateSearch) {
      setSearchMonth(Number(calendar.key.slice(5, 7)));
      setSearchYear(calendar.key.slice(0, 4));
      setSearchDay('');
      setSearchError(null);
    }
    setShowDateSearch((visible) => !visible);
  };

  const moveMonth = (offset: -1 | 1) => {
    setMonthDirection(offset);
    setMonth(calendarMonth(month, offset).key);
  };

  const goToSearchDate = async () => {
    try {
      const year = searchYear.trim();
      if (!/^\d{4}$/.test(year)) throw new Error('Enter a four-digit year.');

      const hasDay = searchDay.trim().length > 0;
      const key = calendarDateKey(
        Number(year),
        searchMonth,
        hasDay ? Number(searchDay) : 1,
      );

      setMonthDirection(key < calendar.key ? -1 : key > calendar.key ? 1 : 0);
      setMonth(key);
      if (hasDay) await selectDate(key);
      setSearchError(null);
      setShowDateSearch(false);
    } catch (error) {
      setSearchError(errorMessage(error));
    }
  };

  const goToToday = async () => {
    const today = localDate();
    setMonthDirection(today < calendar.key ? -1 : today > calendar.key ? 1 : 0);
    setMonth(today);
    setSearchError(null);
    setShowDateSearch(false);
    await perform(() => selectDate(today));
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Meal calendar</Text>

        <View
          style={[
            styles.row,
            { justifyContent: 'space-between', alignItems: 'center' },
          ]}
        >
          <AnimatedPressable
            accessibilityLabel="Previous month"
            style={styles.button}
            onPress={() => moveMonth(-1)}
          >
            <Text>{'\u2039'}</Text>
          </AnimatedPressable>

          <Text style={styles.title}>{calendar.label}</Text>

          <AnimatedPressable
            accessibilityLabel="Next month"
            style={styles.button}
            onPress={() => moveMonth(1)}
          >
            <Text>{'\u203A'}</Text>
          </AnimatedPressable>
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showDateSearch }}
          style={[styles.button, calendarStyles.searchToggle]}
          onPress={toggleDateSearch}
        >
          <Text style={styles.link}>
            {showDateSearch ? 'Close date search' : 'Jump to a month or date'}
          </Text>
        </AnimatedPressable>

        {showDateSearch && (
          <Animated.View
            entering={panelEntering}
            exiting={panelExiting}
            layout={calendarLayout}
            style={styles.card}
          >
            <Text style={styles.title}>Jump to a month or date</Text>
            <Text style={styles.muted}>
              Choose a month and year. Add a day to select that exact diary date.
            </Text>

            <Text>Month</Text>
            <View style={calendarStyles.monthList}>
              {months.map((item) => {
                const selected = item.number === searchMonth;
                return (
                  <AnimatedPressable
                    key={item.number}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.button,
                      calendarStyles.monthButton,
                      selected && calendarStyles.selectedMonth,
                    ]}
                    onPress={() => setSearchMonth(item.number)}
                  >
                    <Text style={selected ? styles.link : undefined}>{item.label}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            <View style={calendarStyles.inputRow}>
              <View style={calendarStyles.inputGroup}>
                <Text>Year</Text>
                <TextInput
                  accessibilityLabel="Year to open"
                  style={styles.input}
                  value={searchYear}
                  onChangeText={setSearchYear}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="2026"
                />
              </View>
              <View style={calendarStyles.inputGroup}>
                <Text>Day (optional)</Text>
                <TextInput
                  accessibilityLabel="Day to select, optional"
                  style={styles.input}
                  value={searchDay}
                  onChangeText={setSearchDay}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="17"
                />
              </View>
            </View>

            {searchError && (
              <Text accessibilityLiveRegion="polite" style={calendarStyles.error}>
                {searchError}
              </Text>
            )}

            <View style={styles.row}>
              <AnimatedPressable
                disabled={isSaving}
                style={[styles.button, calendarStyles.actionButton]}
                onPress={() => void goToSearchDate()}
              >
                <Text style={styles.link}>Go</Text>
              </AnimatedPressable>
              <AnimatedPressable
                disabled={isSaving}
                style={[styles.button, calendarStyles.actionButton]}
                onPress={() => void goToToday()}
              >
                <Text style={styles.link}>Today</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.button, calendarStyles.actionButton]}
                onPress={toggleDateSearch}
              >
                <Text>Cancel</Text>
              </AnimatedPressable>
            </View>
          </Animated.View>
        )}

        <Animated.View
          key={calendar.key}
          entering={
            monthDirection < 0
              ? monthFromLeft
              : monthDirection > 0
                ? monthFromRight
                : monthFadeIn
          }
          exiting={
            monthDirection < 0
              ? monthToRight
              : monthDirection > 0
                ? monthToLeft
                : monthFadeOut
          }
          layout={calendarLayout}
          style={calendarStyles.calendarGrid}
        >
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <Text key={day} style={calendarStyles.weekday}>
              {day}
            </Text>
          ))}

          {calendar.days.map((key, index) => (
            <CalendarDay
              key={key ?? `empty-${index}`}
              dateKey={key}
              disabled={!key || isSaving}
              recorded={Boolean(key && recordedDates.includes(key))}
              selected={key === date}
              onPress={() => key && perform(() => selectDate(key))}
            />
          ))}
        </Animated.View>

        <Text style={styles.muted}>
          {'\u25CF'} Days with recorded meals
        </Text>

        <DailyDiary />
      </ScrollView>

      <AppNav />
    </View>
  );
}

function CalendarDay({
  dateKey,
  disabled,
  onPress,
  recorded,
  selected,
}: {
  dateKey: string | null;
  disabled: boolean;
  onPress: () => void;
  recorded: boolean;
  selected: boolean;
}) {
  const selectedProgress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selectedProgress.value = withSpring(selected ? 1 : 0, {
      damping: 16,
      stiffness: 220,
    });
  }, [selected, selectedProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selectedProgress.value,
      [0, 1],
      ['rgba(223, 246, 223, 0)', 'rgba(223, 246, 223, 1)'],
    ),
    transform: [{ scale: interpolate(selectedProgress.value, [0, 1], [1, 1.04]) }],
  }));

  return (
    <Animated.View style={[calendarStyles.day, animatedStyle]}>
      <AnimatedPressable
        accessibilityLabel={
          dateKey ? `${dateKey}${recorded ? ', meals recorded' : ''}` : 'Empty day'
        }
        accessibilityRole="button"
        accessibilityState={{ selected }}
        disabled={disabled}
        onPress={onPress}
        pressedScale={0.9}
        style={calendarStyles.dayButton}
      >
        <Text>{dateKey ? Number(dateKey.slice(-2)) : ''}</Text>
        <Text style={calendarStyles.recordedDot}>{recorded ? '\u25CF' : ' '}</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const calendarStyles = StyleSheet.create({
  searchToggle: {
    alignItems: 'center',
    borderColor: '#d8e8d8',
    borderWidth: 1,
  },
  monthList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    width: '31%',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  selectedMonth: {
    backgroundColor: '#dff6df',
    borderColor: '#007d00',
  },
  inputRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    minWidth: 130,
    gap: 6,
  },
  actionButton: {
    flexGrow: 1,
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  error: {
    color: '#b00020',
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
  },
  day: {
    width: '14.2857%',
    minHeight: 48,
    borderRadius: 10,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordedDot: {
    color: '#007d00',
    fontSize: 10,
  },
});
