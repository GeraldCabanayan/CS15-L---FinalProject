import type { DatabaseConnection, DatabaseService } from "./database";
import { emptyNutrition, type Ingredient, type LoggedMeal, type Meal, type MealCategory, type UserGoal } from "./types";

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type CalTrackSnapshot = { meals: Meal[]; loggedMeals: LoggedMeal[]; goal: UserGoal; date: string; recordedDates: string[] };
export interface CalTrackRepository {
  read(date: string): Promise<CalTrackSnapshot>;
  createMeal(meal: Meal): Promise<void>;
  updateMeal(meal: Meal): Promise<void>;
  deleteMeal(id: string): Promise<void>;
  logMeal(id: string, category: MealCategory, date: string, quantity?: number): Promise<void>;
  updateLog(id: number, category: MealCategory, quantity?: number): Promise<void>;
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
      validateDate(date);
      const rows = await db.getAllAsync<{ id: string; name: string; category: MealCategory; servings: number; created_at: string; nutrition_complete: number }>(
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
      const meals = rows.map(({ created_at, nutrition_complete, ...row }) => ({
        ...row, createdAt: created_at, ingredients: byMeal.get(row.id) ?? [],
        ...(nutrition_complete === 0 ? { nutritionComplete: false } : {}),
      }));
      const loggedMeals = await db.getAllAsync<LoggedMeal>(
        "SELECT id, meal_id AS mealId, log_date AS date, category, quantity FROM meal_logs WHERE log_date = ? ORDER BY id", date,
      );
      const goal = await db.getFirstAsync<UserGoal>("SELECT calorie_target AS calorieTarget, protein_target AS proteinTarget, carbs_target AS carbsTarget, fat_target AS fatTarget, goal FROM user_goals WHERE id = 1");
      if (!goal) throw new Error("Your calorie goal could not be loaded.");
      const dates = await db.getAllAsync<{ date: string }>("SELECT DISTINCT log_date AS date FROM meal_logs ORDER BY log_date");
      return { meals, loggedMeals, goal, date, recordedDates: dates.map((row) => row.date) };
    }),
    async createMeal(meal) {
      validateMeal(meal);
      await database.transaction(async (db) => {
        await db.runAsync("INSERT INTO meals (id, name, category, servings, created_at, nutrition_complete) VALUES (?, ?, ?, ?, ?, ?)",
          meal.id, meal.name.trim(), meal.category ?? "uncategorized", meal.servings, meal.createdAt, meal.nutritionComplete === false ? 0 : 1);
        await insertIngredients(db, meal);
      });
    },
    async updateMeal(meal) {
      validateMeal(meal);
      await database.transaction(async (db) => {
        const result = await db.runAsync("UPDATE meals SET name = ?, category = ?, servings = ?, nutrition_complete = ? WHERE id = ?",
          meal.name.trim(), meal.category ?? "uncategorized", meal.servings, meal.nutritionComplete === false ? 0 : 1, meal.id);
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
    async logMeal(id, category, date, quantity = 1) {
      validateDate(date);
      positive(quantity, "Logged servings");
      validateCategory(category);
      await database.execute(async (db) => {
        await db.runAsync("INSERT INTO meal_logs (meal_id, log_date, category, quantity) VALUES (?, ?, ?, ?) ON CONFLICT (log_date, meal_id, category) DO NOTHING", id, date, category, quantity);
      });
    },
    async updateLog(id, category, quantity) {
      if (quantity !== undefined) positive(quantity, "Logged servings");
      validateCategory(category);
      await database.execute(async (db) => {
        const conflict = await db.getFirstAsync<{ id: number }>(
          "SELECT other.id FROM meal_logs current JOIN meal_logs other ON other.meal_id = current.meal_id AND other.log_date = current.log_date WHERE current.id = ? AND other.category = ? AND other.id != ?", id, category, id,
        );
        if (conflict) throw new Error("This recipe is already in that category. Edit that entry's servings instead.");
        const result = await db.runAsync("UPDATE meal_logs SET category = ?, quantity = COALESCE(?, quantity) WHERE id = ?", category, quantity ?? null, id);
        if (!result.changes) throw new Error("This meal log no longer exists.");
      });
    },
    async deleteLog(id) {
      await database.execute(async (db) => { await db.runAsync("DELETE FROM meal_logs WHERE id = ?", id); });
    },
    async updateGoal(goal) {
      positive(goal.calorieTarget, "Calorie target");
      if (!["lose", "maintain", "gain"].includes(goal.goal)) throw new Error("Choose a valid goal.");
      for (const target of [goal.proteinTarget, goal.carbsTarget, goal.fatTarget]) {
        if (target != null) positive(target, "Macro target");
      }
      await database.execute(async (db) => {
        await db.runAsync("UPDATE user_goals SET calorie_target = ?, goal = ?, protein_target = ?, carbs_target = ?, fat_target = ? WHERE id = 1", goal.calorieTarget, goal.goal, goal.proteinTarget ?? null, goal.carbsTarget ?? null, goal.fatTarget ?? null);
      });
    },
  };
}

export function validateDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose a valid date (YYYY-MM-DD).');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (localDate(date) !== value) throw new Error('Choose a valid calendar date.');
}
