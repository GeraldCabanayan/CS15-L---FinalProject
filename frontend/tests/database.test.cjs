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
const { createSQLiteRepository, localDate } = load("repository.ts");

// Real SQLite engine behind the same async driver contract used by Expo.
function driver(filename = ":memory:") {
  const raw = new DatabaseSync(filename);
  let closed = false;
  const db = {
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
function meal(id = "meal-1") {
  return {
    id, name: "Chef's bowl'); DROP TABLE meals; --", category: "lunch", servings: 2,
    createdAt: "2026-10-10T10:00:00.000Z",
    ingredients: [
      { id: "rice", name: "Rice", amount: "1 cup", calories: 200, protein: 4, carbs: 44, fat: 1, fiber: 2, sugar: 0, sodium: 5 },
      { id: "beans", name: "Beans", amount: "100 g", calories: 100, protein: 8, carbs: 20, fat: 0, fiber: 5, sugar: 1, sodium: 10 },
    ],
  };
}
const today = "2026-10-10";

test("initialization seeds only the default goal and is repeatable", async (t) => {
  const { repo, service, db } = fixture(t);
  const initial = await repo.read(today);
  assert.deepEqual(initial.meals, []);
  assert.deepEqual(initial.loggedMeals, []);
  assert.deepEqual(initial.goal, { calorieTarget: 2300, goal: "maintain" });
  assert.equal((await service.execute((conn) => conn.getFirstAsync("PRAGMA user_version"))).user_version, 1);
  await repo.updateGoal({ calorieTarget: 1800, goal: "lose" });
  const reopened = createSQLiteRepository(createDatabaseService(async () => db));
  assert.equal((await reopened.read(today)).goal.calorieTarget, 1800);
});

test("recipe create/read/update/delete preserves ingredient order and binds SQL input", async (t) => {
  const { repo } = fixture(t);
  const original = meal();
  await repo.createMeal(original);
  assert.deepEqual((await repo.read(today)).meals, [original]);
  const edited = { ...original, name: "Updated", servings: 3, category: "dinner", ingredients: [original.ingredients[1]] };
  await repo.updateMeal(edited);
  assert.deepEqual((await repo.read(today)).meals, [edited]);
  await repo.deleteMeal(edited.id);
  assert.equal((await repo.read(today)).meals.length, 0);
});

test("logs are daily, deduplicated, editable and removable", async (t) => {
  const { repo } = fixture(t);
  await repo.createMeal(meal());
  await repo.logMeal("meal-1", "breakfast", today);
  await repo.logMeal("meal-1", "dinner", today);
  await repo.logMeal("meal-1", "lunch", "2026-10-11");
  const logs = (await repo.read(today)).loggedMeals;
  assert.equal(logs.length, 1);
  assert.equal(logs[0].category, "breakfast");
  assert.equal(logs[0].date, today);
  await repo.updateLog(logs[0].id, "dinner");
  assert.equal((await repo.read(today)).loggedMeals[0].category, "dinner");
  await repo.deleteLog(logs[0].id);
  assert.equal((await repo.read(today)).loggedMeals.length, 0);
  assert.equal((await repo.read("2026-10-11")).loggedMeals.length, 1);
});

test("deleting a recipe cascades ingredients and logs on every date", async (t) => {
  const { repo, service } = fixture(t);
  await repo.createMeal(meal());
  await repo.logMeal("meal-1", "lunch", today);
  await repo.logMeal("meal-1", "lunch", "2026-10-11");
  await repo.deleteMeal("meal-1");
  assert.equal((await service.execute((db) => db.getAllAsync("SELECT * FROM ingredients"))).length, 0);
  assert.equal((await service.execute((db) => db.getAllAsync("SELECT * FROM meal_logs"))).length, 0);
});

test("failed ingredient writes roll back recipe create and update", async (t) => {
  const { repo, db } = fixture(t);
  await repo.createMeal(meal());
  db.failIngredient = true;
  await assert.rejects(repo.createMeal(meal("failed")), /write failure/);
  await assert.rejects(repo.updateMeal({ ...meal(), name: "Should roll back" }), /write failure/);
  db.failIngredient = false;
  assert.deepEqual((await repo.read(today)).meals, [meal()]);
  await repo.createMeal(meal("recovered"));
  assert.equal((await repo.read(today)).meals.length, 2);
});

test("invalid values and missing foreign keys are rejected without damaging data", async (t) => {
  const { repo, service } = fixture(t);
  for (const invalid of [0, -1, NaN, Infinity]) {
    await assert.rejects(repo.updateGoal({ calorieTarget: invalid, goal: "maintain" }));
    await assert.rejects(repo.createMeal({ ...meal(), servings: invalid }));
  }
  await assert.rejects(repo.createMeal({ ...meal(), ingredients: [] }));
  await assert.rejects(repo.createMeal({ ...meal(), ingredients: [{ ...meal().ingredients[0], calories: -1 }] }));
  await assert.rejects(repo.logMeal("missing", "lunch", today));
  await assert.rejects(repo.updateMeal(meal()), /no longer exists/);
  await assert.rejects(repo.updateLog(999, "lunch"), /no longer exists/);
  await assert.rejects(service.execute((db) => db.runAsync("UPDATE user_goals SET calorie_target = ? WHERE id = 1", -1)));
  assert.equal((await repo.read(today)).goal.calorieTarget, 2300);
});

test("concurrent operations serialize and queue continues after rejection", async (t) => {
  const { repo } = fixture(t);
  await Promise.all(Array.from({ length: 10 }, (_, i) => repo.createMeal(meal(`meal-${i}`))));
  const results = await Promise.allSettled([
    repo.createMeal(meal("meal-0")), repo.updateGoal({ calorieTarget: 2100, goal: "gain" }), repo.read(today),
  ]);
  assert.equal(results[0].status, "rejected");
  assert.equal(results[1].status, "fulfilled");
  assert.equal(results[2].value.meals.length, 10);
  assert.equal(results[2].value.goal.calorieTarget, 2100);
});

test("recipes, logs and goals survive a database close and reopen", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "caltrack-db-test-"));
  const filename = path.join(directory, "test.db");
  let db = driver(filename);
  try {
    let repo = createSQLiteRepository(createDatabaseService(async () => db));
    await repo.createMeal(meal());
    await repo.logMeal("meal-1", "lunch", today);
    await repo.updateGoal({ calorieTarget: 1900, goal: "lose" });
    await db.closeAsync();
    db = driver(filename);
    repo = createSQLiteRepository(createDatabaseService(async () => db));
    const saved = await repo.read(today);
    assert.deepEqual(saved.meals, [meal()]);
    assert.equal(saved.loggedMeals.length, 1);
    assert.deepEqual(saved.goal, { calorieTarget: 1900, goal: "lose" });
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
  await assert.rejects(repo.read(today), /open failure/);
  assert.equal((await repo.read(today)).goal.calorieTarget, 2300);
});

test("future schema versions are rejected without rewriting them", async () => {
  const db = driver();
  await db.execAsync("PRAGMA user_version = 2");
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  await assert.rejects(repo.read(today), /newer version/);
});

test("local date keys follow the device calendar instead of UTC", () => {
  const date = new Date(2026, 9, 10, 0, 15);
  assert.equal(localDate(date), "2026-10-10");
});
