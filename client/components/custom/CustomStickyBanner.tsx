'use client';

import { StickyBanner } from "@/components/ui/sticky-banner";
import { ReactNode } from "react";

interface CustomStickyBannerProps {
  children?: ReactNode;
  className?: string;
}

export const CustomStickyBanner = ({ 
  children, 
  className = "bg-gradient-to-b from-blue-500 to-blue-600" 
}: CustomStickyBannerProps) => {
  return (
    <StickyBanner className={className}>
      {children || (
        <p className="mx-0 max-w-[90%] text-white drop-shadow-md">
          Bro someone just said that its the best out there 🥹.{" "}
          <a href="#" className="transition duration-200 hover:underline">
            Read article
          </a>
        </p>
      )}
    </StickyBanner>
  );
};

export default CustomStickyBanner;