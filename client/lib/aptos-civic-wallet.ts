import { Aptos, AptosConfig, Network, SimulateTransactionError, SubmitTransactionResponse } from '@aptos-labs/ts-sdk';
import { aptosPaymentConfig } from './aptos-config';
import { normalizeAptosAddress } from './aptos-civic-integration';

// Initialize Aptos client
const config = new AptosConfig({ 
  network: process.env.NEXT_PUBLIC_APTOS_NETWORK as Network || Network.DEVNET 
});
const client = new Aptos(config);

// Interface for user wallet data
export interface CivicWalletData {
  address: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  uid?: string | null;
}

// Interface for transaction data
export interface AptosTransactionData {
  planId: string;
  planName: string;
  amount: number;
  userId: string;
  senderAddress: string;
  receiverAddress: string;
}

/**
 * Process an Aptos payment through Civic wallet
 */
export async function processAptosPaymentWithCivic(txnData: AptosTransactionData): Promise<{
  success: boolean;
  txnHash?: string;
  error?: string;
}> {
  try {
    // Prepare the transaction data with normalized addresses
    const { amount, planName, planId, userId } = txnData;
    const senderAddress = normalizeAptosAddress(txnData.senderAddress);
    const receiverAddress = normalizeAptosAddress(txnData.receiverAddress);
    
    // Generate a unique transaction reference
    const txnRef = `${planId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Build the transaction
    const transaction = await client.transaction.build.simple({
      sender: senderAddress,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [receiverAddress, (amount * 100000000).toString()], // Converting to octas as string
      }
    });
      // In a real implementation, the transaction would be signed by the wallet
    // For now, we'll skip simulation and create a mock result
    try {
      // For demo purposes, create a mock transaction hash
      const mockTxnHash = `0x${Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      console.log(`✅ Mock Aptos payment processed successfully!`);
      console.log(`Plan: ${planName} (${planId})`);
      console.log(`Amount: ${amount} APT`);
      console.log(`Sender: ${senderAddress}`);
      console.log(`Receiver: ${receiverAddress}`);
      console.log(`Transaction Hash: ${mockTxnHash}`);
      
      // Return success result
      return {
        success: true,
        txnHash: mockTxnHash
      };
      
    } catch (processError) {
      console.error("Transaction processing error:", processError);
      return {
        success: false,
        error: `Transaction processing failed: ${processError instanceof Error ? processError.message : 'Unknown error'}`
      };
    }
    
  } catch (error) {
    console.error("Error processing Aptos payment:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Verify an Aptos transaction status
 */
export async function verifyAptosTransaction(txnHash: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    // In a production environment, this would query the blockchain
    // const txnResult = await client.waitForTransaction({ transactionHash: txnHash });
    // return {
    //   success: txnResult.success,
    //   status: txnResult.vm_status
    // };
    
    // For the demo, we'll assume success
    return {
      success: true,
      status: "Executed successfully"
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Format a wallet address for display
 */
export function formatWalletAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if a wallet is properly connected for Aptos transactions
 */
export function isWalletReadyForAptos(wallet: CivicWalletData | null): boolean {
  if (!wallet || !wallet.address) return false;
  
  // Check if the address is properly formatted for Aptos (64 chars + 0x prefix)
  const normalizedAddress = normalizeAptosAddress(wallet.address);
  return normalizedAddress.length === 66 && normalizedAddress.startsWith('0x');
}
