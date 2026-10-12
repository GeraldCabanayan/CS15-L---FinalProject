import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppNav } from "../components/AppNav";
import { RecipeCard } from "../components/RecipeCard";
import { useCalTrack } from "../caltrack/store";

// Recipes: the full list of saved recipes. Saving a recipe lands here.
export default function Recipes() {
  const { recipes, loading, error, refresh } = useCalTrack();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Recipes</Text>
        <Text style={styles.subtitle}>
          {recipes.length === 1 ? "1 recipe saved" : `${recipes.length} recipes saved`}
        </Text>

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
              Tap “Add recipe” to enter your first recipe and its calories.
            </Text>
          </View>
        )}

        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.addButton} onPress={() => router.push("/create")}>
          <Text style={styles.addText}>＋ Add recipe</Text>
        </Pressable>
      </View>
      <AppNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  content: { padding: 22, paddingTop: 60, paddingBottom: 20 },
  title: { fontSize: 32, fontWeight: "800", color: "#111" },
  subtitle: { color: "#777", marginTop: 4, marginBottom: 18 },
  footer: { paddingHorizontal: 22, paddingVertical: 12 },
  addButton: { backgroundColor: "#00c100", borderRadius: 13, alignItems: "center", padding: 16 },
  addText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  errorBox: { backgroundColor: "#fdecec", borderRadius: 12, padding: 12, marginTop: 8 },
  errorText: { color: "#b3261e", fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 56 },
  emptyEmoji: { fontSize: 46 },
  emptyTitle: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  emptyCopy: { color: "#888", marginTop: 6, textAlign: "center", paddingHorizontal: 24 },
});
