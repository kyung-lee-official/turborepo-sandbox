import { motion } from "motion/react";
import styled from "styled-components";

const StyledLi = styled(motion.li)`
	margin: 0;
	padding: 0;
	list-style: none;
	margin-bottom: 20px;
	display: flex;
	align-items: center;
	cursor: pointer;
`;

const StyledIconPlaceholder = styled.div`
	width: 40px;
	height: 40px;
	border-radius: 50%;
	flex: 40px 0;
	margin-right: 20px;
`;

const StyledTextPlaceholder = styled.div`
	border-radius: 5px;
	width: 200px;
	height: 20px;
	flex: 1;
`;

const variants = {
  open: {
    y: 0,
    opacity: 1,
    transition: {
      y: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    y: 50,
    opacity: 0,
    transition: {
      y: { stiffness: 1000 },
    },
  },
};

const colors = ["#FF008C", "#D309E1", "#9C1AFF", "#7700FF", "#4400FF"];

export const VariantMenuItem = ({ i }: any) => {
  const style = { border: `2px solid ${colors[i]}` };
  return (
    <StyledLi
      variants={variants}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <StyledIconPlaceholder style={style} />
      <StyledTextPlaceholder style={style} />
    </StyledLi>
  );
};
