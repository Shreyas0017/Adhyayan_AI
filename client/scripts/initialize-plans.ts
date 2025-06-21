#!/usr/bin/env node

/**
 * Script to initialize subscription plans in the Aptos contract
 * Run this script to set up your subscription plans in the deployed contract
 */

import { initializeSubscriptionPlan } from '../lib/aptos-civic-integration';

// Define your subscription plans
const SUBSCRIPTION_PLANS = [
  {
    id: 'scholar',
    name: 'Scholar',
    priceInApt: 0.0999, // 0.0999 APT for Scholar plan
    durationInDays: 30
  },
  {
    id: 'basic',
    name: 'Basic Plan',
    priceInApt: 0.1, // 0.1 APT
    durationInDays: 30
  },
  {
    id: 'premium',
    name: 'Premium Plan', 
    priceInApt: 0.25, // 0.25 APT
    durationInDays: 30
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    priceInApt: 0.5, // 0.5 APT  
    durationInDays: 30
  }
];

async function initializePlans() {
  console.log('🚀 Starting subscription plan initialization...');
  
  // You need to provide your admin private key here
  // WARNING: Never commit your private key to version control!
  // Use environment variables or secure key management
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  
  if (!adminPrivateKey) {
    console.error('❌ Error: ADMIN_PRIVATE_KEY environment variable not set');
    console.log('Set your admin private key with: export ADMIN_PRIVATE_KEY="your_private_key"');
    process.exit(1);
  }
  
  console.log('📋 Plans to initialize:');
  SUBSCRIPTION_PLANS.forEach(plan => {
    console.log(`  - ${plan.name}: ${plan.priceInApt} APT for ${plan.durationInDays} days`);
  });
  
  for (const plan of SUBSCRIPTION_PLANS) {
    console.log(`\n🔄 Initializing ${plan.name}...`);
    
    try {
      const result = await initializeSubscriptionPlan(
        adminPrivateKey,
        plan.id,
        plan.name,
        plan.priceInApt,
        plan.durationInDays
      );
      
      if (result.success) {
        console.log(`✅ ${plan.name} initialized successfully!`);
        console.log(`   Transaction hash: ${result.txnHash}`);
      } else {
        console.error(`❌ Failed to initialize ${plan.name}: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error initializing ${plan.name}:`, error);
    }
    
    // Wait between transactions to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Plan initialization complete!');
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializePlans().catch(error => {
    console.error('❌ Fatal error during initialization:', error);
    process.exit(1);
  });
}

export { initializePlans, SUBSCRIPTION_PLANS };
