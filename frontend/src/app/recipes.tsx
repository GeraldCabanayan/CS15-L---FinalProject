import { Link, router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppNav } from "../components/AppNav";
import { errorMessage, useCalTrack } from "../caltrack/store";
import { perServing, type MealCategory } from "../caltrack/types";

const logCategories: { value: MealCategory; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
];

export default function Recipes() {
  const { meals, logMeal, deleteMeal, loggedMeals, isSaving } = useCalTrack();
  const [mealToLog, setMealToLog] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const remove = async (id: string) => {
    try {
      await deleteMeal(id);
      setDeleteId(null);
    } catch (error) {
      Alert.alert("Could not delete recipe", errorMessage(error));
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR COLLECTION</Text>
        <Text style={styles.title}>Saved recipes</Text>
        <Text style={styles.subtitle}>
          Your go-to meals, ready when you are.
        </Text>
        <Link href="/create" style={styles.create}>
          ＋ Create recipe
        </Link>

        {meals.length === 0 && <Text style={styles.subtitle}>No saved recipes yet. Create your first recipe above.</Text>}
        {meals.map((meal) => {
          const nutrition = perServing(meal);
          const logged = loggedMeals.some((item) => item.mealId === meal.id);
          const choosingCategory = mealToLog === meal.id;

          return (
            <View key={meal.id} style={styles.card}>
              <View style={styles.food}>
                <Text style={styles.emoji}>🥗</Text>
                <View>
                  <Text style={styles.name}>{meal.name}</Text>
                  <Text style={styles.meta}>
                    {meal.servings} serving{meal.servings === 1 ? "" : "s"} ·{" "}
                    {meal.ingredients.length} ingredients
                  </Text>
                </View>
              </View>

              <View style={styles.stats}>
                <Stat
                  label="Calories"
                  value={`${Math.round(nutrition.calories)} kcal`}
                />
                <Stat
                  label="Protein"
                  value={`${Math.round(nutrition.protein)} g`}
                />
                <Stat
                  label="Carbs"
                  value={`${Math.round(nutrition.carbs)} g`}
                />
              </View>

              <View style={styles.logCategoryList}>
                <Pressable disabled={isSaving} style={styles.logCategory}
                  onPress={() => router.push({ pathname: "/create", params: { id: meal.id } })}>
                  <Text style={styles.logCategoryText}>Edit</Text>
                </Pressable>
                <Pressable disabled={isSaving} style={styles.logCategory} onPress={() => setDeleteId(meal.id)}>
                  <Text style={styles.logCategoryText}>Delete</Text>
                </Pressable>
              </View>
              {deleteId === meal.id && <View style={styles.logPicker}>
                <Text style={styles.logPickerLabel}>Delete this recipe and all its meal logs?</Text>
                <View style={styles.logCategoryList}>
                  <Pressable disabled={isSaving} style={styles.logCategory} onPress={() => remove(meal.id)}>
                    <Text style={styles.logCategoryText}>Confirm delete</Text>
                  </Pressable>
                  <Pressable style={styles.logCategory} onPress={() => setDeleteId(null)}>
                    <Text style={styles.logCategoryText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>}

              <Pressable
                style={[styles.log, logged && styles.logged]}
                disabled={isSaving || logged}
                onPress={() => !logged && setMealToLog(meal.id)}
              >
                <Text style={[styles.logText, logged && styles.loggedText]}>
                  {logged ? "✓" : "Add to today"}
                </Text>
              </Pressable>
              {choosingCategory && (
                <View style={styles.logPicker}>
                  <Text style={styles.logPickerLabel}>Add to which meal?</Text>
                  <View style={styles.logCategoryList}>
                    {logCategories.map((category) => (
                      <Pressable
                        key={category.value}
                        style={styles.logCategory}
                        disabled={isSaving}
                        onPress={async () => {
                          try {
                            await logMeal(meal.id, category.value);
                            setMealToLog(null);
                          } catch (error) {
                            Alert.alert("Could not log meal", errorMessage(error));
                          }
                        }}
                      >
                        <Text style={styles.logCategoryText}>{category.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <AppNav />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  content: { padding: 22, paddingBottom: 30 },
  eyebrow: {
    color: "#00a900",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { fontSize: 30, fontWeight: "800", color: "#111", marginTop: 5 },
  subtitle: { color: "#777", marginTop: 6 },
  create: {
    alignSelf: "flex-start",
    backgroundColor: "#00c100",
    color: "#fff",
    borderRadius: 11,
    paddingHorizontal: 15,
    paddingVertical: 11,
    fontWeight: "800",
    marginTop: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginTop: 18,
  },
  food: { flexDirection: "row", alignItems: "center" },
  emoji: { fontSize: 34, marginRight: 12 },
  name: { fontSize: 17, fontWeight: "800" },
  meta: { color: "#888", fontSize: 12, marginTop: 4 },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 14,
    marginTop: 15,
  },
  statLabel: { color: "#888", fontSize: 11 },
  statValue: { fontWeight: "800", marginTop: 4 },
  log: {
    backgroundColor: "#111",
    alignItems: "center",
    borderRadius: 11,
    padding: 12,
    marginTop: 15,
  },
  logged: { backgroundColor: "#e4f8e4" },
  logText: { color: "#fff", fontWeight: "800" },
  loggedText: { color: "#008d00" },
  logPicker: {
    backgroundColor: "#f4faf4",
    borderRadius: 11,
    marginTop: 10,
    padding: 12,
  },
  logPickerLabel: { color: "#555", fontSize: 12, fontWeight: "700" },
  logCategoryList: { flexDirection: "row", gap: 8, marginTop: 9 },
  logCategory: {
    backgroundColor: "#fff",
    borderColor: "#00c100",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
  },
  logCategoryText: { color: "#008d00", fontSize: 12, fontWeight: "800" },
});
