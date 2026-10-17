import { perServing, type Ingredient, type Meal } from './types';

// Search the current SQLite-backed snapshot; never seed invented suggestions.
export function nameMatches<T extends { name: string }>(items: T[], query: string): T[] {
  const text = query.trim().toLocaleLowerCase();
  if (!text) return [];
  const rank = (name: string) => name === text ? 0 : name.startsWith(text) ? 1 : 2;
  return items.filter((item) => item.name.toLocaleLowerCase().includes(text))
    .sort((a, b) => rank(a.name.toLocaleLowerCase()) - rank(b.name.toLocaleLowerCase()) || a.name.localeCompare(b.name));
}

export function ingredientMatches(meals: Meal[], query: string): Ingredient[] {
  const unique = new Map<string, Ingredient>();
  for (const meal of meals) for (const ingredient of meal.ingredients) {
    const { id: _id, ...values } = ingredient;
    unique.set(JSON.stringify(values), ingredient);
  }
  return nameMatches([...unique.values()], query).slice(0, 6);
}

export function recommendRecipes(meals: Meal[], remaining: number): Meal[] {
  if (remaining <= 0) return [];
  return meals.filter((meal) => perServing(meal).calories <= remaining)
    .sort((a, b) => perServing(b).calories - perServing(a).calories || a.name.localeCompare(b.name)).slice(0, 5);
}
