import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { errorMessage, useCalTrack } from '../caltrack/store';
import { calorieProgress, dailyNutrition, mealCategories, perServing, scaleNutrition, type LoggedMeal, type Meal, type MealCategory } from '../caltrack/types';
import { recommendRecipes } from '../caltrack/suggestions';
import { localDate } from '../caltrack/repository';

export async function perform(action: () => Promise<void>) {
  try { await action(); } catch (error) { Alert.alert('Could not save changes', errorMessage(error)); }
}

export function DateHeading() {
  const { date, selectDate, isSaving } = useCalTrack();
  return <View style={diaryStyles.card}>
    <Text style={diaryStyles.title}>Selected date: {date}</Text>
    <Link href="/calendar" style={diaryStyles.link}>Choose a date</Link>
    {date !== localDate() && <Pressable disabled={isSaving} style={diaryStyles.button} onPress={() => perform(() => selectDate(localDate()))}>
      <Text style={diaryStyles.link}>Return to today</Text>
    </Pressable>}
  </View>;
}

export function DailyProgress() {
  const { meals, loggedMeals, goal } = useCalTrack();
  const total = dailyNutrition(meals, loggedMeals);
  const progress = calorieProgress(total.calories, goal.calorieTarget);
  const incomplete = loggedMeals.some((log) => meals.some((meal) => meal.id === log.mealId && meal.nutritionComplete === false));
  return <View style={diaryStyles.hero}>
    <Text style={diaryStyles.white}>DAILY CALORIES</Text>
    <Text style={diaryStyles.value}>{Math.round(total.calories)} / {goal.calorieTarget} kcal</Text>
    <Text style={diaryStyles.white}>{Math.round(progress.remaining)} remaining · {Math.round(progress.percent)}% consumed</Text>
    {progress.over > 0 && <Text style={diaryStyles.white}>{Math.round(progress.over)} kcal above target</Text>}
    {(['protein', 'carbs', 'fat'] as const).map((key) => <Text key={key} style={diaryStyles.white}>
      {key}: {total[key].toFixed(1)} g{goal[`${key}Target`] != null ? ` / ${goal[`${key}Target`]} g` : ''}
    </Text>)}
    <Text style={diaryStyles.white}>Fiber {total.fiber.toFixed(1)} g · Sugar {total.sugar.toFixed(1)} g · Sodium {total.sodium.toFixed(0)} mg</Text>
    {incomplete && <Text style={diaryStyles.white}>Nutrition totals are incomplete. An imported recipe has calories only; edit it to enter the missing nutrients.</Text>}
  </View>;
}

export function LogRecipe({ meal }: { meal: Meal }) {
  const { logMeal, loggedMeals, date, isSaving } = useCalTrack();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState<MealCategory>('breakfast');
  const duplicate = loggedMeals.some((log) => log.mealId === meal.id && log.category === category);
  return <View>
    <Pressable disabled={isSaving} style={diaryStyles.button} onPress={() => setOpen(!open)}><Text style={diaryStyles.link}>Add to {date}</Text></Pressable>
    {open && <View style={diaryStyles.card}>
      <CategoryPicker value={category} onChange={setCategory} />
      <Text>Servings to log</Text>
      <TextInput accessibilityLabel="Servings to log" style={diaryStyles.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
      {duplicate ? <Text>Already logged in this category. Edit its servings in the diary.</Text> : <Pressable disabled={isSaving} style={diaryStyles.button} onPress={() => perform(async () => {
        await logMeal(meal.id, category, Number(quantity)); setOpen(false);
      })}><Text style={diaryStyles.link}>Confirm add</Text></Pressable>}
    </View>}
  </View>;
}

function CategoryPicker({ value, onChange }: { value: MealCategory; onChange: (value: MealCategory) => void }) {
  const { isSaving } = useCalTrack();
  return <View style={diaryStyles.row}>{mealCategories.map((category) => <Pressable key={category} disabled={isSaving}
    accessibilityRole="button" accessibilityState={{ selected: value === category }}
    style={[diaryStyles.button, value === category && { backgroundColor: '#dff6df' }]} onPress={() => onChange(category)}>
    <Text>{category}</Text>
  </Pressable>)}</View>;
}

function DiaryEntry({ meal, entry }: { meal: Meal; entry: LoggedMeal }) {
  const { updateLog, deleteLog, isSaving } = useCalTrack();
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [category, setCategory] = useState(entry.category);
  const nutrition = scaleNutrition(perServing(meal), entry.quantity);
  return <View style={diaryStyles.card}>
    <Text style={diaryStyles.title}>{meal.name}</Text>
    <Text>{entry.quantity} serving(s) · {nutrition.calories.toFixed(0)} kcal</Text>
    <Text>Protein {nutrition.protein.toFixed(1)} g · Carbs {nutrition.carbs.toFixed(1)} g · Fat {nutrition.fat.toFixed(1)} g</Text>
    {meal.nutritionComplete === false && <Text style={diaryStyles.muted}>Imported recipe: macro values have not been recorded.</Text>}
    <View style={diaryStyles.row}>
      <Pressable disabled={isSaving} style={diaryStyles.button} onPress={() => { setQuantity(String(entry.quantity)); setCategory(entry.category); setEditing(!editing); }}><Text style={diaryStyles.link}>Edit log</Text></Pressable>
      <Pressable disabled={isSaving} style={diaryStyles.button} onPress={() => perform(() => deleteLog(entry.id))}><Text style={diaryStyles.link}>Remove log</Text></Pressable>
    </View>
    {editing && <View>
      <CategoryPicker value={category} onChange={setCategory} />
      <TextInput accessibilityLabel="Logged servings" style={diaryStyles.input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
      <Pressable disabled={isSaving} style={diaryStyles.button} onPress={() => perform(async () => {
        await updateLog(entry.id, category, Number(quantity)); setEditing(false);
      })}><Text style={diaryStyles.link}>Save log</Text></Pressable>
    </View>}
  </View>;
}

export function DailyDiary() {
  const { meals, loggedMeals, goal } = useCalTrack();
  const [suggesting, setSuggesting] = useState(false);
  const remaining = calorieProgress(dailyNutrition(meals, loggedMeals).calories, goal.calorieTarget).remaining;
  const suggestions = recommendRecipes(meals, remaining);
  return <View style={{ gap: 12 }}>
    <DailyProgress />
    <Link href="/recipes" style={diaryStyles.link}>Browse saved recipes to add a meal</Link>
    {mealCategories.map((category) => <View key={category}>
      <Text style={diaryStyles.title}>{category}</Text>
      {!loggedMeals.some((log) => log.category === category) && <Text style={diaryStyles.muted}>No meals logged.</Text>}
      {loggedMeals.filter((log) => log.category === category).map((entry) => {
        const meal = meals.find((item) => item.id === entry.mealId);
        return meal ? <DiaryEntry key={entry.id} meal={meal} entry={entry} /> : null;
      })}
    </View>)}
    <Pressable style={diaryStyles.button} onPress={() => setSuggesting(!suggesting)}><Text style={diaryStyles.link}>Suggest recipes for this date</Text></Pressable>
    {suggesting && <View>
      <Text style={diaryStyles.muted}>One-serving options within {remaining.toFixed(0)} remaining kcal. Adjust portions when logging.</Text>
      {!suggestions.length && <Text>No saved recipes fit the remaining calories.</Text>}
      {suggestions.map((meal) => <View key={meal.id} style={diaryStyles.card}>
        <Text style={diaryStyles.title}>{meal.name}</Text>
        <Text>{perServing(meal).calories.toFixed(0)} kcal · Protein {perServing(meal).protein.toFixed(1)} g · Carbs {perServing(meal).carbs.toFixed(1)} g · Fat {perServing(meal).fat.toFixed(1)} g</Text>
        {meal.nutritionComplete === false && <Text style={diaryStyles.muted}>Imported recipe: macro values have not been recorded.</Text>}
        <LogRecipe meal={meal} />
      </View>)}
      <Link href="/recipes" style={diaryStyles.link}>Browse all recipes</Link>
      <Link href="/create" style={diaryStyles.link}>Create a recipe</Link>
    </View>}
  </View>;
}

export const diaryStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 22, gap: 16, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '800', color: '#171717', textTransform: 'capitalize' },
  card: { padding: 14, gap: 8, backgroundColor: '#fff', borderRadius: 16, marginVertical: 6 },
  hero: { padding: 20, gap: 10, backgroundColor: '#111', borderRadius: 24 },
  white: { color: '#fff', lineHeight: 21 },
  value: { fontSize: 26, fontWeight: '800', color: '#fff' },
  muted: { color: '#666', lineHeight: 21 },
  link: { color: '#007d00', fontWeight: '700', paddingVertical: 8 },
  button: { minHeight: 44, padding: 10, justifyContent: 'center', borderRadius: 10 },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
