"use client";

import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useState } from "react";
import styled from "styled-components";
import { VarientExample } from "./VariantExample";

const StyledContainer = styled.div`
	display: flex;
	gap: 20px;
	flex-direction: column;
	align-items: center;
	width: 100%;
	min-height: 100vh;
	background-color: #434343;
`;

const StyledH1 = styled.h1`
	color: #f0f0f0;
`;

const StyledH2 = styled.h2`
	color: #f0f0f0;
`;

const StyledH3 = styled.h3`
	color: #f0f0f0;
`;

const StyledRow = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
`;

const StyledMotionBox = styled(motion.div)`
	width: 200px;
	height: 200px;
	background: #b37feb;
`;

const Content: React.FC = () => {
  const [x, setX] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  return (
    <StyledContainer>
      <StyledH1>Animation</StyledH1>
      <StyledH2>Simple animations</StyledH2>
      <StyledH3>Transitions</StyledH3>
      <StyledRow>
        <StyledMotionBox
          animate={{ opacity: 1, scale: 1, x }}
          transition={{ duration: 1 }}
        />
        <button
          onClick={() => {
            setX(x === 0 ? 20 : 0);
          }}
        >
          Set X
        </button>
      </StyledRow>
      <StyledH3>Enter & out Animations</StyledH3>
      <StyledRow>
        <AnimatePresence>
          {isVisible && (
            <StyledMotionBox
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
        <button
          onClick={() => {
            setIsVisible(!isVisible);
          }}
        >
          Set Visible
        </button>
      </StyledRow>
      <StyledH3>Keyframes</StyledH3>
      <StyledRow>
        <StyledMotionBox
          animate={{
            scale: [1, 2, 2, 1, 1],
            rotate: [0, 0, 270, 270, 0],
            borderRadius: ["20%", "20%", "50%", "50%", "20%"],
          }}
          transition={{
            duration: 2,
            ease: "easeInOut",
            times: [0, 0.2, 0.5, 0.8, 1],
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      </StyledRow>
      <StyledH2>Gesture animations</StyledH2>
      <StyledRow>
        <StyledMotionBox
          initial={{ opacity: 0.2 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          whileHover={{
            scale: 1.2,
            transition: { duration: 1 },
          }}
          whileTap={{ scale: 0.9, transition: { duration: 0.2 } }}
          whileInView={{ opacity: 1 }}
        />
      </StyledRow>
      <StyledH1>Variants</StyledH1>
      <StyledRow>
        <VarientExample />
      </StyledRow>
      <StyledH1>Gesture animations</StyledH1>
    </StyledContainer>
  );
};

export default Content;
