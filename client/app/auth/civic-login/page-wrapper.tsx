'use client';

import { CivicAuthProvider } from '@civic/auth-web3/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CivicWalletProvider } from "@/lib/civic-wallet-provider-simple";
import CivicLogin from "./page";

// Wrap the component with all required providers
export default function CivicLoginPageWrapper() {
  // Create a QueryClient instance
  const queryClient = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <CivicAuthProvider>
        <CivicWalletProvider>
          <CivicLogin />
        </CivicWalletProvider>
      </CivicAuthProvider>
    </QueryClientProvider>
  );
}
