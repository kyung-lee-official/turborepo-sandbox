"use client";

import { motion } from "motion/react";
import { useState } from "react";

const Content = () => {
  const [pos, setPos] = useState<"l" | "r">("l");

  return (
    <div>
      <div className="m-6 flex items-center justify-center">
        <h1 className="text-xl">
          Note: the animated elements must <strong>ALL</strong> have property
          `layout`
        </h1>
      </div>
      <motion.div
        layout
        style={{
          justifyContent: pos === "l" ? "flex-start" : "flex-end",
        }}
        className="flex w-full cursor-pointer bg-gray-200"
        onClick={() => {
          if (pos === "l") {
            setPos("r");
          } else {
            setPos("l");
          }
        }}
      >
        <motion.div
          layout
          className="flex h-10 w-10 items-center justify-center bg-red-500 text-red-50 text-xl"
          transition={{
            duration: 1,
          }}
        >
          {pos}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Content;
