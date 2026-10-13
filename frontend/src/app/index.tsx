import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppNav } from "../components/AppNav";
import { RecipeCard } from "../components/RecipeCard";
import { useCalTrack } from "../caltrack/store";
import { totalCalories } from "../caltrack/types";

// Home / Dashboard: a quick summary of the saved recipes and the latest few.
export default function Home() {
  const { recipes, loading, error, refresh } = useCalTrack();

  const ingredientCount = recipes.reduce((sum, recipe) => sum + recipe.ingredients.length, 0);
  const ranked = [...recipes].sort((a, b) => totalCalories(b) - totalCalories(a));
  const highest = ranked[0];
  const lowest = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const recent = recipes.slice(0, 3); // recipes are already newest-first

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>CALTRACK</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Know how many calories are in what you cook.</Text>

        {loading && <ActivityIndicator color="#00c100" style={{ marginTop: 24 }} />}

        {error && (
          <Pressable style={styles.errorBox} onPress={refresh}>
            <Text style={styles.errorText}>{error} Tap to retry.</Text>
          </Pressable>
        )}

        {!loading && !error && recipes.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🥗</Text>
            <Text style={styles.emptyTitle}>No recipes yet</Text>
            <Text style={styles.emptyCopy}>
              Add your first recipe and its ingredient calories to get started.
            </Text>
            <Pressable style={styles.addButton} onPress={() => router.push("/create")}>
              <Text style={styles.addText}>＋ Add recipe</Text>
            </Pressable>
          </View>
        )}

        {recipes.length > 0 && (
          <>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{recipes.length}</Text>
                <Text style={styles.statLabel}>Recipes saved</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{ingredientCount}</Text>
                <Text style={styles.statLabel}>Ingredients</Text>
              </View>
            </View>

            {highest && (
              <View style={styles.highlight}>
                <Text style={styles.highlightLabel}>HIGHEST CALORIES</Text>
                <Text style={styles.highlightName} numberOfLines={1}>{highest.name}</Text>
                <Text style={styles.highlightValue}>{Math.round(totalCalories(highest))} kcal</Text>
              </View>
            )}
            {lowest && (
              <View style={[styles.highlight, styles.highlightLight]}>
                <Text style={[styles.highlightLabel, styles.darkText]}>LOWEST CALORIES</Text>
                <Text style={[styles.highlightName, styles.darkText]} numberOfLines={1}>{lowest.name}</Text>
                <Text style={[styles.highlightValue, styles.greenText]}>
                  {Math.round(totalCalories(lowest))} kcal
                </Text>
              </View>
            )}

            <View style={styles.sectionLine}>
              <Text style={styles.sectionTitle}>Recent recipes</Text>
              <Pressable onPress={() => router.replace("/recipes")}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            {recent.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </>
        )}
      </ScrollView>
      <AppNav />
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
    paddingTop: 60,
    paddingBottom: 24,
  },
  eyebrow: {
    color: "#00a900",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111",
    marginTop: 4,
  },
  subtitle: {
    color: "#777",
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: "#fdecec",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    color: "#b3261e",
    fontSize: 12,
  },
  stats: {
    flexDirection: "row",
    gap: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#008d00",
  },
  statLabel: {
    color: "#777",
    fontSize: 12,
    marginTop: 2,
  },
  highlight: {
    backgroundColor: "#111",
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
  },
  highlightLight: {
    backgroundColor: "#dff6df",
  },
  highlightLabel: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  highlightName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  highlightValue: {
    color: "#7be07b",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  darkText: {
    color: "#1c3a1c",
  },
  greenText: {
    color: "#008d00",
  },
  sectionLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
  },
  seeAll: {
    color: "#00a900",
    fontWeight: "800",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 46,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  emptyCopy: {
    color: "#888",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  addButton: {
    backgroundColor: "#00c100",
    borderRadius: 13,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 20,
  },
  addText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});