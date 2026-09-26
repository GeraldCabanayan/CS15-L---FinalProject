import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCalTrack } from "../features/caltrack/store";
import {
  emptyNutrition,
  sumNutrition,
  type Ingredient,
} from "../features/caltrack/types";

const blank = (): Ingredient => ({
  id: `${Date.now()}-${Math.random()}`,
  name: "",
  amount: "",
  ...emptyNutrition,
});

const fields: [keyof Ingredient, string][] = [
  ["calories", "Calories"],
  ["protein", "Protein (g)"],
  ["carbs", "Carbs (g)"],
  ["fat", "Fat (g)"],
  ["fiber", "Fiber (g)"],
  ["sugar", "Sugar (g)"],
  ["sodium", "Sodium (mg)"],
];

export default function CreateMeal() {
  const { addMeal } = useCalTrack();
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredients, setIngredients] = useState<Ingredient[]>([blank()]);
  const total = useMemo(() => sumNutrition(ingredients), [ingredients]);

  const update = (id: string, key: keyof Ingredient, value: string) => {
    setIngredients((items) =>
      items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          [key]:
            key === "name" || key === "amount" ? value : Number(value) || 0,
        };
      }),
    );
  };

  const save = () => {
    if (!name.trim() || ingredients.some((item) => !item.name.trim())) {
      Alert.alert(
        "Almost there",
        "Add a meal name and a name for every ingredient.",
      );
      return;
    }

    addMeal({
      id: `${Date.now()}`,
      name: name.trim(),
      servings: Math.max(Number(servings) || 1, 1),
      ingredients,
      createdAt: new Date().toISOString(),
    });
    router.replace("/recipes");
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>Create a meal</Text>
        <Text style={styles.subtitle}>
          Build a recipe and know exactly what is on your plate.
        </Text>

        <Text style={styles.label}>Meal name</Text>
        <TextInput
          placeholder="e.g. Sunday pasta"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <Text style={styles.label}>Servings</Text>
        <TextInput
          placeholder="1"
          value={servings}
          onChangeText={setServings}
          keyboardType="number-pad"
          style={styles.input}
        />

        <View style={styles.sectionLine}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <Text style={styles.total}>{Math.round(total.calories)} kcal total</Text>
        </View>

        {ingredients.map((item, index) => (
          <View style={styles.ingredient} key={item.id}>
            <View style={styles.ingredientHead}>
              <Text style={styles.ingredientNumber}>{index + 1}</Text>
              <TextInput
                placeholder="Ingredient name"
                value={item.name}
                onChangeText={(value) => update(item.id, "name", value)}
                style={styles.nameInput}
              />
              <TextInput
                placeholder="Amount"
                value={item.amount}
                onChangeText={(value) => update(item.id, "amount", value)}
                style={styles.amountInput}
              />
            </View>

            <View style={styles.nutritionGrid}>
              {fields.map(([key, label]) => (
                <View style={styles.field} key={key}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    value={String(item[key])}
                    onChangeText={(value) => update(item.id, key, value)}
                    keyboardType="decimal-pad"
                    style={styles.smallInput}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <Pressable
          style={styles.add}
          onPress={() => setIngredients((items) => [...items, blank()])}
        >
          <Text style={styles.addText}>＋ Add ingredient</Text>
        </Pressable>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Meal total</Text>
          <View style={styles.summaryRow}>
            {(
              [
                ["calories", "kcal"],
                ["protein", "g protein"],
                ["carbs", "g carbs"],
                ["fat", "g fat"],
              ] as const
            ).map(([key, unit]) => (
              <View key={key}>
                <Text style={styles.summaryValue}>{Math.round(total[key])}</Text>
                <Text style={styles.summaryLabel}>{unit}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.save} onPress={save}>
          <Text style={styles.saveText}>Save recipe</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  content: { padding: 22, paddingBottom: 40 },
  back: {
    color: "#00a900",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 18,
  },
  title: { fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#777", marginTop: 6, lineHeight: 20 },
  label: { fontWeight: "800", marginTop: 22, marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  sectionLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 19, fontWeight: "800" },
  total: { color: "#00a900", fontWeight: "800" },
  ingredient: {
    backgroundColor: "#fff",
    borderRadius: 17,
    padding: 13,
    marginTop: 10,
  },
  ingredientHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  ingredientNumber: {
    backgroundColor: "#dff6df",
    color: "#008d00",
    borderRadius: 14,
    overflow: "hidden",
    padding: 7,
    fontWeight: "800",
  },
  nameInput: { flex: 1, fontWeight: "700", padding: 6 },
  amountInput: { width: 70, color: "#777", padding: 6, textAlign: "right" },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  field: { width: "23%" },
  fieldLabel: { color: "#888", fontSize: 9, marginBottom: 3 },
  smallInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 7,
    padding: 7,
    fontSize: 12,
  },
  add: {
    borderWidth: 1,
    borderColor: "#00c100",
    borderRadius: 12,
    alignItems: "center",
    padding: 13,
    marginTop: 13,
  },
  addText: { color: "#00a900", fontWeight: "800" },
  summary: {
    backgroundColor: "#111",
    borderRadius: 17,
    padding: 17,
    marginTop: 20,
  },
  summaryTitle: { color: "#fff", fontWeight: "800", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryValue: { color: "#fff", fontSize: 20, fontWeight: "800" },
  summaryLabel: { color: "#aaa", fontSize: 10, marginTop: 3 },
  save: {
    backgroundColor: "#00c100",
    borderRadius: 13,
    alignItems: "center",
    padding: 16,
    marginTop: 18,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
