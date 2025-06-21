"use client";
import React from 'react';
import styled from 'styled-components';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

const LearnMoreButton = () => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();  const handleClick = () => {
    // Always redirect to learn-more page regardless of authentication status
    router.push('/learn-more');
  };

  return (
    <StyledWrapper>
      <button className="btn" onClick={handleClick}>
        Learn More
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="15px" width="15px" className="icon">
          <path strokeLinejoin="round" strokeLinecap="round" strokeMiterlimit={10} strokeWidth="1.5" stroke="currentColor" d="M8.91016 19.9201L15.4302 13.4001C16.2002 12.6301 16.2002 11.3701 15.4302 10.6001L8.91016 4.08008" />
        </svg>
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  position: relative;
  pointer-events: auto;

  .btn {
    width: 160px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: none;
    position: relative;
    background-color: transparent;
    transition: .2s cubic-bezier(0.19, 1, 0.22, 1);
    opacity: 0.8;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    color: inherit;
    z-index: 10;
    pointer-events: auto;
  }

  .btn::after {
    content: '';
    border-bottom: 3px double rgb(214, 207, 113);
    width: 0;
    height: 100%;
    position: absolute;
    margin-top: -5px;
    top: 0;
    left: 5px;
    visibility: hidden;
    opacity: 1;
    transition: .2s linear;
  }

  .btn .icon {
    transform: translateX(0%);
    transition: .2s linear;
    animation: attention 1.2s linear infinite;
  }

  .btn .icon path {
    stroke: currentColor;
  }

  .btn:hover::after {
    visibility: visible;
    opacity: 0.7;
    width: 90%;
  }

  .btn:hover {
    letter-spacing: 2px;
    opacity: 1;
  }

  .btn:hover > .icon {
    transform: translateX(30%);
    animation: none;
  }

  @keyframes attention {
    0% {
      transform: translateX(0%);
    }

    50% {
      transform: translateX(30%);
    }
  }
  /* Force dark mode styles */
  .btn {
    color: white;
  }
`;

export default LearnMoreButton;
