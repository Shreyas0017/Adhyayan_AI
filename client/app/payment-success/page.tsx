'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styled from 'styled-components';
import { CustomNavbar } from "@/components/custom/CustomNavbar";
import { CustomStickyBanner } from "@/components/custom/CustomStickyBanner";
import { 
  IconCheck, 
  IconArrowLeft,
  IconCurrencyRupee,
  IconCurrencyDollar,
  IconExternalLink,
  IconCoins,
  IconWallet,
  IconDashboard,
  IconCopy
} from '@tabler/icons-react';
import toast, { Toaster } from 'react-hot-toast';
import { WavyBackground } from "@/components/ui/wavy-background";

const StyledWrapper = styled.div`
  .success-container {
    background: linear-gradient(135deg, #1a1e24 0%, #2a2e34 100%);
    border-radius: 20px;
    padding: 32px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .transaction-header {
    background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }

  .transaction-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 100%);
    pointer-events: none;
  }

  .details-grid {
    display: grid;
    gap: 16px;
    margin: 24px 0;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  .detail-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }

  .aptos-link {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .aptos-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(124, 58, 237, 0.3);
  }

  .dashboard-button {
    background: linear-gradient(135deg, #975af4, #2f7cf8 40%, #78aafa 65%, #934cff);
    border-radius: 8px;
    transition: all 0.3s ease;
  }

  .dashboard-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(61, 90, 254, 0.3);
  }

  .icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: rgba(52, 211, 153, 0.2);
    flex-shrink: 0;
  }
`;

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  
  // Get transaction details from URL params
  const txnHash = searchParams.get('txn') || 'unknown';
  const planName = searchParams.get('plan') || 'Subscription';
  const amount = searchParams.get('amount') || '0';
  const currency = searchParams.get('currency') || 'INR';
  const points = searchParams.get('points') || '0';
  const walletAddress = searchParams.get('wallet') || '';
  
  const formatCurrency = (amount: string, currency: string) => {
    return currency === 'INR' ? `₹${amount}` : `$${amount}`;
  };
  
  // Function to format and truncate wallet address
  const formatWalletAddress = (address: string): string => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };
  
  // Function to copy transaction hash to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopied(true);
        toast.success('Transaction hash copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        toast.error('Failed to copy transaction hash');
      });
  };

  return (
    <StyledWrapper>
      <div className="min-h-screen bg-black text-white">
        <div className="relative z-50">
          <CustomStickyBanner />
          <CustomNavbar />
        </div>

        <WavyBackground className="min-h-screen flex items-center justify-center py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              {/* Header with back button */}
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => router.push('/dashboard')}
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <IconArrowLeft className="h-4 w-4" />
                  Dashboard
                </button>
              </div>

              {/* Success Card */}
              <div className="success-container">
                {/* Success Header */}
                <div className="transaction-header text-center mb-8">
                  <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                    <IconCheck className="h-10 w-10 text-white" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Payment Successful!</h1>
                  <p className="text-white/80 mt-2">Your payment has been processed successfully</p>
                </div>

                {/* Transaction Details */}
                <div className="details-grid">
                  <div className="detail-item">
                    <div className="icon-circle">
                      <IconWallet className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-neutral-400 text-sm">Wallet Address</div>
                      <div className="text-white font-medium">{formatWalletAddress(walletAddress)}</div>
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="icon-circle">
                      <IconCoins className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-neutral-400 text-sm">Gyan Points Added</div>
                      <div className="text-white font-medium">+{points} points</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="detail-item">
                      <div className="icon-circle">
                        {currency === 'INR' ? (
                          <IconCurrencyRupee className="h-6 w-6 text-blue-400" />
                        ) : (
                          <IconCurrencyDollar className="h-6 w-6 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-neutral-400 text-sm">Amount</div>
                        <div className="text-white font-medium">{formatCurrency(amount, currency)}</div>
                      </div>
                    </div>

                    <div className="detail-item">
                      <div className="icon-circle">
                        <svg 
                          className="h-6 w-6 text-purple-400" 
                          fill="currentColor" 
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-neutral-400 text-sm">Plan</div>
                        <div className="text-white font-medium">{planName}</div>
                      </div>
                    </div>
                  </div>

                  <div className="detail-item">
                    <div className="w-full overflow-hidden">
                      <div className="text-neutral-400 text-sm mb-1">Transaction Hash</div>
                      <div className="flex items-center justify-between">
                        <div className="text-white font-mono text-sm truncate">
                          {txnHash}
                        </div>
                        <button 
                          onClick={() => copyToClipboard(txnHash)}
                          className="ml-2 p-2 rounded-md hover:bg-white/10 transition-colors"
                        >
                          <IconCopy className="h-4 w-4 text-neutral-400 hover:text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  <a 
                    href={`https://explorer.aptoslabs.com/txn/${txnHash}?network=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aptos-link flex items-center justify-center gap-2 text-white font-medium py-3 px-4"
                  >
                    View on Aptos Explorer
                    <IconExternalLink className="h-4 w-4" />
                  </a>
                  
                  <button 
                    onClick={() => router.push('/dashboard')}
                    className="dashboard-button flex items-center justify-center gap-2 text-white font-medium py-3 px-4"
                  >
                    Go to Dashboard
                    <IconDashboard className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </WavyBackground>

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
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#ffffff',
              },
            },
          }}
        />      </div>
    </StyledWrapper>
  );
}

// Loading component for Suspense
function PaymentSuccessLoading() {
  return (
    <StyledWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading payment details...</p>
        </div>
      </div>
    </StyledWrapper>
  );
}

// Main export with Suspense boundary
export default function PaymentSuccess() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
