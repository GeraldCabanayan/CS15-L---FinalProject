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
  assert.deepEqual(initial.goal, { calorieTarget: 2300, goal: "maintain", proteinTarget: null, carbsTarget: null, fatTarget: null });
  assert.equal((await service.execute((conn) => conn.getFirstAsync("PRAGMA user_version"))).user_version, 3);
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
  await repo.logMeal("meal-1", "breakfast", today);
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
    await repo.updateGoal({ calorieTarget: 1900, goal: "lose", proteinTarget: null, carbsTarget: null, fatTarget: null });
    await db.closeAsync();
    db = driver(filename);
    repo = createSQLiteRepository(createDatabaseService(async () => db));
    const saved = await repo.read(today);
    assert.deepEqual(saved.meals, [meal()]);
    assert.equal(saved.loggedMeals.length, 1);
    assert.deepEqual(saved.goal, { calorieTarget: 1900, goal: "lose", proteinTarget: null, carbsTarget: null, fatTarget: null });
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
  await db.execAsync("PRAGMA user_version = 4");
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  await assert.rejects(repo.read(today), /newer version/);
});

test("local date keys follow the device calendar instead of UTC", () => {
  const date = new Date(2026, 9, 10, 0, 15);
  assert.equal(localDate(date), "2026-10-10");
});

test("startup reuses an existing ingredients table in an unversioned database", async (t) => {
  const db = driver();
  t.after(() => db.closeAsync());
  const source = readFileSync(path.resolve(__dirname, '../src/caltrack/database.ts'), 'utf8');
  await db.execAsync(source.match(/const schemaV1 = `([\s\S]*?)`;/)[1]);
  await db.execAsync('DROP TABLE meal_logs; DROP TABLE ingredients; DROP TABLE meals; DROP TABLE user_goals; PRAGMA user_version = 0;');
  const ingredientSchema = source.match(/CREATE TABLE IF NOT EXISTS ingredients \([\s\S]*?\n\);/)[0];
  await db.execAsync(ingredientSchema);
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  assert.equal((await repo.read(today)).meals.length, 0);
  await repo.createMeal(meal());
  assert.deepEqual((await repo.read(today)).meals, [meal()]);
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 3);
});

test("startup preserves unversioned v1 recipes, logs and a saved goal", async (t) => {
  const db = driver();
  t.after(() => db.closeAsync());
  const source = readFileSync(path.resolve(__dirname, '../src/caltrack/database.ts'), 'utf8');
  await db.execAsync(source.match(/const schemaV1 = `([\s\S]*?)`;/)[1]);
  await db.runAsync("INSERT INTO meals VALUES (?, ?, ?, ?, ?)", 'legacy', 'Retained recipe', 'lunch', 2, today);
  await db.runAsync("INSERT INTO ingredients VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 'legacy', 'rice', 0, 'Rice', '1 cup', 200, 4, 44, 1, 2, 0, 5);
  await db.runAsync("INSERT INTO meal_logs (id, meal_id, log_date, category) VALUES (?, ?, ?, ?)", 42, 'legacy', today, 'lunch');
  await db.execAsync('UPDATE user_goals SET calorie_target = 1700; PRAGMA user_version = 0;');
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  const saved = await repo.read(today);
  assert.equal(saved.goal.calorieTarget, 1700);
  assert.equal(saved.meals[0].ingredients[0].calories, 200);
  assert.equal(saved.loggedMeals[0].id, 42);
  assert.equal(saved.loggedMeals[0].quantity, 1);
});

test("repairing an unversioned v2 database preserves portions and macro targets", async (t) => {
  const { repo, db } = fixture(t);
  await repo.createMeal(meal());
  await repo.logMeal('meal-1', 'lunch', today, 2.5);
  await repo.updateGoal({ calorieTarget: 2000, goal: 'maintain', proteinTarget: 120, carbsTarget: 200, fatTarget: 60 });
  await db.execAsync('PRAGMA user_version = 0;');
  const repaired = createSQLiteRepository(createDatabaseService(async () => db));
  const saved = await repaired.read(today);
  assert.equal(saved.loggedMeals[0].quantity, 2.5);
  assert.equal(saved.goal.proteinTarget, 120);
  assert.equal(saved.goal.carbsTarget, 200);
  assert.equal(saved.goal.fatTarget, 60);
  assert.deepEqual(saved.meals, [meal()]);
});

test("unknown legacy table layouts are left untouched instead of deleted", async (t) => {
  const db = driver();
  const close = db.closeAsync;
  t.after(close);
  db.closeAsync = async () => {};
  await db.execAsync("CREATE TABLE ingredients (id TEXT PRIMARY KEY, name TEXT); INSERT INTO ingredients VALUES ('saved', 'Rice');");
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  await assert.rejects(repo.read(today), /existing ingredients table.*data has been kept/);
  assert.deepEqual(await db.getAllAsync('SELECT * FROM ingredients'), [{ id: 'saved', name: 'Rice' }]);
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 0);
});

for (const version of [0, 2]) {
  test(`historical recipe-only schema at version ${version} migrates with its records and archive intact`, async (t) => {
    const db = driver();
    t.after(() => db.closeAsync());
    await db.execAsync(readFileSync(path.join(__dirname, 'fixtures/recipe-only-v2.sql'), 'utf8'));
    await db.runAsync('INSERT INTO recipes VALUES (?, ?, ?)', 'saved-recipe', "Chef's recipe", '2026-10-01T08:00:00.000Z');
    await db.runAsync('INSERT INTO ingredients VALUES (?, ?, ?, ?, ?, ?)', 'saved-recipe', 'rice', 0, 'Rice', 200, '1 cup');
    await db.runAsync('INSERT INTO ingredients VALUES (?, ?, ?, ?, ?, ?)', 'saved-recipe', 'beans', 1, 'Beans', 100, '100 g');
    await db.execAsync(`PRAGMA user_version = ${version};`);
    const repo = createSQLiteRepository(createDatabaseService(async () => db));
    let saved = await repo.read(today);
    const imported = saved.meals[0];
    assert.equal(imported.id, 'saved-recipe');
    assert.equal(imported.name, "Chef's recipe");
    assert.equal(imported.createdAt, '2026-10-01T08:00:00.000Z');
    assert.equal(imported.servings, 1);
    assert.equal(imported.nutritionComplete, false);
    assert.deepEqual(imported.ingredients.map(item => [item.id, item.name, item.calories, item.amount]), [
      ['rice', 'Rice', 200, '1 cup'], ['beans', 'Beans', 100, '100 g'],
    ]);
    await repo.logMeal(imported.id, 'lunch', today, 0.5);
    saved = await repo.read(today);
    assert.equal(load('types.ts').dailyNutrition(saved.meals, saved.loggedMeals).calories, 150);
    const reopened = createSQLiteRepository(createDatabaseService(async () => db));
    assert.deepEqual((await reopened.read(today)).meals, saved.meals);
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 3);
    assert.deepEqual(await db.getAllAsync('PRAGMA foreign_key_check'), []);
    await repo.deleteMeal(imported.id);
    assert.equal((await db.getAllAsync('SELECT * FROM recipes')).length, 1);
    assert.equal((await db.getAllAsync('SELECT * FROM legacy_recipe_ingredients')).length, 2);
  });
}

test('current meal-based version 2 upgrades without changing logs, goals or recipes', async (t) => {
  const { db, repo } = fixture(t);
  await repo.createMeal(meal());
  await repo.logMeal('meal-1', 'dinner', today, 2.5);
  await repo.updateGoal({ calorieTarget: 2000, goal: 'maintain', proteinTarget: 100 });
  await db.execAsync('ALTER TABLE meals DROP COLUMN nutrition_complete; PRAGMA user_version = 2;');
  const upgraded = createSQLiteRepository(createDatabaseService(async () => db));
  const saved = await upgraded.read(today);
  assert.deepEqual(saved.meals, [meal()]);
  assert.equal(saved.loggedMeals[0].quantity, 2.5);
  assert.equal(saved.goal.proteinTarget, 100);
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 3);
});

test('failed recipe-only migration rolls back source tables and retries safely', async (t) => {
  const db = driver();
  const close = db.closeAsync;
  t.after(close);
  db.closeAsync = async () => {};
  await db.execAsync(readFileSync(path.join(__dirname, 'fixtures/recipe-only-v2.sql'), 'utf8'));
  await db.execAsync("INSERT INTO recipes VALUES ('saved', 'Saved', '2026-10-01'); INSERT INTO ingredients VALUES ('saved', 'rice', 0, 'Rice', 200, '1 cup');");
  const exec = db.execAsync;
  db.execAsync = async (sql) => {
    await exec(sql);
    if (sql.includes('FROM legacy_recipe_ingredients')) throw new Error('Simulated legacy migration failure');
  };
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  await assert.rejects(repo.read(today), /legacy migration failure/);
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 2);
  assert.equal((await db.getAllAsync('SELECT * FROM ingredients'))[0].ingredient_name, 'Rice');
  assert.equal(await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'legacy_recipe_ingredients'"), null);
  db.execAsync = exec;
  assert.equal((await repo.read(today)).meals[0].name, 'Saved');
});

test('imported calorie-only status persists until nutritional values are explicitly completed', async (t) => {
  const { repo } = fixture(t);
  await repo.createMeal({ ...meal(), nutritionComplete: false });
  assert.equal((await repo.read(today)).meals[0].nutritionComplete, false);
  await repo.updateMeal({ ...meal(), nutritionComplete: true });
  assert.notEqual((await repo.read(today)).meals[0].nutritionComplete, false);
});

test("version 1 migration preserves recipes, ingredients, goals and log IDs", async (t) => {
  const db = driver();
  t.after(() => db.closeAsync());
  const source = readFileSync(path.resolve(__dirname, '../src/caltrack/database.ts'), 'utf8');
  const schema = source.match(/const schemaV1 = `([\s\S]*?)`;/)[1];
  await db.execAsync(schema);
  await db.runAsync("INSERT INTO meals VALUES (?, ?, ?, ?, ?)", 'legacy', 'Old recipe', 'lunch', 2, '2026-10-01');
  await db.runAsync("INSERT INTO ingredients VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 'legacy', 'rice', 0, 'Rice', '1 cup', 200, 4, 44, 1, 2, 0, 5);
  await db.runAsync("INSERT INTO meal_logs (id, meal_id, log_date, category) VALUES (?, ?, ?, ?)", 42, 'legacy', today, 'lunch');
  await db.runAsync("UPDATE user_goals SET calorie_target = 1800 WHERE id = 1");
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  const saved = await repo.read(today);
  assert.equal(saved.meals[0].ingredients[0].calories, 200);
  assert.equal(saved.goal.calorieTarget, 1800);
  assert.equal(saved.loggedMeals[0].id, 42);
  assert.equal(saved.loggedMeals[0].quantity, 1);
  assert.deepEqual(await db.getAllAsync('PRAGMA foreign_key_check'), []);
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 3);
});

test("quantities, categories and recorded dates stay isolated and update totals", async (t) => {
  const { repo } = fixture(t);
  const { dailyNutrition, perServing, calorieProgress } = load('types.ts');
  await repo.createMeal(meal());
  await repo.logMeal('meal-1', 'breakfast', today, 2);
  await repo.logMeal('meal-1', 'dinner', today, 0.5);
  await repo.logMeal('meal-1', 'breakfast', today, 10);
  await repo.logMeal('meal-1', 'lunch', '2026-10-11', 1);
  let saved = await repo.read(today);
  assert.equal(saved.loggedMeals.length, 2);
  assert.equal(dailyNutrition(saved.meals, saved.loggedMeals).calories, 375);
  assert.deepEqual(saved.recordedDates, [today, '2026-10-11']);
  await assert.rejects(repo.updateLog(saved.loggedMeals[0].id, 'dinner', 2), /already in that category/);
  await repo.updateLog(saved.loggedMeals[0].id, 'lunch', 3);
  saved = await repo.read(today);
  assert.equal(dailyNutrition(saved.meals, saved.loggedMeals).calories, 525);
  assert.equal((await repo.read('2026-10-11')).loggedMeals[0].quantity, 1);
  assert.equal(perServing({ ...meal(), servings: 0.5 }).calories, 600);
  assert.deepEqual(calorieProgress(750, 2000), { remaining: 1250, over: 0, percent: 37.5 });
  assert.equal(calorieProgress(2500, 2000).percent, 125);
  for (const log of saved.loggedMeals) await repo.deleteLog(log.id);
  assert.deepEqual((await repo.read(today)).recordedDates, ['2026-10-11']);
  assert.equal((await repo.read(today)).meals.length, 1);
});

test("failed migration rolls back and can retry without losing legacy data", async (t) => {
  const db = driver();
  const close = db.closeAsync;
  t.after(close);
  // Keep the test connection open to inspect rollback after service cleanup.
  db.closeAsync = async () => {};
  const source = readFileSync(path.resolve(__dirname, '../src/caltrack/database.ts'), 'utf8');
  await db.execAsync(source.match(/const schemaV1 = `([\s\S]*?)`;/)[1]);
  await db.runAsync("INSERT INTO meals VALUES (?, ?, ?, ?, ?)", 'legacy', 'Retained', 'lunch', 1, today);
  await db.runAsync("INSERT INTO meal_logs (meal_id, log_date, category) VALUES (?, ?, ?)", 'legacy', today, 'lunch');
  const exec = db.execAsync;
  db.execAsync = async (sql) => {
    await exec(sql);
    if (sql.includes('CREATE TABLE meal_logs_v2')) throw new Error('Simulated migration failure');
  };
  const repo = createSQLiteRepository(createDatabaseService(async () => db));
  await assert.rejects(repo.read(today), /migration failure/);
  assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 1);
  assert.equal((await db.getAllAsync('SELECT * FROM meal_logs')).length, 1);
  db.execAsync = exec;
  const saved = await repo.read(today);
  assert.equal(saved.meals[0].name, 'Retained');
  assert.equal(saved.loggedMeals[0].quantity, 1);
});

test("invalid dates, quantities and macro targets are rejected", async (t) => {
  const { repo } = fixture(t);
  await repo.createMeal(meal());
  for (const date of ['2026-02-30', '2025-02-29', '2026-1-01', '2026-13-01', '2026-10-10T00:00:00Z', '']) {
    await assert.rejects(repo.read(date), /date/);
    await assert.rejects(repo.logMeal('meal-1', 'lunch', date), /date/);
  }
  for (const value of [0, -1, NaN, Infinity]) {
    await assert.rejects(repo.logMeal('meal-1', 'lunch', today, value));
    await assert.rejects(repo.updateLog(1, 'lunch', value));
    await assert.rejects(repo.updateGoal({ calorieTarget: 2000, goal: 'maintain', proteinTarget: value }));
  }
  await repo.updateGoal({ calorieTarget: 2000, goal: 'maintain', proteinTarget: 100, carbsTarget: 200, fatTarget: 60 });
  assert.equal((await repo.read(today)).goal.proteinTarget, 100);
});

test("calendar handles leap years and year boundaries without UTC parsing", () => {
  const { calendarDateKey, calendarMonth } = load('calendar.ts');
  assert.equal(calendarDateKey(2026, 10), '2026-10-01');
  assert.equal(calendarDateKey(2024, 2, 29), '2024-02-29');
  assert.throws(() => calendarDateKey(2025, 2, 29), /date/);
  assert.throws(() => calendarDateKey(2026, 4, 31), /date/);
  assert.throws(() => calendarDateKey(26, 10, 17), /four-digit year/);
  assert.equal(calendarMonth('2024-02-01').days.filter(Boolean).length, 29);
  assert.equal(calendarMonth('2025-02-01').days.filter(Boolean).length, 28);
  assert.equal(calendarMonth('2026-12-31', 1).key, '2027-01-01');
  assert.equal(calendarMonth('2026-01-01', -1).key, '2025-12-01');
});

test("search and recommendations use saved values, rank matches and refresh after edits", async (t) => {
  const { repo } = fixture(t);
  const { nameMatches, ingredientMatches, recommendRecipes } = load('suggestions.ts');
  assert.deepEqual(nameMatches([{ name: 'Rice bowl' }, { name: 'Fried rice' }, { name: 'Rice' }], ' rice ').map(x => x.name), ['Rice', 'Rice bowl', 'Fried rice']);
  assert.deepEqual(nameMatches([meal()], '  '), []);
  await repo.createMeal(meal());
  let saved = await repo.read(today);
  assert.equal(ingredientMatches(saved.meals, 'rice')[0].calories, 200);
  assert.equal(recommendRecipes(saved.meals, 150)[0].id, 'meal-1');
  assert.deepEqual(recommendRecipes(saved.meals, 149), []);
  assert.deepEqual(recommendRecipes(saved.meals, 0), []);
  await repo.updateMeal({ ...meal(), ingredients: [{ ...meal().ingredients[0], calories: 600 }] });
  saved = await repo.read(today);
  assert.equal(ingredientMatches(saved.meals, 'rice')[0].calories, 600);
  assert.deepEqual(recommendRecipes(saved.meals, 150), []);
  assert.deepEqual(ingredientMatches(saved.meals, 'missing'), []);
});
