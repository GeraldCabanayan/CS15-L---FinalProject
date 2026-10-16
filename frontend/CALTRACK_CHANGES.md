# Integrated calendar and nutrition tracking

## Audit

The runtime data layer is `src/caltrack`, not `backend/src`. The backend folder
has no executable source. Expo Router screens use one React context, which calls
the SQLite repository through a serialized async database service. Existing
recipe CRUD, ingredient order, foreign-key cascades, calorie goals, transactional
rollback, loading/retry, and foreground refresh were already implemented.

Calendar, date selection, autocomplete, recommendations, and macro goals were
missing. Diary entries assumed one serving and were restricted to one recipe per
day. Fractional recipe yields incorrectly used a minimum divisor of one.

## Implementation

- `src/caltrack/database.ts`: transactional migrations through schema version 3.
- `src/caltrack/repository.ts`: date validation, quantity CRUD, date indicators,
  optional macro goals, and category collision feedback.
- `src/caltrack/store.tsx`: shared selected date; serialized date changes and
  writes followed by a refresh. Writes capture the displayed date. Midnight and
  foreground refresh follow today only when the selection was today.
- `src/caltrack/types.ts`: shared portion scaling, daily totals, and calorie
  progress; fractional recipe yield fix.
- `src/caltrack/calendar.ts`: local month grids and month navigation.
- `src/caltrack/suggestions.ts`: ranked exact/prefix/substring name matching,
  ingredient variants, and recommendations within remaining calories.
- `src/components/DailyDiary.tsx`: reusable date heading, progress, category
  diary, log editor, recipe logging controls, and recommendation panel.
- `src/components/AppNav.tsx`: Calendar navigation and selected tab accessibility.
- `src/app/calendar.tsx`: monthly calendar and selected-date diary.
- `src/app/index.tsx`: shared diary replaces duplicated daily calculations.
- `src/app/recipes.tsx`: saved recipe search and selected-date logging.
- `src/app/create.tsx`: saved ingredient autocomplete; preserve recipe category.
- `src/app/goals.tsx`: optional macro targets and selected-date progress.
- `src/app/_layout.tsx`: safe-area spacing with the existing installed module.
- `tests/database.test.cjs`: existing tests adapted to v3 plus migration,
  quantities, date isolation, validation, calendar, and suggestion tests.
- `tests/fixtures/recipe-only-v2.sql`: historical recipe-only database layout from
  commit `0c02260`, used in migration regression tests.

No dependencies, HTTP server, cloud storage, or replacement database were added.

## Schema version 3 and behavior

Version 1 databases migrate automatically inside the initialization transaction.
Recipes, ordered ingredients, goals, and log IDs are retained. Existing logs
receive quantity 1. A new index supports date reads. User goals gain nullable
positive protein, carbohydrate, and fat targets (grams).

Version 3 also recognizes the historical recipe-only schema, which used the
same version 2 number as a different branch. Its `recipes` (`title`, `date_added`)
and `ingredients` (`recipe_id`, `ingredient_name`, `quantity`) are copied into
the current meal-based tables in one transaction. IDs, names, dates, ingredient
order, amounts, and calories are preserved. The original `recipes` table and
renamed `legacy_recipe_ingredients` remain as an archive. Both version 0 and
version 2 markers are supported for this historical layout.

Historical recipes represented a whole recipe without serving yield or macros.
They import as one serving with `nutrition_complete = 0`. Unrecorded nutrients
use internal zero defaults but are explicitly marked incomplete in the library,
diary, recommendations, and daily totals. Edit the recipe to confirm its yield,
enter missing nutrients, and check the completion box. Current meal-based
databases gain `nutrition_complete = 1` without changing existing data. No
calories or missing macro measurements are inferred.

Logs are unique by `(log_date, meal_id, category)`, allowing the same recipe at
breakfast and dinner. Repeated adds in the same category are idempotent. Edit
servings on that entry to record additional portions. Moving into an occupied
category displays an error without overwriting either entry. The existing
categories remain breakfast, lunch, dinner, and uncategorized.

Dates use device-local `YYYY-MM-DD` keys without UTC string parsing. The selected
date is shared during the session and starts at today after an app restart; all
meal records and goals persist. Future dates work as meal plans. Planned and
consumed records use the same existing log model, with no separate completion flag.

Nutrition entered for an ingredient describes its displayed amount. Recipe totals
are divided by recipe yield, then multiplied by logged servings. Autocomplete
copies the stored amount and nutrition; changing an amount string does not
automatically rescale nutrition. Distinct stored ingredient variants are retained.
Search and recommendations filter the current SQLite-backed snapshot in memory;
every successful recipe mutation refreshes that snapshot.

Existing behavior is preserved: editing a library recipe recalculates all its
logs, including past dates. Deleting a library recipe deletes its ingredients and
all logs, with confirmation. Removing a diary entry keeps the saved recipe.
Goals are global current targets, not historical targets per date. Profile is
outside these four feature areas.

## Run and verify

Use Node 24 (the tests use Node's SQLite engine). From `frontend`:

```sh
npm ci
npm run typecheck
npm run test:db
npm start
```

Open with a compatible Expo SDK 57 device/emulator environment. Browser SQLite
uses the existing WASM and COOP/COEP setup in `metro.config.js`; browser storage
is separate from device storage. See the
[Expo SDK 57 SQLite documentation](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/).

Manual acceptance flow:

1. Create a recipe yielding 2 servings, with ingredient totals of 300 kcal.
   Saving should only add it to the library, not the diary.
2. Search its name in Recipes. Search an existing ingredient name in Create and
   select it; confirm the amount and all nutrition fields populate.
3. Save a 2,000 kcal goal and optional macro targets. Select a past date in
   Calendar and log 2 servings as breakfast (300 kcal).
4. Log the same recipe as dinner with 0.5 servings (75 kcal). Confirm 375 kcal,
   1,625 remaining, and 19% rounded progress across Home, Calendar, and Goals.
5. Repeat an add to breakfast; it should remain a single entry. Edit breakfast
   servings and category. Try moving into dinner; verify useful collision feedback.
6. Request suggestions. Confirm each option is saved in the library, displays
   actual per-serving nutrition, and fits the selected day's remaining calories.
   Add one and verify diary totals and the calendar dot update.
7. Switch to today; confirm the past day's logs are absent. Switch back, remove
   its logs, and confirm the day indicator clears while the recipe remains.
8. Navigate across months/year boundaries; check leap-year February. Close and
   reopen the app, then revisit the past date to confirm database persistence.
9. Try invalid/zero servings, negative nutrition, and zero goals; saves should
   fail without corrupting data. Test narrow screens, keyboard interaction,
   screen-reader labels, and safe areas on a physical device.

Automated tests exercise production business logic and SQL using real SQLite.
They do not exercise React rendering, native Expo bridge behavior, or device UI.

Verified in this workspace: `npm run typecheck` passed and `npm run test:db`
passed all 26 tests. `npm run lint` could not complete because this repository
has no ESLint config or lint dependencies. Expo attempted to install tooling;
that setup was stopped and dependency files restored. No device UI or native
bridge testing was performed. A headless Chromium check with an isolated browser
profile exercised Expo's actual web SQLite worker: recipe-only databases with
both version 0 and version 2 migrated to version 3, preserved stored calories,
accepted half-serving meal logs, and passed foreign-key checks. The app's diary
also rendered successfully in that profile. The user's browser storage was not
read, reset, or deleted during these tests.

Startup also handles compatible existing tables when `user_version` is zero:
it creates missing tables, retains the saved goal, and migrates without losing
recipes, ingredients, logs, quantities, or existing macro targets. Unrecognized
legacy column layouts produce a specific migration-needed error and remain
untouched. This is covered by four additional regression tests; the user's
existing browser database was not directly inspected.
