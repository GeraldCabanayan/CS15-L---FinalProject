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
