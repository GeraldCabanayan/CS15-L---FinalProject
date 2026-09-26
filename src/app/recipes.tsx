import { Link } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppNav } from "../components/AppNav";
import { useCalTrack } from "../features/caltrack/store";
import { perServing } from "../features/caltrack/types";

export default function Recipes() {
  const { meals, logMeal, loggedMeals } = useCalTrack();

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

        {meals.map((meal) => {
          const nutrition = perServing(meal);
          const logged = loggedMeals.includes(meal.id);

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

              <Pressable
                style={[styles.log, logged && styles.logged]}
                onPress={() => logMeal(meal.id)}
              >
                <Text style={[styles.logText, logged && styles.loggedText]}>
                  {logged ? "Logged today ✓" : "Add to today"}
                </Text>
              </Pressable>
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
});
