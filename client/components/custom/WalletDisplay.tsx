'use client';

import React from 'react';
import { useUser } from '@civic/auth-web3/react';
import { userHasWallet } from '@civic/auth-web3';
import { IconWallet, IconChevronDown } from '@tabler/icons-react';
import { useCivicWallet } from '@/lib/civic-wallet-provider-simple';

interface WalletDisplayProps {
  className?: string;
}

export function WalletDisplay({ className = '' }: WalletDisplayProps) {
  const userContext = useUser();
  const { wallet } = useCivicWallet();
  
  // Determine wallet address to display
  const walletAddress = wallet || (userHasWallet(userContext) ? userContext.ethereum?.address : null);
  
  // Format wallet address for display (truncate middle)
  const formatAddress = (address: string) => {
    if (!address) return '';
    if (address.length < 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  if (!walletAddress) {
    return null; // Don't show anything if no wallet is connected
  }
  
  return (
    <div className={`flex items-center bg-gray-800/40 py-2 px-3 rounded-lg border border-gray-700/50 ${className}`}>
      <IconWallet size={18} className="text-blue-400 mr-2" />
      <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
        <span className="text-sm font-medium text-gray-300">{formatAddress(walletAddress)}</span>
        <IconChevronDown size={16} className="text-gray-400 ml-1" />
      </div>
    </div>
  );
}
