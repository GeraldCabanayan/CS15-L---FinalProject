import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppNav } from "../../components/AppNav";
import { useCalTrack } from "../../caltrack/store";
import { totalCalories } from "../../caltrack/types";

// Recipe Details: ingredients, calories per ingredient, and the total.
export default function RecipeDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, deleteRecipe } = useCalTrack();
  const recipe = recipes.find((item) => item.id === id);

  if (!recipe) {
    return (
      <View style={styles.screen}>
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Recipe not found</Text>
          <Pressable onPress={() => router.replace("/recipes")}>
            <Text style={styles.back}>‹ Back to recipes</Text>
          </Pressable>
        </View>
        <AppNav />
      </View>
    );
  }

  const total = totalCalories(recipe);

  const confirmDelete = () =>
    Alert.alert("Delete recipe", `Delete "${recipe.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRecipe(recipe.id);
            router.replace("/recipes");
          } catch (e) {
            console.error("Delete failed:", e);
            Alert.alert("Could not delete", "Please try again.");
          }
        },
      },
    ]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>{recipe.name}</Text>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL CALORIES</Text>
          <Text style={styles.totalValue}>
            {Math.round(total)} <Text style={styles.totalUnit}>kcal</Text>
          </Text>
        </View>

        <Text style={styles.section}>Calorie breakdown</Text>
        {recipe.ingredients.map((item) => {
          const share = total > 0 ? (item.calories / total) * 100 : 0;
          return (
            <View key={item.id} style={styles.ingredient}>
              <View style={styles.ingredientRow}>
                <View style={styles.ingredientInfo}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  {!!item.amount && <Text style={styles.ingredientAmount}>{item.amount}</Text>}
                </View>
                <Text style={styles.ingredientCal}>{Math.round(item.calories)} kcal</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[styles.fill, { width: `${Math.round(share)}%` as `${number}%` }]}
                />
              </View>
            </View>
          );
        })}

        <View style={styles.actions}>
          <Pressable
            style={styles.editButton}
            onPress={() => router.push({ pathname: "/create", params: { id: recipe.id } })}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={confirmDelete}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        </View>
      </ScrollView>
      <AppNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  content: { padding: 22, paddingTop: 60, paddingBottom: 30 },
  back: { color: "#00a900", fontWeight: "800", fontSize: 16, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: "800", color: "#111" },
  totalCard: { backgroundColor: "#111", borderRadius: 18, padding: 20, marginTop: 18 },
  totalLabel: { color: "#aaa", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  totalValue: { color: "#fff", fontSize: 38, fontWeight: "800", marginTop: 6 },
  totalUnit: { color: "#7be07b", fontSize: 16, fontWeight: "700" },
  section: { fontSize: 19, fontWeight: "800", marginTop: 28, marginBottom: 6 },
  ingredient: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginTop: 8 },
  ingredientRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ingredientInfo: { flex: 1, marginRight: 12 },
  ingredientName: { fontSize: 15, fontWeight: "800", color: "#111" },
  ingredientAmount: { color: "#888", fontSize: 12, marginTop: 2 },
  ingredientCal: { color: "#008d00", fontWeight: "800" },
  track: { height: 6, backgroundColor: "#eef7ee", borderRadius: 3, marginTop: 10, overflow: "hidden" },
  fill: { height: 6, backgroundColor: "#00c100", borderRadius: 3 },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  editButton: {
    flex: 1, borderWidth: 1, borderColor: "#00c100", borderRadius: 13, alignItems: "center", padding: 15,
  },
  editText: { color: "#008d00", fontWeight: "800", fontSize: 15 },
  deleteButton: {
    flex: 1, borderWidth: 1, borderColor: "#d64545", borderRadius: 13, alignItems: "center", padding: 15,
  },
  deleteText: { color: "#d64545", fontWeight: "800", fontSize: 15 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  missingTitle: { fontSize: 18, fontWeight: "800" },
});
