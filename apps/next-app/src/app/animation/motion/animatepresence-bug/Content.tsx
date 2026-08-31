"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

const ComponentWrapper = (props: any) => {
  const { status } = props;
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h1>{status}</h1>
    </motion.div>
  );
};

function Content() {
  const [status, setStatus] = useState<number>(1);
  return (
    <div className="p-10">
      <Link href="https://github.com/framer/motion/issues/2023#issuecomment-1817628628">
        Bug: #2023
      </Link>
      <AnimatePresence mode="wait">
        <ComponentWrapper key={status} status={status} />
      </AnimatePresence>
      <h1>status: {status}</h1>
      <button
        onClick={() => {
          setStatus(status + 1);
        }}
      >
        +1
      </button>
    </div>
  );
}

export default Content;
