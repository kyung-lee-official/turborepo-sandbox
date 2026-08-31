"use client";

import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { forwardRef, useRef, useState } from "react";

const ScrollContainer = forwardRef(function ScrollContainer(
  { children }: any,
  ref: any,
) {
  return (
    <div ref={ref} className="flex h-[200rem] w-full">
      {children}
    </div>
  );
});

const Background = forwardRef(function Background({ children }: any, ref: any) {
  return (
    <div ref={ref} className="relative m-auto flex w-[60rem]">
      {children}
    </div>
  );
});

const Masked = forwardRef(function Masked({ children }: any, ref: any) {
  const maskWidth = 50;
  const xDeviation = 30;
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["30% start", "70% end"],
  });

  const scrollYProgressSpring = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const upperLeftProgress = useTransform(
    scrollYProgressSpring,
    [1, 0],
    [-maskWidth, 100 + xDeviation],
  );
  const upperRightProgress = useTransform(
    scrollYProgressSpring,
    [1, 0],
    [0, 100 + maskWidth + xDeviation],
  );
  const lowerRightProgress = useTransform(
    scrollYProgressSpring,
    [1, 0],
    [-xDeviation, 100 + maskWidth],
  );
  const lowerLeftProgress = useTransform(
    scrollYProgressSpring,
    [1, 0],
    [-maskWidth - xDeviation, 100],
  );
  useMotionValueEvent(upperLeftProgress, "change", (latest) => {
    setUpperLeftProgressState(latest);
  });
  useMotionValueEvent(upperRightProgress, "change", (latest) => {
    setUpperRightProgressState(latest);
  });
  useMotionValueEvent(lowerRightProgress, "change", (latest) => {
    setLowerRightProgressState(latest);
  });
  useMotionValueEvent(lowerLeftProgress, "change", (latest) => {
    setLowerLeftProgressState(latest);
  });

  const [upperLeftProgressState, setUpperLeftProgressState] =
    useState<number>();
  const [upperRightProgressState, setUpperRightProgressState] =
    useState<number>();
  const [lowerRightProgressState, setLowerRightProgressState] =
    useState<number>();
  const [lowerLeftProgressState, setLowerLeftProgressState] =
    useState<number>();

  return (
    <motion.div
      className="absolute m-auto flex w-full"
      style={{
        clipPath: `polygon(${upperLeftProgressState}% 0,
				${upperRightProgressState}% 0,
				${lowerRightProgressState}% 100%,
				${lowerLeftProgressState}% 100%)`,
      }}
    >
      {children}
    </motion.div>
  );
});

const Content = () => {
  const containerRef = useRef(null);
  const ref = useRef(null);

  return (
    <ScrollContainer ref={containerRef}>
      <div className="mx-auto p-10 text-2xl">Scroll down ↓↓↓</div>
      <Background ref={ref}>
        <img src="/images/clippath/dark.jpg" alt="" width={"100%"} />
        <Masked ref={ref}>
          <img src="/images/clippath/light.jpg" alt="" width={"100%"} />
        </Masked>
      </Background>
    </ScrollContainer>
  );
};

export default Content;
