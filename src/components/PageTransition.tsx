import React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface PageTransitionProps {
  children: React.ReactNode;
  screenKey: string;
  direction?: "left" | "right" | "up" | "down";
}

const pageVariants: Variants = {
  initial: (direction: string) => ({
    opacity: 0,
    x: direction === "left" ? -20 : direction === "right" ? 20 : 0,
    y: direction === "up" ? 20 : direction === "down" ? -20 : 0,
    scale: 0.98,
  }),
  enter: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: (direction: string) => ({
    opacity: 0,
    x: direction === "left" ? 20 : direction === "right" ? -20 : 0,
    y: direction === "up" ? -20 : direction === "down" ? 20 : 0,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  screenKey,
  direction = "right",
}) => {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={screenKey}
        custom={direction}
        variants={pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Fade-only transition for modals and overlays
export const FadeTransition: React.FC<{
  children: React.ReactNode;
  show: boolean;
}> = ({ children, show }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Slide up transition for bottom sheets
export const SlideUpTransition: React.FC<{
  children: React.ReactNode;
  show: boolean;
}> = ({ children, show }) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageTransition;
