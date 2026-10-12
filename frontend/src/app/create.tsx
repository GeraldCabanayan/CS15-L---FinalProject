import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppNav } from "../components/AppNav";
import { useCalTrack } from "../caltrack/store";
import type { Recipe } from "../caltrack/types";

// The form keeps calories as text while typing, and converts to a number on save.
type FormIngredient = { id: string; name: string; amount: string; calories: string };

const blank = (): FormIngredient => ({
  id: `${Date.now()}-${Math.random()}`,
  name: "",
  amount: "",
  calories: "",
});

const toNumber = (value: string) => Number(value.replace(",", ".").trim());

// /create          -> add a new recipe
// /create?id=<id>  -> edit an existing recipe (same form, pre-filled)
export default function CreateRecipeScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  // key resets the form when switching between "create" and "edit"
  return <RecipeForm key={id ?? "new"} id={id} />;
}

function RecipeForm({ id }: { id?: string }) {
  const { recipes, addRecipe, updateRecipe } = useCalTrack();
  const editing = id ? recipes.find((recipe) => recipe.id === id) : undefined;

  const [name, setName] = useState(editing?.name ?? "");
  const [ingredients, setIngredients] = useState<FormIngredient[]>(
    editing
      ? editing.ingredients.map((item) => ({
          id: item.id,
          name: item.name,
          amount: item.amount,
          calories: String(item.calories),
        }))
      : [blank()],
  );
  const [saving, setSaving] = useState(false);

  // Live total shown while the user types.
  const total = useMemo(
    () => ingredients.reduce((sum, item) => sum + (toNumber(item.calories) || 0), 0),
    [ingredients],
  );

  const change = (itemId: string, key: keyof FormIngredient, value: string) =>
    setIngredients((items) =>
      items.map((item) => (item.id === itemId ? { ...item, [key]: value } : item)),
    );

  const removeIngredient = (itemId: string) =>
    setIngredients((items) =>
      items.length > 1 ? items.filter((item) => item.id !== itemId) : items,
    );

  const save = async () => {
    if (!name.trim()) {
      Alert.alert("Almost there", "Give your recipe a name.");
      return;
    }
    if (ingredients.some((item) => !item.name.trim())) {
      Alert.alert("Almost there", "Every ingredient needs a name.");
      return;
    }
    if (ingredients.some((item) => !Number.isFinite(toNumber(item.calories)) || toNumber(item.calories) < 0 || item.calories.trim() === "")) {
      Alert.alert("Check the calories", "Enter a calorie number (0 or more) for every ingredient.");
      return;
    }

    const recipe: Recipe = {
      id: editing?.id ?? `${Date.now()}`,
      name: name.trim(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      ingredients: ingredients.map((item) => ({
        id: item.id,
        name: item.name.trim(),
        amount: item.amount.trim(),
        calories: toNumber(item.calories),
      })),
    };

    setSaving(true);
    try {
      if (editing) {
        await updateRecipe(recipe);
        router.back(); // back to Recipe Details, which shows the updated data
      } else {
        await addRecipe(recipe);
        router.replace("/recipes"); // show the saved recipe in the Recipes list
      }
    } catch (e) {
      console.error("Save failed:", e);
      Alert.alert("Could not save", "Something went wrong saving this recipe. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {editing && (
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
        )}

        <Text style={styles.title}>{editing ? "Edit recipe" : "Add a recipe"}</Text>
        <Text style={styles.subtitle}>
          Enter each ingredient and its calories. The total is added up for you.
        </Text>

        <Text style={styles.label}>Recipe name</Text>
        <TextInput
          placeholder="e.g. Chicken salad"
          placeholderTextColor="rgba(2, 2, 2, 0.5)"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <View style={styles.sectionLine}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <Text style={styles.total}>{Math.round(total)} kcal total</Text>
        </View>

        {ingredients.map((item, index) => (
          <View style={styles.ingredient} key={item.id}>
            <View style={styles.ingredientHead}>
              <Text style={styles.ingredientNumber}>{index + 1}</Text>
              <TextInput
                placeholder="Ingredient name"
                placeholderTextColor="rgba(2, 2, 2, 0.4)"
                value={item.name}
                onChangeText={(value) => change(item.id, "name", value)}
                style={styles.nameInput}
              />
              {ingredients.length > 1 && (
                <Pressable onPress={() => removeIngredient(item.id)} hitSlop={8}>
                  <Text style={styles.remove}>✕</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.row}>
              <View style={styles.caloriesField}>
                <Text style={styles.fieldLabel}>Calories (kcal)</Text>
                <TextInput
                  placeholder="0"
                  placeholderTextColor="rgba(2, 2, 2, 0.4)"
                  value={item.calories}
                  onChangeText={(value) => change(item.id, "calories", value)}
                  keyboardType="decimal-pad"
                  style={styles.smallInput}
                />
              </View>
              <View style={styles.amountField}>
                <Text style={styles.fieldLabel}>Quantity (optional)</Text>
                <TextInput
                  placeholder="e.g. 2 cups"
                  placeholderTextColor="rgba(2, 2, 2, 0.4)"
                  value={item.amount}
                  onChangeText={(value) => change(item.id, "amount", value)}
                  style={styles.smallInput}
                />
              </View>
            </View>
          </View>
        ))}

        <Pressable style={styles.add} onPress={() => setIngredients((items) => [...items, blank()])}>
          <Text style={styles.addText}>＋ Add ingredient</Text>
        </Pressable>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>TOTAL CALORIES</Text>
          <Text style={styles.summaryValue}>
            {Math.round(total)} <Text style={styles.summaryUnit}>kcal</Text>
          </Text>
        </View>

        <Pressable style={[styles.save, saving && styles.saving]} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>
            {saving ? "Saving..." : editing ? "Save changes" : "Save recipe"}
          </Text>
        </Pressable>
      </ScrollView>
      <AppNav />
    </View>
  );
}

const styles = StyleSheet.create({

  screen: {
    flex: 1, 
    
    backgroundColor: "#fafafa" 
  },

  content: { 
    padding: 22, 
    paddingTop: 60, 
    paddingBottom: 40 
  },

  back: { 
    color: "#00a900", 
    fontWeight: "800", 
    fontSize: 16, 
    marginBottom: 16
   },

  title: { 
    fontSize: 30, 
    fontWeight: "800", 
    color: "#111" 
  },

  subtitle: { 
    color: "#777",
     marginTop: 6, 
    lineHeight: 20
   },

  label: { 
    fontWeight: "800", 
    marginTop: 22, 
    marginBottom: 8
   },

  input: { 
    backgroundColor: "#fff", 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 16 
  },

  sectionLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 6,
  },

  sectionTitle: { 
    fontSize: 19, 
    fontWeight: "800" 
  },

  total: {
    color: "#00a900", 
    fontWeight: "800" 

  },

  ingredient: { 
    backgroundColor: "#fff", 
    borderRadius: 17, 
    padding: 13, 
    marginTop: 10 
  },

  ingredientHead: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8 
  },

  ingredientNumber: {
    backgroundColor: "#dff6df",
    color: "#008d00",
    borderRadius: 14,
    overflow: "hidden",
    width: 28,
    height: 28,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "800",
  },

  nameInput: { 
    flex: 1, 
    fontWeight: "700", 
    fontSize: 15, 
    padding: 6 
  },

  remove: { 
    color: "#d64545", 
    fontWeight: "800", 
    fontSize: 16, 
    paddingHorizontal: 4 
  },

  row: { 
    flexDirection: "row",
    gap: 10, 
    marginTop: 12 
  },

  caloriesField: {
    flex: 1 
  },

  amountField: { 
    flex: 1.3 
  },

  fieldLabel: { 
    color: "#888", 
    fontSize: 10, 
    marginBottom: 4 
  },

  smallInput: { 
    backgroundColor: "#f5f5f5", 
    borderRadius: 9, 
    padding: 10, 
    fontSize: 14 
  },

  add: {
    borderWidth: 1,
    borderColor: "#00c100",
    borderRadius: 12,
    alignItems: "center",
    padding: 13,
    marginTop: 13,
  },

  addText: { 
    color: "#00a900", 
    fontWeight: "800" 
  },

  summary: { 
    backgroundColor: "#111", 
    borderRadius: 17, 
    padding: 18, 
    marginTop: 20 
  },

  summaryLabel: { 
    color: "#aaa", 
    fontSize: 11, 
    fontWeight: "800", 
    letterSpacing: 1.2 
  },

  summaryValue: { 
    color: "#fff", 
    fontSize: 32, 
    fontWeight: "800", 
    marginTop: 6 
  },

  summaryUnit: { 
    color: "#7be07b", 
    fontSize: 15, 
    fontWeight: "700" 
  },

  save: { 
    backgroundColor: "#00c100", 
    borderRadius: 13, 
    alignItems: "center", 
    padding: 16, 
    marginTop: 18 
  },

  saveText: 
  { color: "#fff", 
    fontWeight: "800", 
    fontSize: 16 
  },

  saving: { 
    opacity: 0.6 
  },
});
