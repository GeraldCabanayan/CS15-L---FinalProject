import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { DailyProgress } from "../components/DailyDiary";
import { AppNav } from "../components/AppNav";
import { errorMessage, useCalTrack } from "../caltrack/store";

export default function Goals() {
  const { goal, updateGoal, isSaving } = useCalTrack();
  const [calories, setCalories] = useState(String(goal.calorieTarget));
  const [protein, setProtein] = useState(String(goal.proteinTarget ?? ""));
  const [carbs, setCarbs] = useState(String(goal.carbsTarget ?? ""));
  const [fat, setFat] = useState(String(goal.fatTarget ?? ""));

  const save = async () => {
    try {
      await updateGoal({ calorieTarget: Number(calories), goal: goal.goal, proteinTarget: protein.trim() ? Number(protein) : null, carbsTarget: carbs.trim() ? Number(carbs) : null, fatTarget: fat.trim() ? Number(fat) : null });
      Alert.alert("Goals saved", "Your daily calorie target has been updated.");
    } catch (error) {
      Alert.alert("Could not save goals", errorMessage(error));
    }
  };
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PERSONAL PLAN</Text>
        <Text style={styles.title}>Your goals</Text>
        <Text style={styles.subtitle}>
          Set a target that fits your current routine.
        </Text>

        <DailyProgress />
        <Text style={styles.label}>Daily calorie target</Text>
        <View style={styles.inputWrap}>
          <TextInput
            value={calories}
            onChangeText={setCalories}
            keyboardType="number-pad"
            style={styles.input}
          />
          <Text style={styles.kcal}>kcal / day</Text>
        </View>

        <Text style={styles.label}>Optional daily macro targets (g)</Text>
        <Text style={styles.subtitle}>Leave blank to track intake without a macro target.</Text>
        {([{ label: 'Protein', value: protein, change: setProtein }, { label: 'Carbs', value: carbs, change: setCarbs }, { label: 'Fat', value: fat, change: setFat }]).map((field) => <View key={field.label}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput accessibilityLabel={field.label + ' target in grams'} style={styles.input} value={field.value} onChangeText={field.change} keyboardType="decimal-pad" />
        </View>)}
        <View style={styles.tip}>
          <Text style={styles.tipTitle}>A balanced approach</Text>
          <Text style={styles.tipCopy}>
            Your calorie target helps CalTrack show how much room you have left
            each day. You can update it whenever your plan changes.
          </Text>
        </View>

        <AnimatedPressable
          style={styles.save}
          disabled={isSaving}
          onPress={save}
        >
          <Text style={styles.saveText}>{isSaving ? "Saving…" : "Save changes"}</Text>
        </AnimatedPressable>
      </ScrollView>
      <AppNav />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fafafa" },
  content: { padding: 22 },
  eyebrow: {
    color: "#00a900",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: { fontSize: 30, fontWeight: "800", marginTop: 5 },
  subtitle: { color: "#777", marginTop: 6 },
  label: { fontWeight: "800", fontSize: 15, marginTop: 28, marginBottom: 10 },

  inputWrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 23, fontWeight: "800", paddingVertical: 16 },
  kcal: { color: "#888" },
  tip: {
    backgroundColor: "#fff3df",
    borderRadius: 16,
    padding: 16,
    marginTop: 28,
  },
  tipTitle: { color: "#b66b00", fontWeight: "800" },
  tipCopy: { color: "#7c633c", lineHeight: 20, marginTop: 5 },
  save: {
    backgroundColor: "#111",
    borderRadius: 13,
    alignItems: "center",
    padding: 15,
    marginTop: 25,
  },
  saveText: { color: "#fff", fontWeight: "800" },
});
