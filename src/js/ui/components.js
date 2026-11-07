export class UIComponents {
  escape(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character]);
  }

  mealCard(meal) {
    const name = this.escape(meal.name || "Untitled meal");
    const image = this.escape(meal.thumbnail || "./src/images/favicon.png");
    const category = this.escape(meal.category || "Meal");
    const area = this.escape(meal.area || "International");
    const description = this.escape((meal.instructions?.[0] || "A recipe to add to your weekly menu.").slice(0, 125));

    return `<article class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-meal-id="${this.escape(meal.id)}" tabindex="0" role="button" aria-label="View ${name}">
      <div class="relative h-48 overflow-hidden">
        <img class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${image}" alt="${name}" loading="lazy" />
        <div class="absolute bottom-3 left-3 flex gap-2">
          <span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-semibold rounded-full text-gray-700 shadow-sm">${category}</span>
          <span class="px-2 py-1 bg-emerald-500 text-[10px] font-semibold rounded-full text-white shadow-sm">${area}</span>
        </div>
      </div>
      <div class="p-4">
        <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">${name}</h3>
        <p class="text-xs text-gray-600 mb-3 line-clamp-2 leading-relaxed">${description}</p>
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-gray-900"><i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>${category}</span>
          <span class="font-bold text-gray-500"><i class="fa-solid fa-globe text-blue-500 mr-1"></i>${area}</span>
        </div>
      </div>
    </article>`;
  }

  categoryCard(category) {
    const name = this.escape(category.name || "Category");
    const id = this.escape(category.name || "");
    const styles = {
      Beef: ["fa-drumstick-bite", "beef"],
      Chicken: ["fa-drumstick-bite", "chicken"],
      Dessert: ["fa-cake-candles", "dessert"],
      Lamb: ["fa-drumstick-bite", "lamb"],
      Miscellaneous: ["fa-bowl-food", "miscellaneous"],
      Pasta: ["fa-bowl-food", "pasta"],
      Pork: ["fa-bacon", "pork"],
      Seafood: ["fa-fish", "seafood"],
      Side: ["fa-bowl-rice", "side"],
      Starter: ["fa-utensils", "starter"],
      Vegan: ["fa-leaf", "vegan"],
      Vegetarian: ["fa-seedling", "vegetarian"],
    };
    const [icon, color] = styles[category.name] || ["fa-utensils", "default"];
    return `<button type="button" class="category-card category-card--${color}" data-category="${id}">
      <span class="category-icon category-icon--${color}"><i class="fa-solid ${icon}"></i></span>
      <span class="category-name">${name}</span>
    </button>`;
  }

  productCard(product, index) {
    const name = this.escape(product.name || "Packaged food");
    const brand = this.escape(product.brand || "Brand not listed");
    const image = this.escape(product.image || "./src/images/favicon.png");
    const grade = this.escape((product.nutritionGrade || "?").toUpperCase());
    const gradeColors = { A: "bg-green-600", B: "bg-lime-500", C: "bg-yellow-500", D: "bg-orange-500", E: "bg-red-600" };
    const gradeColor = gradeColors[grade] || "bg-gray-400";
    const calories = Number(product.nutrients?.calories) || 0;
    return `<article class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer" data-product-index="${index}" tabindex="0" role="button" aria-label="View ${name}">
      <div class="relative h-48 bg-gray-50 flex items-center justify-center p-4">
        <img class="max-h-full max-w-full object-contain" src="${image}" alt="${name}" loading="lazy" />
        <span class="absolute top-3 right-3 ${gradeColor} text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center">${grade}</span>
      </div>
      <div class="p-4"><p class="text-xs text-gray-500 mb-1">${brand}</p><h3 class="font-bold text-gray-900 line-clamp-2 min-h-12">${name}</h3>
        <p class="text-sm text-emerald-700 font-semibold mt-3">${Math.round(calories)} kcal <span class="font-normal text-gray-500">/ 100 g</span></p>
        <p class="text-xs text-gray-500 mt-2">View nutrition and add to your food log</p>
      </div>
    </article>`;
  }

  emptyState(title, description = "Try another search or filter.") {
    return `<div class="col-span-full text-center py-12"><div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><i class="fa-solid fa-magnifying-glass text-gray-400 text-2xl"></i></div><p class="text-gray-600 font-medium">${this.escape(title)}</p><p class="text-sm text-gray-400 mt-2">${this.escape(description)}</p></div>`;
  }
}
