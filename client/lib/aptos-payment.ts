import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { aptosPaymentConfig, prepareAptosPayment } from './aptos-config';

// Convert price to proportional APT amount
const convertPriceToAPT = (price: number, currency: 'INR' | 'USD' = 'INR'): number => {
  // Define maximum amounts for each currency (highest pack price)
  const maxAmounts = {
    INR: 10000, // 10,000 INR = 1 APT (maximum pack)
    USD: 120    // 120 USD = 1 APT (maximum pack)
  };
  
  const maxAmount = maxAmounts[currency];
  const MAX_APT_AMOUNT = 1; // Maximum APT for the highest pack
  
  // Calculate proportional APT amount
  const aptAmount = (price / maxAmount) * MAX_APT_AMOUNT;
  
  // Round to 4 decimal places for precision
  const roundedAmount = Math.round(aptAmount * 10000) / 10000;
  
  // Minimum amount should be at least 0.0001 APT to avoid dust amounts
  return Math.max(roundedAmount, 0.0001);
};

// Initialize Aptos client
const config = new AptosConfig({ 
  network: process.env.NEXT_PUBLIC_APTOS_NETWORK as Network || Network.DEVNET 
});
const client = new Aptos(config);

// Aptos payment interface
export interface AptosPaymentParams {
  senderAddress: string;
  receiverAddress: string;
  amount: number;
  planName: string;
  planId: string;
  userId: string;
  currency?: 'INR' | 'USD';
}

// Handle Aptos payment through the embedded wallet
export async function processAptosPayment({
  senderAddress,
  receiverAddress,
  amount,
  planName,
  planId,
  userId,
  currency = 'INR'
}: AptosPaymentParams) {  
  try {
    // Convert the price to proportional APT amount
    const aptAmount = convertPriceToAPT(amount, currency);
    
    console.log(`Processing Aptos payment for ${planName}`);
    console.log(`Original price: ${amount} ${currency}`);
    console.log(`APT payment amount: ${aptAmount} APT`);
    
    // Get current account info
    const account = await client.account.getAccountInfo({ accountAddress: senderAddress });
    
    // Prepare transaction payload using the converted APT amount
    const payload = prepareAptosPayment(receiverAddress, aptAmount.toString());    // Create transaction for wallet (this needs to be done through the wallet adapter)
    // Use the direct transfer function syntax which matches the expected format
    const txnRequest = await client.transaction.build.simple({
      sender: senderAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [receiverAddress, Math.round(aptAmount * 100000000)], // Convert APT to octas
        typeArguments: []
      }
    });
      return {
      txnRequest,
      metadata: {
        planName,
        planId,
        userId,
        originalAmount: amount,
        originalCurrency: currency,
        aptAmount,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error processing Aptos payment:', error);
    throw error;
  }
}

// Save payment record to database
export async function savePaymentRecord(
  userId: string,
  walletAddress: string,
  transactionHash: string,
  planId: string,
  amount: number,
  aptAmount?: number,
  currency?: string
) {
  try {    // Since we're now doing real transactions, let's also do real payment recording
    console.log("🔄 Processing real payment record storage with:", {
      userId,
      walletAddress,
      transactionHash,
      planId,
      originalAmount: amount,
      aptAmount: aptAmount || 'N/A',
      currency: currency || 'INR',
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch('/api/payments/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },      body: JSON.stringify({
        userId,
        walletAddress,
        transactionHash,
        planId,
        amount,
        aptAmount: aptAmount || null,
        currency: currency || 'INR',
        paymentMethod: 'aptos',
        status: 'completed',
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.warn('API returned non-OK status when saving payment record:', response.status);
      // Instead of throwing, just return an error object but don't break the flow
      return {
        success: false,
        error: `API returned status ${response.status}`
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving payment record:', error);
    // Instead of throwing, return an error object
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Verify transaction status
export async function verifyAptosTransaction(transactionHash: string) {
  try {
    const txn = await client.waitForTransaction({ transactionHash });
    
    // Using new API format
    return {
      success: true, // If waitForTransaction resolves, the transaction was successful
      status: 'executed', // Successfully executed transaction
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return {
      success: false,
      status: 'failed',
      timestamp: new Date().toISOString(),
    };
  }
}
