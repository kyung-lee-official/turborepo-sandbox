"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";

const Pattern2 = () => {
  const segmentLength = 50;
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = `${segmentLength} ${
      pathLength - segmentLength
    }`;
  }, []);

  return (
    <motion.svg width={400} viewBox="0 0 256 112">
      <path
        className="stroke-neutral-300"
        strokeWidth={0.5}
        fill="none"
        d="M8,56 C8,33.90861 25.90861,16 48,16 C70.09139,16 88,33.90861 88,56 C88,78.09139 105.90861,92 128,92 C150.09139,92 160,72 160,56 C160,40 148,24 128,24 C108,24 96,40 96,56 C96,72 105.90861,92 128,92 C154,93 168,78 168,56 C168,33.90861 185.90861,16 208,16 C230.09139,16 248,33.90861 248,56 C248,78.09139 230.09139,96 208,96 L48,96 C25.90861,96 8,78.09139 8,56 Z"
      ></path>
      <motion.path
        ref={pathRef}
        initial={{ strokeDashoffset: 867 }}
        animate={{
          strokeDashoffset: 0,
          transition: {
            duration: 2.5,
            ease: "linear",
            repeat: Infinity,
          },
        }}
        className="stroke-red-400"
        strokeWidth={1}
        fill="none"
        d="M8,56 C8,33.90861 25.90861,16 48,16 C70.09139,16 88,33.90861 88,56 C88,78.09139 105.90861,92 128,92 C150.09139,92 160,72 160,56 C160,40 148,24 128,24 C108,24 96,40 96,56 C96,72 105.90861,92 128,92 C154,93 168,78 168,56 C168,33.90861 185.90861,16 208,16 C230.09139,16 248,33.90861 248,56 C248,78.09139 230.09139,96 208,96 L48,96 C25.90861,96 8,78.09139 8,56 Z"
      ></motion.path>
    </motion.svg>
  );
};

export default Pattern2;
