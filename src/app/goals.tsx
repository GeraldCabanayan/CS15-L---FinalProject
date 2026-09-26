import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppNav } from "../components/AppNav";
import { useCalTrack } from "../features/caltrack/store";

export default function Goals() {
  const { goal, updateGoal } = useCalTrack();
  const [calories, setCalories] = useState(String(goal.calorieTarget));
  const [selected, setSelected] = useState(goal.goal);
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>PERSONAL PLAN</Text>
        <Text style={styles.title}>Your goals</Text>
        <Text style={styles.subtitle}>
          Set a target that fits your current routine.
        </Text>

        <Text style={styles.label}>What are you working toward?</Text>
        <View style={styles.options}>
          {(["lose", "maintain", "gain"] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setSelected(item)}
              style={[styles.option, selected === item && styles.selected]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected === item && styles.selectedText,
                ]}
              >
                {item === "lose"
                  ? "Lose weight"
                  : item === "gain"
                    ? "Gain weight"
                    : "Maintain"}
              </Text>
            </Pressable>
          ))}
        </View>

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

        <View style={styles.tip}>
          <Text style={styles.tipTitle}>A balanced approach</Text>
          <Text style={styles.tipCopy}>
            Your calorie target helps CalTrack show how much room you have left
            each day. You can update it whenever your plan changes.
          </Text>
        </View>

        <Pressable
          style={styles.save}
          onPress={() =>
            updateGoal({
              calorieTarget: Math.max(Number(calories) || 0, 1),
              goal: selected,
            })
          }
        >
          <Text style={styles.saveText}>Save changes</Text>
        </Pressable>
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
  options: { flexDirection: "row", gap: 8 },
  option: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 13,
    flex: 1,
    alignItems: "center",
  },
  selected: { backgroundColor: "#00c100" },
  optionText: { fontSize: 12, fontWeight: "700", color: "#555" },
  selectedText: { color: "#fff" },
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
