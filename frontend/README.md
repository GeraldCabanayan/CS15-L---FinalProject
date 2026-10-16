# CalTrack local database

> For the current calendar, diary, suggestions, schema version 3, and manual test
> instructions, see [CALTRACK_CHANGES.md](CALTRACK_CHANGES.md). The notes below
> describe the original version 1 implementation and its earlier test suite.

CalTrack is an Expo SDK 57 app using Expo Router (`src/app`). It stores recipes,
ingredient nutrition, daily meal logs, and calorie goals in **`caltrack.db`** using
the already installed `expo-sqlite` 57.0.3. No backend, API, or AsyncStorage is
required. Home, Recipes, Create/Edit, and Goals share the database through the
existing React context. Profile remains the existing static placeholder.

## Run

From the repository root:

```sh
cd frontend
npm ci
npm start
```

Open the QR code in an Expo Go version compatible with SDK 57, or use a compatible
development build. Press `a` for a configured Android emulator. An iOS simulator
requires macOS; a physical iPhone can open the QR code from Windows.

The database initializes automatically before rendering screens. A new database
starts with no recipes/logs and a 2,300 kcal maintenance goal. The old dummy recipes
are removed rather than inserted into a user's collection. No additional native
configuration or database setup is necessary. Initialization failures display a
Retry screen; failed writes show an error and leave the UI unchanged.

`npm run web` also uses local SQLite through Expo's browser worker. `metro.config.js`
adds WASM support and the COOP/COEP headers required for `SharedArrayBuffer`.
Browser support is experimental in Expo. Use a current browser on localhost or
HTTPS. Browser storage is separate from device storage. If hosting a web export,
configure these response headers on the hosting service:

```text
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

The Expo development bundler is only needed to serve application code during
development; database operations run locally on the device/browser.

## Schema (version 1)

| Table | Stored data and rules |
| --- | --- |
| `meals` | Text primary key, name, default category, positive servings, original creation timestamp. |
| `ingredients` | Composite key `(meal_id, id)`, ingredient order, name, amount, calories, protein, carbs, fat, fiber, sugar, sodium. Nutrition is non-negative. Foreign key to `meals` with cascading deletion. |
| `meal_logs` | Integer primary key, meal foreign key, local calendar date (`YYYY-MM-DD`), category. Unique `(log_date, meal_id)` preserves the existing once-per-recipe daily logging behavior. Cascades on recipe deletion. |
| `user_goals` | Singleton row (`id = 1`), positive daily calorie target, goal (`lose`, `maintain`, `gain`). |

Categories are `uncategorized`, `breakfast`, `lunch`, and `dinner`. Nutrition amounts
describe the entire recipe; Home and Recipes calculate values per serving. Logs
reference the saved recipe, so editing its nutrition updates totals wherever it is
logged. Removing a recipe removes its logs on all dates. Removing a log keeps the
recipe. Past logs remain stored, although the current UI only displays today.

## Files and responsibilities

| File | Responsibility |
| --- | --- |
| `src/caltrack/database.ts` | Injectable async SQLite driver, lazy initialization, foreign keys, WAL, serialized queries/transactions, `PRAGMA user_version` migration, retry after failed initialization. |
| `src/caltrack/repository.ts` | `CalTrackRepository` interface, validation, parameterized CRUD, mapping database rows to app models, local date keys. |
| `src/caltrack/sqlite.ts` | Production connection to `caltrack.db`; constructs the SQLite repository. |
| `src/caltrack/store.tsx` | Loads data before screens render; persists mutations before refreshing context; loading/error/retry states, saving state, foreground and midnight refresh. |
| `src/caltrack/types.ts` | Existing domain types; logs now include persistent ID and date. |
| `src/app/create.tsx` | Create/edit recipe form, existing ingredient/nutrition UI, ingredient removal, awaited saves and validation errors. |
| `src/app/recipes.tsx` | Reads saved recipes, empty collection state, edit/delete controls with inline delete confirmation, daily logging. |
| `src/app/index.tsx` | Reads today's logs and totals; changes log category or removes a log. |
| `src/app/goals.tsx` | Reads and updates the persistent goal, with save feedback. |
| `tests/database.test.cjs` | Tests actual database/repository sources against Node's real SQLite engine through an async adapter. |
| `metro.config.js` | SQLite WASM/browser headers. |
| `app.json` | Corrected existing asset paths to `src/assets`. |
| `package.json` | Adds `typecheck` and `test:db` scripts; SQLite was already a dependency. |

The root layout and navigation are unchanged. All application SQL lives behind the
repository interface. A future API adapter can implement `CalTrackRepository` and
be passed to `CalTrackProvider`; screens do not need to execute queries or know
which storage implementation is used. Future schema changes should add sequential
migrations in `database.ts`. Databases from newer app versions are rejected instead
of being overwritten.

## CRUD behavior

- **Create:** Create tab saves a recipe and all ingredients in one transaction.
  Recipes → Add to today inserts a date-specific log after category selection.
- **Read:** Startup and post-write refresh read recipes, ordered ingredients,
  today's logs, and the goal. Home derives calorie/macro totals from these records.
- **Update:** Recipes → Edit opens the existing Create form. Saving updates the
  recipe and replaces its ingredients atomically while preserving its ID and
  creation time. Home → Change updates a log category. Goals → Save changes
  updates the singleton goal.
- **Delete:** Recipes → Delete → Confirm delete removes the recipe, ingredients,
  and its logs through foreign-key cascades. Home → Remove deletes only that log.

User input is always passed through bound parameters. `execAsync` only executes
fixed schema/PRAGMA statements. Operations are asynchronous, and the database
service queues all operations so unrelated queries cannot join an active
transaction. A failed recipe/ingredient write rolls back the entire transaction.

## Verification

Use Node **22.13+** (Node 24 recommended) for the built-in SQLite test adapter:

```sh
npm run typecheck
npm run test:db
```

The 11 automated tests cover initialization, all recipe CRUD operations, bound
SQL input, log CRUD/date filtering/deduplication, goal updates, constraints,
cascading deletion, rollback, concurrent operations, startup retry, future schema
rejection, local date keys, and persistence after closing/reopening a database.
They exercise real SQLite SQL and the production service/repository code; they
do not exercise Expo's native bridge or screen interactions.

To verify on a device:

1. Create a recipe with two named ingredients and nutrition values. Confirm it
   appears in Recipes with the correct per-serving totals.
2. Close and reopen the app. Confirm the recipe still exists.
3. Edit the recipe, change servings/nutrition, remove an ingredient, and save.
   Confirm updated totals and persistence after reopening.
4. Add it to today as Breakfast. Confirm Home totals and the category. Confirm
   Recipes prevents a duplicate log on the same day.
5. On Home, use Change to move it to Dinner, then Remove. Confirm totals decrease
   while the saved recipe remains. Add it again to verify log creation after removal.
6. Save a different calorie target/goal, restart, and confirm Goals and Home use it.
   Try a zero target or negative ingredient nutrition; the save should fail.
7. Delete the recipe and confirm deletion. Confirm it disappears from Recipes and
   Home, including after restarting.
8. With a logged recipe, advance the test device's date or wait until midnight.
   Today's logs should clear while recipes/goals remain. Return to the previous
   date to confirm its logs remain available. Returning from the background also
   refreshes today's data.

Device data persists across ordinary app restarts. Uninstalling the app/clearing
its storage removes its database. Browser data belongs to its origin and is removed
when that site's storage is cleared. Each installation has its own collection.

Reference: [Expo SQLite documentation](https://docs.expo.dev/versions/latest/sdk/sqlite/).
