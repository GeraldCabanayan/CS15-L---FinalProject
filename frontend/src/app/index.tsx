import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppNav } from "../components/AppNav";
import { errorMessage, useCalTrack } from "../caltrack/store";
import {
  perServing, sumNutrition, type LoggedMeal, type Meal, type MealCategory,
} from "../caltrack/types";

const categories: { value: MealCategory; label: string }[] = [
  { value: "uncategorized", label: "Uncategorized" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

export default function Home() {
  const { meals, loggedMeals, goal } = useCalTrack();
  const logged = loggedMeals.flatMap((entry) => {
    const meal = meals.find((item) => item.id === entry.mealId);
    return meal ? [{ meal, category: entry.category, entry }] : [];
  });
  const eaten = sumNutrition(logged.map(({ meal }) => perServing(meal)));
  const progress = Math.min(eaten.calories / goal.calorieTarget, 1);

  return (
    
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GOOD MORNING</Text>
            <Text style={styles.title}>Dexter</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>CT</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View>
            <Text style={styles.heroLabel}>CALORIES</Text>
            <Text style={styles.heroValue}>
              {Math.round(eaten.calories)}{" "}
              <Text style={styles.heroUnit}>/ {goal.calorieTarget} kcal</Text>
            </Text>
            <Text style={styles.heroHint}>
              {Math.max(goal.calorieTarget - eaten.calories, 0).toFixed(0)} kcal remaining
            </Text>
          </View>
          <View style={styles.ring}>
            <Text style={styles.ringText}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Today&apos;s macros</Text>
        <View style={styles.macroRow}>
          <Macro label="Protein" value={eaten.protein} color="#00c100" />
          <Macro label="Carbs" value={eaten.carbs} color="#ff9f1c" />
          <Macro label="Fat" value={eaten.fat} color="#171717" />
        </View>

        <View style={styles.sectionLine}>
          <Text style={styles.sectionTitle}>Your meals</Text>
          <Link href="/recipes" style={styles.link}>
            View all
          </Link>
        </View>


        <View style={styles.categoryList}>
          {categories.map((category) => {
            const categoryMeals = logged.filter(
              (entry) => entry.category === category.value,
            );
            
          //code for meal category
            return (
              <View key={category.value} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryTitle}>{category.label}</Text>
                  <Text style={styles.categoryCount}>{categoryMeals.length}</Text>
                </View>
                {categoryMeals.length === 0 ? (
                  <View style={styles.categoryEmpty}>
                    <Text style={styles.emptyCopy}>No meals logged</Text>
                    {category.value === "uncategorized" && (
                      <Link href="/recipes" style={styles.categoryLink}>
                        Browse recipes
                      </Link>
                    )}
                  </View>
                  
                ) : (
                  categoryMeals.map(({ meal, entry }) => <MealCard key={entry.id} meal={meal} entry={entry} />)
                )}
                
              </View>
            );
          })}
        </View>
      </ScrollView>
      <AppNav />
    </View>

    
  );
}

function MealCard({ meal, entry }: { meal: Meal; entry: LoggedMeal }) {
  const { updateLog, deleteLog, isSaving } = useCalTrack();
  const [choosing, setChoosing] = useState(false);
  const change = async (category?: MealCategory) => {
    try {
      if (category) await updateLog(entry.id, category);
      else await deleteLog(entry.id);
      setChoosing(false);
    } catch (error) {
      Alert.alert("Could not update meal log", errorMessage(error));
    }
  };
  return (
    <View>
    <View style={styles.mealCard}>
      <Text style={styles.mealEmoji}>🥗</Text>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{meal.name}</Text>
        <Text style={styles.mealMeta}>
          {Math.round(perServing(meal).calories)} kcal · {meal.ingredients.length} ingredients
        </Text>
      </View>
      <Pressable disabled={isSaving} onPress={() => setChoosing((value) => !value)}>
        <Text style={styles.link}>Change</Text>
      </Pressable>
      <Pressable disabled={isSaving} onPress={() => change()} style={{ marginLeft: 12 }}>
        <Text style={{ color: "red", fontWeight: "bold" }}>Remove</Text>
      </Pressable>
    </View>
    {choosing && <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 12 }}>
      {categories.map((category) => <Pressable key={category.value} disabled={isSaving}
        onPress={() => change(category.value)}>
        <Text style={styles.link}>{category.label}</Text>
      </Pressable>)}
    </View>}
    </View>
  );
}

function Macro({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.macro}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{Math.round(value)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  content: {
    padding: 22,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  eyebrow: {
    color: "#00a900",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: "#101010",
    fontSize: 29,
    fontWeight: "800",
    marginTop: 4,
  },
  avatar: {
    backgroundColor: "#dff6df",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#008900",
    fontWeight: "800",
  },
  hero: {
    backgroundColor: "#111",
    borderRadius: 24,
    padding: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    color: "#a9a9a9",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroValue: {
    color: "#fff",
    fontSize: 29,
    fontWeight: "800",
    marginTop: 10,
  },
  heroUnit: {
    color: "#a9a9a9",
    fontSize: 14,
    fontWeight: "500",
  },
  heroHint: {
    color: "#ffb23d",
    marginTop: 8,
    fontSize: 12,
  },
  ring: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 7,
    borderColor: "#00c100",
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#171717",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 26,
    marginBottom: 13,
  },
  macroRow: {
    flexDirection: "row",
    gap: 8,
  },
  macro: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 9,
  },
  macroLabel: {
    color: "#777",
    fontSize: 12,
  },
  macroValue: {
    color: "#171717",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 5,
  },
  sectionLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  link: {
    color: "#00a900",
    fontWeight: "700",
  },
  categoryList: {
    gap: 12,
  },
  categorySection: {
    backgroundColor: "#f1f1f1",
    borderRadius: 18,
    padding: 10,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#171717",
  },
  categoryCount: {
    minWidth: 22,
    textAlign: "center",
    color: "#008d00",
    backgroundColor: "#dff6df",
    borderRadius: 11,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "800",
  },
  categoryEmpty: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  emptyCopy: {
    color: "#777",
    fontSize: 12,
    textAlign: "center",
  },
  categoryLink: {
    color: "#00a900",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 9,
  },
  mealCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 13,
    marginBottom: 8,
  },
  mealEmoji: {
    fontSize: 25,
    marginRight: 11,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontWeight: "800",
    fontSize: 15,
  },
  mealMeta: {
    color: "#777",
    marginTop: 4,
    fontSize: 12,
  },
  check: {
    color: "#00c100",
    fontSize: 22,
    fontWeight: "800",
  },
  container: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },

  button: {
    flex: 1,
    backgroundColor: '#00c100',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 3, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    position: "relative",
    zIndex: 11,
    top: 855
  },

  buttonPressed: {
    opacity: 0.7,
    backgroundColor: '#61cf61', // Darkens the button when pressed
  },
});
