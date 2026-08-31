"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";

const FromTo = () => {
  const nRef = useRef<HTMLDivElement>(null);
  const cRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    async function sequence() {
      animate(0, 100, {
        onUpdate: (latest) => {
          if (nRef.current) {
            nRef.current.textContent = latest.toFixed(2);
          }
        },
        duration: 5,
      });
      await animate("#9333ea", "#06b6d4", {
        duration: 3,
        onUpdate: (latest) => {
          if (cRef.current) {
            cRef.current.style.backgroundColor = latest;
          }
        },
      });
      console.log("Color Animation complete!");
    }
    sequence();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <p>
        The parameter of the onUpdate() callback function `latest` is an
        imperative raw value, neither a motion value nor state.
      </p>
      <a
        href="https://www.framer.com/motion/animate-function/##animate-a-single-value"
        className="underline"
      >
        https://www.framer.com/motion/animate-function/##animate-a-single-value
      </a>
      <div>Check the console</div>
      <div ref={nRef}></div>
      <div ref={cRef} className="h-8 w-9"></div>
    </div>
  );
};

export default FromTo;
