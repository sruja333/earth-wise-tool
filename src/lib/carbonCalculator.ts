import { CarbonFormData } from "@/components/CarbonForm";

// Emission factors based on EPA, CarbonFootprint.com, and FAO data
const EMISSION_FACTORS = {
  transport: {
    car: 0.21, // kg CO2 per km
    bike: 0.05,
    bus: 0.08,
    metro: 0.04,
    bicycle: 0,
    walk: 0,
  },
  carpool: {
    yes: 0.5, // 50% reduction
    no: 1,
  },
  electricity: 0.5, // kg CO2 per unit
  acUsage: {
    never: 0,
    occasionally: 50,
    daily: 150,
  },
  renewableEnergy: {
    yes: 0.7, // 30% reduction
    no: 1,
  },
  meatMeals: 3.5, // kg CO2 per meal
  dairy: 2.5, // kg CO2 per liter
  localFood: {
    yes: 0.85, // 15% reduction
    no: 1,
  },
  waste: 0.5, // kg CO2 per kg of waste
  recycle: {
    yes: 0.7, // 30% reduction
    no: 1,
  },
  water: 0.0003, // kg CO2 per liter
  shopping: 5, // kg CO2 per shopping trip
  onlineOrders: 6, // kg CO2 per order (packaging + delivery)
};

export interface CarbonBreakdown {
  transportation: number;
  electricity: number;
  diet: number;
  waste: number;
  lifestyle: number;
  total: number;
}

export const calculateCarbonFootprint = (data: CarbonFormData): CarbonBreakdown => {
  // Transportation (monthly)
  const dailyTransport = data.travelKmPerDay * EMISSION_FACTORS.transport[data.transportMode as keyof typeof EMISSION_FACTORS.transport];
  const transportation = dailyTransport * 30 * EMISSION_FACTORS.carpool[data.carpool as keyof typeof EMISSION_FACTORS.carpool];

  // Electricity (monthly)
  const baseElectricity = data.electricityUnits * EMISSION_FACTORS.electricity;
  const acImpact = EMISSION_FACTORS.acUsage[data.acUsage as keyof typeof EMISSION_FACTORS.acUsage];
  const electricity = (baseElectricity + acImpact) * EMISSION_FACTORS.renewableEnergy[data.renewableEnergy as keyof typeof EMISSION_FACTORS.renewableEnergy];

  // Diet (monthly)
  const meatImpact = data.meatMealsPerWeek * EMISSION_FACTORS.meatMeals * 4.3; // ~4.3 weeks per month
  const dairyImpact = data.dairyLitersPerDay * EMISSION_FACTORS.dairy * 30;
  const diet = (meatImpact + dairyImpact) * EMISSION_FACTORS.localFood[data.localFood as keyof typeof EMISSION_FACTORS.localFood];

  // Waste (monthly)
  const wasteImpact = data.wasteKgPerWeek * EMISSION_FACTORS.waste * 4.3;
  const waterImpact = data.waterUsageLiters * EMISSION_FACTORS.water * 30;
  const waste = (wasteImpact + waterImpact) * EMISSION_FACTORS.recycle[data.recycle as keyof typeof EMISSION_FACTORS.recycle];

  // Lifestyle (monthly)
  const lifestyle = (data.shoppingFreq * EMISSION_FACTORS.shopping) + (data.onlineOrders * EMISSION_FACTORS.onlineOrders);

  const total = transportation + electricity + diet + waste + lifestyle;

  return {
    transportation: Math.round(transportation * 10) / 10,
    electricity: Math.round(electricity * 10) / 10,
    diet: Math.round(diet * 10) / 10,
    waste: Math.round(waste * 10) / 10,
    lifestyle: Math.round(lifestyle * 10) / 10,
    total: Math.round(total * 10) / 10,
  };
};

export const getAverageFootprint = () => 850; // Average kg CO2 per month

export const getCategoryAverages = () => ({
  transportation: 180,
  electricity: 250,
  diet: 220,
  waste: 100,
  lifestyle: 100,
});

export const generateSuggestions = (breakdown: CarbonBreakdown, data: CarbonFormData) => {
  const suggestions = [];
  
  // Sort categories by impact
  const categories = [
    { name: "transportation", value: breakdown.transportation },
    { name: "electricity", value: breakdown.electricity },
    { name: "diet", value: breakdown.diet },
    { name: "waste", value: breakdown.waste },
    { name: "lifestyle", value: breakdown.lifestyle },
  ].sort((a, b) => b.value - a.value);

  // Generate personalized suggestions based on highest emissions AND what user is NOT already doing
  const topCategory = categories[0].name;
  const secondCategory = categories[1].name;
  
  // Transportation suggestions - only if user is NOT already doing these things
  if (topCategory === "transportation" || secondCategory === "transportation") {
    if (data.transportMode === "car" && data.carpool === "no") {
      suggestions.push("🚗 TOP PRIORITY: Carpooling can cut your transport emissions in half!");
    } else if (data.transportMode === "car") {
      suggestions.push("🚌 Consider using public transport 2-3 times per week to reduce emissions by up to 40%");
    }
    if (data.transportMode !== "bicycle" && data.transportMode !== "walk" && data.travelKmPerDay < 10) {
      suggestions.push("🚴 Try cycling or walking for short distances under 10km");
    }
  }
  
  // Electricity suggestions - only suggest what they're NOT doing
  if (topCategory === "electricity" || secondCategory === "electricity") {
    if (data.renewableEnergy === "no") {
      suggestions.push("⚡ TOP PRIORITY: Switch to renewable energy plans to reduce electricity emissions by 30%");
    }
    if (data.acUsage === "daily") {
      suggestions.push("❄️ Use AC efficiently: set to 24°C and use fans to save 20-30% energy");
    } else if (data.acUsage === "occasionally" && data.electricityUnits > 400) {
      suggestions.push("💡 Replace old appliances with energy-efficient models to save up to 40% energy");
    }
    if (data.electricityUnits > 500) {
      suggestions.push("🔌 Unplug devices when not in use - phantom load accounts for 10% of home energy");
    }
  }
  
  // Diet suggestions - only if user is NOT already doing these things
  if (topCategory === "diet" || secondCategory === "diet") {
    if (data.meatMealsPerWeek > 10) {
      suggestions.push("🌱 TOP PRIORITY: Try Meatless Mondays - reducing meat by just 2 meals/week saves ~30kg CO2/month");
    } else if (data.meatMealsPerWeek > 5 && data.meatMealsPerWeek <= 10) {
      suggestions.push("🥗 Great job on reducing meat! Try one more plant-based day per week");
    }
    if (data.localFood === "no") {
      suggestions.push("🥬 Choose local, seasonal produce to reduce food transportation emissions by 15%");
    }
    if (data.dairyLitersPerDay > 1.5) {
      suggestions.push("🥛 Consider plant-based milk alternatives to reduce dairy emissions");
    }
  }
  
  // Waste suggestions - only if NOT already doing
  if (topCategory === "waste" || secondCategory === "waste") {
    if (data.recycle === "no") {
      suggestions.push("♻️ TOP PRIORITY: Start recycling! It can reduce waste emissions by 30%");
    }
    if (data.wasteKgPerWeek > 20) {
      suggestions.push("🗑️ Reduce single-use plastics and start composting to cut waste by 50%");
    } else if (data.wasteKgPerWeek > 15 && data.recycle === "yes") {
      suggestions.push("🍂 Compost food waste to further reduce landfill emissions");
    }
    if (data.waterUsageLiters > 300) {
      suggestions.push("💧 Install low-flow fixtures to reduce water usage by 30%");
    }
  }
  
  // Lifestyle suggestions - only if applicable
  if (topCategory === "lifestyle" || secondCategory === "lifestyle") {
    if (data.onlineOrders > 15) {
      suggestions.push("📦 TOP PRIORITY: Bundle online orders to reduce delivery emissions by 40%");
    }
    if (data.shoppingFreq > 10) {
      suggestions.push("👕 Buy quality over quantity - fast fashion contributes 10% of global emissions");
    } else if (data.shoppingFreq > 5) {
      suggestions.push("🛍️ Consider second-hand shopping for clothes and furniture");
    }
  }

  // Add tree planting suggestion
  const treesNeeded = Math.ceil(breakdown.total / 25);
  suggestions.push(`🌳 Plant ${treesNeeded} trees this month to offset your carbon footprint`);

  // Remove duplicates and return top 5
  const uniqueSuggestions = [...new Set(suggestions)];
  return uniqueSuggestions.slice(0, 5);
};
