import { createCivicAuthPlugin } from "@civic/auth-web3/nextjs"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
};

const withCivicAuth = createCivicAuthPlugin({
  clientId: process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID || "937a64d7-2299-4dac-9620-5e2614ad615b",
  // Add proper configuration to prevent MetakeepWeb3Client errors
  oauthServer: process.env.NEXT_PUBLIC_AUTH_SERVER || 'https://auth.civic.com/oauth',
  // @ts-ignore - endpoints is valid at runtime but not in types
  endpoints: { wallet: process.env.NEXT_PUBLIC_WALLET_API_BASE_URL }
});

export default withCivicAuth(nextConfig);
