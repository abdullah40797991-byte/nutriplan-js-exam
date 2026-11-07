# NutriPlan

A Vanilla JavaScript meal discovery and nutrition tracking app built on the supplied NutriPlan starter design.

## Features

- Browse 25 recipes and filter by category or cuisine area; search by meal name.
- Open recipe details with ingredients, preparation steps, YouTube video, and per-serving nutrition.
- Log meal servings and packaged products to a daily food log stored in `localStorage`.
- Search products by name or barcode, browse categories, and filter results by Nutri-Score.
- Track daily calories, protein, carbohydrates, and fat, with a seven-day calorie overview.
- Navigate between Meals, Product Scanner, Food Log, and recipe details using hash routes.
- Organize behavior with ES modules and classes (`NutriPlanAPI`, `AppState`, `UIComponents`, and `NutriPlanApp`).

## Run locally

The application uses ES modules, so open it through a local web server instead of opening `index.html` as a `file://` URL.

From this directory, run:

```powershell
py -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Data sources

- Recipe and nutrition endpoints: `https://nutriplan-api.vercel.app/api`
- Product data: NutriPlan API proxy for Open Food Facts
- Food log: browser `localStorage` under the `foodLog` key

Recipe and product data require an internet connection. Food log entries stay in the current browser profile.
