"use client";

import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useEffect, useState } from "react";

/**
 * The component being removed must be a direct
 * descendant of AnimatePresence due to limitations
 * with React.
 */
const MyComponent = ({ incremental }: any) => {
  switch (incremental) {
    case 0:
      return (
        <motion.h1
          initial={{ x: 300, y: 100, opacity: 0 }}
          animate={{
            x: 150,
            opacity: 1,
          }}
          exit={{ x: 0, opacity: 0 }}
          transition={{ delay: 1, duration: 1 }}
          style={{ position: "absolute", color: "red" }}
        >
          <del>{`Pitfall Slider ${incremental}`}</del>
        </motion.h1>
      );
    case 1:
      return (
        <motion.h1
          initial={{ x: 300, y: 100, opacity: 0 }}
          animate={{
            x: 150,
            opacity: 1,
          }}
          exit={{ x: 0, opacity: 0 }}
          transition={{ duration: 1 }}
          style={{ position: "absolute", color: "red" }}
        >
          <del>{`Pitfall Slider ${incremental}`}</del>
        </motion.h1>
      );
    case 2:
      return (
        <motion.h1
          initial={{ x: 300, y: 100, opacity: 0 }}
          animate={{
            x: 150,
            opacity: 1,
          }}
          exit={{ x: 0, opacity: 0 }}
          transition={{ duration: 1 }}
          style={{ position: "absolute", color: "red" }}
        >
          <del>{`Pitfall Slider ${incremental}`}</del>
        </motion.h1>
      );
    default:
      return (
        <motion.h1
          initial={{ x: 300, y: 100, opacity: 0 }}
          animate={{
            x: 150,
            opacity: 1,
          }}
          exit={{ x: 0, opacity: 0 }}
          transition={{ duration: 1 }}
          style={{ position: "absolute", color: "red" }}
        >
          <del>{`Pitfall Slider Null`}</del>
        </motion.h1>
      );
  }
};

const SwitchSlider = ({ incremental }: any) => {
  switch (incremental) {
    case 0:
      return <motion.h1>{`Switch Slider ${incremental}`}</motion.h1>;
    case 1:
      return <motion.h1>{`Switch Slider ${incremental}`}</motion.h1>;
    case 2:
      return <motion.h1>{`Switch Slider ${incremental}`}</motion.h1>;
    default:
      return <motion.h1>{`Switch Slider Null`}</motion.h1>;
  }
};

const SaclComponentWrapper = (props: any) => {
  const { saclStatus } = props;

  switch (saclStatus) {
    case "isSeededQuery.isLoading":
      return (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1 }}
        >
          <h1>1</h1>
        </motion.div>
      );
    case "isSignedInQuery.isLoading":
      return (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1 }}
        >
          <h1>2</h1>
        </motion.div>
      );
    case "isSignedInQuery.unauthorized":
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 1 }}
        >
          <h1>3</h1>
        </motion.div>
      );
    default:
      return (
        <motion.div
          initial={{ opacity: 1, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 1 }}
        >
          {null}
        </motion.div>
      );
  }
};

const Content: React.FC<any> = () => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [incremental, setIncremental] = useState<number>(0);

  const [saclStatus, setSaclStatus] = useState<string>(
    "isSeededQuery.isLoading",
  );
  const [first, setFirst] = useState(0);

  useEffect(() => {
    if (first === 0) {
      setSaclStatus("isSignedInQuery.isLoading");
      setFirst(1);
    }
    if (first === 1) {
      setSaclStatus("isSignedInQuery.unauthorized");
    }
  }, [first]);

  return (
    <div>
      <AnimatePresence>
        {isVisible ? (
          <motion.h1 initial={{ x: 500 }} animate={{ x: 250 }} exit={{ x: 0 }}>
            FramerMotionAnimatePresence
          </motion.h1>
        ) : null}
      </AnimatePresence>
      <button
        onClick={() => {
          setIsVisible(!isVisible);
        }}
      >
        Switch
      </button>
      <div>
        <AnimatePresence>
          <motion.h1
            key={incremental}
            initial={{ x: 200, opacity: 0 }}
            animate={{
              x: 100,
              opacity: 1,
              transition: { duration: 1.5 },
            }}
            exit={{ x: 0, opacity: 0, transition: { duration: 1 } }}
            style={{ position: "absolute" }}
          >
            {`Slider ${incremental}`}
          </motion.h1>
        </AnimatePresence>
      </div>
      <div>
        <AnimatePresence mode="wait">
          <MyComponent
            /**
             * Here key must be unique for each child,
             * if incremental is a constant, it will not work
             */
            key={incremental}
            incremental={incremental}
          />
        </AnimatePresence>
      </div>
      <div>
        <AnimatePresence>
          <motion.div
            key={incremental}
            initial={{ x: 200, y: 200, opacity: 0 }}
            animate={{
              x: 100,
              opacity: 1,
              transition: { duration: 1.5 },
            }}
            exit={{ x: 0, opacity: 0, transition: { duration: 1 } }}
            style={{ position: "absolute" }}
          >
            <SwitchSlider incremental={incremental} />
          </motion.div>
        </AnimatePresence>
      </div>
      <button
        onClick={() => {
          setIncremental(incremental + 1);
        }}
      >
        {incremental}
      </button>
      <div>
        <AnimatePresence mode="wait">
          <SaclComponentWrapper key={saclStatus} saclStatus={saclStatus} />
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Content;
