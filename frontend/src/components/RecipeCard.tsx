import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { totalCalories, type Recipe } from "../caltrack/types";

// One recipe row: name, ingredient count, and total calories. Opens Recipe Details.
export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const count = recipe.ingredients.length;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: "/recipe/[id]", params: { id: recipe.id } })}
    >
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{recipe.name}</Text>
        <Text style={styles.meta}>{count === 1 ? "1 ingredient" : `${count} ingredients`}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeValue}>{Math.round(totalCalories(recipe))}</Text>
        <Text style={styles.badgeUnit}>kcal</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 16,
    marginBottom: 10,
  },
  info: { flex: 1, marginRight: 12 },
  title: { fontSize: 17, fontWeight: "800", color: "#111" },
  meta: { color: "#888", fontSize: 12, marginTop: 4 },
  badge: {
    backgroundColor: "#dff6df",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    minWidth: 68,
  },
  badgeValue: { color: "#008d00", fontSize: 18, fontWeight: "800" },
  badgeUnit: { color: "#008d00", fontSize: 10, fontWeight: "700" },
});
