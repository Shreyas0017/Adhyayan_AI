'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCoin, IconPlus, IconSparkles } from '@tabler/icons-react';
import { apiService } from '@/lib/api';
import { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

interface GyanPointsDisplayProps {
  className?: string;
  variant?: 'compact' | 'detailed';
}

export const GyanPointsDisplay: React.FC<GyanPointsDisplayProps> = ({ 
  className = '',
  variant = 'compact'
}) => {
  const [points, setPoints] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    const fetchPoints = async () => {
      try {
        setIsLoading(true);
        const userData = await apiService.getUserProfile();
        console.log('🔄 Fetched user data:', userData); // Debug log
        setPoints(userData.gyanPoints);
      } catch (error) {
        console.error('Failed to fetch Gyan Points:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPoints();

    // Set up an interval to refresh points every 10 seconds
    const interval = setInterval(fetchPoints, 10000);
    
    // Also listen for payment success events
    const handlePaymentSuccess = () => {
      console.log('💰 Payment successful, refreshing Gyan points...');
      fetchPoints();
    };
    
    window.addEventListener('paymentSuccess', handlePaymentSuccess);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('paymentSuccess', handlePaymentSuccess);
    };
  }, []);const handleRechargeClick = () => {
    // Redirect to pricing page
    router.push('/pricing');
  };if (isLoading) {
    return (
      <div className={`group relative ${className}`}>
        <HoverBorderGradient
          containerClassName="rounded-full"
          as="div"
          className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2 px-3 py-1.5 text-sm"
        >
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 animate-pulse" />
            <span className="text-black dark:text-white text-xs">
              Loading...
            </span>
          </div>
        </HoverBorderGradient>
      </div>
    );
  }  if (variant === 'detailed') {
    return (
      <div className={`group relative ${className}`}>
        <HoverBorderGradient
          containerClassName="rounded-2xl"
          as="div"
          className="dark:bg-black bg-white text-black dark:text-white flex flex-col items-center gap-2 px-4 py-3"
          onClick={handleRechargeClick}
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <IconSparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
              <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-sm animate-pulse" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              {points !== null ? points : '--'}
            </span>
          </div>
          <span className="text-sm text-black dark:text-white font-medium">Gyan Points</span>
          <div className="flex items-center gap-1 text-xs text-black/60 dark:text-white/60 group-hover:text-black/80 dark:group-hover:text-white/80 transition-colors">
            <IconPlus className="h-3 w-3" />
            <span>Add more</span>
          </div>
        </HoverBorderGradient>
      </div>
    );
  }  return (
    <div className={`group relative ${className}`}>
      <HoverBorderGradient
        containerClassName="rounded-full"
        as="div"
        className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2 px-3 py-1.5 text-sm cursor-pointer"
        onClick={handleRechargeClick}
      >
        <div className="flex items-center space-x-2">
          <div className="relative">
            <IconCoin className="h-4 w-4 text-yellow-400" />
            <div className="absolute inset-0 bg-yellow-400/30 rounded-full blur-sm" />
          </div>
          <span className="font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
            {points !== null ? points : '--'}
          </span>          <span className="text-black dark:text-white text-xs font-medium">
            GP
          </span>
        </div>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="ml-1 text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </HoverBorderGradient>
    </div>
  );
};

export default GyanPointsDisplay;
