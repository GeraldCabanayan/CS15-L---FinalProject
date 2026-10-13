const { test } = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { mkdtempSync, readFileSync, existsSync, unlinkSync, rmdirSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Compile the actual domain/service sources in memory, without importing RN.
const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, "../src/caltrack", relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename, module);
  cache.set(filename, mod);
  mod.filename = filename;
  mod.require = (name) => name.startsWith(".")
    ? load(`${name}.ts`) : require(name);
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  mod._compile(compiled, filename);
  return mod.exports;
}
const { createDatabaseService } = load("database.ts");
const { createSQLiteRepository } = load("repository.ts");
const { totalCalories } = load("types.ts");

// Real SQLite engine behind the same async driver contract used by Expo.
function driver(filename = ":memory:") {
  const raw = new DatabaseSync(filename);
  let closed = false;
  const db = {
    raw,
    failIngredient: false,
    async execAsync(sql) { raw.exec(sql); },
    async runAsync(sql, ...params) {
      if (db.failIngredient && sql.includes("INSERT INTO ingredients")) {
        throw new Error("Simulated ingredient write failure");
      }
      const result = raw.prepare(sql).run(...params);
      return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
    },
    async getFirstAsync(sql, ...params) {
      const row = raw.prepare(sql).get(...params);
      return row ? { ...row } : null;
    },
    async getAllAsync(sql, ...params) { return raw.prepare(sql).all(...params).map((row) => ({ ...row })); },
    async withTransactionAsync(task) {
      raw.exec("BEGIN");
      try { await task(); raw.exec("COMMIT"); }
      catch (error) { raw.exec("ROLLBACK"); throw error; }
    },
    async closeAsync() { if (!closed) { closed = true; raw.close(); } },
  };
  return db;
}
function fixture(t, filename) {
  const db = driver(filename);
  t.after(() => db.closeAsync());
  const service = createDatabaseService(async () => db);
  return { db, service, repo: createSQLiteRepository(service) };
}
function recipe(id = "recipe-1") {
  return {
    id, name: "Chef's bowl'); DROP TABLE recipes; --",
    createdAt: "2026-10-10T10:00:00.000Z",
    ingredients: [
      { id: "rice", name: "Rice", amount: "1 cup", calories: 200 },
      { id: "beans", name: "Beans", amount: "100 g", calories: 100.5 },
    ],
  };
}

test("initialization creates only recipes and ingredients and is repeatable", async (t) => {
  const { repo, service, db } = fixture(t);
  assert.deepEqual((await repo.read()).recipes, []);
  assert.equal((await service.execute((c) => c.getFirstAsync("PRAGMA user_version"))).user_version, 2);
  const tables = db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
  assert.deepEqual(tables, ["ingredients", "recipes"]);
  const reopened = createSQLiteRepository(createDatabaseService(async () => db));
  assert.deepEqual((await reopened.read()).recipes, []);
});

test("CREATE, READ, UPDATE, DELETE keep ingredient order and bind SQL input", async (t) => {
  const { repo } = fixture(t);
  const original = recipe();
  await repo.createRecipe(original);
  assert.deepEqual((await repo.read()).recipes, [original]);

  const edited = { ...original, name: "Updated", ingredients: [original.ingredients[1], { id: "oil", name: "Oil", amount: "1 tbsp", calories: 120 }] };
  await repo.updateRecipe(edited);
  assert.deepEqual((await repo.read()).recipes, [edited]);

  await repo.deleteRecipe(edited.id);
  assert.equal((await repo.read()).recipes.length, 0);
});

test("total calories is the sum of the ingredients' calories", () => {
  assert.equal(totalCalories(recipe()), 300.5);
  assert.equal(totalCalories({ ingredients: [] }), 0);
});

test("newest recipe is listed first", async (t) => {
  const { repo } = fixture(t);
  await repo.createRecipe({ ...recipe("old"), createdAt: "2026-10-01T00:00:00.000Z" });
  await repo.createRecipe({ ...recipe("new"), createdAt: "2026-10-09T00:00:00.000Z" });
  assert.deepEqual((await repo.read()).recipes.map((r) => r.id), ["new", "old"]);
});

test("deleting a recipe cascades to its ingredients only", async (t) => {
  const { repo, service } = fixture(t);
  await repo.createRecipe(recipe("a"));
  await repo.createRecipe(recipe("b"));
  await repo.deleteRecipe("a");
  const left = await service.execute((db) => db.getAllAsync("SELECT DISTINCT recipe_id FROM ingredients"));
  assert.deepEqual(left, [{ recipe_id: "b" }]);
});

test("failed ingredient writes roll back recipe create and update", async (t) => {
  const { repo, db } = fixture(t);
  await repo.createRecipe(recipe());
  db.failIngredient = true;
  await assert.rejects(repo.createRecipe(recipe("failed")), /write failure/);
  await assert.rejects(repo.updateRecipe({ ...recipe(), name: "Should roll back" }), /write failure/);
  db.failIngredient = false;
  assert.deepEqual((await repo.read()).recipes, [recipe()]);
  await repo.createRecipe(recipe("recovered"));
  assert.equal((await repo.read()).recipes.length, 2);
});

test("invalid values are rejected without damaging data", async (t) => {
  const { repo } = fixture(t);
  await repo.createRecipe(recipe());
  const good = recipe("x");
  await assert.rejects(repo.createRecipe({ ...good, name: "   " }), /name/);
  await assert.rejects(repo.createRecipe({ ...good, ingredients: [] }), /at least one ingredient/);
  await assert.rejects(repo.createRecipe({ ...good, ingredients: [{ ...good.ingredients[0], name: " " }] }), /needs a name/);
  for (const bad of [-1, NaN, Infinity]) {
    await assert.rejects(repo.createRecipe({ ...good, ingredients: [{ ...good.ingredients[0], calories: bad }] }), /Calories/);
  }
  await assert.rejects(repo.createRecipe({ ...good, ingredients: [good.ingredients[0], good.ingredients[0]] }), /unique/);
  await assert.rejects(repo.updateRecipe(recipe("missing")), /no longer exists/);
  assert.deepEqual((await repo.read()).recipes, [recipe()]);
});

test("concurrent operations serialize and the queue continues after a rejection", async (t) => {
  const { repo } = fixture(t);
  await Promise.all(Array.from({ length: 10 }, (_, i) => repo.createRecipe(recipe(`recipe-${i}`))));
  const results = await Promise.allSettled([repo.createRecipe(recipe("recipe-0")), repo.read()]);
  assert.equal(results[0].status, "rejected");
  assert.equal(results[1].value.recipes.length, 10);
});

test("recipes survive a database close and reopen", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "caltrack-db-test-"));
  const filename = path.join(directory, "test.db");
  let db = driver(filename);
  try {
    let repo = createSQLiteRepository(createDatabaseService(async () => db));
    await repo.createRecipe(recipe());
    await db.closeAsync();
    db = driver(filename);
    repo = createSQLiteRepository(createDatabaseService(async () => db));
    assert.deepEqual((await repo.read()).recipes, [recipe()]);
  } finally {
    await db.closeAsync();
    for (const suffix of ["", "-wal", "-shm"]) {
      if (existsSync(filename + suffix)) unlinkSync(filename + suffix);
    }
    rmdirSync(directory);
  }
});

test("startup failure can be retried", async (t) => {
  const db = driver();
  t.after(() => db.closeAsync());
  let attempts = 0;
  const repo = createSQLiteRepository(createDatabaseService(async () => {
    if (++attempts === 1) throw new Error("Simulated open failure");
    return db;
  }));
  await assert.rejects(repo.read(), /open failure/);
  assert.deepEqual((await repo.read()).recipes, []);
});

test("future schema versions are rejected without rewriting them", async () => {
  const db = driver();
  await db.execAsync("PRAGMA user_version = 3");
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  await assert.rejects(repo.read(), /newer version/);
});

test("upgrading from the first app version keeps recipes and drops removed features", async (t) => {
  const db = driver();
  t.after(() => db.closeAsync());
  // The first version's schema (meals, macros, meal logs, calorie goal).
  db.raw.exec(`
    CREATE TABLE meals (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, servings REAL NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE ingredients (meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE, id TEXT NOT NULL, position INTEGER NOT NULL, name TEXT NOT NULL, amount TEXT NOT NULL,
      calories REAL NOT NULL, protein REAL NOT NULL, carbs REAL NOT NULL, fat REAL NOT NULL, fiber REAL NOT NULL, sugar REAL NOT NULL, sodium REAL NOT NULL, PRIMARY KEY (meal_id, id));
    CREATE TABLE meal_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE, log_date TEXT NOT NULL, category TEXT NOT NULL, UNIQUE (log_date, meal_id));
    CREATE TABLE user_goals (id INTEGER PRIMARY KEY CHECK (id = 1), calorie_target REAL NOT NULL, goal TEXT NOT NULL);
    INSERT INTO user_goals VALUES (1, 2300, 'maintain');
    INSERT INTO meals VALUES ('m1', 'Old chicken salad', 'lunch', 2, '2026-10-05T08:00:00.000Z');
    INSERT INTO ingredients VALUES ('m1', 'a', 0, 'Chicken', '100 g', 165, 31, 0, 4, 0, 0, 70);
    INSERT INTO ingredients VALUES ('m1', 'b', 1, 'Olive oil', '1 tbsp', 120, 0, 0, 14, 0, 0, 0);
    INSERT INTO meal_logs (meal_id, log_date, category) VALUES ('m1', '2026-10-05', 'lunch');
    PRAGMA user_version = 1;
  `);
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  const { recipes } = await repo.read();
  assert.deepEqual(recipes, [{
    id: "m1", name: "Old chicken salad", createdAt: "2026-10-05T08:00:00.000Z",
    ingredients: [
      { id: "a", name: "Chicken", amount: "100 g", calories: 165 },
      { id: "b", name: "Olive oil", amount: "1 tbsp", calories: 120 },
    ],
  }]);
  assert.equal(totalCalories(recipes[0]), 285);
  const tables = db.raw.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
  assert.deepEqual(tables, ["ingredients", "recipes"]);
  assert.equal(db.raw.prepare("PRAGMA user_version").get().user_version, 2);
  await repo.createRecipe(recipe("new-one"));
  assert.equal((await repo.read()).recipes.length, 2);
});
