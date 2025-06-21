'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserButton, useUser } from '@civic/auth-web3/react';
import { userHasWallet } from '@civic/auth-web3';
import { generateAptosAddressFromId } from '@/lib/aptos-civic-integration';

function CivicLoginContent() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userContext = useUser();
    // Store the complete original URL in session storage on mount
  useEffect(() => {
    // Get the referring URL (where the user came from)
    const referrer = document.referrer;
    const returnUrl = searchParams.get('returnUrl');
    
    // Store the complete original URL if it exists
    if (returnUrl && returnUrl.includes('/confirm')) {
      const fullReturnUrl = returnUrl;
      sessionStorage.setItem('originalUrl', fullReturnUrl);
      console.log("📝 Stored complete return URL:", fullReturnUrl);
    }
    // Or use the referrer if it's from our site
    else if (referrer && (referrer.includes('/confirm') || referrer.includes('/pricing'))) {
      sessionStorage.setItem('originalUrl', referrer);
      console.log("📝 Stored referrer URL:", referrer);
    }
    // If no specific URL, save a flag to use query params after auth
    else {
      sessionStorage.setItem('originalUrl', '/confirm?requestPlanData=true');
      console.log("📝 No specific return URL found, will check query params after auth");
    }
  }, [searchParams]);
  // Add effect to redirect to confirm page when authenticated and ensure wallet is created
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      console.log("👉 Civic login useEffect running, auth status:", userContext.authStatus);
      console.log("👉 User object:", userContext.user);
      
      if (userContext.authStatus === 'authenticated' && userContext.user) {
        console.log("🎉 User authenticated, handling wallet and redirect...");
          try {
          // Wait a moment to ensure user context is fully loaded
          let attempts = 0;
          const maxAttempts = 5;
          let hasWalletNow = userHasWallet(userContext);
          
          // Check if wallet needs to be created
          if (!hasWalletNow) {
            console.log(`🔧 User doesn't have a wallet yet`);
            
            // Wait a bit for any pending wallet creation to complete
            for (let i = 0; i < maxAttempts; i++) {
              console.log(`Checking for wallet - attempt ${i + 1}/${maxAttempts}...`);
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Check if wallet now exists
              hasWalletNow = userHasWallet(userContext);
              if (hasWalletNow) {
                console.log("✅ Wallet now exists!");
                break;
              }
            }
          }
          
          if (!hasWalletNow) {
            console.warn("⚠️ Could not create wallet after multiple attempts");
            setError("Could not create wallet after multiple attempts. The app will continue but wallet functionality may be limited.");
            // We'll continue anyway to avoid blocking the user
          }
          
          // At this point user either had a wallet or we tried to create one
          console.log("💼 Storing wallet info in localStorage");
          
          const userId = userContext.user?.id || 'unknown-id';
          let walletAddress;
          
          // For debugging
          console.log("User context object:", JSON.stringify(userContext.user, null, 2));
          console.log("Full auth context:", {
            authStatus: userContext.authStatus,
            hasWallet: userHasWallet(userContext),
            createWalletAvailable: 'createWallet' in userContext,
            userData: userContext.user
          });
            // Get the wallet address with comprehensive fallbacks
          const userObject = userContext.user as any; // Cast to any to access potential properties
          
          // Try different possible locations for wallet address
          if (userObject.wallet && typeof userObject.wallet === 'object' && userObject.wallet.address) {
            walletAddress = userObject.wallet.address;
            console.log("Found wallet address from wallet object:", walletAddress);
          } else if (userObject.ethereum?.address) {
            walletAddress = userObject.ethereum.address;
            console.log("Found ethereum address:", walletAddress);
          } else if (userObject.solana?.address) {
            walletAddress = userObject.solana.address;
            console.log("Found solana address:", walletAddress);
          } else if (userObject.uid || userObject.id) {
            // Generate a proper Aptos address from user ID
            const sourceId = userObject.uid || userObject.id;
            walletAddress = generateAptosAddressFromId(sourceId);
            console.log("Generated Aptos wallet address from user ID:", walletAddress);
          } else {
            // Fallback to generating from userId
            walletAddress = generateAptosAddressFromId(userId);
            console.log("Generated Aptos wallet address from userId fallback:", walletAddress);
          }
          
          // Create a properly formatted wallet object that matches what the confirm page expects
          const walletObj = {
            address: walletAddress,
            displayName: userObject.displayName || userObject.name || localStorage.getItem('userName') || null,
            email: userObject.email || localStorage.getItem('userEmail') || null,
            photoURL: userObject.photoURL || userObject.picture || localStorage.getItem('userPhoto') || null,
            uid: userObject.id || userObject.uid || localStorage.getItem('firebaseUserId') || null
          };
          
          // Store in a consistent format for use in confirm page
          const userDataToStore = {
            ...userContext.user,
            wallet: {
              address: walletAddress,
              chain: 'ethereum'
            },
            // Include all user data fields
            uid: walletObj.uid,
            email: walletObj.email,
            displayName: walletObj.displayName,
            photoURL: walletObj.photoURL
          };
          
          console.log("Storing wallet data:", JSON.stringify(userDataToStore, null, 2));
          localStorage.setItem('civicUserWithWallet', JSON.stringify(userDataToStore));
          
          // Also store the wallet object separately for direct use
          localStorage.setItem('civicWalletObject', JSON.stringify(walletObj));
            // Set a flag that the user just logged in
          sessionStorage.setItem('justLoggedInWithCivic', 'true');
            // Get the original URL the user was on
          const originalUrl = sessionStorage.getItem('originalUrl');
          
          // Determine where to redirect
          let finalRedirectUrl = '/pricing'; // Default to pricing page
          
          if (originalUrl && (originalUrl.includes('/confirm') || originalUrl.includes('/pricing'))) {
            // Use the stored original URL (including all query parameters)
            finalRedirectUrl = originalUrl;
            console.log("🔄 Redirecting to original URL:", finalRedirectUrl);
          }
          
          console.log("🚀 Redirecting to:", finalRedirectUrl);
          router.replace(finalRedirectUrl);
          
        } catch (error) {
          console.error("❌ Error in auth process:", error);
          setError("An error occurred during login. Please try again.");
        }
      }
    };
    
    checkAuthAndRedirect();
  }, [userContext.authStatus, userContext.user, router, userContext]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
      <div className="max-w-lg w-full bg-gray-900 rounded-lg border border-gray-800 p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Civic Wallet Connection</h2>
          {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-300">
            <p>{error}</p>
          </div>
        )}
          <div className="flex flex-col items-center justify-center py-8">
          <div className="mb-6">
            <UserButton />
          </div>
          <p className="text-white/80 text-center">Sign in with Civic</p>
          <p className="text-white/60 text-sm mt-2">Click the button above to securely connect. You'll be redirected to payment page after successful login.</p>
            {userContext.authStatus === 'authenticated' && (
            <div className="mt-6 bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-center">
              <p className="text-green-300 mb-2">You're logged in successfully!</p>
              <div className="animate-pulse flex justify-center items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mr-2"></div>
                <span className="text-green-300 text-sm">Redirecting to payment page...</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center">
          <Link href="/confirm" className="text-blue-400 hover:text-blue-300 text-sm">
            ← Back to payment page
          </Link>
        </div>      </div>
    </div>
  );
}

// Loading component for Suspense
function CivicLoginLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Loading login page...</p>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function CivicLogin() {
  return (
    <Suspense fallback={<CivicLoginLoading />}>
      <CivicLoginContent />
    </Suspense>
  );
}
