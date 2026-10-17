import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { errorMessage, useCalTrack } from '../caltrack/store';
import {
  calorieProgress,
  dailyNutrition,
  mealCategories,
  perServing,
  scaleNutrition,
  type LoggedMeal,
  type Meal,
  type MealCategory,
} from '../caltrack/types';
import { recommendRecipes } from '../caltrack/suggestions';
import { AnimatedPressable } from './AnimatedPressable';
import { RecipeDetails } from './RecipeDetails';
import { RecipeSuggestions } from './RecipeSuggestions';

const cardEntering = FadeInDown.duration(60);
const cardExiting = FadeOutUp.duration(120);
const itemEntering = FadeIn.duration(180);
const itemExiting = FadeOut.duration(120);
const diaryLayout = LinearTransition.duration(180);

export async function perform(action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    Alert.alert('Could not save changes', errorMessage(error));
  }
}

export function DailyProgress() {
  const { meals, loggedMeals, goal } = useCalTrack();
  const total = dailyNutrition(meals, loggedMeals);
  const progress = calorieProgress(total.calories, goal.calorieTarget);
  const incomplete = loggedMeals.some((log) =>
    meals.some((meal) => meal.id === log.mealId && meal.nutritionComplete === false),
  );

  return (
    <Animated.View entering={itemEntering} layout={diaryLayout} style={diaryStyles.hero}>
      <Text style={diaryStyles.white}>Nutrition Profile</Text>
      <Text style={diaryStyles.value}>
        {Math.round(total.calories)} / {goal.calorieTarget} kcal
      </Text>
      <Text style={diaryStyles.white}>
        {Math.round(progress.remaining)} remaining · {Math.round(progress.percent)}% consumed
      </Text>
      <AnimatedCalorieBar percent={progress.percent} over={progress.over > 0} />
      {progress.over > 0 && (
        <Text style={diaryStyles.white}>
          {Math.round(progress.over)} kcal above target
        </Text>
      )}
      {(['protein', 'carbs', 'fat'] as const).map((key) => (
        <Text key={key} style={diaryStyles.white}>
          {key}: {total[key].toFixed(1)} g
          {goal[`${key}Target`] != null ? ` / ${goal[`${key}Target`]} g` : ''}
        </Text>
      ))}
      <Text style={diaryStyles.white}>
        Fiber {total.fiber.toFixed(1)} g · Sugar {total.sugar.toFixed(1)} g · Sodium{' '}
        {total.sodium.toFixed(0)} mg
      </Text>
      {incomplete && (
        <Text style={diaryStyles.white}>
          Nutrition totals are incomplete. An imported recipe has calories only; edit it to
          enter the missing nutrients.
        </Text>
      )}
    </Animated.View>
  );
}

function AnimatedCalorieBar({ percent, over }: { percent: number; over: boolean }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(Math.max(percent, 0), 100) / 100, {
      duration: 500,
    });
  }, [percent, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: trackWidth * progress.value,
  }));

  return (
    <View
      accessibilityLabel={`${Math.round(percent)} percent of calorie target consumed`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(Math.min(Math.max(percent, 0), 100)),
      }}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={diaryStyles.progressTrack}
    >
      <Animated.View
        style={[diaryStyles.progressFill, over && diaryStyles.progressOver, animatedStyle]}
      />
    </View>
  );
}

export function LogRecipe({ meal }: { meal: Meal }) {
  const { logMeal, loggedMeals, date, isSaving } = useCalTrack();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState<MealCategory>(meal.category ?? 'uncategorized');
  const duplicate = loggedMeals.some(
    (log) => log.mealId === meal.id && log.category === category,
  );

  return (
    <View>
      <AnimatedPressable
        disabled={isSaving}
        style={diaryStyles.button}
        onPress={() => setOpen(!open)}
      >
        <Text style={diaryStyles.link}>Add to {date}</Text>
      </AnimatedPressable>

      {open && (
        <Animated.View
          entering={cardEntering}
          exiting={cardExiting}
          layout={diaryLayout}
          style={diaryStyles.card}
        >
          <CategoryPicker value={category} onChange={setCategory} />
          <Text>Servings to log</Text>
          <TextInput
            accessibilityLabel="Servings to log"
            style={diaryStyles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />

          {duplicate ? (
            <Text>Already logged in this category. Edit its servings in the diary.</Text>
          ) : (
            <AnimatedPressable
              disabled={isSaving}
              style={diaryStyles.button}
              onPress={() =>
                perform(async () => {
                  await logMeal(meal.id, category, Number(quantity));
                  setOpen(false);
                })
              }
            >
              <Text style={diaryStyles.link}>Confirm add</Text>
            </AnimatedPressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: MealCategory;
  onChange: (value: MealCategory) => void;
}) {
  const { isSaving } = useCalTrack();

  return (
    <View style={diaryStyles.row}>
      {mealCategories.map((category) => (
        <AnimatedPressable
          key={category}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityState={{ selected: value === category }}
          style={[
            diaryStyles.button,
            value === category && { backgroundColor: '#dff6df' },
          ]}
          onPress={() => onChange(category)}
        >
          <Text>{category}</Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}

function DiaryEntry({ meal, entry }: { meal: Meal; entry: LoggedMeal }) {
  const { updateLog, deleteLog, isSaving } = useCalTrack();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [category, setCategory] = useState(entry.category);
  const nutrition = scaleNutrition(perServing(meal), entry.quantity);
  const cardScale = useSharedValue(1);
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  return (
    <Animated.View
      entering={cardEntering}
      exiting={cardExiting}
      layout={diaryLayout}
      style={[diaryStyles.card, cardAnimatedStyle]}
    >
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`${meal.name} meal details`}
        accessibilityState={{ expanded }}
        pressedScale={1}
        style={diaryStyles.cardSummary}
        onPressIn={() => {
          cardScale.value = withTiming(0.98, { duration: 80 });
        }}
        onPressOut={() => {
          cardScale.value = withTiming(1, { duration: 120 });
        }}
        onPress={() => {
          setExpanded(!expanded);
          if (expanded) setEditing(false);
        }}
      >
        <Text style={diaryStyles.title}>{meal.name}</Text>
      <Text>
        {entry.quantity} serving(s) · {nutrition.calories.toFixed(0)} kcal
      </Text>
      <Text>
        Protein {nutrition.protein.toFixed(1)} g · Carbs {nutrition.carbs.toFixed(1)} g · Fat{' '}
        {nutrition.fat.toFixed(1)} g
      </Text>
      {meal.nutritionComplete === false && (
        <Text style={diaryStyles.muted}>
          Imported recipe: macro values have not been recorded.
        </Text>
      )}

      </AnimatedPressable>

      {expanded && (
        <Animated.View
          entering={cardEntering}
          exiting={cardExiting}
          layout={diaryLayout}
          style={diaryStyles.actionPanel}
        >
          <View style={diaryStyles.actionRow}>
        <AnimatedPressable
          disabled={isSaving}
          style={[diaryStyles.button, diaryStyles.editAction]}
          onPress={() => {
            setQuantity(String(entry.quantity));
            setCategory(entry.category);
            setEditing(!editing);
          }}
        >
          <Text style={[diaryStyles.link, diaryStyles.editActionText]}>Edit</Text>
        </AnimatedPressable>
        <AnimatedPressable
          disabled={isSaving}
          style={[diaryStyles.button, diaryStyles.removeAction]}
          onPress={() => perform(() => deleteLog(entry.id))}
        >
          <Text style={[diaryStyles.link, diaryStyles.removeActionText]}>Remove</Text>
        </AnimatedPressable>
      </View>

      {editing && (
        <Animated.View entering={cardEntering} exiting={cardExiting} layout={diaryLayout}>
          <CategoryPicker value={category} onChange={setCategory} />
          <TextInput
            accessibilityLabel="Logged servings"
            style={diaryStyles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
          />
          <AnimatedPressable
            disabled={isSaving}
            style={diaryStyles.button}
            onPress={() =>
              perform(async () => {
                await updateLog(entry.id, category, Number(quantity));
                setEditing(false);
              })
            }
          >
            <Text style={diaryStyles.link}>Save log</Text>
          </AnimatedPressable>
        </Animated.View>
      )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

export function DailyDiary({ showRecipeSuggestions = true }: { showRecipeSuggestions?: boolean }) {
  const { meals, loggedMeals, goal } = useCalTrack();
  const [suggesting, setSuggesting] = useState(false);
  const remaining = calorieProgress(
    dailyNutrition(meals, loggedMeals).calories,
    goal.calorieTarget,
  ).remaining;
  const suggestions = recommendRecipes(meals, remaining);

  return (
    <View style={{ gap: 12 }}>
      <DailyProgress />
      {showRecipeSuggestions && <RecipeSuggestions />}
      <Link href="/recipes" style={diaryStyles.link}>
        Browse saved recipes to add a meal
      </Link>

      {mealCategories.map((category) => (
        <Animated.View key={category} layout={diaryLayout}>
          <Text style={diaryStyles.title}>{category}</Text>
          {!loggedMeals.some((log) => log.category === category) && (
            <Text style={diaryStyles.muted}>No meals logged.</Text>
          )}
          {loggedMeals
            .filter((log) => log.category === category)
            .map((entry) => {
              const meal = meals.find((item) => item.id === entry.mealId);
              return meal ? (
                <DiaryEntry key={entry.id} meal={meal} entry={entry} />
              ) : null;
            })}
        </Animated.View>
      ))}

      {showRecipeSuggestions && <AnimatedPressable
        style={diaryStyles.button}
        onPress={() => setSuggesting(!suggesting)}
      >
        <Text style={diaryStyles.link}>Suggest recipes for this date</Text>
      </AnimatedPressable>}

      {showRecipeSuggestions && suggesting && (
        <Animated.View
          entering={cardEntering}
          exiting={cardExiting}
          layout={diaryLayout}
        >
          <Text style={diaryStyles.muted}>
            One-serving options within {remaining.toFixed(0)} remaining kcal. Adjust portions
            when logging.
          </Text>
          {!suggestions.length && (
            <Text>No saved recipes fit the remaining calories.</Text>
          )}
          {suggestions.map((meal) => (
            <Animated.View
              key={meal.id}
              entering={itemEntering}
              exiting={itemExiting}
              layout={diaryLayout}
              style={diaryStyles.card}
            >
              <Text style={diaryStyles.title}>{meal.name}</Text>
              <Text>
                {perServing(meal).calories.toFixed(0)} kcal · Protein{' '}
                {perServing(meal).protein.toFixed(1)} g · Carbs{' '}
                {perServing(meal).carbs.toFixed(1)} g · Fat{' '}
                {perServing(meal).fat.toFixed(1)} g
              </Text>
              {meal.nutritionComplete === false && (
                <Text style={diaryStyles.muted}>
                  Imported recipe: macro values have not been recorded.
                </Text>
              )}
              <RecipeDetails meal={meal} collapsible />
              <LogRecipe meal={meal} />
            </Animated.View>
          ))}
          <Link href="/recipes" style={diaryStyles.link}>
            Browse all recipes
          </Link>
          <Link href="/create" style={diaryStyles.link}>
            Create a recipe
          </Link>
        </Animated.View>
      )}
    </View>
  );
}

export const diaryStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  content: {
    padding: 22,
    gap: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#171717',
    textTransform: 'capitalize',
  },
  card: {
    padding: 14,
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 6,
  },
  cardSummary: {
    gap: 8,
    padding: 2,
    borderRadius: 10,
  },
  actionPanel: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 100,
  },
  editAction: {

    minWidth: 110,
    alignItems: 'center',
  },
  editActionText: {
    color: '#16833a',
  },
  removeAction: {
    
    minWidth: 110,
    alignItems: 'center',
  },
  removeActionText: {
    color: '#c62828',
  },
  hero: {
    padding: 20,
    gap: 10,
    backgroundColor: '#111',
    borderRadius: 24,
  },
  white: {
    color: '#fff',
    lineHeight: 21,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    backgroundColor: '#3a3a3a',
    borderRadius: 999,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00c100',
    borderRadius: 999,
  },
  progressOver: {
    backgroundColor: '#ff9f43',
  },
  muted: {
    color: '#666',
    lineHeight: 21,
  },
  link: {
    color: '#007d00',
    fontWeight: '700',
    paddingVertical: 8,
  },
  button: {
    minHeight: 44,
    padding: 10,
    justifyContent: 'center',
    borderRadius: 10,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
