'use client';

import React from 'react';
import { IconX, IconAlertCircle, IconWallet, IconCurrencyRupee, IconCurrencyDollar, IconCheck } from '@tabler/icons-react';
import { motion } from 'framer-motion';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planName: string;
  amount: number;
  currency: 'INR' | 'USD';
  walletAddress: string;
  mode: 'confirm' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  txnHash?: string;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  planName,
  amount,
  currency,
  walletAddress,
  mode,
  errorMessage,
  txnHash,
}) => {
  if (!isOpen) return null;
  
  const formatCurrency = (amount: number, currency: string) => {
    return currency === 'INR' ? `₹${amount.toLocaleString()}` : `$${amount.toLocaleString()}`;
  };
  
  const formatWalletAddress = (address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-700/50"
      >
        {/* Close Button */}
        {mode === 'confirm' && (
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <IconX className="w-5 h-5" />
          </button>
        )}
        
        {/* Content based on mode */}
        {mode === 'confirm' && (
          <>
            <div className="mx-auto bg-indigo-500/20 w-14 h-14 rounded-full flex items-center justify-center mb-4">
              <IconAlertCircle className="h-8 w-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white text-center">Confirm Payment</h3>
            <p className="text-gray-300 mt-2 mb-4 text-center">
              Please review the details before proceeding with payment
            </p>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-2">
                  <div className="bg-gray-700/50 p-1.5 rounded-full">
                    {currency === 'INR' ? (
                      <IconCurrencyRupee className="h-4 w-4 text-gray-300" />
                    ) : (
                      <IconCurrencyDollar className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <span className="text-gray-300">Amount</span>
                </div>
                <span className="font-medium text-white">{formatCurrency(amount, currency)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-2">
                  <div className="bg-gray-700/50 p-1.5 rounded-full">
                    <svg 
                      className="h-4 w-4 text-gray-300" 
                      fill="currentColor" 
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/>
                    </svg>
                  </div>
                  <span className="text-gray-300">Plan</span>
                </div>
                <span className="font-medium text-white">{planName}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center gap-2">
                  <div className="bg-gray-700/50 p-1.5 rounded-full">
                    <IconWallet className="h-4 w-4 text-gray-300" />
                  </div>
                  <span className="text-gray-300">Wallet</span>
                </div>
                <span className="font-medium text-white">{formatWalletAddress(walletAddress)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium transition-colors"
              >
                Confirm Payment
              </button>
            </div>
          </>
        )}
        
        {mode === 'processing' && (
          <>
            <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-semibold text-white text-center">Processing Payment</h3>
            <p className="text-gray-300 mt-2 mb-4 text-center">
              Please wait while we process your payment...
            </p>
          </>
        )}
        
        {mode === 'success' && (
          <>
            <div className="mx-auto bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <IconCheck className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white text-center">Payment Successful!</h3>
            <p className="text-gray-300 mt-2 mb-4 text-center">
              Your payment has been processed successfully.
            </p>
            <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <div className="text-gray-400 text-xs mb-1">Transaction Hash</div>
              <div className="font-mono text-sm text-gray-100 break-all">
                {txnHash}
              </div>
            </div>
            <button
              onClick={onConfirm}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-medium transition-colors"
            >
              View Details
            </button>
          </>
        )}
        
        {mode === 'error' && (
          <>
            <div className="mx-auto bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <IconX className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white text-center">Payment Failed</h3>
            <p className="text-gray-300 mt-2 mb-4 text-center">
              {errorMessage || "There was an error processing your payment."}
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};
