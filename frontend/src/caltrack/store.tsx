import {
  createContext, useContext, useMemo, useState, type ReactNode,
} from "react";
import type { LoggedMeal, Meal, MealCategory, UserGoal } from "./types";

const starterMeals: Meal[] = [
  {
    id: "starter-bowl",
    name: "Green Power Bowl",
    servings: 1,
    createdAt: "2026-09-25",
    ingredients: [
      {
        id: "1",
        name: "Chicken breast",
        amount: "150 g",
        calories: 248,
        protein: 46,
        carbs: 0,
        fat: 5,
        fiber: 0,
        sugar: 0,
        sodium: 110,
      },
      {
        id: "2",
        name: "Brown rice",
        amount: "1 cup",
        calories: 216,
        protein: 5,
        carbs: 45,
        fat: 2,
        fiber: 4,
        sugar: 1,
        sodium: 10,
      },
      {
        id: "3",
        name: "Avocado",
        amount: "½ fruit",
        calories: 160,
        protein: 2,
        carbs: 9,
        fat: 15,
        fiber: 7,
        sugar: 1,
        sodium: 7,
      },
    ],
  },

  {
    id: "dummy-bowl",
    name: "Green Matcha TikTok girl Bowl",
    servings: 1,
    createdAt: "2026-09-25",
    ingredients: [
      {
        id: "1",
        name: "Chicken breast",
        amount: "150 g",
        calories: 566,
        protein: 4,
        carbs: 0,
        fat: 5,
        fiber: 0,
        sugar: 0,
        sodium: 110,
      },
      
      {
        id: "3",
        name: "Avocado",
        amount: "½ fruit",
        calories: 160,
        protein: 2,
        carbs: 9,
        fat: 15,
        fiber: 7,
        sugar: 1,
        sodium: 7,
      },
    ],
  },

  {
    id: "another-dummy-bowl",
    name: "Cardi B bottoms",
    servings: 1,
    createdAt: "2026-06-25",
    ingredients: [
      {
        id: "1",
        name: "Chicken breast",
        amount: "150 g",
        calories: 36,
        protein: 4,
        carbs: 0,
        fat: 5,
        fiber: 0,
        sugar: 0,
        sodium: 110,
      },
      
      {
        id: "3",
        name: "Avocado",
        amount: "½ fruit",
        calories: 1260,
        protein: 2,
        carbs: 9,
        fat: 15,
        fiber: 7,
        sugar: 1,
        sodium: 7,
      },
    ],
  }
];

type Store = {
  meals: Meal[];
  loggedMeals: LoggedMeal[];
  goal: UserGoal;
  addMeal: (meal: Meal) => void;
  logMeal: (id: string, category: MealCategory) => void;
  updateGoal: (goal: UserGoal) => void;
};

const Context = createContext<Store | null>(null);


export function CalTrackProvider({ children }: { children: ReactNode }) {

  const [meals, setMeals] = useState(starterMeals);
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [goal, setGoal] = useState<UserGoal>({
    calorieTarget: 2300,
    goal: "maintain",
  });

  const value = useMemo(
    () => ({
      meals,
      loggedMeals,
      goal,
      addMeal: (meal: Meal) => setMeals((items) => [meal, ...items]),
      logMeal: (id: string, category: MealCategory) =>
        setLoggedMeals((items) =>
          items.some((item) => item.mealId === id)
            ? items
            : [...items, { mealId: id, category }],
        ),
      updateGoal: setGoal,
    }),
    [goal, loggedMeals, meals],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useCalTrack() {
  const value = useContext(Context);

  if (!value) {
    throw new Error("useCalTrack must be used inside CalTrackProvider");
  }

  return value;
}
