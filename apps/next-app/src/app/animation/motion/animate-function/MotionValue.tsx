"use client";

import {
  animate,
  type MotionValue as MotionValueInstance,
  motion,
  motionValue,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";

const MotionValue = () => {
  // Keep a stable motionValue across renders so the effect can depend on it
  // without re-firing on every parent re-render.
  const xRef = useRef<MotionValueInstance<number> | null>(null);
  if (xRef.current === null) {
    xRef.current = motionValue(0);
  }
  const x = xRef.current;
  const mappedX = useTransform(
    x,
    /* Map x from these values: */
    [0, 100],
    /* Into these values: */
    ["0%", "100%"],
  );
  useEffect(() => {
    animate(x, 100, { duration: 4 });
  }, [x]);

  return (
    <div className="flex flex-col gap-2">
      <a
        href="https://www.framer.com/motion/animate-function/##animate-a-motionvalue"
        className="underline"
      >
        https://www.framer.com/motion/animate-function/##animate-a-motionvalue
      </a>
      <p>
        Motion Value is also imperative, not a state, so it cannot be used
        directly in components. It can only be used in the motion
        components&apos; properties.
      </p>
      <ul className="pl-8">
        <li className="list-disc">useTransform</li>
      </ul>
      <motion.div
        className="h-4 origin-left bg-lime-500"
        style={{
          width: x,
        }}
      ></motion.div>
      <motion.div
        className="h-4 origin-left bg-lime-500"
        style={{
          width: mappedX,
        }}
      ></motion.div>
    </div>
  );
};

export default MotionValue;
