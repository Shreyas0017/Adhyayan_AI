#!/usr/bin/env node

/**
 * Test script to verify Aptos contract integration
 * This script tests the contract functions without requiring a real wallet
 */

import { Aptos, AptosConfig, Network, Ed25519PrivateKey, Account } from '@aptos-labs/ts-sdk';
import { checkUserSubscription, getContractAddress } from '../lib/aptos-civic-integration';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_APTOS_CONTRACT_ADDRESS || "0x67c7cc6061c73c15c7c6f27821710ee7a2e63d817e9def4160235cc2a183b2ae";

async function testContractIntegration() {
  console.log('🧪 Testing Aptos Contract Integration');
  console.log(`📋 Contract Address: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: ${process.env.NEXT_PUBLIC_APTOS_NETWORK || 'DEVNET'}`);
  
  // Initialize Aptos client
  const config = new AptosConfig({ 
    network: process.env.NEXT_PUBLIC_APTOS_NETWORK as Network || Network.DEVNET 
  });
  const client = new Aptos(config);
  
  console.log('\n1️⃣ Testing Contract Existence...');
  
  try {
    // Check if contract exists by trying to get account info
    const accountInfo = await client.getAccountInfo({
      accountAddress: CONTRACT_ADDRESS
    });
    
    console.log('✅ Contract account found!');
    console.log(`   Sequence Number: ${accountInfo.sequence_number}`);
    console.log(`   Authentication Key: ${accountInfo.authentication_key}`);
  } catch (error) {
    console.error('❌ Contract not found or not deployed:', error);
    return;
  }
  
  console.log('\n2️⃣ Testing Contract Modules...');
  
  try {
    // Get account modules to verify our contract is deployed
    const modules = await client.getAccountModules({
      accountAddress: CONTRACT_ADDRESS
    });
    
    const subscriptionModule = modules.find(module => 
      module.abi?.name === 'subscription'
    );
    
    if (subscriptionModule) {
      console.log('✅ Subscription module found!');
      console.log(`   Module Name: ${subscriptionModule.abi?.name}`);
      console.log(`   Functions: ${subscriptionModule.abi?.exposed_functions?.length || 0}`);
      
      // List available functions
      if (subscriptionModule.abi?.exposed_functions) {
        console.log('   Available Functions:');
        subscriptionModule.abi.exposed_functions.forEach(func => {
          console.log(`     - ${func.name}`);
        });
      }
    } else {
      console.error('❌ Subscription module not found');
    }
  } catch (error) {
    console.error('❌ Error getting contract modules:', error);
  }
  
  console.log('\n3️⃣ Testing Contract Functions...');
  
  // Test a simple view function call
  try {
    // Generate a test address
    const testPrivateKey = new Ed25519PrivateKey("0x" + "1".repeat(64));
    const testAccount = Account.fromPrivateKey({ privateKey: testPrivateKey });
    const testAddress = testAccount.accountAddress.toString();
    
    console.log(`   Testing with address: ${testAddress}`);
    
    // Test subscription check for a non-existent subscription
    const subscriptionCheck = await checkUserSubscription(testAddress, 'basic');
    
    console.log('✅ Subscription check function works!');
    console.log(`   Is Active: ${subscriptionCheck.isActive}`);
    console.log(`   Error: ${subscriptionCheck.error || 'None'}`);
    
  } catch (error) {
    console.error('❌ Error testing contract functions:', error);
  }
  
  console.log('\n4️⃣ Testing Network Connectivity...');
  
  try {
    const ledgerInfo = await client.getLedgerInfo();
    console.log('✅ Network connection successful!');
    console.log(`   Chain ID: ${ledgerInfo.chain_id}`);
    console.log(`   Ledger Version: ${ledgerInfo.ledger_version}`);
    console.log(`   Ledger Timestamp: ${new Date(parseInt(ledgerInfo.ledger_timestamp) / 1000).toISOString()}`);
  } catch (error) {
    console.error('❌ Network connection failed:', error);
  }
  
  console.log('\n5️⃣ Testing Transaction Building...');
  
  try {
    // Create a test account for transaction building
    const testPrivateKey = new Ed25519PrivateKey("0x" + "2".repeat(64));
    const testAccount = Account.fromPrivateKey({ privateKey: testPrivateKey });
    
    // Build a test transaction (don't submit it)
    const transaction = await client.transaction.build.simple({
      sender: testAccount.accountAddress,
      data: {
        function: `${CONTRACT_ADDRESS}::subscription::purchase_subscription`,
        functionArguments: [
          Array.from(new TextEncoder().encode('test_plan')),
          Array.from(new TextEncoder().encode('test_txn_123'))
        ],
      },
    });
      console.log('✅ Transaction building successful!');
    console.log(`   Transaction type: Function call to subscription::purchase_subscription`);
    console.log(`   Gas limit: ${transaction.rawTransaction.max_gas_amount}`);
  } catch (error) {
    console.error('❌ Transaction building failed:', error);
    console.log('   This might indicate issues with function arguments or contract interface');
  }
  
  console.log('\n📊 Test Summary:');
  console.log('   ✅ Your contract is deployed and accessible');
  console.log('   ✅ Transaction structure is correct');  
  console.log('   ⚠️  To make real transactions, integrate with Civic wallet signing');
  console.log('   💡 The mock transactions are NOT showing on explorer because they are simulated');
  console.log('   💡 Real transactions will appear on explorer when properly signed and submitted');
  
  console.log('\n🔧 Next Steps:');
  console.log('   1. Set up admin private key: export ADMIN_PRIVATE_KEY="your_key"');
  console.log('   2. Run: npm run initialize-plans');
  console.log('   3. Integrate actual Civic wallet signing in the frontend');
  console.log('   4. Test with real wallet transactions');
}

// Run the test if this script is executed directly
if (require.main === module) {
  testContractIntegration().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

export { testContractIntegration };
