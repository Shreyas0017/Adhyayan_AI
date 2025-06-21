import React from 'react';
import styled from 'styled-components';

const BlackHoleLoader = () => {
  return (
    <StyledWrapper>
      <div>
        <div className="ring-3">
          <div className="ring-2">
            <div className="ring-1">
              <div className="black-hole" />
              <div className="glow" />
            </div>
          </div>
        </div>
        <div className="container">
          <svg className="crescent crescent-1" viewBox="0 0 50 50">
            <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
          </svg>
          <svg className="crescent crescent-2" viewBox="0 0 50 50">
            <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
          </svg>
          <svg className="crescent crescent-3" viewBox="0 0 50 50">
            <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
          </svg>
          <svg className="crescent crescent-4" viewBox="0 0 50 50">
            <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
          </svg>
          <svg className="crescent crescent-5" viewBox="0 0 50 50">
            <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
          </svg>
          <svg className="crescent crescent-6" viewBox="0 0 50 50">
            <path d="M 0 0 C 54 50 185 57 226 0 C 198 39 35 32 0 0" fill="#ffffff55" />
          </svg>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .ring-3 {
    box-shadow: 0px 0px 10px 15px #fff;
    border-radius: 50%;
    padding: 2px;
  }
  .ring-2 {
    box-shadow: 0px 0px 2px 10px #000;
    border-radius: 50%;
    padding: 2px;
  }
  .ring-1 {
    box-shadow: 0px 0px 10px 15px #fff;
    border-radius: 50%;
    padding: 2px;
  }
  .black-hole {
    height: 128px;
    aspect-ratio: 1;
    background-color: black;
    border-radius: 50%;
    box-shadow:
      0px 0px 20px 10px #000,
      inset 0px 0px 10px #ffffff88;
  }
  .glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 350px;
    height: 350px;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.2) 5%,
      rgba(255, 255, 255, 0.1) 20%,
      rgba(255, 255, 255, 0) 70%
    );
    border-radius: 50%;
    z-index: -1;
  }
  .container {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotateX(75deg);
  }
  .crescent {
    filter: drop-shadow(0px 0px 5px #fff) drop-shadow(0px 0px 15px #fff)
      drop-shadow(0px 0px 25px #fff) drop-shadow(0px 0px 50px #fff);
    position: absolute;
    color: transparent !important;
    top: 50%;
    left: 50%;
    transform: rotate(180deg);
    width: 200px;
    height: 12px;
    clip-path: ellipse(60% 100% at 100% 50%); /* Hilal şekli */
    offset-path: path("M 0,-100 A 100,100 0 1,1 0,100 A 100,100 0 1,1 0,-100 Z");
    offset-distance: 0%;
    opacity: 0;
  }

  .crescent-1 {
    animation: moveOval 500ms ease-in-out 0ms infinite;
  }
  .crescent-2 {
    animation: moveOval 500ms ease-in-out 83ms infinite;
  }
  .crescent-3 {
    animation: moveOval 500ms ease-in-out 167ms infinite;
  }
  .crescent-4 {
    animation: moveOval 500ms ease-in-out 250ms infinite;
  }
  .crescent-5 {
    animation: moveOval 500ms ease-in-out 333ms infinite;
  }
  .crescent-6 {
    animation: moveOval 500ms ease-in-out 417ms infinite;
  }

  @keyframes moveOval {
    18% {
      offset-distance: 25%;
      opacity: 0;
    }
    25% {
      opacity: 1;
    }

    75% {
      opacity: 1;
    }
    100% {
      offset-distance: 90%;
      opacity: 0;
    }
  }
`;

export default BlackHoleLoader;
