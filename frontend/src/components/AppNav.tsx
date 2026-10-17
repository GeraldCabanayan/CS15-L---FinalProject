import { router, usePathname } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";

const tabs = [
  { label: "Home", icon: "⌂", path: "/" },
  { label: "Recipes", icon: "▣", path: "/recipes" },
  { label: "Create", icon: "+", path: "/create" },
  { label: "Calendar", icon: "\u25a6", path: "/calendar" },
  { label: "Goals", icon: "◎", path: "/goals" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.path;

        return (
          <AnimatedPressable
            key={tab.path}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.tab}
            onPress={() => { if (!isActive) router.navigate(tab.path as never); }}
          >
            <Text style={[styles.icon, isActive && styles.active]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.active]}>
              {tab.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ededed",
    paddingTop: 10,
    paddingBottom: 18,
  },
  tab: { minHeight: 44, flex: 1, alignItems: "center", gap: 3 },
  icon: { color: "#757575", fontSize: 23, lineHeight: 24 },
  label: { color: "#757575", fontSize: 11, fontWeight: "600" },
  active: { color: "#00a900" },
});
