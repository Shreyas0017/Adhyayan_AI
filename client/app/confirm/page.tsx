'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { CustomNavbar } from "@/components/custom/CustomNavbar";
import { CustomStickyBanner } from "@/components/custom/CustomStickyBanner";
import { 
  IconCheck, 
  IconArrowLeft,
  IconCurrencyRupee,
  IconCurrencyDollar,
  IconSparkles,
  IconCreditCard,
  IconCoins,
  IconCalendar,
  IconUser,
  IconShield,
  IconClock,
  IconWallet
} from '@tabler/icons-react';
import clsx from 'clsx';
import { CivicAuthProvider, useUser, UserButton } from '@civic/auth-web3/react';
import { CivicWalletProvider, CivicWalletConnection, useCivicWallet } from '@/lib/civic-wallet-provider-simple';
import { aptosChain } from '@/lib/aptos-config';
import { processAptosPayment, savePaymentRecord } from '@/lib/aptos-payment';
import { processAptosPaymentWithCivic, formatWalletAddress, isWalletReadyForAptos, WalletInfo, normalizeAptosAddress } from '@/lib/aptos-civic-integration';
import { PaymentDialog } from '@/components/ui/payment-dialog';
import toast, { Toaster } from 'react-hot-toast';
import { getGyanPointsForPlan, getPlanDurationDays } from '@/lib/gyan-points-utils';

// Extend Window interface for global payment function
declare global {
  interface Window {
    processPaymentFunction?: () => Promise<any>;
  }
}

// Local Civic Wrapper - only for this confirm page
function CivicWalletWrapper({ children }: { children: React.ReactNode }) {
  return (    
    <CivicAuthProvider clientId={process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID || '937a64d7-2299-4dac-9620-5e2614ad615b'}>
      <CivicWalletProvider>
        {children}
      </CivicWalletProvider>
    </CivicAuthProvider>
  );
}

const StyledWrapper = styled.div`
  .confirmation-container {
    background: linear-gradient(135deg, #1a1e24 0%, #2a2e34 100%);
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .plan-header {
    background: linear-gradient(135deg, #975af4, #2f7cf8 40%, #78aafa 65%, #934cff);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }

  .plan-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
    pointer-events: none;
  }

  .price-display {
    font-size: 48px;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  }

  .features-grid {
    display: grid;
    gap: 12px;
    margin: 24px 0;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  .feature-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .billing-toggle {
    background: #2a2e34;
    border-radius: 12px;
    padding: 4px;
    display: inline-flex;
    margin: 16px 0;
  }

  .billing-option {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    cursor: pointer;
    border: none;
    background: transparent;
    color: #bab9b9;
  }

  .billing-option.active {
    background: linear-gradient(135deg, #975af4, #2f7cf8);
    color: white;
    box-shadow: 0 4px 12px rgba(151, 90, 244, 0.3);
  }

  .currency-toggle {
    background: #2a2e34;
    border-radius: 12px;
    padding: 4px;
    display: inline-flex;
    margin: 16px 0;
  }

  .currency-option {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    cursor: pointer;
    border: none;
    background: transparent;
    color: #bab9b9;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .currency-option.active {
    background: linear-gradient(135deg, #975af4, #2f7cf8);
    color: white;
    box-shadow: 0 4px 12px rgba(151, 90, 244, 0.3);
  }
  .payment-methods {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 24px;
    width: 100%;
  }

  .payment-button {
    background: linear-gradient(135deg, #975af4, #2f7cf8 40%, #78aafa 65%, #934cff);
    border: none;
    border-radius: 12px;
    padding: 16px 24px;
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    position: relative;
    overflow: hidden;
  }

  .payment-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(151, 90, 244, 0.4);
  }

  .payment-button.razorpay {
    background: linear-gradient(135deg, #3395ff, #1976d2);
  }

  .payment-button.aptos {
    background: linear-gradient(135deg, #00d4ff, #0091ea);
  }

  .back-button {
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 12px 24px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .summary-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 20px;
    margin: 24px 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .savings-badge {
    background: linear-gradient(135deg, #4caf50, #2e7d32);
    color: white;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .gyan-points-display {
    background: linear-gradient(135deg, #ff9800, #f57c00);
    border-radius: 12px;
    padding: 16px;
    margin: 16px 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .wallet-connection {
    margin: 24px 0;
    text-align: center;
  }

  .wallet-connect-button {
    background: linear-gradient(135deg, #975af4, #2f7cf8);
    border: none;
    border-radius: 12px;
    padding: 12px 24px;
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .wallet-connected {
    background: rgba(76, 175, 80, 0.1);
    border: 1px solid rgba(76, 175, 80, 0.3);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .wallet-connected p {
    margin: 0;
  }
  /* Removed unnecessary wallet-address styles */
`;

// Main confirmation page component using embedded wallet
function ConfirmPage(): React.ReactElement {
  return (
    <CivicWalletWrapper>
      <Suspense fallback={<ConfirmPageLoading />}>
        <ConfirmPageContent />
      </Suspense>
    </CivicWalletWrapper>
  );
}

// Loading component for suspense fallback
function ConfirmPageLoading(): React.ReactElement {
  return (
    <StyledWrapper>
      <CustomNavbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading payment details...</p>
        </div>
      </div>
      <CustomStickyBanner />
    </StyledWrapper>
  );
}

function ConfirmPageContent(): React.ReactElement {
  const params = useSearchParams();
  const router = useRouter();
  
  // Create stable references to avoid dependency issues
  const searchParams = useMemo(() => params, [params]);
  
  const [planData, setPlanData] = useState<PlanData | PackData | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<'INR' | 'USD'>('INR');
  const [currentBillingCycle, setCurrentBillingCycle] = useState<'monthly' | 'annual'>('monthly');  const [loading, setLoading] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<WalletInfo | null>(null);
  const [walletType, setWalletType] = useState<'civic' | 'metamask' | null>(null);
  const [showWalletConnection, setShowWalletConnection] = useState(false);  
  const [error, setError] = useState<string | null>(null);
  
  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'confirm' | 'processing' | 'success' | 'error'>('confirm');
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
    useEffect(() => {
    // Handle plan data from URL parameters
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const parsedData = JSON.parse(dataParam);
        setPlanData(parsedData);
        setCurrentCurrency(parsedData.currency || 'INR');
        if (parsedData.type === 'subscription') {
          setCurrentBillingCycle(parsedData.billingCycle || 'monthly');
        }
      } catch (error) {
        console.error('Error parsing plan data:', error);
        router.push('/pricing');
      }
    } else {
      router.push('/pricing');
    }
  }, [searchParams, router]);

  // Separate effect to handle wallet connection to avoid race conditions
  useEffect(() => {
    // Check for existing wallet connection from localStorage
    try {
      console.log("Checking for existing wallet connection in localStorage");
      
      // First check if we have a dedicated wallet object (preferred method)
      const savedWalletObj = localStorage.getItem('civicWalletObject');
      if (savedWalletObj) {
        try {          // If we have a wallet object, use it directly
          const walletObj = JSON.parse(savedWalletObj);
          console.log("Found dedicated wallet object:", walletObj);
          
          // Ensure it has the required address property and normalize it
          if (walletObj && typeof walletObj === 'object' && walletObj.address) {
            const normalizedWallet = {
              ...walletObj,
              address: normalizeAptosAddress(walletObj.address)
            };
            setConnectedWallet(normalizedWallet);
            setWalletType('civic');
            console.log("Successfully loaded and normalized wallet info from civicWalletObject");
            
            // Update localStorage if address was normalized
            if (normalizedWallet.address !== walletObj.address) {
              localStorage.setItem('civicWalletObject', JSON.stringify(normalizedWallet));
              console.log("Updated normalized address in localStorage");
            }
          } else {
            throw new Error("Invalid wallet object structure");
          }
        } catch (err) {
          console.error("Error parsing civicWalletObject:", err);
          // Continue to fallback method
        }
      } 
      
      // Only use fallback if we don't have a valid wallet already
      if (!connectedWallet) {
        // Fallback to the old method if no dedicated object exists or if it was invalid
        const savedWalletData = localStorage.getItem('civicUserWithWallet');
        if (savedWalletData) {
          try {
            const parsedWalletData = JSON.parse(savedWalletData);
            console.log("Wallet data from localStorage (fallback):", parsedWalletData);
              // Get wallet address with fallbacks and normalize it
            const walletAddress = normalizeAptosAddress(
              parsedWalletData?.wallet?.address || 
              parsedWalletData?.uid || 
              'unknown-address'
            );
                                
            console.log("Found previously connected wallet (normalized):", walletAddress);
            
            // Store the complete user data for use in UI components
            const walletInfo = {
              address: walletAddress,
              displayName: parsedWalletData?.displayName || parsedWalletData?.name || localStorage.getItem('userName') || null,
              email: parsedWalletData?.email || localStorage.getItem('userEmail') || null,
              photoURL: parsedWalletData?.photoURL || parsedWalletData?.picture || localStorage.getItem('userPhoto') || null,
              uid: parsedWalletData?.uid || parsedWalletData?.id || localStorage.getItem('firebaseUserId') || null
            };
            
            setConnectedWallet(walletInfo);
            setWalletType('civic');
            
            // Store this in the preferred format for future use
            localStorage.setItem('civicWalletObject', JSON.stringify(walletInfo));
            console.log("Successfully loaded wallet info from civicUserWithWallet and created civicWalletObject");
          } catch (err) {
            console.error("Error parsing civicUserWithWallet:", err);
          }
        }
      }
      
      // If this is right after login, show a welcome message
      const justLoggedIn = sessionStorage.getItem('justLoggedInWithCivic');
      if (justLoggedIn) {
        console.log("User just logged in with Civic");
        sessionStorage.removeItem('justLoggedInWithCivic'); // Clear the flag
        
        // Use a setTimeout to ensure connectedWallet is loaded
        setTimeout(() => {
          // Get the latest wallet data
          const walletData = connectedWallet || (() => {
            try {
              const savedWallet = localStorage.getItem('civicWalletObject');
              return savedWallet ? JSON.parse(savedWallet) : null;
            } catch (e) {
              return null;
            }
          })();
          
          if (walletData && walletData.address) {
            let welcomeMessage = `Welcome back! Your Civic wallet is connected.\nWallet: ${walletData.address.slice(0, 8)}...${walletData.address.slice(-8)}`;
            
            if (walletData.displayName) {
              welcomeMessage = `Welcome back, ${walletData.displayName}! Your Civic wallet is connected.\nWallet: ${walletData.address.slice(0, 8)}...${walletData.address.slice(-8)}`;
            }
            
            alert(welcomeMessage);
          } else {
            alert('Welcome back! Your Civic wallet is connected.');
          }
        }, 1000);
      }
    } catch (error) {
      console.error("Error restoring wallet connection:", error);
      // Clear potentially corrupt data
      localStorage.removeItem('civicUserWithWallet');
      localStorage.removeItem('civicWalletObject');
    }
  }, []);

  const formatPrice = (amount: number, currency: 'INR' | 'USD') => {
    return `${currency === 'INR' ? '₹' : '$'}${amount.toLocaleString()}`;
  };
  const getCurrentPrice = () => {
    if (!planData) return 0;
    
    try {
      if (planData.type === 'subscription') {
        const subscriptionData = planData as PlanData;
        // Add safety checks
        const priceData = currentCurrency === 'INR' ? 
          (subscriptionData.priceINR || { monthly: 999, annual: 9990 }) : 
          (subscriptionData.priceUSD || { monthly: 12, annual: 120 });
        
        // Default to monthly if the billing cycle is not found
        return priceData[currentBillingCycle] || priceData.monthly || 0;
      } else {
        const topupData = planData as PackData;
        // Add fallback values
        return currentCurrency === 'INR' ? 
          (topupData.priceINR || 999) : 
          (topupData.priceUSD || 12);
      }
    } catch (error) {
      console.error("Error calculating price:", error);
      // Default price as fallback
      return currentCurrency === 'INR' ? 999 : 12;
    }
  };  const getAnnualSavings = () => {
    if (!planData || planData.type !== 'subscription') return 0;
    
    try {
      const subscriptionData = planData as PlanData;
      // Add safety checks
      const priceData = currentCurrency === 'INR' 
        ? (subscriptionData.priceINR || { monthly: 999, annual: 9990 }) 
        : (subscriptionData.priceUSD || { monthly: 12, annual: 120 });
      
      const monthlyCost = (priceData.monthly || 0) * 12;
      const annualCost = priceData.annual || 0;
      return monthlyCost - annualCost;
    } catch (error) {
      console.error("Error calculating annual savings:", error);
      return 0;
    }  };  
    const handlePayment = async (method: 'razorpay' | 'aptos') => {
    if (method === 'aptos') {
      // Check if we have a valid wallet connection
      if (connectedWallet && connectedWallet.address) {
        // If wallet is already connected, show payment confirmation dialog
        setError(null);
        
        // Get user data from localStorage
        const savedWalletData = localStorage.getItem('civicUserWithWallet');
        const userData = savedWalletData ? JSON.parse(savedWalletData) : null;
          // Get current plan and price
        const currentPrice = getCurrentPrice();
        const planName = planData?.name || 'Default Plan';
        const planId = planData?.name?.toLowerCase().replace(/\s+/g, '_') || 'default_plan';
        
        // Priority order for userId: Firebase UID > Civic UID > Anonymous
        // This ensures we use the same user ID that the dashboard uses
        const firebaseUserId = localStorage.getItem('firebaseUserId');
        const userId = firebaseUserId || userData?.id || connectedWallet.uid || 'anonymous';
          console.log('User ID resolution:', { 
          firebaseUserId, 
          civicUserId: userData?.id, 
          walletUid: connectedWallet.uid, 
          finalUserId: userId 
        });
        
        if (!firebaseUserId) {
          console.warn('⚠️ No Firebase user ID found in localStorage. User may not be properly authenticated.');
        }
        
        // Calculate Gyan points based on plan
        const gyanPoints = getGyanPointsForPlan(planId);
        
        // Show confirmation dialog
        setDialogMode('confirm');
        setPaymentDialogOpen(true);
        
        // Define the payment processing function
        const processPayment = async () => {
          try {
            // Close confirmation dialog and show processing dialog
            setDialogMode('processing');
            
            console.log("Processing Aptos payment with connected wallet:", connectedWallet.address);
            
            // Use our integrated payment function
            const paymentResult = await processAptosPaymentWithCivic({
              senderAddress: connectedWallet.address,
              receiverAddress: process.env.NEXT_PUBLIC_APTOS_RECEIVER_ADDRESS || '0x1',
              amount: currentPrice,
              planName: planName,
              planId: planId,
              userId: userId,
              currency: currentCurrency
            });
            
            if (!paymentResult.success) {
              throw new Error(paymentResult.error || "Failed to process payment");
            }
              console.log("Payment successful with hash:", paymentResult.txnHash);
            
            // Trigger payment success event for components to refresh
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('paymentSuccess', { 
                detail: { txnHash: paymentResult.txnHash } 
              }));
            }
            
            // Store the transaction hash for success dialog
            const txnHash = paymentResult.txnHash!;
            setTransactionHash(txnHash);
            
            // Show success dialog
            setDialogMode('success');
            
            // Show toast notification
            toast.success(`Payment successful! Your ${planName} is now active.`);
            
            // Define the redirect to success page function
            const redirectToSuccessPage = () => {
              router.push(`/payment-success?txn=${txnHash}&plan=${encodeURIComponent(planName)}&amount=${currentPrice}&currency=${currentCurrency}&points=${gyanPoints}&wallet=${connectedWallet.address}`);
            };
            
            return { success: true, txnHash, redirectToSuccessPage };
          } catch (error) {
            console.error("Error processing Aptos payment:", error);
            setDialogMode('error');
            setError(error instanceof Error ? error.message : 'Unknown error');
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        };
        
        // Store the process function to be called when user confirms
        window.processPaymentFunction = processPayment;      } else {
        // For Aptos payment, show wallet connection first
        console.log("No wallet connected yet, showing wallet connection UI");
        setShowWalletConnection(true);
      }
      return;
    }
    
    // Razorpay payment flow
    setLoading(true);
    // Simulate payment processing for Razorpay
    setTimeout(() => {
      setLoading(false);
      toast(`Payment with ${method} will be implemented soon! Selected: ${planData?.name}`);
    }, 2000);
  };
  
  // Handler for payment dialog confirmation
  const handlePaymentConfirm = async () => {
    if (window.processPaymentFunction) {
      const result = await window.processPaymentFunction();
      
      // Clear the function reference after using it
      window.processPaymentFunction = undefined;
      
      if (result.success && result.redirectToSuccessPage) {
        // Let the success dialog show for a moment before redirecting
        setTimeout(() => {
          result.redirectToSuccessPage!();
        }, 2000);
      }
    }
  };  // Handle successful Civic wallet connection specially for the Aptos payment flow
  const handleWalletConnectSuccess = useCallback((walletData: any) => {
    console.log("Wallet connected successfully for Aptos payment:", walletData);
    
    // Save wallet info
    if (walletData?.wallet?.address) {
      const walletInfo = {
        address: normalizeAptosAddress(walletData.wallet.address),
        displayName: walletData.displayName || walletData.name || null,
        email: walletData.email || null,
        photoURL: walletData.photoURL || walletData.picture || null,
        uid: walletData.uid || walletData.id || null
      };
      
      setConnectedWallet(walletInfo);
      setWalletType('civic');
      localStorage.setItem('civicWalletObject', JSON.stringify(walletInfo));
      
      // Hide the connection interface
      setShowWalletConnection(false);
      
      // Proceed with payment
      setTimeout(() => {
        handlePayment('aptos');
      }, 500);
    } else {
      setError("Connected wallet does not have a valid address");
    }
  }, [handlePayment]);
  const handleWalletConnected = (address: string, type: string) => {
    // Use the proper Aptos address normalization function
    const sanitizedAddress = normalizeAptosAddress(address);
    
    console.log(`Original address: ${address}`);
    console.log(`Normalized address: ${sanitizedAddress}`);
    
    // Check for existing user data that might be stored
    let displayName = null;
    let email = null;
    let photoURL = null;
    let uid = null;
    
    try {
      // Try to get existing user information from localStorage
      const savedWalletData = localStorage.getItem('civicUserWithWallet');
      if (savedWalletData) {
        const parsedData = JSON.parse(savedWalletData);
        displayName = parsedData?.displayName || parsedData?.name || null;
        email = parsedData?.email || null;
        photoURL = parsedData?.photoURL || parsedData?.picture || null;
        uid = parsedData?.uid || parsedData?.id || null;
      }
    } catch (error) {
      console.error("Error reading existing user data:", error);
    }
    
    // Create a wallet object with the address and any available user info
    const walletObj = {
      address: sanitizedAddress,
      displayName: displayName,
      email: email,
      photoURL: photoURL,
      uid: uid || sanitizedAddress // Use the address as uid if none is available
    };
    
    // Update state
    setConnectedWallet(walletObj);
    setWalletType(type as 'civic' | 'metamask');
    setShowWalletConnection(false);
    
    // Save to localStorage in both formats for consistency
    localStorage.setItem('civicWalletObject', JSON.stringify(walletObj));
    localStorage.setItem('civicUserWithWallet', JSON.stringify({
      wallet: {
        address: sanitizedAddress,
        chain: type === 'civic' ? 'aptos' : 'ethereum'
      },
      displayName: displayName,
      email: email,
      photoURL: photoURL,
      uid: uid || sanitizedAddress
    }));
    
    console.log(`🎉 Wallet connected via ${type}:`, sanitizedAddress);
    alert(`✅ ${type === 'civic' ? 'Civic' : 'MetaMask'} wallet connected successfully!\n\nAddress: ${sanitizedAddress.slice(0, 8)}...${sanitizedAddress.slice(-8)}\n\nAptos payment integration will be implemented next!`);
  };const handleCivicWalletConnected = (user: any) => {
    console.log("🎉 Civic wallet connected successfully!", user);
    console.log("User object details:", {
      id: user?.id || 'No ID',
      hasWallet: !!user?.wallet,
      walletAddress: user?.wallet?.address || 'No wallet address',
      walletType: user?.wallet?.type || 'unknown',
      emailVerified: user?.emailVerified,
      authMethod: user?.authMethod || 'unknown',
      name: user?.name || 'No name',
      email: user?.email || 'No email',
      fullDetails: user
    });
    
    try {      // Extract the wallet address from the user object with fallbacks
      let address = user?.wallet?.address || 
                   (user?.ethereum?.address) || 
                   (user?.solana?.address) || 
                   user?.id || 
                   'Unknown Address';
      
      // Normalize address for Aptos compatibility using the utility function
      address = normalizeAptosAddress(address);
      
      console.log("✅ Using normalized wallet address:", address);
      
      // Create a consistent wallet object format
      const walletObj = {
        address: address,
        displayName: user?.displayName || user?.name || null,
        email: user?.email || null,
        photoURL: user?.photoURL || user?.picture || null,
        uid: user?.id || user?.uid || null
      };
      
      // Update connected wallet state with the full object
      setConnectedWallet(walletObj);
      setWalletType('civic');
      
      // Also store the user object for further use (like transaction signing)
      const userWithWallet = {
        ...user,
        wallet: {
          ...(user?.wallet || {}),
          address,
          chain: 'aptos'
        }
      };
      
      // Store both formats in localStorage for persistence
      localStorage.setItem('civicUserWithWallet', JSON.stringify(userWithWallet));
      localStorage.setItem('civicWalletObject', JSON.stringify(walletObj));
      console.log("Saved wallet data to localStorage");
      
      // Show success message with the connected wallet address
      if (address && address !== 'Unknown Address') {
        alert(`✅ Successfully connected Civic wallet!\n\nWallet Address: ${address.slice(0, 6)}...${address.slice(-4)}\n\nYou can now proceed with your payment.`);
      }
      
      // Proceed with showing success UI
      setShowWalletConnection(false);
    } catch (error) {
      console.error("Error in handleCivicWalletConnected:", error);
      alert("Wallet connected but there was an error processing the wallet data. Please try again.");
    }
  };

  const handleMetaMaskConnected = (address: string) => {
    handleWalletConnected(address, 'metamask');  };  

  // Utility function to check if wallet is properly connected for Aptos
  const checkWalletReadyForAptos = useCallback(() => {
    return isWalletReadyForAptos(connectedWallet, walletType);
  }, [connectedWallet, walletType]);
  
  // Helper function to display wallet address in a user-friendly format - use imported function
  const formatWalletAddressLocal = useCallback((address: string) => {
    return formatWalletAddress(address);
  }, []);

  // Function to handle wallet disconnection
  const handleDisconnectWallet = useCallback(() => {
    // Clear wallet data from local storage
    localStorage.removeItem('civicUserWithWallet');
    localStorage.removeItem('civicWalletObject');
    
    // Reset state
    setWalletType(null);
    setConnectedWallet(null);
    
    console.log("Wallet disconnected");
  }, []);

  if (!planData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  const isSubscription = planData.type === 'subscription';  const subscriptionData = isSubscription ? planData as PlanData : null;
  const topupData = !isSubscription ? planData as PackData : null;
  return (
    <StyledWrapper>
      <div className="min-h-screen bg-black text-white">
          <div className="relative z-50">
            <CustomStickyBanner />
            <CustomNavbar />
          </div>

          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => router.back()}
                  className="back-button"
                >
                  <IconArrowLeft className="h-4 w-4" />
                  Back to Pricing
                </button>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">Confirm Your Purchase</h1>
                  <p className="text-white/60 mt-2">Review your selection and complete your purchase</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Plan Details */}
                <div className="lg:col-span-2">
                  <div className="confirmation-container">
                    <div className="plan-header">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-2">
                            {planData.name}
                          </h2>
                          <p className="text-white/80 text-sm">
                            {planData.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="price-display">
                            {formatPrice(getCurrentPrice(), currentCurrency)}
                          </div>
                          <div className="text-white/60 text-sm">                          {isSubscription 
                              ? (typeof subscriptionData?.period === 'string' 
                                  ? subscriptionData.period 
                                  : (subscriptionData?.period && 
                                     typeof subscriptionData.period === 'object' && 
                                     subscriptionData.period[currentBillingCycle] !== undefined)
                                    ? subscriptionData.period[currentBillingCycle]
                                    : currentBillingCycle === 'monthly' ? 'Monthly' : 'Annual')
                              : 'One-time purchase'
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gyan Points Display */}
                    <div className="gyan-points-display">
                      <IconSparkles className="h-6 w-6 text-white" />
                      <div>
                        <div className="text-white font-semibold text-lg">
                          {isSubscription ? subscriptionData!.gyanPoints : topupData!.points} Gyan Points
                        </div>
                        <div className="text-white/70 text-sm">
                          {isSubscription ? 'Renewed every billing cycle' : 'Added to your account immediately'}
                        </div>
                      </div>
                    </div>

                    {/* Currency Toggle */}
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-white/60 text-sm">Currency:</span>
                      <div className="currency-toggle">
                        <button
                          onClick={() => setCurrentCurrency('INR')}
                          className={clsx("currency-option", { active: currentCurrency === 'INR' })}
                        >
                          <IconCurrencyRupee className="h-4 w-4" />
                          INR
                        </button>
                        <button
                          onClick={() => setCurrentCurrency('USD')}
                          className={clsx("currency-option", { active: currentCurrency === 'USD' })}
                        >
                          <IconCurrencyDollar className="h-4 w-4" />
                          USD
                        </button>
                      </div>
                    </div>

                    {/* Billing Cycle Toggle (only for subscriptions) */}
                    {isSubscription && (
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-white/60 text-sm">Billing Cycle:</span>
                        <div className="billing-toggle">
                          <button
                            onClick={() => setCurrentBillingCycle('monthly')}
                            className={clsx("billing-option", { active: currentBillingCycle === 'monthly' })}
                          >
                            <IconCalendar className="h-4 w-4 mr-2" />
                            Monthly
                          </button>
                          <button
                            onClick={() => setCurrentBillingCycle('annual')}
                            className={clsx("billing-option", { active: currentBillingCycle === 'annual' })}
                          >
                            <IconCalendar className="h-4 w-4 mr-2" />
                            Annual
                          </button>
                        </div>
                        {currentBillingCycle === 'annual' && getAnnualSavings() > 0 && (
                          <div className="savings-badge">
                            <IconSparkles className="h-3 w-3" />
                            Save {formatPrice(getAnnualSavings(), currentCurrency)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Features List (only for subscriptions) */}
                    {isSubscription && subscriptionData?.features && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4 text-white">
                          What's Included
                        </h3>
                        <div className="features-grid">
                          {subscriptionData.features.map((feature, index) => (
                            <div key={index} className="feature-item">
                              <div className="flex-shrink-0">
                                <IconCheck className="h-5 w-5 text-green-400" />
                              </div>
                              <span className="text-white/90 text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase Summary */}
                <div className="lg:col-span-1">
                  <div className="confirmation-container">
                    <h3 className="text-xl font-semibold mb-4 text-white">
                      Purchase Summary
                    </h3>
                  
                    <div className="summary-section">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-white/70">Plan</span>
                        <span className="text-white font-medium">{planData.name}</span>
                      </div>
                      
                      {isSubscription && (
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-white/70">Billing</span>
                          <span className="text-white font-medium capitalize">{currentBillingCycle}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-white/70">Currency</span>
                        <span className="text-white font-medium">{currentCurrency}</span>
                      </div>
                      
                      <div className="border-t border-white/20 pt-3 mt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-semibold">Total</span>
                          <span className="text-white font-bold text-lg">
                            {formatPrice(getCurrentPrice(), currentCurrency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Security Badge */}
                    <div className="flex items-center gap-2 text-green-400 text-sm mb-6">
                      <IconShield className="h-4 w-4" />
                      <span>Secure & encrypted payment</span>
                    </div>                  {/* Payment Methods */}                  
                    <div className="payment-methods">                    
                      {/* Connected Wallet Display */}
                      {connectedWallet && (
                        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-blue-500/30 rounded-xl shadow-lg shadow-blue-900/10 w-full max-w-none">
                          <div className="flex flex-col gap-4">
                            {/* Wallet info row */}
                            <div className="flex items-center gap-2 max-w-full">
                              <div className="w-6 h-6 flex-shrink-0 bg-blue-600 rounded-full flex items-center justify-center border border-blue-400 shadow-md shadow-blue-500/20">
                                <IconWallet className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center flex-wrap gap-2">
                                  <p className="text-white font-bold whitespace-nowrap">
                                    {walletType === 'civic' ? 'Civic Wallet' : 'MetaMask'}
                                  </p>
                                  <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full whitespace-nowrap">
                                    Connected
                                  </span>
                                </div>
                                {connectedWallet.displayName && (
                                  <p className="text-xs text-gray-400 truncate">
                                    {connectedWallet.displayName} {connectedWallet.email && `(${connectedWallet.email})`}
                                  </p>
                                )}
                              </div>
                            </div>
                          
                            {/* Wallet address on separate line */}
                            <div className="w-full">
                              <p className="text-xs text-gray-400 mb-1">Wallet Address:</p>
                              <div className="flex items-center justify-center gap-2 bg-blue-900/40 px-3 py-2 rounded-md border border-blue-500/30 shadow-inner shadow-blue-900/30">
                                <p className="text-blue-300 text-sm font-mono font-bold truncate">
                                  {connectedWallet.address.slice(0, 8)}...{connectedWallet.address.slice(-8)}
                                </p>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(connectedWallet.address);
                                    alert("Address copied to clipboard");
                                  }}
                                  className="p-1 hover:bg-blue-800/50 rounded transition-all"
                                  title="Copy address"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          
                            {/* Disconnect button moved below wallet address */}
                            <div className="flex justify-center w-full mt-1">
                              <button 
                                onClick={handleDisconnectWallet}
                                className="px-4 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg text-sm transition-all border border-red-500/20 whitespace-nowrap cursor-pointer"
                              >
                                Disconnect
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    
                      <div className="mt-6 w-full flex flex-col gap-4">                      {connectedWallet ? (
                          <button
                            onClick={() => handlePayment('aptos')}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg cursor-pointer"
                          >
                            {loading ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <IconCoins className="h-5 w-5" />
                                Continue with Aptos
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowWalletConnection(true)}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg cursor-pointer"
                          >
                            <IconWallet className="h-5 w-5" />
                            Continue with Aptos Wallet
                          </button>
                        )}
                      
                        <button
                          onClick={() => handlePayment('razorpay')}
                          disabled={loading}
                          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg cursor-pointer"
                        >
                          {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          ) : (
                            <>
                              <IconCreditCard className="h-5 w-5" />
                              Continue with Razorpay
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="text-center mt-4">
                      <p className="text-white/60 text-xs">
                        By proceeding, you agree to our Terms of Service and Privacy Policy
                      </p>
                    </div>                </div>
              </div>
            </div>            {/* Enhanced Wallet Connection Modal */}
            {showWalletConnection && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full p-6 relative">
                  <button
                    onClick={() => setShowWalletConnection(false)}
                    className="absolute top-4 right-4 text-white/60 hover:text-white/80 transition-colors"
                  >
                    ✕
                  </button>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h3>
                  <p className="text-white/70 mb-6">
                    Connect your Civic wallet to continue with Aptos payment.
                  </p>
                  
                  <div className="space-y-4">                      <button
                      onClick={() => window.location.href = '/auth/civic-login?redirectPath=' + encodeURIComponent(window.location.pathname + window.location.search)}
                      className="w-full py-4 flex items-center justify-center gap-3 font-semibold text-white
                                 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 
                                 rounded-lg transition-all duration-300 transform hover:scale-[1.02]
                                 shadow-lg shadow-blue-500/20 border border-white/10"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M15 9L11 13L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Connect Civic for Aptos Payments
                    </button>
                    
                    {error && (
                      <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mt-4 text-sm text-red-300">
                        <p className="font-medium mb-1">Error connecting wallet:</p>
                        <p className="text-xs">{error}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 text-center">
                    <p className="text-xs text-white/50">
                      By connecting, you agree to our Terms of Service and Privacy Policy
                    </p>
                  </div>
                </div>
              </div>
            )}          </div>
        </div>
      </div>
      
      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        onConfirm={handlePaymentConfirm}
        planName={planData?.name || 'Subscription Plan'}
        amount={getCurrentPrice()}
        currency={currentCurrency}
        walletAddress={connectedWallet?.address || ''}
        mode={dialogMode}
        errorMessage={error || undefined}
        txnHash={transactionHash || undefined}
      />
      
      {/* Toast Container */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #374151',
          }        }}
      />
    </StyledWrapper>
  );
}

const civicConfig = {
  clientId: process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID || '',
  scope: 'wallet',
  confirmationOptions: {
    displayName: 'Adhyayan AI',
    description: 'Connect your wallet to continue with payment'
  }
};

// Civic Auth Integration
interface CivicAuthState {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  user: any;
}

// Proper Civic Wallet Connection Hook
const useCivicWalletConnection = () => {
  const [authState, setAuthState] = useState<CivicAuthState>({
    isConnected: false,
    address: null,
    isConnecting: false,
    user: null
  });

  const connectWithCivic = async () => {
    setAuthState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      console.log('🚀 Starting Civic Auth connection...');
      
      // Initialize Civic Auth
      const civicAuth = await import('@civic/auth-web3');
      
      // Configure Civic Auth
      const authConfig = {
        clientId: process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID || '',
        redirectUri: typeof window !== 'undefined' ? window.location.origin + '/api/auth/civicauth/callback' : '',
        scope: 'openid profile wallet',
        responseType: 'code',
        wallet: {
          embedded: true,
          chains: ['ethereum', 'solana'] // Support both chains for flexibility
        }
      };

      console.log('🔧 Civic Auth Config:', authConfig);

      // Create auth URL
      const authUrl = `https://auth.civic.com/oauth/authorize?` +
        `client_id=${authConfig.clientId}&` +
        `redirect_uri=${encodeURIComponent(authConfig.redirectUri)}&` +
        `scope=${encodeURIComponent(authConfig.scope)}&` +
        `response_type=${authConfig.responseType}&` +
        `wallet_embedded=true`;

      console.log('🌐 Opening Civic Auth URL:', authUrl);

      // Open Civic Auth in popup
      if (typeof window !== 'undefined') {
        const popup = window.open(
          authUrl,
          'civic-auth',
          'width=500,height=700,scrollbars=yes,resizable=yes'
        );

        // Listen for auth result
        const authPromise = new Promise((resolve, reject) => {
          const messageHandler = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            
            if (event.data.type === 'CIVIC_AUTH_SUCCESS') {
              console.log('✅ Civic Auth Success:', event.data);
              window.removeEventListener('message', messageHandler);
              popup?.close();
              resolve(event.data.result);
            } else if (event.data.type === 'CIVIC_AUTH_ERROR') {
              console.error('❌ Civic Auth Error:', event.data.error);
              window.removeEventListener('message', messageHandler);
              popup?.close();
              reject(new Error(event.data.error));
            }
          };

          window.addEventListener('message', messageHandler);

          // Timeout after 5 minutes
          setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            popup?.close();
            reject(new Error('Authentication timeout'));
          }, 300000);
        });

        const result = await authPromise;
        console.log('🎉 Authentication completed:', result);

        setAuthState({
          isConnected: true,
          address: (result as any)?.walletAddress || (result as any)?.address,
          isConnecting: false,
          user: result
        });

        return result;
      } else {
        throw new Error('Window object not available');
      }
    } catch (error) {
      console.error('💥 Civic wallet connection failed:', error);
      setAuthState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  };

  const connectWithMetaMask = async () => {
    setAuthState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      console.log('🦊 Starting MetaMask connection...');
      
      // Check if running in browser and window.ethereum exists
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask wallet.');
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      console.log('✅ MetaMask connected:', accounts[0]);

      setAuthState({
        isConnected: true,
        address: accounts[0],
        isConnecting: false,
        user: { walletType: 'metamask', address: accounts[0] }
      });

      return accounts[0];

    } catch (error) {
      console.error('💥 MetaMask connection failed:', error);
      setAuthState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  };

  const disconnect = () => {
    console.log('🔌 Disconnecting wallet...');
    setAuthState({
      isConnected: false,
      address: null,
      isConnecting: false,
      user: null
    });
  };

  return {
    authState,
    connectWithCivic,
    connectWithMetaMask,
    disconnect
  };
};

// Civic Wallet Connection Component
const LocalCivicWalletConnection = ({ onWalletConnected }: { onWalletConnected: (user: any) => void }) => {
  const { user, isLoading, signIn } = useUser();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (user) {
      console.log("Civic user authenticated:", user);
      
      // Prepare wallet data for the transaction flow
      if (user.wallet && typeof user.wallet === 'object' && (user.wallet as any).address) {
        console.log("Using wallet address from Civic user data:", (user.wallet as any).address);
        
        // Create a complete user object for Aptos integration
        const userWithWallet = {
          ...user,
          wallet: {
            ...(user.wallet as any),
            chain: 'aptos', // Set chain explicitly for Aptos
          }
        };
        
        // Store in localStorage for persistence
        localStorage.setItem('civicUserWithWallet', JSON.stringify(userWithWallet));
        
        onWalletConnected(userWithWallet);
      } else if (user.id) {
        // If no wallet address but we have a user ID, create a deterministic address
        const walletAddress = `0x${user.id.replace(/-/g, '').substring(0, 40)}`;
        
        // Create a complete user object with wallet
        const userWithWallet = {
          ...user,
          wallet: {
            address: walletAddress,
            chain: 'aptos',
            type: 'embedded'
          }
        };
        
        console.log("Created wallet address from user ID:", walletAddress);
        
        // Store in localStorage for persistence
        localStorage.setItem('civicUserWithWallet', JSON.stringify(userWithWallet));
        
        onWalletConnected(userWithWallet);      } else {
        console.error("Connected user has no wallet address or ID");
      }
    }
  }, [user, onWalletConnected]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      if (typeof signIn === 'function') {
        // Use Civic Auth's built-in signIn function first if available
        console.log("Using Civic Auth signIn function");
        await signIn();
      } 
      // Fallback to redirect method
      else if (typeof window !== 'undefined') {
        console.log("Using redirect method for Civic Auth");
        const baseUrl = window.location.origin;
        const currentUrl = window.location.href; // Keep all params
        const authUrl = `/api/auth/civicauth?redirect_uri=${encodeURIComponent(currentUrl)}`;
          // Save current state before redirecting
        sessionStorage.setItem('aptosPaymentPending', 'true');
        // Save URL parameters in session storage to preserve state
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('data')) {
          sessionStorage.setItem('pendingPlanData', urlParams.get('data') || '');
        }
        
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('Civic sign-in failed:', error);
      alert('Failed to connect wallet. Please try again.');
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
        <span className="ml-2 text-white/70">Loading...</span>
      </div>
    );
  }
  
  if (user && (user.wallet || user.id)) {
    const address = (user as any).wallet?.address || (user as any).id || 'Connected';
    return (
      <div className="civic-wallet-connected bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <IconCheck className="h-5 w-5 text-green-400" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-green-400 font-semibold">🏛️ Wallet Connected via Civic</p>            <p className="text-white/70 text-sm">
              {address && typeof address === 'string' ? `${address.slice(0, 8)}...${address.slice(-8)}` : 'Connected'}
            </p>
            <p className="text-white/50 text-xs">Chain: {(user as any).wallet?.chain || 'Multi-chain'}</p>
          </div>
          <div className="flex-shrink-0">
            <UserButton className="w-8 h-8" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="civic-connect-button w-full flex flex-col items-center justify-center gap-2 p-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] border border-purple-400/20"
    >
      {isConnecting ? (
        <>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span>Connecting to Civic...</span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              🏛️
            </div>
            <span className="font-semibold text-lg">Connect with Civic</span>
          </div>
          <div className="text-xs text-white/80 text-center">
            Secure • Multi-chain • Identity Verified
          </div>
        </>
      )}
    </button>
  );
};

// MetaMask fallback component
const MetaMaskConnection = ({ onWalletConnected }: { onWalletConnected: (address: string) => void }) => {
  const [walletState, setWalletState] = useState({
    isConnected: false,
    address: null as string | null,
    isConnecting: false
  });

  const connectMetaMask = async () => {
    setWalletState(prev => ({ ...prev, isConnecting: true }));
    
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        
        if (accounts.length > 0) {
          setWalletState({
            isConnected: true,
            address: accounts[0],
            isConnecting: false
          });
          onWalletConnected(accounts[0]);
        }
      } else {
        throw new Error('MetaMask not found. Please install MetaMask wallet.');
      }
    } catch (error: any) {
      console.error('MetaMask connection failed:', error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  };

  const disconnectWallet = () => {
    setWalletState({
      isConnected: false,
      address: null,
      isConnecting: false
    });
  };

  if (walletState.isConnected && walletState.address) {
    return (
      <div className="metamask-connected bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
            🦊
          </div>
          <div className="flex-1">
            <p className="text-orange-400 font-semibold">MetaMask Connected</p>
            <p className="text-white/70 text-sm">
              {walletState.address.slice(0, 8)}...{walletState.address.slice(-8)}
            </p>
          </div>
          <button 
            onClick={disconnectWallet}
            className="text-red-400 hover:text-red-300 text-sm transition-colors px-3 py-1 border border-red-500/30 rounded"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={connectMetaMask}
      disabled={walletState.isConnecting}
      className="metamask-connect-button w-full flex flex-col items-center justify-center gap-2 p-6 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] border border-orange-400/20"
    >
      {walletState.isConnecting ? (
        <>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <span>Connecting to MetaMask...</span>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              🦊
            </div>
            <span className="font-semibold text-lg">Connect MetaMask</span>
          </div>
          <div className="text-xs text-white/80 text-center">
            Ethereum • Browser Extension
          </div>
        </>
      )}
    </button>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface PlanData {
  name: string;
  priceINR: { monthly: number; annual: number };
  priceUSD: { monthly: number; annual: number };
  period: string | { monthly: string; annual: string };
  description: string;
  gyanPoints: number;
  features: string[];
  currency: 'INR' | 'USD';
  billingCycle: 'monthly' | 'annual';
  type: 'subscription';
}

interface PackData {
  name: string;
  points: number;
  priceINR: number;
  priceUSD: number;
  description: string;
  currency: 'INR' | 'USD';
  type: 'topup';
}

export default ConfirmPage;
