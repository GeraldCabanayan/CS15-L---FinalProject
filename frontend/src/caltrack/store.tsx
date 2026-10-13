import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { CalTrackRepository, CalTrackSnapshot } from "./repository";
import { calTrackRepository } from "./sqlite";
import type { Recipe } from "./types";

type Store = CalTrackSnapshot & {
  isSaving: boolean;
  addRecipe: (recipe: Recipe) => Promise<void>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
};
const Context = createContext<Store | null>(null);

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

export function CalTrackProvider({ children, repository = calTrackRepository }: {
  children: ReactNode; repository?: CalTrackRepository;
}) {
  const [snapshot, setSnapshot] = useState<CalTrackSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const mounted = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  // Serialize each change and the reload that follows it, so the screens always
  // show what is actually stored in SQLite.
  const run = useCallback((action?: () => Promise<void>): Promise<void> => {
    if (mounted.current) setPending((value) => value + 1);
    const result = queue.current.then(async () => {
      if (action) await action();
      try {
        const next = await repository.read();
        if (mounted.current) { setSnapshot(next); setError(null); }
      } catch (failure) {
        if (mounted.current) setError(errorMessage(failure));
        throw failure;
      }
    });
    queue.current = result.catch(() => undefined);
    return result.finally(() => {
      if (mounted.current) setPending((value) => value - 1);
    });
  }, [repository]);

  // Load the saved recipes once when the app starts.
  useEffect(() => {
    mounted.current = true;
    void run().catch(() => undefined);
    return () => { mounted.current = false; };
  }, [run]);

  if (error || !snapshot) {
    return (
      <View style={styles.status}>
        {error ? <>
          <Text style={styles.title}>Unable to load your recipes</Text>
          <Text>{error}</Text>
          <Pressable disabled={pending > 0} onPress={() => { void run().catch(() => undefined); }}>
            <Text style={styles.retry}>{pending ? "Retrying…" : "Retry"}</Text>
          </Pressable>
        </> : <><ActivityIndicator color="#00a900" /><Text>Loading CalTrack…</Text></>}
      </View>
    );
  }

  const value: Store = {
    ...snapshot,
    isSaving: pending > 0,
    addRecipe: (recipe) => run(() => repository.createRecipe(recipe)),
    updateRecipe: (recipe) => run(() => repository.updateRecipe(recipe)),
    deleteRecipe: (id) => run(() => repository.deleteRecipe(id)),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCalTrack() {
  const value = useContext(Context);
  if (!value) throw new Error("useCalTrack must be used inside CalTrackProvider");
  return value;
}

const styles = StyleSheet.create({
  status: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16, backgroundColor: "#fafafa" },
  title: { fontSize: 20, fontWeight: "800" },
  retry: { color: "#00a900", padding: 12, fontWeight: "800" },
});
