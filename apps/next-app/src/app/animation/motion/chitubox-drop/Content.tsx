"use client";

import { motion, useAnimationControls, useAnimationFrame } from "motion/react";
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

const gradient = keyframes`
	0% {
		background-position: 0% 0%;
	}
	25% {
		background-position: 100% 0%;
	}
	50% {
		background-position: 100% 100%;
	}
	75% {
		background-position: 0% 100%;
	}
	100% {
		background-position: 0% 0%;
	}
`;

const StyledSvgContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: start;
	height: 410px;
	width: 100%;
	background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
	background-size: 500% 500%;
	animation: ${gradient} 20s ease infinite;
`;

const StyledRowContainer = styled.div`
	display: flex;
	justify-content: center;
	gap: 40px;
	height: 200px;
	padding-top: 1rem;
	background-color: #1c2d3f;
`;

const StyledMobileContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 3rem;
	height: 330px;
	background-color: #1c2d3f;
`;

const StyledButton = styled(motion.div)`
	display: flex;
	justify-content: center;
	align-items: center;
	color: #8c8c8c;
	min-width: 230px;
	max-width: 9rem;
	height: 48px;
	font-size: large;
	font-weight: bold;
	border-radius: 24px;
	cursor: pointer;
`;

const resolution: number = 100;
const waterSpringsLength: number = resolution + 1;
const svgWidth: number = resolution;
const svgHeight: number = resolution;
const k: number = 0.025;
const spread: number = 0.3;
const dampen: number = 0.01;
const waterLevel: number = Math.floor((resolution / 15) * 14);

class Spring {
  height: number;
  velocity: number;
  svgHeight: number;
  waterLevel: number;
  constructor(
    height: number,
    velocity: number,
    svgHeight: number,
    waterLevel: number,
  ) {
    this.height = height;
    this.velocity = velocity;
    this.svgHeight = svgHeight;
    this.waterLevel = waterLevel;
  }

  update() {
    const x = this.height - (this.svgHeight - this.waterLevel);
    const acceleration = -k * x - dampen * this.velocity;
    this.velocity += acceleration;
    this.height += this.velocity;
    if (this.height > this.svgHeight) {
      this.height = this.svgHeight;
    }
  }
}

const waterSprings: Spring[] = [];
for (let i = 0; i < waterSpringsLength; i++) {
  waterSprings[i] = new Spring(
    svgHeight - waterLevel,
    0,
    svgHeight,
    waterLevel,
  );
}

const Content = () => {
  const buttonColor: string = "#87a8c7";
  const buttonHoverColor: string = "#c3d9ee";
  const initialButtonBoxShadow: string =
    "-0px -0px 0px #537391, 0px 0px 0px #00070e";
  const buttonBoxShadow: string = "-5px -5px 5px #537391, 5px 5px 5px #00070e";
  const buttonBoxHoverShadow: string =
    "-8px -8px 8px #537391, 8px 8px 8px #00070e";
  const [buttonBasicBoxShadow, setButtonBasicBoxShadow] =
    useState<string>(buttonBoxShadow);
  const [buttonProBoxShadow, setButtonProBoxShadow] =
    useState<string>(buttonBoxShadow);
  const [buttonFaqBoxShadow, setButtonFaqBoxShadow] =
    useState<string>(buttonBoxShadow);
  const [buttonBasicColor, setButtonBasicColor] = useState<string>(buttonColor);
  const [buttonProColor, setButtonProColor] = useState<string>(buttonColor);
  const [buttonFaqColor, setButtonFaqColor] = useState<string>(buttonColor);
  const [buttonBasicTransitionDuration, setButtonBasicTransitionDuration] =
    useState<number>(0.8);
  const [buttonProTransitionDuration, setButtonProTransitionDuration] =
    useState<number>(0.8);
  const [buttonFaqTransitionDuration, setButtonFaqTransitionDuration] =
    useState<number>(0.8);
  const [buttonBasicTransitionDelay, setButtonBasicTransitionDelay] =
    useState<number>(0.3);
  const [buttonProTransitionDelay, setButtonProTransitionDelay] =
    useState<number>(0.5);
  const [buttonFaqTransitionDelay, setButtonFaqTransitionDelay] =
    useState<number>(0.7);

  const [waterBodyPath, setWaterBodyPath] = useState<string>("");
  const [dropOpacity, setDropOpacity] = useState<number>(1);
  const [waterDropOpacity, setWaterDropOpacity] = useState<number>(0);
  const dropControls = useAnimationControls();
  const waterdropControls = useAnimationControls();

  useAnimationFrame((timestamp: number) => {
    for (let i = 0; i < waterSprings.length; i++) {
      waterSprings[i]!.update();
    }
    setWaterBodyPath(
      `0,${svgHeight} ${waterSprings
        .map((spring, i) => [i, spring.height])
        .map((point) => point.join(","))
        .join(" ")} ${svgWidth},${svgHeight}`,
    );
    const ldelta = new Array(waterSprings.length);
    const rdelta = new Array(waterSprings.length);
    for (let i = 0; i < waterSprings.length; i++) {
      if (i > 0) {
        ldelta[i] =
          spread * (waterSprings[i]!.height - waterSprings[i - 1]!.height);
        waterSprings[i - 1]!.velocity += ldelta[i];
      }
      if (i < waterSprings.length - 1) {
        rdelta[i] =
          spread * (waterSprings[i]!.height - waterSprings[i + 1]!.height);
        waterSprings[i + 1]!.velocity += rdelta[i];
      }
    }
    for (let i = 0; i < waterSprings.length; i++) {
      if (i > 0) {
        waterSprings[i - 1]!.height += ldelta[i];
      }
      if (i < waterSprings.length - 1) {
        waterSprings[i + 1]!.height += rdelta[i];
      }
    }
  });

  useEffect(() => {
    // SVG path data used only by the drop/water-drop animation sequence.
    // Scoped to the effect so biome's exhaustive-deps rule is satisfied and
    // the captures stay stable.
    const dropShapes = [
      {
        d: "M208 256H192C192 256.273 193.368 256.201 194 256.545C194.5 256.818 195 257.091 195.5 257.364C196 257.636 196.5 258.182 197 258.455C197.5 258.727 198.5 259 200 259C201.582 259 202.5 258.727 203 258.455C203.5 258.182 204 257.636 204.5 257.364C205 257.091 205.5 256.818 206.5 256.545C207.011 256.406 208 256.273 208 256Z",
      },
      {
        d: "M208 256H192C192 256.5 194 256 194 257C196 257 196.071 258 195.5 262C195.06 265.079 194.256 266.884 195 268.5C195.948 270.559 197.759 272 200 272C202.241 272 204.052 270.559 205 268.5C205.744 266.884 204.94 265.079 204.5 262C203.929 258 204 257 206 257C206 256 208 256.5 208 256Z",
      },
    ];
    const waterDrop = [
      {
        d: "M205 266.8C205 269.672 202.761 272 200 272C197.239 272 195 269.672 195 266.8C195 263.928 196 258.5 200 259C204 258.5 205 263.928 205 266.8Z",
      },
      {
        d: "M205 577.8C205 580.672 202.761 583 200 583C197.239 583 195 580.672 195 577.8C195 574.928 197.5 571.3 200 570C202.5 571.3 205 574.928 205 577.8Z",
      },
    ];

    const sequence = async () => {
      await dropControls.start({
        d: [dropShapes[0]!.d, dropShapes[1]!.d],
        transition: { duration: 6 },
      });
      setWaterDropOpacity(1);
      setDropOpacity(0);
      await waterdropControls.start({
        d: [waterDrop[0]!.d, waterDrop[1]!.d],

        transition: { ease: "easeInOut", duration: 0.2 },
      });
      waterSprings[Math.floor(resolution / 2)]!.velocity = 12;
      setWaterDropOpacity(0);
      await dropControls.start({
        d: [dropShapes[1]!.d, dropShapes[0]!.d],
        transition: { duration: 0 },
      });
      setDropOpacity(1);
      sequence();
    };
    sequence();

    setWaterBodyPath(
      `0,${svgHeight} 0,${svgHeight - waterLevel} ${waterSprings
        .map((spring, i) => [i, spring.height])
        .map((point) => point.join(","))
        .join(" ")} ${svgWidth},${
        svgHeight - waterLevel
      } ${svgWidth},${svgHeight}`,
    );
    // useAnimationControls() returns a stable handle for the component's
    // lifetime, so depending on it does not cause the effect to re-run.
  }, [dropControls, waterdropControls]);

  return (
    <div>
      <StyledSvgContainer>
        <svg
          width="400"
          height="350"
          viewBox="0 0 400 350"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            className="water-drop"
            d="M205 266.8C205 269.672 202.761 272 200 272C197.239 272 195 269.672 195 266.8C195 263.928 196 258.5 200 259C204 258.5 205 263.928 205 266.8Z"
            fill="#334253"
            opacity={waterDropOpacity}
            animate={waterdropControls}
          />
          <motion.path
            className="drop"
            d="M208 256H192C192 256.273 193.368 256.201 194 256.545C194.5 256.818 195 257.091 195.5 257.364C196 257.636 196.5 258.182 197 258.455C197.5 258.727 198.5 259 200 259C201.582 259 202.5 258.727 203 258.455C203.5 258.182 204 257.636 204.5 257.364C205 257.091 205.5 256.818 206.5 256.545C207.011 256.406 208 256.273 208 256Z"
            fill="#334253"
            opacity={dropOpacity}
            animate={dropControls}
          />
          <path
            className="build-plate-shadow"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M310.43 59.5454H89.5699L0 81.6444V88H400V81.6444L310.43 59.5454Z"
            fill="#14212E"
          />
          <path
            className="build-plate-highlight"
            d="M400 81.6444H0V88.158H400V81.6444Z"
            fill="#595959"
          />
          <path d="M254 0H148V60H254V0Z" fill="#14212E" />
          <path d="M243 0H159V60H243V0Z" fill="#595959" />
          <path
            d="M125 184.413C125 198.695 142.402 211.017 167.603 216.81C173.373 242.011 185.717 259.413 200 259.413C214.282 259.413 226.604 242.011 232.398 216.81C257.598 211.017 275 198.695 275 184.413C275 170.13 257.598 157.808 232.398 152.015C226.604 126.815 214.26 109.435 200 109.435C185.74 109.435 173.373 126.837 167.603 152.037C142.402 157.808 125 170.13 125 184.413Z"
            fill="#334253"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M271.212 88H128.788L125.379 92.0775H274.621L271.212 88Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M138.258 156.449H135.562L135.339 94.7736H138.48L138.258 156.449Z"
            fill="#1C2D3F"
          />
          <path
            d="M136.898 157.808C137.649 157.808 138.258 157.2 138.258 156.449C138.258 155.699 137.649 155.09 136.898 155.09C136.148 155.09 135.539 155.699 135.539 156.449C135.539 157.2 136.148 157.808 136.898 157.808Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M143.405 161.062L137.767 155.09L136.052 157.207L143.07 161.485L143.405 161.062Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M138.48 94.7736H135.339L132.843 92.0775H140.976L138.48 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M154.189 156.115L150.111 148.985L147.95 150.634L153.766 156.449L154.189 156.115Z"
            fill="#1C2D3F"
          />
          <path
            d="M149.02 151.235C149.77 151.235 150.379 150.627 150.379 149.876C150.379 149.125 149.77 148.517 149.02 148.517C148.269 148.517 147.66 149.125 147.66 149.876C147.66 150.627 148.269 151.235 149.02 151.235Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M150.379 149.876H147.66L147.438 94.7736H150.602L150.379 149.876Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M150.602 94.7736H147.438L144.964 92.0775H153.097L150.602 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M165.241 152.996L162.144 145.398L159.782 146.734L164.773 153.263L165.241 152.996Z"
            fill="#1C2D3F"
          />
          <path
            d="M160.963 147.425C161.713 147.425 162.322 146.817 162.322 146.066C162.322 145.315 161.713 144.707 160.963 144.707C160.212 144.707 159.603 145.315 159.603 146.066C159.603 146.817 160.212 147.425 160.963 147.425Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M162.322 146.244H159.603L159.403 94.7736H162.545L162.322 146.244Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M162.545 94.7736H159.403L156.907 92.0775H165.04L162.545 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M175.847 131.16L174.198 123.116L171.635 124.007L175.334 131.338L175.847 131.16Z"
            fill="#1C2D3F"
          />
          <path
            d="M172.906 124.921C173.656 124.921 174.265 124.312 174.265 123.562C174.265 122.811 173.656 122.202 172.906 122.202C172.155 122.202 171.546 122.811 171.546 123.562C171.546 124.312 172.155 124.921 172.906 124.921Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M174.265 123.561H171.546L171.346 94.7736H174.487L174.265 123.561Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M174.487 94.7736H171.346L168.85 92.0775H176.983L174.487 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M186.475 115.741L186.185 107.541L183.512 107.987L185.94 115.83L186.475 115.741Z"
            fill="#1C2D3F"
          />
          <path
            d="M184.848 109.123C185.599 109.123 186.208 108.514 186.208 107.764C186.208 107.013 185.599 106.405 184.848 106.405C184.098 106.405 183.489 107.013 183.489 107.764C183.489 108.514 184.098 109.123 184.848 109.123Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M186.208 107.541H183.512L183.289 94.7736H186.43L186.208 107.541Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M186.43 94.7736H183.289L180.793 92.0775H188.926L186.43 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M261.185 156.449H263.904L264.127 94.7736H260.963L261.185 156.449Z"
            fill="#1C2D3F"
          />
          <path
            d="M262.545 157.808C263.295 157.808 263.904 157.2 263.904 156.449C263.904 155.699 263.295 155.09 262.545 155.09C261.794 155.09 261.185 155.699 261.185 156.449C261.185 157.2 261.794 157.808 262.545 157.808Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M256.038 161.062L261.698 155.09L263.391 157.207L256.395 161.485L256.038 161.062Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M260.963 94.7736H264.127L266.622 92.0776H258.489L260.963 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M245.276 156.115L249.354 148.985L251.493 150.634L245.7 156.449L245.276 156.115Z"
            fill="#1C2D3F"
          />
          <path
            d="M250.423 151.235C251.174 151.235 251.782 150.627 251.782 149.876C251.782 149.125 251.174 148.517 250.423 148.517C249.673 148.517 249.064 149.125 249.064 149.876C249.064 150.627 249.673 151.235 250.423 151.235Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M249.086 149.876H251.782L252.005 94.7736H248.864L249.086 149.876Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M248.864 94.7736H252.005L254.501 92.0776H246.368L248.864 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M234.225 152.996L237.299 145.398L239.661 146.734L234.693 153.263L234.225 152.996Z"
            fill="#1C2D3F"
          />
          <path
            d="M238.48 147.425C239.231 147.425 239.84 146.817 239.84 146.066C239.84 145.315 239.231 144.707 238.48 144.707C237.73 144.707 237.121 145.315 237.121 146.066C237.121 146.817 237.73 147.425 238.48 147.425Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M237.144 146.244H239.84L240.062 94.7736H236.921L237.144 146.244Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M236.921 94.7736H240.062L242.558 92.0776H234.425L236.921 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M223.619 131.16L225.267 123.116L227.83 124.007L224.131 131.338L223.619 131.16Z"
            fill="#1C2D3F"
          />
          <path
            d="M226.537 124.921C227.288 124.921 227.897 124.312 227.897 123.562C227.897 122.811 227.288 122.202 226.537 122.202C225.787 122.202 225.178 122.811 225.178 123.562C225.178 124.312 225.787 124.921 226.537 124.921Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M225.178 123.561H227.897L228.119 94.7736H224.978L225.178 123.561Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M224.978 94.7736H228.119L230.615 92.0775H222.482L224.978 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M212.99 115.741L213.258 107.541L215.931 107.987L213.525 115.83L212.99 115.741Z"
            fill="#1C2D3F"
          />
          <path
            d="M214.594 109.123C215.345 109.123 215.954 108.514 215.954 107.764C215.954 107.013 215.345 106.405 214.594 106.405C213.844 106.405 213.235 107.013 213.235 107.764C213.235 108.514 213.844 109.123 214.594 109.123Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M213.235 107.541H215.954L216.176 94.7736H213.012L213.235 107.541Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M213.012 94.7736H216.176L218.672 92.0775H210.517L213.012 94.7736Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M199.599 109.413L198.507 101.28H201.225L200.134 109.413H199.599Z"
            fill="#1C2D3F"
          />
          <path
            d="M199.866 102.639C200.617 102.639 201.225 102.031 201.225 101.28C201.225 100.529 200.617 99.9207 199.866 99.9207C199.116 99.9207 198.507 100.529 198.507 101.28C198.507 102.031 199.116 102.639 199.866 102.639Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M198.507 101.28H201.225L201.448 94.7736H198.307L198.507 101.28Z"
            fill="#1C2D3F"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M198.307 94.7736H201.448L203.944 92.0775H195.811L198.307 94.7736Z"
            fill="#1C2D3F"
          />
        </svg>
        <svg
          id="svg"
          width="100%"
          height="60"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          stroke="transparent"
        >
          <polygon
            points={waterBodyPath}
            fill="#1c2d3f"
            // transform="translate(0, 5)"
          ></polygon>
        </svg>
      </StyledSvgContainer>
      <StyledRowContainer>
        <StyledButton
          initial={{
            opacity: 0,
            boxShadow: initialButtonBoxShadow,
          }}
          animate={{
            opacity: 1,
            color: buttonBasicColor,
            boxShadow: buttonBasicBoxShadow,
            transition: {
              delay: buttonBasicTransitionDelay,
              duration: buttonBasicTransitionDuration,
            },
          }}
          onHoverStart={() => {
            setButtonBasicColor(buttonHoverColor);
            setButtonBasicBoxShadow(buttonBoxHoverShadow);
          }}
          onHoverEnd={() => {
            setButtonBasicColor(buttonColor);
            setButtonBasicBoxShadow(buttonBoxShadow);
          }}
        >
          CHITUBOX Basic
        </StyledButton>
        <StyledButton
          initial={{
            opacity: 0,
            boxShadow: initialButtonBoxShadow,
          }}
          animate={{
            opacity: 1,
            color: buttonProColor,
            boxShadow: buttonProBoxShadow,
            transition: {
              delay: buttonProTransitionDelay,
              duration: buttonProTransitionDuration,
            },
          }}
          onHoverStart={() => {
            setButtonProColor(buttonHoverColor);
            setButtonProBoxShadow(buttonBoxHoverShadow);
          }}
          onHoverEnd={() => {
            setButtonProColor(buttonColor);
            setButtonProBoxShadow(buttonBoxShadow);
          }}
        >
          CHITUBOX Pro
        </StyledButton>
        <StyledButton
          initial={{
            opacity: 0,
            boxShadow: initialButtonBoxShadow,
          }}
          animate={{
            opacity: 1,
            color: buttonFaqColor,
            boxShadow: buttonFaqBoxShadow,
            transition: {
              delay: buttonFaqTransitionDelay,
              duration: buttonFaqTransitionDuration,
            },
          }}
          onAnimationComplete={() => {
            setButtonBasicTransitionDuration(0.25);
            setButtonProTransitionDuration(0.25);
            setButtonFaqTransitionDuration(0.25);
            setButtonBasicTransitionDelay(0);
            setButtonProTransitionDelay(0);
            setButtonFaqTransitionDelay(0);
          }}
          onHoverStart={() => {
            setButtonFaqColor(buttonHoverColor);
            setButtonFaqBoxShadow(buttonBoxHoverShadow);
          }}
          onHoverEnd={() => {
            setButtonFaqColor(buttonColor);
            setButtonFaqBoxShadow(buttonBoxShadow);
          }}
        >
          FAQ
        </StyledButton>
      </StyledRowContainer>
    </div>
  );
};

export default Content;
