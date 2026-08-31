import { motion } from "motion/react";
import styled from "styled-components";
import { VariantMenuItem } from "./VariantMenuItem";

const StyledUl = styled(motion.ul)`
	margin: 0;
	padding: 0;
	padding: 25px;
	position: absolute;
	top: 100px;
	width: 230px;
`;

const variants = {
  open: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
  closed: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

export const VariantNavigation = () => (
  <StyledUl variants={variants}>
    {itemIds.map((i) => (
      <VariantMenuItem i={i} key={i} />
    ))}
  </StyledUl>
);

const itemIds = [0, 1, 2, 3, 4];
