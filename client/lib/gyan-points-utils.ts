/**
 * Helper utility for calculating Gyan Points based on plan/package IDs
 */

/**
 * Helper function to get Gyan points based on plan ID
 */
export function getGyanPointsForPlan(planId: string): number {
  const pointsMap: Record<string, number> = {
    // Main subscription plans
    'basic': 500,
    'student': 300,
    'scholar': 750,
    'premium': 2000,
    'institution': 2000,
    
    // Top-up packs (underscore versions from frontend)
    'quick_boost': 100,   // ₹99 → 100 Points
    'power_pack': 250,    // ₹199 → 250 Points
    'mega_bundle': 600,   // ₹399 → 600 Points
    
    // Legacy plans
    'basic_plan': 1000,
    'pro_plan': 3000,
    'premium_plan': 10000,
    'small_pack': 1000,
    'medium_pack': 3000,
    'large_pack': 5000,
    'mega_pack': 10000,
    
    // Hyphen versions (backup)
    'quick-boost': 100,
    'power-pack': 250,
    'mega-bundle': 600,
    'basic-plan': 1000,
    'pro-plan': 3000,
    'premium-plan': 10000,
    'small-pack': 1000,
    'medium-pack': 3000,
    'large-pack': 5000,
    'mega-pack': 10000
  };
  
  return pointsMap[planId] || 0; // Return 0 if plan not found (changed from 1000)
}

/**
 * Helper function to get plan duration in days
 */
export function getPlanDurationDays(planId: string): number {
  if (planId.includes('monthly')) return 30;
  if (planId.includes('yearly') || planId.includes('annual')) return 365;
  
  // Default durations based on plan tier
  const durationMap: Record<string, number> = {
    'basic_plan': 30,
    'pro_plan': 30,
    'premium_plan': 30,
    'basic-plan': 30,
    'pro-plan': 30,
    'premium-plan': 30,
  };
  
  return durationMap[planId] || 30;
}
