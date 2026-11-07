const STORAGE_KEY = "foodLog";

export class AppState {
  constructor() {
    this.foodLog = this.readFoodLog();
    this.meals = [];
    this.categories = [];
    this.areas = [];
    this.productCategories = [];
    this.currentMeal = null;
    this.currentNutrition = null;
    this.currentProduct = null;
  }

  todayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  normalizeDate(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return value;
    const match = String(value || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    return this.todayKey();
  }

  readFoodLog() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved.map((entry) => ({
        ...entry,
        date: this.normalizeDate(entry.date),
        calories: Number(entry.calories) || 0,
        protein: Number(entry.protein) || 0,
        carbs: Number(entry.carbs) || 0,
        fat: Number(entry.fat) || 0,
      }));
    } catch (error) {
      console.warn("Could not read the saved food log.", error);
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.foodLog));
    } catch (error) {
      console.error("Could not save the food log.", error);
      throw new Error("Your food log could not be saved in this browser.");
    }
  }

  addFood(entry) {
    const item = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      date: this.todayKey(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "Meal",
      servings: 1,
      ...entry,
    };
    this.foodLog.unshift(item);
    try {
      this.save();
    } catch (error) {
      this.foodLog.shift();
      throw error;
    }
    return item;
  }

  removeFood(id) {
    const previousFoodLog = this.foodLog;
    this.foodLog = this.foodLog.filter((item) => item.id !== id);
    try {
      this.save();
    } catch (error) {
      this.foodLog = previousFoodLog;
      throw error;
    }
  }

  clearDate(date = this.todayKey()) {
    const previousFoodLog = this.foodLog;
    this.foodLog = this.foodLog.filter((item) => item.date !== date);
    try {
      this.save();
    } catch (error) {
      this.foodLog = previousFoodLog;
      throw error;
    }
  }

  getForDate(date = this.todayKey()) {
    return this.foodLog.filter((item) => item.date === date);
  }

  getTotals(items = this.getForDate()) {
    return items.reduce((totals, item) => {
      totals.calories += Number(item.calories) || 0;
      totals.protein += Number(item.protein) || 0;
      totals.carbs += Number(item.carbs) || 0;
      totals.fat += Number(item.fat) || 0;
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }
}
