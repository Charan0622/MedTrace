// ============================================================
// MedTrace — Health Tips & Facts (shown during AI loading)
// Fresh tip every time — rotates through 50+ tips
// ============================================================

const HEALTH_TIPS = [
  { tip: "Walking just 30 minutes a day can reduce the risk of heart disease by 35% and Type 2 diabetes by 40%.", category: "Exercise" },
  { tip: "Eating an apple a day provides 14% of your daily Vitamin C needs and reduces bad cholesterol by up to 23%.", category: "Nutrition" },
  { tip: "7-8 hours of quality sleep reduces your risk of developing cardiovascular disease by 65%.", category: "Sleep" },
  { tip: "Drinking 8 glasses of water daily can improve kidney function by 60% and reduce headache frequency by 47%.", category: "Hydration" },
  { tip: "1 in 3 adults worldwide has high blood pressure. Reducing salt intake by just 1 teaspoon/day lowers BP by 5-6 mmHg.", category: "Heart Health" },
  { tip: "Deep breathing for 5 minutes lowers cortisol by 25% and can reduce anxiety symptoms within 90 seconds.", category: "Mental Health" },
  { tip: "Turmeric contains curcumin, a compound that reduces inflammation as effectively as some anti-inflammatory drugs.", category: "Natural Remedies" },
  { tip: "Regular hand washing reduces respiratory infections by 21% and gastrointestinal illness by 31%.", category: "Hygiene" },
  { tip: "Laughing for 15 minutes a day burns up to 40 calories and boosts immune function by increasing T-cell activity.", category: "Wellness" },
  { tip: "Eating 5 servings of fruits and vegetables daily reduces stroke risk by 26% and cancer risk by 20%.", category: "Nutrition" },
  { tip: "Standing for just 2 minutes every hour reduces blood sugar spikes by 11% in diabetic patients.", category: "Diabetes Care" },
  { tip: "Omega-3 fatty acids found in fish can reduce triglycerides by 15-30% and lower the risk of sudden cardiac death.", category: "Heart Health" },
  { tip: "Meditation for 10 minutes daily can lower blood pressure by 4-5 mmHg — equivalent to adding a low-dose medication.", category: "Mental Health" },
  { tip: "1 in 4 deaths globally is caused by cardiovascular disease, making it the #1 killer. But 80% of cases are preventable.", category: "Heart Health" },
  { tip: "Green tea contains EGCG, an antioxidant that boosts metabolism by 4% and may reduce the risk of certain cancers.", category: "Natural Remedies" },
  { tip: "A 10-minute daily stretch routine can improve flexibility by 30% and reduce chronic back pain by 56%.", category: "Exercise" },
  { tip: "Probiotics in yogurt can improve gut health, boost immunity by 42%, and reduce antibiotic-associated diarrhea by 52%.", category: "Nutrition" },
  { tip: "Exposure to 15 minutes of morning sunlight helps regulate circadian rhythm and improves Vitamin D synthesis by 200%.", category: "Wellness" },
  { tip: "Type 2 Diabetes affects 462 million people worldwide. Losing just 5-7% of body weight can reduce risk by 58%.", category: "Diabetes Care" },
  { tip: "Garlic consumption of 2-3 cloves daily can lower blood pressure by 8-10 mmHg and reduce cholesterol by 10-15%.", category: "Natural Remedies" },
  { tip: "Social isolation increases mortality risk by 26%. Regular social interaction is as important as exercise for health.", category: "Mental Health" },
  { tip: "Fiber intake of 30g daily reduces risk of colorectal cancer by 30% and improves heart health significantly.", category: "Nutrition" },
  { tip: "Washing hands with soap for 20 seconds eliminates 99.9% of bacteria — just humming 'Happy Birthday' twice covers the time.", category: "Hygiene" },
  { tip: "Dark chocolate (70%+ cocoa) contains flavonoids that lower blood pressure and improve brain blood flow by 30%.", category: "Nutrition" },
  { tip: "Chronic stress increases cortisol, which raises blood sugar, blood pressure, and weakens immunity. Managing stress is medicine.", category: "Mental Health" },
  { tip: "Ginger tea can reduce nausea by 75%, lower muscle pain by 25%, and has anti-inflammatory effects comparable to ibuprofen.", category: "Natural Remedies" },
  { tip: "Hospital patients who have a window view recover 1 day faster on average than those without — nature heals.", category: "Wellness" },
  { tip: "Every cigarette smoked takes 11 minutes off your life. Quitting at any age adds years — even quitting at 60 adds 3 years.", category: "Prevention" },
  { tip: "Warm honey and lemon water in the morning boosts immunity, aids digestion, and provides antibacterial benefits.", category: "Natural Remedies" },
  { tip: "Only 23% of adults globally get enough exercise. Just 150 minutes of moderate activity per week reduces all-cause mortality by 31%.", category: "Exercise" },
  { tip: "Cinnamon can lower fasting blood sugar by 10-29% in diabetic patients. Just half a teaspoon daily shows benefits.", category: "Diabetes Care" },
  { tip: "Potassium-rich foods like bananas, spinach, and sweet potatoes can lower blood pressure by 3-5 mmHg.", category: "Heart Health" },
  { tip: "The human body replaces its entire skin every 2-3 weeks. Good nutrition directly affects skin regeneration quality.", category: "Wellness" },
  { tip: "Reading for 30 minutes daily reduces stress by 68% — more effective than listening to music or taking a walk.", category: "Mental Health" },
  { tip: "Almonds (a handful daily) can reduce bad LDL cholesterol by 5-6% and provide 37% of daily Vitamin E needs.", category: "Nutrition" },
  { tip: "Post-surgery patients who listen to music need 50% less pain medication. Music truly is medicine.", category: "Wellness" },
  { tip: "Flossing daily adds 6.4 years to your life expectancy by reducing gum disease, which is linked to heart disease.", category: "Hygiene" },
  { tip: "Chamomile tea before bed can improve sleep quality by 28% and reduce anxiety symptoms in 65% of people.", category: "Natural Remedies" },
  { tip: "Depression affects 280 million people worldwide. Regular exercise is as effective as antidepressants for mild-moderate cases.", category: "Mental Health" },
  { tip: "Your body produces 3.8 million new cells every second. Proper nutrition ensures these cells are healthy and functional.", category: "Wellness" },
  { tip: "Eating meals at consistent times daily can improve blood sugar control by 20% in diabetic patients.", category: "Diabetes Care" },
  { tip: "Cold showers for 30 seconds increase alertness, boost immunity by 29%, and improve circulation.", category: "Wellness" },
  { tip: "Walnuts are shaped like a brain for a reason — they contain DHA, an omega-3 that improves cognitive function by 20%.", category: "Nutrition" },
  { tip: "Gratitude journaling for 5 minutes daily reduces depression by 31% and improves sleep quality by 25%.", category: "Mental Health" },
  { tip: "Black pepper increases turmeric absorption by 2000%. Always combine them for maximum anti-inflammatory benefit.", category: "Natural Remedies" },
  { tip: "Sitting for more than 8 hours daily increases cardiovascular disease risk by 15%. Stand and move every 30 minutes.", category: "Exercise" },
  { tip: "Adequate Vitamin D (15 minutes of sunlight) reduces the risk of flu by 42% and strengthens bones.", category: "Prevention" },
  { tip: "Oatmeal for breakfast can lower cholesterol by 5-10% within 6 weeks due to its beta-glucan fiber content.", category: "Heart Health" },
  { tip: "Smiling releases endorphins and serotonin. Even a forced smile can reduce stress and lower heart rate.", category: "Wellness" },
  { tip: "Peppermint oil applied to temples reduces tension headache pain by 40% within 15 minutes.", category: "Natural Remedies" },
];

let lastIndex = -1;

export function getRandomHealthTip(): { tip: string; category: string } {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * HEALTH_TIPS.length);
  } while (idx === lastIndex && HEALTH_TIPS.length > 1);
  lastIndex = idx;
  return HEALTH_TIPS[idx];
}

export function getHealthTipForCondition(conditions: string[]): { tip: string; category: string } {
  const condStr = conditions.join(" ").toLowerCase();

  const relevant = HEALTH_TIPS.filter((t) => {
    const cat = t.category.toLowerCase();
    if (condStr.includes("diabetes") && (cat === "diabetes care" || t.tip.toLowerCase().includes("sugar") || t.tip.toLowerCase().includes("insulin"))) return true;
    if (condStr.includes("hypertension") && (cat === "heart health" || t.tip.toLowerCase().includes("blood pressure"))) return true;
    if (condStr.includes("depression") || condStr.includes("anxiety")) if (cat === "mental health") return true;
    if (condStr.includes("copd") || condStr.includes("pneumonia")) if (t.tip.toLowerCase().includes("breathing") || t.tip.toLowerCase().includes("exercise")) return true;
    return false;
  });

  if (relevant.length > 0) {
    return relevant[Math.floor(Math.random() * relevant.length)];
  }
  return getRandomHealthTip();
}
