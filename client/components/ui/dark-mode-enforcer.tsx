"use client";

import { useEffect } from 'react';

export function DarkModeEnforcer() {
  useEffect(() => {
    // Function to enforce dark mode
    const enforceDarkMode = () => {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    };

    // Initial enforcement
    enforceDarkMode();

    // Create a mutation observer to watch for class changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const classList = document.documentElement.classList;
          if (!classList.contains('dark') || classList.contains('light')) {
            enforceDarkMode();
          }
        }
      });
    });

    // Start observing
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Also listen for storage changes in case another tab tries to change theme
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue !== 'dark') {
        enforceDarkMode();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null; // This component renders nothing
}
