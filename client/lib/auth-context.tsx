"use client";
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { apiService } from './api';
import { useRouter } from 'next/navigation';

interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (idToken: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
  refreshUserData: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
    // Use a ref to track if we've already processed the initial auth state
  const hasProcessedInitialAuth = useRef(false);
  
  // Function to refresh user data from Firebase
  const refreshUserData = async () => {
    if (auth.currentUser) {
      try {
        // Force refresh the user token to get latest data
        await auth.currentUser.reload();
        const refreshedUser = auth.currentUser;
        
        const userData = {
          uid: refreshedUser.uid,
          email: refreshedUser.email,
          displayName: refreshedUser.displayName,
          photoURL: refreshedUser.photoURL,
        };
          // Update stored user data with fresh data
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('firebaseUserId', userData.uid); // Store Firebase UID separately for payment system
        }
        
        setUser(userData);
        console.log('User data refreshed:', userData);
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };
  const login = async (idToken: string, userData: any) => {
    try {
      const response = await apiService.authenticateWithGoogle(idToken, userData);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Store Firebase UID for payment system
      if (typeof window !== 'undefined') {
        localStorage.setItem('firebaseUserId', userData.uid);
      }
      
      // Only redirect to dashboard if user is on the home page (fresh sign-in)
      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout first
      await apiService.logout();
      
      // Clear local state immediately to prevent UI flickering
      setUser(null);
      setIsAuthenticated(false);
      
      // Sign out of Firebase (this will trigger the auth state change)
      if (auth.currentUser) {
        await auth.signOut();
      }
      
      // Ensure local storage is cleared
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if backend logout fails, clear local state
      setUser(null);      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('firebaseUserId'); // Clear Firebase UID
      }
      if (auth.currentUser) {
        await auth.signOut();
      }
    }
  };  useEffect(() => {
    let isComponentMounted = true;
    
    // Check if user is already authenticated on page load
    const storedUser = apiService.getStoredUser();
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (storedUser && token) {
      // Validate that stored user has required fields
      if (storedUser.uid && (storedUser.email || storedUser.displayName)) {
        setUser(storedUser);
        setIsAuthenticated(true);
        hasProcessedInitialAuth.current = true;
        
        // Ensure Firebase UID is stored for payment system
        if (typeof window !== 'undefined') {
          localStorage.setItem('firebaseUserId', storedUser.uid);
        }
        
        // Refresh user data in the background to ensure it's up to date
        setTimeout(() => {
          refreshUserData();
        }, 1000);
      } else {        // Clear invalid stored data
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('firebaseUserId'); // Clear Firebase UID
        }
      }
    }

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isComponentMounted) return;
      
      if (firebaseUser && !hasProcessedInitialAuth.current) {
        // User just signed in via Firebase for the first time, authenticate with backend
        try {
          const idToken = await firebaseUser.getIdToken();
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          };          // Call login function directly to avoid circular dependency
          const response = await apiService.authenticateWithGoogle(idToken, userData);
          setUser(userData);
          setIsAuthenticated(true);
          hasProcessedInitialAuth.current = true;
          
          // Store Firebase UID for payment system
          if (typeof window !== 'undefined') {
            localStorage.setItem('firebaseUserId', userData.uid);
          }
          
          // Only redirect to dashboard if user is on the home page (fresh sign-in)
          if (typeof window !== 'undefined' && window.location.pathname === '/') {
            window.location.href = '/dashboard';
          }
        } catch (error) {
          console.error('Backend authentication failed:', error);
        }
      } else if (!firebaseUser && hasProcessedInitialAuth.current) {
        // User signed out of Firebase, clean up our auth state
        setUser(null);
        setIsAuthenticated(false);
        hasProcessedInitialAuth.current = false;        // Clear local storage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('firebaseUserId'); // Clear Firebase UID
        }
      }
      
      if (isComponentMounted) {
        setLoading(false);
      }
    });    return () => {
      isComponentMounted = false;
      unsubscribe();
    };
  }, []); // Remove router dependency
  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUserData, // Expose this function for manual refresh if needed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
