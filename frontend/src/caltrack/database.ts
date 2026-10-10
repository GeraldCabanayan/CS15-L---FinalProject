import type { SQLiteDatabase } from "expo-sqlite";

// Only this small driver contract depends on SQLite. Repositories own domain data.
export type DatabaseConnection = Pick<SQLiteDatabase,
  "execAsync" | "runAsync" | "getAllAsync" | "getFirstAsync" | "withTransactionAsync" | "closeAsync"
>;

const schemaV1 = `
CREATE TABLE meals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  category TEXT NOT NULL CHECK (category IN ('uncategorized','breakfast','lunch','dinner')),
  servings REAL NOT NULL CHECK (servings > 0),
  created_at TEXT NOT NULL
);
CREATE TABLE ingredients (
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
CREATE TABLE meal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('uncategorized','breakfast','lunch','dinner')),
  UNIQUE (log_date, meal_id)
);
CREATE TABLE user_goals (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  calorie_target REAL NOT NULL CHECK (calorie_target > 0),
  goal TEXT NOT NULL CHECK (goal IN ('lose','maintain','gain'))
);
INSERT INTO user_goals (id, calorie_target, goal) VALUES (1, 2300, 'maintain');
PRAGMA user_version = 1;
`;

export function createDatabaseService(open: () => Promise<DatabaseConnection>) {
  let connection: Promise<DatabaseConnection> | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  async function initialize() {
    const db = await open();
    try {
      await db.execAsync("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
      await db.withTransactionAsync(async () => {
        const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
        if ((version?.user_version ?? 0) > 1) {
          throw new Error("This database requires a newer version of CalTrack.");
        }
        if (!version?.user_version) await db.execAsync(schemaV1);
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
