import type { DatabaseConnection, DatabaseService } from "./database";
import { emptyNutrition, type Ingredient, type LoggedMeal, type Meal, type MealCategory, type UserGoal } from "./types";

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type CalTrackSnapshot = { meals: Meal[]; loggedMeals: LoggedMeal[]; goal: UserGoal; date: string };
export interface CalTrackRepository {
  read(date: string): Promise<CalTrackSnapshot>;
  createMeal(meal: Meal): Promise<void>;
  updateMeal(meal: Meal): Promise<void>;
  deleteMeal(id: string): Promise<void>;
  logMeal(id: string, category: MealCategory, date: string): Promise<void>;
  updateLog(id: number, category: MealCategory): Promise<void>;
  deleteLog(id: number): Promise<void>;
  updateGoal(goal: UserGoal): Promise<void>;
}

const categories: MealCategory[] = ["uncategorized", "breakfast", "lunch", "dinner"];
function validateCategory(category: MealCategory) {
  if (!categories.includes(category)) throw new Error("Choose a valid meal category.");
}
function positive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be a positive number.`);
}
function validateMeal(meal: Meal) {
  if (!meal.id || !meal.name.trim()) throw new Error("Add a recipe name.");
  positive(meal.servings, "Servings");
  validateCategory(meal.category ?? "uncategorized");
  if (!meal.ingredients.length) throw new Error("Add at least one ingredient.");
  if (new Set(meal.ingredients.map((i) => i.id)).size !== meal.ingredients.length) {
    throw new Error("Ingredient IDs must be unique within a recipe.");
  }
  for (const item of meal.ingredients) {
    if (!item.id || !item.name.trim()) throw new Error("Name every ingredient.");
    for (const key of Object.keys(emptyNutrition) as (keyof typeof emptyNutrition)[]) {
      if (!Number.isFinite(item[key]) || item[key] < 0) {
        throw new Error("Nutrition values must be finite, non-negative numbers.");
      }
    }
  }
}

async function insertIngredients(db: DatabaseConnection, meal: Meal) {
  for (const [position, i] of meal.ingredients.entries()) {
    await db.runAsync(
      `INSERT INTO ingredients (meal_id, id, position, name, amount, calories, protein, carbs, fat, fiber, sugar, sodium)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      meal.id, i.id, position, i.name.trim(), i.amount, i.calories, i.protein, i.carbs, i.fat, i.fiber, i.sugar, i.sodium,
    );
  }
}

export function createSQLiteRepository(database: DatabaseService): CalTrackRepository {
  return {
    read: (date) => database.transaction(async (db) => {
      const rows = await db.getAllAsync<{ id: string; name: string; category: MealCategory; servings: number; created_at: string }>(
        "SELECT * FROM meals ORDER BY created_at DESC, id DESC",
      );
      const ingredients = await db.getAllAsync<Ingredient & { meal_id: string; position: number }>(
        "SELECT * FROM ingredients ORDER BY meal_id, position",
      );
      const byMeal = new Map<string, Ingredient[]>();
      for (const { meal_id, position: _position, ...ingredient } of ingredients) {
        const list = byMeal.get(meal_id) ?? [];
        list.push(ingredient);
        byMeal.set(meal_id, list);
      }
      const meals = rows.map(({ created_at, ...row }) => ({
        ...row, createdAt: created_at, ingredients: byMeal.get(row.id) ?? [],
      }));
      const loggedMeals = await db.getAllAsync<LoggedMeal>(
        "SELECT id, meal_id AS mealId, log_date AS date, category FROM meal_logs WHERE log_date = ? ORDER BY id", date,
      );
      const goal = await db.getFirstAsync<UserGoal>("SELECT calorie_target AS calorieTarget, goal FROM user_goals WHERE id = 1");
      if (!goal) throw new Error("Your calorie goal could not be loaded.");
      return { meals, loggedMeals, goal, date };
    }),
    async createMeal(meal) {
      validateMeal(meal);
      await database.transaction(async (db) => {
        await db.runAsync("INSERT INTO meals (id, name, category, servings, created_at) VALUES (?, ?, ?, ?, ?)",
          meal.id, meal.name.trim(), meal.category ?? "uncategorized", meal.servings, meal.createdAt);
        await insertIngredients(db, meal);
      });
    },
    async updateMeal(meal) {
      validateMeal(meal);
      await database.transaction(async (db) => {
        const result = await db.runAsync("UPDATE meals SET name = ?, category = ?, servings = ? WHERE id = ?",
          meal.name.trim(), meal.category ?? "uncategorized", meal.servings, meal.id);
        if (!result.changes) throw new Error("This recipe no longer exists.");
        await db.runAsync("DELETE FROM ingredients WHERE meal_id = ?", meal.id);
        await insertIngredients(db, meal);
      });
    },
    async deleteMeal(id) {
      await database.execute(async (db) => {
        await db.runAsync("DELETE FROM meals WHERE id = ?", id);
      });
    },
    async logMeal(id, category, date) {
      validateCategory(category);
      await database.execute(async (db) => {
        await db.runAsync("INSERT INTO meal_logs (meal_id, log_date, category) VALUES (?, ?, ?) ON CONFLICT (log_date, meal_id) DO NOTHING", id, date, category);
      });
    },
    async updateLog(id, category) {
      validateCategory(category);
      await database.execute(async (db) => {
        const result = await db.runAsync("UPDATE meal_logs SET category = ? WHERE id = ?", category, id);
        if (!result.changes) throw new Error("This meal log no longer exists.");
      });
    },
    async deleteLog(id) {
      await database.execute(async (db) => { await db.runAsync("DELETE FROM meal_logs WHERE id = ?", id); });
    },
    async updateGoal(goal) {
      positive(goal.calorieTarget, "Calorie target");
      if (!["lose", "maintain", "gain"].includes(goal.goal)) throw new Error("Choose a valid goal.");
      await database.execute(async (db) => {
        await db.runAsync("UPDATE user_goals SET calorie_target = ?, goal = ? WHERE id = 1", goal.calorieTarget, goal.goal);
      });
    },
  };
}
