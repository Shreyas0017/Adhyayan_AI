'use client';

import { CivicAuthProvider } from '@civic/auth-web3/nextjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CivicWalletProvider } from "@/lib/civic-wallet-provider-simple";
import { aptosChain } from '@/lib/aptos-config';

// Wrap the component with all required providers
export default function CivicLoginLayout({ children }: { children: React.ReactNode }) {
  // Create a QueryClient instance
  const queryClient = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>      <CivicAuthProvider 
        clientId={process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID || '0241bmgUPvrLqd3jYqIrQeM4bcg'}
      >
        <CivicWalletProvider>
          {children}
        </CivicWalletProvider>
      </CivicAuthProvider>
    </QueryClientProvider>
  );
}
