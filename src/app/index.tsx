import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { AppNav } from "../components/AppNav";
import { useCalTrack } from "../features/caltrack/store";
import { perServing, sumNutrition } from "../features/caltrack/types";

export default function Home() {
  const { meals, loggedMeals, goal } = useCalTrack();
  const logged = meals.filter((meal) => loggedMeals.includes(meal.id));
  const eaten = sumNutrition(logged.map(perServing));
  const progress = Math.min(eaten.calories / goal.calorieTarget, 1);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>GOOD MORNING</Text>
            <Text style={styles.title}>Nigga-Chan</Text>
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
              {Math.max(goal.calorieTarget - eaten.calories, 0).toFixed(0)} kcal
              remaining
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

        {logged.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>＋</Text>
            <Text style={styles.emptyTitle}>Nothing logged yet</Text>
            <Text style={styles.emptyCopy}>
              Add a saved recipe to start tracking your day.
            </Text>
            <Link href="/recipes" style={styles.button}>
              Browse recipes
            </Link>
          </View>
        ) : (
          logged.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <Text style={styles.mealEmoji}>🥗</Text>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>{meal.name}</Text>
                <Text style={styles.mealMeta}>
                  {Math.round(perServing(meal).calories)} kcal ·{" "}
                  {meal.ingredients.length} ingredients
                </Text>
              </View>
              <Text style={styles.check}>✓</Text>
            </View>
          ))
        )}

        
      </ScrollView>
      <AppNav />
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
  screen: { flex: 1, backgroundColor: "#fafafa" },
  content: { padding: 22, paddingBottom: 30 },
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
  avatarText: { color: "#008900", fontWeight: "800" },
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
  heroUnit: { color: "#a9a9a9", fontSize: 14, fontWeight: "500" },
  heroHint: { color: "#ffb23d", marginTop: 8, fontSize: 12 },
  ring: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 7,
    borderColor: "#00c100",
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  sectionTitle: {
    color: "#171717",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 26,
    marginBottom: 13,
  },
  macroRow: { flexDirection: "row", gap: 8 },
  macro: { backgroundColor: "#fff", borderRadius: 16, padding: 14, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 9 },
  macroLabel: { color: "#777", fontSize: 12 },
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
  link: { color: "#00a900", fontWeight: "700" },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
  },
  emptyIcon: { color: "#00c100", fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 5 },
  emptyCopy: { color: "#777", textAlign: "center", marginTop: 5 },
  button: {
    backgroundColor: "#00c100",
    color: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    fontWeight: "800",
    marginTop: 15,
  },
  mealCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 14,
    marginBottom: 9,
  },
  mealEmoji: { fontSize: 27, marginRight: 12 },
  mealInfo: { flex: 1 },
  mealName: { fontWeight: "800", fontSize: 15 },
  mealMeta: { color: "#777", marginTop: 4, fontSize: 12 },
  check: { color: "#00c100", fontSize: 22, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10 },
  action: { backgroundColor: "#fff", borderRadius: 16, padding: 15, flex: 1 },
  actionIcon: { color: "#00a900", fontSize: 21 },
  actionText: { color: "#333", fontWeight: "700", marginTop: 8 },
});
