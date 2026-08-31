import { motion, useCycle } from "motion/react";
import { useRef } from "react";
import styled from "styled-components";
import { useDimensions } from "./use-dimensions";
import { VariantMenuToggle } from "./VariantMenuToggle";
import { VariantNavigation } from "./VariantNavigation";

const StyledContainer = styled.div`
	display: flex;
	width: 900px;
	height: 600px;
`;

const StyledPositionedContainer = styled.div`
	position: absolute;
	width: 900px;
	height: 600px;
	background: linear-gradient(180deg, #0055ff 0%, rgb(0, 153, 255) 100%);
`;

const StyledNav = styled(motion.nav)`
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	width: 300px;
`;

const StyledMotionDiv = styled(motion.div)`
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	width: 300px;
	background: #fff;
`;

const sidebar = {
  open: (height = 1000) => ({
    clipPath: `circle(${height * 2 + 200}px at 40px 40px)`,
    transition: {
      type: "spring",
      stiffness: 20,
      restDelta: 2,
    },
  }),
  closed: {
    clipPath: "circle(30px at 40px 40px)",
    transition: {
      delay: 0.5,
      type: "spring",
      stiffness: 400,
      damping: 40,
    },
  },
};

export const VarientExample = () => {
  const [isOpen, toggleOpen] = useCycle(false, true);
  const containerRef = useRef(null);
  const { height } = useDimensions(containerRef);

  return (
    <StyledContainer>
      <StyledPositionedContainer>
        <StyledNav
          initial={false}
          animate={isOpen ? "open" : "closed"}
          custom={height}
          ref={containerRef}
        >
          {/* <StyledMotionDiv variants={sidebar} /> */}
          <VariantNavigation />
          <VariantMenuToggle toggle={() => toggleOpen()} />
        </StyledNav>
      </StyledPositionedContainer>
    </StyledContainer>
  );
};
