"use client";

import { useControls } from "leva";
import { motion, useMotionValue } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

const POINT_X_TO_CENTER_OFFSET = 20;
const POINT_Y_TO_CENTER_OFFSET = 10;

function r2d(number: number) {
  return number * (180 / Math.PI);
}

const Pattern4 = () => {
  // pathLength is mutated in the effect and read by getAngleAtLength; use a
  // ref so the value can be updated without retriggering the effect, and so
  // getAngleAtLength can stay a stable useCallback with [] deps.
  const pathLengthRef = useRef<number>(1);
  const motionValue = useMotionValue(0);
  const motionPointX = useMotionValue(0);
  const motionPointY = useMotionValue(0);
  const motionAngle = useMotionValue(0);
  const pathRef = useRef<SVGPathElement>(null);

  /**
   * Get the angle in radians at a certain length along the path.
   */
  const getAngleAtLength = useCallback(
    (path: SVGPathElement, length: number, sampleSegmentLength: number) => {
      const pathLength = pathLengthRef.current;
      const p1 = path.getPointAtLength(length);
      const p2 = path.getPointAtLength(
        (length + sampleSegmentLength) % pathLength, // pathLength cannot be 0
      );
      return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    },
    [],
  );

  const { levaValue } = useControls({
    levaValue: { value: 0, min: 0, max: 867, step: 1 },
  });

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const pathLength = path.getTotalLength();
    pathLengthRef.current = pathLength;

    if (pathLength) {
      motionValue.set(levaValue);
      motionPointX.set(
        path.getPointAtLength(levaValue).x - POINT_X_TO_CENTER_OFFSET,
      );
      motionPointY.set(
        path.getPointAtLength(levaValue).y - POINT_Y_TO_CENTER_OFFSET,
      );
      motionAngle.set(r2d(getAngleAtLength(path, levaValue, 1)));
    }
  }, [
    levaValue,
    getAngleAtLength,
    motionValue.set,
    motionPointX.set,
    motionPointY.set,
    motionAngle.set,
  ]);

  return (
    <div>
      <motion.svg width={400} viewBox="0 0 256 112">
        <path
          className="stroke-neutral-300"
          strokeWidth={1}
          fill="none"
          d="M8,56 C8,33.90861 25.90861,16 48,16 C70.09139,16 88,33.90861 88,56 C88,78.09139 105.90861,92 128,92 C150.09139,92 160,72 160,56 C160,40 148,24 128,24 C108,24 96,40 96,56 C96,72 105.90861,92 128,92 C154,93 168,78 168,56 C168,33.90861 185.90861,16 208,16 C230.09139,16 248,33.90861 248,56 C248,78.09139 230.09139,96 208,96 L48,96 C25.90861,96 8,78.09139 8,56 Z"
        ></path>
        <path
          mask="url(#mask-container)"
          ref={pathRef}
          className="stroke-blue-400"
          strokeWidth={1.5}
          fill="none"
          d="M8,56 C8,33.90861 25.90861,16 48,16 C70.09139,16 88,33.90861 88,56 C88,78.09139 105.90861,92 128,92 C150.09139,92 160,72 160,56 C160,40 148,24 128,24 C108,24 96,40 96,56 C96,72 105.90861,92 128,92 C154,93 168,78 168,56 C168,33.90861 185.90861,16 208,16 C230.09139,16 248,33.90861 248,56 C248,78.09139 230.09139,96 208,96 L48,96 C25.90861,96 8,78.09139 8,56 Z"
        ></path>
        <mask
          id="mask-container"
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="256"
          height="112"
        >
          <motion.rect
            style={{
              x: motionPointX,
              y: motionPointY,
              rotate: motionAngle,
            }}
            fill="url(#mask-gradient)"
            width={40}
            height={20}
          />
        </mask>
        <motion.rect
          id={"auxiliary-rect"}
          style={{
            x: motionPointX,
            y: motionPointY,
            rotate: motionAngle,
          }}
          fill="none"
          width={40}
          height={20}
          stroke="black"
          strokeWidth={0.3}
        />
        <defs>
          <linearGradient
            id="mask-gradient"
            x1="100"
            y1="50"
            x2="0"
            y2="50"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="white" offset={0.6} />
            <stop stopColor="black" offset={1} />
          </linearGradient>
        </defs>
      </motion.svg>
    </div>
  );
};

export default Pattern4;
