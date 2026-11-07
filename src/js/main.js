import { NutriPlanAPI } from "./api/mealdb.js";
import { AppState } from "./state/appState.js";
import { UIComponents } from "./ui/components.js";

class NutriPlanApp {
  constructor() {
    this.api = new NutriPlanAPI();
    this.state = new AppState();
    this.ui = new UIComponents();
    this.productResults = [];
    this.activeGrade = "";
    this.searchTimer = null;
    this.mealRequestId = 0;
    this.detailRequestId = 0;
    this.elements = {
      overlay: document.getElementById("app-loading-overlay"),
      categories: document.getElementById("categories-grid"),
      areas: document.getElementById("area-filters"),
      recipes: document.getElementById("recipes-grid"),
      recipesCount: document.getElementById("recipes-count"),
      search: document.getElementById("search-input"),
      products: document.getElementById("products-grid"),
      productsCount: document.getElementById("products-count"),
      productsEmpty: document.getElementById("products-empty"),
      productCategories: document.getElementById("product-categories"),
      logList: document.getElementById("logged-items-list"),
    };
    this.pages = {
      meals: ["search-filters-section", "meal-categories-section", "all-recipes-section"],
      details: ["meal-details"],
      products: ["products-section"],
      foodlog: ["foodlog-section"],
    };
    this.pageMeta = {
      meals: ["Meals & Recipes", "Discover delicious and nutritious recipes tailored for you"],
      details: ["Recipe Details", "Ingredients, preparation steps, and nutrition facts"],
      products: ["Product Scanner", "Search packaged foods by name or barcode"],
      foodlog: ["Food Log", "Track your daily nutrition and food intake"],
    };
  }

  async start() {
    this.bindEvents();
    window.addEventListener("hashchange", () => this.handleRoute());
    if (!window.location.hash) window.history.replaceState(null, "", "#meals");
    this.handleRoute();

    try {
      await Promise.all([this.loadFilterOptions(), this.loadMeals()]);
    } finally {
      this.hideLoadingOverlay();
    }
  }

  bindEvents() {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.navigate(link.dataset.page);
        this.closeMobileMenu();
      });
    });

    document.getElementById("back-to-meals-btn")?.addEventListener("click", () => this.navigate("meals"));
    document.getElementById("view-all-categories")?.addEventListener("click", () => this.loadMeals());
    document.getElementById("header-menu-btn")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
    document.getElementById("sidebar-close-btn")?.addEventListener("click", () => this.closeMobileMenu());
    document.getElementById("sidebar-overlay")?.addEventListener("click", () => this.closeMobileMenu());

    this.elements.search?.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.loadMeals(this.elements.search.value.trim()), 350);
    });

    this.elements.categories?.addEventListener("click", (event) => {
      const category = event.target.closest("[data-category]")?.dataset.category;
      if (category) this.loadMeals({ category });
    });
    this.elements.areas?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-area]");
      if (button) this.loadMeals({ area: button.dataset.area });
    });
    this.elements.areas?.addEventListener("change", (event) => {
      if (event.target.matches("select[data-area-select]")) this.loadMeals({ area: event.target.value });
    });

    this.elements.recipes?.addEventListener("click", (event) => {
      const card = event.target.closest("[data-meal-id]");
      if (card) this.navigate(`meal/${card.dataset.mealId}`);
    });
    this.elements.recipes?.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-meal-id]")) {
        event.preventDefault();
        this.navigate(`meal/${event.target.dataset.mealId}`);
      }
    });

    document.getElementById("grid-view-btn")?.addEventListener("click", () => this.setRecipeView("grid"));
    document.getElementById("list-view-btn")?.addEventListener("click", () => this.setRecipeView("list"));

    document.getElementById("search-product-btn")?.addEventListener("click", () => this.searchProducts());
    document.getElementById("product-search-input")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.searchProducts();
    });
    document.getElementById("lookup-barcode-btn")?.addEventListener("click", () => this.lookupBarcode());
    document.getElementById("barcode-input")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") this.lookupBarcode();
    });
    this.elements.productCategories?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-product-category]");
      if (button) this.loadProductCategory(button.dataset.productCategory);
    });
    this.elements.products?.addEventListener("click", (event) => {
      const card = event.target.closest("[data-product-index]");
      if (card) this.openProductModal(this.productResults[Number(card.dataset.productIndex)]);
    });
    this.elements.products?.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches("[data-product-index]")) {
        event.preventDefault();
        this.openProductModal(this.productResults[Number(event.target.dataset.productIndex)]);
      }
    });
    document.querySelectorAll(".nutri-score-filter").forEach((button) => {
      button.addEventListener("click", () => {
        this.activeGrade = button.dataset.grade || "";
        document.querySelectorAll(".nutri-score-filter").forEach((item) => {
          item.classList.remove("ring-2", "ring-offset-2", "ring-emerald-500");
        });
        button.classList.add("ring-2", "ring-offset-2", "ring-emerald-500");
        this.renderProducts();
      });
    });

    document.getElementById("log-meal-btn")?.addEventListener("click", () => this.openMealLogModal());
    document.getElementById("cancel-log-meal")?.addEventListener("click", () => this.closeMealLogModal());
    document.getElementById("confirm-log-meal")?.addEventListener("click", () => this.logMeal());
    document.getElementById("increase-servings")?.addEventListener("click", () => this.adjustServings(0.5));
    document.getElementById("decrease-servings")?.addEventListener("click", () => this.adjustServings(-0.5));
    document.getElementById("meal-servings")?.addEventListener("input", () => this.updateMealLogPreview());
    document.getElementById("log-modal-overlay")?.addEventListener("click", (event) => {
      if (event.target.id === "log-modal-overlay") this.closeMealLogModal();
    });

    document.getElementById("product-modal")?.addEventListener("click", (event) => {
      if (event.target.id === "product-modal" || event.target.closest(".close-product-modal")) this.closeProductModal();
      if (event.target.closest("[data-action='log-product']")) this.logProduct();
    });
    document.getElementById("product-modal")?.addEventListener("input", (event) => {
      if (event.target.id === "product-grams") this.updateProductPreview();
    });

    document.getElementById("clear-foodlog")?.addEventListener("click", () => this.clearFoodLog());
    this.elements.logList?.addEventListener("click", (event) => {
      const remove = event.target.closest("[data-remove-entry]");
      if (remove) {
        try {
          this.state.removeFood(remove.dataset.removeEntry);
          this.renderFoodLog();
        } catch (error) {
          this.toast(error.message, "error");
        }
      }
      const browse = event.target.closest("[data-log-route]");
      if (browse) this.navigate(browse.dataset.logRoute);
    });
    document.querySelectorAll(".quick-log-btn").forEach((button, index) => {
      button.addEventListener("click", () => {
        if (index === 0) this.navigate("meals");
        else if (index === 1) this.navigate("products");
        else this.openCustomFoodEntry();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeMobileMenu();
        this.closeMealLogModal();
        this.closeProductModal();
      }
    });
  }

  closeMobileMenu() {
    document.body.classList.remove("sidebar-open");
  }

  navigate(route) {
    const normalized = route === "home" ? "meals" : route;
    const hash = normalized.startsWith("meal/") ? `#${normalized}` : `#${normalized}`;
    if (window.location.hash === hash) this.handleRoute();
    else window.location.hash = hash;
  }

  handleRoute() {
    const path = window.location.hash.replace(/^#\/?/, "") || "meals";
    const [route, mealId] = path.split("/");
    const page = route === "meal" ? "details" : ["meals", "products", "foodlog"].includes(route) ? route : "meals";

    if (page !== "details") {
      this.detailRequestId += 1;
      document.getElementById("meal-details-loader")?.remove();
    }

    Object.values(this.pages).flat().forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.style.display = "none";
    });
    this.pages[page].forEach((id) => {
      const section = document.getElementById(id);
      if (section) section.style.display = "";
    });

    const [title, description] = this.pageMeta[page];
    const headerTitle = document.querySelector("#header h1");
    const headerDescription = document.querySelector("#header p");
    if (headerTitle) headerTitle.textContent = title;
    if (headerDescription) headerDescription.textContent = description;

    document.querySelectorAll(".nav-link").forEach((link) => {
      const active = link.dataset.page === (page === "details" ? "meals" : page);
      link.classList.toggle("bg-emerald-50", active);
      link.classList.toggle("text-emerald-700", active);
      link.classList.toggle("text-gray-600", !active);
    });

    if (page === "details" && mealId) this.loadMealDetails(mealId);
    if (page === "foodlog") this.renderFoodLog();
    if (page === "products" && !this.state.productCategories.length) this.loadProductCategories();
    this.closeMobileMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async loadFilterOptions() {
    const [categories, areas] = await Promise.allSettled([this.api.getCategories(), this.api.getAreas()]);
    this.state.categories = categories.status === "fulfilled" ? categories.value : [];
    this.state.areas = areas.status === "fulfilled" ? areas.value : [];
    this.renderCategories();
    this.renderAreaFilters();
  }

  renderCategories() {
    if (!this.elements.categories) return;
    const featuredCategories = ["Beef", "Chicken", "Dessert", "Lamb", "Miscellaneous", "Pasta", "Pork", "Seafood", "Side", "Starter", "Vegan", "Vegetarian"];
    const categories = featuredCategories
      .map((name) => this.state.categories.find((category) => category.name === name))
      .filter(Boolean);
    this.elements.categories.innerHTML = categories.length
      ? categories.map((category) => this.ui.categoryCard(category)).join("")
      : this.ui.emptyState("Categories are unavailable right now.");
  }

  renderAreaFilters() {
    if (!this.elements.areas) return;
    const areaNames = [...new Set(this.state.areas.map((area) => area.name).filter(Boolean))];
    const buttons = areaNames.map((area) => `<button type="button" data-area="${this.ui.escape(area)}" class="shrink-0 px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-emerald-100 font-medium text-sm whitespace-nowrap transition-all">${this.ui.escape(area)}</button>`).join("");
    this.elements.areas.innerHTML = `<button type="button" data-area="" aria-pressed="true" class="shrink-0 px-4 py-2 rounded-full bg-emerald-600 text-white shadow-md font-medium text-sm whitespace-nowrap">All Cuisines</button>${buttons}`;
  }

  async loadMeals(query = "") {
    if (!this.elements.recipes) return;
    const requestId = ++this.mealRequestId;
    this.showMealLoading();
    try {
      let meals;
      if (typeof query === "string" && query) meals = await this.api.searchMeals(query);
      else if (query && (query.category || query.area)) meals = await this.api.filterMeals(query);
      else meals = await this.api.getMeals();
      if (requestId !== this.mealRequestId) return;
      this.state.meals = meals.slice(0, 25);
      this.renderMeals();
      if (this.elements.search && typeof query === "object") this.elements.search.value = "";
      const allButton = this.elements.areas?.querySelector('[data-area=""]');
      this.elements.areas?.querySelectorAll("[data-area]").forEach((button) => {
        const active = query?.area ? button.dataset.area === query.area : button === allButton;
        button.classList.toggle("bg-emerald-600", active);
        button.classList.toggle("text-white", active);
        button.classList.toggle("bg-gray-100", !active);
        button.classList.toggle("text-gray-700", !active);
        button.setAttribute("aria-pressed", String(active));
      });
    } catch (error) {
      if (requestId !== this.mealRequestId) return;
      this.elements.recipes.innerHTML = this.ui.emptyState("Meals could not be loaded.", error.message);
      if (this.elements.recipesCount) this.elements.recipesCount.textContent = "Recipes unavailable";
    }
  }

  showMealLoading() {
    if (this.elements.recipes) this.elements.recipes.innerHTML = `<div class="col-span-full flex justify-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" role="status" aria-label="Loading meals"></div></div>`;
    if (this.elements.recipesCount) this.elements.recipesCount.textContent = "Loading recipes...";
  }

  renderMeals() {
    const meals = this.state.meals;
    this.elements.recipes.innerHTML = meals.length
      ? meals.map((meal) => this.ui.mealCard(meal)).join("")
      : this.ui.emptyState("No recipes found.", "Try another search term, category, or cuisine.");
    if (this.elements.recipesCount) this.elements.recipesCount.textContent = `Showing ${meals.length} ${meals.length === 1 ? "recipe" : "recipes"}`;
  }

  setRecipeView(view) {
    const grid = this.elements.recipes;
    if (!grid) return;
    const gridButton = document.getElementById("grid-view-btn");
    const listButton = document.getElementById("list-view-btn");
    grid.classList.toggle("grid-cols-4", view === "grid");
    grid.classList.toggle("grid-cols-1", view === "list");
    grid.querySelectorAll(".recipe-card").forEach((card) => {
      card.classList.toggle("md:flex", view === "list");
      card.classList.toggle("items-center", view === "list");
      card.classList.toggle("gap-4", view === "list");
      card.querySelector("img")?.classList.toggle("md:w-48", view === "list");
      card.querySelector("img")?.classList.toggle("md:h-36", view === "list");
    });
    gridButton?.classList.toggle("bg-white", view === "grid");
    gridButton?.classList.toggle("shadow-sm", view === "grid");
    listButton?.classList.toggle("bg-white", view === "list");
    listButton?.classList.toggle("shadow-sm", view === "list");
  }

  async loadMealDetails(id) {
    const requestId = ++this.detailRequestId;
    const detailsSection = document.getElementById("meal-details");
    if (!detailsSection) return;
    detailsSection.querySelector("#meal-detail-error")?.remove();
    let loader = document.getElementById("meal-details-loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "meal-details-loader";
      loader.className = "fixed inset-0 z-40 bg-white/80 flex items-center justify-center";
      loader.innerHTML = `<div class="text-center"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div><p class="text-gray-600">Loading recipe details...</p></div>`;
      detailsSection.appendChild(loader);
    }
    try {
      const meal = await this.api.getMeal(id);
      if (requestId !== this.detailRequestId) return;
      if (!meal) throw new Error("This recipe could not be found.");
      this.state.currentMeal = meal;
      let nutrition = null;
      try {
        nutrition = await this.api.analyzeNutrition(meal);
      } catch (error) {
        console.warn("Nutrition analysis is temporarily unavailable.", error.message);
      }
      if (requestId !== this.detailRequestId) return;
      this.state.currentNutrition = nutrition;
      loader.remove();
      this.renderMealDetails(meal, nutrition);
    } catch (error) {
      if (requestId !== this.detailRequestId) return;
      loader.remove();
      const errorPanel = document.createElement("div");
      errorPanel.id = "meal-detail-error";
      errorPanel.className = "max-w-7xl mx-auto mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700";
      errorPanel.textContent = `Recipe details could not be loaded: ${error.message}`;
      detailsSection.prepend(errorPanel);
    }
  }

  renderMealDetails(meal, nutrition) {
    const section = document.getElementById("meal-details");
    const image = section.querySelector("#meal-hero-image");
    const title = section.querySelector("#meal-title");
    if (image) { image.src = meal.thumbnail || "./src/images/favicon.png"; image.alt = meal.name || "Recipe"; }
    if (title) title.textContent = meal.name || "Recipe";

    const tags = section.querySelector("#meal-hero-tags");
    if (tags) tags.innerHTML = [meal.category, meal.area, ...(meal.tags || []).slice(0, 1)].filter(Boolean).map((tag, index) => `<span class="px-3 py-1 ${index === 0 ? "bg-emerald-500" : index === 1 ? "bg-blue-500" : "bg-purple-500"} text-white text-sm font-semibold rounded-full">${this.ui.escape(tag)}</span>`).join("");
    const servings = document.getElementById("hero-servings");
    if (servings) servings.textContent = "Nutrition per serving";
    const calories = document.getElementById("hero-calories");
    if (calories) calories.textContent = nutrition?.calories != null ? `${Math.round(nutrition.calories)} cal/serving` : "Nutrition unavailable";

    const ingredients = meal.ingredients || [];
    const ingredientCount = document.getElementById("meal-ingredients-count");
    if (ingredientCount) ingredientCount.textContent = `${ingredients.length} items`;
    const ingredientList = document.getElementById("meal-ingredients-list");
    if (ingredientList) ingredientList.innerHTML = ingredients.length ? ingredients.map(({ ingredient, measure }) => `<label class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors"><input type="checkbox" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300"><span class="text-gray-700"><span class="font-medium text-gray-900">${this.ui.escape(measure || "")}</span> ${this.ui.escape(ingredient)}</span></label>`).join("") : this.ui.emptyState("Ingredients are unavailable.");

    const instructions = Array.isArray(meal.instructions) ? meal.instructions : String(meal.instructions || "").split(/\r?\n/).filter(Boolean);
    const instructionsList = document.getElementById("meal-instructions-list");
    if (instructionsList) instructionsList.innerHTML = instructions.length ? instructions.map((step, index) => `<div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"><div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">${index + 1}</div><p class="text-gray-700 leading-relaxed pt-2">${this.ui.escape(step)}</p></div>`).join("") : this.ui.emptyState("Preparation steps are unavailable.");

    const video = document.getElementById("meal-video");
    const videoSection = document.getElementById("meal-video-section");
    const videoUrl = this.youtubeEmbedUrl(meal.youtube);
    if (video && videoSection) {
      if (videoUrl) { video.src = videoUrl; videoSection.closest(".bg-white").style.display = ""; }
      else { video.src = "about:blank"; videoSection.closest(".bg-white").style.display = "none"; }
    }

    this.renderNutrition(nutrition);
    const logButton = document.getElementById("log-meal-btn");
    if (logButton) logButton.dataset.mealId = meal.id;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  youtubeEmbedUrl(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url);
      const id = parsed.hostname.includes("youtu.be") ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : "";
    } catch { return ""; }
  }

  renderNutrition(nutrition) {
    const container = document.getElementById("nutrition-facts-container");
    if (!container) return;
    if (!nutrition) {
      container.innerHTML = `<div class="rounded-xl bg-amber-50 p-5 text-sm text-amber-800">Nutrition analysis is unavailable for this recipe right now.</div>`;
      return;
    }
    const nutrients = [
      ["Calories", nutrition.calories, "kcal", "text-emerald-700"],
      ["Protein", nutrition.protein, "g", "text-blue-700"],
      ["Carbohydrates", nutrition.carbs, "g", "text-amber-700"],
      ["Fat", nutrition.fat, "g", "text-purple-700"],
      ["Fiber", nutrition.fiber, "g", "text-teal-700"],
      ["Sugar", nutrition.sugar, "g", "text-orange-700"],
      ["Saturated fat", nutrition.saturatedFat, "g", "text-rose-700"],
      ["Cholesterol", nutrition.cholesterol, "mg", "text-gray-700"],
      ["Sodium", nutrition.sodium, "mg", "text-gray-700"],
    ];
    container.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${nutrients.map(([label, value, unit, color]) => `<div class="rounded-xl bg-gray-50 p-4"><p class="text-xs text-gray-500">${label}</p><p class="text-lg font-bold ${color}">${value == null ? "-" : label === "Calories" ? Math.round(Number(value)) : Math.round(Number(value) * 10) / 10} <span class="text-xs font-medium">${unit}</span></p></div>`).join("")}</div><p class="mt-3 text-xs text-gray-500">Values are estimates per serving.</p>`;
  }

  openMealLogModal() {
    if (!this.state.currentMeal) return;
    const modal = document.getElementById("log-modal-overlay");
    const servingsInput = document.getElementById("meal-servings");
    if (!modal || !servingsInput) return;
    const meal = this.state.currentMeal;
    const img = modal.querySelector("img");
    if (img) { img.src = meal.thumbnail || "./src/images/favicon.png"; img.alt = meal.name || "Meal"; }
    const label = modal.querySelector("h3 + p");
    if (label) label.textContent = meal.name || "Meal";
    servingsInput.value = "1";
    modal.classList.remove("hidden");
    this.updateMealLogPreview();
  }

  adjustServings(amount) {
    const input = document.getElementById("meal-servings");
    const current = Math.max(0.5, Number(input?.value) || 1);
    if (input) input.value = String(Math.max(0.5, current + amount));
    this.updateMealLogPreview();
  }

  updateMealLogPreview() {
    const nutrition = this.state.currentNutrition || {};
    const servings = Math.max(0.5, Number(document.getElementById("meal-servings")?.value) || 1);
    const display = (value, unit = "") => value == null ? "-" : `${Math.round(Number(value) * servings)}${unit}`;
    document.getElementById("modal-calories").textContent = display(nutrition.calories);
    document.getElementById("modal-protein").textContent = display(nutrition.protein, "g");
    document.getElementById("modal-carbs").textContent = display(nutrition.carbs, "g");
    document.getElementById("modal-fat").textContent = display(nutrition.fat, "g");
  }

  closeMealLogModal() {
    document.getElementById("log-modal-overlay")?.classList.add("hidden");
  }

  logMeal() {
    const meal = this.state.currentMeal;
    if (!meal) return;
    const servings = Math.max(0.5, Number(document.getElementById("meal-servings")?.value) || 1);
    const nutrition = this.state.currentNutrition || {};
    try {
      this.state.addFood({
        name: meal.name,
        img: meal.thumbnail,
        type: "Recipe",
        servings,
        amountLabel: `${servings} ${servings === 1 ? "serving" : "servings"}`,
        calories: (Number(nutrition.calories) || 0) * servings,
        protein: (Number(nutrition.protein) || 0) * servings,
        carbs: (Number(nutrition.carbs) || 0) * servings,
        fat: (Number(nutrition.fat) || 0) * servings,
      });
    } catch (error) {
      this.toast(error.message, "error");
      return;
    }
    this.closeMealLogModal();
    this.renderFoodLog();
    this.toast("Meal added to your food log.", "success");
  }

  async loadProductCategories() {
    try {
      this.state.productCategories = await this.api.getProductCategories();
      this.elements.productCategories.innerHTML = this.state.productCategories.map((category) => `<button type="button" data-product-category="${this.ui.escape(category.id)}" class="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium whitespace-nowrap hover:bg-emerald-100 transition-all">${this.ui.escape(category.name)}</button>`).join("");
    } catch (error) {
      this.elements.productCategories.innerHTML = `<p class="text-sm text-gray-500">Categories could not be loaded.</p>`;
    }
  }

  async searchProducts(query = document.getElementById("product-search-input")?.value.trim()) {
    if (!query) return this.toast("Enter a product name to search.", "info");
    this.showProductsLoading();
    try {
      this.productResults = await this.api.searchProducts(query);
      this.renderProducts();
    } catch (error) {
      this.renderProductError(error.message);
    }
  }

  async loadProductCategory(category) {
    this.showProductsLoading();
    try {
      this.productResults = await this.api.getProductsByCategory(category);
      this.renderProducts();
    } catch (error) {
      this.renderProductError(error.message);
    }
  }

  async lookupBarcode() {
    const input = document.getElementById("barcode-input");
    const barcode = input?.value.trim();
    if (!barcode) return this.toast("Enter a barcode to look up.", "info");
    this.showProductsLoading();
    try {
      const product = await this.api.getProductByBarcode(barcode);
      if (!product) throw new Error("No product was found for this barcode.");
      this.productResults = [product];
      this.renderProducts();
      this.openProductModal(product);
    } catch (error) {
      this.renderProductError(error.message || "No product was found for this barcode.");
    }
  }

  showProductsLoading() {
    this.elements.productsEmpty.style.display = "none";
    this.elements.products.innerHTML = `<div class="col-span-full text-center py-12"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-3"></div><p class="text-gray-500">Searching products...</p></div>`;
    this.elements.productsCount.textContent = "Searching...";
  }

  renderProducts() {
    const visible = this.activeGrade
      ? this.productResults.filter((product) => (product.nutritionGrade || "").toLowerCase() === this.activeGrade)
      : this.productResults;
    this.elements.products.innerHTML = visible.length
      ? visible.map((product) => this.ui.productCard(product, this.productResults.indexOf(product))).join("")
      : "";
    this.elements.productsEmpty.style.display = visible.length ? "none" : "block";
    if (!visible.length) {
      this.elements.productsEmpty.querySelector("p")?.replaceChildren(document.createTextNode(this.productResults.length ? "No products match this Nutri-Score." : "No products found."));
      this.elements.productsCount.textContent = "0 products";
    } else {
      this.elements.productsCount.textContent = `${visible.length} ${visible.length === 1 ? "product" : "products"}`;
    }
  }

  renderProductError(message) {
    this.elements.products.innerHTML = this.ui.emptyState("Product search failed.", message);
    this.elements.productsEmpty.style.display = "none";
    this.elements.productsCount.textContent = "Search unavailable";
  }

  openProductModal(product) {
    if (!product) return;
    this.state.currentProduct = product;
    const modal = document.getElementById("product-modal");
    const nutrients = product.nutrients || {};
    const e = (value) => this.ui.escape(value || "");
    const grade = e((product.nutritionGrade || "unknown").toUpperCase());
    const values = [
      ["Calories", nutrients.calories, "kcal"], ["Protein", nutrients.protein, "g"],
      ["Carbohydrates", nutrients.carbs, "g"], ["Fat", nutrients.fat, "g"],
      ["Sugar", nutrients.sugar, "g"], ["Fiber", nutrients.fiber, "g"],
    ];
    modal.querySelector("#product-modal-content").innerHTML = `<button type="button" class="close-product-modal absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl" aria-label="Close product details">&times;</button>
      <div class="p-6 sm:p-8"><div class="flex flex-col sm:flex-row gap-5 items-center sm:items-start mb-6"><img src="${e(product.image || "./src/images/favicon.png")}" alt="${e(product.name)}" class="w-32 h-32 object-contain rounded-xl bg-gray-50"><div class="text-center sm:text-left"><p class="text-sm text-gray-500">${e(product.brand || "Packaged food")}</p><h2 class="text-2xl font-bold text-gray-900 mt-1">${e(product.name || "Product details")}</h2><p class="text-sm text-gray-500 mt-2">Barcode: ${e(product.barcode)}</p><span class="inline-block mt-3 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">Nutri-Score ${grade}</span></div></div>
      <div class="bg-emerald-50 rounded-xl p-5 mb-5"><div class="flex items-center justify-between mb-3"><h3 class="font-bold text-gray-900">Nutrition</h3><span class="text-xs text-gray-500">Per 100 g</span></div><div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${values.map(([label, value, unit]) => `<div class="bg-white rounded-lg p-3"><p class="text-xs text-gray-500">${label}</p><p class="font-bold text-gray-900">${value == null ? "-" : Math.round(Number(value) * 10) / 10} ${unit}</p></div>`).join("")}</div></div>
      <label for="product-grams" class="block text-sm font-semibold text-gray-700 mb-2">Amount to log (grams)</label><input id="product-grams" type="number" min="1" step="10" value="100" class="w-32 border border-gray-300 rounded-lg px-3 py-2 mb-4"><p id="product-log-preview" class="text-sm text-gray-500 mb-5"></p>
      <div class="flex gap-3"><button type="button" data-action="log-product" class="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700">Add to Food Log</button><button type="button" class="close-product-modal flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold">Close</button></div></div>`;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    this.updateProductPreview();
  }

  updateProductPreview() {
    const amount = Math.max(1, Number(document.getElementById("product-grams")?.value) || 100);
    const calories = Number(this.state.currentProduct?.nutrients?.calories) || 0;
    const preview = document.getElementById("product-log-preview");
    if (preview) preview.textContent = `${Math.round(calories * amount / 100)} kcal for ${amount} g`;
  }

  closeProductModal() {
    const modal = document.getElementById("product-modal");
    modal?.classList.add("hidden");
    modal?.classList.remove("flex");
  }

  logProduct() {
    const product = this.state.currentProduct;
    if (!product) return;
    const grams = Math.max(1, Number(document.getElementById("product-grams")?.value) || 100);
    const scale = grams / 100;
    const nutrients = product.nutrients || {};
    try {
      this.state.addFood({
        name: product.name || "Packaged food",
        img: product.image || "./src/images/favicon.png",
        type: "Product",
        servings: scale,
        amountLabel: `${grams} g`,
        barcode: product.barcode,
        calories: (Number(nutrients.calories) || 0) * scale,
        protein: (Number(nutrients.protein) || 0) * scale,
        carbs: (Number(nutrients.carbs) || 0) * scale,
        fat: (Number(nutrients.fat) || 0) * scale,
      });
    } catch (error) {
      this.toast(error.message, "error");
      return;
    }
    this.closeProductModal();
    this.renderFoodLog();
    this.toast("Product added to your food log.", "success");
  }

  renderFoodLog() {
    const entries = this.state.getForDate();
    const totals = this.state.getTotals(entries);
    const dateElement = document.getElementById("foodlog-date");
    if (dateElement) dateElement.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
    const goals = { calories: 2000, protein: 50, carbs: 250, fat: 65 };
    const units = { calories: "kcal", protein: "g", carbs: "g", fat: "g" };
    document.querySelectorAll("[data-nutrient-card]").forEach((card) => {
      const nutrient = card.dataset.nutrientCard;
      const goal = Number(card.dataset.goal) || goals[nutrient];
      const value = totals[nutrient] || 0;
      const overGoal = nutrient === "calories" && value > goal;
      const overage = Math.round(value - goal);
      const label = card.querySelector(".flex.items-center.justify-between span:last-child");
      if (label) {
        label.textContent = `${Math.round(value)} / ${goal} ${units[nutrient]}${overGoal ? ` (${overage} over goal)` : ""}`;
        label.style.color = overGoal ? "#dc2626" : "";
      }
      const bar = card.querySelector(".w-full > div");
      if (bar) {
        bar.style.width = `${Math.min(100, value / goal * 100)}%`;
        bar.style.backgroundColor = overGoal ? "#ef4444" : "";
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", String(goal));
        bar.setAttribute("aria-valuenow", String(Math.round(value)));
        bar.setAttribute("aria-label", `${nutrient}: ${Math.round(value)} of ${goal} ${units[nutrient]}${overGoal ? `, ${overage} over goal` : ""}`);
      }
    });

    const count = document.getElementById("logged-items-count");
    if (count) count.textContent = `Logged Items (${entries.length})`;
    const clearButton = document.getElementById("clear-foodlog");
    if (clearButton) clearButton.style.display = entries.length ? "inline-flex" : "none";
    if (this.elements.logList) {
      this.elements.logList.innerHTML = entries.length ? entries.map((item) => `<article class="flex items-center justify-between gap-3 bg-gray-50 rounded-xl p-3 sm:p-4 hover:bg-gray-100 transition-all"><div class="flex items-center gap-3 min-w-0"><img src="${this.ui.escape(item.img || "./src/images/favicon.png")}" alt="" class="w-12 h-12 rounded-xl object-cover bg-white"><div class="min-w-0"><p class="font-semibold text-gray-900 truncate">${this.ui.escape(item.name)}</p><p class="text-xs text-gray-500">${this.ui.escape(item.amountLabel || `${item.servings || 1} servings`)} <span class="mx-1">·</span>${this.ui.escape(item.type || "Meal")} <span class="mx-1">·</span>${this.ui.escape(item.time || "")}</p></div></div><div class="flex items-center gap-2 sm:gap-4"><div class="hidden md:flex gap-2 text-xs text-gray-500"><span class="px-2 py-1 bg-blue-50 rounded">${Math.round(item.protein)}g P</span><span class="px-2 py-1 bg-amber-50 rounded">${Math.round(item.carbs)}g C</span><span class="px-2 py-1 bg-purple-50 rounded">${Math.round(item.fat)}g F</span></div><div class="text-right"><p class="font-bold text-emerald-600">${Math.round(item.calories)}</p><p class="text-xs text-gray-500">kcal</p></div><button type="button" data-remove-entry="${this.ui.escape(item.id)}" aria-label="Remove ${this.ui.escape(item.name)}" class="text-gray-400 hover:text-red-500 p-2"><i class="fa-solid fa-trash-can"></i></button></div></article>`).join("") : `<div class="text-center py-8 text-gray-500"><i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i><p class="font-medium">No meals logged today</p><p class="text-sm mb-4">Add meals from the Meals page or scan products</p><div class="flex justify-center gap-3"><button type="button" data-log-route="meals" class="px-4 py-2 bg-emerald-600 text-white rounded-lg">Browse recipes</button><button type="button" data-log-route="products" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Scan product</button></div></div>`;
    }
    this.renderWeeklyOverview();
  }

  renderWeeklyOverview() {
    const container = document.getElementById("weekly-days-container");
    if (!container) return;
    const today = new Date();
    container.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const key = this.state.todayKey(date);
      const total = this.state.getTotals(this.state.getForDate(key)).calories;
      const isToday = index === 6;
      return `<div class="text-center p-2 ${isToday ? "bg-indigo-50 border border-indigo-200 shadow-sm" : ""} rounded-xl transition-all"><p class="text-[10px] uppercase tracking-wider ${isToday ? "text-indigo-600 font-bold" : "text-gray-400"} mb-1">${date.toLocaleDateString(undefined, { weekday: "short" })}</p><p class="text-sm font-bold ${isToday ? "text-indigo-900" : "text-gray-700"}">${date.getDate()}</p><div class="mt-2 ${total ? "text-emerald-600" : "text-gray-300"}"><p class="text-sm font-black">${Math.round(total)}</p><p class="text-[9px] font-medium">kcal</p></div></div>`;
    }).join("");
  }

  async clearFoodLog() {
    const confirmed = window.Swal
      ? (await Swal.fire({ title: "Clear today's food log?", text: "This removes today's entries only.", icon: "warning", showCancelButton: true, confirmButtonText: "Clear log" })).isConfirmed
      : window.confirm("Clear today's food log?");
    if (!confirmed) return;
    try {
      this.state.clearDate();
    } catch (error) {
      this.toast(error.message, "error");
      return;
    }
    this.renderFoodLog();
    this.toast("Today's log has been cleared.", "success");
  }

  async openCustomFoodEntry() {
    if (!window.Swal) return this.toast("Custom food entry is unavailable.", "info");
    const result = await Swal.fire({
      title: "Add a custom food",
      html: `<input id="custom-food-name" class="swal2-input" placeholder="Food name"><input id="custom-food-calories" class="swal2-input" type="number" min="0" placeholder="Calories"><input id="custom-food-protein" class="swal2-input" type="number" min="0" placeholder="Protein (g)"><input id="custom-food-carbs" class="swal2-input" type="number" min="0" placeholder="Carbs (g)"><input id="custom-food-fat" class="swal2-input" type="number" min="0" placeholder="Fat (g)">`,
      showCancelButton: true,
      confirmButtonText: "Add to log",
      preConfirm: () => {
        const name = document.getElementById("custom-food-name").value.trim();
        if (!name) {
          Swal.showValidationMessage("Enter a food name.");
          return false;
        }
        return {
          name,
          calories: Number(document.getElementById("custom-food-calories").value) || 0,
          protein: Number(document.getElementById("custom-food-protein").value) || 0,
          carbs: Number(document.getElementById("custom-food-carbs").value) || 0,
          fat: Number(document.getElementById("custom-food-fat").value) || 0,
        };
      },
    });
    if (result.isConfirmed) {
      try {
        this.state.addFood({ ...result.value, img: "./src/images/favicon.png", type: "Custom food", amountLabel: "1 entry" });
      } catch (error) {
        this.toast(error.message, "error");
        return;
      }
      this.renderFoodLog();
      this.toast("Custom food added to your log.", "success");
    }
  }

  hideLoadingOverlay() {
    const overlay = this.elements.overlay;
    if (!overlay) return;
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.style.display = "none"; }, 400);
  }

  toast(title, icon = "success") {
    if (window.Swal) {
      Swal.fire({ toast: true, position: "top-end", icon, title, showConfirmButton: false, timer: 2400, timerProgressBar: true });
    } else if (icon === "error") window.alert(title);
  }
}

const app = new NutriPlanApp();
app.start().catch((error) => {
  console.error("NutriPlan could not start.", error);
  app.hideLoadingOverlay();
});
