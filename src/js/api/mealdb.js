const API_BASE = "https://nutriplan-api.vercel.app/api";
const NUTRITION_API_KEY = "ZaofRlutGezfSf4btXiNYOozuW4Rah1l7Ltw3Nm5";

export class NutriPlanAPI {
  async request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("The server returned an unreadable response.");
    }

    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.error?.message || payload?.error || payload?.message || "The request failed.");
    }

    return payload;
  }

  async getMeals() {
    const data = await this.request("/meals/random?count=25");
    return data.results || [];
  }

  async searchMeals(query) {
    const data = await this.request(`/meals/search?q=${encodeURIComponent(query)}`);
    return data.results || [];
  }

  async filterMeals({ category = "", area = "" } = {}) {
    const params = new URLSearchParams({ limit: "25" });
    if (category) params.set("category", category);
    if (area) params.set("area", area);
    const data = await this.request(`/meals/filter?${params}`);
    return data.results || [];
  }

  async getMeal(id) {
    const data = await this.request(`/meals/${encodeURIComponent(id)}`);
    return data.result || data.meal || null;
  }

  async getCategories() {
    const data = await this.request("/meals/categories");
    return data.results || [];
  }

  async getAreas() {
    const data = await this.request("/meals/areas");
    return data.results || [];
  }

  async analyzeNutrition(meal) {
    const ingredients = (meal.ingredients || []).map(({ measure, ingredient }) =>
      `${measure || ""} ${ingredient || ""}`.trim(),
    ).filter(Boolean);

    if (!ingredients.length) return null;

    const data = await this.request("/nutrition/analyze", {
      method: "POST",
      headers: { "x-api-key": NUTRITION_API_KEY },
      body: JSON.stringify({ recipeName: meal.name, ingredients }),
    });

    return data.data?.perServing || data.perServing || data.data || null;
  }

  async getProductCategories() {
    const data = await this.request("/products/categories?limit=24");
    return data.results || [];
  }

  async searchProducts(query) {
    const data = await this.request(`/products/search?q=${encodeURIComponent(query)}`);
    return data.results || [];
  }

  async getProductsByCategory(category) {
    const data = await this.request(`/products/category/${encodeURIComponent(category)}?limit=24`);
    return data.results || [];
  }

  async getProductByBarcode(barcode) {
    const data = await this.request(`/products/barcode/${encodeURIComponent(barcode)}`);
    return data.result || null;
  }
}

