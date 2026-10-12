import type { SQLiteDatabase } from "expo-sqlite";

// Only this small driver contract depends on SQLite. Repositories own domain data.
export type DatabaseConnection = Pick<SQLiteDatabase,
  "execAsync" | "runAsync" | "getAllAsync" | "getFirstAsync" | "withTransactionAsync" | "closeAsync"
>;

const SCHEMA_VERSION = 2;

// Matches the approved proposal: a recipes table and an ingredients table that
// points back to its recipe. A recipe's total calories is the sum of the
// calories of its ingredients. (`position` only keeps ingredients in the order
// the user entered them.)
const schemaV2 = `
CREATE TABLE recipes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  date_added TEXT NOT NULL
);
CREATE TABLE ingredients (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  position INTEGER NOT NULL,
  ingredient_name TEXT NOT NULL CHECK (length(trim(ingredient_name)) > 0),
  calories REAL NOT NULL CHECK (calories >= 0),
  quantity TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (recipe_id, id)
);
`;

// The first version of the app also had meal logs, calorie goals, categories,
// servings and macros. Those features were removed, so upgrading keeps every
// saved recipe and ingredient and drops the rest.
const upgradeV1ToV2 = `
ALTER TABLE ingredients RENAME TO ingredients_v1;
${schemaV2}
INSERT INTO recipes (id, title, date_added) SELECT id, name, created_at FROM meals;
INSERT INTO ingredients (recipe_id, id, position, ingredient_name, calories, quantity)
  SELECT meal_id, id, position, name, calories, amount FROM ingredients_v1;
DROP TABLE ingredients_v1;
DROP TABLE meal_logs;
DROP TABLE user_goals;
DROP TABLE meals;
`;

export function createDatabaseService(open: () => Promise<DatabaseConnection>) {
  let connection: Promise<DatabaseConnection> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  async function initialize() {
    const db = await open();
    try {
      await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
      await db.withTransactionAsync(async () => {
        const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
        const version = row?.user_version ?? 0;
        if (version > SCHEMA_VERSION) {
          throw new Error("This database requires a newer version of CalTrack.");
        }
        if (version === 0) await db.execAsync(`${schemaV2} PRAGMA user_version = ${SCHEMA_VERSION};`);
        else if (version === 1) await db.execAsync(`${upgradeV1ToV2} PRAGMA user_version = ${SCHEMA_VERSION};`);
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
