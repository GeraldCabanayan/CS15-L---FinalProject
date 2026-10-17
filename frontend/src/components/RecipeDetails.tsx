import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Meal } from '../caltrack/types';
import { AnimatedPressable } from './AnimatedPressable';

export function RecipeDetails({ meal, collapsible = false }: { meal: Meal; collapsible?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.details}>
      {collapsible && (
        <AnimatedPressable accessibilityRole="button" accessibilityState={{ expanded }}
          accessibilityLabel={`${expanded ? 'Hide' : 'View'} ${meal.name} ingredients and instructions`}
          style={styles.toggle} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.link}>{expanded ? 'Hide details ▴' : 'View ingredients & instructions ▾'}</Text>
        </AnimatedPressable>
      )}
      {(!collapsible || expanded) && <>
        <Text style={styles.heading}>Ingredients</Text>
        <Text style={styles.muted}>For the whole recipe · Makes {meal.servings} serving(s)</Text>
        {meal.ingredients.map((ingredient) => (
          <Text key={ingredient.id} style={styles.body}>
            • {ingredient.name} — {ingredient.amount || 'Amount not recorded'}
          </Text>
        ))}
        <Text style={styles.heading}>Instructions</Text>
        <Text style={styles.body}>{meal.instructions?.trim() || 'No instructions recorded yet. Add them in Recipes → Edit.'}</Text>
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  details: { gap: 8 },
  heading: { fontSize: 16, fontWeight: '800', color: '#171717', marginTop: 6 },
  body: { color: '#333', lineHeight: 23 },
  muted: { color: '#666', lineHeight: 20 },
  toggle: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 },
  link: { color: '#007d00', fontWeight: '700' },
});
