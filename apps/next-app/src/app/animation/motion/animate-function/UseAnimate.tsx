"use client";

import { useAnimate } from "motion/react";
import { useEffect } from "react";

const UseAnimate = () => {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    /**
     * This "li" selector will only select children
     * of the element that receives `scope`.
     */
    animate(
      "li",
      {
        opacity: [1, 0, 1, 0, 1, 0, 1],
      },
      { duration: 1.5 },
    );
  });

  return (
    <div>
      <a
        href="https://www.framer.com/motion/animate-function/##animate-htmlsvg-elements"
        className="underline"
      >
        https://www.framer.com/motion/animate-function/##animate-htmlsvg-elements
      </a>
      <ul className="pl-8">
        <li className="list-disc">useAnimate</li>
      </ul>
      <ul ref={scope}>
        <li>item</li>
        <li>item</li>
        <li>item</li>
      </ul>
      <ul>
        <li>item</li>
        <li>item</li>
        <li>item</li>
      </ul>
    </div>
  );
};

export default UseAnimate;
