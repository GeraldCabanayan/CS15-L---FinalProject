
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { ingredientMatches } from "../caltrack/suggestions";
import { AppNav } from "../components/AppNav";
import { errorMessage, useCalTrack } from "../caltrack/store";
import { emptyNutrition, sumNutrition, type Ingredient, type Nutrition, type Meal } from "../caltrack/types";




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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addMeal, updateMeal, meals, isSaving } = useCalTrack();
  const existing = meals.find((meal) => meal.id === id);
  // Keying the form by route ID keeps create and edit drafts separate.
  return <MealForm key={id ?? "new"} existing={existing} editing={!!id}
    addMeal={addMeal} updateMeal={updateMeal} isSaving={isSaving} />;
}

function MealForm({ existing, editing, addMeal, updateMeal, isSaving }: {
  existing?: Meal;
  editing: boolean;
  addMeal: (meal: Meal) => Promise<void>;
  updateMeal: (meal: Meal) => Promise<void>;
  isSaving: boolean;
}) {
  const { meals } = useCalTrack();
  const [activeIngredient, setActiveIngredient] = useState<string | null>(null);
  const [nutritionDrafts, setNutritionDrafts] = useState<Record<string, string>>({});
  const [name, setName] = useState(existing?.name ?? "");
  const [servings, setServings] = useState(String(existing?.servings ?? 1));
  const [nutritionComplete, setNutritionComplete] = useState(existing?.nutritionComplete !== false);
  
  const [ingredients, setIngredients] = useState<Ingredient[]>(existing?.ingredients ?? [blank()]);
  const [saving, setSaving] = useState(false);
  const total = useMemo(() => sumNutrition(ingredients), [ingredients]);

  const update = (id: string, key: keyof Ingredient, value: string) => {
    if (key !== 'name' && key !== 'amount') {
      setNutritionDrafts((drafts) => ({ ...drafts, [`${id}:${key}`]: value }));
    }
    setIngredients((items) =>
      items.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          [key]:
            key === "name" || key === "amount" ? value : Number(value),
        };
      }),
    );
  };

  const save = async () => {
    if (saving || isSaving) return;
    if (editing && !existing) {
      Alert.alert("Recipe unavailable", "This recipe no longer exists.");
      return;
    }
    if (!name.trim() || ingredients.some((item) => !item.name.trim())) {
      Alert.alert(
        "Almost there",
        "Add a meal name and a name for every ingredient.",
      );
      return;
    }

    setSaving(true);
    try {
      await (editing ? updateMeal : addMeal)({
        id: existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        servings: Number(servings),
        category: existing?.category,
        ...(nutritionComplete ? {} : { nutritionComplete: false }),
        ingredients,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      router.replace("/recipes");
    } catch (error) {
      Alert.alert("Could not save recipe", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>

        <Text style={styles.title}>{editing ? "Edit a meal" : "Create a meal"}</Text>
        <Text style={styles.subtitle}>
          Build a recipe and know exactly what is on your plate.
        </Text>
        {(existing?.nutritionComplete === false || !nutritionComplete) && <View style={{ marginTop: 16, gap: 8 }}>
          <Text>Some nutrition came from older CalTrack records. Calories are preserved; other nutrients were not stored. Enter the missing values and confirm the recipe's serving yield.</Text>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: nutritionComplete }}
            style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => setNutritionComplete(!nutritionComplete)}>
            <Text style={styles.addText}>{nutritionComplete ? '[x]' : '[ ]'} I have entered the missing nutritional values</Text>
          </Pressable>
        </View>}

        <Text style={styles.label}>Meal name</Text>
        <TextInput
          placeholder="e.g. Sunday pasta"
          placeholderTextColor="rgba(2, 2, 2, 0.5)"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <Text style={styles.label}>Servings</Text>
        <TextInput
          placeholder="1"
          placeholderTextColor="rgba(2, 2, 2, 0.5)"
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
                onFocus={() => setActiveIngredient(item.id)}
                onChangeText={(value) => { setActiveIngredient(item.id); update(item.id, "name", value); }}
                style={styles.nameInput}
              />
              <TextInput
                placeholder="Amount"
                value={item.amount}
                onChangeText={(value) => update(item.id, "amount", value)}
                style={styles.amountInput}
              />
            </View>

            {activeIngredient === item.id && item.name.trim().length > 0 && <View>
              <Text style={styles.fieldLabel}>Saved ingredients: nutrition is for the displayed amount</Text>
              {ingredientMatches(meals, item.name).length === 0 && <Text>No saved match. Enter this ingredient manually.</Text>}
              {ingredientMatches(meals, item.name).map((match, matchIndex) => <Pressable key={matchIndex}
                style={{ minHeight: 44, paddingVertical: 10 }} onPress={() => {
                  if (meals.some((meal) => meal.nutritionComplete === false && meal.ingredients.includes(match))) setNutritionComplete(false);
                  setIngredients((items) => items.map((current) => current.id === item.id ? { ...match, id: current.id } : current));
                  setNutritionDrafts((drafts) => Object.fromEntries(Object.entries(drafts).filter(([key]) => !key.startsWith(`${item.id}:`))));
                  setActiveIngredient(null);
                }}>
                <Text style={styles.addText}>{match.name} · {match.amount || 'amount unspecified'} · {match.calories} kcal</Text>
              </Pressable>)}
            </View>}
            {ingredients.length > 1 && (
              <Pressable onPress={() => setIngredients((items) => items.filter((ingredient) => ingredient.id !== item.id))}>
                <Text style={styles.addText}>Remove ingredient</Text>
              </Pressable>
            )}

            <View style={styles.nutritionGrid}>
              {fields.map(([key, label]) => (
                <View style={styles.field} key={key}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    value={nutritionDrafts[`${item.id}:${key}`] ?? String(item[key])}
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

        <Pressable style={styles.save} disabled={saving || isSaving} onPress={save}>
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save recipe"}</Text>
        </Pressable>
      </ScrollView>
      <AppNav />
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
  categoryList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#fff",
  },
  categorySelected: { backgroundColor: "#dff6df", borderColor: "#00c100" },
  categoryText: { color: "#666", fontWeight: "700", fontSize: 12 },
  categoryTextSelected: { color: "#008d00" },
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
  field: { width: "46%" },
  fieldLabel: { color: "#666", fontSize: 12, marginBottom: 3 },
  smallInput: {
    minHeight: 44,
    backgroundColor: "#f5f5f5",
    borderRadius: 7,
    padding: 7,
    fontSize: 14,
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
