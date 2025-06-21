'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';

// Only Firebase auth globally - Civic is only used locally in confirm page for wallet connection
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
