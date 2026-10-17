import type { SQLiteDatabase } from "expo-sqlite";
import { initialSampleRecipes, filipinoSampleRecipes } from './sampleRecipes';
import type { Meal } from './types';

// Only this small driver contract depends on SQLite. Repositories own domain data.
export type DatabaseConnection = Pick<SQLiteDatabase,
  "execAsync" | "runAsync" | "getAllAsync" | "getFirstAsync" | "withTransactionAsync" | "closeAsync"
>;

const schemaV1 = `
CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  category TEXT NOT NULL CHECK (category IN ('uncategorized','breakfast','lunch','dinner')),
  servings REAL NOT NULL CHECK (servings > 0),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ingredients (
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  position INTEGER NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  amount TEXT NOT NULL,
  calories REAL NOT NULL CHECK (calories >= 0),
  protein REAL NOT NULL CHECK (protein >= 0),
  carbs REAL NOT NULL CHECK (carbs >= 0),
  fat REAL NOT NULL CHECK (fat >= 0),
  fiber REAL NOT NULL CHECK (fiber >= 0),
  sugar REAL NOT NULL CHECK (sugar >= 0),
  sodium REAL NOT NULL CHECK (sodium >= 0),
  PRIMARY KEY (meal_id, id)
);
CREATE TABLE IF NOT EXISTS meal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('uncategorized','breakfast','lunch','dinner')),
  UNIQUE (log_date, meal_id)
);
CREATE TABLE IF NOT EXISTS user_goals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  calorie_target REAL NOT NULL CHECK (calorie_target > 0),
  goal TEXT NOT NULL CHECK (goal IN ('lose','maintain','gain'))
);
INSERT INTO user_goals (id, calorie_target, goal) VALUES (1, 2300, 'maintain') ON CONFLICT (id) DO NOTHING;
PRAGMA user_version = 1;
`;

const schemaV2 = `
CREATE TABLE meal_logs_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('uncategorized','breakfast','lunch','dinner')),
  quantity REAL NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (log_date, meal_id, category)
);
INSERT INTO meal_logs_v2 (id, meal_id, log_date, category) SELECT id, meal_id, log_date, category FROM meal_logs;
DROP TABLE meal_logs;
ALTER TABLE meal_logs_v2 RENAME TO meal_logs;
CREATE INDEX IF NOT EXISTS meal_logs_date ON meal_logs(log_date);
`;

async function columns(db: DatabaseConnection, table: string) {
  // Table names are internal constants, never user input.
  return new Set((await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`)).map((column) => column.name));
}

async function validateExistingSchema(db: DatabaseConnection) {
  const required = {
    meals: ['id', 'name', 'category', 'servings', 'created_at'],
    ingredients: ['meal_id', 'id', 'position', 'name', 'amount', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'],
    meal_logs: ['id', 'meal_id', 'log_date', 'category'],
    user_goals: ['id', 'calorie_target', 'goal'],
  };
  for (const [table, names] of Object.entries(required)) {
    const existing = await columns(db, table);
    if (existing.size && names.some((name) => !existing.has(name))) {
      throw new Error(`The existing ${table} table uses an older, unsupported layout. Your data has been kept. A data migration is needed before it can be opened.`);
    }
  }
}

async function migrateV2(db: DatabaseConnection) {
  const logColumns = await columns(db, 'meal_logs');
  // An unversioned database may already have quantities. Retain them on repair.
  const migration = logColumns.has('quantity') ? schemaV2.replace(
    'INSERT INTO meal_logs_v2 (id, meal_id, log_date, category) SELECT id, meal_id, log_date, category FROM meal_logs;',
    'INSERT INTO meal_logs_v2 (id, meal_id, log_date, category, quantity) SELECT id, meal_id, log_date, category, quantity FROM meal_logs;',
  ) : schemaV2;
  await db.execAsync(migration);
  const goalColumns = await columns(db, 'user_goals');
  for (const name of ['protein_target', 'carbs_target', 'fat_target']) {
    if (!goalColumns.has(name)) {
      await db.execAsync(`ALTER TABLE user_goals ADD COLUMN ${name} REAL CHECK (${name} > 0)`);
    }
  }
  await db.execAsync('PRAGMA user_version = 2;');
}

async function hasLegacyRecipeSchema(db: DatabaseConnection) {
  const recipes = await columns(db, 'recipes');
  const ingredients = await columns(db, 'ingredients');
  return ['id', 'title', 'date_added'].every((name) => recipes.has(name)) &&
    ['recipe_id', 'id', 'position', 'ingredient_name', 'calories', 'quantity'].every((name) => ingredients.has(name)) &&
    !ingredients.has('meal_id');
}

async function migrateLegacyRecipes(db: DatabaseConnection) {
  // Keep the original tables as an archive. Their foreign keys still point to
  // recipes, so deleting a new meal cannot delete the source records.
  await db.execAsync('ALTER TABLE ingredients RENAME TO legacy_recipe_ingredients;');
  await validateExistingSchema(db);
  await db.execAsync(schemaV1);
  await db.execAsync(`
    INSERT INTO meals (id, name, category, servings, created_at)
      SELECT id, title, 'uncategorized', 1, date_added FROM recipes;
    INSERT INTO ingredients (meal_id, id, position, name, amount, calories, protein, carbs, fat, fiber, sugar, sodium)
      SELECT recipe_id, id, position, ingredient_name, quantity, calories, 0, 0, 0, 0, 0, 0
      FROM legacy_recipe_ingredients;
  `);
}

async function migrateV3(db: DatabaseConnection, importedLegacyRecipes: boolean) {
  if (!(await columns(db, 'meals')).has('nutrition_complete')) {
    await db.execAsync('ALTER TABLE meals ADD COLUMN nutrition_complete INTEGER NOT NULL DEFAULT 1 CHECK (nutrition_complete IN (0, 1));');
  }
  if (importedLegacyRecipes) {
    await db.execAsync('UPDATE meals SET nutrition_complete = 0 WHERE id IN (SELECT id FROM recipes);');
  }
  await db.execAsync('PRAGMA user_version = 3;');
}

async function migrateV4(db: DatabaseConnection) {
  if (!(await columns(db, 'meals')).has('instructions')) {
    await db.execAsync("ALTER TABLE meals ADD COLUMN instructions TEXT NOT NULL DEFAULT '';");
  }
  // A persistent marker also prevents reseeding after an unversioned DB repair.
  await db.execAsync('CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);');
  await seedRecipes(db, 'sample_recipes_v1', initialSampleRecipes);
  await db.execAsync('PRAGMA user_version = 4;');
}

async function seedRecipes(db: DatabaseConnection, batch: string, recipes: Meal[]) {
  const seeded = await db.getFirstAsync('SELECT value FROM app_metadata WHERE key = ?', batch);
  if (!seeded) {
    for (const meal of recipes) {
      const existing = await db.getFirstAsync('SELECT id FROM meals WHERE id = ?', meal.id);
      if (existing) continue;
      await db.runAsync('INSERT INTO meals (id, name, category, servings, created_at, instructions) VALUES (?, ?, ?, ?, ?, ?)',
        meal.id, meal.name, meal.category ?? 'uncategorized', meal.servings, meal.createdAt, meal.instructions ?? '');
      for (const [position, item] of meal.ingredients.entries()) {
        await db.runAsync(`INSERT INTO ingredients (meal_id, id, position, name, amount, calories, protein, carbs, fat, fiber, sugar, sodium)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          meal.id, item.id, position, item.name, item.amount, item.calories, item.protein, item.carbs, item.fat, item.fiber, item.sugar, item.sodium);
      }
    }
    await db.runAsync("INSERT INTO app_metadata (key, value) VALUES (?, '1')", batch);
  }
}

export function createDatabaseService(open: () => Promise<DatabaseConnection>) {
  let connection: Promise<DatabaseConnection> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  async function initialize() {
    const db = await open();
    try {
      await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
      await db.withTransactionAsync(async () => {
        const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
        let currentVersion = version?.user_version ?? 0;
        if (currentVersion > 4) {
          throw new Error("This database requires a newer version of CalTrack.");
        }
        // A previous branch also used version 2 for a different recipe-only
        // schema. Detect its actual columns before applying numbered upgrades.
        const legacyRecipes = currentVersion < 3 && await hasLegacyRecipeSchema(db);
        if (legacyRecipes) {
          await migrateLegacyRecipes(db);
          currentVersion = 1;
        } else if (!currentVersion) {
          await validateExistingSchema(db);
          await db.execAsync(schemaV1);
        }
        if (currentVersion < 2) await migrateV2(db);
        if (currentVersion < 3) await migrateV3(db, legacyRecipes);
        if (currentVersion < 4) await migrateV4(db);
        // Content updates also apply to installations already on schema v4.
        await seedRecipes(db, 'filipino_recipes_v1', filipinoSampleRecipes);
      });
      return db;
    } catch (error) {
      await db.closeAsync().catch(() => undefined);
      throw error;
    }
  }

  function getConnection() {
    if (!connection) {
      connection = initialize().catch((error) => {
        connection = undefined; // A failed startup can be retried from the UI.
        throw error;
      });
    }
    return connection;
  }

  // Every operation uses this queue, so another async query cannot accidentally
  // join an in-progress transaction. Works on native and SQLite's web driver.
  function execute<T>(task: (db: DatabaseConnection) => Promise<T>): Promise<T> {
    const result = queue.then(async () => task(await getConnection()));
    queue = result.catch(() => undefined);
    return result;
  }

  function transaction<T>(task: (db: DatabaseConnection) => Promise<T>): Promise<T> {
    return execute(async (db) => {
      let result!: T;
      await db.withTransactionAsync(async () => { result = await task(db); });
      return result;
    });
  }

  return { execute, transaction };
}

export type DatabaseService = ReturnType<typeof createDatabaseService>;
