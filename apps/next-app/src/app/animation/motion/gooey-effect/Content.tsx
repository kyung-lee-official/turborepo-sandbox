"use client";

import { motion } from "motion/react";

const Content = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-20">
      <a
        href="https://css-tricks.com/gooey-effect/"
        className="text-4xl underline"
      >
        The Gooey Effect
      </a>
      <div className="flex flex-col items-center justify-center gap-20 text-xl">
        <div className="flex flex-col items-center justify-center">
          <h1>Blur</h1>
          <div className="[filter:url(#blur)]">
            <div className="h-20 w-20 bg-blue-500"></div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="h-0">
            <defs>
              <filter id="blur">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
              </filter>
            </defs>
          </svg>
        </div>

        <div className="flex flex-col items-center justify-center">
          <h1>Drop Shadow</h1>
          <div className="[filter:url(#drop-shadow)]">
            <div className="h-20 w-20 bg-blue-500"></div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="h-0">
            <defs>
              <filter id="drop-shadow">
                <feGaussianBlur
                  in="SourceGraphic"
                  stdDeviation="7"
                  result="shadow"
                />
                <feOffset in="shadow" dx="3" dy="4" result="shadow" />
                <feColorMatrix
                  in="shadow"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0"
                  result="shadow"
                />
                <feBlend in="SourceGraphic" in2="shadow" />
              </filter>
            </defs>
          </svg>
        </div>

        <div className="flex flex-col items-center justify-center">
          <h1>Gooey</h1>
          <div>
            <div className="relative flex h-40 w-full items-center justify-center [filter:url(#goo)]">
              <div className="h-10 w-10 rounded-full bg-blue-500"></div>
              <motion.div
                animate={{ x: [0, 240, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute left-4 h-16 w-16 rounded-full bg-blue-500"
              ></motion.div>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              version="1.1"
              className="h-0"
            >
              <defs>
                <filter id="goo">
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="10"
                    result="blur"
                  />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                    result="goo"
                  />
                  <feBlend in="SourceGraphic" in2="goo" />
                </filter>
              </defs>
            </svg>
          </div>
        </div>
      </div>
      <div className="flex w-96 flex-col">
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feColorMatrix"
          className="flex w-full items-center justify-center bg-sky-300 text-xl underline"
        >
          &lt;feColorMatrix&gt;
        </a>
        <a
          href="https://codepen.io/nicolasjesenberger/pen/xxmbvxL"
          className="flex w-full items-center justify-center bg-sky-300 text-xl underline"
        >
          Gooey Toggle Switch
        </a>
      </div>
    </div>
  );
};

export default Content;
