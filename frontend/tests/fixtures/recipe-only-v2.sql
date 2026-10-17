-- Historical layout from commit 0c02260, frontend/src/caltrack/database.ts.
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
PRAGMA user_version = 2;
