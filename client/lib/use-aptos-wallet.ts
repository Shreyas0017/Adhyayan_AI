import { useCallback, useState, useEffect } from 'react';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import { formatWalletAddress, normalizeAptosAddress } from './aptos-civic-integration';

// Interface for wallet information
export interface AptosWalletInfo {
  address: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  uid?: string | null;
}

// Initialize Aptos client with appropriate network
const getAptosClient = () => {
  const config = new AptosConfig({ 
    network: process.env.NEXT_PUBLIC_APTOS_NETWORK as Network || Network.DEVNET 
  });
  return new Aptos(config);
};

// Hook to interact with wallet for Aptos transactions
export function useAptosWallet() {
  const [wallet, setWallet] = useState<AptosWalletInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);
    // Check if wallet is already connected (from localStorage)
  useEffect(() => {
    // Check for saved wallet data
    try {
      const savedWalletObj = localStorage.getItem('civicWalletObject');
      if (savedWalletObj) {
        const walletData = JSON.parse(savedWalletObj);
        if (walletData && walletData.address) {
          // Normalize the address when loading from storage
          const normalizedWalletData = {
            ...walletData,
            address: normalizeAptosAddress(walletData.address)
          };
          setWallet(normalizedWalletData);
          setIsConnected(true);
          
          // Update localStorage with normalized address if it was different
          if (normalizedWalletData.address !== walletData.address) {
            localStorage.setItem('civicWalletObject', JSON.stringify(normalizedWalletData));
            console.log('Updated wallet address format in localStorage');
          }
        }
      }
    } catch (err) {
      console.error("Error loading wallet data:", err);
    }
  }, []);
    // Send Aptos transaction
  const sendTransaction = useCallback(async (
    receiverAddress: string, 
    amount: number
  ) => {
    if (!wallet || !wallet.address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Initialize Aptos client
      const aptosClient = getAptosClient();
      
      // Convert amount to Octas (APT has 8 decimals)
      const amountInOctas = Math.floor(amount * 100000000);
      
      // Normalize addresses
      const normalizedSenderAddress = normalizeAptosAddress(wallet.address);
      const normalizedReceiverAddress = normalizeAptosAddress(receiverAddress);
      
      // Create transaction for APT transfer
      const transaction = await aptosClient.transaction.build.simple({
        sender: normalizedSenderAddress,
        data: {
          function: "0x1::aptos_account::transfer",
          functionArguments: [normalizedReceiverAddress, amountInOctas],
          typeArguments: []
        }
      });
      
      // For Civic integration, we would submit this transaction through the Civic wallet
      // But for now, we'll just return the transaction object for simulation purposes
      console.log("Transaction built successfully:", transaction);
      
      // Return a mock hash for demo purposes
      // In a real implementation, this would be the hash of the submitted transaction
      return {
        hash: `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        wait: async () => ({ success: true })
      };
    } catch (error) {
      console.error('Failed to send Aptos transaction:', error);
      throw error;
    }
  }, [wallet]);
  // Connect wallet function
  const connectWallet = useCallback(async (walletData: AptosWalletInfo) => {
    // Normalize the address when connecting
    const normalizedWalletData = {
      ...walletData,
      address: normalizeAptosAddress(walletData.address)
    };
    setWallet(normalizedWalletData);
    setIsConnected(true);
    return normalizedWalletData;
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setIsConnected(false);
    // Also clear from localStorage if needed
    try {
      localStorage.removeItem('civicWalletObject');
      localStorage.removeItem('civicUserWithWallet');
    } catch (err) {
      console.error("Error clearing wallet data:", err);
    }
  }, []);

  return {
    wallet,
    sendTransaction,
    connectWallet,
    disconnectWallet,
    isConnected,
    formatAddress: (address: string) => formatWalletAddress(address)
  };
}
