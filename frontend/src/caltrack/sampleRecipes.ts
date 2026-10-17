import type { Meal } from './types';

// Example nutrition is approximate and describes each ingredient's listed amount.
// Stable IDs and dates keep sample recipes behind the user's own saved recipes.
export const initialSampleRecipes: Meal[] = [
  {
    id: 'sample-yogurt-oats', name: 'Banana yogurt oats', category: 'breakfast',
    servings: 1, createdAt: '2000-01-03T00:00:00.000Z',
    ingredients: [
      { id: 'oats', name: 'Rolled oats', amount: '40 g', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4, sugar: 1, sodium: 0 },
      { id: 'yogurt', name: 'Plain yogurt', amount: '150 g', calories: 95, protein: 8, carbs: 10, fat: 3, fiber: 0, sugar: 10, sodium: 65 },
      { id: 'banana', name: 'Banana', amount: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3, sugar: 14, sodium: 1 },
    ],
    instructions: '1. Stir the oats and yogurt together in a bowl.\n2. Cover and refrigerate overnight.\n3. Slice the banana and add it just before serving.',
  },
  {
    id: 'sample-chickpea-salad', name: 'Chickpea cucumber salad', category: 'lunch',
    servings: 2, createdAt: '2000-01-02T00:00:00.000Z',
    ingredients: [
      { id: 'chickpeas', name: 'Cooked chickpeas', amount: '300 g, drained', calories: 492, protein: 27, carbs: 82, fat: 8, fiber: 23, sugar: 14, sodium: 21 },
      { id: 'cucumber', name: 'Cucumber', amount: '200 g', calories: 30, protein: 1, carbs: 7, fat: 0, fiber: 1, sugar: 3, sodium: 4 },
      { id: 'tomato', name: 'Tomato', amount: '150 g', calories: 27, protein: 1, carbs: 6, fat: 0, fiber: 2, sugar: 4, sodium: 8 },
      { id: 'oil', name: 'Olive oil', amount: '1 tbsp', calories: 119, protein: 0, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 0 },
      { id: 'lemon', name: 'Lemon juice', amount: '2 tbsp', calories: 6, protein: 0, carbs: 2, fat: 0, fiber: 0, sugar: 1, sodium: 0 },
    ],
    instructions: '1. Rinse and drain the cooked chickpeas.\n2. Dice the cucumber and tomato.\n3. Toss everything with olive oil and lemon juice.\n4. Divide into two servings.',
  },
  {
    id: 'sample-tofu-noodles', name: 'Tofu vegetable noodles', category: 'dinner',
    servings: 2, createdAt: '2000-01-01T00:00:00.000Z',
    ingredients: [
      { id: 'noodles', name: 'Cooked whole-wheat noodles', amount: '300 g', calories: 372, protein: 16, carbs: 78, fat: 2, fiber: 12, sugar: 2, sodium: 9 },
      { id: 'tofu', name: 'Firm tofu', amount: '200 g', calories: 288, protein: 34, carbs: 6, fat: 17, fiber: 4, sugar: 1, sodium: 28 },
      { id: 'broccoli', name: 'Broccoli', amount: '200 g', calories: 68, protein: 6, carbs: 13, fat: 1, fiber: 5, sugar: 3, sodium: 66 },
      { id: 'oil', name: 'Olive oil', amount: '1 tbsp', calories: 119, protein: 0, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 0 },
      { id: 'soy', name: 'Reduced-sodium soy sauce', amount: '1 tbsp', calories: 10, protein: 1, carbs: 1, fat: 0, fiber: 0, sugar: 0, sodium: 590 },
    ],
    instructions: '1. Cube the tofu and cut the broccoli into small florets.\n2. Heat the olive oil in a pan and cook the tofu until golden.\n3. Add the broccoli and a splash of water; cook until tender.\n4. Toss in the cooked noodles and soy sauce, and heat through.\n5. Divide into two servings.',
  },
];

// Raw, edible ingredient weights; each dish makes four servings, excluding rice.
// Nutrition estimates include the listed sauce/broth and can be edited by users.
export const filipinoSampleRecipes: Meal[] = [
  {
    id: 'sample-sinigang-na-baboy', name: 'Sinigang na Baboy', category: 'lunch',
    servings: 4, createdAt: '1999-12-03T00:00:00.000Z',
    ingredients: [
      { id: 'pork', name: 'Pork shoulder, boneless and trimmed', amount: '600 g, cubed', calories: 1212, protein: 108, carbs: 0, fat: 84, fiber: 0, sugar: 0, sodium: 360 },
      { id: 'tomato', name: 'Tomatoes', amount: '200 g, quartered', calories: 36, protein: 2, carbs: 8, fat: 0, fiber: 2, sugar: 5, sodium: 10 },
      { id: 'onion', name: 'Onion', amount: '100 g, quartered', calories: 40, protein: 1, carbs: 9, fat: 0, fiber: 2, sugar: 4, sodium: 4 },
      { id: 'radish', name: 'Labanos (daikon radish)', amount: '150 g, sliced', calories: 27, protein: 1, carbs: 6, fat: 0, fiber: 2, sugar: 4, sodium: 32 },
      { id: 'eggplant', name: 'Eggplant', amount: '150 g, sliced', calories: 38, protein: 1, carbs: 9, fat: 0, fiber: 5, sugar: 5, sodium: 3 },
      { id: 'beans', name: 'Sitaw (yardlong beans)', amount: '100 g, cut into short lengths', calories: 47, protein: 3, carbs: 8, fat: 0, fiber: 3, sugar: 3, sodium: 4 },
      { id: 'greens', name: 'Kangkong (water spinach)', amount: '100 g, washed and trimmed', calories: 19, protein: 3, carbs: 3, fat: 0, fiber: 2, sugar: 0, sodium: 113 },
      { id: 'tamarind', name: 'Unsalted tamarind paste', amount: '45 g (about 3 tbsp)', calories: 108, protein: 1, carbs: 28, fat: 0, fiber: 2, sugar: 17, sodium: 13 },
      { id: 'fish-sauce', name: 'Fish sauce (patis)', amount: '1 tbsp (15 ml)', calories: 10, protein: 2, carbs: 1, fat: 0, fiber: 0, sugar: 0, sodium: 1400 },
      { id: 'water', name: 'Water', amount: '1.5 litres, plus more if needed', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    ],
    instructions: '1. Put pork, onion, tomatoes, and water in a pot. Bring to a boil and skim off foam.\n2. Cover and gently simmer for 60–90 minutes, until the pork is tender. Add water if needed.\n3. Add radish and eggplant; simmer for 5–7 minutes.\n4. Stir in the tamarind paste, fish sauce, and sitaw. Cook for another 3–5 minutes, until the vegetables are tender.\n5. Add kangkong and simmer for 1–2 minutes, until wilted.\n6. Divide pork, vegetables, and broth into four servings. Rice is not included in the nutrition estimate.',
  },
  {
    id: 'sample-adobong-manok', name: 'Adobong Manok', category: 'dinner',
    servings: 4, createdAt: '1999-12-02T00:00:00.000Z',
    ingredients: [
      { id: 'chicken', name: 'Chicken thigh, boneless and skinless', amount: '600 g, cut into pieces', calories: 864, protein: 114, carbs: 0, fat: 42, fiber: 0, sugar: 0, sodium: 510 },
      { id: 'soy-sauce', name: 'Soy sauce', amount: '4 tbsp (60 ml)', calories: 36, protein: 4, carbs: 4, fat: 0, fiber: 0, sugar: 0, sodium: 3520 },
      { id: 'vinegar', name: 'Cane vinegar', amount: '4 tbsp (60 ml)', calories: 12, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 3 },
      { id: 'garlic', name: 'Garlic', amount: '20 g (about 6 cloves), crushed', calories: 30, protein: 1, carbs: 7, fat: 0, fiber: 0, sugar: 0, sodium: 3 },
      { id: 'oil', name: 'Cooking oil', amount: '1 tbsp (15 ml)', calories: 119, protein: 0, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 0 },
      { id: 'bay', name: 'Dried bay leaves', amount: '2 leaves; remove before serving', calories: 2, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
      { id: 'pepper', name: 'Black peppercorns', amount: '1 tsp, lightly crushed', calories: 6, protein: 0, carbs: 2, fat: 0, fiber: 1, sugar: 0, sodium: 0 },
      { id: 'water', name: 'Water', amount: '250 ml (1 cup)', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    ],
    instructions: '1. Heat oil in a deep pan. Brown the chicken on both sides, then briefly cook the garlic alongside it.\n2. Add soy sauce, vinegar, water, bay leaves, and peppercorns. Bring to a boil.\n3. Lower the heat, cover, and simmer for 25–35 minutes, turning the chicken occasionally. Add water if the pan becomes dry.\n4. Check that the thickest chicken pieces reach 74°C (165°F).\n5. Uncover and simmer until the sauce is reduced to your liking. Remove bay leaves.\n6. Divide chicken and sauce into four servings. Rice is not included in the nutrition estimate.',
  },
  {
    id: 'sample-tinolang-manok', name: 'Tinolang Manok', category: 'dinner',
    servings: 4, createdAt: '1999-12-01T00:00:00.000Z',
    ingredients: [
      { id: 'chicken', name: 'Chicken thigh, boneless and skinless', amount: '600 g, cut into pieces', calories: 864, protein: 114, carbs: 0, fat: 42, fiber: 0, sugar: 0, sodium: 510 },
      { id: 'papaya', name: 'Green papaya', amount: '400 g, peeled, seeded, and sliced', calories: 172, protein: 2, carbs: 43, fat: 1, fiber: 7, sugar: 16, sodium: 32 },
      { id: 'ginger', name: 'Fresh ginger', amount: '30 g, cut into thin strips', calories: 24, protein: 1, carbs: 5, fat: 0, fiber: 1, sugar: 1, sodium: 4 },
      { id: 'onion', name: 'Onion', amount: '100 g, sliced', calories: 40, protein: 1, carbs: 9, fat: 0, fiber: 2, sugar: 4, sodium: 4 },
      { id: 'garlic', name: 'Garlic', amount: '12 g (about 4 cloves), minced', calories: 18, protein: 1, carbs: 4, fat: 0, fiber: 0, sugar: 0, sodium: 2 },
      { id: 'greens', name: 'Malunggay (moringa) leaves', amount: '50 g, stems removed', calories: 32, protein: 5, carbs: 4, fat: 1, fiber: 1, sugar: 0, sodium: 5 },
      { id: 'oil', name: 'Cooking oil', amount: '1 tbsp (15 ml)', calories: 119, protein: 0, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 0 },
      { id: 'fish-sauce', name: 'Fish sauce (patis)', amount: '1 tbsp (15 ml)', calories: 10, protein: 2, carbs: 1, fat: 0, fiber: 0, sugar: 0, sodium: 1400 },
      { id: 'water', name: 'Water', amount: '1.5 litres', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    ],
    instructions: '1. Heat oil in a pot. Sauté ginger, onion, and garlic until fragrant.\n2. Add chicken and cook for about 5 minutes, turning the pieces. Stir in fish sauce.\n3. Pour in water, bring to a boil, and skim off foam. Cover and gently simmer for 25–30 minutes.\n4. Add green papaya and cook for 8–10 minutes, until tender. Check that the thickest chicken pieces reach 74°C (165°F).\n5. Stir in malunggay leaves and simmer for 1–2 minutes.\n6. Divide chicken, vegetables, and broth into four servings. Rice is not included in the nutrition estimate.',
  },
];

export const sampleRecipes: Meal[] = [...initialSampleRecipes, ...filipinoSampleRecipes];
