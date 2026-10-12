import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const tabs = [
  { label: "Home", icon: "⌂", path: "/" },
  { label: "Recipes", icon: "▣", path: "/recipes" },
  { label: "Create", icon: "+", path: "/create" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <View style={styles.nav}>
      {tabs.map((tab) => {
        // Recipe Details is opened from the Recipes list, so keep Recipes highlighted there.
        const isActive =
          pathname === tab.path || (tab.path === "/recipes" && pathname.startsWith("/recipe/"));

        return (
          <Pressable key={tab.path} style={styles.tab} onPress={() => router.replace(tab.path)}>
            <Text style={[styles.icon, isActive && styles.active]}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.active]}>{tab.label}</Text>
          </Pressable>
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

  tab: { 
    flex: 1, 
    alignItems: "center", 
    gap: 3 
  },

  icon: { 
    color: "#757575", 
    fontSize: 23, 
    lineHeight: 24 
  },

  label: { 
    color: "#757575", 
    fontSize: 11, 
    fontWeight: "600" 
  },

  active: { 
    color: "#00a900" 
  },

});
