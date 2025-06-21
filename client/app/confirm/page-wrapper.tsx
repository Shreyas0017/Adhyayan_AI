'use client';

import { CivicAuthProvider } from '@civic/auth-web3/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CivicWalletProvider } from "@/lib/civic-wallet-provider-simple";
import ConfirmPage from "./page";

// Wrap the component with all required providers
export default function ConfirmPageWrapper() {
  // Create a QueryClient instance
  const queryClient = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <CivicAuthProvider>
        <CivicWalletProvider>
          <ConfirmPage />
        </CivicWalletProvider>
      </CivicAuthProvider>
    </QueryClientProvider>
  );
}
