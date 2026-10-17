import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";
import { AnimatedPressable } from "../components/AnimatedPressable";
import { localDate, validateDate, type CalTrackRepository, type CalTrackSnapshot } from "./repository";
import { calTrackRepository } from "./sqlite";
import type { Meal, MealCategory, UserGoal } from "./types";

type Store = CalTrackSnapshot & {
  isSaving: boolean;
  selectDate: (date: string) => Promise<void>;
  addMeal: (meal: Meal, scheduledDate?: string) => Promise<void>;
  updateMeal: (meal: Meal) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  logMeal: (id: string, category: MealCategory, quantity?: number) => Promise<void>;
  updateLog: (id: number, category: MealCategory, quantity?: number) => Promise<void>;
  deleteLog: (id: number) => Promise<void>;
  updateGoal: (goal: UserGoal) => Promise<void>;
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
  const selectedDate = useRef(localDate());
  const lastToday = useRef(localDate());

  // Serialize each mutation and its refresh together to prevent stale UI reads.
  const run = useCallback((action?: () => Promise<void>): Promise<void> => {
    if (mounted.current) setPending((value) => value + 1);
    const result = queue.current.then(async () => {
      if (action) await action();
      try {
        const next = await repository.read(selectedDate.current);
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

  useEffect(() => {
    mounted.current = true;
    const refresh = () => {
      void run(async () => {
        const today = localDate();
        if (selectedDate.current === lastToday.current) selectedDate.current = today;
        lastToday.current = today;
      }).catch(() => undefined);
    };
    refresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => { refresh(); schedule(); }, tomorrow.getTime() - now.getTime() + 100);
    };
    schedule();
    return () => { mounted.current = false; listener.remove(); clearTimeout(timer); };
  }, [run]);

  if (error || !snapshot) {
    return (
      <View style={styles.status}>
        {error ? <>
          <Text style={styles.title}>Unable to load your data</Text>
          <Text>{error}</Text>
          <AnimatedPressable disabled={pending > 0} onPress={() => { void run().catch(() => undefined); }}>
            <Text style={styles.retry}>{pending ? "Retrying…" : "Retry"}</Text>
          </AnimatedPressable>
        </> : <><ActivityIndicator color="#00a900" /><Text>Loading CalTrack…</Text></>}
      </View>
    );
  }

  const value: Store = {
    ...snapshot,
    isSaving: pending > 0,
    selectDate: (date) => {
      validateDate(date);
      return run(async () => { selectedDate.current = date; });
    },
    // Capture the displayed date before joining the queue. A later date change
    // must not move a meal that the user was creating for this date.
    addMeal: (meal, scheduledDate = snapshot.date) => run(() => repository.createMeal(meal, scheduledDate)),
    updateMeal: (meal) => run(() => repository.updateMeal(meal)),
    deleteMeal: (id) => run(() => repository.deleteMeal(id)),
    logMeal: (id, category, quantity = 1) => run(() => repository.logMeal(id, category, snapshot.date, quantity)),
    updateLog: (id, category, quantity) => run(() => repository.updateLog(id, category, quantity)),
    deleteLog: (id) => run(() => repository.deleteLog(id)),
    updateGoal: (goal) => run(() => repository.updateGoal(goal)),
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
