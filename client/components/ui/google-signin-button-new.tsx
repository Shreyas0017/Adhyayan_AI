"use client";
import React from 'react';
import styled from 'styled-components';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const GoogleSignInButton = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // User will be automatically redirected by the auth state change
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handleGetStarted = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <StyledWrapper>
        <div className="button-container">
          <button className="google-sign-in-btn">
            <span className="text">Loading...</span>
          </button>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="button-container">
        <button 
          className="google-sign-in-btn"
          onClick={user ? handleGetStarted : handleSignIn}
        >
          {user ? (
            <>
              <svg className="icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 7L11 7L11 11L7 11L7 13L11 13L11 17L13 17L13 13L17 13L17 11L13 11L13 7Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 1C5.925 1 1 5.925 1 12C1 18.075 5.925 23 12 23C18.075 23 23 18.075 23 12C23 5.925 18.075 1 12 1ZM3 12C3 7.029 7.029 3 12 3C16.971 3 21 7.029 21 12C21 16.971 16.971 21 12 21C7.029 21 3 16.971 3 12Z" fill="currentColor"/>
              </svg>
              <span className="text">Get Started</span>
            </>
          ) : (
            <>
              <svg className="icon" viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" fill="#000000">
                <g id="SVGRepo_bgCarrier" strokeWidth={0} />
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                <g id="SVGRepo_iconCarrier">
                  <path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4" />
                  <path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853" />
                  <path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05" />
                  <path d="M130.55 50.479c24.514 0 41.50 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335" />
                </g>
              </svg>
              <span className="text">Sign in with Google</span>
            </>
          )}
        </button>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  position: relative;
  pointer-events: auto;

  .button-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    overflow: hidden;
    background: #272727;
    border-radius: 24px;
    width: calc(200px + 1px);
    height: calc(48px + 1px);
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.2),
      0 0 8px rgba(255, 255, 255, 0.1),
      0 0 16px rgba(255, 255, 255, 0.08);
  }

  .button-container::before {
    content: "";
    position: absolute;
    inset: -50px;
    z-index: -2;
    background: conic-gradient(
      from 45deg,
      transparent 70%,
      rgba(255, 255, 255, 0.8) 85%,
      rgba(255, 255, 255, 0.3) 90%,
      transparent 100%
    );
    animation: spin 4s ease-in-out infinite;
  }

  .button-container::after {
    content: "";
    position: absolute;
    inset: -30px;
    z-index: -1;
    background: conic-gradient(
      from 225deg,
      transparent 60%,
      rgba(255, 255, 255, 0.4) 75%,
      rgba(255, 255, 255, 0.1) 85%,
      transparent 100%
    );
    animation: spin 6s ease-in-out infinite reverse;
  }
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
  }
  .google-sign-in-btn {
    --button-color: #373737;
    position: absolute;
    z-index: 10;
    width: 200px;
    height: 48px;
    border: none;
    border-radius: 24px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    background: var(--button-color);
    color: white;
    transition: all 0.3s ease;
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    pointer-events: auto;
    box-shadow:
      inset 0 40px 60px -8px rgba(255, 255, 255, 0.12),
      inset 4px 0 12px -6px rgba(255, 255, 255, 0.12),
      inset 0 0 12px -4px rgba(255, 255, 255, 0.12);
  }

  .google-sign-in-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    box-shadow:
      inset 0px 3px 6px rgba(255, 255, 255, 0.6),
      inset 0px -3px 6px rgba(0, 0, 0, 0.8),
      0px 0px 8px rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }

  .google-sign-in-btn:hover + .button-container::before {
    animation-duration: 2s;
  }

  .google-sign-in-btn:hover + .button-container::after {
    animation-duration: 3s;
  }

  .icon {
    height: 18px;
    width: 18px;
  }

  .text {
    font-size: 14px;
    font-weight: 600;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .button-container {
      background: #272727;
    }
    
    .google-sign-in-btn {
      background: #373737;
      color: white;
    }
  }
`;

export default GoogleSignInButton;
