// Define custom chain interface instead of using Wagmi's Chain
export interface ChainConfig {
  id: number;
  name: string;
  nativeCurrency: {
    decimals: number;
    name: string;
    symbol: string;
  };
  rpcUrls: {
    default: {
      http: string[];
    };
    public: {
      http: string[];
    };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  testnet: boolean;
}

// Define Aptos chain 
export const aptosChain: ChainConfig = {
  id: 2,  // Aptos devnet ID
  name: 'Aptos Devnet',
  nativeCurrency: {
    decimals: 8,
    name: 'Aptos',
    symbol: 'APT',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com/v1'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_APTOS_NODE_URL || 'https://fullnode.devnet.aptoslabs.com/v1'],
    },
  },  blockExplorers: {
    default: { name: 'AptosExplorer', url: 'https://explorer.aptoslabs.com/?network=devnet' },
  },
  testnet: false,
};

// Define Aptos testnet for development
export const aptosTestnet: ChainConfig = {
  id: 2,  // Aptos testnet ID
  name: 'Aptos Testnet',
  nativeCurrency: {
    decimals: 8,
    name: 'Aptos',
    symbol: 'APT',
  },
  rpcUrls: {
    default: {
      http: ['https://fullnode.testnet.aptoslabs.com/v1'],
    },
    public: {
      http: ['https://fullnode.testnet.aptoslabs.com/v1'],
    },
  },
  blockExplorers: {
    default: { name: 'AptosExplorer', url: 'https://explorer.aptoslabs.com/?network=testnet' },
  },
  testnet: true,
};

// Setup Aptos payment configuration
export const aptosPaymentConfig = {
  // Use the deployed smart contract for payments
  moduleAddress: process.env.NEXT_PUBLIC_APTOS_CONTRACT_ADDRESS || '0x1', 
  moduleName: 'subscription',
  functionName: 'purchase_subscription',
  receiverAddress: process.env.NEXT_PUBLIC_APTOS_RECEIVER_ADDRESS || '',
  coinType: '0x1::aptos_coin::AptosCoin', // APT token
};

// Helper function to prepare the Aptos transaction for payment using smart contract
export const prepareAptosPayment = (
  planId: string,
  transactionReference: string,
) => {
  return {
    function: `${aptosPaymentConfig.moduleAddress}::${aptosPaymentConfig.moduleName}::${aptosPaymentConfig.functionName}`,
    typeArguments: [],
    functionArguments: [planId, transactionReference],
  };
};
