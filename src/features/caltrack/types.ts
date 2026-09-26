export type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
};

export type Ingredient = Nutrition & {
  id: string;
  name: string;
  amount: string;
};

export type Meal = {
  id: string;
  name: string;
  servings: number;
  ingredients: Ingredient[];
  createdAt: string;
};

export type UserGoal = {
  calorieTarget: number;
  goal: "lose" | "maintain" | "gain";
};

export const emptyNutrition: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
};

export function sumNutrition(items: Nutrition[]): Nutrition {
  return items.reduce(
    (total, item) =>
      Object.fromEntries(
        Object.keys(emptyNutrition).map((key) => [
          key,
          total[key as keyof Nutrition] + item[key as keyof Nutrition],
        ]),
      ) as Nutrition,
    { ...emptyNutrition },
  );
}

export function perServing(meal: Meal): Nutrition {
  const total = sumNutrition(meal.ingredients);
  return Object.fromEntries(
    Object.entries(total).map(([key, value]) => [
      key,
      value / Math.max(meal.servings, 1),
    ]),
  ) as Nutrition;
}
