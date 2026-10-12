export type Ingredient = {
  id: string;
  name: string;
  amount: string; // free-text quantity, e.g. "2 cups" (display only)
  calories: number; // calories this ingredient adds to the recipe
};

export type Recipe = {
  id: string;
  name: string;
  ingredients: Ingredient[];
  createdAt: string;
};

/** A recipe's total calories is the sum of its ingredients' calories. */
export function totalCalories(recipe: Pick<Recipe, "ingredients">): number {
  return recipe.ingredients.reduce((sum, item) => sum + item.calories, 0);
}
