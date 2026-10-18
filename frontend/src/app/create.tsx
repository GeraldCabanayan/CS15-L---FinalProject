
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { ingredientMatches, nameMatches } from "../caltrack/suggestions";
import { AppNav } from "../components/AppNav";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { errorMessage, useCalTrack } from "../caltrack/store";
import { emptyNutrition, categoryLabel, mealCategories, sumNutrition, type Ingredient, type Meal, type MealCategory } from "../caltrack/types";




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
  addMeal: (meal: Meal, scheduledDate?: string) => Promise<void>;
  updateMeal: (meal: Meal) => Promise<void>;
  isSaving: boolean;
}) {
  const { meals, date } = useCalTrack();
  const [activeIngredient, setActiveIngredient] = useState<string | null>(null);
  const [nutritionDrafts, setNutritionDrafts] = useState<Record<string, string>>({});
  const [name, setName] = useState(existing?.name ?? "");
  const [showRecipeSuggestions, setShowRecipeSuggestions] = useState(!existing?.name);
  const [recipeQuery, setRecipeQuery] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(existing?.id ?? null);
  const [category, setCategory] = useState<MealCategory>(existing?.category ?? 'uncategorized');
  const [instructions, setInstructions] = useState(existing?.instructions ?? "");
  const [servings, setServings] = useState(String(existing?.servings ?? 1));
  const [nutritionComplete, setNutritionComplete] = useState(existing?.nutritionComplete !== false);
  
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => existing?.ingredients.map(item => ({ ...item })) ?? [blank()]);
  const [saving, setSaving] = useState(false);
  const total = useMemo(() => sumNutrition(ingredients), [ingredients]);
  const recipeOptions = useMemo(() => recipeQuery.trim()
    ? nameMatches(meals, recipeQuery)
    : [...meals].sort((a, b) => a.name.localeCompare(b.name)), [meals, recipeQuery]);

  const selectRecipe = (recipe: Meal) => {
    // Copy editable values only. Saving keeps the current destination's identity;
    // Create makes a new recipe and never modifies the selected source recipe.
    setName(recipe.name);
    setSelectedRecipeId(recipe.id);
    setRecipeQuery('');
    setServings(String(recipe.servings));
    setCategory(recipe.category ?? 'uncategorized');
    setInstructions(recipe.instructions ?? '');
    setIngredients(recipe.ingredients.map(item => ({ ...item })));
    setNutritionComplete(recipe.nutritionComplete !== false);
    setNutritionDrafts({});
    setActiveIngredient(null);
    setShowRecipeSuggestions(false);
  };

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
      const meal: Meal = {
        id: existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        servings: Number(servings),
        category,
        ...(nutritionComplete ? {} : { nutritionComplete: false }),
        ingredients,
        instructions: instructions.trim(),
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      if (editing) await updateMeal(meal);
      else await addMeal(meal, date);
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
        <AnimatedPressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </AnimatedPressable>

        <Text style={styles.title}>{editing ? "Edit a meal" : "Create a meal"}</Text>
        <Text style={styles.subtitle}>
          Build a recipe and know exactly what is on your plate.
        </Text>
        {!nutritionComplete && <View style={{ marginTop: 16, gap: 8 }}>
          <Text>Some nutrition came from older CalTrack records. Calories are preserved; other nutrients were not stored. Enter the missing values and confirm the recipe's serving yield.</Text>
          <AnimatedPressable accessibilityRole="checkbox" accessibilityState={{ checked: nutritionComplete }}
            style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => setNutritionComplete(!nutritionComplete)}>
            <Text style={styles.addText}>{nutritionComplete ? '[x]' : '[ ]'} I have entered the missing nutritional values</Text>
          </AnimatedPressable>
        </View>}

        <Text style={styles.label}>Meal name</Text>
        <View style={[styles.recipeSelect, showRecipeSuggestions && styles.recipeSelectOpen]}>
        <View style={[styles.recipeSelectField, showRecipeSuggestions && styles.recipeSelectFieldOpen]}>
        <TextInput
          accessibilityLabel="Meal name"
          placeholder="e.g. Sunday pasta"
          placeholderTextColor="rgba(2, 2, 2, 0.5)"
          value={name ?? ""}
          onFocus={() => { setShowRecipeSuggestions(true); setActiveIngredient(null); }}
          onChangeText={(value) => {
            setName(value);
            setRecipeQuery(value);
            setSelectedRecipeId(null);
            setShowRecipeSuggestions(true);
          }}
          onKeyPress={(event) => { if (event.nativeEvent.key === 'Escape') setShowRecipeSuggestions(false); }}
          accessibilityState={{ expanded: showRecipeSuggestions }}
          aria-expanded={showRecipeSuggestions}
          autoComplete="off"
          autoCorrect={false}
          spellCheck={false}
          style={styles.recipeSelectInput}
        />
        <AnimatedPressable accessibilityRole="button"
          accessibilityLabel={showRecipeSuggestions ? 'Hide recipe suggestions' : 'Show recipe suggestions'}
          accessibilityState={{ expanded: showRecipeSuggestions }}
          aria-expanded={showRecipeSuggestions}
          pressedScale={1}
          style={styles.suggestionToggle} onPress={() => {
            setRecipeQuery('');
            setShowRecipeSuggestions(!showRecipeSuggestions);
          }}>
          <Text style={styles.selectChevron}>{showRecipeSuggestions ? '▴' : '▾'}</Text>
        </AnimatedPressable>
        </View>
        {showRecipeSuggestions && <View style={styles.suggestions}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.suggestionList}>
            <AnimatedPressable accessibilityRole="button" accessibilityLabel="Keep entering a custom meal"
              pressedScale={1} style={[styles.suggestionOption, !selectedRecipeId && styles.suggestionSelected]}
              onPress={() => setShowRecipeSuggestions(false)}>
              <Text style={styles.selectionCheck}>{!selectedRecipeId ? '✓' : ''}</Text>
              <Text style={[styles.suggestionText, !selectedRecipeId && styles.suggestionSelectedText]}>Select a recipe</Text>
            </AnimatedPressable>
            {!recipeOptions.length && <Text style={styles.suggestionHint}>
              {meals.length ? 'No matching recipes. Keep typing to create your own meal.' : 'No saved recipes yet. Enter your meal details below.'}
            </Text>}
            {recipeOptions.map(recipe => <AnimatedPressable key={recipe.id}
              accessibilityRole="button" accessibilityLabel={`Use recipe ${recipe.name}`}
              accessibilityState={{ selected: selectedRecipeId === recipe.id }}
              aria-pressed={selectedRecipeId === recipe.id}
              pressedScale={1}
              style={[styles.suggestionOption, selectedRecipeId === recipe.id && styles.suggestionSelected]}
              onPress={() => selectRecipe(recipe)}>
              <Text style={styles.selectionCheck}>{selectedRecipeId === recipe.id ? '✓' : ''}</Text>
              <Text style={[styles.suggestionText, selectedRecipeId === recipe.id && styles.suggestionSelectedText]}>{recipe.name}</Text>
            </AnimatedPressable>)}
          </ScrollView>
        </View>}
        </View>

        <Text style={styles.label}>Servings</Text>
        <TextInput
          placeholder="1"
          placeholderTextColor="rgba(2, 2, 2, 0.5)"
          value={servings}
          onFocus={() => setShowRecipeSuggestions(false)}
          onChangeText={setServings}
          keyboardType="number-pad"
          style={styles.input}
        />

        <Text style={styles.label}>Meal category</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Meal category" style={styles.categoryList}>
          {mealCategories.map(value => <AnimatedPressable key={value} accessibilityRole="radio"
            accessibilityLabel={`Meal category ${value}`} accessibilityState={{ checked: category === value }}
            aria-checked={category === value}
            style={[styles.category, category === value && styles.categorySelected]}
            onPress={() => { setCategory(value); setShowRecipeSuggestions(false); }}>
            <Text style={[styles.categoryText, category === value && styles.categoryTextSelected]}>{categoryLabel(value)}</Text>
          </AnimatedPressable>)}
        </View>

      

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
                onFocus={() => { setActiveIngredient(item.id); setShowRecipeSuggestions(false); }}
                onChangeText={(value) => { setActiveIngredient(item.id); update(item.id, "name", value); }}
                style={styles.nameInput}
              />
              <TextInput
                placeholder="Amount"
                value={item.amount}
                onFocus={() => { setActiveIngredient(null); setShowRecipeSuggestions(false); }}
                onChangeText={(value) => update(item.id, "amount", value)}
                style={styles.amountInput}
              />
            </View>

            {activeIngredient === item.id && item.name.trim().length > 0 && <View>
              <Text style={styles.fieldLabel}>Saved ingredients: nutrition is for the displayed amount</Text>
              {ingredientMatches(meals, item.name).length === 0 && <Text>No saved match. Enter this ingredient manually.</Text>}
              {ingredientMatches(meals, item.name).map((match, matchIndex) => <AnimatedPressable key={matchIndex}
                style={{ minHeight: 44, paddingVertical: 10 }} onPress={() => {
                  if (meals.some((meal) => meal.nutritionComplete === false && meal.ingredients.includes(match))) setNutritionComplete(false);
                  setIngredients((items) => items.map((current) => current.id === item.id ? { ...match, id: current.id } : current));
                  setNutritionDrafts((drafts) => Object.fromEntries(Object.entries(drafts).filter(([key]) => !key.startsWith(`${item.id}:`))));
                  setActiveIngredient(null);
                }}>
                <Text style={styles.addText}>{match.name} · {match.amount || 'amount unspecified'} · {match.calories} kcal</Text>
              </AnimatedPressable>)}
            </View>}
            {ingredients.length > 1 && (
              <AnimatedPressable onPress={() => setIngredients((items) => items.filter((ingredient) => ingredient.id !== item.id))}>
                <Text style={styles.addText}>Remove ingredient</Text>
              </AnimatedPressable>
            )}

            <View style={styles.nutritionGrid}>
              {fields.map(([key, label]) => (
                <View style={styles.field} key={key}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    value={nutritionDrafts[`${item.id}:${key}`] ?? String(item[key])}
                    onFocus={() => { setActiveIngredient(null); setShowRecipeSuggestions(false); }}
                    onChangeText={(value) => update(item.id, key, value)}
                    keyboardType="decimal-pad"
                    style={styles.smallInput}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        <AnimatedPressable
          style={styles.add}
          onPress={() => setIngredients((items) => [...items, blank()])}
        >
          <Text style={styles.addText}>＋ Add ingredient</Text>
        </AnimatedPressable>

        <Text style={styles.label}>Instructions</Text>
        <TextInput
          accessibilityLabel="Recipe instructions"
          placeholder="Describe how to prepare this recipe, one step per line"
          placeholderTextColor="rgba(2, 2, 2, 0.5)"
          value={instructions}
          onFocus={() => { setActiveIngredient(null); setShowRecipeSuggestions(false); }}
          onChangeText={setInstructions}
          multiline
          textAlignVertical="top"
          style={[styles.input, { minHeight: 140 }]}
        />

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

        <AnimatedPressable style={styles.save} disabled={saving || isSaving} onPress={save}>
          <Text style={styles.saveText}>{saving ? "Saving…" : "Save recipe"}</Text>
        </AnimatedPressable>
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
  recipeSelect: { position: 'relative', zIndex: 1 },
  recipeSelectOpen: { zIndex: 20 },
  recipeSelectField: { flexDirection: 'row', alignItems: 'center', minHeight: 50, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, overflow: 'hidden' },
  recipeSelectFieldOpen: { borderColor: '#00a900', boxShadow: '0 0 0 3px rgba(0, 169, 0, 0.10)' },
  recipeSelectInput: { flex: 1, minWidth: 0, padding: 14, fontSize: 16, color: '#171717', backgroundColor: '#fff' },
  suggestionToggle: { width: 46, alignSelf: 'stretch', minHeight: 48, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#eee' },
  selectChevron: { color: '#008d00', fontSize: 18 },
  suggestions: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, borderWidth: 1, borderColor: '#d4e8d4', borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)', elevation: 6 },
  suggestionHint: { color: '#666', padding: 12, lineHeight: 20 },
  suggestionList: { maxHeight: 264, paddingVertical: 4 },
  suggestionOption: { minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestionText: { flex: 1, color: '#333', fontSize: 15, lineHeight: 22 },
  suggestionSelected: { backgroundColor: '#dff6df' },
  suggestionSelectedText: { color: '#007d00', fontWeight: '700' },
  selectionCheck: { width: 18, color: '#007d00', fontWeight: '800', fontSize: 16 },
  categoryList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  category: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#fff",
  },


  categorySelected: {
      backgroundColor: "#dff6df",
      borderColor: "#00c100"
     }, 


  categoryText: { 
     color: "#666",
     fontWeight: "700",
     fontSize: 12 },
     
  categoryTextSelected: { 
    color: "#008d00"
   },


  sectionLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 14,
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
