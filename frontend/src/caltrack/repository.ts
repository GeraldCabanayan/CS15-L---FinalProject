import type { DatabaseConnection, DatabaseService } from "./database";
import type { Ingredient, Recipe } from "./types";

export type CalTrackSnapshot = { recipes: Recipe[] };

export interface CalTrackRepository {
  read(): Promise<CalTrackSnapshot>;
  createRecipe(recipe: Recipe): Promise<void>;
  updateRecipe(recipe: Recipe): Promise<void>;
  deleteRecipe(id: string): Promise<void>;
}

type RecipeRow = { id: string; title: string; date_added: string };
type IngredientRow = {
  recipe_id: string;
  id: string;
  ingredient_name: string;
  calories: number;
  quantity: string;
};

function validateRecipe(recipe: Recipe) {
  if (!recipe.id || !recipe.name.trim()) throw new Error("Give your recipe a name.");
  if (!recipe.ingredients.length) throw new Error("Add at least one ingredient.");
  if (new Set(recipe.ingredients.map((i) => i.id)).size !== recipe.ingredients.length) {
    throw new Error("Ingredient IDs must be unique within a recipe.");
  }
  for (const item of recipe.ingredients) {
    if (!item.id || !item.name.trim()) throw new Error("Every ingredient needs a name.");
    if (!Number.isFinite(item.calories) || item.calories < 0) {
      throw new Error("Calories must be a number that is 0 or more.");
    }
  }
}

async function insertIngredients(db: DatabaseConnection, recipe: Recipe) {
  for (const [position, item] of recipe.ingredients.entries()) {
    await db.runAsync(
      `INSERT INTO ingredients (recipe_id, id, position, ingredient_name, calories, quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      recipe.id, item.id, position, item.name.trim(), item.calories, item.amount,
    );
  }
}

export function createSQLiteRepository(database: DatabaseService): CalTrackRepository {
  return {
    // READ: one transaction, so recipes and ingredients always match each other.
    read: () => database.transaction(async (db) => {
      const rows = await db.getAllAsync<RecipeRow>(
        "SELECT id, title, date_added FROM recipes ORDER BY date_added DESC, id DESC",
      );
      const items = await db.getAllAsync<IngredientRow>(
        "SELECT recipe_id, id, ingredient_name, calories, quantity FROM ingredients ORDER BY recipe_id, position",
      );
      const byRecipe = new Map<string, Ingredient[]>();
      for (const row of items) {
        const list = byRecipe.get(row.recipe_id) ?? [];
        list.push({ id: row.id, name: row.ingredient_name, amount: row.quantity, calories: row.calories });
        byRecipe.set(row.recipe_id, list);
      }
      const recipes = rows.map((row) => ({
        id: row.id,
        name: row.title,
        createdAt: row.date_added,
        ingredients: byRecipe.get(row.id) ?? [],
      }));
      return { recipes };
    }),

    // CREATE
    async createRecipe(recipe) {
      validateRecipe(recipe);
      await database.transaction(async (db) => {
        await db.runAsync(
          "INSERT INTO recipes (id, title, date_added) VALUES (?, ?, ?)",
          recipe.id, recipe.name.trim(), recipe.createdAt,
        );
        await insertIngredients(db, recipe);
      });
    },

    // UPDATE: the recipe row is updated in place; its ingredient list is replaced.
    async updateRecipe(recipe) {
      validateRecipe(recipe);
      await database.transaction(async (db) => {
        const result = await db.runAsync(
          "UPDATE recipes SET title = ? WHERE id = ?",
          recipe.name.trim(), recipe.id,
        );
        if (!result.changes) throw new Error("This recipe no longer exists.");
        await db.runAsync("DELETE FROM ingredients WHERE recipe_id = ?", recipe.id);
        await insertIngredients(db, recipe);
      });
    },

    // DELETE: ON DELETE CASCADE removes the recipe's ingredients too.
    async deleteRecipe(id) {
      await database.execute(async (db) => {
        await db.runAsync("DELETE FROM recipes WHERE id = ?", id);
      });
    },
  };
}
