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

export type MealCategory = "uncategorized" | "breakfast" | "lunch" | "dinner";

export type Meal = {
  id: string;
  name: string;
  category?: MealCategory;
  servings: number;
  ingredients: Ingredient[];
  instructions?: string;
  createdAt: string;
  nutritionComplete?: boolean;
};

export type LoggedMeal = {
  id: number;
  date: string;
  mealId: string;
  category: MealCategory;
  quantity: number;
};

export type UserGoal = {
  calorieTarget: number;
  proteinTarget?: number | null;
  carbsTarget?: number | null;
  fatTarget?: number | null;
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
      value / meal.servings,
    ]),
  ) as Nutrition;
}

export function scaleNutrition(nutrition: Nutrition, quantity: number): Nutrition {
  return Object.fromEntries(Object.entries(nutrition).map(([key, value]) => [key, value * quantity])) as Nutrition;
}

export function dailyNutrition(meals: Meal[], logs: LoggedMeal[]): Nutrition {
  const byId = new Map(meals.map((meal) => [meal.id, meal]));
  return sumNutrition(logs.flatMap((log) => {
    const meal = byId.get(log.mealId);
    return meal ? [scaleNutrition(perServing(meal), log.quantity)] : [];
  }));
}

export function calorieProgress(consumed: number, target: number) {
  return { remaining: Math.max(target - consumed, 0), over: Math.max(consumed - target, 0), percent: consumed / target * 100 };
}

export const mealCategories: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'uncategorized'];
export function categoryLabel(category: MealCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}
