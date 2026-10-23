import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCalTrack } from '../caltrack/store';
import { nameMatches } from '../caltrack/suggestions';
import { perServing } from '../caltrack/types';
import { AnimatedPressable } from './AnimatedPressable';
import { RecipeDetails } from './RecipeDetails';
import { cardSurface } from './surfaceStyles';

export function RecipeSuggestions() {
  const { meals } = useCalTrack();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Keep only an ID so edits and deletions always use the latest DB snapshot.
  const selected = meals.find((meal) => meal.id === selectedId);
  const options = query.trim() ? nameMatches(meals, query) : [...meals].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Recipe suggestions</Text>
      <Text style={styles.muted}>Choose a saved recipe to see its ingredients and preparation steps.</Text>
      {!meals.length ? <Text style={styles.muted}>No saved recipes. Create one in Recipes to get started.</Text> : <>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Choose a recipe"
          accessibilityState={{ expanded: open }} style={styles.dropdown}
          onPress={() => { setQuery(''); setOpen(!open); }}>
          <Text style={styles.selected}>{selected?.name ?? 'Select a recipe'}</Text>
          <Text style={styles.link}>{open ? '▴' : '▾'}</Text>
        </AnimatedPressable>
        {open && <View style={styles.options}>
          <TextInput accessibilityLabel="Filter recipe options" placeholder="Search recipes"
            placeholderTextColor="#777" value={query} onChangeText={setQuery} style={styles.search} />
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {!options.length && <Text style={styles.empty}>No matching recipes.</Text>}
            {options.map((meal) => <AnimatedPressable key={meal.id} accessibilityRole="button"
              accessibilityLabel={`Select ${meal.name}`} accessibilityState={{ selected: meal.id === selected?.id }}
              style={[styles.option, meal.id === selected?.id && styles.active]}
              onPress={() => { setSelectedId(meal.id); setOpen(false); setQuery(''); }}>
              <Text style={styles.selected}>{meal.name}</Text>
              <Text style={styles.muted}>{perServing(meal).calories.toFixed(0)} kcal per serving</Text>
            </AnimatedPressable>)}
          </ScrollView>
        </View>}
        {selected && <View accessibilityLiveRegion="polite" style={styles.details}>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.muted}>{perServing(selected).calories.toFixed(0)} kcal per serving</Text>
          {selected.nutritionComplete === false && <Text style={styles.muted}>Nutrition is incomplete for this imported recipe.</Text>}
          <RecipeDetails key={selected.id} meal={selected} />
        </View>}
      </>}
      <Link href="/recipes" style={styles.manage}>Manage recipes →</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    ...cardSurface,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#171717' },
  muted: { color: '#666', lineHeight: 21 },
  link: { color: '#007d00', fontWeight: '700' },
  manage: { color: '#007d00', fontWeight: '700', paddingVertical: 12 },
  dropdown: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: '#b7d9b7', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selected: { flex: 1, color: '#171717', fontWeight: '700' },
  options: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, overflow: 'hidden' },
  search: { minHeight: 48, padding: 12, backgroundColor: '#f5f5f5', color: '#171717' },
  list: { maxHeight: 240 },
  option: { minHeight: 48, padding: 12, gap: 4, borderTopWidth: 1, borderTopColor: '#eee' },
  active: { backgroundColor: '#dff6df' },
  empty: { padding: 12, color: '#666' },
  details: { gap: 8 },
});
