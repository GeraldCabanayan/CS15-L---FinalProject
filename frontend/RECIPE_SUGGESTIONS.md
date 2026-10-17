# Recipe suggestions

Calendar includes a searchable recipe dropdown. It lists all saved
recipes from the SQLite-backed store, independently of the calorie-based
recommendations. Selecting a recipe displays its ingredient amounts, serving
yield, instructions, and calories per serving. Existing calorie recommendations
and meal logging remain available below the dropdown. Home displays the diary
and nutrition progress without the recipe dropdown or recommendation controls.

Recipe management stays in **Recipes**. Use **Create recipe**, **Edit**, or
**Delete** there. **View ingredients & instructions** displays recipe details
without entering the editor. The create/edit form includes a multiline
Instructions field. Older recipes may have no instructions and display a
message explaining where to add them.

Create Meal also offers saved recipes below **Meal name**. An empty field lists
all available recipes alphabetically; typing filters by name with exact and
prefix matches ranked first. Select an option to fill the name, serving yield,
category, ingredient amounts and nutrition, preparation steps, and nutrition
completion status. The copied fields remain editable. A selection clears any
previous ingredient autocomplete or numeric text drafts. It writes nothing to
the database until Save. In Create, Save inserts a separate recipe; in Edit,
Save updates the recipe being edited, retaining its ID and creation date.

The Meal name field has an integrated arrow and a compact floating menu, using
the app's green accents and rounded borders. A checkmark highlights the selected
recipe. Use the arrow to open or close the menu; reopening it lists every saved
recipe. Focus Meal name and type to filter. Focus another field or press Escape
on web to dismiss the menu. Unmatched names can still be saved as new recipes
with manually entered details.

Database version 4 adds a non-null instructions column with an empty default.
The upgrade runs in the existing migration transaction and preserves recipes,
ingredients, diary entries, goals, and legacy archives. It inserts three sample
recipes with ingredients and preparation steps: Banana yogurt oats, Chickpea
cucumber salad, and Tofu vegetable noodles. Sample nutrition values are
approximate examples for the listed amounts; they can be edited in Recipes.
The samples use old creation dates so personal recipes appear first in the
library. A persistent seed marker prevents duplicate samples and prevents
deleted samples from returning, including after an unversioned database repair.
Samples are never automatically added to the diary.

A separate `filipino_recipes_v1` content batch adds **Sinigang na Baboy**,
**Adobong Manok**, and **Tinolang Manok** to both new and existing version 4
databases. It runs transactionally on startup and has its own persistent marker,
so old deleted samples stay deleted and the new recipes are inserted only once.
Each makes four servings, with ingredient amounts, preparation instructions,
and estimated calories, protein, carbohydrates, fat, fiber, sugar, and sodium.
Ingredient weights describe raw edible portions, without bones. Nutrition
includes the listed broth or sauce and excludes accompanying rice. Values are
approximate and vary by meat cut and condiment brand; users can edit them.

The cooking methods were checked against Panlasang Pinoy's
[pork sinigang](https://panlasangpinoy.com/pork-sinigang-na-baboy-recipe/),
[chicken adobo](https://panlasangpinoy.com/filipino-chicken-adobo-recipe/), and
[tinolang manok](https://panlasangpinoy.com/classic-tinolang-manok-recipe/).
These are simplified sample variations with their own quantities and estimated
nutrition, rather than the source recipes' nutrition calculations.

Validation from `frontend`:

```sh
npm run typecheck
npm run test:db
```

The database suite covers instructions CRUD and persistence, migration from
version 3, rollback and retry of partial seeding, preservation of legacy data,
and persistence of sample edits and deletions. It also retains the existing
calendar, nutrition, goal, search, and diary regression tests.

Manual UI checks:

1. Open Calendar, open the recipe dropdown, and select each sample.
   Check the ingredients, serving yield, and multiline instructions.
2. Search in the dropdown, including a query with no matches.
3. In Recipes, create a recipe with ingredients and instructions. Select it in
   the dropdown, then edit it and confirm the updated details appear there.
4. Delete the selected recipe. Confirm its details disappear from the dropdown.
5. Edit one sample and delete another. Restart the app and confirm both changes
   persist without reseeding the deleted sample.
6. Log a recipe on a past date, check its nutrition totals and calorie-based
   recommendations, and confirm other dates remain unaffected.
