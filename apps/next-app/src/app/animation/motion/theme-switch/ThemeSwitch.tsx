import { animate, motion } from "motion/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

const shapes = [
  /* Sun */
  {
    d: "M204.116 118.756C221.372 148.644 211.132 186.861 181.244 204.116C151.356 221.372 113.139 211.132 95.8835 181.244C78.6279 151.356 88.8681 113.139 118.756 95.8835C148.644 78.6279 186.861 88.8681 204.116 118.756Z",
  },
  /* Moon */
  {
    d: "M 140 154 C 211 253 279.601 228.146 216.238 264.728 C 152.876 301.311 71.8543 279.601 35.2719 216.238 C -1.3105 152.876 20.3991 71.8543 83.7617 35.2719 C 147.124 -1.3105 83 50 140 154 Z",
  },
];

export const ThemeSwitch: React.FC<any> = ({ isDark }) => {
  const lightThemeColor: string = "#000";
  const darkThemeColor: string = "#fff";
  const [isComponentDark, setIsComponentDark] = useState<boolean>(isDark);
  // Mirror the latest value of isComponentDark into a ref so the effect can
  // read the current value at call time without needing it in the dep array
  // (which would re-trigger the effect and cause an infinite render loop).
  const isComponentDarkRef = useRef<boolean>(isDark);
  isComponentDarkRef.current = isComponentDark;

  useEffect(() => {
    const morph = document.getElementById("morph") as HTMLElement;
    const ray = document.getElementsByClassName("ray") as any;
    if (isDark !== isComponentDarkRef.current) {
      if (isDark) {
        /* Light to dark */
        animate(
          morph,
          {
            d: [shapes[0]!.d, shapes[1]!.d],
            stroke: [lightThemeColor, darkThemeColor],
          } as any,
          { delay: 0.5 },
        );
        animate(ray, {
          opacity: [1, 0],
        });
      } else {
        /* Dark to light */
        animate(morph, {
          d: [shapes[1]!.d, shapes[0]!.d],
          stroke: [darkThemeColor, lightThemeColor],
        } as any);
        animate(
          ray,
          {
            opacity: [0, 1],
          },
          { delay: 0.5 },
        );
      }
      setIsComponentDark(isDark);
    }
  }, [isDark]);

  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.path
        strokeWidth="15"
        id={"morph"}
        initial={{
          stroke: isDark ? darkThemeColor : lightThemeColor,
          d: isDark ? shapes[1]!.d : shapes[0]!.d,
        }}
      />
      <motion.path
        className="ray"
        d="M150 50V10"
        stroke="black"
        strokeWidth="15"
        strokeMiterlimit="10"
        strokeLinecap="round"
        initial={{ opacity: isDark ? 0 : 1 }}
      />
      <motion.path
        className="ray"
        d="M80 80L51 51"
        stroke="black"
        strokeWidth="15"
        strokeMiterlimit="10"
        strokeLinecap="round"
        initial={{ opacity: isDark ? 0 : 1 }}
      />
      <motion.path
        className="ray"
        d="M50 150H10"
        stroke="black"
        strokeWidth="15"
        strokeMiterlimit="10"
        strokeLinecap="round"
        initial={{ opacity: isDark ? 0 : 1 }}
      />
      <motion.path
        className="ray"
        d="M80 220L51 249"
        stroke="black"
        strokeWidth="15"
        strokeMiterlimit="10"
        strokeLinecap="round"
        initial={{ opacity: isDark ? 0 : 1 }}
      />
      <motion.path
        className="ray"
        d="M150 250V290"
        stroke="black"
        strokeWidth="15"
        strokeMiterlimit="10"
        strokeLinecap="round"
        initial={{ opacity: isDark ? 0 : 1 }}
      />
      <motion.path
        className="ray"
        d="M220 220L249 249"
        stroke="black"
        strokeWidth="15"
        strokeMiterlimit="10"
        strokeLinecap="round"
        initial={{ opacity: isDark ? 0 : 1 }}
      />
      <motion.path
        className="ray"
        d="M250 150H290"
        stroke="black"
        strokeWidth="15"
        strokeMiterlimit="10"
        strokeLinecap="round"
        initial={{ opacity: isDark ? 0 : 1 }}
      />
      <motion.path
        className="ray"
        d="M220 80L249 51"
        stroke="black"
        strokeWidth="15"
        strokeMiterlimit="10"
        strokeLinecap="round"
        initial={{ opacity: isDark ? 0 : 1 }}
      />
    </svg>
  );
};
