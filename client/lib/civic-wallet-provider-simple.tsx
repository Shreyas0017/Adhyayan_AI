import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useUser } from '@civic/auth-web3/react';
import { generateAptosAddressFromId } from './aptos-civic-integration';

// Define the wallet context type
interface WalletContextType {
  wallet: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: Error | null;
  userInfo: any | null;
}

// Create context with default values
const WalletContext = createContext<WalletContextType>({
  wallet: null,
  isConnecting: false,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  error: null,
  userInfo: null,
});

// Simple provider component that doesn't use Wagmi
export function CivicWalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userInfo, setUserInfo] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Check for stored wallet info on mount
  useEffect(() => {
    const storedUserData = localStorage.getItem('civicUserWithWallet');
    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        if (userData.wallet?.address) {
          setWallet(userData.wallet.address);
          setUserInfo(userData);
          setIsConnected(true);
          console.log("Restored Civic wallet session from storage:", userData.wallet.address);
        }
      } catch (err) {
        console.error("Error restoring wallet session:", err);
      }
    }
  }, []);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // Connection logic will be handled by the CivicWalletConnection component
      setIsConnecting(false);
      setIsConnected(true);
    } catch (err: any) {
      console.error('Error connecting wallet:', err);
      setError(err);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setWallet(null);
    setIsConnected(false);
    setUserInfo(null);
    localStorage.removeItem('civicUserWithWallet');
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isConnecting,
        isConnected,
        connect: handleConnect,
        disconnect: handleDisconnect,
        error,
        userInfo,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook to use wallet context
export const useCivicWallet = () => useContext(WalletContext);

// Simplified Civic wallet connection component without Wagmi
export function CivicWalletConnection({ onSuccess }: { onSuccess: (user: any) => void }) {
  const userContext = useUser();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Simplified monitoring of auth state
  useEffect(() => {
    if (userContext.authStatus) {
      console.log("Auth status:", userContext.authStatus);
    }
  }, [userContext.authStatus]);
  
  // Effect to handle when Civic auth completes
  useEffect(() => {
    const handleUserConnected = async () => {
      console.log("User context updated:", {
        authStatus: userContext.authStatus,
        hasUser: Boolean(userContext.user),
        userDetails: userContext.user
      });
      
      if (userContext.authStatus === 'authenticated' && userContext.user) {
        console.log("✅ Civic user authenticated:", userContext.user);
          // Create a simple wallet object with a generated address
        let walletAddress = null;
        
        // Try to get address from user context if available
        if (userContext.user?.wallet && typeof userContext.user.wallet === 'object') {
          const wallet = userContext.user.wallet as any;
          if (wallet.address) {
            walletAddress = wallet.address;
            console.log("Using address from Civic user context:", wallet.address);
          }
        }
        
        // If no wallet address found, generate one from user ID
        if (!walletAddress && userContext.user?.id) {
          // Generate a proper Aptos address from user ID
          walletAddress = generateAptosAddressFromId(userContext.user.id);
          console.log("Generated Aptos wallet address from user ID:", walletAddress);
        }
        
        // Fallback to a zero address if all else fails
        if (!walletAddress) {
          walletAddress = '0x' + '0'.repeat(64);
          console.warn("Using fallback zero address");
        }

        if (walletAddress) {
          const userData = {
            ...userContext.user,
            wallet: {
              address: walletAddress,
              chain: 'ethereum', // Default to ethereum
              type: 'embedded'
            }
          };
          
          // Store in localStorage for persistence
          localStorage.setItem('civicUserWithWallet', JSON.stringify(userData));
          
          onSuccess(userData);
          return;
        }
      }
    };

    if (userContext.authStatus === 'authenticated') {
      console.log("Authentication completed, handling user connection");
      handleUserConnected();
    }
  }, [userContext.authStatus, userContext.user, onSuccess]);
  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      console.log("✨ Starting Civic authentication process...");
        // Store complete current URL for redirect back after auth
      const currentUrl = window.location.href;
      
      // Save the complete current URL before going to login
      sessionStorage.setItem('originalUrl', currentUrl);
      console.log("📝 Stored complete current URL:", currentUrl);
      
      // 1. If the user is already authenticated with Civic
      if (userContext.user) {
        console.log("User already authenticated with Civic:", userContext.user);
        // The useEffect above will handle creating the wallet
      } 
      // 2. If no user yet, initiate sign-in
      else if (typeof userContext.signIn === 'function') {
        console.log("No user yet, initiating Civic signIn...");
        await userContext.signIn();
      } else {
        throw new Error("Civic Auth signIn method not available");
      }
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err);
      alert(`Authentication failed: ${err.message}. Please try again.`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
          <p className="font-medium mb-1">Error connecting wallet:</p>
          <p className="text-xs">{error.message || 'Unknown error'}</p>
          <p className="text-xs mt-2 text-red-400">Please try again or refresh the page.</p>
        </div>
      )}

      {userContext.authStatus === 'authenticating' && (
        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3 mb-4">
          <p className="text-xs text-yellow-300">
            <strong>Authentication in progress...</strong> Please complete the process in the popup window.
          </p>
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full flex flex-col items-center justify-center gap-2 py-6 px-6 text-white font-medium 
                  bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 
                  rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                  disabled:opacity-70 shadow-lg shadow-blue-500/20 border border-white/10
                  hover:shadow-xl"
        style={{
          cursor: isConnecting ? 'wait' : 'pointer',
          animation: isConnecting ? 'none' : 'pulse 2s ease-in-out infinite'
        }}
      >
        {isConnecting ? (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
            <span className="text-lg font-bold">Connecting...</span>
            <span className="text-sm text-white/70">Complete authentication in the popup window</span>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center w-16 h-16 mb-3 rounded-full bg-purple-500/20 border border-purple-400/30 shadow-inner shadow-purple-500/30">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                <path d="M15.5 9L11 13.5L8.5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-2xl font-bold">Connect with Civic</span>
            <span className="text-sm text-white/70">Secure • Quick • No wallet required</span>
            <span className="mt-2 bg-purple-500/20 px-3 py-1 rounded-full text-xs font-medium">Click to connect</span>
          </>
        )}
      </button>
    </div>
  );
}
