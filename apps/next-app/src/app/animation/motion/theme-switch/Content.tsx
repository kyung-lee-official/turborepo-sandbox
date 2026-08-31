"use client";

import { useState } from "react";
import styled from "styled-components";
import { ThemeSwitch } from "./ThemeSwitch";

const StyledPage = styled.div`
	padding: 2rem;
	background-color: #434343;
	min-height: 100vh;
`;

const StyledContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #d9d9d9;
	border-radius: 5px;
	min-height: 5rem;
	height: 300px;
`;

const Content = () => {
  const [dark, setDark] = useState<boolean>(true);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);

  function themeSwitch() {
    if (!isBlocked) {
      setDark(!dark);
      setIsBlocked(true);
      setTimeout(() => {
        setIsBlocked(false);
      }, 500);
    }
  }

  return (
    <StyledPage>
      <StyledContainer onClick={themeSwitch}>
        <ThemeSwitch isDark={dark} />
      </StyledContainer>
      <div style={{ color: "white" }}>dark: {JSON.stringify(dark)}</div>
    </StyledPage>
  );
};

export default Content;
