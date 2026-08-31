"use client";

import { motion } from "motion/react";
import type React from "react";

const Content: React.FC<any> = () => {
  /**
   * Let's take "list1" and "item1" as an example,
   * "list1" and "item1" are variants.
   * The reason they are called variants is,
   * they both have "hidden" and "visible" labels,
   * but stands for totally different things.
   * By giving the labels to the outermost element,
   * the children will get the corresponding instance of theirs.
   **/
  const list1 = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 2,
      },
    },
  };
  const item1 = {
    hidden: { y: 200 },
    visible: {
      x: 600,
      y: 0,
      transition: { duration: 3 },
    },
  };

  /**
   * By default, all these animations will start simultaneously. But by using variants,
   * we gain access to extra transition props like
   * `when`, `delayChildren`, and `staggerChildren`
   * that can let parents orchestrate the execution of child animations.
   **/
  const list2 = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 4,
        /**
         * Childrens starts animating after the parent finished its animation
         * vice-versa for `afterChildren`
         */
        when: "beforeChildren",
        staggerChildren: 0.15,
      },
    },
  };
  const item2 = {
    visible: {
      x: 600,
      transition: { duration: 1.5 },
    },
  };

  const list3 = {
    start: {
      x: 0,
    },
    end: {
      x: 600,
      transition: { duration: 3 },
    },
  };
  const item3 = {
    start: {
      y: 0,
    },
    end: {
      y: 50,
      transition: { duration: 3 },
    },
    fn3: (i: any) => ({
      y: 100,
      transition: {
        delay: i * 0.6,
        duration: 3,
      },
    }),
  };
  const items3: { id: string; color: string }[] = [
    { id: "x-0", color: "#ff0000" },
    { id: "x-1", color: "#00ff00" },
    { id: "x-2", color: "#0000ff" },
  ];

  return (
    <div>
      <h2>Variant</h2>
      <a href="https://www.framer.com/docs/animation/#variants">
        https://www.framer.com/docs/animation/#variants
      </a>
      <h3>Basic, Propagation</h3>
      <motion.ul initial="hidden" animate="visible" variants={list1}>
        <motion.li variants={item1}>item</motion.li>
        <motion.li variants={item1}>item</motion.li>
        <motion.li variants={item1}>item</motion.li>
        {/**
         * Propagation
         * If a motion component has children, changes in variant will flow down through the component hierarchy
         * until a child component defines its own animate property.
         **/}
        <motion.li animate={{ x: 600, transition: { duration: 4 } }} />
      </motion.ul>
      <h3>Orchestration</h3>
      <motion.ul initial="hidden" animate="visible" variants={list2}>
        <motion.li variants={item2}>item</motion.li>
        <motion.li variants={item2}>item</motion.li>
        <motion.li variants={item2}>item</motion.li>
      </motion.ul>
      <h3>Dynamic variants</h3>
      <motion.ul initial="start" animate="end" variants={list3}>
        <motion.li variants={item3}>item</motion.li>
        <motion.li variants={item3}>item</motion.li>
        <motion.li variants={item3}>item</motion.li>
        {items3.map((item, i) => {
          return (
            <motion.li
              key={item.id}
              custom={i}
              animate="fn3"
              variants={item3}
              style={{ color: item.color }}
            >
              item
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
};

export default Content;
